"""
Staff Announcement Management Endpoints.
Allows Extravis staff to create, update, and delete announcements.
"""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_manager_or_admin
from app.models.user import User
from app.schemas.customer_dashboard import (
    AnnouncementCreate,
    AnnouncementUpdate,
    AnnouncementResponse,
    AnnouncementListResponse,
)
from app.services.announcement_service import AnnouncementService
from pydantic import BaseModel

router = APIRouter(prefix="/announcements", tags=["Announcements"])


class MessageResponse(BaseModel):
    message: str


@router.get("/", response_model=AnnouncementListResponse)
async def list_announcements(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    include_inactive: bool = Query(False, description="Include inactive announcements"),
    include_expired: bool = Query(False, description="Include expired announcements"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all announcements.

    By default, only shows active and non-expired announcements.
    Use query params to include inactive or expired ones.
    """
    service = AnnouncementService(db)
    announcements, total = service.get_all(
        skip=skip,
        limit=limit,
        include_inactive=include_inactive,
        include_expired=include_expired
    )

    return AnnouncementListResponse(
        announcements=[service.to_response(a) for a in announcements],
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    data: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Create a new announcement.

    **Manager/Admin only.**

    Target types:
    - all_customers: Visible to all customers
    - specific_customers: Only visible to customers in target_customer_ids list

    Priority:
    - normal: Standard display
    - important: Highlighted display, shown at top
    """
    service = AnnouncementService(db)
    announcement = service.create(data, current_user)
    return service.to_response(announcement)


@router.get("/{announcement_id}", response_model=AnnouncementResponse)
async def get_announcement(
    announcement_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get announcement details by ID.
    """
    service = AnnouncementService(db)
    announcement = service.get_by_id(announcement_id)
    return service.to_response(announcement)


@router.put("/{announcement_id}", response_model=AnnouncementResponse)
async def update_announcement(
    announcement_id: UUID,
    data: AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Update an announcement.

    **Manager/Admin only.**

    All fields are optional - only provided fields will be updated.
    """
    service = AnnouncementService(db)
    announcement = service.update(announcement_id, data, current_user)
    return service.to_response(announcement)


@router.delete("/{announcement_id}", status_code=status.HTTP_200_OK)
async def delete_announcement(
    announcement_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Delete an announcement.

    **Manager/Admin only.**

    This permanently removes the announcement.
    Use PATCH to deactivate instead if you want to keep the record.
    """
    service = AnnouncementService(db)
    service.delete(announcement_id, current_user)
    return MessageResponse(message="Announcement deleted successfully")


@router.post("/{announcement_id}/deactivate", response_model=AnnouncementResponse)
async def deactivate_announcement(
    announcement_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Deactivate an announcement (soft delete).

    **Manager/Admin only.**

    The announcement is hidden from customers but kept in the database.
    Can be reactivated later using PUT.
    """
    service = AnnouncementService(db)
    announcement = service.deactivate(announcement_id, current_user)
    return service.to_response(announcement)


@router.post("/{announcement_id}/activate", response_model=AnnouncementResponse)
async def activate_announcement(
    announcement_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Reactivate a deactivated announcement.

    **Manager/Admin only.**
    """
    service = AnnouncementService(db)
    data = AnnouncementUpdate(is_active=True)
    announcement = service.update(announcement_id, data, current_user)
    return service.to_response(announcement)
