from datetime import datetime, date
from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc, asc, func
import logging

from app.models.customer import Customer, CustomerStatus
from app.models.product_deployment import ProductDeployment
from app.models.health_score import HealthScore
from app.models.csat_survey import CSATSurvey
from app.models.customer_interaction import CustomerInteraction
from app.models.alert import Alert
from app.models.user import User, UserRole
from app.schemas.customer import CustomerCreate, CustomerUpdate
from app.core.exceptions import NotFoundError, DuplicateResourceError, ValidationError
from app.services.email_service import EmailNotificationService

logger = logging.getLogger(__name__)


class CustomerService:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, customer_id: UUID) -> Customer:
        customer = self.db.query(Customer).options(
            joinedload(Customer.account_manager_user)
        ).filter(Customer.id == customer_id).first()
        if not customer:
            raise NotFoundError(detail="Customer not found")
        return customer

    def get_by_company_name(self, company_name: str) -> Optional[Customer]:
        return self.db.query(Customer).filter(Customer.company_name == company_name).first()

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        status: Optional[CustomerStatus] = None,
        industry: Optional[str] = None,
        account_manager: Optional[str] = None,
        account_manager_id: Optional[UUID] = None,
        min_health_score: Optional[int] = None,
        max_health_score: Optional[int] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Tuple[List[Dict[str, Any]], int]:
        query = self.db.query(Customer).options(joinedload(Customer.account_manager_user))

        # Apply filters
        if search:
            search_filter = f"%{search}%"
            query = query.filter(Customer.company_name.ilike(search_filter))

        if status:
            query = query.filter(Customer.status == status)

        if industry:
            query = query.filter(Customer.industry == industry)

        # Support both account_manager (legacy) and account_manager_id (new)
        if account_manager_id:
            query = query.filter(Customer.account_manager_id == account_manager_id)
        elif account_manager:
            query = query.filter(Customer.account_manager == account_manager)

        # Exclude churned by default unless specifically filtered
        if status is None:
            query = query.filter(Customer.status != CustomerStatus.churned)

        # Apply health score filter using subquery
        if min_health_score is not None or max_health_score is not None:
            from sqlalchemy import func as sql_func
            latest_scores_subq = self.db.query(
                HealthScore.customer_id,
                sql_func.max(HealthScore.calculated_at).label('latest_date')
            ).group_by(HealthScore.customer_id).subquery()

            latest_health_scores = self.db.query(HealthScore).join(
                latest_scores_subq,
                (HealthScore.customer_id == latest_scores_subq.c.customer_id) &
                (HealthScore.calculated_at == latest_scores_subq.c.latest_date)
            ).subquery()

            query = query.outerjoin(
                latest_health_scores,
                Customer.id == latest_health_scores.c.customer_id
            )

            if min_health_score is not None:
                query = query.filter(
                    or_(
                        latest_health_scores.c.overall_score >= min_health_score,
                        latest_health_scores.c.overall_score.is_(None)
                    ) if min_health_score == 0 else
                    latest_health_scores.c.overall_score >= min_health_score
                )

            if max_health_score is not None:
                query = query.filter(
                    or_(
                        latest_health_scores.c.overall_score <= max_health_score,
                        latest_health_scores.c.overall_score.is_(None)
                    )
                )

        total = query.count()

        # Apply sorting
        sort_column = getattr(Customer, sort_by, Customer.created_at)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        customers = query.offset(skip).limit(limit).all()

        # Add latest health score and products to each customer
        result = []
        for customer in customers:
            # Get products for this customer from deployments
            products = self._get_customer_products(customer.id)

            customer_dict = {
                "id": customer.id,
                "company_name": customer.company_name,
                "industry": customer.industry,
                "contact_name": customer.contact_name,
                "contact_email": customer.contact_email,
                "contact_phone": customer.contact_phone,
                "deployed_products": customer.deployed_products or [],
                "contract_start_date": customer.contract_start_date,
                "contract_end_date": customer.contract_end_date,
                "contract_value": customer.contract_value,
                "account_manager": customer.account_manager,
                "account_manager_id": customer.account_manager_id,
                "account_manager_name": customer.account_manager_name,
                "status": customer.status,
                "logo_url": customer.logo_url,
                "notes": customer.notes,
                "created_at": customer.created_at,
                "updated_at": customer.updated_at,
                "products": products,  # Legacy field from product_deployments
                "latest_health_score": self._get_latest_health_score(customer.id)
            }
            result.append(customer_dict)

        return result, total

    def _get_customer_products(self, customer_id: UUID) -> List[str]:
        """Get list of active product names for a customer."""
        deployments = self.db.query(ProductDeployment).filter(
            ProductDeployment.customer_id == customer_id,
            ProductDeployment.is_active == True
        ).all()

        products = list(set([
            d.product_name.value if hasattr(d.product_name, 'value') else str(d.product_name)
            for d in deployments
        ]))
        return products

    def _get_latest_health_score(self, customer_id: UUID) -> Optional[Dict[str, Any]]:
        health_score = self.db.query(HealthScore).filter(
            HealthScore.customer_id == customer_id
        ).order_by(desc(HealthScore.calculated_at)).first()

        if health_score:
            return {
                "overall_score": health_score.overall_score,
                "product_adoption_score": getattr(health_score, 'product_adoption_score', 0) or 0,
                "support_health_score": getattr(health_score, 'support_health_score', 0) or 0,
                "engagement_score": health_score.engagement_score,
                "financial_health_score": getattr(health_score, 'financial_health_score', 0) or 0,
                "sla_compliance_score": getattr(health_score, 'sla_compliance_score', 100) or 100,
                "risk_level": getattr(health_score, 'risk_level', None),
                "score_trend": health_score.score_trend,
                "calculated_at": health_score.calculated_at
            }
        return None

    def create(self, customer_data: CustomerCreate) -> Customer:
        # Check unique company name
        existing = self.get_by_company_name(customer_data.company_name)
        if existing:
            raise DuplicateResourceError(detail="Company name already exists")

        # Validate contract dates if both provided
        if customer_data.contract_start_date and customer_data.contract_end_date:
            if customer_data.contract_end_date <= customer_data.contract_start_date:
                raise ValidationError(detail="Contract end date must be after start date")

        # Validate account_manager_id if provided
        if customer_data.account_manager_id:
            user = self.db.query(User).filter(User.id == customer_data.account_manager_id).first()
            if not user:
                raise ValidationError(detail="Account manager user not found")

        customer = Customer(
            company_name=customer_data.company_name,
            industry=customer_data.industry,
            contact_name=customer_data.contact_name,
            contact_email=customer_data.contact_email,
            contact_phone=customer_data.contact_phone,
            deployed_products=customer_data.deployed_products or [],
            contract_start_date=customer_data.contract_start_date,
            contract_end_date=customer_data.contract_end_date,
            contract_value=customer_data.contract_value,
            account_manager_id=customer_data.account_manager_id,
            account_manager=customer_data.account_manager,
            status=customer_data.status,
            logo_url=customer_data.logo_url,
            notes=customer_data.notes
        )

        self.db.add(customer)
        self.db.commit()
        self.db.refresh(customer)

        logger.info(f"Customer created: {customer.company_name}")

        # Send email notifications to staff
        try:
            self._send_customer_created_notifications(customer)
        except Exception as e:
            logger.error(f"Failed to send customer created notifications: {e}")

        return customer

    def _send_customer_created_notifications(self, customer: Customer):
        """Send email notifications when a new customer is created."""
        # Get all admin and manager users to notify
        staff_users = self.db.query(User).filter(
            User.role.in_([UserRole.admin, UserRole.manager]),
            User.is_active == True
        ).all()

        if not staff_users:
            return

        staff_emails = [u.email for u in staff_users]

        # Get account manager name
        account_manager_name = "Not Assigned"
        if customer.account_manager_id:
            am_user = self.db.query(User).filter(User.id == customer.account_manager_id).first()
            if am_user:
                account_manager_name = am_user.full_name

        # Format contract value
        contract_value = f"${customer.contract_value:,.2f}" if customer.contract_value else "Not specified"

        # Send notifications
        email_service = EmailNotificationService(self.db)
        email_service.send_customer_created_notification(
            staff_emails=staff_emails,
            company_name=customer.company_name,
            customer_id=customer.id,
            industry=customer.industry or "Not specified",
            contact_name=customer.contact_name or "Not specified",
            contact_email=customer.contact_email or "Not specified",
            contract_value=contract_value,
            account_manager=account_manager_name
        )

        logger.info(f"Sent customer created notifications to {len(staff_emails)} staff members")

        # Also send welcome email to the customer's primary contact if email exists
        if customer.contact_email:
            email_service.send_welcome_email(
                recipient_email=customer.contact_email,
                recipient_name=customer.contact_name or "Valued Customer",
                account_manager_name=account_manager_name
            )
            logger.info(f"Sent welcome email to customer contact: {customer.contact_email}")

    def update(self, customer_id: UUID, customer_data: CustomerUpdate) -> Customer:
        customer = self.get_by_id(customer_id)

        if customer_data.company_name is not None and customer_data.company_name != customer.company_name:
            existing = self.get_by_company_name(customer_data.company_name)
            if existing:
                raise DuplicateResourceError(detail="Company name already exists")
            customer.company_name = customer_data.company_name

        if customer_data.industry is not None:
            customer.industry = customer_data.industry

        if customer_data.contact_name is not None:
            customer.contact_name = customer_data.contact_name

        if customer_data.contact_email is not None:
            customer.contact_email = customer_data.contact_email

        if customer_data.contact_phone is not None:
            customer.contact_phone = customer_data.contact_phone

        if customer_data.deployed_products is not None:
            customer.deployed_products = customer_data.deployed_products

        if customer_data.contract_start_date is not None:
            customer.contract_start_date = customer_data.contract_start_date

        if customer_data.contract_end_date is not None:
            customer.contract_end_date = customer_data.contract_end_date

        if customer_data.contract_value is not None:
            customer.contract_value = customer_data.contract_value

        if customer_data.account_manager_id is not None:
            # Validate user exists
            user = self.db.query(User).filter(User.id == customer_data.account_manager_id).first()
            if not user:
                raise ValidationError(detail="Account manager user not found")
            customer.account_manager_id = customer_data.account_manager_id

        if customer_data.account_manager is not None:
            customer.account_manager = customer_data.account_manager

        if customer_data.status is not None:
            customer.status = customer_data.status

        if customer_data.logo_url is not None:
            customer.logo_url = customer_data.logo_url

        if customer_data.notes is not None:
            customer.notes = customer_data.notes

        # Validate contract dates if both exist
        if customer.contract_start_date and customer.contract_end_date:
            if customer.contract_end_date <= customer.contract_start_date:
                raise ValidationError(detail="Contract end date must be after start date")

        customer.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(customer)

        logger.info(f"Customer updated: {customer.company_name}")
        return customer

    def delete(self, customer_id: UUID) -> dict:
        customer = self.get_by_id(customer_id)
        company_name = customer.company_name

        # Delete related records first (cascading delete)
        from app.models.product_deployment import ProductDeployment
        from app.models.customer_interaction import CustomerInteraction
        from app.models.support_ticket import SupportTicket
        from app.models.csat_survey import CSATSurvey
        from app.models.alert import Alert
        from app.models.health_score import HealthScore
        from app.models.health_score_history import HealthScoreHistory

        # Delete health score history
        self.db.query(HealthScoreHistory).filter(
            HealthScoreHistory.customer_id == customer_id
        ).delete(synchronize_session=False)

        # Delete health scores for this customer's deployments
        deployment_ids = [d.id for d in self.db.query(ProductDeployment).filter(
            ProductDeployment.customer_id == customer_id
        ).all()]
        if deployment_ids:
            self.db.query(HealthScore).filter(
                HealthScore.product_deployment_id.in_(deployment_ids)
            ).delete(synchronize_session=False)

        # Delete deployments
        self.db.query(ProductDeployment).filter(
            ProductDeployment.customer_id == customer_id
        ).delete(synchronize_session=False)

        # Delete interactions
        self.db.query(CustomerInteraction).filter(
            CustomerInteraction.customer_id == customer_id
        ).delete(synchronize_session=False)

        # Delete tickets
        self.db.query(SupportTicket).filter(
            SupportTicket.customer_id == customer_id
        ).delete(synchronize_session=False)

        # Delete CSAT surveys
        self.db.query(CSATSurvey).filter(
            CSATSurvey.customer_id == customer_id
        ).delete(synchronize_session=False)

        # Delete alerts
        self.db.query(Alert).filter(
            Alert.customer_id == customer_id
        ).delete(synchronize_session=False)

        # Finally delete the customer
        self.db.delete(customer)
        self.db.commit()

        logger.info(f"Customer permanently deleted: {company_name}")
        return {"message": f"Customer '{company_name}' has been permanently deleted"}

    def get_customer_details(self, customer_id: UUID) -> Dict[str, Any]:
        customer = self.get_by_id(customer_id)

        # Get all product deployments
        deployments = self.db.query(ProductDeployment).filter(
            ProductDeployment.customer_id == customer_id
        ).all()

        # Get latest health scores per product
        health_scores_per_product = []
        for deployment in deployments:
            latest_score = self.db.query(HealthScore).filter(
                HealthScore.product_deployment_id == deployment.id
            ).order_by(desc(HealthScore.calculated_at)).first()

            health_scores_per_product.append({
                "product_name": deployment.product_name,
                "deployment_id": deployment.id,
                "latest_health_score": {
                    "overall_score": latest_score.overall_score,
                    "product_adoption_score": getattr(latest_score, 'product_adoption_score', 0) or 0,
                    "support_health_score": getattr(latest_score, 'support_health_score', 0) or 0,
                    "engagement_score": latest_score.engagement_score,
                    "financial_health_score": getattr(latest_score, 'financial_health_score', 0) or 0,
                    "sla_compliance_score": getattr(latest_score, 'sla_compliance_score', 100) or 100,
                    "adoption_score": latest_score.adoption_score,
                    "support_score": latest_score.support_score,
                    "financial_score": latest_score.financial_score,
                    "risk_level": getattr(latest_score, 'risk_level', None),
                    "score_trend": latest_score.score_trend,
                    "calculated_at": latest_score.calculated_at
                } if latest_score else None
            })

        # Get overall latest health score
        overall_health = self.db.query(HealthScore).filter(
            HealthScore.customer_id == customer_id,
            HealthScore.product_deployment_id.is_(None)
        ).order_by(desc(HealthScore.calculated_at)).first()

        # Get recent interactions (last 5)
        recent_interactions = self.db.query(CustomerInteraction).filter(
            CustomerInteraction.customer_id == customer_id
        ).order_by(desc(CustomerInteraction.interaction_date)).limit(5).all()

        # Get active alerts
        active_alerts = self.db.query(Alert).filter(
            Alert.customer_id == customer_id,
            Alert.is_resolved == False
        ).order_by(desc(Alert.created_at)).all()

        # Get CSAT summary
        csat_stats = self.db.query(
            func.count(CSATSurvey.id).label('total_surveys'),
            func.avg(CSATSurvey.score).label('avg_score')
        ).filter(
            CSATSurvey.customer_id == customer_id
        ).first()

        recent_csat = self.db.query(CSATSurvey).filter(
            CSATSurvey.customer_id == customer_id
        ).order_by(desc(CSATSurvey.submitted_at)).limit(5).all()

        # Serialize deployments
        serialized_deployments = [{
            "id": d.id,
            "product_name": d.product_name.value if hasattr(d.product_name, 'value') else str(d.product_name),
            "deployment_date": d.deployment_date,
            "version": d.version,
            "environment": d.environment.value if hasattr(d.environment, 'value') else str(d.environment),
            "license_type": d.license_type,
            "license_expiry": d.license_expiry,
            "is_active": d.is_active
        } for d in deployments]

        # Serialize interactions
        serialized_interactions = [{
            "id": i.id,
            "interaction_type": i.interaction_type.value if hasattr(i.interaction_type, 'value') else str(i.interaction_type),
            "subject": i.subject,
            "description": i.description,
            "sentiment": i.sentiment.value if hasattr(i.sentiment, 'value') else str(i.sentiment),
            "performed_by": i.performed_by,
            "interaction_date": i.interaction_date,
            "follow_up_required": i.follow_up_required
        } for i in recent_interactions]

        # Serialize alerts
        serialized_alerts = [{
            "id": a.id,
            "alert_type": a.alert_type.value if hasattr(a.alert_type, 'value') else str(a.alert_type),
            "severity": a.severity.value if hasattr(a.severity, 'value') else str(a.severity),
            "title": a.title,
            "description": a.description,
            "is_resolved": a.is_resolved,
            "created_at": a.created_at
        } for a in active_alerts]

        # Serialize CSAT surveys
        serialized_csat = [{
            "id": s.id,
            "survey_type": s.survey_type.value if hasattr(s.survey_type, 'value') else str(s.survey_type),
            "score": s.score,
            "feedback_text": s.feedback_text,
            "submitted_by_name": s.submitted_by_name,
            "submitted_at": s.submitted_at
        } for s in recent_csat]

        return {
            "customer": customer,
            "product_deployments": serialized_deployments,
            "health_scores_per_product": health_scores_per_product,
            "overall_health_score": {
                "overall_score": overall_health.overall_score,
                "product_adoption_score": getattr(overall_health, 'product_adoption_score', 0) or 0,
                "support_health_score": getattr(overall_health, 'support_health_score', 0) or 0,
                "engagement_score": overall_health.engagement_score,
                "financial_health_score": getattr(overall_health, 'financial_health_score', 0) or 0,
                "sla_compliance_score": getattr(overall_health, 'sla_compliance_score', 100) or 100,
                "adoption_score": overall_health.adoption_score,
                "support_score": overall_health.support_score,
                "financial_score": overall_health.financial_score,
                "risk_level": getattr(overall_health, 'risk_level', None),
                "score_trend": overall_health.score_trend,
                "calculated_at": overall_health.calculated_at
            } if overall_health else None,
            "recent_interactions": serialized_interactions,
            "active_alerts": serialized_alerts,
            "csat_summary": {
                "total_surveys": csat_stats.total_surveys or 0,
                "average_score": float(csat_stats.avg_score) if csat_stats.avg_score else None,
                "recent_surveys": serialized_csat
            }
        }

    def get_customer_timeline(
        self,
        customer_id: UUID,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Dict[str, Any]], int]:
        self.get_by_id(customer_id)  # Verify customer exists

        timeline_items = []

        # Get interactions
        interactions = self.db.query(CustomerInteraction).filter(
            CustomerInteraction.customer_id == customer_id
        ).all()

        for item in interactions:
            timeline_items.append({
                "type": "interaction",
                "id": item.id,
                "date": item.interaction_date,
                "title": item.subject,
                "description": item.description,
                "metadata": {
                    "interaction_type": item.interaction_type,
                    "sentiment": item.sentiment,
                    "performed_by": item.performed_by
                }
            })

        # Get CSAT submissions
        csat_surveys = self.db.query(CSATSurvey).filter(
            CSATSurvey.customer_id == customer_id
        ).all()

        for item in csat_surveys:
            timeline_items.append({
                "type": "csat_survey",
                "id": item.id,
                "date": item.submitted_at,
                "title": f"{item.survey_type.value.replace('_', ' ').title()} Survey",
                "description": item.feedback_text,
                "metadata": {
                    "survey_type": item.survey_type,
                    "score": item.score,
                    "submitted_by": item.submitted_by_name
                }
            })

        # Get health score changes
        health_scores = self.db.query(HealthScore).filter(
            HealthScore.customer_id == customer_id
        ).all()

        for item in health_scores:
            timeline_items.append({
                "type": "health_score",
                "id": item.id,
                "date": item.calculated_at,
                "title": f"Health Score: {item.overall_score}",
                "description": f"Trend: {item.score_trend.value}",
                "metadata": {
                    "overall_score": item.overall_score,
                    "engagement_score": item.engagement_score,
                    "adoption_score": item.adoption_score,
                    "support_score": item.support_score,
                    "financial_score": item.financial_score,
                    "score_trend": item.score_trend
                }
            })

        # Get alerts
        alerts = self.db.query(Alert).filter(
            Alert.customer_id == customer_id
        ).all()

        for item in alerts:
            timeline_items.append({
                "type": "alert",
                "id": item.id,
                "date": item.created_at,
                "title": item.title,
                "description": item.description,
                "metadata": {
                    "alert_type": item.alert_type,
                    "severity": item.severity,
                    "is_resolved": item.is_resolved
                }
            })

        # Sort by date descending
        timeline_items.sort(key=lambda x: x["date"], reverse=True)

        total = len(timeline_items)
        paginated_items = timeline_items[skip:skip + limit]

        return paginated_items, total

    def get_health_history(
        self,
        customer_id: UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[HealthScore], int]:
        self.get_by_id(customer_id)  # Verify customer exists

        query = self.db.query(HealthScore).filter(
            HealthScore.customer_id == customer_id
        )

        if start_date:
            query = query.filter(HealthScore.calculated_at >= datetime.combine(start_date, datetime.min.time()))

        if end_date:
            query = query.filter(HealthScore.calculated_at <= datetime.combine(end_date, datetime.max.time()))

        total = query.count()
        health_scores = query.order_by(desc(HealthScore.calculated_at)).offset(skip).limit(limit).all()

        return health_scores, total

    def get_industries(self) -> List[str]:
        """Get list of unique industries."""
        industries = self.db.query(Customer.industry).distinct().all()
        return [i[0] for i in industries if i[0]]

    def get_account_managers(self) -> List[Dict[str, Any]]:
        """Get list of users who can be account managers."""
        from app.models.user import UserRole
        users = self.db.query(User).filter(
            User.is_active == True,
            User.role.in_([UserRole.admin, UserRole.manager, UserRole.account_manager, UserRole.csm])
        ).all()

        return [{
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role.value
        } for u in users]

    def get_account_manager_names(self) -> List[str]:
        """Get list of unique account manager names (legacy field)."""
        managers = self.db.query(Customer.account_manager).distinct().all()
        return [m[0] for m in managers if m[0]]
