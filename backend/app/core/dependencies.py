from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List, Callable
from functools import wraps

from app.core.database import get_db
from app.core.security import decode_access_token
from app.core.exceptions import (
    AuthenticationError,
    InvalidTokenError,
    InactiveUserError,
    PermissionDeniedError,
    UserNotFoundError
)
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    payload = decode_access_token(token)
    if payload is None:
        raise InvalidTokenError()

    user_id = payload.get("sub")
    if user_id is None:
        raise InvalidTokenError()

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise UserNotFoundError()

    if not user.is_active:
        raise InactiveUserError()

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_active:
        raise InactiveUserError()
    return current_user


def require_roles(allowed_roles: List[UserRole]) -> Callable:
    async def role_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        if current_user.role not in allowed_roles:
            raise PermissionDeniedError(
                detail=f"This action requires one of the following roles: {', '.join([r.value for r in allowed_roles])}"
            )
        return current_user
    return role_checker


async def get_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != UserRole.admin:
        raise PermissionDeniedError(detail="Admin access required")
    return current_user


async def get_manager_or_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role not in [UserRole.admin, UserRole.manager]:
        raise PermissionDeniedError(detail="Manager or admin access required")
    return current_user


class RoleChecker:
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    async def __call__(
        self,
        current_user: User = Depends(get_current_user)
    ) -> User:
        if current_user.role not in self.allowed_roles:
            raise PermissionDeniedError(
                detail=f"This action requires one of the following roles: {', '.join([r.value for r in self.allowed_roles])}"
            )
        return current_user


allow_admin = RoleChecker([UserRole.admin])
allow_admin_manager = RoleChecker([UserRole.admin, UserRole.manager])
allow_all_authenticated = RoleChecker([UserRole.admin, UserRole.manager, UserRole.viewer])
