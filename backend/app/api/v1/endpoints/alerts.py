from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_manager_or_admin
from app.models.user import User
from app.models.alert import AlertType, Severity
from app.schemas.alert import (
    AlertCreate,
    AlertUpdate,
    AlertResponse,
    AlertListResponse,
    AlertResolve,
    AlertSnooze,
    AlertWithCustomer,
    AlertDashboardSummary,
    AlertStatsResponse,
    BulkResolve,
    BulkResolveResponse
)
from app.services.alert_service import AlertService

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/", response_model=AlertListResponse)
async def list_alerts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    customer_id: Optional[UUID] = Query(None, description="Filter by customer"),
    alert_type: Optional[AlertType] = Query(None, description="Filter by alert type"),
    severity: Optional[Severity] = Query(None, description="Filter by severity"),
    is_resolved: Optional[bool] = Query(None, description="Filter by resolution status"),
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all alerts with filtering and pagination.
    - Filter by customer, type, severity, resolution status
    - Sort by created_at, severity, or other fields
    """
    alert_service = AlertService(db)
    alerts, total = alert_service.get_all(
        skip=skip,
        limit=limit,
        customer_id=customer_id,
        alert_type=alert_type,
        severity=severity,
        is_resolved=is_resolved,
        sort_by=sort_by,
        sort_order=sort_order
    )

    return AlertListResponse(
        alerts=alerts,
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    alert_data: AlertCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a manual alert for a customer.
    - Requires customer_id, alert_type, severity, title, description
    """
    alert_service = AlertService(db)
    alert = alert_service.create(alert_data)
    return alert


@router.get("/dashboard", response_model=AlertDashboardSummary)
async def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get alert summary for dashboard.
    Includes:
    - Total unresolved alerts
    - Counts by severity and type
    - Recent critical/high alerts (last 7 days)
    - Alerts created and resolved today
    """
    alert_service = AlertService(db)
    return alert_service.get_dashboard_summary()


@router.get("/stats", response_model=AlertStatsResponse)
async def get_alert_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get overall alert statistics.
    Includes total, resolved, unresolved counts, average resolution time.
    """
    alert_service = AlertService(db)
    return alert_service.get_alert_stats()


@router.post("/bulk-resolve", response_model=BulkResolveResponse)
async def bulk_resolve_alerts(
    data: BulkResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Resolve multiple alerts at once (Manager/Admin only).
    """
    alert_service = AlertService(db)
    count = alert_service.bulk_resolve(data.alert_ids, data.resolved_by)
    return BulkResolveResponse(
        resolved_count=count,
        message=f"Successfully resolved {count} alerts"
    )


@router.post("/run-checks")
async def run_alert_checks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Manually trigger all automated alert checks (Manager/Admin only).
    Checks for:
    - Contract expiry
    - License expiry
    - Customer inactivity
    """
    alert_service = AlertService(db)
    results = alert_service.run_all_alert_checks()
    return {
        "message": "Alert checks completed",
        "alerts_created": results
    }


@router.get("/customer/{customer_id}", response_model=AlertListResponse)
async def get_customer_alerts(
    customer_id: UUID,
    include_resolved: bool = Query(False, description="Include resolved alerts"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all alerts for a specific customer.
    - Sorted by severity (critical first), then by date
    """
    alert_service = AlertService(db)
    alerts, total = alert_service.get_customer_alerts(
        customer_id=customer_id,
        include_resolved=include_resolved,
        skip=skip,
        limit=limit
    )

    return AlertListResponse(
        alerts=alerts,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{alert_id}", response_model=AlertWithCustomer)
async def get_alert(
    alert_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get alert details by ID with customer information.
    """
    alert_service = AlertService(db)
    result = alert_service.get_alert_with_customer(alert_id)

    alert = result["alert"]
    return AlertWithCustomer(
        id=alert.id,
        customer_id=alert.customer_id,
        alert_type=alert.alert_type,
        severity=alert.severity,
        title=alert.title,
        description=alert.description,
        is_resolved=alert.is_resolved,
        resolved_by=alert.resolved_by,
        resolved_at=alert.resolved_at,
        created_at=alert.created_at,
        customer=result["customer"]
    )


@router.put("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: UUID,
    alert_data: AlertUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an alert.
    """
    alert_service = AlertService(db)
    return alert_service.update(alert_id, alert_data)


@router.put("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: UUID,
    resolve_data: AlertResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark an alert as resolved.
    """
    alert_service = AlertService(db)
    return alert_service.resolve(alert_id, resolve_data.resolved_by)


@router.put("/{alert_id}/snooze", response_model=AlertResponse)
async def snooze_alert(
    alert_id: UUID,
    snooze_data: AlertSnooze,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Snooze an alert for X days.
    - Marks alert as resolved with snooze information
    - Adds snooze note to description
    """
    alert_service = AlertService(db)
    return alert_service.snooze(alert_id, snooze_data.snooze_days, snooze_data.snoozed_by)
