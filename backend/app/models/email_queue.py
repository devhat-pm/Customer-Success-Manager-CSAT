"""
Email Queue model for managing email notifications.
"""
import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base


class EmailStatus(str, enum.Enum):
    """Status of an email in the queue."""
    pending = "pending"
    sending = "sending"
    sent = "sent"
    failed = "failed"
    cancelled = "cancelled"


class EmailTemplateType(str, enum.Enum):
    """Types of email templates."""
    # Customer Portal Auth
    invitation = "invitation"
    welcome = "welcome"
    password_reset = "password_reset"
    password_changed = "password_changed"

    # Admin Auth
    admin_password_reset = "admin_password_reset"

    # Tickets - Customer notifications
    ticket_created_customer = "ticket_created_customer"
    ticket_status_update = "ticket_status_update"
    ticket_comment_customer = "ticket_comment_customer"

    # Tickets - Staff notifications
    ticket_created_staff = "ticket_created_staff"
    ticket_comment_staff = "ticket_comment_staff"

    # Surveys
    survey_request = "survey_request"
    survey_reminder = "survey_reminder"
    ticket_resolution_survey = "ticket_resolution_survey"

    # Alerts - Staff notifications
    alert_health_drop = "alert_health_drop"
    alert_contract_expiry = "alert_contract_expiry"
    alert_low_csat = "alert_low_csat"
    alert_customer_at_risk = "alert_customer_at_risk"
    alert_escalation = "alert_escalation"

    # Customer notifications
    customer_created = "customer_created"
    health_score_update = "health_score_update"
    contract_renewal_reminder = "contract_renewal_reminder"

    # Reports
    scheduled_report = "scheduled_report"
    weekly_digest = "weekly_digest"

    # Generic
    custom = "custom"


class EmailQueue(Base):
    """
    Queue for outgoing email notifications.
    Emails are queued here and processed by a background worker.
    """
    __tablename__ = "email_queue"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # Template and content
    template_type = Column(SQLEnum(EmailTemplateType), nullable=False)
    subject = Column(String(500), nullable=False)
    template_data = Column(JSONB, nullable=False, default=dict)

    # Recipient
    recipient_email = Column(String(255), nullable=False, index=True)
    recipient_name = Column(String(255), nullable=True)

    # Status tracking
    status = Column(SQLEnum(EmailStatus), nullable=False, default=EmailStatus.pending, index=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)

    # Scheduling
    scheduled_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    sent_at = Column(DateTime, nullable=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Reference tracking (optional - for linking to related objects)
    reference_type = Column(String(50), nullable=True)  # "ticket", "survey", "invitation", etc.
    reference_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    def __repr__(self):
        return f"<EmailQueue {self.id}: {self.template_type.value} to {self.recipient_email}>"
