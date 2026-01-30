from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID
from app.models.customer_interaction import InteractionType, Sentiment


class CustomerInteractionBase(BaseModel):
    customer_id: UUID
    interaction_type: InteractionType
    subject: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1)
    sentiment: Sentiment = Sentiment.neutral
    performed_by: str = Field(..., min_length=1, max_length=255)
    interaction_date: Optional[datetime] = None
    follow_up_required: bool = False
    follow_up_date: Optional[date] = None


class CustomerInteractionCreate(CustomerInteractionBase):
    pass


class CustomerInteractionUpdate(BaseModel):
    interaction_type: Optional[InteractionType] = None
    subject: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = Field(None, min_length=1)
    sentiment: Optional[Sentiment] = None
    performed_by: Optional[str] = Field(None, min_length=1, max_length=255)
    interaction_date: Optional[datetime] = None
    follow_up_required: Optional[bool] = None
    follow_up_date: Optional[date] = None


class CustomerInteractionResponse(CustomerInteractionBase):
    id: UUID
    interaction_date: datetime
    customer_name: Optional[str] = None
    performed_by_name: Optional[str] = None

    class Config:
        from_attributes = True


class InteractionWithCustomer(BaseModel):
    id: UUID
    customer_id: UUID
    customer_name: str
    interaction_type: InteractionType
    subject: str
    description: str
    sentiment: Sentiment
    performed_by: str
    performed_by_name: Optional[str] = None
    interaction_date: datetime
    follow_up_required: bool
    follow_up_date: Optional[date] = None

    class Config:
        from_attributes = True


class InteractionListResponse(BaseModel):
    interactions: List[InteractionWithCustomer]
    total: int
    skip: int
    limit: int


class PendingFollowup(BaseModel):
    interaction_id: UUID
    customer_id: UUID
    customer_name: str
    account_manager: str
    interaction_type: str
    subject: str
    performed_by: str
    interaction_date: str
    follow_up_date: Optional[str] = None
    is_overdue: bool
    days_until_due: Optional[int] = None


class PendingFollowupsResponse(BaseModel):
    followups: List[PendingFollowup]
    total: int
    skip: int
    limit: int


class PerformerStats(BaseModel):
    name: str
    count: int


class DailyTrendItem(BaseModel):
    date: str
    count: int


class InteractionSummaryStats(BaseModel):
    total_interactions: int
    last_30_days: int
    last_7_days: int
    by_type: Dict[str, int]
    by_sentiment: Dict[str, int]
    pending_followups: int
    overdue_followups: int
    top_performers: List[PerformerStats]
    daily_trend: List[DailyTrendItem]
