"""
Authentication service for Customer Portal users.
Handles login, signup via invitation, password management.
"""
from datetime import datetime, timedelta
from typing import Optional, Tuple, Set
from uuid import UUID
import secrets
import logging

from sqlalchemy.orm import Session

from app.models.customer_user import CustomerUser
from app.models.customer_user_invitation import CustomerUserInvitation
from app.models.customer import Customer
from app.core.customer_security import (
    verify_password,
    get_password_hash,
    validate_password_strength,
    create_customer_tokens,
    decode_customer_refresh_token,
    get_customer_refresh_token_jti,
    create_customer_access_token
)
from app.core.exceptions import (
    InvalidCredentialsError,
    BadRequestError,
    NotFoundError
)
from app.services.email_service import EmailNotificationService

logger = logging.getLogger(__name__)

# In-memory store for invalidated customer refresh tokens (use Redis in production)
invalidated_customer_tokens: Set[str] = set()

# Password reset token expiry
PASSWORD_RESET_EXPIRY_HOURS = 1


class CustomerAuthService:
    """Service for customer portal authentication."""

    def __init__(self, db: Session):
        self.db = db

    # ==================== Invitation & Signup ====================

    def validate_invitation(self, token: str) -> dict:
        """
        Validate an invitation token and return details.
        Public endpoint - does not require authentication.
        """
        invitation = self.db.query(CustomerUserInvitation).filter(
            CustomerUserInvitation.invitation_token == token
        ).first()

        if not invitation:
            return {
                "valid": False,
                "message": "Invalid invitation link"
            }

        if invitation.is_used:
            return {
                "valid": False,
                "message": "This invitation has already been used"
            }

        if invitation.expires_at < datetime.utcnow():
            return {
                "valid": False,
                "message": "This invitation has expired. Please contact your account manager for a new invitation."
            }

        customer = self.db.query(Customer).filter(
            Customer.id == invitation.customer_id
        ).first()

        return {
            "valid": True,
            "email": invitation.email,
            "customer_id": str(invitation.customer_id),
            "customer_name": customer.company_name if customer else None,
            "customer_logo": customer.logo_url if customer else None,
            "expires_at": invitation.expires_at.isoformat()
        }

    def complete_signup(
        self,
        token: str,
        password: str,
        password_confirmation: str,
        full_name: Optional[str] = None,
        job_title: Optional[str] = None,
        phone: Optional[str] = None
    ) -> Tuple[CustomerUser, str, str]:
        """
        Complete signup using an invitation token.
        Returns the created user and tokens for auto-login.
        """
        # Validate invitation
        validation = self.validate_invitation(token)
        if not validation["valid"]:
            raise BadRequestError(detail=validation["message"])

        # Validate password confirmation
        if password != password_confirmation:
            raise BadRequestError(detail="Passwords do not match")

        # Validate password strength
        is_valid, message = validate_password_strength(password)
        if not is_valid:
            raise BadRequestError(detail=message)

        # Get the invitation
        invitation = self.db.query(CustomerUserInvitation).filter(
            CustomerUserInvitation.invitation_token == token
        ).first()

        # Check if email already has an account (edge case - race condition)
        existing = self.db.query(CustomerUser).filter(
            CustomerUser.email == invitation.email
        ).first()
        if existing:
            raise BadRequestError(detail="An account with this email already exists")

        # Create the customer user
        hashed_password = get_password_hash(password)

        # Use provided name or empty string (should be filled via invitation flow)
        user_name = full_name if full_name else invitation.email.split('@')[0]

        customer_user = CustomerUser(
            customer_id=invitation.customer_id,
            email=invitation.email,
            hashed_password=hashed_password,
            full_name=user_name,
            job_title=job_title,
            phone=phone,
            is_primary_contact=False,
            is_active=True,
            is_verified=True  # Verified through invitation link
        )

        self.db.add(customer_user)

        # Mark invitation as used
        invitation.is_used = True
        invitation.used_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(customer_user)

        # Generate tokens for auto-login
        access_token, refresh_token = create_customer_tokens(
            customer_user.id,
            customer_user.customer_id,
            customer_user.email
        )

        # Update last login
        customer_user.last_login = datetime.utcnow()
        self.db.commit()

        logger.info(f"Customer user {customer_user.email} signed up via invitation")
        return customer_user, access_token, refresh_token

    # ==================== Login ====================

    def authenticate(self, email: str, password: str) -> CustomerUser:
        """
        Authenticate a customer user by email and password.
        Returns the user if successful, raises exception otherwise.
        """
        # Find user - use generic error to not reveal if email exists
        customer_user = self.db.query(CustomerUser).filter(
            CustomerUser.email == email
        ).first()

        if not customer_user:
            logger.warning(f"Customer login attempt with non-existent email: {email}")
            raise InvalidCredentialsError(detail="Invalid email or password")

        # Check password
        if not verify_password(password, customer_user.hashed_password):
            logger.warning(f"Customer login failed - wrong password: {email}")
            raise InvalidCredentialsError(detail="Invalid email or password")

        # Check account is active
        if not customer_user.is_active:
            logger.warning(f"Customer login attempt by inactive user: {email}")
            raise InvalidCredentialsError(detail="Invalid email or password")

        # Check account is verified
        if not customer_user.is_verified:
            logger.warning(f"Customer login attempt by unverified user: {email}")
            raise InvalidCredentialsError(detail="Invalid email or password")

        # Check customer company has portal access
        customer = self.db.query(Customer).filter(
            Customer.id == customer_user.customer_id
        ).first()

        if not customer or not customer.portal_enabled:
            logger.warning(f"Customer login attempt but portal disabled: {email}")
            raise InvalidCredentialsError(detail="Portal access is not enabled for your organization")

        return customer_user

    def login(
        self,
        email: str,
        password: str,
        remember_me: bool = False
    ) -> Tuple[str, str, CustomerUser, Customer]:
        """
        Login a customer user.
        Returns access token, refresh token, user, and customer.
        """
        customer_user = self.authenticate(email, password)

        # Get customer company
        customer = self.db.query(Customer).filter(
            Customer.id == customer_user.customer_id
        ).first()

        # Generate tokens
        access_token, refresh_token = create_customer_tokens(
            customer_user.id,
            customer_user.customer_id,
            customer_user.email,
            remember_me
        )

        # Update last login
        customer_user.last_login = datetime.utcnow()
        self.db.commit()

        logger.info(f"Customer user {email} logged in")
        return access_token, refresh_token, customer_user, customer

    def refresh_access_token(self, refresh_token: str) -> Tuple[str, str]:
        """
        Refresh access token using refresh token.
        Returns new access and refresh tokens.
        """
        # Check if token is invalidated
        jti = get_customer_refresh_token_jti(refresh_token)
        if jti and jti in invalidated_customer_tokens:
            logger.warning("Attempt to use invalidated customer refresh token")
            raise InvalidCredentialsError(detail="Token has been revoked")

        payload = decode_customer_refresh_token(refresh_token)
        if payload is None:
            raise InvalidCredentialsError(detail="Invalid refresh token")

        customer_user_id = payload.get("sub")
        customer_id = payload.get("customer_id")

        if not customer_user_id or not customer_id:
            raise InvalidCredentialsError(detail="Invalid refresh token")

        # Get user
        customer_user = self.db.query(CustomerUser).filter(
            CustomerUser.id == customer_user_id
        ).first()

        if not customer_user:
            raise NotFoundError(detail="User not found")

        if not customer_user.is_active:
            raise InvalidCredentialsError(detail="Account is deactivated")

        # Check portal access still enabled
        customer = self.db.query(Customer).filter(
            Customer.id == customer_id
        ).first()

        if not customer or not customer.portal_enabled:
            raise InvalidCredentialsError(detail="Portal access is disabled")

        # Invalidate old refresh token
        if jti:
            invalidated_customer_tokens.add(jti)

        # Generate new tokens
        access_token, new_refresh_token = create_customer_tokens(
            customer_user.id,
            customer_user.customer_id,
            customer_user.email
        )

        logger.info(f"Customer token refreshed for: {customer_user.email}")
        return access_token, new_refresh_token

    def logout(self, refresh_token: str) -> bool:
        """Logout by invalidating the refresh token."""
        jti = get_customer_refresh_token_jti(refresh_token)
        if jti:
            invalidated_customer_tokens.add(jti)
            logger.info("Customer refresh token invalidated")
            return True
        return False

    # ==================== Profile Management ====================

    def get_profile(self, customer_user: CustomerUser) -> dict:
        """Get customer user profile with company info."""
        customer = self.db.query(Customer).filter(
            Customer.id == customer_user.customer_id
        ).first()

        return {
            "user": {
                "id": str(customer_user.id),
                "email": customer_user.email,
                "full_name": customer_user.full_name,
                "job_title": customer_user.job_title,
                "phone": customer_user.phone,
                "is_primary_contact": customer_user.is_primary_contact,
                "last_login": customer_user.last_login.isoformat() if customer_user.last_login else None,
                "created_at": customer_user.created_at.isoformat()
            },
            "company": {
                "id": str(customer.id),
                "name": customer.company_name,
                "logo_url": customer.logo_url,
                "industry": customer.industry
            } if customer else None
        }

    def update_profile(
        self,
        customer_user: CustomerUser,
        full_name: Optional[str] = None,
        job_title: Optional[str] = None,
        phone: Optional[str] = None
    ) -> CustomerUser:
        """Update customer user profile."""
        if full_name is not None:
            customer_user.full_name = full_name

        if job_title is not None:
            customer_user.job_title = job_title

        if phone is not None:
            customer_user.phone = phone

        customer_user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(customer_user)

        logger.info(f"Customer profile updated: {customer_user.email}")
        return customer_user

    def change_password(
        self,
        customer_user: CustomerUser,
        current_password: str,
        new_password: str
    ) -> bool:
        """Change password for authenticated customer user."""
        # Verify current password
        if not verify_password(current_password, customer_user.hashed_password):
            raise InvalidCredentialsError(detail="Current password is incorrect")

        # Validate new password strength
        is_valid, message = validate_password_strength(new_password)
        if not is_valid:
            raise BadRequestError(detail=message)

        # Update password
        customer_user.hashed_password = get_password_hash(new_password)
        customer_user.updated_at = datetime.utcnow()
        self.db.commit()

        logger.info(f"Customer password changed: {customer_user.email}")
        return True

    # ==================== Password Reset ====================

    def request_password_reset(self, email: str) -> bool:
        """
        Request password reset - generates token if account exists.
        Always returns success to not reveal if email exists.
        """
        customer_user = self.db.query(CustomerUser).filter(
            CustomerUser.email == email,
            CustomerUser.is_active == True
        ).first()

        if not customer_user:
            # Don't reveal that email doesn't exist
            logger.info(f"Password reset requested for non-existent email: {email}")
            return True

        # Generate reset token
        reset_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=PASSWORD_RESET_EXPIRY_HOURS)

        # Store token in invitations table with special prefix
        reset_invitation = CustomerUserInvitation(
            customer_id=customer_user.customer_id,
            email=email,
            invitation_token=f"pwreset_{reset_token}",
            invited_by_id=None,
            sent_at=datetime.utcnow(),
            expires_at=expires_at,
            is_used=False
        )

        self.db.add(reset_invitation)
        self.db.commit()

        logger.info(f"Password reset token generated for: {email}")

        # Send password reset email
        try:
            email_service = EmailNotificationService(self.db)
            email_service.send_password_reset_email(
                recipient_email=email,
                recipient_name=customer_user.full_name,
                reset_token=reset_token
            )
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")

        return True

    def validate_reset_token(self, token: str) -> dict:
        """Validate a password reset token."""
        full_token = f"pwreset_{token}"

        reset_record = self.db.query(CustomerUserInvitation).filter(
            CustomerUserInvitation.invitation_token == full_token,
            CustomerUserInvitation.is_used == False
        ).first()

        if not reset_record:
            return {"valid": False, "message": "Invalid or expired reset link"}

        if reset_record.expires_at < datetime.utcnow():
            return {"valid": False, "message": "Reset link has expired"}

        return {
            "valid": True,
            "email": reset_record.email
        }

    def complete_password_reset(self, token: str, new_password: str) -> bool:
        """Complete password reset using token."""
        # Validate token
        validation = self.validate_reset_token(token)
        if not validation["valid"]:
            raise BadRequestError(detail=validation["message"])

        # Validate password strength
        is_valid, message = validate_password_strength(new_password)
        if not is_valid:
            raise BadRequestError(detail=message)

        full_token = f"pwreset_{token}"

        # Get reset record
        reset_record = self.db.query(CustomerUserInvitation).filter(
            CustomerUserInvitation.invitation_token == full_token
        ).first()

        # Get user
        customer_user = self.db.query(CustomerUser).filter(
            CustomerUser.email == reset_record.email
        ).first()

        if not customer_user:
            raise NotFoundError(detail="User not found")

        # Update password
        customer_user.hashed_password = get_password_hash(new_password)
        customer_user.updated_at = datetime.utcnow()

        # Mark token as used
        reset_record.is_used = True
        reset_record.used_at = datetime.utcnow()

        self.db.commit()

        logger.info(f"Password reset completed for: {customer_user.email}")
        return True

    # ==================== Session Invalidation ====================

    def invalidate_all_sessions_for_customer(self, customer_id: UUID) -> int:
        """
        Invalidate all sessions for a customer company.
        Called when portal access is disabled.
        Note: In production, this would use Redis to track active sessions.
        """
        # This is a placeholder - in production with Redis, you'd track
        # active sessions and invalidate them here
        logger.info(f"Sessions invalidated for customer: {customer_id}")
        return 0
