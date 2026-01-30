import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Text, Boolean, Date, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class InteractionType(str, enum.Enum):
    support_ticket = "support_ticket"
    meeting = "meeting"
    email = "email"
    call = "call"
    escalation = "escalation"
    training = "training"


class Sentiment(str, enum.Enum):
    positive = "positive"
    neutral = "neutral"
    negative = "negative"


class CustomerInteraction(Base):
    __tablename__ = "customer_interactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    interaction_type = Column(SQLEnum(InteractionType), nullable=False)
    subject = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    sentiment = Column(SQLEnum(Sentiment), nullable=False, default=Sentiment.neutral)
    performed_by = Column(String(255), nullable=False)
    interaction_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    follow_up_required = Column(Boolean, default=False, nullable=False)
    follow_up_date = Column(Date, nullable=True)

    # Relationships
    customer = relationship("Customer", back_populates="interactions")
