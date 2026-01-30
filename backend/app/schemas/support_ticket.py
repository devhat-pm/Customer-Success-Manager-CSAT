from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from enum import Enum


class ProductType(str, Enum):
    MonetX = "MonetX"
    SupportX = "SupportX"
    GreenX = "GreenX"


class TicketPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class TicketStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"


class CreatorType(str, Enum):
    customer = "customer"
    staff = "staff"


# ==================== Ticket Comment Schemas ====================

class CommentCreate(BaseModel):
    """Schema for creating a comment."""
    comment_text: str = Field(..., min_length=1)
    is_internal: bool = False  # Only staff can set this to true
    attachments: List[str] = Field(default_factory=list)


class CommentResponse(BaseModel):
    """Schema for comment response."""
    id: UUID
    ticket_id: UUID
    comment_text: str
    commenter_type: CreatorType
    commenter_name: Optional[str] = None
    commenter_customer_user_id: Optional[UUID] = None
    commenter_staff_user_id: Optional[UUID] = None
    is_internal: bool
    attachments: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True


class CommentListResponse(BaseModel):
    """Schema for list of comments."""
    comments: List[CommentResponse]
    total: int


# ==================== Ticket Base Schemas ====================

class TicketBase(BaseModel):
    subject: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    product: ProductType
    priority: TicketPriority = TicketPriority.medium


# ==================== Staff Ticket Schemas ====================

class TicketCreate(TicketBase):
    """Schema for staff creating a ticket."""
    customer_id: UUID
    customer_contact_email: Optional[EmailStr] = None
    internal_notes: Optional[str] = None
    customer_visible_notes: Optional[str] = None
    notify_customer: bool = False  # Whether to send email to customer


class TicketUpdate(BaseModel):
    """Schema for updating a ticket."""
    subject: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    product: Optional[ProductType] = None
    priority: Optional[TicketPriority] = None
    status: Optional[TicketStatus] = None
    internal_notes: Optional[str] = None
    customer_visible_notes: Optional[str] = None


# ==================== Customer Ticket Schemas ====================

class CustomerTicketCreate(BaseModel):
    """Schema for customer creating a ticket (simpler - no customer_id needed)."""
    subject: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    product: ProductType
    priority: TicketPriority = TicketPriority.medium


class CustomerTicketUpdate(BaseModel):
    """Schema for customer updating their ticket (limited fields)."""
    description: Optional[str] = None
    # Customers can only update description, not priority/product/status


# ==================== Response Schemas ====================

class CustomerInfo(BaseModel):
    id: UUID
    company_name: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None

    class Config:
        from_attributes = True


class CreatorInfo(BaseModel):
    """Info about who created the ticket."""
    type: CreatorType
    name: Optional[str] = None
    email: Optional[str] = None


class TicketResponse(BaseModel):
    """Full ticket response for staff view."""
    id: UUID
    customer_id: UUID
    ticket_number: str
    subject: str
    description: Optional[str]
    product: ProductType
    priority: TicketPriority
    status: TicketStatus
    sla_breached: bool
    resolution_time_hours: Optional[float]
    created_by_type: CreatorType
    created_by_customer_user_id: Optional[UUID] = None
    created_by_staff_user_id: Optional[UUID] = None
    customer_contact_email: Optional[str] = None
    internal_notes: Optional[str] = None
    customer_visible_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True


class TicketWithCustomer(TicketResponse):
    """Ticket with customer details for staff view."""
    customer: Optional[CustomerInfo] = None
    creator_name: Optional[str] = None
    comment_count: int = 0

    class Config:
        from_attributes = True


class CustomerTicketResponse(BaseModel):
    """Ticket response for customer view (no internal fields)."""
    id: UUID
    ticket_number: str
    subject: str
    description: Optional[str]
    product: ProductType
    priority: TicketPriority
    status: TicketStatus
    sla_breached: bool
    customer_visible_notes: Optional[str] = None
    created_by_type: CreatorType
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]
    comment_count: int = 0

    class Config:
        from_attributes = True


class CustomerTicketDetail(CustomerTicketResponse):
    """Detailed ticket view for customers including comments."""
    comments: List[CommentResponse] = []
    company_name: Optional[str] = None

    class Config:
        from_attributes = True


class TicketDetailResponse(TicketWithCustomer):
    """Detailed ticket view for staff including all comments."""
    comments: List[CommentResponse] = []

    class Config:
        from_attributes = True


# ==================== List Responses ====================

class TicketListResponse(BaseModel):
    tickets: List[TicketWithCustomer]
    total: int
    skip: int
    limit: int


class CustomerTicketListResponse(BaseModel):
    """Ticket list for customers."""
    tickets: List[CustomerTicketResponse]
    total: int
    skip: int
    limit: int


# ==================== Stats ====================

class TicketStats(BaseModel):
    total_tickets: int
    open_tickets: int
    in_progress_tickets: int
    resolved_tickets: int
    closed_tickets: int
    by_priority: dict
    by_product: dict
    sla_breach_count: int
    sla_breach_rate: float
    avg_resolution_time_hours: Optional[float]
    critical_open_count: int


class CriticalTicketsResponse(BaseModel):
    tickets: List[TicketWithCustomer]
    total: int
