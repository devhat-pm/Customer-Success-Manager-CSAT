"""
Customer Portal Dashboard Endpoints.
Provides limited view of customer data compared to staff dashboards.
"""
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.customer_dependencies import get_current_customer_user, CustomerUserContext
from app.schemas.customer_dashboard import (
    CustomerDashboard,
    CustomerHealthScore,
    TicketsSummary,
    CustomerProducts,
    RecentActivity,
    PendingSurveys,
    ContractInfo,
    AnnouncementsList,
)
from app.services.customer_dashboard_service import CustomerDashboardService

router = APIRouter(prefix="/portal/dashboard", tags=["Customer Portal Dashboard"])


@router.get("/", response_model=CustomerDashboard)
async def get_dashboard(
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Get complete dashboard data in a single call.

    **Requires customer authentication.**

    Returns:
    - Welcome info (customer name, company, logo, last login)
    - Health score (limited view - overall only)
    - Ticket summary and recent tickets
    - Deployed products
    - Recent activity
    - Pending surveys
    - Contract information
    - Announcements
    """
    service = CustomerDashboardService(db)
    return service.get_full_dashboard(
        customer=context.customer,
        customer_user=context.customer_user
    )


@router.get("/health-score", response_model=Optional[CustomerHealthScore])
async def get_my_health_score(
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Get health score (limited view).

    **Requires customer authentication.**

    Returns ONLY:
    - Overall score (0-100)
    - Trend (improving/stable/declining)
    - Risk level (low/medium/attention_needed)
    - Simple health message

    Does NOT return individual component scores.
    """
    service = CustomerDashboardService(db)
    return service.get_health_score(context.customer_id)


@router.get("/tickets", response_model=TicketsSummary)
async def get_tickets_summary(
    recent_limit: int = Query(5, ge=1, le=20, description="Number of recent tickets to include"),
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Get ticket summary.

    **Requires customer authentication.**

    Returns:
    - Count by status (open, in_progress, resolved, closed)
    - Recent tickets list
    """
    service = CustomerDashboardService(db)
    return service.get_tickets_summary(context.customer_id, recent_limit)


@router.get("/products", response_model=CustomerProducts)
async def get_my_products(
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Get deployed products.

    **Requires customer authentication.**

    Returns list of products deployed for the customer's company
    with status and documentation links.
    """
    service = CustomerDashboardService(db)
    return service.get_products(context.customer_id)


@router.get("/activity", response_model=RecentActivity)
async def get_recent_activity(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Get recent activity.

    **Requires customer authentication.**

    Returns customer-visible activities:
    - Tickets created/updated
    - Surveys completed
    - Health score improvements

    Does NOT show internal staff activities.
    """
    service = CustomerDashboardService(db)
    return service.get_recent_activity(
        customer_id=context.customer_id,
        customer_user=context.customer_user,
        limit=limit,
        skip=skip
    )


@router.get("/pending-surveys", response_model=PendingSurveys)
async def get_pending_surveys(
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Get pending surveys.

    **Requires customer authentication.**

    Returns surveys waiting for customer response.
    """
    service = CustomerDashboardService(db)
    return service.get_pending_surveys(
        customer_id=context.customer_id,
        customer_user=context.customer_user
    )


@router.get("/contract", response_model=ContractInfo)
async def get_contract_info(
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Get contract information.

    **Requires customer authentication.**

    Returns:
    - Contract dates
    - Days until renewal
    - Account manager contact info
    """
    service = CustomerDashboardService(db)
    return service.get_contract_info(context.customer)


@router.get("/announcements", response_model=AnnouncementsList)
async def get_announcements(
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Get active announcements.

    **Requires customer authentication.**

    Returns announcements from Extravis that are:
    - Currently active
    - Within display date range
    - Targeted to all customers or specifically to this customer
    """
    service = CustomerDashboardService(db)
    return service.get_announcements(context.customer_id)
