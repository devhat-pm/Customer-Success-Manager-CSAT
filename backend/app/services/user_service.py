from datetime import datetime
from typing import Optional, List, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import or_
import logging

from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash
from app.core.exceptions import (
    UserNotFoundError,
    DuplicateEmailError,
    SelfModificationError,
    ValidationError
)

logger = logging.getLogger(__name__)


class UserService:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: UUID) -> User:
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise UserNotFoundError()
        return user

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None
    ) -> Tuple[List[User], int]:
        query = self.db.query(User)

        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                or_(
                    User.email.ilike(search_filter),
                    User.full_name.ilike(search_filter)
                )
            )

        if role is not None:
            query = query.filter(User.role == role)

        if is_active is not None:
            query = query.filter(User.is_active == is_active)

        total = query.count()
        users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

        return users, total

    def create(self, user_data: UserCreate) -> User:
        # Check if email already exists
        existing = self.get_by_email(user_data.email)
        if existing:
            raise DuplicateEmailError()

        user = User(
            email=user_data.email,
            full_name=user_data.full_name,
            hashed_password=get_password_hash(user_data.password),
            role=user_data.role,
            is_active=True
        )

        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        logger.info(f"User created: {user.email} with role {user.role.value}")
        return user

    def update(
        self,
        user_id: UUID,
        user_data: UserUpdate,
        current_user: User
    ) -> User:
        user = self.get_by_id(user_id)

        if user_data.email is not None and user_data.email != user.email:
            existing = self.get_by_email(user_data.email)
            if existing:
                raise DuplicateEmailError()
            user.email = user_data.email

        if user_data.full_name is not None:
            user.full_name = user_data.full_name

        if user_data.role is not None:
            # Prevent changing own role
            if user.id == current_user.id:
                raise SelfModificationError(detail="Cannot change your own role")
            user.role = user_data.role

        if user_data.is_active is not None:
            # Prevent deactivating own account
            if user.id == current_user.id and not user_data.is_active:
                raise SelfModificationError(detail="Cannot deactivate your own account")
            user.is_active = user_data.is_active

        if user_data.password is not None:
            user.hashed_password = get_password_hash(user_data.password)

        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)

        logger.info(f"User updated: {user.email}")
        return user

    def delete(self, user_id: UUID, current_user: User) -> bool:
        user = self.get_by_id(user_id)

        # Prevent self-deletion
        if user.id == current_user.id:
            raise SelfModificationError(detail="Cannot delete your own account")

        # Soft delete - just deactivate
        user.is_active = False
        user.updated_at = datetime.utcnow()
        self.db.commit()

        logger.info(f"User soft deleted: {user.email}")
        return True

    def activate(
        self,
        user_id: UUID,
        is_active: bool,
        current_user: User
    ) -> User:
        user = self.get_by_id(user_id)

        # Prevent self-deactivation
        if user.id == current_user.id and not is_active:
            raise SelfModificationError(detail="Cannot deactivate your own account")

        user.is_active = is_active
        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)

        action = "activated" if is_active else "deactivated"
        logger.info(f"User {action}: {user.email}")
        return user
