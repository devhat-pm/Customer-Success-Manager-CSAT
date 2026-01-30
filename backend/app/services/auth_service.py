from datetime import datetime, timedelta
from typing import Optional, Tuple, Set, Dict, Any
from sqlalchemy.orm import Session
import logging
import secrets

from app.models.user import User
from app.core.security import (
    verify_password,
    get_password_hash,
    create_tokens,
    create_access_token,
    decode_refresh_token,
    get_refresh_token_jti
)
from app.core.exceptions import (
    InvalidCredentialsError,
    InvalidTokenError,
    InactiveUserError,
    UserNotFoundError,
    PasswordValidationError
)

logger = logging.getLogger(__name__)

# In-memory store for invalidated refresh tokens (use Redis in production)
invalidated_tokens: Set[str] = set()


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def authenticate_user(self, email: str, password: str) -> User:
        user = self.db.query(User).filter(User.email == email).first()

        if not user:
            logger.warning(f"Login attempt with non-existent email: {email}")
            raise InvalidCredentialsError()

        if not verify_password(password, user.hashed_password):
            logger.warning(f"Failed login attempt for user: {email}")
            raise InvalidCredentialsError()

        if not user.is_active:
            logger.warning(f"Login attempt by inactive user: {email}")
            raise InactiveUserError()

        # Update last login
        user.last_login = datetime.utcnow()
        self.db.commit()

        logger.info(f"Successful login for user: {email}")
        return user

    def login(self, email: str, password: str) -> Tuple[str, str, User]:
        user = self.authenticate_user(email, password)
        access_token, refresh_token = create_tokens(user.id)
        return access_token, refresh_token, user

    def refresh_access_token(self, refresh_token: str) -> Tuple[str, str]:
        # Check if token is invalidated
        jti = get_refresh_token_jti(refresh_token)
        if jti and jti in invalidated_tokens:
            logger.warning(f"Attempt to use invalidated refresh token")
            raise InvalidTokenError(detail="Refresh token has been revoked")

        payload = decode_refresh_token(refresh_token)
        if payload is None:
            raise InvalidTokenError(detail="Invalid refresh token")

        user_id = payload.get("sub")
        if not user_id:
            raise InvalidTokenError(detail="Invalid refresh token")

        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise UserNotFoundError()

        if not user.is_active:
            raise InactiveUserError()

        # Invalidate old refresh token
        if jti:
            invalidated_tokens.add(jti)

        # Generate new tokens
        access_token, new_refresh_token = create_tokens(user.id)
        logger.info(f"Token refreshed for user: {user.email}")

        return access_token, new_refresh_token

    def logout(self, refresh_token: str) -> bool:
        jti = get_refresh_token_jti(refresh_token)
        if jti:
            invalidated_tokens.add(jti)
            logger.info(f"Refresh token invalidated")
            return True
        return False

    def change_password(
        self,
        user: User,
        current_password: str,
        new_password: str
    ) -> bool:
        if not verify_password(current_password, user.hashed_password):
            raise InvalidCredentialsError(detail="Current password is incorrect")

        if len(new_password) < 8:
            raise PasswordValidationError(detail="Password must be at least 8 characters long")

        user.hashed_password = get_password_hash(new_password)
        user.updated_at = datetime.utcnow()
        self.db.commit()

        logger.info(f"Password changed for user: {user.email}")
        return True

    def update_profile(
        self,
        user: User,
        full_name: Optional[str] = None,
        email: Optional[str] = None
    ) -> User:
        if full_name is not None:
            user.full_name = full_name

        if email is not None and email != user.email:
            # Check if email is already taken
            existing = self.db.query(User).filter(
                User.email == email,
                User.id != user.id
            ).first()
            if existing:
                from app.core.exceptions import DuplicateEmailError
                raise DuplicateEmailError()
            user.email = email

        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)

        logger.info(f"Profile updated for user: {user.email}")
        return user

    def request_password_reset(self, email: str) -> bool:
        """
        Generate a password reset token and send email.
        Always returns True to prevent email enumeration.
        """
        user = self.db.query(User).filter(User.email == email).first()

        if not user:
            logger.info(f"Password reset requested for non-existent email: {email}")
            return True  # Don't reveal if email exists

        if not user.is_active:
            logger.info(f"Password reset requested for inactive user: {email}")
            return True

        # Generate secure reset token
        reset_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)

        # Store token in user record (use dedicated table in production)
        user.reset_token = reset_token
        user.reset_token_expires = expires_at
        self.db.commit()

        logger.info(f"Password reset token generated for admin user: {email}")

        # Send password reset email
        try:
            from app.services.email_service import EmailNotificationService
            email_service = EmailNotificationService(self.db)
            email_service.send_admin_password_reset_email(
                recipient_email=email,
                recipient_name=user.full_name,
                reset_token=reset_token
            )
        except Exception as e:
            logger.error(f"Failed to send admin password reset email: {e}")

        return True

    def validate_reset_token(self, token: str) -> Dict[str, Any]:
        """Validate a password reset token."""
        user = self.db.query(User).filter(
            User.reset_token == token,
            User.is_active == True
        ).first()

        if not user:
            return {"valid": False, "message": "Invalid or expired reset link"}

        if not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
            return {"valid": False, "message": "Reset link has expired"}

        return {
            "valid": True,
            "email": user.email
        }

    def reset_password(self, token: str, new_password: str) -> bool:
        """Reset password using a valid reset token."""
        user = self.db.query(User).filter(
            User.reset_token == token,
            User.is_active == True
        ).first()

        if not user:
            raise InvalidTokenError(detail="Invalid or expired reset link")

        if not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
            raise InvalidTokenError(detail="Reset link has expired")

        # Validate password strength
        if len(new_password) < 8:
            raise PasswordValidationError(detail="Password must be at least 8 characters long")

        # Update password
        user.hashed_password = get_password_hash(new_password)
        user.reset_token = None
        user.reset_token_expires = None
        user.updated_at = datetime.utcnow()
        self.db.commit()

        logger.info(f"Password reset completed for admin user: {user.email}")

        # Send confirmation email
        try:
            from app.services.email_service import EmailNotificationService
            email_service = EmailNotificationService(self.db)
            email_service.send_password_changed_email(
                recipient_email=user.email,
                recipient_name=user.full_name
            )
        except Exception as e:
            logger.error(f"Failed to send password changed email: {e}")

        return True
