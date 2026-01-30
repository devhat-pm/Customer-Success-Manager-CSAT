"""
Schemas for Customer Portal Dashboard.
Provides limited view of customer data compared to staff dashboards.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from app.models.support_ticket import TicketStatus, TicketPriority, ProductType
from app.models.announcement import AnnouncementPriority


# ==================== Health Score (Limited View) ====================

class CustomerHealthScore(BaseModel):
    """
    Limited health score view for customers.
    Only shows overall score, not component breakdown.
    """
    overall_score: int = Field(..., ge=0, le=100)
    trend: str  # "improving", "stable", "declining"
    risk_level: str  # "low", "medium", "attention_needed" (renamed from "critical" for customer view)
    health_message: str  # Simple message based on score
    last_calculated: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==================== Tickets Summary ====================

class RecentTicket(BaseModel):
    """Recent ticket for dashboard display."""
    id: UUID
    ticket_number: str
    subject: str
    status: TicketStatus
    priority: TicketPriority
    product: ProductType
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TicketsSummary(BaseModel):
    """Summary of customer tickets."""
    open_count: int
    in_progress_count: int
    resolved_count: int
    closed_count: int
    total_count: int
    recent_tickets: List[RecentTicket]


# ==================== Products ====================

class DeployedProduct(BaseModel):
    """Deployed product info for customer."""
    product_name: str
    deployment_id: Optional[UUID] = None
    is_active: bool
    deployed_date: Optional[date] = None
    version: Optional[str] = None
    documentation_url: Optional[str] = None

    class Config:
        from_attributes = True


class CustomerProducts(BaseModel):
    """List of products deployed for customer."""
    products: List[DeployedProduct]
    total: int


# ==================== Activity ====================

class ActivityItem(BaseModel):
    """Activity item for customer view."""
    id: UUID
    activity_type: str  # "ticket_created", "ticket_updated", "survey_completed", etc.
    title: str
    description: Optional[str] = None
    related_id: Optional[UUID] = None  # ID of related object (ticket, survey, etc.)
    related_type: Optional[str] = None  # "ticket", "survey", etc.
    timestamp: datetime

    class Config:
        from_attributes = True


class RecentActivity(BaseModel):
    """Recent activity list."""
    activities: List[ActivityItem]
    total: int


# ==================== Pending Surveys ====================

class PendingSurveyItem(BaseModel):
    """Pending survey for dashboard."""
    id: UUID
    survey_type: str
    related_ticket_number: Optional[str] = None
    expires_at: datetime
    survey_url: str

    class Config:
        from_attributes = True


class PendingSurveys(BaseModel):
    """Pending surveys summary."""
    surveys: List[PendingSurveyItem]
    total: int


# ==================== Contract Info ====================

class AccountManagerInfo(BaseModel):
    """Account manager contact info."""
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        from_attributes = True


class ContractInfo(BaseModel):
    """Contract information for customer."""
    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    days_until_renewal: Optional[int] = None
    is_expiring_soon: bool = False  # Within 90 days
    account_manager: Optional[AccountManagerInfo] = None

    class Config:
        from_attributes = True


# ==================== Announcements ====================

class AnnouncementItem(BaseModel):
    """Announcement for customer view."""
    id: UUID
    title: str
    content: str
    priority: AnnouncementPriority
    start_date: datetime
    end_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class AnnouncementsList(BaseModel):
    """List of announcements."""
    announcements: List[AnnouncementItem]
    total: int


# ==================== Full Dashboard Response ====================

class CustomerDashboard(BaseModel):
    """
    Complete dashboard data for customer portal.
    Single API call returns all dashboard information.
    """
    # Welcome info
    customer_name: str
    company_name: str
    logo_url: Optional[str] = None
    last_login: Optional[datetime] = None

    # Health score (limited view)
    health_score: Optional[CustomerHealthScore] = None

    # Tickets
    tickets_summary: TicketsSummary

    # Products
    products: CustomerProducts

    # Activity
    recent_activity: RecentActivity

    # Surveys
    pending_surveys: PendingSurveys

    # Contract
    contract_info: ContractInfo

    # Announcements
    announcements: AnnouncementsList


# ==================== Staff Announcement Management ====================

class AnnouncementCreate(BaseModel):
    """Create a new announcement."""
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    start_date: datetime
    end_date: Optional[datetime] = None
    target_type: str = Field(default="all_customers", pattern="^(all_customers|specific_customers)$")
    target_customer_ids: List[UUID] = []
    priority: AnnouncementPriority = AnnouncementPriority.normal


class AnnouncementUpdate(BaseModel):
    """Update an announcement."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=1)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    target_type: Optional[str] = Field(None, pattern="^(all_customers|specific_customers)$")
    target_customer_ids: Optional[List[UUID]] = None
    priority: Optional[AnnouncementPriority] = None
    is_active: Optional[bool] = None


class AnnouncementResponse(BaseModel):
    """Full announcement details (staff view)."""
    id: UUID
    title: str
    content: str
    start_date: datetime
    end_date: Optional[datetime] = None
    target_type: str
    target_customer_ids: List[str]
    priority: AnnouncementPriority
    is_active: bool
    created_by_id: Optional[UUID] = None
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AnnouncementListResponse(BaseModel):
    """List of announcements (staff view)."""
    announcements: List[AnnouncementResponse]
    total: int
    skip: int
    limit: int
