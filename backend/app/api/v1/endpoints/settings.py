"""
Settings API endpoints.
Handles alert settings, report settings, system health, and integrations.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
import os
import uuid

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_admin_user
from app.models.user import User
from app.services.settings_service import SettingsService
from app.core.config import settings as app_settings

router = APIRouter(prefix="/settings", tags=["Settings"])


# ==================== Schemas ====================

class AlertSettingsUpdate(BaseModel):
    health_threshold_warning: Optional[int] = Field(None, ge=0, le=100)
    health_threshold_critical: Optional[int] = Field(None, ge=0, le=100)
    auto_alert_health_drop: Optional[bool] = None
    auto_alert_contract_expiry: Optional[bool] = None
    contract_expiry_days: Optional[int] = Field(None, ge=1, le=365)
    auto_alert_inactivity: Optional[bool] = None
    inactivity_days: Optional[int] = Field(None, ge=1, le=365)
    auto_alert_low_csat: Optional[bool] = None
    email_notifications_enabled: Optional[bool] = None
    alert_recipients: Optional[List[str]] = None


class ReportSettingsUpdate(BaseModel):
    default_format: Optional[str] = Field(None, pattern="^(pdf|excel|csv)$")
    logo_url: Optional[str] = None
    footer_text: Optional[str] = Field(None, max_length=500)
    default_recipients: Optional[List[str]] = None


class NotificationSettingsUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    browser_notifications: Optional[bool] = None
    digest_frequency: Optional[str] = Field(None, pattern="^(realtime|daily|weekly)$")
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None


class IntegrationUpdate(BaseModel):
    isEnabled: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None


class IncidentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = "investigating"
    severity: Optional[str] = "minor"
    affected_services: Optional[List[str]] = None


class IncidentUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = None
    severity: Optional[str] = None


# ==================== Alert Settings ====================

@router.get("/alerts")
async def get_alert_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get alert configuration settings."""
    service = SettingsService(db)
    return service.get_alert_settings()


@router.put("/alerts")
async def update_alert_settings(
    data: AlertSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update alert configuration settings. Admin only."""
    service = SettingsService(db)
    update_data = data.model_dump(exclude_none=True)
    return service.update_alert_settings(update_data)


# ==================== Report Settings ====================

@router.get("/reports")
async def get_report_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get report configuration settings."""
    service = SettingsService(db)
    return service.get_report_settings()


@router.put("/reports")
async def update_report_settings(
    data: ReportSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update report configuration settings. Admin only."""
    service = SettingsService(db)
    update_data = data.model_dump(exclude_none=True)
    return service.update_report_settings(update_data)


@router.post("/reports/logo")
async def upload_report_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Upload a report logo. Admin only."""
    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/svg+xml"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: PNG, JPEG, SVG"
        )

    # Validate file size (max 2MB)
    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 2MB"
        )

    # Save file
    upload_dir = getattr(app_settings, 'UPLOAD_DIR', 'uploads')
    os.makedirs(upload_dir, exist_ok=True)

    file_ext = file.filename.split('.')[-1] if file.filename else 'png'
    filename = f"report_logo_{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    # Update settings with logo URL
    logo_url = f"/uploads/{filename}"
    service = SettingsService(db)
    service.update_report_settings({"logo_url": logo_url})

    return {"logo_url": logo_url, "message": "Logo uploaded successfully"}


@router.delete("/reports/logo")
async def delete_report_logo(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Delete the report logo. Admin only."""
    service = SettingsService(db)
    current = service.get_report_settings()

    if current.get("logo_url"):
        # Try to delete the file
        try:
            upload_dir = getattr(app_settings, 'UPLOAD_DIR', 'uploads')
            filename = current["logo_url"].split('/')[-1]
            file_path = os.path.join(upload_dir, filename)
            if os.path.exists(file_path):
                os.remove(file_path)
        except:
            pass

    service.update_report_settings({"logo_url": None})
    return {"message": "Logo deleted successfully"}


# ==================== Notification Settings ====================

@router.get("/notifications")
async def get_notification_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notification configuration settings."""
    service = SettingsService(db)
    return service.get_notification_settings()


@router.put("/notifications")
async def update_notification_settings(
    data: NotificationSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update notification configuration settings."""
    service = SettingsService(db)
    update_data = data.model_dump(exclude_none=True)
    return service.update_notification_settings(update_data)


# ==================== System Health ====================

@router.get("/system/health")
async def get_system_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get system health metrics. Admin only."""
    service = SettingsService(db)
    return service.get_system_health()


# ==================== Integrations ====================

@router.get("/integrations")
async def get_integrations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get all integrations. Admin only."""
    service = SettingsService(db)
    return service.get_integrations()


@router.get("/integrations/{integration_id}")
async def get_integration(
    integration_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get a specific integration. Admin only."""
    service = SettingsService(db)
    return service.get_integration(integration_id)


@router.put("/integrations/{integration_id}")
async def update_integration(
    integration_id: UUID,
    data: IntegrationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update an integration configuration. Admin only."""
    service = SettingsService(db)
    update_data = data.model_dump(exclude_none=True)
    return service.update_integration(integration_id, update_data)


@router.post("/integrations/{integration_id}/test")
async def test_integration(
    integration_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Test an integration connection. Admin only."""
    service = SettingsService(db)
    return service.test_integration(integration_id)


# ==================== Incidents ====================

@router.get("/incidents")
async def get_incidents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get system incidents. Admin only."""
    service = SettingsService(db)
    health = service.get_system_health()
    return health.get("recentIncidents", [])


@router.post("/incidents")
async def create_incident(
    data: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Create a system incident. Admin only."""
    service = SettingsService(db)
    incident = service.create_incident(data.model_dump())
    return {
        "id": str(incident.id),
        "title": incident.title,
        "status": incident.status,
        "severity": incident.severity,
        "message": "Incident created successfully"
    }


@router.put("/incidents/{incident_id}")
async def update_incident(
    incident_id: UUID,
    data: IncidentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update a system incident. Admin only."""
    service = SettingsService(db)
    incident = service.update_incident(incident_id, data.model_dump(exclude_none=True))
    return {
        "id": str(incident.id),
        "title": incident.title,
        "status": incident.status,
        "severity": incident.severity,
        "message": "Incident updated successfully"
    }
