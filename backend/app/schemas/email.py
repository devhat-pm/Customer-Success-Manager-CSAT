"""
Email Queue Schemas.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from app.models.email_queue import EmailStatus, EmailTemplateType


class EmailQueueResponse(BaseModel):
    """Email queue item response."""
    id: UUID
    template_type: EmailTemplateType
    subject: str
    recipient_email: str
    recipient_name: Optional[str] = None
    status: EmailStatus
    error_message: Optional[str] = None
    retry_count: int
    scheduled_at: datetime
    sent_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    reference_type: Optional[str] = None
    reference_id: Optional[UUID] = None

    class Config:
        from_attributes = True


class EmailQueueListResponse(BaseModel):
    """List of emails."""
    emails: List[EmailQueueResponse]
    total: int
    skip: int
    limit: int


class EmailQueueStats(BaseModel):
    """Email queue statistics."""
    total: int
    pending: int
    sent: int
    failed: int
    cancelled: int
    recent_failures_24h: int


class EmailTemplateInfo(BaseModel):
    """Email template information."""
    template_type: str
    subject_template: str
    content_preview: str


class EmailTemplateListResponse(BaseModel):
    """List of email templates."""
    templates: List[Dict[str, str]]


class QueueEmailRequest(BaseModel):
    """Request to queue an email (internal use)."""
    template_type: EmailTemplateType
    recipient_email: EmailStr
    recipient_name: Optional[str] = None
    template_data: Dict[str, Any] = {}
    scheduled_at: Optional[datetime] = None
    reference_type: Optional[str] = None
    reference_id: Optional[UUID] = None


class ProcessQueueResult(BaseModel):
    """Result of processing email queue."""
    processed: int
    sent: int
    failed: int


class MessageResponse(BaseModel):
    message: str
