import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class AlertType(str, enum.Enum):
    health_drop = "health_drop"
    contract_expiry = "contract_expiry"
    low_csat = "low_csat"
    escalation = "escalation"
    inactivity = "inactivity"


class Severity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    alert_type = Column(SQLEnum(AlertType), nullable=False)
    severity = Column(SQLEnum(Severity), nullable=False, default=Severity.medium)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False, nullable=False)
    resolved_by = Column(String(255), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    customer = relationship("Customer", back_populates="alerts")
