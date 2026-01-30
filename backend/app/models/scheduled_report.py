import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class ReportType(str, enum.Enum):
    health_summary = "health_summary"
    csat_analysis = "csat_analysis"
    customer_overview = "customer_overview"
    executive_summary = "executive_summary"


class Frequency(str, enum.Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"
    quarterly = "quarterly"


class ScheduledReport(Base):
    __tablename__ = "scheduled_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    report_name = Column(String(255), nullable=False)
    report_type = Column(SQLEnum(ReportType), nullable=False)
    frequency = Column(SQLEnum(Frequency), nullable=False)
    recipients = Column(JSONB, nullable=False)
    filters = Column(JSONB, nullable=True)
    last_generated_at = Column(DateTime, nullable=True)
    next_scheduled_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    report_history = relationship("ReportHistory", back_populates="scheduled_report", cascade="all, delete-orphan")
