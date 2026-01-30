"""
Account management endpoints for 2FA, sessions, and account deletion.
"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.services.account_service import AccountService
from sqlalchemy.orm import Session

router = APIRouter()


# ==================== Request/Response Models ====================

class TwoFactorSetupResponse(BaseModel):
    secret: str
    provisioning_uri: str
    qr_code_data: str


class TwoFactorVerifyRequest(BaseModel):
    code: str


class TwoFactorDisableRequest(BaseModel):
    password: str


class TwoFactorStatusResponse(BaseModel):
    enabled: bool
    has_secret: bool


class SessionResponse(BaseModel):
    id: str
    device_info: str
    ip_address: str
    location: str
    last_active: str
    created_at: str
    is_current: bool


class DeleteAccountRequest(BaseModel):
    password: str


class MessageResponse(BaseModel):
    message: str


# ==================== 2FA Endpoints ====================

@router.post("/2fa/setup", response_model=TwoFactorSetupResponse)
async def setup_2fa(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start 2FA setup - generates secret and QR code data."""
    service = AccountService(db)
    return service.setup_2fa(current_user.id)


@router.post("/2fa/enable", response_model=MessageResponse)
async def enable_2fa(
    data: TwoFactorVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify code and enable 2FA."""
    service = AccountService(db)
    return service.verify_and_enable_2fa(current_user.id, data.code)


@router.delete("/2fa/disable", response_model=MessageResponse)
async def disable_2fa(
    data: TwoFactorDisableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disable 2FA (requires password confirmation)."""
    service = AccountService(db)
    return service.disable_2fa(current_user.id, data.password)


@router.get("/2fa/status", response_model=TwoFactorStatusResponse)
async def get_2fa_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current 2FA status."""
    service = AccountService(db)
    return service.get_2fa_status(current_user.id)


# ==================== Session Endpoints ====================

@router.get("/sessions", response_model=list[SessionResponse])
async def get_sessions(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all active sessions for the current user."""
    service = AccountService(db)
    sessions = service.get_active_sessions(current_user.id)

    # Mark the current session
    current_jti = getattr(request.state, 'token_jti', None)
    for session in sessions:
        # This is a simplified check - in production you'd compare JTIs
        session['is_current'] = False

    return sessions


@router.delete("/sessions/{session_id}", response_model=MessageResponse)
async def revoke_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke a specific session."""
    service = AccountService(db)
    return service.revoke_session(current_user.id, session_id)


@router.delete("/sessions", response_model=MessageResponse)
async def revoke_all_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke all sessions except the current one."""
    service = AccountService(db)
    return service.revoke_all_sessions(current_user.id)


# ==================== Account Deletion ====================

@router.delete("/delete", response_model=MessageResponse)
async def delete_account(
    data: DeleteAccountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete the current user's account (requires password confirmation)."""
    service = AccountService(db)
    return service.delete_account(current_user.id, data.password)
