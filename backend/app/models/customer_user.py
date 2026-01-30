import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class CustomerUser(Base):
    """
    Customer Portal users - contacts from customer companies who can login
    to the Customer Portal to submit tickets and complete surveys.

    These are completely separate from Extravis staff users (User model).
    """
    __tablename__ = "customer_users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # Link to customer company
    customer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Authentication
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)

    # Profile information
    full_name = Column(String(255), nullable=False)
    job_title = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)

    # Status flags
    is_primary_contact = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    # Timestamps
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    customer = relationship("Customer", back_populates="customer_users")
    survey_requests = relationship("SurveyRequest", back_populates="target_customer_user")
    submitted_surveys = relationship("CSATSurvey", back_populates="submitted_by_customer_user")
