import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class ReportStatus(str, enum.Enum):
    completed = "completed"
    failed = "failed"


class ReportHistory(Base):
    __tablename__ = "report_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    scheduled_report_id = Column(UUID(as_uuid=True), ForeignKey("scheduled_reports.id", ondelete="SET NULL"), nullable=True, index=True)
    report_type = Column(String(100), nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    status = Column(SQLEnum(ReportStatus), nullable=False, default=ReportStatus.completed)
    error_message = Column(Text, nullable=True)

    # Relationships
    scheduled_report = relationship("ScheduledReport", back_populates="report_history")
