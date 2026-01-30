"""
CSAT Survey Models with Enhanced Survey Request System.
Supports both push (Extravis sends) and pull (customer submits) survey flows.
"""
import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class SurveyType(str, enum.Enum):
    """Types of surveys available."""
    ticket_followup = "ticket_followup"  # Auto-sent after ticket resolution
    quarterly_review = "quarterly_review"  # Quarterly relationship health check
    nps = "nps"  # Net Promoter Score
    general_feedback = "general_feedback"  # Open-ended feedback
    product_feedback = "product_feedback"  # Feedback about specific product
    onboarding = "onboarding"  # Post-onboarding feedback (legacy support)
    post_ticket = "post_ticket"  # Legacy alias for ticket_followup


class SubmissionVia(str, enum.Enum):
    """How the survey was submitted."""
    customer_portal = "customer_portal"  # Direct submission from portal
    email_link = "email_link"  # Via unique survey link in email
    manual_entry = "manual_entry"  # Staff entered on behalf of customer


class SurveyRequestStatus(str, enum.Enum):
    """Status of a survey request."""
    pending = "pending"
    completed = "completed"
    expired = "expired"
    cancelled = "cancelled"


class SurveyRequest(Base):
    """
    Tracks surveys sent by Extravis staff to customers.
    Each request generates a unique token for the survey link.
    """
    __tablename__ = "survey_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)

    # Target recipient
    target_email = Column(String(255), nullable=True)  # Specific email, null = all contacts
    target_customer_user_id = Column(UUID(as_uuid=True), ForeignKey("customer_users.id", ondelete="SET NULL"), nullable=True)

    # Survey details
    survey_type = Column(SQLEnum(SurveyType), nullable=False)
    linked_ticket_id = Column(UUID(as_uuid=True), ForeignKey("support_tickets.id", ondelete="SET NULL"), nullable=True, index=True)
    custom_message = Column(Text, nullable=True)  # Custom message to include in email

    # Unique token for survey link
    unique_survey_token = Column(String(255), nullable=False, unique=True, index=True)

    # Tracking
    sent_by_staff_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(SQLEnum(SurveyRequestStatus), nullable=False, default=SurveyRequestStatus.pending)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    sent_at = Column(DateTime, nullable=True)  # When email was actually sent
    expires_at = Column(DateTime, nullable=False)
    reminder_sent_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    # Link to response
    csat_response_id = Column(UUID(as_uuid=True), ForeignKey("csat_surveys.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    customer = relationship("Customer", back_populates="survey_requests")
    target_customer_user = relationship("CustomerUser", back_populates="survey_requests")
    linked_ticket = relationship("SupportTicket", back_populates="survey_requests")
    sent_by_staff = relationship("User", back_populates="sent_survey_requests")
    csat_response = relationship("CSATSurvey", foreign_keys=[csat_response_id], uselist=False, post_update=True)

    @property
    def is_expired(self) -> bool:
        """Check if the survey request has expired."""
        return datetime.utcnow() > self.expires_at

    @property
    def is_completed(self) -> bool:
        """Check if the survey has been completed."""
        return self.status == SurveyRequestStatus.completed


class CSATSurvey(Base):
    """
    CSAT Survey responses.
    Can be created via:
    - Direct customer submission (pull)
    - Survey request completion (push)
    - Staff manual entry
    """
    __tablename__ = "csat_surveys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    product_deployment_id = Column(UUID(as_uuid=True), ForeignKey("product_deployments.id", ondelete="SET NULL"), nullable=True, index=True)

    # Survey content
    survey_type = Column(SQLEnum(SurveyType), nullable=False)
    score = Column(Integer, nullable=False)
    feedback_text = Column(Text, nullable=True)

    # Submitter info
    submitted_by_name = Column(String(255), nullable=False)
    submitted_by_email = Column(String(255), nullable=False)
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Enhanced tracking fields
    linked_ticket_id = Column(UUID(as_uuid=True), ForeignKey("support_tickets.id", ondelete="SET NULL"), nullable=True, index=True)
    survey_request_id = Column(UUID(as_uuid=True), ForeignKey("survey_requests.id", ondelete="SET NULL"), nullable=True, index=True)
    submitted_by_customer_user_id = Column(UUID(as_uuid=True), ForeignKey("customer_users.id", ondelete="SET NULL"), nullable=True, index=True)
    submitted_anonymously = Column(Boolean, default=False, nullable=False)
    submitted_via = Column(SQLEnum(SubmissionVia), nullable=False, default=SubmissionVia.manual_entry)

    # Staff who entered (for manual entry)
    entered_by_staff_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Legacy field (for backward compatibility)
    ticket_reference = Column(String(100), nullable=True)

    # Relationships
    customer = relationship("Customer", back_populates="csat_surveys")
    product_deployment = relationship("ProductDeployment", back_populates="csat_surveys")
    linked_ticket = relationship("SupportTicket", back_populates="csat_surveys")
    survey_request = relationship("SurveyRequest", foreign_keys=[survey_request_id], uselist=False)
    submitted_by_customer_user = relationship("CustomerUser", back_populates="submitted_surveys")
    entered_by_staff = relationship("User", back_populates="entered_csat_surveys")
