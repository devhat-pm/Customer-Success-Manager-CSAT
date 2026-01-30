from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_admin_user
from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.user import (
    Token,
    TokenRefresh,
    UserResponse,
    UserCreate,
    ProfileUpdate,
    PasswordChange,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ResetTokenValidation
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login with email and password to get access and refresh tokens.
    """
    auth_service = AuthService(db)
    access_token, refresh_token, user = auth_service.login(
        email=form_data.username,
        password=form_data.password
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    Register a new user (admin only).
    """
    # Check if email already exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Hash password and create user
    hashed_password = get_password_hash(user_data.password)

    user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        role=user_data.role,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_data: TokenRefresh,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token.
    """
    auth_service = AuthService(db)
    access_token, new_refresh_token = auth_service.refresh_access_token(
        token_data.refresh_token
    )

    return Token(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer"
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    token_data: TokenRefresh,
    db: Session = Depends(get_db)
):
    """
    Logout by invalidating the refresh token.
    """
    auth_service = AuthService(db)
    auth_service.logout(token_data.refresh_token)

    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user profile.
    """
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update current user profile (full_name, email).
    """
    auth_service = AuthService(db)
    updated_user = auth_service.update_profile(
        user=current_user,
        full_name=profile_data.full_name,
        email=profile_data.email
    )

    return updated_user


@router.put("/me/password", status_code=status.HTTP_200_OK)
async def change_password(
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Change current user password.
    """
    auth_service = AuthService(db)
    auth_service.change_password(
        user=current_user,
        current_password=password_data.current_password,
        new_password=password_data.new_password
    )

    return {"message": "Password changed successfully"}


@router.put("/change-password", status_code=status.HTTP_200_OK)
async def change_password_alias(
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Change current user password (alias endpoint).
    """
    auth_service = AuthService(db)
    auth_service.change_password(
        user=current_user,
        current_password=password_data.current_password,
        new_password=password_data.new_password
    )

    return {"message": "Password changed successfully"}


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Request password reset for admin user.
    Always returns success to prevent email enumeration.
    """
    auth_service = AuthService(db)
    auth_service.request_password_reset(request.email)
    return {"message": "If an account exists with this email, a password reset link has been sent"}


@router.get("/reset-password/validate/{token}", response_model=ResetTokenValidation)
async def validate_reset_token(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Validate a password reset token.
    """
    auth_service = AuthService(db)
    result = auth_service.validate_reset_token(token)
    return result


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Reset password using a valid reset token.
    """
    auth_service = AuthService(db)
    auth_service.reset_password(request.token, request.new_password)
    return {"message": "Password reset successfully"}
