import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Date, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class ProductName(str, enum.Enum):
    MonetX = "MonetX"
    SupportX = "SupportX"
    GreenX = "GreenX"


class Environment(str, enum.Enum):
    cloud = "cloud"
    on_premise = "on_premise"
    hybrid = "hybrid"


class ProductDeployment(Base):
    __tablename__ = "product_deployments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    product_name = Column(SQLEnum(ProductName), nullable=False)
    deployment_date = Column(Date, nullable=False)
    version = Column(String(50), nullable=False)
    environment = Column(SQLEnum(Environment), nullable=False)
    license_type = Column(String(100), nullable=False)
    license_expiry = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    customer = relationship("Customer", back_populates="product_deployments")
    health_scores = relationship("HealthScore", back_populates="product_deployment", cascade="all, delete-orphan")
    csat_surveys = relationship("CSATSurvey", back_populates="product_deployment", cascade="all, delete-orphan")
