"""
Admin Email Management Endpoints.
Allows staff to view and manage the email queue.
"""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, datetime
from uuid import UUID

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_manager_or_admin
from app.models.user import User
from app.models.email_queue import EmailStatus, EmailTemplateType
from app.schemas.email import (
    EmailQueueResponse,
    EmailQueueListResponse,
    EmailQueueStats,
    EmailTemplateInfo,
    EmailTemplateListResponse,
    ProcessQueueResult,
    MessageResponse,
)
from app.services.email_service import EmailService
from app.services.email_templates import get_template_preview, get_all_template_types

router = APIRouter(prefix="/admin/emails", tags=["Email Admin"])


@router.get("/", response_model=EmailQueueListResponse)
async def list_emails(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status_filter: Optional[EmailStatus] = Query(None, alias="status"),
    template_type: Optional[EmailTemplateType] = Query(None),
    recipient_email: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List emails in the queue with filtering.

    Filters available:
    - status: Filter by email status (pending, sent, failed, etc.)
    - template_type: Filter by template type
    - recipient_email: Search by recipient email (partial match)
    - start_date/end_date: Filter by creation date range
    """
    service = EmailService(db)

    start_datetime = datetime.combine(start_date, datetime.min.time()) if start_date else None
    end_datetime = datetime.combine(end_date, datetime.max.time()) if end_date else None

    emails, total = service.get_all(
        skip=skip,
        limit=limit,
        status=status_filter,
        template_type=template_type,
        recipient_email=recipient_email,
        start_date=start_datetime,
        end_date=end_datetime
    )

    return EmailQueueListResponse(
        emails=[EmailQueueResponse.model_validate(e) for e in emails],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/stats", response_model=EmailQueueStats)
async def get_email_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get email queue statistics.

    Returns counts by status and recent failure count.
    """
    service = EmailService(db)
    return EmailQueueStats(**service.get_stats())


@router.get("/templates", response_model=EmailTemplateListResponse)
async def list_templates(
    current_user: User = Depends(get_current_user)
):
    """
    List all available email templates.
    """
    templates = get_all_template_types()
    return EmailTemplateListResponse(templates=templates)


@router.get("/templates/{template_type}", response_model=EmailTemplateInfo)
async def preview_template(
    template_type: EmailTemplateType,
    current_user: User = Depends(get_current_user)
):
    """
    Preview an email template.

    Shows the subject template and content preview.
    """
    return EmailTemplateInfo(**get_template_preview(template_type))


@router.get("/{email_id}", response_model=EmailQueueResponse)
async def get_email(
    email_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get email details by ID.
    """
    service = EmailService(db)
    email = service.get_by_id(email_id)
    return EmailQueueResponse.model_validate(email)


@router.post("/{email_id}/retry", response_model=EmailQueueResponse)
async def retry_email(
    email_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Retry a failed email.

    **Manager/Admin only.**

    Resets the email status to pending for reprocessing.
    """
    service = EmailService(db)
    email = service.retry_email(email_id)
    return EmailQueueResponse.model_validate(email)


@router.post("/{email_id}/cancel", response_model=EmailQueueResponse)
async def cancel_email(
    email_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Cancel a pending email.

    **Manager/Admin only.**

    Only pending emails can be cancelled.
    """
    service = EmailService(db)
    email = service.cancel_email(email_id)
    return EmailQueueResponse.model_validate(email)


@router.post("/process-queue", response_model=ProcessQueueResult)
async def process_email_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Manually trigger email queue processing.

    **Manager/Admin only.**

    This is normally done by a scheduled background task,
    but can be triggered manually for testing or to process
    backed-up emails immediately.
    """
    service = EmailService(db)
    result = service.process_queue()
    return ProcessQueueResult(**result)
