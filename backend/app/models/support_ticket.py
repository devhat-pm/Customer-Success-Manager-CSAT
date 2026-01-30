import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, Float, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class ProductType(str, enum.Enum):
    MonetX = "MonetX"
    SupportX = "SupportX"
    GreenX = "GreenX"


class TicketPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class TicketStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"


class CreatorType(str, enum.Enum):
    customer = "customer"
    staff = "staff"


# SLA thresholds in hours
SLA_THRESHOLDS = {
    TicketPriority.critical: 4,
    TicketPriority.high: 8,
    TicketPriority.medium: 24,
    TicketPriority.low: 72,
}


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    ticket_number = Column(String(20), unique=True, nullable=False, index=True)
    subject = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    product = Column(SQLEnum(ProductType), nullable=False)
    priority = Column(SQLEnum(TicketPriority), nullable=False, default=TicketPriority.medium)
    status = Column(SQLEnum(TicketStatus), nullable=False, default=TicketStatus.open)
    sla_breached = Column(Boolean, default=False, nullable=False)
    resolution_time_hours = Column(Float, nullable=True)

    # Creator tracking
    created_by_type = Column(SQLEnum(CreatorType), nullable=False, default=CreatorType.staff)
    created_by_customer_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("customer_users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    created_by_staff_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    customer_contact_email = Column(String(255), nullable=True)

    # Notes (internal vs customer-visible)
    internal_notes = Column(Text, nullable=True)  # Only visible to staff
    customer_visible_notes = Column(Text, nullable=True)  # Visible to both

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    customer = relationship("Customer", back_populates="support_tickets")
    created_by_customer_user = relationship("CustomerUser", foreign_keys=[created_by_customer_user_id])
    created_by_staff_user = relationship("User", foreign_keys=[created_by_staff_user_id])
    comments = relationship("TicketComment", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketComment.created_at")
    survey_requests = relationship("SurveyRequest", back_populates="linked_ticket")
    csat_surveys = relationship("CSATSurvey", back_populates="linked_ticket")

    def __repr__(self):
        return f"<SupportTicket {self.ticket_number}: {self.subject}>"

    @property
    def creator_name(self) -> str:
        """Get the name of who created the ticket."""
        if self.created_by_type == CreatorType.customer and self.created_by_customer_user:
            return self.created_by_customer_user.full_name
        elif self.created_by_type == CreatorType.staff and self.created_by_staff_user:
            return self.created_by_staff_user.full_name
        return "Unknown"


class TicketComment(Base):
    """Comments/replies on support tickets."""
    __tablename__ = "ticket_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    ticket_id = Column(
        UUID(as_uuid=True),
        ForeignKey("support_tickets.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    comment_text = Column(Text, nullable=False)
    commenter_type = Column(SQLEnum(CreatorType), nullable=False)
    commenter_customer_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("customer_users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    commenter_staff_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    is_internal = Column(Boolean, default=False, nullable=False)  # If true, only visible to staff
    attachments = Column(JSONB, default=list, nullable=False)  # Array of file URLs
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    ticket = relationship("SupportTicket", back_populates="comments")
    commenter_customer_user = relationship("CustomerUser", foreign_keys=[commenter_customer_user_id])
    commenter_staff_user = relationship("User", foreign_keys=[commenter_staff_user_id])

    def __repr__(self):
        return f"<TicketComment on {self.ticket_id}>"

    @property
    def commenter_name(self) -> str:
        """Get the name of who made the comment."""
        if self.commenter_type == CreatorType.customer and self.commenter_customer_user:
            return self.commenter_customer_user.full_name
        elif self.commenter_type == CreatorType.staff and self.commenter_staff_user:
            return self.commenter_staff_user.full_name
        return "Unknown"
