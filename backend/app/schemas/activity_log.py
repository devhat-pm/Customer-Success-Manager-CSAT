from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models.activity_log import ActivityType


class ActivityLogBase(BaseModel):
    customer_id: UUID
    activity_type: ActivityType
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    activity_metadata: Optional[str] = None  # JSON string


class ActivityLogCreate(ActivityLogBase):
    pass


class ActivityLogUpdate(BaseModel):
    activity_type: Optional[ActivityType] = None
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    activity_metadata: Optional[str] = None


class UserInfo(BaseModel):
    id: UUID
    full_name: str
    email: str

    class Config:
        from_attributes = True


class CustomerInfo(BaseModel):
    id: UUID
    company_name: str

    class Config:
        from_attributes = True


class ActivityLogResponse(ActivityLogBase):
    id: UUID
    user_id: Optional[UUID] = None
    logged_at: datetime
    created_at: datetime
    user: Optional[UserInfo] = None
    customer: Optional[CustomerInfo] = None

    class Config:
        from_attributes = True


class ActivityLogListResponse(BaseModel):
    activities: List[ActivityLogResponse]
    total: int
    skip: int
    limit: int


class TimelineItem(BaseModel):
    id: UUID
    type: str  # activity, health_score, alert, csat, ticket
    title: str
    description: Optional[str] = None
    timestamp: datetime
    metadata: Optional[dict] = None

    class Config:
        from_attributes = True


class CustomerTimelineResponse(BaseModel):
    items: List[TimelineItem]
    total: int
