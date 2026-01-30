"""
CSAT Survey and Survey Request Schemas.
Supports both push (Extravis sends) and pull (customer submits) flows.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from app.models.csat_survey import SurveyType, SubmissionVia, SurveyRequestStatus


# ==================== Base Schemas ====================

class CSATSurveyBase(BaseModel):
    customer_id: UUID
    product_deployment_id: Optional[UUID] = None
    survey_type: SurveyType
    score: int = Field(..., ge=0, le=10)
    feedback_text: Optional[str] = None
    submitted_by_name: str = Field(..., min_length=1, max_length=255)
    submitted_by_email: EmailStr
    ticket_reference: Optional[str] = Field(None, max_length=100)


class CSATSurveyCreate(CSATSurveyBase):
    """Create CSAT survey (staff manual entry)."""
    linked_ticket_id: Optional[UUID] = None


class CSATSurveyUpdate(BaseModel):
    product_deployment_id: Optional[UUID] = None
    survey_type: Optional[SurveyType] = None
    score: Optional[int] = Field(None, ge=0, le=10)
    feedback_text: Optional[str] = None
    submitted_by_name: Optional[str] = Field(None, min_length=1, max_length=255)
    submitted_by_email: Optional[EmailStr] = None
    ticket_reference: Optional[str] = Field(None, max_length=100)


class CSATSurveyResponse(BaseModel):
    """Full CSAT survey response for staff view."""
    id: UUID
    customer_id: UUID
    product_deployment_id: Optional[UUID] = None
    survey_type: SurveyType
    score: int
    feedback_text: Optional[str] = None
    submitted_by_name: str
    submitted_by_email: str
    submitted_at: datetime
    ticket_reference: Optional[str] = None
    linked_ticket_id: Optional[UUID] = None
    survey_request_id: Optional[UUID] = None
    submitted_by_customer_user_id: Optional[UUID] = None
    submitted_anonymously: bool = False
    submitted_via: SubmissionVia = SubmissionVia.manual_entry
    entered_by_staff_id: Optional[UUID] = None
    # Additional fields for frontend display
    customer_name: Optional[str] = None
    product: Optional[str] = None
    feedback: Optional[str] = None
    submitted_by: Optional[str] = None
    respondent_email: Optional[str] = None

    class Config:
        from_attributes = True


class CSATListResponse(BaseModel):
    surveys: List[CSATSurveyResponse]
    total: int
    skip: int
    limit: int


# ==================== Analytics Schemas ====================

class RecentFeedback(BaseModel):
    id: UUID
    survey_type: str
    score: int
    feedback: Optional[str] = None
    submitted_at: str
    submitted_by: str


class ScoreTrendItem(BaseModel):
    month: str
    average_score: float
    response_count: int


class CSATCustomerSummary(BaseModel):
    customer_id: UUID
    customer_name: str
    total_responses: int
    average_csat: Optional[float] = None
    nps_score: Optional[int] = None
    response_count_by_type: Dict[str, int]
    score_trend: List[ScoreTrendItem]
    recent_feedback: List[RecentFeedback]


class ProductScore(BaseModel):
    count: int
    average: float


class SurveyTypeStats(BaseModel):
    count: int
    average: float


class ThemeItem(BaseModel):
    keyword: str
    count: int


class ThemesAnalysis(BaseModel):
    positive: List[ThemeItem]
    negative: List[ThemeItem]


class ProductAnalytics(BaseModel):
    product: str
    avg_score: float
    response_count: int
    trend: float = 0
    distribution: Dict[int, int] = {}
    recent_feedback: List[Dict[str, Any]] = []


class CSATAnalyticsResponse(BaseModel):
    total_responses: int
    avg_csat: Optional[float] = None
    csat_trend: float = 0
    nps_score: Optional[int] = None
    nps_trend: int = 0
    promoters_pct: float = 0
    passives_pct: float = 0
    detractors_pct: float = 0
    promoters_count: int = 0
    passives_count: int = 0
    detractors_count: int = 0
    last_month_responses: int = 0
    response_rate: float = 0
    by_product: List[ProductAnalytics] = []
    by_survey_type: Dict[str, SurveyTypeStats] = {}
    monthly_trend: List[ScoreTrendItem] = []
    top_themes: ThemesAnalysis = ThemesAnalysis(positive=[], negative=[])


# ==================== Survey Link Schemas (Legacy) ====================

class GenerateSurveyLinkRequest(BaseModel):
    customer_id: UUID
    survey_type: SurveyType
    product_deployment_id: Optional[UUID] = None
    ticket_reference: Optional[str] = None
    expires_in_days: int = Field(default=7, ge=1, le=30)


class SurveyLinkResponse(BaseModel):
    token: str
    survey_url: str
    customer_name: str
    survey_type: str
    expires_at: str


class PublicSurveySubmit(BaseModel):
    score: int = Field(..., ge=0, le=10)
    feedback_text: Optional[str] = None
    submitted_by_name: str = Field(..., min_length=1, max_length=255)
    submitted_by_email: EmailStr


class SurveyTokenInfo(BaseModel):
    customer_id: str
    survey_type: str
    product_deployment_id: Optional[str] = None
    ticket_reference: Optional[str] = None
    expires_at: str


# ==================== Survey Request Schemas ====================

class SurveyRequestCreate(BaseModel):
    """Create a survey request (send survey to customer)."""
    customer_id: UUID
    survey_type: SurveyType
    target_email: Optional[str] = None  # Specific email, null = use customer contacts
    target_type: str = Field(default="primary", pattern="^(all|primary|specific)$")  # all, primary, specific
    linked_ticket_id: Optional[UUID] = None
    custom_message: Optional[str] = None
    expires_in_days: int = Field(default=30, ge=1, le=90)


class BulkSurveyRequestCreate(BaseModel):
    """Send surveys to multiple customers."""
    customer_ids: List[UUID] = Field(..., min_length=1, max_length=100)
    survey_type: SurveyType
    target_type: str = Field(default="primary", pattern="^(all|primary|specific)$")
    custom_message: Optional[str] = None
    expires_in_days: int = Field(default=30, ge=1, le=90)


class SurveyRequestResponse(BaseModel):
    """Survey request details."""
    id: UUID
    customer_id: UUID
    customer_name: Optional[str] = None
    target_email: Optional[str] = None
    survey_type: SurveyType
    linked_ticket_id: Optional[UUID] = None
    linked_ticket_number: Optional[str] = None
    unique_survey_token: str
    sent_by_staff_id: Optional[UUID] = None
    sent_by_staff_name: Optional[str] = None
    status: SurveyRequestStatus
    created_at: datetime
    sent_at: Optional[datetime] = None
    expires_at: datetime
    reminder_sent_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    csat_response_id: Optional[UUID] = None
    custom_message: Optional[str] = None

    class Config:
        from_attributes = True


class SurveyRequestListResponse(BaseModel):
    requests: List[SurveyRequestResponse]
    total: int
    skip: int
    limit: int


class SurveyRequestStats(BaseModel):
    """Statistics for survey requests."""
    total_sent: int
    pending: int
    completed: int
    expired: int
    cancelled: int
    completion_rate: float


# ==================== Customer Portal Survey Schemas ====================

class CustomerFeedbackSubmit(BaseModel):
    """Customer voluntary feedback submission."""
    survey_type: SurveyType = Field(default=SurveyType.general_feedback)
    product: Optional[str] = None  # Product name if product_feedback type
    score: int = Field(..., ge=1, le=5)  # 1-5 stars
    feedback_text: Optional[str] = None
    submit_anonymously: bool = False


class CustomerSurveyTokenSubmit(BaseModel):
    """Submit survey via token (from email link)."""
    score: int = Field(..., ge=0, le=10)  # 0-10 for NPS, 1-5 for CSAT (validated in service)
    feedback_text: Optional[str] = None
    submitter_name: Optional[str] = None  # Optional, may already know from token
    submitter_email: Optional[str] = None  # Optional, may already know from token


class CustomerPendingSurvey(BaseModel):
    """Pending survey for customer view."""
    id: UUID
    survey_type: SurveyType
    linked_ticket_id: Optional[UUID] = None
    linked_ticket_number: Optional[str] = None
    linked_ticket_subject: Optional[str] = None
    sent_at: Optional[datetime] = None
    expires_at: datetime
    custom_message: Optional[str] = None
    survey_url: str

    class Config:
        from_attributes = True


class CustomerPendingSurveyList(BaseModel):
    surveys: List[CustomerPendingSurvey]
    total: int


class CustomerFeedbackHistory(BaseModel):
    """Customer's submitted feedback."""
    id: UUID
    survey_type: SurveyType
    product: Optional[str] = None
    score: int
    feedback_text: Optional[str] = None
    submitted_at: datetime
    linked_ticket_number: Optional[str] = None

    class Config:
        from_attributes = True


class CustomerFeedbackHistoryList(BaseModel):
    feedback: List[CustomerFeedbackHistory]
    total: int


class PublicSurveyView(BaseModel):
    """Survey info for public (unauthenticated) view via token."""
    survey_type: SurveyType
    customer_name: str
    linked_ticket_number: Optional[str] = None
    linked_ticket_subject: Optional[str] = None
    custom_message: Optional[str] = None
    expires_at: datetime
    is_expired: bool
    is_completed: bool


# ==================== Staff Manual Entry Schema ====================

class StaffManualCSATEntry(BaseModel):
    """Staff manual entry of CSAT response (from phone/email feedback)."""
    customer_id: UUID
    survey_type: SurveyType
    score: int = Field(..., ge=1, le=5)
    feedback_text: Optional[str] = None
    submitted_by_name: str = Field(..., min_length=1, max_length=255)
    submitted_by_email: EmailStr
    linked_ticket_id: Optional[UUID] = None
    survey_request_id: Optional[UUID] = None  # If related to a survey request
    product: Optional[str] = None  # Product name for product_feedback type
