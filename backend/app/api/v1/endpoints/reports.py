from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
from io import BytesIO

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_manager_or_admin
from app.models.user import User
from app.models.scheduled_report import ReportType, Frequency
from app.models.report_history import ReportStatus
from app.schemas.scheduled_report import (
    ScheduledReportCreate,
    ScheduledReportUpdate,
    ScheduledReportResponse,
    ScheduledReportListResponse,
    GenerateReportRequest,
    ReportDashboardStats
)
from app.schemas.report_history import (
    ReportHistoryResponse,
    ReportHistoryListResponse
)
from app.services.scheduled_report_service import ScheduledReportService

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/scheduled", response_model=ScheduledReportListResponse)
async def list_scheduled_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    report_type: Optional[ReportType] = Query(None, description="Filter by report type"),
    frequency: Optional[Frequency] = Query(None, description="Filter by frequency"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all scheduled reports with filtering and pagination.
    """
    report_service = ScheduledReportService(db)
    reports, total = report_service.get_all(
        skip=skip,
        limit=limit,
        report_type=report_type,
        frequency=frequency,
        is_active=is_active,
        sort_by=sort_by,
        sort_order=sort_order
    )

    return ScheduledReportListResponse(
        reports=reports,
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/scheduled", response_model=ScheduledReportResponse, status_code=status.HTTP_201_CREATED)
async def create_scheduled_report(
    report_data: ScheduledReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Create a new scheduled report (Manager/Admin only).
    - Set frequency: daily, weekly, monthly, quarterly
    - Specify recipients list for email delivery
    """
    report_service = ScheduledReportService(db)
    report = report_service.create(report_data)
    return report


@router.get("/scheduled/{report_id}", response_model=ScheduledReportResponse)
async def get_scheduled_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get scheduled report details by ID.
    """
    report_service = ScheduledReportService(db)
    return report_service.get_by_id(report_id)


@router.put("/scheduled/{report_id}", response_model=ScheduledReportResponse)
async def update_scheduled_report(
    report_id: UUID,
    report_data: ScheduledReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Update a scheduled report (Manager/Admin only).
    """
    report_service = ScheduledReportService(db)
    return report_service.update(report_id, report_data)


@router.delete("/scheduled/{report_id}", status_code=status.HTTP_200_OK)
async def delete_scheduled_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Delete a scheduled report (Manager/Admin only).
    """
    report_service = ScheduledReportService(db)
    report_service.delete(report_id)
    return {"message": "Scheduled report deleted successfully"}


@router.put("/scheduled/{report_id}/toggle", response_model=ScheduledReportResponse)
async def toggle_scheduled_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Toggle scheduled report active/inactive status (Manager/Admin only).
    """
    report_service = ScheduledReportService(db)
    return report_service.toggle_active(report_id)


@router.post("/generate", response_model=ReportHistoryResponse)
async def generate_report(
    request: GenerateReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a report on-demand.
    - Report types: health_summary, csat_analysis, customer_overview, executive_summary
    - Returns report history entry with download information
    """
    report_service = ScheduledReportService(db)
    history = report_service.generate_report(
        report_type=request.report_type,
        filters=request.filters
    )
    return history


@router.get("/history", response_model=ReportHistoryListResponse)
async def get_report_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    scheduled_report_id: Optional[UUID] = Query(None, description="Filter by scheduled report"),
    report_type: Optional[str] = Query(None, description="Filter by report type"),
    status: Optional[ReportStatus] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get report generation history.
    """
    report_service = ScheduledReportService(db)
    history, total = report_service.get_history(
        skip=skip,
        limit=limit,
        scheduled_report_id=scheduled_report_id,
        report_type=report_type,
        status=status
    )

    return ReportHistoryListResponse(
        history=history,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/history/{history_id}", response_model=ReportHistoryResponse)
async def get_history_entry(
    history_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get report history entry by ID.
    """
    report_service = ScheduledReportService(db)
    return report_service.get_history_by_id(history_id)


@router.get("/history/{history_id}/download")
async def download_report(
    history_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download a generated report PDF.
    """
    report_service = ScheduledReportService(db)
    content, filename = report_service.get_report_file(history_id)

    return StreamingResponse(
        BytesIO(content),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/dashboard", response_model=ReportDashboardStats)
async def get_report_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get report dashboard statistics.
    """
    report_service = ScheduledReportService(db)
    return report_service.get_dashboard_stats()


@router.post("/run-scheduled")
async def run_scheduled_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Manually trigger scheduled reports that are due (Manager/Admin only).
    """
    report_service = ScheduledReportService(db)
    results = report_service.run_due_reports()
    return {
        "message": "Scheduled reports processed",
        "results": results
    }
