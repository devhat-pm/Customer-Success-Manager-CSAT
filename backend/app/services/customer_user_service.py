"""
Service layer for managing Customer Portal users.
Used by Extravis staff to invite, manage, and control customer contacts.
"""
from datetime import datetime, timedelta
from typing import Optional, List, Tuple
from uuid import UUID
import secrets
import logging

from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.models.customer import Customer
from app.models.customer_user import CustomerUser
from app.models.customer_user_invitation import CustomerUserInvitation
from app.models.user import User
from app.core.security import get_password_hash, verify_password, create_tokens
from app.core.exceptions import (
    NotFoundError,
    DuplicateResourceError,
    BadRequestError,
    ValidationError,
    InvalidCredentialsError,
    InactiveUserError
)
from app.services.email_service import EmailNotificationService

logger = logging.getLogger(__name__)

# Configuration
MAX_PORTAL_USERS_PER_CUSTOMER = 10
INVITATION_EXPIRY_DAYS = 7


class CustomerUserService:
    """Service for managing customer portal users."""

    def __init__(self, db: Session):
        self.db = db

    # ==================== Customer User Management ====================

    def get_customer_users(
        self,
        customer_id: UUID,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = False,
        primary_only: bool = False,
        search: Optional[str] = None
    ) -> Tuple[List[CustomerUser], int]:
        """Get all portal users for a specific customer with filtering."""
        # Verify customer exists
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise NotFoundError(detail="Customer not found")

        query = self.db.query(CustomerUser).filter(CustomerUser.customer_id == customer_id)

        if active_only:
            query = query.filter(CustomerUser.is_active == True)

        if primary_only:
            query = query.filter(CustomerUser.is_primary_contact == True)

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    CustomerUser.full_name.ilike(search_term),
                    CustomerUser.email.ilike(search_term)
                )
            )

        total = query.count()
        users = query.order_by(CustomerUser.created_at.desc()).offset(skip).limit(limit).all()

        return users, total

    def get_customer_user_by_id(self, user_id: UUID) -> CustomerUser:
        """Get a specific customer user by ID."""
        user = self.db.query(CustomerUser).filter(CustomerUser.id == user_id).first()
        if not user:
            raise NotFoundError(detail="Customer user not found")
        return user

    def update_customer_user(
        self,
        user_id: UUID,
        full_name: Optional[str] = None,
        job_title: Optional[str] = None,
        phone: Optional[str] = None,
        is_primary_contact: Optional[bool] = None,
        is_active: Optional[bool] = None,
        is_verified: Optional[bool] = None
    ) -> CustomerUser:
        """Update a customer user's details."""
        user = self.get_customer_user_by_id(user_id)

        if full_name is not None:
            user.full_name = full_name

        if job_title is not None:
            user.job_title = job_title

        if phone is not None:
            user.phone = phone

        if is_active is not None:
            user.is_active = is_active

        if is_verified is not None:
            user.is_verified = is_verified

        if is_primary_contact is not None and is_primary_contact:
            # Remove primary status from other contacts of same customer
            self.db.query(CustomerUser).filter(
                CustomerUser.customer_id == user.customer_id,
                CustomerUser.id != user.id,
                CustomerUser.is_primary_contact == True
            ).update({"is_primary_contact": False})
            user.is_primary_contact = True
        elif is_primary_contact is not None:
            user.is_primary_contact = False

        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)

        logger.info(f"Customer user {user.email} updated")
        return user

    def deactivate_customer_user(self, user_id: UUID) -> CustomerUser:
        """Deactivate a customer user account."""
        return self.update_customer_user(user_id, is_active=False)

    def reactivate_customer_user(self, user_id: UUID) -> CustomerUser:
        """Reactivate a customer user account."""
        return self.update_customer_user(user_id, is_active=True)

    def delete_customer_user(self, user_id: UUID) -> bool:
        """Permanently delete a customer user."""
        user = self.get_customer_user_by_id(user_id)
        email = user.email

        self.db.delete(user)
        self.db.commit()

        logger.info(f"Customer user {email} permanently deleted")
        return True

    # ==================== Invitation Management ====================

    def create_invitation(
        self,
        customer_id: UUID,
        email: str,
        invited_by: User,
        full_name: Optional[str] = None,
        job_title: Optional[str] = None,
        phone: Optional[str] = None,
        is_primary_contact: bool = False
    ) -> CustomerUserInvitation:
        """Create an invitation for a customer contact."""
        # Verify customer exists and has portal enabled
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise NotFoundError(detail="Customer not found")

        # Check if email already has an account
        existing_user = self.db.query(CustomerUser).filter(
            CustomerUser.email == email
        ).first()
        if existing_user:
            raise DuplicateResourceError(
                detail="This email already has a customer portal account"
            )

        # Check if there's already a pending invitation for this email
        existing_invitation = self.db.query(CustomerUserInvitation).filter(
            CustomerUserInvitation.email == email,
            CustomerUserInvitation.is_used == False,
            CustomerUserInvitation.expires_at > datetime.utcnow()
        ).first()
        if existing_invitation:
            raise DuplicateResourceError(
                detail="There is already a pending invitation for this email. Cancel it first or use resend."
            )

        # Check max users limit
        current_user_count = self.db.query(CustomerUser).filter(
            CustomerUser.customer_id == customer_id
        ).count()
        pending_invitation_count = self.db.query(CustomerUserInvitation).filter(
            CustomerUserInvitation.customer_id == customer_id,
            CustomerUserInvitation.is_used == False,
            CustomerUserInvitation.expires_at > datetime.utcnow()
        ).count()

        if current_user_count + pending_invitation_count >= MAX_PORTAL_USERS_PER_CUSTOMER:
            raise ValidationError(
                detail=f"Maximum of {MAX_PORTAL_USERS_PER_CUSTOMER} portal users per customer reached"
            )

        # Generate invitation token
        invitation_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=INVITATION_EXPIRY_DAYS)

        invitation = CustomerUserInvitation(
            customer_id=customer_id,
            email=email,
            invitation_token=invitation_token,
            invited_by_id=invited_by.id,
            sent_at=datetime.utcnow(),
            expires_at=expires_at,
            is_used=False
        )

        self.db.add(invitation)
        self.db.commit()
        self.db.refresh(invitation)

        # Send invitation email
        try:
            email_service = EmailNotificationService(self.db)
            email_service.send_invitation_email(
                recipient_email=email,
                recipient_name=full_name or email.split("@")[0],
                company_name=customer.company_name,
                inviter_name=invited_by.full_name or invited_by.email,
                signup_token=invitation_token
            )
        except Exception as e:
            logger.error(f"Failed to queue invitation email for {email}: {e}")

        logger.info(f"Invitation created for {email} to customer {customer.company_name} by {invited_by.email}")
        return invitation

    def get_pending_invitations(
        self,
        customer_id: UUID,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[CustomerUserInvitation], int]:
        """Get all pending invitations for a customer."""
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise NotFoundError(detail="Customer not found")

        query = self.db.query(CustomerUserInvitation).filter(
            CustomerUserInvitation.customer_id == customer_id,
            CustomerUserInvitation.is_used == False
        )

        total = query.count()
        invitations = query.order_by(CustomerUserInvitation.sent_at.desc()).offset(skip).limit(limit).all()

        return invitations, total

    def get_invitation_by_id(self, invitation_id: UUID) -> CustomerUserInvitation:
        """Get an invitation by ID."""
        invitation = self.db.query(CustomerUserInvitation).filter(
            CustomerUserInvitation.id == invitation_id
        ).first()
        if not invitation:
            raise NotFoundError(detail="Invitation not found")
        return invitation

    def get_invitation_by_token(self, token: str) -> CustomerUserInvitation:
        """Get an invitation by token."""
        invitation = self.db.query(CustomerUserInvitation).filter(
            CustomerUserInvitation.invitation_token == token
        ).first()
        if not invitation:
            raise NotFoundError(detail="Invitation not found")
        return invitation

    def validate_invitation_token(self, token: str) -> dict:
        """Validate an invitation token and return details."""
        try:
            invitation = self.get_invitation_by_token(token)
        except NotFoundError:
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
                "message": "This invitation has expired"
            }

        customer = self.db.query(Customer).filter(
            Customer.id == invitation.customer_id
        ).first()

        return {
            "valid": True,
            "email": invitation.email,
            "customer_id": invitation.customer_id,
            "customer_name": customer.company_name if customer else None,
            "expires_at": invitation.expires_at,
            "message": None
        }

    def resend_invitation(
        self,
        invitation_id: UUID,
        resent_by: User
    ) -> CustomerUserInvitation:
        """Resend an invitation with new token and expiry."""
        invitation = self.get_invitation_by_id(invitation_id)

        if invitation.is_used:
            raise BadRequestError(detail="Cannot resend a used invitation")

        # Generate new token and extend expiry
        invitation.invitation_token = secrets.token_urlsafe(32)
        invitation.expires_at = datetime.utcnow() + timedelta(days=INVITATION_EXPIRY_DAYS)
        invitation.sent_at = datetime.utcnow()
        invitation.invited_by_id = resent_by.id

        self.db.commit()
        self.db.refresh(invitation)

        # Resend invitation email
        try:
            customer = self.db.query(Customer).filter(Customer.id == invitation.customer_id).first()
            email_service = EmailNotificationService(self.db)
            email_service.send_invitation_email(
                recipient_email=invitation.email,
                recipient_name=invitation.email.split("@")[0],
                company_name=customer.company_name if customer else "Unknown",
                inviter_name=resent_by.full_name or resent_by.email,
                signup_token=invitation.invitation_token
            )
        except Exception as e:
            logger.error(f"Failed to queue resent invitation email for {invitation.email}: {e}")

        logger.info(f"Invitation resent for {invitation.email} by {resent_by.email}")
        return invitation

    def cancel_invitation(self, invitation_id: UUID) -> bool:
        """Cancel a pending invitation."""
        invitation = self.get_invitation_by_id(invitation_id)

        if invitation.is_used:
            raise BadRequestError(detail="Cannot cancel a used invitation")

        self.db.delete(invitation)
        self.db.commit()

        logger.info(f"Invitation for {invitation.email} cancelled")
        return True

    def accept_invitation(
        self,
        token: str,
        password: str,
        full_name: str,
        job_title: Optional[str] = None,
        phone: Optional[str] = None
    ) -> CustomerUser:
        """Accept an invitation and create the customer user account."""
        validation = self.validate_invitation_token(token)
        if not validation["valid"]:
            raise BadRequestError(detail=validation["message"])

        invitation = self.get_invitation_by_token(token)

        # Create the customer user
        hashed_password = get_password_hash(password)

        customer_user = CustomerUser(
            customer_id=invitation.customer_id,
            email=invitation.email,
            hashed_password=hashed_password,
            full_name=full_name,
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

        # Send welcome email
        try:
            customer = self.db.query(Customer).filter(Customer.id == invitation.customer_id).first()
            account_manager = customer.account_manager if customer else None
            email_service = EmailNotificationService(self.db)
            email_service.send_welcome_email(
                recipient_email=customer_user.email,
                recipient_name=customer_user.full_name,
                account_manager_name=account_manager.full_name if account_manager else "Your Account Manager"
            )
        except Exception as e:
            logger.error(f"Failed to queue welcome email for {customer_user.email}: {e}")

        logger.info(f"Customer user {customer_user.email} created from invitation")
        return customer_user

    # ==================== Password Management ====================

    def generate_password_reset_token(self, user_id: UUID) -> str:
        """Generate a password reset token for a customer user."""
        user = self.get_customer_user_by_id(user_id)

        # Create a temporary invitation-like token for password reset
        # In production, you'd want a separate table for password reset tokens
        reset_token = secrets.token_urlsafe(32)

        # Store in a way that can be retrieved - using invitation table as workaround
        # This creates a "password reset" invitation
        reset_invitation = CustomerUserInvitation(
            customer_id=user.customer_id,
            email=user.email,
            invitation_token=f"reset_{reset_token}",
            invited_by_id=None,
            sent_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(hours=24),
            is_used=False
        )

        self.db.add(reset_invitation)
        self.db.commit()

        # Send password reset email
        try:
            email_service = EmailNotificationService(self.db)
            email_service.send_password_reset_email(
                recipient_email=user.email,
                recipient_name=user.full_name,
                reset_token=reset_token
            )
        except Exception as e:
            logger.error(f"Failed to queue password reset email for {user.email}: {e}")

        logger.info(f"Password reset token generated for {user.email}")
        return reset_token

    def reset_password_with_token(self, token: str, new_password: str) -> bool:
        """Reset password using a reset token."""
        full_token = f"reset_{token}"

        invitation = self.db.query(CustomerUserInvitation).filter(
            CustomerUserInvitation.invitation_token == full_token,
            CustomerUserInvitation.is_used == False,
            CustomerUserInvitation.expires_at > datetime.utcnow()
        ).first()

        if not invitation:
            raise BadRequestError(detail="Invalid or expired password reset link")

        # Find the user
        user = self.db.query(CustomerUser).filter(
            CustomerUser.email == invitation.email
        ).first()

        if not user:
            raise NotFoundError(detail="User not found")

        # Update password
        user.hashed_password = get_password_hash(new_password)
        user.updated_at = datetime.utcnow()

        # Mark token as used
        invitation.is_used = True
        invitation.used_at = datetime.utcnow()

        self.db.commit()

        # Send password changed confirmation email
        try:
            email_service = EmailNotificationService(self.db)
            email_service.send_password_changed_email(
                recipient_email=user.email,
                recipient_name=user.full_name
            )
        except Exception as e:
            logger.error(f"Failed to queue password changed email for {user.email}: {e}")

        logger.info(f"Password reset completed for {user.email}")
        return True

    # ==================== Portal Access Management ====================

    def toggle_customer_portal_access(
        self,
        customer_id: UUID,
        enabled: bool
    ) -> Customer:
        """Enable or disable portal access for a customer company."""
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise NotFoundError(detail="Customer not found")

        customer.portal_enabled = enabled
        customer.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(customer)

        status = "enabled" if enabled else "disabled"
        logger.info(f"Portal access {status} for customer {customer.company_name}")
        return customer

    def get_customer_portal_status(self, customer_id: UUID) -> dict:
        """Get portal access status and user count for a customer."""
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise NotFoundError(detail="Customer not found")

        user_count = self.db.query(CustomerUser).filter(
            CustomerUser.customer_id == customer_id
        ).count()

        active_user_count = self.db.query(CustomerUser).filter(
            CustomerUser.customer_id == customer_id,
            CustomerUser.is_active == True
        ).count()

        pending_invitation_count = self.db.query(CustomerUserInvitation).filter(
            CustomerUserInvitation.customer_id == customer_id,
            CustomerUserInvitation.is_used == False,
            CustomerUserInvitation.expires_at > datetime.utcnow()
        ).count()

        return {
            "customer_id": customer_id,
            "company_name": customer.company_name,
            "portal_enabled": customer.portal_enabled,
            "total_users": user_count,
            "active_users": active_user_count,
            "pending_invitations": pending_invitation_count,
            "max_users": MAX_PORTAL_USERS_PER_CUSTOMER
        }
