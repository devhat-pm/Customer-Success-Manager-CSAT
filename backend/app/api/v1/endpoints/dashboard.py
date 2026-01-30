from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import Optional, List
from datetime import date, datetime, timedelta

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.customer import Customer, CustomerStatus
from app.models.health_score import HealthScore
from app.models.csat_survey import CSATSurvey
from app.schemas.dashboard import (
    OverviewStats,
    HealthDistribution,
    HealthTrendsResponse,
    CSATTrendsResponse,
    CustomerSegments,
    UpcomingRenewalsResponse,
    RecentActivityResponse,
    ProductPerformanceResponse,
    AccountManagerPerformanceResponse
)
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=OverviewStats)
async def get_overview_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get overview statistics for the dashboard.

    Returns comprehensive metrics including:
    - Customer counts (total, active, at-risk, churned)
    - Deployment counts by product
    - Total contract value
    - Average health score
    - Average CSAT score
    - NPS score
    - Open and critical alerts
    """
    dashboard_service = DashboardService(db)
    return dashboard_service.get_overview_stats()


@router.get("/health-distribution", response_model=HealthDistribution)
async def get_health_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get health score distribution across customers.

    Returns distribution in buckets:
    - Excellent (80-100)
    - Good (60-79)
    - At Risk (40-59)
    - Critical (0-39)

    Each bucket includes count and percentage.
    """
    dashboard_service = DashboardService(db)
    return dashboard_service.get_health_distribution()


@router.get("/health-trends", response_model=HealthTrendsResponse)
async def get_health_trends(
    period_type: str = Query("monthly", regex="^(daily|weekly|monthly)$", description="Aggregation period"),
    start_date: Optional[date] = Query(None, description="Start date for trend data"),
    end_date: Optional[date] = Query(None, description="End date for trend data"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get health score trends over time.

    Supports different aggregation periods:
    - daily: Last 30 days by default
    - weekly: Last 12 weeks by default
    - monthly: Last 12 months by default

    Returns overall trends and breakdown by product.
    """
    dashboard_service = DashboardService(db)
    return dashboard_service.get_health_trends(
        period_type=period_type,
        start_date=start_date,
        end_date=end_date
    )


@router.get("/csat-trends", response_model=CSATTrendsResponse)
async def get_csat_trends(
    start_date: Optional[date] = Query(None, description="Start date for trend data"),
    end_date: Optional[date] = Query(None, description="End date for trend data"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get CSAT trends over time.

    Returns monthly trends including:
    - Overall CSAT trends
    - Trends by product
    - Trends by survey type (CSAT, NPS, support satisfaction)
    """
    dashboard_service = DashboardService(db)
    return dashboard_service.get_csat_trends(
        start_date=start_date,
        end_date=end_date
    )


@router.get("/customer-segments", response_model=CustomerSegments)
async def get_customer_segments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get customer segmentation data.

    Segments customers by:
    - Industry
    - Contract value range (Enterprise, Mid-Market, SMB, Starter)
    - Health status
    - Product mix (combinations of products deployed)
    """
    dashboard_service = DashboardService(db)
    return dashboard_service.get_customer_segments()


@router.get("/upcoming-renewals", response_model=UpcomingRenewalsResponse)
async def get_upcoming_renewals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get upcoming contract renewals.

    Returns renewals grouped by:
    - Next 30 days
    - Next 60 days
    - Next 90 days

    Each renewal includes customer info, contract value, health score,
    days until renewal, and account manager.
    """
    dashboard_service = DashboardService(db)
    return dashboard_service.get_upcoming_renewals()


@router.get("/recent-activity", response_model=RecentActivityResponse)
async def get_recent_activity(
    limit: int = Query(50, ge=1, le=200, description="Maximum number of activities to return"),
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get recent activity feed.

    Combines and sorts by date:
    - New customers
    - New deployments
    - Customer interactions
    - CSAT submissions
    - Alert triggers

    Default: Last 30 days of activity.
    """
    dashboard_service = DashboardService(db)
    return dashboard_service.get_recent_activity(
        limit=limit,
        start_date=start_date,
        end_date=end_date
    )


@router.get("/product-performance", response_model=ProductPerformanceResponse)
async def get_product_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get per-product performance metrics.

    For each product (MonetX, SupportX, GreenX):
    - Deployment count (active vs inactive)
    - Active ratio
    - Average health score
    - Average CSAT score
    - Customer count
    """
    dashboard_service = DashboardService(db)
    return dashboard_service.get_product_performance()


@router.get("/account-manager-performance", response_model=AccountManagerPerformanceResponse)
async def get_account_manager_performance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get performance metrics by account manager.

    For each account manager:
    - Customer count
    - Average health score
    - At-risk customers
    - Total contract value
    - Churned customers
    - Active alerts
    """
    dashboard_service = DashboardService(db)
    return dashboard_service.get_account_manager_performance()


@router.get("/overview")
async def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get complete dashboard overview stats.

    Returns comprehensive metrics including customer counts by status,
    average health score, average CSAT, total contract value, and
    contracts expiring soon.
    """
    total_customers = db.query(Customer).count()
    active_customers = db.query(Customer).filter(Customer.status == CustomerStatus.active).count()
    at_risk_customers = db.query(Customer).filter(Customer.status == CustomerStatus.at_risk).count()
    churned_customers = db.query(Customer).filter(Customer.status == CustomerStatus.churned).count()
    onboarding_customers = db.query(Customer).filter(Customer.status == CustomerStatus.onboarding).count()

    # Average health score (latest per customer)
    latest_scores = db.query(
        HealthScore.customer_id,
        func.max(HealthScore.calculated_at).label('latest')
    ).group_by(HealthScore.customer_id).subquery()

    avg_health = db.query(func.avg(HealthScore.overall_score)).join(
        latest_scores,
        and_(
            HealthScore.customer_id == latest_scores.c.customer_id,
            HealthScore.calculated_at == latest_scores.c.latest
        )
    ).scalar() or 0

    # Average CSAT (last 90 days)
    ninety_days_ago = datetime.utcnow() - timedelta(days=90)
    avg_csat = db.query(func.avg(CSATSurvey.score)).filter(
        CSATSurvey.submitted_at >= ninety_days_ago
    ).scalar() or 0

    # Total contract value (active customers)
    total_value = db.query(func.sum(Customer.contract_value)).filter(
        Customer.status == CustomerStatus.active
    ).scalar() or 0

    # Expiring contracts
    today = datetime.utcnow().date()
    thirty_days = today + timedelta(days=30)
    ninety_days = today + timedelta(days=90)

    expiring_30 = db.query(Customer).filter(
        Customer.contract_end_date <= thirty_days,
        Customer.contract_end_date >= today,
        Customer.status != CustomerStatus.churned
    ).count()

    expiring_90 = db.query(Customer).filter(
        Customer.contract_end_date <= ninety_days,
        Customer.contract_end_date >= today,
        Customer.status != CustomerStatus.churned
    ).count()

    return {
        "total_customers": total_customers,
        "active_customers": active_customers,
        "at_risk_customers": at_risk_customers,
        "churned_customers": churned_customers,
        "onboarding_customers": onboarding_customers,
        "average_health_score": round(float(avg_health), 1),
        "average_csat": round(float(avg_csat), 2),
        "total_contract_value": float(total_value),
        "contracts_expiring_30_days": expiring_30,
        "contracts_expiring_90_days": expiring_90
    }


@router.get("/top-performers")
async def get_top_performers(
    limit: int = Query(5, ge=1, le=20, description="Number of top performers to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get top customers by health score.

    Returns customers with highest health scores along with their
    latest health score details.
    """
    # Subquery for latest health score per customer
    latest_scores = db.query(
        HealthScore.customer_id,
        func.max(HealthScore.calculated_at).label('latest')
    ).group_by(HealthScore.customer_id).subquery()

    results = db.query(Customer, HealthScore).join(
        HealthScore, Customer.id == HealthScore.customer_id
    ).join(
        latest_scores,
        and_(
            HealthScore.customer_id == latest_scores.c.customer_id,
            HealthScore.calculated_at == latest_scores.c.latest
        )
    ).filter(
        Customer.status != CustomerStatus.churned
    ).order_by(HealthScore.overall_score.desc()).limit(limit).all()

    return [{
        "customer": {
            "id": str(c.id),
            "company_name": c.company_name,
            "industry": c.industry,
            "status": c.status.value,
            "contract_value": float(c.contract_value) if c.contract_value else 0,
            "account_manager": c.account_manager_name
        },
        "health_score": {
            "overall_score": hs.overall_score,
            "risk_level": hs.risk_level.value,
            "score_trend": hs.score_trend.value,
            "calculated_at": hs.calculated_at.isoformat()
        }
    } for c, hs in results]


@router.get("/needs-attention")
async def get_needs_attention(
    limit: int = Query(10, ge=1, le=50, description="Number of customers to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get customers needing attention.

    Returns customers with:
    - Lowest health scores, OR
    - At-risk status, OR
    - High/critical risk level

    Sorted by health score ascending (worst first).
    """
    # Subquery for latest health score per customer
    latest_scores = db.query(
        HealthScore.customer_id,
        func.max(HealthScore.calculated_at).label('latest')
    ).group_by(HealthScore.customer_id).subquery()

    results = db.query(Customer, HealthScore).join(
        HealthScore, Customer.id == HealthScore.customer_id
    ).join(
        latest_scores,
        and_(
            HealthScore.customer_id == latest_scores.c.customer_id,
            HealthScore.calculated_at == latest_scores.c.latest
        )
    ).filter(
        Customer.status != CustomerStatus.churned
    ).order_by(HealthScore.overall_score.asc()).limit(limit).all()

    return [{
        "customer": {
            "id": str(c.id),
            "company_name": c.company_name,
            "industry": c.industry,
            "status": c.status.value,
            "contract_value": float(c.contract_value) if c.contract_value else 0,
            "account_manager": c.account_manager_name,
            "contract_end_date": c.contract_end_date.isoformat() if c.contract_end_date else None
        },
        "health_score": {
            "overall_score": hs.overall_score,
            "risk_level": hs.risk_level.value,
            "score_trend": hs.score_trend.value,
            "calculated_at": hs.calculated_at.isoformat(),
            "product_adoption_score": hs.product_adoption_score,
            "support_health_score": hs.support_health_score,
            "engagement_score": hs.engagement_score,
            "financial_health_score": hs.financial_health_score,
            "sla_compliance_score": hs.sla_compliance_score
        },
        "attention_reasons": _get_attention_reasons(c, hs)
    } for c, hs in results]


def _get_attention_reasons(customer: Customer, health_score: HealthScore) -> List[str]:
    """Helper to determine why a customer needs attention."""
    reasons = []

    if health_score.overall_score < 40:
        reasons.append("Critical health score")
    elif health_score.overall_score < 60:
        reasons.append("Low health score")

    if customer.status == CustomerStatus.at_risk:
        reasons.append("At-risk status")

    if health_score.risk_level.value in ['high', 'critical']:
        reasons.append(f"{health_score.risk_level.value.capitalize()} risk level")

    if health_score.score_trend.value == 'declining':
        reasons.append("Declining score trend")

    # Check for low component scores
    if health_score.product_adoption_score < 50:
        reasons.append("Low product adoption")
    if health_score.support_health_score < 50:
        reasons.append("Poor support health")
    if health_score.engagement_score < 50:
        reasons.append("Low engagement")

    # Check contract expiry
    if customer.contract_end_date:
        days_until_expiry = (customer.contract_end_date - datetime.utcnow().date()).days
        if days_until_expiry <= 30:
            reasons.append(f"Contract expires in {days_until_expiry} days")
        elif days_until_expiry <= 60:
            reasons.append("Contract expiring soon")

    return reasons if reasons else ["Monitoring recommended"]
