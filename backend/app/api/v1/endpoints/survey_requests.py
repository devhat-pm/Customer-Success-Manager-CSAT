"""
Staff Survey Request Management Endpoints.
Allows Extravis staff to send, manage, and track survey requests.
"""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, datetime
from uuid import UUID

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_manager_or_admin
from app.models.user import User
from app.models.csat_survey import SurveyType, SurveyRequestStatus
from app.schemas.csat_survey import (
    SurveyRequestCreate,
    BulkSurveyRequestCreate,
    SurveyRequestResponse,
    SurveyRequestListResponse,
    SurveyRequestStats,
    StaffManualCSATEntry,
    CSATSurveyResponse,
)
from app.services.survey_request_service import SurveyRequestService
from pydantic import BaseModel

router = APIRouter(prefix="/survey-requests", tags=["Survey Requests"])


class BulkSurveyResult(BaseModel):
    created_count: int
    error_count: int
    requests: list[SurveyRequestResponse]
    errors: list[dict]


class MessageResponse(BaseModel):
    message: str


# ==================== Survey Request CRUD ====================

@router.get("/", response_model=SurveyRequestListResponse)
async def list_survey_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    customer_id: Optional[UUID] = Query(None, description="Filter by customer"),
    status_filter: Optional[SurveyRequestStatus] = Query(None, alias="status", description="Filter by status"),
    survey_type: Optional[SurveyType] = Query(None, description="Filter by survey type"),
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all survey requests with filtering and pagination.

    Filters available:
    - customer_id: Filter by specific customer
    - status: Filter by status (pending, completed, expired, cancelled)
    - survey_type: Filter by survey type
    - start_date/end_date: Filter by creation date range
    """
    service = SurveyRequestService(db)

    start_datetime = datetime.combine(start_date, datetime.min.time()) if start_date else None
    end_datetime = datetime.combine(end_date, datetime.max.time()) if end_date else None

    requests, total = service.get_all(
        skip=skip,
        limit=limit,
        customer_id=customer_id,
        status=status_filter,
        survey_type=survey_type,
        start_date=start_datetime,
        end_date=end_datetime
    )

    return SurveyRequestListResponse(
        requests=[service.to_response(r) for r in requests],
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/", response_model=list[SurveyRequestResponse], status_code=status.HTTP_201_CREATED)
async def send_survey(
    request_data: SurveyRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Send a survey to a customer.

    Creates survey request(s) and queues email(s) for sending.
    Multiple requests may be created if target_type is 'all' (one per contact).

    Target types:
    - primary: Send to primary contact only
    - all: Send to all active portal users
    - specific: Send to specific email (requires target_email)

    Survey types:
    - ticket_followup: After ticket resolution
    - quarterly_review: Quarterly health check
    - nps: Net Promoter Score
    - general_feedback: Open-ended feedback
    - product_feedback: Product-specific feedback
    """
    service = SurveyRequestService(db)
    requests = service.create_survey_request(request_data, current_user)
    return [service.to_response(r) for r in requests]


@router.post("/bulk", response_model=BulkSurveyResult)
async def send_bulk_surveys(
    request_data: BulkSurveyRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Send surveys to multiple customers at once.

    **Manager/Admin only.**

    Useful for quarterly reviews or NPS campaigns.
    Automatically skips customers who have reached the survey fatigue limit
    (max 2 surveys per customer per month).
    """
    service = SurveyRequestService(db)
    requests, errors = service.create_bulk_survey_requests(request_data, current_user)

    return BulkSurveyResult(
        created_count=len(requests),
        error_count=len(errors),
        requests=[service.to_response(r) for r in requests],
        errors=errors
    )


@router.get("/stats", response_model=SurveyRequestStats)
async def get_survey_stats(
    customer_id: Optional[UUID] = Query(None, description="Filter stats by customer"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get survey request statistics.

    Returns:
    - Total surveys sent
    - Count by status (pending, completed, expired, cancelled)
    - Completion rate percentage
    """
    service = SurveyRequestService(db)
    stats = service.get_stats(customer_id)
    return SurveyRequestStats(**stats)


@router.get("/{request_id}", response_model=SurveyRequestResponse)
async def get_survey_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get survey request details by ID.
    """
    service = SurveyRequestService(db)
    request = service.get_by_id(request_id)
    return service.to_response(request)


@router.post("/{request_id}/resend", response_model=SurveyRequestResponse)
async def resend_survey_reminder(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Resend reminder email for a pending survey.

    Only works for surveys that are still pending and not expired.
    """
    service = SurveyRequestService(db)
    request = service.resend_reminder(request_id, current_user)
    return service.to_response(request)


@router.post("/{request_id}/cancel", response_model=SurveyRequestResponse)
async def cancel_survey_request(
    request_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cancel a pending survey request.

    The survey link will no longer work after cancellation.
    """
    service = SurveyRequestService(db)
    request = service.cancel_survey_request(request_id, current_user)
    return service.to_response(request)


# ==================== Manual CSAT Entry ====================

@router.post("/manual-entry", response_model=CSATSurveyResponse, status_code=status.HTTP_201_CREATED)
async def create_manual_csat_entry(
    entry_data: StaffManualCSATEntry,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually enter a CSAT response.

    Use this when a customer provides feedback over phone or email
    and staff needs to record it in the system.

    The entry is marked as 'manual_entry' submission type and
    records which staff member entered it.

    If linked to a survey request, that request is marked as complete.
    """
    service = SurveyRequestService(db)
    survey = service.create_manual_csat_entry(entry_data, current_user)
    return survey


# ==================== Maintenance ====================

@router.post("/expire-old", response_model=MessageResponse)
async def expire_old_surveys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Mark expired survey requests as expired.

    **Manager/Admin only.**

    This should normally be called by a scheduler, but can be
    triggered manually if needed.
    """
    service = SurveyRequestService(db)
    count = service.expire_old_requests()
    return MessageResponse(message=f"Marked {count} survey requests as expired")
