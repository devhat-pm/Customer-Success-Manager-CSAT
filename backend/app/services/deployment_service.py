from datetime import datetime, date, timedelta
from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, asc
import logging

from app.models.product_deployment import ProductDeployment, ProductName, Environment
from app.models.customer import Customer
from app.models.health_score import HealthScore
from app.schemas.product_deployment import ProductDeploymentCreate, ProductDeploymentUpdate
from app.core.exceptions import NotFoundError, ValidationError

logger = logging.getLogger(__name__)


class DeploymentService:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, deployment_id: UUID) -> ProductDeployment:
        deployment = self.db.query(ProductDeployment).filter(
            ProductDeployment.id == deployment_id
        ).first()
        if not deployment:
            raise NotFoundError(detail="Deployment not found")
        return deployment

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        product_name: Optional[ProductName] = None,
        environment: Optional[Environment] = None,
        is_active: Optional[bool] = None,
        customer_id: Optional[UUID] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Tuple[List[Dict[str, Any]], int]:
        query = self.db.query(ProductDeployment).options(
            joinedload(ProductDeployment.customer)
        )

        if product_name:
            query = query.filter(ProductDeployment.product_name == product_name)

        if environment:
            query = query.filter(ProductDeployment.environment == environment)

        if is_active is not None:
            query = query.filter(ProductDeployment.is_active == is_active)

        if customer_id:
            query = query.filter(ProductDeployment.customer_id == customer_id)

        total = query.count()

        # Apply sorting
        sort_column = getattr(ProductDeployment, sort_by, ProductDeployment.created_at)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        deployments = query.offset(skip).limit(limit).all()

        result = []
        for deployment in deployments:
            result.append({
                "id": deployment.id,
                "customer_id": deployment.customer_id,
                "customer_name": deployment.customer.company_name if deployment.customer else None,
                "product_name": deployment.product_name,
                "deployment_date": deployment.deployment_date,
                "version": deployment.version,
                "environment": deployment.environment,
                "license_type": deployment.license_type,
                "license_expiry": deployment.license_expiry,
                "is_active": deployment.is_active,
                "created_at": deployment.created_at,
                "updated_at": deployment.updated_at
            })

        return result, total

    def create(self, deployment_data: ProductDeploymentCreate) -> ProductDeployment:
        # Verify customer exists
        customer = self.db.query(Customer).filter(
            Customer.id == deployment_data.customer_id
        ).first()
        if not customer:
            raise NotFoundError(detail="Customer not found")

        # Validate license expiry date
        if deployment_data.license_expiry < deployment_data.deployment_date:
            raise ValidationError(detail="License expiry date must be after deployment date")

        deployment = ProductDeployment(
            customer_id=deployment_data.customer_id,
            product_name=deployment_data.product_name,
            deployment_date=deployment_data.deployment_date,
            version=deployment_data.version,
            environment=deployment_data.environment,
            license_type=deployment_data.license_type,
            license_expiry=deployment_data.license_expiry,
            is_active=deployment_data.is_active
        )

        self.db.add(deployment)
        self.db.commit()
        self.db.refresh(deployment)

        logger.info(f"Deployment created: {deployment.product_name} for customer {customer.company_name}")
        return deployment

    def update(self, deployment_id: UUID, deployment_data: ProductDeploymentUpdate) -> ProductDeployment:
        deployment = self.get_by_id(deployment_id)

        if deployment_data.product_name is not None:
            deployment.product_name = deployment_data.product_name

        if deployment_data.deployment_date is not None:
            deployment.deployment_date = deployment_data.deployment_date

        if deployment_data.version is not None:
            deployment.version = deployment_data.version

        if deployment_data.environment is not None:
            deployment.environment = deployment_data.environment

        if deployment_data.license_type is not None:
            deployment.license_type = deployment_data.license_type

        if deployment_data.license_expiry is not None:
            deployment.license_expiry = deployment_data.license_expiry

        if deployment_data.is_active is not None:
            deployment.is_active = deployment_data.is_active

        # Validate license expiry date
        if deployment.license_expiry < deployment.deployment_date:
            raise ValidationError(detail="License expiry date must be after deployment date")

        deployment.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(deployment)

        logger.info(f"Deployment updated: {deployment.id}")
        return deployment

    def delete(self, deployment_id: UUID) -> ProductDeployment:
        deployment = self.get_by_id(deployment_id)
        deployment.is_active = False
        deployment.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(deployment)

        logger.info(f"Deployment deactivated: {deployment.id}")
        return deployment

    def get_deployment_details(self, deployment_id: UUID) -> Dict[str, Any]:
        deployment = self.db.query(ProductDeployment).options(
            joinedload(ProductDeployment.customer)
        ).filter(ProductDeployment.id == deployment_id).first()

        if not deployment:
            raise NotFoundError(detail="Deployment not found")

        # Get health scores for this deployment
        health_scores = self.db.query(HealthScore).filter(
            HealthScore.product_deployment_id == deployment_id
        ).order_by(desc(HealthScore.calculated_at)).limit(10).all()

        latest_health = health_scores[0] if health_scores else None

        return {
            "deployment": deployment,
            "customer": deployment.customer,
            "latest_health_score": {
                "overall_score": latest_health.overall_score,
                "engagement_score": latest_health.engagement_score,
                "adoption_score": latest_health.adoption_score,
                "support_score": latest_health.support_score,
                "financial_score": latest_health.financial_score,
                "score_trend": latest_health.score_trend,
                "calculated_at": latest_health.calculated_at,
                "factors": latest_health.factors
            } if latest_health else None,
            "health_score_history": health_scores
        }

    def get_by_product(
        self,
        product_name: ProductName,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        query = self.db.query(ProductDeployment).options(
            joinedload(ProductDeployment.customer)
        ).filter(ProductDeployment.product_name == product_name)

        if is_active is not None:
            query = query.filter(ProductDeployment.is_active == is_active)

        total = query.count()
        deployments = query.order_by(desc(ProductDeployment.deployment_date)).offset(skip).limit(limit).all()

        result = []
        for deployment in deployments:
            # Get latest health score
            latest_health = self.db.query(HealthScore).filter(
                HealthScore.product_deployment_id == deployment.id
            ).order_by(desc(HealthScore.calculated_at)).first()

            result.append({
                "id": deployment.id,
                "customer_id": deployment.customer_id,
                "customer_name": deployment.customer.company_name if deployment.customer else None,
                "customer_status": deployment.customer.status if deployment.customer else None,
                "product_name": deployment.product_name,
                "deployment_date": deployment.deployment_date,
                "version": deployment.version,
                "environment": deployment.environment,
                "license_type": deployment.license_type,
                "license_expiry": deployment.license_expiry,
                "is_active": deployment.is_active,
                "latest_health_score": latest_health.overall_score if latest_health else None,
                "health_trend": latest_health.score_trend if latest_health else None
            })

        return result, total

    def get_expiring_licenses(
        self,
        days: int = 30,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Dict[str, Any]], int]:
        expiry_date = date.today() + timedelta(days=days)

        query = self.db.query(ProductDeployment).options(
            joinedload(ProductDeployment.customer)
        ).filter(
            ProductDeployment.is_active == True,
            ProductDeployment.license_expiry <= expiry_date,
            ProductDeployment.license_expiry >= date.today()
        )

        total = query.count()
        deployments = query.order_by(asc(ProductDeployment.license_expiry)).offset(skip).limit(limit).all()

        result = []
        for deployment in deployments:
            days_until_expiry = (deployment.license_expiry - date.today()).days

            result.append({
                "id": deployment.id,
                "customer_id": deployment.customer_id,
                "customer_name": deployment.customer.company_name if deployment.customer else None,
                "customer_contact_email": deployment.customer.contact_email if deployment.customer else None,
                "account_manager": deployment.customer.account_manager if deployment.customer else None,
                "product_name": deployment.product_name,
                "version": deployment.version,
                "environment": deployment.environment,
                "license_type": deployment.license_type,
                "license_expiry": deployment.license_expiry,
                "days_until_expiry": days_until_expiry,
                "urgency": "critical" if days_until_expiry <= 7 else "high" if days_until_expiry <= 30 else "medium"
            })

        return result, total

    def get_deployment_stats(self) -> Dict[str, Any]:
        """Get deployment statistics."""
        total_active = self.db.query(ProductDeployment).filter(
            ProductDeployment.is_active == True
        ).count()

        total_inactive = self.db.query(ProductDeployment).filter(
            ProductDeployment.is_active == False
        ).count()

        # By product
        by_product = {}
        for product in ProductName:
            count = self.db.query(ProductDeployment).filter(
                ProductDeployment.product_name == product,
                ProductDeployment.is_active == True
            ).count()
            by_product[product.value] = count

        # By environment
        by_environment = {}
        for env in Environment:
            count = self.db.query(ProductDeployment).filter(
                ProductDeployment.environment == env,
                ProductDeployment.is_active == True
            ).count()
            by_environment[env.value] = count

        # Expiring in next 30 days
        expiring_30 = self.db.query(ProductDeployment).filter(
            ProductDeployment.is_active == True,
            ProductDeployment.license_expiry <= date.today() + timedelta(days=30),
            ProductDeployment.license_expiry >= date.today()
        ).count()

        return {
            "total_active": total_active,
            "total_inactive": total_inactive,
            "by_product": by_product,
            "by_environment": by_environment,
            "expiring_in_30_days": expiring_30
        }
