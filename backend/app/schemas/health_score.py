from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, date
from uuid import UUID
from app.models.health_score import ScoreTrend, RiskLevel
from app.models.customer import CustomerStatus


class HealthScoreBase(BaseModel):
    customer_id: UUID
    product_deployment_id: Optional[UUID] = None
    overall_score: int = Field(..., ge=0, le=100)

    # New fields per specification (5 components with specific weights)
    product_adoption_score: int = Field(0, ge=0, le=100)      # 15% weight
    support_health_score: int = Field(0, ge=0, le=100)        # 25% weight
    engagement_score: int = Field(0, ge=0, le=100)            # 20% weight
    financial_health_score: int = Field(0, ge=0, le=100)      # 20% weight
    sla_compliance_score: int = Field(0, ge=0, le=100)        # 20% weight

    # Legacy fields (for backward compatibility)
    adoption_score: Optional[int] = Field(None, ge=0, le=100)
    support_score: Optional[int] = Field(None, ge=0, le=100)
    financial_score: Optional[int] = Field(None, ge=0, le=100)

    # Risk and trend per specification
    risk_level: RiskLevel = RiskLevel.medium
    score_trend: ScoreTrend = ScoreTrend.stable
    notes: Optional[str] = None
    factors: Optional[Dict[str, Any]] = None


class HealthScoreCreate(HealthScoreBase):
    pass


class HealthScoreUpdate(BaseModel):
    product_deployment_id: Optional[UUID] = None
    overall_score: Optional[int] = Field(None, ge=0, le=100)

    # New fields
    product_adoption_score: Optional[int] = Field(None, ge=0, le=100)
    support_health_score: Optional[int] = Field(None, ge=0, le=100)
    engagement_score: Optional[int] = Field(None, ge=0, le=100)
    financial_health_score: Optional[int] = Field(None, ge=0, le=100)
    sla_compliance_score: Optional[int] = Field(None, ge=0, le=100)

    # Legacy fields
    adoption_score: Optional[int] = Field(None, ge=0, le=100)
    support_score: Optional[int] = Field(None, ge=0, le=100)
    financial_score: Optional[int] = Field(None, ge=0, le=100)

    risk_level: Optional[RiskLevel] = None
    score_trend: Optional[ScoreTrend] = None
    notes: Optional[str] = None
    factors: Optional[Dict[str, Any]] = None


class HealthScoreResponse(HealthScoreBase):
    id: UUID
    calculated_at: datetime

    class Config:
        from_attributes = True


class HealthScoreWithBreakdown(BaseModel):
    id: UUID
    customer_id: UUID
    product_deployment_id: Optional[UUID] = None
    overall_score: int

    # New fields per specification
    product_adoption_score: int = 0
    support_health_score: int = 0
    engagement_score: int = 0
    financial_health_score: int = 0
    sla_compliance_score: int = 0

    # Legacy fields (for backward compatibility)
    adoption_score: Optional[int] = None
    support_score: Optional[int] = None
    financial_score: Optional[int] = None

    risk_level: Optional[RiskLevel] = None
    score_trend: ScoreTrend
    calculated_at: datetime
    notes: Optional[str] = None
    factors: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class HealthScoreHistoryResponse(BaseModel):
    health_scores: List[HealthScoreWithBreakdown]
    total: int
    skip: int
    limit: int


class BatchCalculationResult(BaseModel):
    total_customers: int
    calculated: int
    failed: int
    errors: List[Dict[str, str]]


class HealthTrendsResponse(BaseModel):
    total_customers: int
    average_score: Optional[float] = None
    trend_distribution: Dict[str, int]
    risk_distribution: Dict[str, int]
    score_brackets: Dict[str, int]


class AtRiskCustomer(BaseModel):
    customer_id: UUID
    company_name: str
    account_manager: str
    status: str

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

    risk_level: str
    score_trend: str
    calculated_at: datetime
    days_until_contract_end: Optional[int] = None


class AtRiskCustomersResponse(BaseModel):
    customers: List[AtRiskCustomer]
    total: int
    skip: int
    limit: int
    threshold: int


class ScoreDistributionCategory(BaseModel):
    min: int
    max: int
    count: int


class HistogramBucket(BaseModel):
    range: str
    count: int


class ScoreDistributionResponse(BaseModel):
    total_customers: int
    overall_distribution: Dict[str, ScoreDistributionCategory]
    sub_score_averages: Dict[str, float]
    histogram: List[HistogramBucket]


class CalculateScoreRequest(BaseModel):
    product_deployment_id: Optional[UUID] = None
