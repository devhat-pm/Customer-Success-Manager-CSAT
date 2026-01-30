from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any, Dict
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID
from app.models.customer import CustomerStatus
from app.models.health_score import ScoreTrend, RiskLevel


class CustomerBase(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=255)
    industry: Optional[str] = Field(None, max_length=100)
    contact_name: Optional[str] = Field(None, max_length=255)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(None, max_length=50)

    # Deployed products as list
    deployed_products: List[str] = Field(default_factory=list)

    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    contract_value: Optional[Decimal] = Field(None, ge=0)

    # Account manager - support both FK and legacy string
    account_manager_id: Optional[UUID] = None
    account_manager: Optional[str] = Field(None, max_length=255)

    status: CustomerStatus = CustomerStatus.onboarding

    # New fields per specification
    logo_url: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None

    # Customer Portal settings
    portal_enabled: bool = False


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=1, max_length=255)
    industry: Optional[str] = Field(None, max_length=100)
    contact_name: Optional[str] = Field(None, max_length=255)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(None, max_length=50)

    deployed_products: Optional[List[str]] = None

    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    contract_value: Optional[Decimal] = Field(None, ge=0)

    account_manager_id: Optional[UUID] = None
    account_manager: Optional[str] = Field(None, max_length=255)

    status: Optional[CustomerStatus] = None

    logo_url: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None

    # Customer Portal settings
    portal_enabled: Optional[bool] = None


class AccountManagerInfo(BaseModel):
    id: UUID
    full_name: str
    email: str

    class Config:
        from_attributes = True


class CustomerResponse(CustomerBase):
    id: UUID
    account_manager_name: Optional[str] = None
    account_manager_info: Optional[AccountManagerInfo] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LatestHealthScore(BaseModel):
    overall_score: int
    product_adoption_score: int = 0
    support_health_score: int = 0
    engagement_score: int = 0
    financial_health_score: int = 0
    sla_compliance_score: int = 0
    risk_level: Optional[RiskLevel] = None
    score_trend: ScoreTrend
    calculated_at: datetime


class CustomerWithHealthScore(BaseModel):
    id: UUID
    company_name: str
    industry: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    deployed_products: List[str] = []
    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    contract_value: Optional[Decimal] = None
    account_manager: Optional[str] = None
    account_manager_id: Optional[UUID] = None
    account_manager_name: Optional[str] = None
    status: CustomerStatus
    logo_url: Optional[str] = None
    notes: Optional[str] = None
    portal_enabled: bool = False
    created_at: datetime
    updated_at: datetime
    products: List[str] = []  # Legacy field - from product_deployments
    latest_health_score: Optional[LatestHealthScore] = None


class CustomerListResponse(BaseModel):
    customers: List[CustomerWithHealthScore]
    total: int
    skip: int
    limit: int


class HealthScoreSummary(BaseModel):
    overall_score: int
    product_adoption_score: int = 0
    support_health_score: int = 0
    engagement_score: int = 0
    financial_health_score: int = 0
    sla_compliance_score: int = 0
    # Legacy fields for backward compatibility
    adoption_score: Optional[int] = None
    support_score: Optional[int] = None
    financial_score: Optional[int] = None
    risk_level: Optional[RiskLevel] = None
    score_trend: ScoreTrend
    calculated_at: datetime


class ProductHealthScore(BaseModel):
    product_name: str
    deployment_id: UUID
    latest_health_score: Optional[HealthScoreSummary] = None


class InteractionSummary(BaseModel):
    id: UUID
    interaction_type: str
    subject: str
    description: str
    sentiment: str
    performed_by: str
    interaction_date: datetime
    follow_up_required: bool

    class Config:
        from_attributes = True


class AlertSummary(BaseModel):
    id: UUID
    alert_type: str
    severity: str
    title: str
    description: str
    is_resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CSATSurveySummary(BaseModel):
    id: UUID
    survey_type: str
    score: int
    feedback_text: Optional[str] = None
    submitted_by_name: str
    submitted_at: datetime

    class Config:
        from_attributes = True


class CSATStats(BaseModel):
    total_surveys: int
    average_score: Optional[float] = None
    recent_surveys: List[CSATSurveySummary]


class ProductDeploymentSummary(BaseModel):
    id: UUID
    product_name: str
    deployment_date: date
    version: str
    environment: str
    license_type: str
    license_expiry: date
    is_active: bool

    class Config:
        from_attributes = True


class CustomerDetailResponse(BaseModel):
    customer: CustomerResponse
    product_deployments: List[ProductDeploymentSummary]
    health_scores_per_product: List[ProductHealthScore]
    overall_health_score: Optional[HealthScoreSummary] = None
    recent_interactions: List[InteractionSummary]
    active_alerts: List[AlertSummary]
    csat_summary: CSATStats


class TimelineItem(BaseModel):
    type: str
    id: UUID
    date: datetime
    title: str
    description: Optional[str] = None
    metadata: Dict[str, Any]


class TimelineResponse(BaseModel):
    items: List[TimelineItem]
    total: int
    skip: int
    limit: int


class HealthHistoryItem(BaseModel):
    id: UUID
    overall_score: int
    product_adoption_score: int = 0
    support_health_score: int = 0
    engagement_score: int = 0
    financial_health_score: int = 0
    sla_compliance_score: int = 0
    # Legacy fields
    adoption_score: Optional[int] = None
    support_score: Optional[int] = None
    financial_score: Optional[int] = None
    risk_level: Optional[RiskLevel] = None
    score_trend: ScoreTrend
    calculated_at: datetime
    factors: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class HealthHistoryResponse(BaseModel):
    health_scores: List[HealthHistoryItem]
    total: int
    skip: int
    limit: int


class CustomerWithRelations(CustomerResponse):
    product_deployments: List["ProductDeploymentResponse"] = []
    health_scores: List["HealthScoreResponse"] = []

    class Config:
        from_attributes = True


from app.schemas.product_deployment import ProductDeploymentResponse
from app.schemas.health_score import HealthScoreResponse
CustomerWithRelations.model_rebuild()
