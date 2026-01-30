from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class CustomerUserInvitationBase(BaseModel):
    """Base schema for customer user invitation fields."""
    email: EmailStr
    customer_id: UUID


class CustomerUserInvitationCreate(CustomerUserInvitationBase):
    """Schema for creating a new invitation."""
    pass


class CustomerUserInvitationResponse(CustomerUserInvitationBase):
    """Schema for invitation response."""
    id: UUID
    invitation_token: str
    invited_by_id: Optional[UUID] = None
    sent_at: datetime
    expires_at: datetime
    is_used: bool
    used_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CustomerUserInvitationWithDetails(CustomerUserInvitationResponse):
    """Schema for invitation response with related details."""
    customer_name: Optional[str] = None
    invited_by_name: Optional[str] = None

    class Config:
        from_attributes = True


class CustomerUserInvitationListResponse(BaseModel):
    """Schema for paginated invitation list."""
    invitations: list[CustomerUserInvitationWithDetails]
    total: int
    skip: int
    limit: int


class InvitationValidationResponse(BaseModel):
    """Schema for invitation token validation response."""
    valid: bool
    email: Optional[str] = None
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    expires_at: Optional[datetime] = None
    message: Optional[str] = None


class ResendInvitationRequest(BaseModel):
    """Schema for resending an invitation."""
    invitation_id: UUID


class BulkInvitationCreate(BaseModel):
    """Schema for creating multiple invitations at once."""
    customer_id: UUID
    emails: list[EmailStr] = Field(..., min_length=1, max_length=50)
