"""
Customer Portal Ticket Endpoints.
Allows customers to create, view, and comment on their support tickets.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from uuid import UUID

from app.core.database import get_db
from app.core.customer_dependencies import get_current_customer_user, CustomerUserContext
from app.models.support_ticket import ProductType, TicketStatus
from app.schemas.support_ticket import (
    CustomerTicketCreate,
    CustomerTicketResponse,
    CustomerTicketDetail,
    CustomerTicketListResponse,
    CommentCreate,
    CommentResponse,
    CommentListResponse,
)
from app.services.customer_ticket_service import CustomerTicketService
from pydantic import BaseModel

router = APIRouter(prefix="/portal/tickets", tags=["Customer Portal Tickets"])


class MessageResponse(BaseModel):
    message: str


class CloseTicketRequest(BaseModel):
    """Request to close a ticket with optional feedback."""
    feedback: Optional[str] = None


# ==================== Ticket CRUD ====================

@router.post("/", response_model=CustomerTicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket_data: CustomerTicketCreate,
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Create a new support ticket.

    **Requires customer authentication.**

    The ticket is automatically associated with your company.
    Product must be one of the products deployed for your company.

    - Ticket number is auto-generated (TKT-YYYYMM-XXXX)
    - Initial status is 'open'
    - SLA tracking begins immediately
    """
    service = CustomerTicketService(db)

    # Validate product is deployed for customer
    valid_products = service.get_customer_products(context.customer_id)
    if ticket_data.product.value not in valid_products:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product {ticket_data.product.value} is not deployed for your company. Available products: {', '.join(valid_products)}"
        )

    ticket = service.create_customer_ticket(
        customer_user=context.customer_user,
        customer=context.customer,
        ticket_data=ticket_data
    )

    return service.to_customer_response(ticket)


@router.get("/", response_model=CustomerTicketListResponse)
async def list_my_tickets(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[TicketStatus] = Query(None, alias="status"),
    product: Optional[ProductType] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    List all tickets for your company.

    **Requires customer authentication.**

    Filters available:
    - status: Filter by ticket status
    - product: Filter by product
    - date_from/date_to: Filter by creation date range
    """
    service = CustomerTicketService(db)
    tickets, total = service.get_customer_tickets(
        customer_id=context.customer_id,
        skip=skip,
        limit=limit,
        status=status_filter,
        product=product,
        date_from=date_from,
        date_to=date_to
    )

    return CustomerTicketListResponse(
        tickets=[service.to_customer_response(t) for t in tickets],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/products")
async def get_available_products(
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Get list of products available for ticket creation.

    **Requires customer authentication.**

    Returns only products deployed for your company.
    """
    service = CustomerTicketService(db)
    products = service.get_customer_products(context.customer_id)
    return {"products": products}


@router.get("/{ticket_id}", response_model=CustomerTicketDetail)
async def get_ticket_detail(
    ticket_id: UUID,
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed view of a specific ticket including comments.

    **Requires customer authentication.**

    Only shows tickets belonging to your company.
    Internal staff notes and comments are hidden.
    """
    service = CustomerTicketService(db)
    ticket = service.get_ticket_for_customer(ticket_id, context.customer_id)
    return service.to_customer_detail(ticket, context.company_name)


@router.post("/{ticket_id}/close", response_model=CustomerTicketResponse)
async def close_ticket(
    ticket_id: UUID,
    request: Optional[CloseTicketRequest] = None,
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Close a ticket.

    **Requires customer authentication.**

    Customer can close their own tickets when they consider them resolved.
    Optionally provide feedback which will be saved as a comment.
    """
    service = CustomerTicketService(db)
    feedback = request.feedback if request else None
    ticket = service.close_ticket(
        ticket_id=ticket_id,
        customer_id=context.customer_id,
        customer_user=context.customer_user,
        feedback=feedback
    )
    return service.to_customer_response(ticket)


@router.post("/{ticket_id}/reopen", response_model=CustomerTicketResponse)
async def reopen_ticket(
    ticket_id: UUID,
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Reopen a closed ticket.

    **Requires customer authentication.**

    Can only reopen tickets that are currently closed.
    """
    service = CustomerTicketService(db)
    ticket = service.reopen_ticket(ticket_id, context.customer_id)
    return service.to_customer_response(ticket)


# ==================== Comments ====================

@router.get("/{ticket_id}/comments", response_model=CommentListResponse)
async def get_ticket_comments(
    ticket_id: UUID,
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Get all comments for a ticket.

    **Requires customer authentication.**

    Only shows non-internal comments.
    """
    service = CustomerTicketService(db)
    # Verify ticket belongs to customer
    service.get_ticket_for_customer(ticket_id, context.customer_id)
    comments = service.get_comments_for_customer(ticket_id)

    return CommentListResponse(
        comments=[service.to_comment_response(c) for c in comments],
        total=len(comments)
    )


@router.post("/{ticket_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(
    ticket_id: UUID,
    comment_data: CommentCreate,
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Add a comment/reply to a ticket.

    **Requires customer authentication.**

    Customer comments are always visible to staff.
    Cannot mark comments as internal (only staff can do that).
    """
    service = CustomerTicketService(db)

    # Force is_internal to False for customer comments
    comment = service.add_customer_comment(
        ticket_id=ticket_id,
        customer_id=context.customer_id,
        customer_user=context.customer_user,
        comment_text=comment_data.comment_text,
        attachments=comment_data.attachments
    )

    return service.to_comment_response(comment)


# ==================== Stats ====================

@router.get("/stats/summary")
async def get_my_ticket_stats(
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Get ticket statistics for your company.

    **Requires customer authentication.**
    """
    service = CustomerTicketService(db)
    stats = service.get_customer_ticket_stats(context.customer_id)
    return stats
