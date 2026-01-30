import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class HealthScoreHistory(Base):
    """
    Stores historical health scores for trend analysis.
    This is a lightweight table focused on tracking score changes over time.
    """
    __tablename__ = "health_score_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)

    # Score components
    overall_score = Column(Integer, nullable=False)
    product_adoption_score = Column(Integer, nullable=True)
    support_health_score = Column(Integer, nullable=True)
    engagement_score = Column(Integer, nullable=True)
    financial_health_score = Column(Integer, nullable=True)
    sla_compliance_score = Column(Integer, nullable=True)

    # Risk level at time of recording
    risk_level = Column(String(20), nullable=True)  # low, medium, high, critical

    # Timestamp
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    customer = relationship("Customer", back_populates="health_score_history")

    def __repr__(self):
        return f"<HealthScoreHistory customer={self.customer_id} score={self.overall_score}>"
