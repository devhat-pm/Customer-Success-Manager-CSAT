"""
Settings models for storing application configuration.
"""
import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, DateTime, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base


class SettingCategory(str, enum.Enum):
    """Categories of settings."""
    alerts = "alerts"
    reports = "reports"
    notifications = "notifications"
    integrations = "integrations"
    system = "system"


class IntegrationStatus(str, enum.Enum):
    """Status of an integration."""
    available = "available"
    connected = "connected"
    error = "error"
    coming_soon = "coming_soon"


class AppSettings(Base):
    """
    Stores application-wide settings as key-value pairs.
    Settings are grouped by category for organization.
    """
    __tablename__ = "app_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    category = Column(SQLEnum(SettingCategory), nullable=False, index=True)
    key = Column(String(100), nullable=False, index=True)
    value = Column(JSONB, nullable=False, default=dict)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        # Unique constraint on category + key
        {'sqlite_autoincrement': True},
    )

    def __repr__(self):
        return f"<AppSettings {self.category.value}.{self.key}>"


class Integration(Base):
    """
    Stores integration configurations.
    """
    __tablename__ = "integrations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String(100), nullable=False, unique=True)
    display_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False)  # communication, crm, developer, productivity
    icon = Column(String(50), nullable=True)  # lucide icon name
    status = Column(SQLEnum(IntegrationStatus), nullable=False, default=IntegrationStatus.available)
    is_enabled = Column(Boolean, default=False, nullable=False)
    config = Column(JSONB, nullable=False, default=dict)  # Integration-specific config
    last_sync_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Integration {self.name}: {self.status.value}>"


class SystemIncident(Base):
    """
    Stores system incidents and maintenance events.
    """
    __tablename__ = "system_incidents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), nullable=False)  # investigating, identified, monitoring, resolved, scheduled
    severity = Column(String(50), nullable=False, default="minor")  # minor, major, critical
    affected_services = Column(JSONB, nullable=False, default=list)
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    scheduled_for = Column(DateTime, nullable=True)  # For scheduled maintenance
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<SystemIncident {self.title}: {self.status}>"
