import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    viewer = "viewer"
    account_manager = "account_manager"
    csm = "csm"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.viewer)
    is_active = Column(Boolean, default=True, nullable=False)
    last_login = Column(DateTime, nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    # Two-Factor Authentication
    two_factor_enabled = Column(Boolean, default=False, nullable=False)
    two_factor_secret = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    managed_customers = relationship("Customer", back_populates="account_manager_user", foreign_keys="Customer.account_manager_id")
    activity_logs = relationship("ActivityLog", back_populates="user")
    sent_invitations = relationship("CustomerUserInvitation", back_populates="invited_by")
    sent_survey_requests = relationship("SurveyRequest", back_populates="sent_by_staff")
    entered_csat_surveys = relationship("CSATSurvey", back_populates="entered_by_staff")
    created_announcements = relationship("Announcement", back_populates="created_by")
