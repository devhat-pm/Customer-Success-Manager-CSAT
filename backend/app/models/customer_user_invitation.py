import uuid
import secrets
from datetime import datetime, timedelta
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_invitation_token():
    """Generate a secure random token for invitation links."""
    return secrets.token_urlsafe(32)


def default_expiry():
    """Default expiry is 7 days from now."""
    return datetime.utcnow() + timedelta(days=7)


class CustomerUserInvitation(Base):
    """
    Tracks invitations sent by Extravis staff to customer contacts.

    When Extravis staff want to give a customer contact access to the portal,
    they create an invitation which sends an email with a signup link.
    """
    __tablename__ = "customer_user_invitations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # Link to customer company being invited to
    customer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Email being invited
    email = Column(String(255), nullable=False, index=True)

    # Unique token for the signup link
    invitation_token = Column(
        String(64),
        unique=True,
        nullable=False,
        default=generate_invitation_token,
        index=True
    )

    # Who sent the invitation (Extravis staff user)
    invited_by_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Timestamps
    sent_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, default=default_expiry, nullable=False)

    # Usage tracking
    is_used = Column(Boolean, default=False, nullable=False)
    used_at = Column(DateTime, nullable=True)

    # Relationships
    customer = relationship("Customer", back_populates="customer_user_invitations")
    invited_by = relationship("User", back_populates="sent_invitations")
