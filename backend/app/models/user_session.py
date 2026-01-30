import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class UserSession(Base):
    """Track user login sessions for security management."""
    __tablename__ = "user_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_jti = Column(String(255), unique=True, nullable=False, index=True)  # JWT token ID
    device_info = Column(String(500), nullable=True)  # Browser/device info
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    location = Column(String(255), nullable=True)  # Approximate location
    user_agent = Column(Text, nullable=True)
    last_active = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(String(1), default='N', nullable=False)  # 'Y' or 'N'

    # Relationships
    user = relationship("User", backref="sessions")
