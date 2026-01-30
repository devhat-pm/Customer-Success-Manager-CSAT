import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class ActivityType(str, enum.Enum):
    meeting = "meeting"
    call = "call"
    email = "email"
    note = "note"
    escalation = "escalation"
    review = "review"
    task = "task"
    health_check = "health_check"
    contract_update = "contract_update"
    support_ticket = "support_ticket"


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    activity_type = Column(SQLEnum(ActivityType), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    activity_metadata = Column(Text, nullable=True)  # JSON string for additional data
    logged_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    customer = relationship("Customer", back_populates="activity_logs")
    user = relationship("User", back_populates="activity_logs")

    def __repr__(self):
        return f"<ActivityLog {self.activity_type.value}: {self.title}>"
