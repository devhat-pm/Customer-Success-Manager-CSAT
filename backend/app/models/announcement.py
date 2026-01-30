"""
Announcement model for customer-visible announcements from Extravis.
"""
import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class AnnouncementPriority(str, enum.Enum):
    """Priority levels for announcements."""
    normal = "normal"
    important = "important"


class AnnouncementTargetType(str, enum.Enum):
    """Target audience for announcements."""
    all_customers = "all_customers"
    specific_customers = "specific_customers"


class Announcement(Base):
    """
    Announcements visible to customers in the portal.
    Used for product updates, maintenance windows, new features, etc.
    """
    __tablename__ = "announcements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # Content
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)

    # Scheduling
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)  # Null = no end date

    # Targeting
    target_type = Column(
        SQLEnum(AnnouncementTargetType),
        nullable=False,
        default=AnnouncementTargetType.all_customers
    )
    target_customer_ids = Column(JSONB, default=list, nullable=False)  # List of customer UUIDs

    # Display
    priority = Column(
        SQLEnum(AnnouncementPriority),
        nullable=False,
        default=AnnouncementPriority.normal
    )
    is_active = Column(Boolean, default=True, nullable=False)

    # Tracking
    created_by_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    created_by = relationship("User", back_populates="created_announcements")

    def is_visible_to_customer(self, customer_id: uuid.UUID) -> bool:
        """Check if announcement is visible to a specific customer."""
        if not self.is_active:
            return False

        now = datetime.utcnow()
        if now < self.start_date:
            return False
        if self.end_date and now > self.end_date:
            return False

        if self.target_type == AnnouncementTargetType.all_customers:
            return True

        return str(customer_id) in [str(cid) for cid in self.target_customer_ids]
