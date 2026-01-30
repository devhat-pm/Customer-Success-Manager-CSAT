from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from app.models.scheduled_report import ReportType, Frequency


class ScheduledReportBase(BaseModel):
    report_name: str = Field(..., min_length=1, max_length=255)
    report_type: ReportType
    frequency: Frequency
    recipients: List[str]
    filters: Optional[Dict[str, Any]] = None
    next_scheduled_at: datetime
    is_active: bool = True


class ScheduledReportCreate(ScheduledReportBase):
    pass


class ScheduledReportUpdate(BaseModel):
    report_name: Optional[str] = Field(None, min_length=1, max_length=255)
    report_type: Optional[ReportType] = None
    frequency: Optional[Frequency] = None
    recipients: Optional[List[str]] = None
    filters: Optional[Dict[str, Any]] = None
    next_scheduled_at: Optional[datetime] = None
    is_active: Optional[bool] = None


class ScheduledReportResponse(ScheduledReportBase):
    id: UUID
    last_generated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ScheduledReportListResponse(BaseModel):
    reports: List[ScheduledReportResponse]
    total: int
    skip: int
    limit: int


class GenerateReportRequest(BaseModel):
    report_type: ReportType
    filters: Optional[Dict[str, Any]] = None


class ReportDashboardStats(BaseModel):
    total_scheduled: int
    active_scheduled: int
    generated_this_month: int
    failed_this_month: int
    by_type: Dict[str, int]
