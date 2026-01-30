from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from app.models.alert import AlertType, Severity


class AlertBase(BaseModel):
    customer_id: UUID
    alert_type: AlertType
    severity: Severity = Severity.medium
    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1)


class AlertCreate(AlertBase):
    pass


class AlertUpdate(BaseModel):
    alert_type: Optional[AlertType] = None
    severity: Optional[Severity] = None
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = Field(None, min_length=1)
    is_resolved: Optional[bool] = None
    resolved_by: Optional[str] = Field(None, max_length=255)


class AlertResolve(BaseModel):
    resolved_by: str = Field(..., min_length=1, max_length=255)


class AlertSnooze(BaseModel):
    snooze_days: int = Field(..., ge=1, le=90, description="Number of days to snooze")
    snoozed_by: str = Field(..., min_length=1, max_length=255)


class BulkResolve(BaseModel):
    alert_ids: List[UUID]
    resolved_by: str = Field(..., min_length=1, max_length=255)


class AlertResponse(AlertBase):
    id: UUID
    is_resolved: bool
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AlertWithCustomer(BaseModel):
    id: UUID
    customer_id: UUID
    alert_type: AlertType
    severity: Severity
    title: str
    description: str
    is_resolved: bool
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    customer: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class AlertListResponse(BaseModel):
    alerts: List[AlertResponse]
    total: int
    skip: int
    limit: int


class RecentAlert(BaseModel):
    id: UUID
    customer_id: UUID
    customer_name: Optional[str] = None
    alert_type: str
    severity: str
    title: str
    created_at: str


class AlertDashboardSummary(BaseModel):
    total_unresolved: int
    by_severity: Dict[str, int]
    by_type: Dict[str, int]
    recent_critical_alerts: List[RecentAlert]
    created_today: int
    resolved_today: int


class AlertCountResponse(BaseModel):
    total: int
    by_severity: Dict[str, int]
    by_type: Dict[str, int]


class SeverityBreakdown(BaseModel):
    total: int
    unresolved: int


class AlertStatsResponse(BaseModel):
    total_alerts: int
    unresolved: int
    resolved: int
    created_last_7_days: int
    avg_resolution_hours: Optional[float] = None
    by_severity: Dict[str, SeverityBreakdown]


class BulkResolveResponse(BaseModel):
    resolved_count: int
    message: str
