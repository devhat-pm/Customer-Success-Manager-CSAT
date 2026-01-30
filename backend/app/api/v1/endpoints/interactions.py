from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from uuid import UUID

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_manager_or_admin
from app.models.user import User
from app.models.customer_interaction import InteractionType, Sentiment
from app.schemas.customer_interaction import (
    CustomerInteractionCreate,
    CustomerInteractionUpdate,
    CustomerInteractionResponse,
    InteractionListResponse,
    PendingFollowupsResponse,
    InteractionSummaryStats
)
from app.services.interaction_service import InteractionService

router = APIRouter(prefix="/interactions", tags=["Customer Interactions"])


@router.get("/", response_model=InteractionListResponse)
async def list_interactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    customer_id: Optional[UUID] = Query(None, description="Filter by customer"),
    interaction_type: Optional[InteractionType] = Query(None, description="Filter by type"),
    sentiment: Optional[Sentiment] = Query(None, description="Filter by sentiment"),
    performed_by: Optional[str] = Query(None, description="Filter by performer"),
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    follow_up_required: Optional[bool] = Query(None, description="Filter by follow-up required"),
    sort_by: str = Query("interaction_date", description="Field to sort by"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all customer interactions with filtering and pagination.
    """
    interaction_service = InteractionService(db)
    interactions, total = interaction_service.get_all(
        skip=skip,
        limit=limit,
        customer_id=customer_id,
        interaction_type=interaction_type,
        sentiment=sentiment,
        performed_by=performed_by,
        start_date=start_date,
        end_date=end_date,
        follow_up_required=follow_up_required,
        sort_by=sort_by,
        sort_order=sort_order
    )

    return InteractionListResponse(
        interactions=interactions,
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/", response_model=CustomerInteractionResponse, status_code=status.HTTP_201_CREATED)
async def create_interaction(
    interaction_data: CustomerInteractionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Log a new customer interaction.
    - Auto-analyzes sentiment from description if not provided
    - Supports all interaction types: support_ticket, meeting, email, call, escalation, training
    """
    interaction_service = InteractionService(db)
    interaction = interaction_service.create(interaction_data)
    return interaction


@router.get("/summary", response_model=InteractionSummaryStats)
async def get_summary_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get interaction summary statistics for dashboard.
    Includes counts by type, sentiment, top performers, and daily trend.
    """
    interaction_service = InteractionService(db)
    return interaction_service.get_summary_stats()


@router.get("/pending-followups", response_model=PendingFollowupsResponse)
async def get_pending_followups(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    include_overdue: bool = Query(True, description="Include overdue follow-ups"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get interactions requiring follow-up.
    Sorted by follow-up date with overdue items first.
    """
    interaction_service = InteractionService(db)
    followups, total = interaction_service.get_pending_followups(
        skip=skip,
        limit=limit,
        include_overdue=include_overdue
    )

    return PendingFollowupsResponse(
        followups=followups,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/customer/{customer_id}", response_model=InteractionListResponse)
async def get_customer_interactions(
    customer_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all interactions for a specific customer.
    """
    interaction_service = InteractionService(db)
    interactions, total = interaction_service.get_customer_interactions(
        customer_id=customer_id,
        skip=skip,
        limit=limit
    )

    return InteractionListResponse(
        interactions=interactions,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{interaction_id}", response_model=CustomerInteractionResponse)
async def get_interaction(
    interaction_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get interaction details by ID.
    """
    interaction_service = InteractionService(db)
    return interaction_service.get_by_id(interaction_id)


@router.put("/{interaction_id}", response_model=CustomerInteractionResponse)
async def update_interaction(
    interaction_id: UUID,
    interaction_data: CustomerInteractionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an interaction.
    - Re-analyzes sentiment if description changes
    """
    interaction_service = InteractionService(db)
    return interaction_service.update(interaction_id, interaction_data)


@router.delete("/{interaction_id}", status_code=status.HTTP_200_OK)
async def delete_interaction(
    interaction_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Delete an interaction (Manager/Admin only).
    """
    interaction_service = InteractionService(db)
    interaction_service.delete(interaction_id)
    return {"message": "Interaction deleted successfully"}
