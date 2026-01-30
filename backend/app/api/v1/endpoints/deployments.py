from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_manager_or_admin
from app.models.user import User
from app.models.product_deployment import ProductName, Environment
from app.schemas.product_deployment import (
    ProductDeploymentCreate,
    ProductDeploymentUpdate,
    ProductDeploymentResponse,
    DeploymentListResponse,
    DeploymentDetailResponse,
    DeploymentByProductResponse,
    ExpiringDeploymentsResponse,
    DeploymentStats
)
from app.services.deployment_service import DeploymentService

router = APIRouter(prefix="/deployments", tags=["Product Deployments"])


@router.get("/", response_model=DeploymentListResponse)
async def list_deployments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    product_name: Optional[ProductName] = Query(None, description="Filter by product"),
    environment: Optional[Environment] = Query(None, description="Filter by environment"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    customer_id: Optional[UUID] = Query(None, description="Filter by customer"),
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all product deployments with filtering and pagination.
    Includes customer information.
    """
    deployment_service = DeploymentService(db)
    deployments, total = deployment_service.get_all(
        skip=skip,
        limit=limit,
        product_name=product_name,
        environment=environment,
        is_active=is_active,
        customer_id=customer_id,
        sort_by=sort_by,
        sort_order=sort_order
    )

    return DeploymentListResponse(
        deployments=deployments,
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/", response_model=ProductDeploymentResponse, status_code=status.HTTP_201_CREATED)
async def create_deployment(
    deployment_data: ProductDeploymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Create a new product deployment for a customer.
    """
    deployment_service = DeploymentService(db)
    deployment = deployment_service.create(deployment_data)
    return deployment


@router.get("/stats", response_model=DeploymentStats)
async def get_deployment_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get deployment statistics.
    """
    deployment_service = DeploymentService(db)
    return deployment_service.get_deployment_stats()


@router.get("/expiring", response_model=ExpiringDeploymentsResponse)
async def get_expiring_deployments(
    days: int = Query(30, ge=1, le=365, description="Number of days until expiry"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get deployments with licenses expiring within the specified number of days.
    Default is 30 days. Use days=60 or days=90 for longer range.
    """
    deployment_service = DeploymentService(db)
    deployments, total = deployment_service.get_expiring_licenses(
        days=days,
        skip=skip,
        limit=limit
    )

    return ExpiringDeploymentsResponse(
        deployments=deployments,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/by-product/{product_name}", response_model=DeploymentByProductResponse)
async def get_deployments_by_product(
    product_name: ProductName,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all deployments for a specific product.
    Includes customer status and latest health score.
    """
    deployment_service = DeploymentService(db)
    deployments, total = deployment_service.get_by_product(
        product_name=product_name,
        skip=skip,
        limit=limit,
        is_active=is_active
    )

    return DeploymentByProductResponse(
        deployments=deployments,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{deployment_id}", response_model=DeploymentDetailResponse)
async def get_deployment(
    deployment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get deployment details with health scores.
    """
    deployment_service = DeploymentService(db)
    details = deployment_service.get_deployment_details(deployment_id)
    return details


@router.put("/{deployment_id}", response_model=ProductDeploymentResponse)
async def update_deployment(
    deployment_id: UUID,
    deployment_data: ProductDeploymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Update a product deployment.
    """
    deployment_service = DeploymentService(db)
    deployment = deployment_service.update(deployment_id, deployment_data)
    return deployment


@router.delete("/{deployment_id}", response_model=ProductDeploymentResponse)
async def delete_deployment(
    deployment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Deactivate a deployment (soft delete).
    """
    deployment_service = DeploymentService(db)
    deployment = deployment_service.delete(deployment_id)
    return deployment
