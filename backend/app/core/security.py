from datetime import datetime, timedelta
from typing import Optional, Union, Tuple
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(subject: Union[str, uuid.UUID], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": TOKEN_TYPE_ACCESS,
        "iat": datetime.utcnow()
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(subject: Union[str, uuid.UUID], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": TOKEN_TYPE_REFRESH,
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4())
    }
    encoded_jwt = jwt.encode(to_encode, settings.REFRESH_SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_tokens(subject: Union[str, uuid.UUID]) -> Tuple[str, str]:
    access_token = create_access_token(subject)
    refresh_token = create_refresh_token(subject)
    return access_token, refresh_token


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != TOKEN_TYPE_ACCESS:
            return None
        return payload
    except JWTError:
        return None


def decode_refresh_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.REFRESH_SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != TOKEN_TYPE_REFRESH:
            return None
        return payload
    except JWTError:
        return None


def get_token_subject(token: str, token_type: str = TOKEN_TYPE_ACCESS) -> Optional[str]:
    if token_type == TOKEN_TYPE_ACCESS:
        payload = decode_access_token(token)
    else:
        payload = decode_refresh_token(token)

    if payload is None:
        return None
    return payload.get("sub")


def get_refresh_token_jti(token: str) -> Optional[str]:
    payload = decode_refresh_token(token)
    if payload is None:
        return None
    return payload.get("jti")
