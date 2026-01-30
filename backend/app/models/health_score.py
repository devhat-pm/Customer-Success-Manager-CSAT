import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class ScoreTrend(str, enum.Enum):
    improving = "improving"
    stable = "stable"
    declining = "declining"


class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class HealthScore(Base):
    __tablename__ = "health_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    product_deployment_id = Column(UUID(as_uuid=True), ForeignKey("product_deployments.id", ondelete="SET NULL"), nullable=True, index=True)

    # Overall score
    overall_score = Column(Integer, nullable=False)

    # Component scores per specification (5 components)
    product_adoption_score = Column(Integer, nullable=False, default=0)
    support_health_score = Column(Integer, nullable=False, default=0)
    engagement_score = Column(Integer, nullable=False, default=0)
    financial_health_score = Column(Integer, nullable=False, default=0)
    sla_compliance_score = Column(Integer, nullable=False, default=0)

    # Legacy fields (kept for backward compatibility)
    adoption_score = Column(Integer, nullable=True)  # Deprecated - use product_adoption_score
    support_score = Column(Integer, nullable=True)   # Deprecated - use support_health_score
    financial_score = Column(Integer, nullable=True) # Deprecated - use financial_health_score

    # Risk and trend
    risk_level = Column(SQLEnum(RiskLevel), nullable=False, default=RiskLevel.medium)
    score_trend = Column(SQLEnum(ScoreTrend), nullable=False, default=ScoreTrend.stable)

    # Timestamps and metadata
    calculated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    notes = Column(String, nullable=True)
    factors = Column(JSONB, nullable=True)

    # Relationships
    customer = relationship("Customer", back_populates="health_scores")
    product_deployment = relationship("ProductDeployment", back_populates="health_scores")
