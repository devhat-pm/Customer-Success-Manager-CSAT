from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from datetime import date, datetime, timedelta
from uuid import UUID

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_manager_or_admin
from app.models.user import User
from app.models.customer import Customer, CustomerStatus
from app.models.health_score import HealthScore
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerListResponse,
    CustomerDetailResponse,
    TimelineResponse,
    HealthHistoryResponse
)
from app.services.customer_service import CustomerService

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("/", response_model=CustomerListResponse)
async def list_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    search: Optional[str] = Query(None, min_length=1, description="Search by company name"),
    status: Optional[CustomerStatus] = Query(None, description="Filter by status"),
    industry: Optional[str] = Query(None, description="Filter by industry"),
    account_manager: Optional[str] = Query(None, description="Filter by account manager"),
    account_manager_id: Optional[str] = Query(None, description="Filter by account manager ID"),
    min_health_score: Optional[int] = Query(None, ge=0, le=100, description="Minimum health score"),
    max_health_score: Optional[int] = Query(None, ge=0, le=100, description="Maximum health score"),
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all customers with pagination, filtering, and sorting.
    Includes latest health score for each customer.
    """
    customer_service = CustomerService(db)
    customers, total = customer_service.get_all(
        skip=skip,
        limit=limit,
        search=search,
        status=status,
        industry=industry,
        account_manager=account_manager or account_manager_id,
        min_health_score=min_health_score,
        max_health_score=max_health_score,
        sort_by=sort_by,
        sort_order=sort_order
    )

    return CustomerListResponse(
        customers=customers,
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer_data: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Create a new customer.
    - Company name must be unique
    - Contract end date must be after start date
    """
    customer_service = CustomerService(db)
    customer = customer_service.create(customer_data)
    return customer


@router.get("/industries", response_model=List[str])
async def get_industries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of unique industries.
    """
    customer_service = CustomerService(db)
    return customer_service.get_industries()


@router.get("/account-managers")
async def get_account_managers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of users who can be account managers.
    Returns users with roles: admin, manager, account_manager, csm
    """
    customer_service = CustomerService(db)
    return customer_service.get_account_managers()


@router.get("/account-manager-names", response_model=List[str])
async def get_account_manager_names(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of unique account manager names (legacy).
    """
    customer_service = CustomerService(db)
    return customer_service.get_account_manager_names()


@router.get("/at-risk", response_model=List[CustomerResponse])
async def get_at_risk_customers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get customers that are at risk.

    Returns customers where:
    - Status is at_risk, OR
    - Latest health score has risk_level of 'high' or 'critical'
    """
    # Get customer IDs with high/critical risk levels
    high_risk_customer_ids = db.query(HealthScore.customer_id).filter(
        HealthScore.risk_level.in_(['high', 'critical'])
    ).distinct().subquery()

    customers = db.query(Customer).filter(
        or_(
            Customer.status == CustomerStatus.at_risk,
            Customer.id.in_(high_risk_customer_ids)
        )
    ).all()

    return customers


@router.get("/expiring-soon", response_model=List[CustomerResponse])
async def get_expiring_contracts(
    days: int = Query(90, ge=1, le=365, description="Number of days to look ahead"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get customers with contracts expiring within specified days.

    Default: 90 days. Returns customers ordered by contract end date (soonest first).
    """
    today = datetime.utcnow().date()
    expiry_date = today + timedelta(days=days)

    customers = db.query(Customer).filter(
        Customer.contract_end_date <= expiry_date,
        Customer.contract_end_date >= today,
        Customer.status != CustomerStatus.churned
    ).order_by(Customer.contract_end_date.asc()).all()

    return customers


@router.get("/search", response_model=List[CustomerResponse])
async def search_customers(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Quick search customers by company name.
    """
    customers = db.query(Customer).filter(
        Customer.company_name.ilike(f"%{q}%")
    ).limit(limit).all()

    return customers


@router.get("/{customer_id}", response_model=CustomerDetailResponse)
async def get_customer(
    customer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get customer details including:
    - All product deployments
    - Latest health scores per product
    - Recent interactions (last 5)
    - Active alerts
    - CSAT summary
    """
    customer_service = CustomerService(db)
    details = customer_service.get_customer_details(customer_id)
    return details


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: UUID,
    customer_data: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Update a customer.
    """
    customer_service = CustomerService(db)
    customer = customer_service.update(customer_id, customer_data)
    return customer


@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Permanently delete a customer and all associated data.
    """
    customer_service = CustomerService(db)
    result = customer_service.delete(customer_id)
    return result


@router.get("/{customer_id}/timeline", response_model=TimelineResponse)
async def get_customer_timeline(
    customer_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get customer activity timeline combining:
    - Interactions
    - CSAT submissions
    - Health score changes
    - Alerts
    Sorted by date descending with pagination.
    """
    customer_service = CustomerService(db)
    items, total = customer_service.get_customer_timeline(
        customer_id=customer_id,
        skip=skip,
        limit=limit
    )

    return TimelineResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{customer_id}/health-history", response_model=HealthHistoryResponse)
async def get_health_history(
    customer_id: UUID,
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get health score history with optional date range filter.
    """
    customer_service = CustomerService(db)
    health_scores, total = customer_service.get_health_history(
        customer_id=customer_id,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit
    )

    return HealthHistoryResponse(
        health_scores=health_scores,
        total=total,
        skip=skip,
        limit=limit
    )
