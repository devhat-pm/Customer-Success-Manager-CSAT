from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class CustomerUserBase(BaseModel):
    """Base schema for customer user fields."""
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    job_title: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)
    is_primary_contact: bool = False


class CustomerUserCreate(CustomerUserBase):
    """Schema for creating a new customer user."""
    customer_id: UUID
    password: str = Field(..., min_length=8, max_length=100)


class CustomerUserCreateByInvitation(BaseModel):
    """Schema for creating customer user from invitation."""
    invitation_token: str = Field(..., min_length=1)
    password: str = Field(..., min_length=8, max_length=100)
    full_name: str = Field(..., min_length=1, max_length=255)
    job_title: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)


class CustomerUserUpdate(BaseModel):
    """Schema for updating a customer user."""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    job_title: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)
    is_primary_contact: Optional[bool] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8, max_length=100)


class CustomerUserResponse(CustomerUserBase):
    """Schema for customer user response."""
    id: UUID
    customer_id: UUID
    is_active: bool
    is_verified: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CustomerUserWithCustomer(CustomerUserResponse):
    """Schema for customer user response with customer details."""
    customer_name: Optional[str] = None
    customer_logo_url: Optional[str] = None

    class Config:
        from_attributes = True


class CustomerUserLogin(BaseModel):
    """Schema for customer user login."""
    email: EmailStr
    password: str


class CustomerUserToken(BaseModel):
    """Schema for customer user authentication tokens."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: CustomerUserResponse


class CustomerUserTokenPayload(BaseModel):
    """Schema for customer user token payload."""
    sub: Optional[str] = None
    exp: Optional[int] = None
    type: Optional[str] = None
    user_type: str = "customer"  # Distinguishes from staff users


class CustomerUserPasswordChange(BaseModel):
    """Schema for customer user password change."""
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=100)


class CustomerUserProfileUpdate(BaseModel):
    """Schema for customer user profile self-update."""
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    job_title: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)


class CustomerUserListResponse(BaseModel):
    """Schema for paginated customer user list."""
    customer_users: list[CustomerUserResponse]
    total: int
    skip: int
    limit: int


class CustomerUserBriefResponse(BaseModel):
    """Brief customer user response for listings."""
    id: UUID
    email: str
    full_name: str
    job_title: Optional[str] = None
    is_primary_contact: bool
    is_active: bool
    is_verified: bool
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True
