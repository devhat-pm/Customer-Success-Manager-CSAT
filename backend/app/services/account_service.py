"""
Account Service for managing 2FA, sessions, and account deletion.
"""
import pyotp
import secrets
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.user import User
from app.models.user_session import UserSession
from app.core.exceptions import NotFoundError, BadRequestError, InvalidCredentialsError
from app.core.security import verify_password

logger = logging.getLogger(__name__)


class AccountService:
    """Service for managing user account settings."""

    def __init__(self, db: Session):
        self.db = db

    # ==================== Two-Factor Authentication ====================

    def setup_2fa(self, user_id: UUID) -> Dict[str, Any]:
        """Generate a new 2FA secret and provisioning URI."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError(detail="User not found")

        if user.two_factor_enabled:
            raise BadRequestError(detail="2FA is already enabled")

        # Generate a new secret
        secret = pyotp.random_base32()

        # Store temporarily (not enabled yet)
        user.two_factor_secret = secret
        self.db.commit()

        # Generate provisioning URI for QR code
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=user.email,
            issuer_name="Success Manager"
        )

        return {
            "secret": secret,
            "provisioning_uri": provisioning_uri,
            "qr_code_data": provisioning_uri
        }

    def verify_and_enable_2fa(self, user_id: UUID, code: str) -> Dict[str, Any]:
        """Verify the 2FA code and enable 2FA for the user."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError(detail="User not found")

        if not user.two_factor_secret:
            raise BadRequestError(detail="2FA setup not initiated. Please start setup first.")

        if user.two_factor_enabled:
            raise BadRequestError(detail="2FA is already enabled")

        # Verify the code
        totp = pyotp.TOTP(user.two_factor_secret)
        if not totp.verify(code, valid_window=1):
            raise BadRequestError(detail="Invalid verification code")

        # Enable 2FA
        user.two_factor_enabled = True
        self.db.commit()

        logger.info(f"2FA enabled for user: {user.email}")
        return {"message": "Two-factor authentication enabled successfully"}

    def verify_2fa_code(self, user_id: UUID, code: str) -> bool:
        """Verify a 2FA code for login."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.two_factor_enabled or not user.two_factor_secret:
            return False

        totp = pyotp.TOTP(user.two_factor_secret)
        return totp.verify(code, valid_window=1)

    def disable_2fa(self, user_id: UUID, password: str) -> Dict[str, Any]:
        """Disable 2FA for a user (requires password confirmation)."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError(detail="User not found")

        if not user.two_factor_enabled:
            raise BadRequestError(detail="2FA is not enabled")

        # Verify password
        if not verify_password(password, user.hashed_password):
            raise InvalidCredentialsError(detail="Invalid password")

        # Disable 2FA
        user.two_factor_enabled = False
        user.two_factor_secret = None
        self.db.commit()

        logger.info(f"2FA disabled for user: {user.email}")
        return {"message": "Two-factor authentication disabled successfully"}

    def get_2fa_status(self, user_id: UUID) -> Dict[str, Any]:
        """Get 2FA status for a user."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError(detail="User not found")

        return {
            "enabled": user.two_factor_enabled,
            "has_secret": user.two_factor_secret is not None
        }

    # ==================== Session Management ====================

    def create_session(
        self,
        user_id: UUID,
        token_jti: str,
        expires_at: datetime,
        device_info: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> UserSession:
        """Create a new session record."""
        session = UserSession(
            user_id=user_id,
            token_jti=token_jti,
            device_info=device_info or self._parse_device_info(user_agent),
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=expires_at
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_active_sessions(self, user_id: UUID) -> List[Dict[str, Any]]:
        """Get all active sessions for a user."""
        sessions = self.db.query(UserSession).filter(
            and_(
                UserSession.user_id == user_id,
                UserSession.is_revoked == 'N',
                UserSession.expires_at > datetime.utcnow()
            )
        ).order_by(UserSession.last_active.desc()).all()

        return [{
            "id": str(s.id),
            "device_info": s.device_info or "Unknown Device",
            "ip_address": s.ip_address or "Unknown",
            "location": s.location or "Unknown Location",
            "last_active": s.last_active.isoformat(),
            "created_at": s.created_at.isoformat(),
            "is_current": False  # Will be set by the caller
        } for s in sessions]

    def revoke_session(self, user_id: UUID, session_id: UUID) -> Dict[str, Any]:
        """Revoke a specific session."""
        session = self.db.query(UserSession).filter(
            and_(
                UserSession.id == session_id,
                UserSession.user_id == user_id
            )
        ).first()

        if not session:
            raise NotFoundError(detail="Session not found")

        session.is_revoked = 'Y'
        self.db.commit()

        logger.info(f"Session revoked: {session_id}")
        return {"message": "Session revoked successfully"}

    def revoke_all_sessions(self, user_id: UUID, except_jti: Optional[str] = None) -> Dict[str, Any]:
        """Revoke all sessions for a user, optionally keeping the current one."""
        query = self.db.query(UserSession).filter(
            and_(
                UserSession.user_id == user_id,
                UserSession.is_revoked == 'N'
            )
        )

        if except_jti:
            query = query.filter(UserSession.token_jti != except_jti)

        count = query.update({"is_revoked": 'Y'})
        self.db.commit()

        logger.info(f"Revoked {count} sessions for user: {user_id}")
        return {"message": f"Revoked {count} sessions", "count": count}

    def update_session_activity(self, token_jti: str) -> None:
        """Update the last_active timestamp for a session."""
        session = self.db.query(UserSession).filter(
            UserSession.token_jti == token_jti
        ).first()

        if session:
            session.last_active = datetime.utcnow()
            self.db.commit()

    def is_session_valid(self, token_jti: str) -> bool:
        """Check if a session is still valid (not revoked and not expired)."""
        session = self.db.query(UserSession).filter(
            and_(
                UserSession.token_jti == token_jti,
                UserSession.is_revoked == 'N',
                UserSession.expires_at > datetime.utcnow()
            )
        ).first()
        return session is not None

    def _parse_device_info(self, user_agent: Optional[str]) -> str:
        """Parse user agent to extract device info."""
        if not user_agent:
            return "Unknown Device"

        user_agent_lower = user_agent.lower()

        # Detect browser
        browser = "Unknown Browser"
        if "chrome" in user_agent_lower and "edg" not in user_agent_lower:
            browser = "Chrome"
        elif "firefox" in user_agent_lower:
            browser = "Firefox"
        elif "safari" in user_agent_lower and "chrome" not in user_agent_lower:
            browser = "Safari"
        elif "edg" in user_agent_lower:
            browser = "Edge"

        # Detect OS
        os = "Unknown OS"
        if "windows" in user_agent_lower:
            os = "Windows"
        elif "macintosh" in user_agent_lower or "mac os" in user_agent_lower:
            os = "macOS"
        elif "linux" in user_agent_lower:
            os = "Linux"
        elif "iphone" in user_agent_lower:
            os = "iOS"
        elif "android" in user_agent_lower:
            os = "Android"

        return f"{browser} on {os}"

    # ==================== Account Deletion ====================

    def delete_account(self, user_id: UUID, password: str) -> Dict[str, Any]:
        """Delete a user account (requires password confirmation)."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError(detail="User not found")

        # Verify password
        if not verify_password(password, user.hashed_password):
            raise InvalidCredentialsError(detail="Invalid password")

        # Check if user is the only admin
        admin_count = self.db.query(User).filter(
            and_(User.role == "admin", User.is_active == True)
        ).count()

        if user.role == "admin" and admin_count <= 1:
            raise BadRequestError(
                detail="Cannot delete the only admin account. Please create another admin first."
            )

        email = user.email

        # Delete the user (cascade will handle related records)
        self.db.delete(user)
        self.db.commit()

        logger.info(f"Account deleted: {email}")
        return {"message": "Account deleted successfully"}
