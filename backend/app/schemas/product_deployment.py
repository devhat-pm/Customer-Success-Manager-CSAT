from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID
from app.models.product_deployment import ProductName, Environment
from app.models.customer import CustomerStatus
from app.models.health_score import ScoreTrend


class ProductDeploymentBase(BaseModel):
    customer_id: UUID
    product_name: ProductName
    deployment_date: date
    version: str = Field(..., min_length=1, max_length=50)
    environment: Environment
    license_type: str = Field(..., min_length=1, max_length=100)
    license_expiry: date
    is_active: bool = True


class ProductDeploymentCreate(ProductDeploymentBase):
    pass


class ProductDeploymentUpdate(BaseModel):
    product_name: Optional[ProductName] = None
    deployment_date: Optional[date] = None
    version: Optional[str] = Field(None, min_length=1, max_length=50)
    environment: Optional[Environment] = None
    license_type: Optional[str] = Field(None, min_length=1, max_length=100)
    license_expiry: Optional[date] = None
    is_active: Optional[bool] = None


class ProductDeploymentResponse(ProductDeploymentBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DeploymentWithCustomer(BaseModel):
    id: UUID
    customer_id: UUID
    customer_name: Optional[str] = None
    product_name: ProductName
    deployment_date: date
    version: str
    environment: Environment
    license_type: str
    license_expiry: date
    is_active: bool
    created_at: datetime
    updated_at: datetime


class DeploymentListResponse(BaseModel):
    deployments: List[DeploymentWithCustomer]
    total: int
    skip: int
    limit: int


class HealthScoreDetail(BaseModel):
    overall_score: int
    engagement_score: int
    adoption_score: int
    support_score: int
    financial_score: int
    score_trend: ScoreTrend
    calculated_at: datetime
    factors: Optional[Dict[str, Any]] = None


class DeploymentDetailResponse(BaseModel):
    deployment: ProductDeploymentResponse
    customer: Optional[Dict[str, Any]] = None
    latest_health_score: Optional[HealthScoreDetail] = None
    health_score_history: List[HealthScoreDetail]


class DeploymentByProduct(BaseModel):
    id: UUID
    customer_id: UUID
    customer_name: Optional[str] = None
    customer_status: Optional[CustomerStatus] = None
    product_name: ProductName
    deployment_date: date
    version: str
    environment: Environment
    license_type: str
    license_expiry: date
    is_active: bool
    latest_health_score: Optional[int] = None
    health_trend: Optional[ScoreTrend] = None


class DeploymentByProductResponse(BaseModel):
    deployments: List[DeploymentByProduct]
    total: int
    skip: int
    limit: int


class ExpiringDeployment(BaseModel):
    id: UUID
    customer_id: UUID
    customer_name: Optional[str] = None
    customer_contact_email: Optional[str] = None
    account_manager: Optional[str] = None
    product_name: ProductName
    version: str
    environment: Environment
    license_type: str
    license_expiry: date
    days_until_expiry: int
    urgency: str


class ExpiringDeploymentsResponse(BaseModel):
    deployments: List[ExpiringDeployment]
    total: int
    skip: int
    limit: int


class DeploymentStats(BaseModel):
    total_active: int
    total_inactive: int
    by_product: Dict[str, int]
    by_environment: Dict[str, int]
    expiring_in_30_days: int
