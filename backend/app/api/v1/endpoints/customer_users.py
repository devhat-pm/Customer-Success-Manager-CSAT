"""
API endpoints for managing Customer Portal users.
These endpoints are used by Extravis staff in the Admin Portal.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_admin_user, get_manager_or_admin
from app.models.user import User
from app.services.customer_user_service import CustomerUserService
from app.schemas.customer_user import (
    CustomerUserCreate,
    CustomerUserUpdate,
    CustomerUserResponse,
    CustomerUserListResponse,
    CustomerUserBriefResponse
)
from app.schemas.customer_user_invitation import (
    CustomerUserInvitationCreate,
    CustomerUserInvitationResponse,
    CustomerUserInvitationWithDetails,
    CustomerUserInvitationListResponse,
    InvitationValidationResponse,
    BulkInvitationCreate
)
from pydantic import BaseModel, EmailStr, Field

router = APIRouter(prefix="/admin/customer-users", tags=["Customer User Management"])


# ==================== Request/Response Schemas ====================

class InviteCustomerUserRequest(BaseModel):
    """Request schema for inviting a customer user."""
    customer_id: UUID
    email: EmailStr
    full_name: Optional[str] = Field(None, max_length=255)
    job_title: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)
    is_primary_contact: bool = False


class InvitationResponse(BaseModel):
    """Response schema for invitation creation."""
    id: UUID
    customer_id: UUID
    email: str
    invitation_token: str
    signup_link: str
    expires_at: str
    sent_by: str

    class Config:
        from_attributes = True


class PortalStatusResponse(BaseModel):
    """Response schema for portal status."""
    customer_id: UUID
    company_name: str
    portal_enabled: bool
    total_users: int
    active_users: int
    pending_invitations: int
    max_users: int


class TogglePortalRequest(BaseModel):
    """Request schema for toggling portal access."""
    enabled: bool


class PasswordResetResponse(BaseModel):
    """Response schema for password reset."""
    message: str
    reset_token: str  # In production, this would be sent via email only


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str


# ==================== Customer User Endpoints ====================

@router.get("/by-customer/{customer_id}", response_model=CustomerUserListResponse)
async def get_customer_users(
    customer_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    active_only: bool = Query(False),
    primary_only: bool = Query(False),
    search: Optional[str] = Query(None, max_length=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all portal users for a specific customer.

    - **customer_id**: The customer company ID
    - **active_only**: Filter to show only active users
    - **primary_only**: Filter to show only primary contacts
    - **search**: Search by name or email
    """
    service = CustomerUserService(db)
    users, total = service.get_customer_users(
        customer_id=customer_id,
        skip=skip,
        limit=limit,
        active_only=active_only,
        primary_only=primary_only,
        search=search
    )

    return CustomerUserListResponse(
        customer_users=[CustomerUserResponse.model_validate(u) for u in users],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{user_id}", response_model=CustomerUserResponse)
async def get_customer_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific customer user by ID."""
    service = CustomerUserService(db)
    user = service.get_customer_user_by_id(user_id)
    return CustomerUserResponse.model_validate(user)


@router.put("/{user_id}", response_model=CustomerUserResponse)
async def update_customer_user(
    user_id: UUID,
    update_data: CustomerUserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Update a customer user's details.

    Only managers and admins can update customer users.
    Cannot change email - create new invitation instead.
    """
    service = CustomerUserService(db)
    user = service.update_customer_user(
        user_id=user_id,
        full_name=update_data.full_name,
        job_title=update_data.job_title,
        phone=update_data.phone,
        is_primary_contact=update_data.is_primary_contact,
        is_active=update_data.is_active,
        is_verified=update_data.is_verified
    )
    return CustomerUserResponse.model_validate(user)


@router.post("/{user_id}/deactivate", response_model=CustomerUserResponse)
async def deactivate_customer_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Deactivate a customer user account.

    The user will no longer be able to login but their data is preserved.
    """
    service = CustomerUserService(db)
    user = service.deactivate_customer_user(user_id)
    return CustomerUserResponse.model_validate(user)


@router.post("/{user_id}/reactivate", response_model=CustomerUserResponse)
async def reactivate_customer_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """Reactivate a previously deactivated customer user account."""
    service = CustomerUserService(db)
    user = service.reactivate_customer_user(user_id)
    return CustomerUserResponse.model_validate(user)


@router.delete("/{user_id}", response_model=MessageResponse)
async def delete_customer_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    Permanently delete a customer user.

    **Admin only.** This action cannot be undone.
    Tickets and surveys from this user will be preserved but anonymized.
    """
    service = CustomerUserService(db)
    service.delete_customer_user(user_id)
    return MessageResponse(message="Customer user permanently deleted")


@router.post("/{user_id}/reset-password", response_model=PasswordResetResponse)
async def reset_customer_user_password(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Trigger a password reset for a customer user.

    Generates a reset token that can be sent to the customer.
    In production, this would send an email automatically.
    """
    service = CustomerUserService(db)
    reset_token = service.generate_password_reset_token(user_id)
    return PasswordResetResponse(
        message="Password reset token generated. Send the reset link to the customer.",
        reset_token=reset_token
    )


# ==================== Invitation Endpoints ====================

@router.post("/invite", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
async def invite_customer_user(
    invitation_data: InviteCustomerUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Send an invitation to a customer contact.

    Creates an invitation record and returns the signup link.
    The link should be sent to the customer via email.
    Only managers and admins can invite users.
    """
    service = CustomerUserService(db)
    invitation = service.create_invitation(
        customer_id=invitation_data.customer_id,
        email=invitation_data.email,
        invited_by=current_user,
        full_name=invitation_data.full_name,
        job_title=invitation_data.job_title,
        phone=invitation_data.phone,
        is_primary_contact=invitation_data.is_primary_contact
    )

    # Generate signup link (frontend URL would be configured in settings)
    signup_link = f"/portal/signup?token={invitation.invitation_token}"

    return InvitationResponse(
        id=invitation.id,
        customer_id=invitation.customer_id,
        email=invitation.email,
        invitation_token=invitation.invitation_token,
        signup_link=signup_link,
        expires_at=invitation.expires_at.isoformat(),
        sent_by=current_user.full_name
    )


@router.get("/invitations/by-customer/{customer_id}", response_model=CustomerUserInvitationListResponse)
async def get_pending_invitations(
    customer_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all pending invitations for a customer."""
    service = CustomerUserService(db)
    invitations, total = service.get_pending_invitations(
        customer_id=customer_id,
        skip=skip,
        limit=limit
    )

    # Enrich with details
    invitation_responses = []
    for inv in invitations:
        customer = inv.customer
        invited_by = inv.invited_by
        invitation_responses.append(
            CustomerUserInvitationWithDetails(
                id=inv.id,
                customer_id=inv.customer_id,
                email=inv.email,
                invitation_token=inv.invitation_token,
                invited_by_id=inv.invited_by_id,
                sent_at=inv.sent_at,
                expires_at=inv.expires_at,
                is_used=inv.is_used,
                used_at=inv.used_at,
                customer_name=customer.company_name if customer else None,
                invited_by_name=invited_by.full_name if invited_by else None
            )
        )

    return CustomerUserInvitationListResponse(
        invitations=invitation_responses,
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/invitations/{invitation_id}/resend", response_model=InvitationResponse)
async def resend_invitation(
    invitation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Resend an invitation with a new token and extended expiry.

    Useful if the customer lost the email or the link expired.
    """
    service = CustomerUserService(db)
    invitation = service.resend_invitation(invitation_id, current_user)

    signup_link = f"/portal/signup?token={invitation.invitation_token}"

    return InvitationResponse(
        id=invitation.id,
        customer_id=invitation.customer_id,
        email=invitation.email,
        invitation_token=invitation.invitation_token,
        signup_link=signup_link,
        expires_at=invitation.expires_at.isoformat(),
        sent_by=current_user.full_name
    )


@router.delete("/invitations/{invitation_id}", response_model=MessageResponse)
async def cancel_invitation(
    invitation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """Cancel a pending invitation."""
    service = CustomerUserService(db)
    service.cancel_invitation(invitation_id)
    return MessageResponse(message="Invitation cancelled")


@router.get("/invitations/validate/{token}", response_model=InvitationValidationResponse)
async def validate_invitation_token(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Validate an invitation token.

    This endpoint is public - used by the signup page to verify the link.
    """
    service = CustomerUserService(db)
    result = service.validate_invitation_token(token)
    return InvitationValidationResponse(**result)


# ==================== Portal Access Endpoints ====================

@router.get("/portal-status/{customer_id}", response_model=PortalStatusResponse)
async def get_portal_status(
    customer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get portal access status and user count for a customer."""
    service = CustomerUserService(db)
    status = service.get_customer_portal_status(customer_id)
    return PortalStatusResponse(**status)


@router.post("/portal-access/{customer_id}", response_model=PortalStatusResponse)
async def toggle_portal_access(
    customer_id: UUID,
    toggle_data: TogglePortalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Enable or disable portal access for a customer company.

    When disabled, no users from this company can login to the portal.
    """
    service = CustomerUserService(db)
    service.toggle_customer_portal_access(customer_id, toggle_data.enabled)
    status = service.get_customer_portal_status(customer_id)
    return PortalStatusResponse(**status)


# ==================== Bulk Operations ====================

@router.post("/bulk-invite", response_model=dict, status_code=status.HTTP_201_CREATED)
async def bulk_invite_customer_users(
    bulk_data: BulkInvitationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Send invitations to multiple email addresses at once.

    Returns a summary of successful and failed invitations.
    """
    service = CustomerUserService(db)
    results = {
        "successful": [],
        "failed": []
    }

    for email in bulk_data.emails:
        try:
            invitation = service.create_invitation(
                customer_id=bulk_data.customer_id,
                email=email,
                invited_by=current_user
            )
            signup_link = f"/portal/signup?token={invitation.invitation_token}"
            results["successful"].append({
                "email": email,
                "invitation_id": str(invitation.id),
                "signup_link": signup_link
            })
        except Exception as e:
            results["failed"].append({
                "email": email,
                "error": str(e)
            })

    return {
        "total_requested": len(bulk_data.emails),
        "successful_count": len(results["successful"]),
        "failed_count": len(results["failed"]),
        "results": results
    }
