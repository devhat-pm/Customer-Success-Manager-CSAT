from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models.report_history import ReportStatus


class ReportHistoryBase(BaseModel):
    scheduled_report_id: Optional[UUID] = None
    report_type: str = Field(..., min_length=1, max_length=100)
    file_path: str = Field(..., min_length=1, max_length=500)
    file_size: int = Field(..., ge=0)
    status: ReportStatus = ReportStatus.completed
    error_message: Optional[str] = None


class ReportHistoryCreate(ReportHistoryBase):
    pass


class ReportHistoryResponse(ReportHistoryBase):
    id: UUID
    generated_at: datetime

    class Config:
        from_attributes = True


class ReportHistoryListResponse(BaseModel):
    history: List[ReportHistoryResponse]
    total: int
    skip: int
    limit: int
