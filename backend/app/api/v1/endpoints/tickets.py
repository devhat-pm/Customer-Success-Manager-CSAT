from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from uuid import UUID
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_manager_or_admin
from app.models.user import User
from app.models.support_ticket import ProductType, TicketPriority, TicketStatus
from app.schemas.support_ticket import (
    TicketCreate,
    TicketUpdate,
    TicketResponse,
    TicketWithCustomer,
    TicketListResponse,
    TicketDetailResponse,
    TicketStats,
    CriticalTicketsResponse,
    CommentCreate,
    CommentResponse,
    CommentListResponse,
)
from app.services.ticket_service import TicketService

router = APIRouter(prefix="/tickets", tags=["Support Tickets"])


class InternalNoteRequest(BaseModel):
    """Request to add an internal note."""
    note_text: str = Field(..., min_length=1)


@router.get("/", response_model=TicketListResponse)
async def list_tickets(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    customer_id: Optional[UUID] = Query(None, description="Filter by customer"),
    product: Optional[ProductType] = Query(None, description="Filter by product"),
    status: Optional[TicketStatus] = Query(None, description="Filter by status"),
    priority: Optional[TicketPriority] = Query(None, description="Filter by priority"),
    sla_breached: Optional[bool] = Query(None, description="Filter by SLA breach status"),
    date_from: Optional[date] = Query(None, description="Filter tickets created from this date"),
    date_to: Optional[date] = Query(None, description="Filter tickets created until this date"),
    search: Optional[str] = Query(None, description="Search in ticket number, subject, description"),
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all support tickets with filtering and pagination.

    Filters available:
    - customer_id: Filter by specific customer
    - product: Filter by product (MonetX, SupportX, GreenX)
    - status: Filter by status (open, in_progress, resolved, closed)
    - priority: Filter by priority (low, medium, high, critical)
    - sla_breached: Filter by SLA breach status (true/false)
    - date_from/date_to: Filter by creation date range
    - search: Search in ticket number, subject, and description
    """
    ticket_service = TicketService(db)
    tickets, total = ticket_service.get_all(
        skip=skip,
        limit=limit,
        customer_id=customer_id,
        product=product,
        status=status,
        priority=priority,
        sla_breached=sla_breached,
        date_from=date_from,
        date_to=date_to,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    return TicketListResponse(
        tickets=[TicketWithCustomer.model_validate(t) for t in tickets],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("/", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket_data: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new support ticket (staff action).

    - Automatically generates ticket number in format TKT-YYYYMM-XXXX
    - Initial status is 'open'
    - SLA tracking begins immediately
    - Can include internal notes (not visible to customers)
    - Can optionally notify customer via email

    SLA Thresholds:
    - Critical: 4 hours
    - High: 8 hours
    - Medium: 24 hours
    - Low: 72 hours
    """
    ticket_service = TicketService(db)
    ticket = ticket_service.create(ticket_data, staff_user=current_user)
    return ticket


@router.get("/stats", response_model=TicketStats)
async def get_ticket_stats(
    customer_id: Optional[UUID] = Query(None, description="Filter stats by customer"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get ticket statistics including:
    - Total tickets by status
    - Breakdown by priority and product
    - SLA breach count and rate
    - Average resolution time
    - Critical open ticket count
    """
    ticket_service = TicketService(db)
    stats = ticket_service.get_stats(customer_id=customer_id)
    return TicketStats(**stats)


@router.get("/critical", response_model=CriticalTicketsResponse)
async def get_critical_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all critical priority tickets that are open or in progress.

    Returns tickets sorted by creation date (oldest first) as these are most urgent.
    """
    ticket_service = TicketService(db)
    tickets, total = ticket_service.get_critical_tickets()

    return CriticalTicketsResponse(
        tickets=[TicketWithCustomer.model_validate(t) for t in tickets],
        total=total,
    )


@router.get("/sla-at-risk")
async def get_sla_at_risk_tickets(
    threshold: float = Query(80, ge=0, le=100, description="Percentage of SLA time elapsed to consider at risk"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get tickets that are approaching SLA breach.

    Default threshold is 80% - meaning tickets where 80% or more of the SLA time has elapsed.
    """
    ticket_service = TicketService(db)
    at_risk = ticket_service.get_sla_at_risk_tickets(threshold_percentage=threshold)

    return {
        "at_risk_tickets": [
            {
                "ticket": TicketWithCustomer.model_validate(item["ticket"]),
                "hours_open": item["hours_open"],
                "sla_threshold_hours": item["sla_threshold_hours"],
                "percentage_used": item["percentage_used"],
                "hours_remaining": item["hours_remaining"],
            }
            for item in at_risk
        ],
        "total": len(at_risk),
    }


@router.post("/check-sla-breaches")
async def check_sla_breaches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin),
):
    """
    Manually trigger SLA breach check for all open/in-progress tickets.

    This marks any tickets that have exceeded their SLA threshold as breached.
    Manager/Admin only.
    """
    ticket_service = TicketService(db)
    newly_breached = ticket_service.check_sla_breaches()

    return {
        "message": "SLA breach check completed",
        "newly_breached_count": len(newly_breached),
        "breached_tickets": [
            {
                "ticket_number": t.ticket_number,
                "subject": t.subject,
                "priority": t.priority.value,
            }
            for t in newly_breached
        ],
    }


@router.get("/customer/{customer_id}", response_model=TicketListResponse)
async def get_customer_tickets(
    customer_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    include_closed: bool = Query(True, description="Include closed tickets"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all tickets for a specific customer.
    """
    ticket_service = TicketService(db)
    tickets, total = ticket_service.get_customer_tickets(
        customer_id=customer_id,
        skip=skip,
        limit=limit,
        include_closed=include_closed,
    )

    return TicketListResponse(
        tickets=[TicketWithCustomer.model_validate(t) for t in tickets],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{ticket_id}", response_model=TicketWithCustomer)
async def get_ticket(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get ticket details by ID including customer information.
    """
    ticket_service = TicketService(db)
    ticket = ticket_service.get_by_id(ticket_id)
    return TicketWithCustomer.model_validate(ticket)


@router.put("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: UUID,
    ticket_data: TicketUpdate,
    send_followup_survey: bool = Query(False, description="Send followup survey when resolving ticket"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update a support ticket.

    When status changes to 'resolved' or 'closed':
    - resolved_at timestamp is set
    - resolution_time_hours is calculated
    - SLA breach is checked based on priority threshold
    - Optionally sends a followup survey (if send_followup_survey=true)

    SLA Thresholds:
    - Critical: 4 hours
    - High: 8 hours
    - Medium: 24 hours
    - Low: 72 hours
    """
    ticket_service = TicketService(db)
    ticket = ticket_service.update(
        ticket_id,
        ticket_data,
        trigger_followup_survey=send_followup_survey,
        staff_user=current_user
    )
    return ticket


@router.delete("/{ticket_id}", status_code=status.HTTP_200_OK)
async def delete_ticket(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin),
):
    """
    Delete a support ticket (Manager/Admin only).
    """
    ticket_service = TicketService(db)
    ticket_service.delete(ticket_id)
    return {"message": "Ticket deleted successfully"}


# ==================== Comment Endpoints ====================

@router.get("/{ticket_id}/detail", response_model=TicketDetailResponse)
async def get_ticket_with_comments(
    ticket_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get ticket details including all comments (staff view).

    Shows all comments including internal ones.
    """
    ticket_service = TicketService(db)
    ticket = ticket_service.get_ticket_with_comments(ticket_id)
    comments = ticket_service.get_comments(ticket_id, include_internal=True)

    return TicketDetailResponse(
        id=ticket.id,
        customer_id=ticket.customer_id,
        ticket_number=ticket.ticket_number,
        subject=ticket.subject,
        description=ticket.description,
        product=ticket.product,
        priority=ticket.priority,
        status=ticket.status,
        sla_breached=ticket.sla_breached,
        resolution_time_hours=ticket.resolution_time_hours,
        created_by_type=ticket.created_by_type,
        created_by_customer_user_id=ticket.created_by_customer_user_id,
        created_by_staff_user_id=ticket.created_by_staff_user_id,
        customer_contact_email=ticket.customer_contact_email,
        internal_notes=ticket.internal_notes,
        customer_visible_notes=ticket.customer_visible_notes,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        resolved_at=ticket.resolved_at,
        customer=ticket.customer,
        creator_name=ticket.creator_name,
        comment_count=len(comments),
        comments=[ticket_service.to_comment_response(c) for c in comments]
    )


@router.get("/{ticket_id}/comments", response_model=CommentListResponse)
async def get_ticket_comments(
    ticket_id: UUID,
    include_internal: bool = Query(True, description="Include internal comments"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all comments for a ticket.

    Staff can see both internal and customer-visible comments.
    """
    ticket_service = TicketService(db)
    comments = ticket_service.get_comments(ticket_id, include_internal=include_internal)

    return CommentListResponse(
        comments=[ticket_service.to_comment_response(c) for c in comments],
        total=len(comments)
    )


@router.post("/{ticket_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(
    ticket_id: UUID,
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Add a comment to a ticket.

    Staff can mark comments as internal (only visible to other staff).
    Customer-visible comments may trigger notification to customer.
    """
    ticket_service = TicketService(db)
    comment = ticket_service.add_staff_comment(
        ticket_id=ticket_id,
        staff_user=current_user,
        comment_text=comment_data.comment_text,
        is_internal=comment_data.is_internal,
        attachments=comment_data.attachments
    )

    return ticket_service.to_comment_response(comment)


@router.post("/{ticket_id}/internal-note", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def add_internal_note(
    ticket_id: UUID,
    note_data: InternalNoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Add an internal note to a ticket (quick method).

    Internal notes are only visible to staff, never to customers.
    """
    ticket_service = TicketService(db)
    comment = ticket_service.add_internal_note(
        ticket_id=ticket_id,
        staff_user=current_user,
        note_text=note_data.note_text
    )

    return ticket_service.to_comment_response(comment)
