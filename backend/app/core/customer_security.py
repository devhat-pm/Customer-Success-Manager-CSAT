"""
Security utilities for Customer Portal authentication.
Separate from staff authentication to prevent cross-usage.
"""
from datetime import datetime, timedelta
from typing import Optional, Union
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings
import uuid
import re

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Token types for customer users
CUSTOMER_TOKEN_TYPE_ACCESS = "customer_access"
CUSTOMER_TOKEN_TYPE_REFRESH = "customer_refresh"
CUSTOMER_TOKEN_ISSUER = "extravis_customer_portal"

# Token expiry settings
CUSTOMER_ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours
CUSTOMER_REFRESH_TOKEN_EXPIRE_DAYS = 7
CUSTOMER_REMEMBER_ME_EXPIRE_DAYS = 30


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate a password hash."""
    return pwd_context.hash(password)


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password meets requirements:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one number
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"

    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"

    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number"

    return True, "Password meets requirements"


def create_customer_access_token(
    customer_user_id: Union[str, uuid.UUID],
    customer_id: Union[str, uuid.UUID],
    email: str,
    remember_me: bool = False,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create an access token for a customer user."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    elif remember_me:
        expire = datetime.utcnow() + timedelta(days=CUSTOMER_REMEMBER_ME_EXPIRE_DAYS)
    else:
        expire = datetime.utcnow() + timedelta(minutes=CUSTOMER_ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "exp": expire,
        "sub": str(customer_user_id),
        "customer_id": str(customer_id),
        "email": email,
        "type": CUSTOMER_TOKEN_TYPE_ACCESS,
        "iss": CUSTOMER_TOKEN_ISSUER,
        "iat": datetime.utcnow()
    }

    # Use a different secret for customer tokens
    secret_key = f"{settings.SECRET_KEY}_customer_portal"
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_customer_refresh_token(
    customer_user_id: Union[str, uuid.UUID],
    customer_id: Union[str, uuid.UUID],
    remember_me: bool = False,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a refresh token for a customer user."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    elif remember_me:
        expire = datetime.utcnow() + timedelta(days=CUSTOMER_REMEMBER_ME_EXPIRE_DAYS)
    else:
        expire = datetime.utcnow() + timedelta(days=CUSTOMER_REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode = {
        "exp": expire,
        "sub": str(customer_user_id),
        "customer_id": str(customer_id),
        "type": CUSTOMER_TOKEN_TYPE_REFRESH,
        "iss": CUSTOMER_TOKEN_ISSUER,
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4())
    }

    # Use a different secret for customer refresh tokens
    secret_key = f"{settings.REFRESH_SECRET_KEY}_customer_portal"
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_customer_tokens(
    customer_user_id: Union[str, uuid.UUID],
    customer_id: Union[str, uuid.UUID],
    email: str,
    remember_me: bool = False
) -> tuple[str, str]:
    """Create both access and refresh tokens for a customer user."""
    access_token = create_customer_access_token(
        customer_user_id, customer_id, email, remember_me
    )
    refresh_token = create_customer_refresh_token(
        customer_user_id, customer_id, remember_me
    )
    return access_token, refresh_token


def decode_customer_access_token(token: str) -> Optional[dict]:
    """Decode and validate a customer access token."""
    try:
        secret_key = f"{settings.SECRET_KEY}_customer_portal"
        payload = jwt.decode(token, secret_key, algorithms=[settings.ALGORITHM])

        # Verify token type and issuer
        if payload.get("type") != CUSTOMER_TOKEN_TYPE_ACCESS:
            return None
        if payload.get("iss") != CUSTOMER_TOKEN_ISSUER:
            return None

        return payload
    except JWTError:
        return None


def decode_customer_refresh_token(token: str) -> Optional[dict]:
    """Decode and validate a customer refresh token."""
    try:
        secret_key = f"{settings.REFRESH_SECRET_KEY}_customer_portal"
        payload = jwt.decode(token, secret_key, algorithms=[settings.ALGORITHM])

        # Verify token type and issuer
        if payload.get("type") != CUSTOMER_TOKEN_TYPE_REFRESH:
            return None
        if payload.get("iss") != CUSTOMER_TOKEN_ISSUER:
            return None

        return payload
    except JWTError:
        return None


def get_customer_refresh_token_jti(token: str) -> Optional[str]:
    """Extract the JTI (JWT ID) from a customer refresh token."""
    payload = decode_customer_refresh_token(token)
    if payload is None:
        return None
    return payload.get("jti")
