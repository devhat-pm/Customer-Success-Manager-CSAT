"""
Customer Portal Authentication Endpoints.
Handles login, signup, password management for customer users.
Separate from staff authentication.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

from app.core.database import get_db
from app.core.customer_dependencies import (
    get_current_customer_user,
    CustomerUserContext
)
from app.services.customer_auth_service import CustomerAuthService

router = APIRouter(prefix="/portal/auth", tags=["Customer Portal Authentication"])


# ==================== Request/Response Schemas ====================

class InvitationValidationRequest(BaseModel):
    """Request to validate invitation token."""
    token: str


class InvitationValidationResponse(BaseModel):
    """Response from invitation validation."""
    valid: bool
    email: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_logo: Optional[str] = None
    expires_at: Optional[str] = None
    message: Optional[str] = None


class SignupRequest(BaseModel):
    """Request to complete signup via invitation."""
    token: str
    password: str = Field(..., min_length=8)
    password_confirmation: str = Field(..., min_length=8)
    full_name: Optional[str] = Field(None, max_length=255)
    job_title: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)


class SignupResponse(BaseModel):
    """Response from successful signup."""
    message: str
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class LoginRequest(BaseModel):
    """Request for customer login."""
    email: EmailStr
    password: str
    remember_me: bool = False


class LoginResponse(BaseModel):
    """Response from successful login."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict
    company: dict


class TokenRefreshRequest(BaseModel):
    """Request to refresh access token."""
    refresh_token: str


class TokenRefreshResponse(BaseModel):
    """Response from token refresh."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class ProfileResponse(BaseModel):
    """Response with user profile."""
    user: dict
    company: Optional[dict] = None


class ProfileUpdateRequest(BaseModel):
    """Request to update profile."""
    full_name: Optional[str] = Field(None, max_length=255)
    job_title: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)


class PasswordChangeRequest(BaseModel):
    """Request to change password."""
    current_password: str
    new_password: str = Field(..., min_length=8)


class PasswordResetRequest(BaseModel):
    """Request password reset."""
    email: EmailStr


class PasswordResetComplete(BaseModel):
    """Complete password reset."""
    token: str
    new_password: str = Field(..., min_length=8)


class ResetTokenValidationResponse(BaseModel):
    """Response from reset token validation."""
    valid: bool
    email: Optional[str] = None
    message: Optional[str] = None


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str


# ==================== Invitation & Signup Endpoints ====================

@router.post("/validate-invitation", response_model=InvitationValidationResponse)
async def validate_invitation(
    request: InvitationValidationRequest,
    db: Session = Depends(get_db)
):
    """
    Validate an invitation token.

    **Public endpoint** - no authentication required.
    Used by signup page to verify the invitation link is valid.
    """
    service = CustomerAuthService(db)
    result = service.validate_invitation(request.token)
    return InvitationValidationResponse(**result)


@router.get("/validate-invitation/{token}", response_model=InvitationValidationResponse)
async def validate_invitation_get(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Validate an invitation token (GET version for easy link checking).

    **Public endpoint** - no authentication required.
    """
    service = CustomerAuthService(db)
    result = service.validate_invitation(token)
    return InvitationValidationResponse(**result)


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def complete_signup(
    request: SignupRequest,
    db: Session = Depends(get_db)
):
    """
    Complete signup using an invitation token.

    **Public endpoint** - no authentication required.

    Creates the customer user account and returns tokens for auto-login.
    Password must:
    - Be at least 8 characters
    - Contain at least one uppercase letter
    - Contain at least one number
    """
    service = CustomerAuthService(db)
    customer_user, access_token, refresh_token = service.complete_signup(
        token=request.token,
        password=request.password,
        password_confirmation=request.password_confirmation,
        full_name=request.full_name,
        job_title=request.job_title,
        phone=request.phone
    )

    return SignupResponse(
        message="Account created successfully",
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user={
            "id": str(customer_user.id),
            "email": customer_user.email,
            "full_name": customer_user.full_name,
            "job_title": customer_user.job_title,
            "phone": customer_user.phone
        }
    )


# ==================== Login/Logout Endpoints ====================

@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Customer portal login.

    **Public endpoint** - no authentication required.

    Returns JWT tokens and user/company info.
    Use `remember_me: true` for extended session (30 days).
    """
    service = CustomerAuthService(db)
    access_token, refresh_token, customer_user, customer = service.login(
        email=request.email,
        password=request.password,
        remember_me=request.remember_me
    )

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user={
            "id": str(customer_user.id),
            "email": customer_user.email,
            "full_name": customer_user.full_name,
            "job_title": customer_user.job_title,
            "phone": customer_user.phone,
            "is_primary_contact": customer_user.is_primary_contact
        },
        company={
            "id": str(customer.id),
            "name": customer.company_name,
            "logo_url": customer.logo_url,
            "industry": customer.industry
        }
    )


@router.post("/login/form", response_model=LoginResponse)
async def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Customer portal login using OAuth2 form format.

    **Public endpoint** - for OAuth2 compatibility.
    """
    service = CustomerAuthService(db)
    access_token, refresh_token, customer_user, customer = service.login(
        email=form_data.username,
        password=form_data.password,
        remember_me=False
    )

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user={
            "id": str(customer_user.id),
            "email": customer_user.email,
            "full_name": customer_user.full_name,
            "job_title": customer_user.job_title,
            "phone": customer_user.phone,
            "is_primary_contact": customer_user.is_primary_contact
        },
        company={
            "id": str(customer.id),
            "name": customer.company_name,
            "logo_url": customer.logo_url,
            "industry": customer.industry
        }
    )


@router.post("/refresh", response_model=TokenRefreshResponse)
async def refresh_token(
    request: TokenRefreshRequest,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token.

    **Public endpoint** - uses refresh token for authentication.
    """
    service = CustomerAuthService(db)
    access_token, new_refresh_token = service.refresh_access_token(
        request.refresh_token
    )

    return TokenRefreshResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer"
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: TokenRefreshRequest,
    db: Session = Depends(get_db)
):
    """
    Logout by invalidating the refresh token.

    Clears the customer's session.
    """
    service = CustomerAuthService(db)
    service.logout(request.refresh_token)
    return MessageResponse(message="Successfully logged out")


# ==================== Profile Endpoints ====================

@router.get("/me", response_model=ProfileResponse)
async def get_profile(
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Get current customer user's profile.

    **Requires customer authentication.**
    """
    service = CustomerAuthService(db)
    profile = service.get_profile(context.customer_user)
    return ProfileResponse(**profile)


@router.put("/me", response_model=ProfileResponse)
async def update_profile(
    request: ProfileUpdateRequest,
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Update current customer user's profile.

    **Requires customer authentication.**

    Can update: full_name, job_title, phone.
    Cannot update email - contact your account manager.
    """
    service = CustomerAuthService(db)
    customer_user = service.update_profile(
        customer_user=context.customer_user,
        full_name=request.full_name,
        job_title=request.job_title,
        phone=request.phone
    )

    profile = service.get_profile(customer_user)
    return ProfileResponse(**profile)


@router.post("/me/change-password", response_model=MessageResponse)
async def change_password(
    request: PasswordChangeRequest,
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Change password for authenticated customer user.

    **Requires customer authentication.**

    New password must:
    - Be at least 8 characters
    - Contain at least one uppercase letter
    - Contain at least one number
    """
    service = CustomerAuthService(db)
    service.change_password(
        customer_user=context.customer_user,
        current_password=request.current_password,
        new_password=request.new_password
    )
    return MessageResponse(message="Password changed successfully")


# ==================== Password Reset Endpoints ====================

@router.post("/forgot-password", response_model=MessageResponse)
async def request_password_reset(
    request: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """
    Request a password reset email.

    **Public endpoint** - no authentication required.

    For security, always returns the same message whether
    the email exists or not.
    """
    service = CustomerAuthService(db)
    service.request_password_reset(request.email)
    return MessageResponse(
        message="If an account exists with this email, a password reset link has been sent."
    )


@router.get("/reset-password/validate/{token}", response_model=ResetTokenValidationResponse)
async def validate_reset_token(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Validate a password reset token.

    **Public endpoint** - no authentication required.
    Used by reset page to verify the link is valid before showing form.
    """
    service = CustomerAuthService(db)
    result = service.validate_reset_token(token)
    return ResetTokenValidationResponse(**result)


@router.post("/reset-password", response_model=MessageResponse)
async def complete_password_reset(
    request: PasswordResetComplete,
    db: Session = Depends(get_db)
):
    """
    Complete password reset using token.

    **Public endpoint** - no authentication required.

    New password must:
    - Be at least 8 characters
    - Contain at least one uppercase letter
    - Contain at least one number
    """
    service = CustomerAuthService(db)
    service.complete_password_reset(
        token=request.token,
        new_password=request.new_password
    )
    return MessageResponse(message="Password has been reset successfully. You can now log in.")
