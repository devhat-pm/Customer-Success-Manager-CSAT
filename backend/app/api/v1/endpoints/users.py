from fastapi import APIRouter, Depends, Query, status, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
import os
import uuid as uuid_lib

from app.core.database import get_db
from app.core.dependencies import get_admin_user, get_current_user
from app.models.user import User, UserRole
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse,
    UserActivate,
    ProfileUpdate
)
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])

# Avatar upload directory
AVATAR_DIR = "uploads/avatars"
os.makedirs(AVATAR_DIR, exist_ok=True)


@router.get("/", response_model=UserListResponse)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search: Optional[str] = Query(None, min_length=1),
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all users with pagination and filtering.
    """
    user_service = UserService(db)
    users, total = user_service.get_all(
        skip=skip,
        limit=limit,
        search=search,
        role=role,
        is_active=is_active
    )

    return UserListResponse(
        users=users,
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    Create a new user (Admin only).
    """
    user_service = UserService(db)
    user = user_service.create(user_data)
    return user


@router.get("/profile", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's profile.
    """
    return current_user


@router.put("/profile", response_model=UserResponse)
async def update_current_user_profile(
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update current user's profile (full_name, email, phone).
    """
    user_service = UserService(db)

    # Update only allowed fields (phone is accepted but not stored yet)
    update_data = UserUpdate(
        full_name=profile_data.full_name,
        email=profile_data.email,
        phone=profile_data.phone  # Currently ignored as User model doesn't have phone field
    )

    updated_user = user_service.update(current_user.id, update_data, current_user)
    return updated_user


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload avatar for current user.
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Allowed types: JPEG, PNG, GIF, WebP"
        )

    # Validate file size (max 5MB)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 5MB"
        )

    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{current_user.id}_{uuid_lib.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(AVATAR_DIR, filename)

    # Save file
    with open(filepath, "wb") as f:
        f.write(contents)

    # Update user's avatar URL in database (if you have avatar_url field)
    # For now, just return the URL
    avatar_url = f"/uploads/avatars/{filename}"

    return {"avatar_url": avatar_url, "message": "Avatar uploaded successfully"}


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    Get a user by ID (Admin only).
    """
    user_service = UserService(db)
    user = user_service.get_by_id(user_id)
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    Update a user (Admin only).
    """
    user_service = UserService(db)
    user = user_service.update(user_id, user_data, current_user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    Soft delete a user (Admin only).
    """
    user_service = UserService(db)
    user_service.delete(user_id, current_user)
    return {"message": "User deleted successfully"}


@router.put("/{user_id}/activate", response_model=UserResponse)
async def activate_user(
    user_id: UUID,
    activation_data: UserActivate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    Activate or deactivate a user (Admin only).
    """
    user_service = UserService(db)
    user = user_service.activate(user_id, activation_data.is_active, current_user)
    return user
