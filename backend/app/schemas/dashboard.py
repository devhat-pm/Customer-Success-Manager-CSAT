from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal


# Overview Statistics
class DeploymentsByProduct(BaseModel):
    MonetX: int = 0
    SupportX: int = 0
    GreenX: int = 0


class OverviewStats(BaseModel):
    total_customers: int
    active_customers: int
    at_risk_customers: int
    churned_customers: int
    total_deployments: int
    deployments_by_product: DeploymentsByProduct
    total_contract_value: float
    avg_health_score: Optional[float] = None
    avg_csat_score: Optional[float] = None
    nps_score: Optional[int] = None
    open_alerts: int
    critical_alerts: int


# Health Distribution
class HealthBucket(BaseModel):
    min: int
    max: int
    count: int
    percentage: float


class HealthDistribution(BaseModel):
    excellent: HealthBucket
    good: HealthBucket
    at_risk: HealthBucket
    critical: HealthBucket
    total_scored: int


# Health Trends
class HealthTrendPoint(BaseModel):
    period: str
    avg_score: float
    customer_count: int


class ProductHealthTrend(BaseModel):
    product: str
    trends: List[HealthTrendPoint]


class HealthTrendsResponse(BaseModel):
    overall: List[HealthTrendPoint]
    by_product: List[ProductHealthTrend]
    period_type: str  # daily, weekly, monthly


# CSAT Trends
class CSATTrendPoint(BaseModel):
    period: str
    avg_score: float
    response_count: int


class ProductCSATTrend(BaseModel):
    product: str
    trends: List[CSATTrendPoint]


class SurveyTypeCSATTrend(BaseModel):
    survey_type: str
    trends: List[CSATTrendPoint]


class CSATTrendsResponse(BaseModel):
    overall: List[CSATTrendPoint]
    by_product: List[ProductCSATTrend]
    by_survey_type: List[SurveyTypeCSATTrend]


# Customer Segments
class SegmentItem(BaseModel):
    name: str
    count: int
    percentage: float
    total_value: Optional[float] = None


class CustomerSegments(BaseModel):
    by_industry: List[SegmentItem]
    by_contract_value_range: List[SegmentItem]
    by_health_status: List[SegmentItem]
    by_product_mix: List[SegmentItem]


# Upcoming Renewals
class RenewalItem(BaseModel):
    customer_id: UUID
    company_name: str
    contract_value: Optional[float] = None
    health_score: Optional[int] = None
    health_status: Optional[str] = None
    contract_end_date: date
    days_until_renewal: int
    account_manager: Optional[str] = None


class UpcomingRenewalsResponse(BaseModel):
    renewals_30_days: List[RenewalItem]
    renewals_60_days: List[RenewalItem]
    renewals_90_days: List[RenewalItem]
    total_value_30_days: float
    total_value_60_days: float
    total_value_90_days: float


# Recent Activity
class ActivityItem(BaseModel):
    activity_type: str  # new_customer, new_deployment, interaction, csat, alert
    title: str
    description: Optional[str] = None
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None


class RecentActivityResponse(BaseModel):
    activities: List[ActivityItem]
    total: int


# Product Performance
class ProductPerformance(BaseModel):
    product: str
    deployment_count: int
    active_deployments: int
    inactive_deployments: int
    active_ratio: float
    avg_health_score: Optional[float] = None
    avg_csat_score: Optional[float] = None
    customer_count: int


class ProductPerformanceResponse(BaseModel):
    products: List[ProductPerformance]


# Account Manager Performance
class AccountManagerPerformance(BaseModel):
    account_manager: str
    customer_count: int
    avg_health_score: Optional[float] = None
    at_risk_customers: int
    total_contract_value: float
    churned_customers: int
    active_alerts: int


class AccountManagerPerformanceResponse(BaseModel):
    managers: List[AccountManagerPerformance]


# Date Range Filter
class DateRangeFilter(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
