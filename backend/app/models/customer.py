import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Text, Date, Numeric, DateTime, ForeignKey, Enum as SQLEnum, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class CustomerStatus(str, enum.Enum):
    active = "active"
    at_risk = "at_risk"
    churned = "churned"
    onboarding = "onboarding"


class Customer(Base):
    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    company_name = Column(String(255), unique=True, nullable=False, index=True)
    industry = Column(String(100), nullable=True)
    contact_name = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)

    # Deployed products as JSON array ["MonetX", "SupportX", "GreenX"]
    deployed_products = Column(JSONB, default=list, nullable=False)

    contract_start_date = Column(Date, nullable=True)
    contract_end_date = Column(Date, nullable=True)
    contract_value = Column(Numeric(15, 2), nullable=True)

    # Account manager as FK to users table (replacing plain string)
    account_manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Legacy field kept for backward compatibility during migration
    account_manager = Column(String(255), nullable=True)

    status = Column(SQLEnum(CustomerStatus), nullable=False, default=CustomerStatus.onboarding)

    # New fields per specification
    logo_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)

    # Customer Portal settings
    portal_enabled = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    account_manager_user = relationship("User", back_populates="managed_customers", foreign_keys=[account_manager_id])
    product_deployments = relationship("ProductDeployment", back_populates="customer", cascade="all, delete-orphan")
    health_scores = relationship("HealthScore", back_populates="customer", cascade="all, delete-orphan")
    health_score_history = relationship("HealthScoreHistory", back_populates="customer", cascade="all, delete-orphan")
    csat_surveys = relationship("CSATSurvey", back_populates="customer", cascade="all, delete-orphan")
    interactions = relationship("CustomerInteraction", back_populates="customer", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="customer", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="customer", cascade="all, delete-orphan")
    support_tickets = relationship("SupportTicket", back_populates="customer", cascade="all, delete-orphan")

    # Customer Portal relationships
    customer_users = relationship("CustomerUser", back_populates="customer", cascade="all, delete-orphan")
    customer_user_invitations = relationship("CustomerUserInvitation", back_populates="customer", cascade="all, delete-orphan")
    survey_requests = relationship("SurveyRequest", back_populates="customer", cascade="all, delete-orphan")

    @property
    def account_manager_name(self) -> str:
        """Get account manager name - prefer from user relationship, fallback to legacy field."""
        if self.account_manager_user:
            return self.account_manager_user.full_name
        return self.account_manager or ""
