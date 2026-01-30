from fastapi import APIRouter, Depends, Query, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from uuid import UUID

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_manager_or_admin
from app.models.user import User
from app.schemas.health_score import (
    HealthScoreResponse,
    HealthScoreWithBreakdown,
    HealthScoreHistoryResponse,
    BatchCalculationResult,
    HealthTrendsResponse,
    AtRiskCustomersResponse,
    ScoreDistributionResponse,
    CalculateScoreRequest
)
from app.services.health_scoring_service import HealthScoringService

router = APIRouter(prefix="/health-scores", tags=["Health Scores"])


@router.post("/calculate/{customer_id}", response_model=HealthScoreResponse)
async def calculate_health_score(
    customer_id: UUID,
    request: Optional[CalculateScoreRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Calculate and store a new health score for a customer.
    Optionally specify a product deployment ID for product-specific scoring.
    """
    health_service = HealthScoringService(db)
    product_deployment_id = request.product_deployment_id if request else None
    health_score = health_service.calculate_customer_health_score(
        customer_id=customer_id,
        product_deployment_id=product_deployment_id
    )
    return health_score


@router.post("/calculate-all", response_model=BatchCalculationResult)
async def calculate_all_health_scores(
    background_tasks: BackgroundTasks,
    run_async: bool = Query(False, description="Run calculation in background"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Batch calculate health scores for all active customers.
    Set run_async=true to run in background.
    """
    health_service = HealthScoringService(db)

    if run_async:
        background_tasks.add_task(health_service.calculate_all_health_scores)
        return BatchCalculationResult(
            total_customers=0,
            calculated=0,
            failed=0,
            errors=[{"message": "Calculation started in background"}]
        )

    result = health_service.calculate_all_health_scores()
    return BatchCalculationResult(**result)


@router.get("/customer/{customer_id}", response_model=HealthScoreWithBreakdown)
async def get_customer_health_score(
    customer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the latest health score for a customer with full breakdown.
    """
    health_service = HealthScoringService(db)
    health_score = health_service.get_latest_health_score(customer_id)

    if not health_score:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No health score found for this customer"
        )

    return health_score


@router.get("/customer/{customer_id}/history", response_model=HealthScoreHistoryResponse)
async def get_customer_health_history(
    customer_id: UUID,
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get historical health scores for a customer with optional date range filter.
    """
    health_service = HealthScoringService(db)
    health_scores, total = health_service.get_health_score_history(
        customer_id=customer_id,
        start_date=start_date,
        end_date=end_date,
        skip=skip,
        limit=limit
    )

    return HealthScoreHistoryResponse(
        health_scores=health_scores,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/trends", response_model=HealthTrendsResponse)
async def get_health_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get overall health trends across all customers.
    Includes average score, trend distribution, and score brackets.
    """
    health_service = HealthScoringService(db)
    trends = health_service.get_overall_trends()
    return HealthTrendsResponse(**trends)


@router.get("/at-risk", response_model=AtRiskCustomersResponse)
async def get_at_risk_customers(
    threshold: int = Query(60, ge=0, le=100, description="Score threshold for at-risk"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get customers with health score below the specified threshold.
    Default threshold is 60.
    """
    health_service = HealthScoringService(db)
    customers, total = health_service.get_at_risk_customers(
        threshold=threshold,
        skip=skip,
        limit=limit
    )

    return AtRiskCustomersResponse(
        customers=customers,
        total=total,
        skip=skip,
        limit=limit,
        threshold=threshold
    )


@router.get("/distribution", response_model=ScoreDistributionResponse)
async def get_score_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get score distribution for dashboard charts.
    Includes overall distribution, sub-score averages, and histogram data.
    """
    health_service = HealthScoringService(db)
    distribution = health_service.get_score_distribution()
    return ScoreDistributionResponse(**distribution)
