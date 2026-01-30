from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date
from uuid import UUID

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_manager_or_admin
from app.models.user import User
from app.models.activity_log import ActivityType
from app.schemas.activity_log import (
    ActivityLogCreate,
    ActivityLogUpdate,
    ActivityLogResponse,
    ActivityLogListResponse,
    CustomerTimelineResponse,
    TimelineItem
)
from app.services.activity_service import ActivityService

router = APIRouter(prefix="/activities", tags=["Activities"])


@router.get("/", response_model=ActivityLogListResponse)
async def list_activities(
    customer_id: Optional[UUID] = Query(None, description="Filter by customer ID"),
    user_id: Optional[UUID] = Query(None, description="Filter by user ID"),
    activity_type: Optional[ActivityType] = Query(None, description="Filter by activity type"),
    date_from: Optional[date] = Query(None, description="Filter from date"),
    date_to: Optional[date] = Query(None, description="Filter to date"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all activities with optional filters.
    """
    activity_service = ActivityService(db)
    activities, total = activity_service.get_activities(
        customer_id=customer_id,
        user_id=user_id,
        activity_type=activity_type,
        date_from=date_from,
        date_to=date_to,
        skip=skip,
        limit=limit
    )

    return ActivityLogListResponse(
        activities=activities,
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/", response_model=ActivityLogResponse, status_code=status.HTTP_201_CREATED)
async def create_activity(
    activity_data: ActivityLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Log a new activity for a customer.
    """
    activity_service = ActivityService(db)
    activity = activity_service.create(activity_data, current_user.id)
    return activity


@router.get("/recent", response_model=List[ActivityLogResponse])
async def get_recent_activities(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get most recent activities across all customers.
    """
    activity_service = ActivityService(db)
    activities = activity_service.get_recent_activities(limit=limit)
    return activities


@router.get("/types", response_model=List[str])
async def get_activity_types(
    current_user: User = Depends(get_current_user)
):
    """
    Get list of valid activity types.
    """
    return [t.value for t in ActivityType]


@router.get("/stats")
async def get_activity_stats(
    customer_id: Optional[UUID] = Query(None, description="Filter by customer ID"),
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get activity statistics.
    """
    activity_service = ActivityService(db)
    stats = activity_service.get_activity_stats(customer_id=customer_id, days=days)
    return stats


@router.get("/customer/{customer_id}/timeline", response_model=CustomerTimelineResponse)
async def get_customer_timeline(
    customer_id: UUID,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get unified timeline for a customer including activities,
    health scores, alerts, CSAT surveys, and support tickets.
    """
    activity_service = ActivityService(db)
    items = activity_service.get_customer_timeline(customer_id=customer_id, limit=limit)

    return CustomerTimelineResponse(
        items=[TimelineItem(**item) for item in items],
        total=len(items)
    )


@router.get("/{activity_id}", response_model=ActivityLogResponse)
async def get_activity(
    activity_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific activity by ID.
    """
    activity_service = ActivityService(db)
    activity = activity_service.get_by_id(activity_id)
    return activity


@router.put("/{activity_id}", response_model=ActivityLogResponse)
async def update_activity(
    activity_id: UUID,
    activity_data: ActivityLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an activity.
    """
    activity_service = ActivityService(db)
    activity = activity_service.update(activity_id, activity_data)
    return activity


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity(
    activity_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Delete an activity.
    Requires manager or admin role.
    """
    activity_service = ActivityService(db)
    activity_service.delete(activity_id)
