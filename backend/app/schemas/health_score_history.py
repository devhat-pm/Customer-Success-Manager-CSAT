from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class HealthScoreHistoryBase(BaseModel):
    customer_id: UUID
    overall_score: int
    product_adoption_score: Optional[int] = None
    support_health_score: Optional[int] = None
    engagement_score: Optional[int] = None
    financial_health_score: Optional[int] = None
    sla_compliance_score: Optional[int] = None
    risk_level: Optional[str] = None


class HealthScoreHistoryCreate(HealthScoreHistoryBase):
    pass


class HealthScoreHistoryResponse(HealthScoreHistoryBase):
    id: UUID
    recorded_at: datetime

    class Config:
        from_attributes = True


class HealthScoreHistoryListResponse(BaseModel):
    history: List[HealthScoreHistoryResponse]
    total: int
    skip: int
    limit: int


class HealthScoreTrendResponse(BaseModel):
    customer_id: UUID
    current_score: int
    previous_score: Optional[int] = None
    score_change: int
    trend: str  # improving, stable, declining
    history: List[HealthScoreHistoryResponse]
