from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID
from decimal import Decimal
import logging

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case, and_, or_, desc, extract

from app.models.customer import Customer, CustomerStatus
from app.models.product_deployment import ProductDeployment, ProductName
from app.models.health_score import HealthScore, ScoreTrend
from app.models.csat_survey import CSATSurvey, SurveyType
from app.models.alert import Alert, Severity
from app.models.customer_interaction import CustomerInteraction

logger = logging.getLogger(__name__)


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def get_overview_stats(self) -> Dict[str, Any]:
        """Get comprehensive overview statistics."""
        # Customer counts
        total_customers = self.db.query(Customer).count()
        active_customers = self.db.query(Customer).filter(
            Customer.status == CustomerStatus.active
        ).count()
        at_risk_customers = self.db.query(Customer).filter(
            Customer.status == CustomerStatus.at_risk
        ).count()
        churned_customers = self.db.query(Customer).filter(
            Customer.status == CustomerStatus.churned
        ).count()

        # Deployment counts
        total_deployments = self.db.query(ProductDeployment).count()

        deployments_by_product = {
            "MonetX": 0,
            "SupportX": 0,
            "GreenX": 0
        }
        for product in ProductName:
            count = self.db.query(ProductDeployment).filter(
                ProductDeployment.product_name == product
            ).count()
            deployments_by_product[product.value] = count

        # Total contract value
        total_contract_value = self.db.query(
            func.coalesce(func.sum(Customer.contract_value), 0)
        ).filter(
            Customer.status != CustomerStatus.churned
        ).scalar() or 0

        # Average health score (latest per customer)
        subquery = self.db.query(
            HealthScore.customer_id,
            func.max(HealthScore.calculated_at).label('latest')
        ).group_by(HealthScore.customer_id).subquery()

        avg_health = self.db.query(func.avg(HealthScore.overall_score)).join(
            subquery,
            and_(
                HealthScore.customer_id == subquery.c.customer_id,
                HealthScore.calculated_at == subquery.c.latest
            )
        ).scalar()

        # Average CSAT score (all non-NPS surveys use 1-5 scale)
        avg_csat = self.db.query(func.avg(CSATSurvey.score)).filter(
            CSATSurvey.survey_type != SurveyType.nps
        ).scalar()

        # NPS score calculation
        nps_surveys = self.db.query(CSATSurvey).filter(
            CSATSurvey.survey_type == SurveyType.nps
        ).all()

        nps_score = None
        if nps_surveys:
            promoters = sum(1 for s in nps_surveys if s.score >= 9)
            detractors = sum(1 for s in nps_surveys if s.score <= 6)
            total_nps = len(nps_surveys)
            nps_score = int(((promoters - detractors) / total_nps) * 100) if total_nps > 0 else None

        # Alert counts
        open_alerts = self.db.query(Alert).filter(
            Alert.is_resolved == False
        ).count()

        critical_alerts = self.db.query(Alert).filter(
            Alert.is_resolved == False,
            Alert.severity == Severity.critical
        ).count()

        return {
            "total_customers": total_customers,
            "active_customers": active_customers,
            "at_risk_customers": at_risk_customers,
            "churned_customers": churned_customers,
            "total_deployments": total_deployments,
            "deployments_by_product": deployments_by_product,
            "total_contract_value": float(total_contract_value) if total_contract_value else 0,
            "avg_health_score": round(float(avg_health), 1) if avg_health else None,
            "avg_csat_score": round(float(avg_csat), 2) if avg_csat else None,
            "nps_score": nps_score,
            "open_alerts": open_alerts,
            "critical_alerts": critical_alerts
        }

    def get_health_distribution(self) -> Dict[str, Any]:
        """Get health score distribution across customers."""
        # Get latest health score per customer
        subquery = self.db.query(
            HealthScore.customer_id,
            func.max(HealthScore.calculated_at).label('latest')
        ).group_by(HealthScore.customer_id).subquery()

        latest_scores = self.db.query(HealthScore).join(
            subquery,
            and_(
                HealthScore.customer_id == subquery.c.customer_id,
                HealthScore.calculated_at == subquery.c.latest
            )
        ).all()

        total = len(latest_scores)

        # Count by bucket
        excellent = sum(1 for s in latest_scores if s.overall_score >= 80)
        good = sum(1 for s in latest_scores if 60 <= s.overall_score < 80)
        at_risk = sum(1 for s in latest_scores if 40 <= s.overall_score < 60)
        critical = sum(1 for s in latest_scores if s.overall_score < 40)

        def calc_percentage(count: int) -> float:
            return round((count / total * 100), 1) if total > 0 else 0

        return {
            "excellent": {
                "min": 80,
                "max": 100,
                "count": excellent,
                "percentage": calc_percentage(excellent)
            },
            "good": {
                "min": 60,
                "max": 79,
                "count": good,
                "percentage": calc_percentage(good)
            },
            "at_risk": {
                "min": 40,
                "max": 59,
                "count": at_risk,
                "percentage": calc_percentage(at_risk)
            },
            "critical": {
                "min": 0,
                "max": 39,
                "count": critical,
                "percentage": calc_percentage(critical)
            },
            "total_scored": total
        }

    def get_health_trends(
        self,
        period_type: str = "monthly",
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """Get health score trends over time."""
        if not end_date:
            end_date = date.today()
        if not start_date:
            if period_type == "daily":
                start_date = end_date - timedelta(days=30)
            elif period_type == "weekly":
                start_date = end_date - timedelta(weeks=12)
            else:  # monthly
                start_date = end_date - timedelta(days=365)

        query = self.db.query(HealthScore).filter(
            HealthScore.calculated_at >= datetime.combine(start_date, datetime.min.time()),
            HealthScore.calculated_at <= datetime.combine(end_date, datetime.max.time())
        )

        scores = query.all()

        # Group by period
        overall_trends = self._group_health_by_period(scores, period_type)

        # Group by product
        by_product = []
        for product in ProductName:
            # Get customer IDs with this product
            customer_ids = self.db.query(ProductDeployment.customer_id).filter(
                ProductDeployment.product_name == product
            ).distinct().all()
            customer_ids = [c[0] for c in customer_ids]

            product_scores = [s for s in scores if s.customer_id in customer_ids]
            if product_scores:
                trends = self._group_health_by_period(product_scores, period_type)
                by_product.append({
                    "product": product.value,
                    "trends": trends
                })

        return {
            "overall": overall_trends,
            "by_product": by_product,
            "period_type": period_type
        }

    def _group_health_by_period(
        self,
        scores: List[HealthScore],
        period_type: str
    ) -> List[Dict[str, Any]]:
        """Group health scores by time period."""
        grouped = {}

        for score in scores:
            if period_type == "daily":
                key = score.calculated_at.strftime("%Y-%m-%d")
            elif period_type == "weekly":
                # Get ISO week
                key = score.calculated_at.strftime("%Y-W%W")
            else:  # monthly
                key = score.calculated_at.strftime("%Y-%m")

            if key not in grouped:
                grouped[key] = {"scores": [], "customers": set()}
            grouped[key]["scores"].append(score.overall_score)
            grouped[key]["customers"].add(score.customer_id)

        result = []
        for period in sorted(grouped.keys()):
            data = grouped[period]
            result.append({
                "period": period,
                "avg_score": round(sum(data["scores"]) / len(data["scores"]), 1),
                "customer_count": len(data["customers"])
            })

        return result

    def get_csat_trends(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """Get CSAT trends over time."""
        if not end_date:
            end_date = date.today()
        if not start_date:
            start_date = end_date - timedelta(days=365)

        surveys = self.db.query(CSATSurvey).options(
            joinedload(CSATSurvey.product_deployment)
        ).filter(
            CSATSurvey.submitted_at >= datetime.combine(start_date, datetime.min.time()),
            CSATSurvey.submitted_at <= datetime.combine(end_date, datetime.max.time())
        ).all()

        # Overall monthly trends
        overall_trends = self._group_csat_by_month(surveys)

        # By product
        by_product = []
        for product in ProductName:
            product_surveys = [
                s for s in surveys
                if s.product_deployment and s.product_deployment.product_name == product
            ]
            if product_surveys:
                trends = self._group_csat_by_month(product_surveys)
                by_product.append({
                    "product": product.value,
                    "trends": trends
                })

        # By survey type
        by_survey_type = []
        for survey_type in SurveyType:
            type_surveys = [s for s in surveys if s.survey_type == survey_type]
            if type_surveys:
                trends = self._group_csat_by_month(type_surveys)
                by_survey_type.append({
                    "survey_type": survey_type.value,
                    "trends": trends
                })

        return {
            "overall": overall_trends,
            "by_product": by_product,
            "by_survey_type": by_survey_type
        }

    def _group_csat_by_month(self, surveys: List[CSATSurvey]) -> List[Dict[str, Any]]:
        """Group CSAT surveys by month."""
        grouped = {}

        for survey in surveys:
            key = survey.submitted_at.strftime("%Y-%m")
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(survey.score)

        result = []
        for period in sorted(grouped.keys()):
            scores = grouped[period]
            result.append({
                "period": period,
                "avg_score": round(sum(scores) / len(scores), 2),
                "response_count": len(scores)
            })

        return result

    def get_customer_segments(self) -> Dict[str, Any]:
        """Get customer segmentation data."""
        customers = self.db.query(Customer).filter(
            Customer.status != CustomerStatus.churned
        ).all()

        total = len(customers)

        def calc_percentage(count: int) -> float:
            return round((count / total * 100), 1) if total > 0 else 0

        # By industry
        industry_counts = {}
        for customer in customers:
            industry = customer.industry or "Unknown"
            if industry not in industry_counts:
                industry_counts[industry] = {"count": 0, "value": 0}
            industry_counts[industry]["count"] += 1
            industry_counts[industry]["value"] += float(customer.contract_value or 0)

        by_industry = [
            {
                "name": industry,
                "count": data["count"],
                "percentage": calc_percentage(data["count"]),
                "total_value": data["value"]
            }
            for industry, data in sorted(
                industry_counts.items(),
                key=lambda x: x[1]["count"],
                reverse=True
            )
        ]

        # By contract value range
        value_ranges = [
            ("Enterprise ($500K+)", 500000, float('inf')),
            ("Mid-Market ($100K-$500K)", 100000, 500000),
            ("SMB ($25K-$100K)", 25000, 100000),
            ("Starter (<$25K)", 0, 25000)
        ]

        by_contract_value = []
        for name, min_val, max_val in value_ranges:
            count = sum(
                1 for c in customers
                if min_val <= float(c.contract_value or 0) < max_val
            )
            total_value = sum(
                float(c.contract_value or 0) for c in customers
                if min_val <= float(c.contract_value or 0) < max_val
            )
            by_contract_value.append({
                "name": name,
                "count": count,
                "percentage": calc_percentage(count),
                "total_value": total_value
            })

        # By health status
        # Get latest health scores
        subquery = self.db.query(
            HealthScore.customer_id,
            func.max(HealthScore.calculated_at).label('latest')
        ).group_by(HealthScore.customer_id).subquery()

        latest_scores = self.db.query(HealthScore).join(
            subquery,
            and_(
                HealthScore.customer_id == subquery.c.customer_id,
                HealthScore.calculated_at == subquery.c.latest
            )
        ).all()

        score_map = {s.customer_id: s.overall_score for s in latest_scores}

        health_segments = {
            "Excellent (80-100)": 0,
            "Good (60-79)": 0,
            "At Risk (40-59)": 0,
            "Critical (<40)": 0,
            "Not Scored": 0
        }

        for customer in customers:
            score = score_map.get(customer.id)
            if score is None:
                health_segments["Not Scored"] += 1
            elif score >= 80:
                health_segments["Excellent (80-100)"] += 1
            elif score >= 60:
                health_segments["Good (60-79)"] += 1
            elif score >= 40:
                health_segments["At Risk (40-59)"] += 1
            else:
                health_segments["Critical (<40)"] += 1

        by_health_status = [
            {
                "name": name,
                "count": count,
                "percentage": calc_percentage(count)
            }
            for name, count in health_segments.items()
        ]

        # By product mix
        product_combinations = {}
        for customer in customers:
            deployments = self.db.query(ProductDeployment).filter(
                ProductDeployment.customer_id == customer.id,
                ProductDeployment.is_active == True
            ).all()

            products = sorted([d.product_name.value for d in deployments])
            combo = ", ".join(products) if products else "No Products"

            if combo not in product_combinations:
                product_combinations[combo] = 0
            product_combinations[combo] += 1

        by_product_mix = [
            {
                "name": combo,
                "count": count,
                "percentage": calc_percentage(count)
            }
            for combo, count in sorted(
                product_combinations.items(),
                key=lambda x: x[1],
                reverse=True
            )
        ]

        return {
            "by_industry": by_industry,
            "by_contract_value_range": by_contract_value,
            "by_health_status": by_health_status,
            "by_product_mix": by_product_mix
        }

    def get_upcoming_renewals(self) -> Dict[str, Any]:
        """Get upcoming contract renewals in 30/60/90 days."""
        today = date.today()

        # Get latest health scores
        subquery = self.db.query(
            HealthScore.customer_id,
            func.max(HealthScore.calculated_at).label('latest')
        ).group_by(HealthScore.customer_id).subquery()

        latest_scores = self.db.query(HealthScore).join(
            subquery,
            and_(
                HealthScore.customer_id == subquery.c.customer_id,
                HealthScore.calculated_at == subquery.c.latest
            )
        ).all()

        score_map = {s.customer_id: s for s in latest_scores}

        def get_health_status(score: Optional[int]) -> Optional[str]:
            if score is None:
                return None
            if score >= 80:
                return "excellent"
            elif score >= 60:
                return "good"
            elif score >= 40:
                return "at_risk"
            else:
                return "critical"

        def get_renewals(days: int) -> Tuple[List[Dict], float]:
            cutoff = today + timedelta(days=days)
            customers = self.db.query(Customer).filter(
                Customer.contract_end_date <= cutoff,
                Customer.contract_end_date >= today,
                Customer.status != CustomerStatus.churned
            ).order_by(Customer.contract_end_date).all()

            renewals = []
            total_value = 0

            for customer in customers:
                health_score_obj = score_map.get(customer.id)
                health_score = health_score_obj.overall_score if health_score_obj else None

                days_until = (customer.contract_end_date - today).days
                contract_value = float(customer.contract_value or 0)
                total_value += contract_value

                renewals.append({
                    "customer_id": customer.id,
                    "company_name": customer.company_name,
                    "contract_value": contract_value,
                    "health_score": health_score,
                    "health_status": get_health_status(health_score),
                    "contract_end_date": customer.contract_end_date,
                    "days_until_renewal": days_until,
                    "account_manager": customer.account_manager
                })

            return renewals, total_value

        renewals_30, value_30 = get_renewals(30)
        renewals_60, value_60 = get_renewals(60)
        renewals_90, value_90 = get_renewals(90)

        return {
            "renewals_30_days": renewals_30,
            "renewals_60_days": renewals_60,
            "renewals_90_days": renewals_90,
            "total_value_30_days": value_30,
            "total_value_60_days": value_60,
            "total_value_90_days": value_90
        }

    def get_recent_activity(
        self,
        limit: int = 50,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """Get recent activity feed combining multiple sources."""
        if not end_date:
            end_date = date.today()
        if not start_date:
            start_date = end_date - timedelta(days=30)

        start_datetime = datetime.combine(start_date, datetime.min.time())
        end_datetime = datetime.combine(end_date, datetime.max.time())

        activities = []

        # New customers
        new_customers = self.db.query(Customer).filter(
            Customer.created_at >= start_datetime,
            Customer.created_at <= end_datetime
        ).all()

        for customer in new_customers:
            activities.append({
                "activity_type": "new_customer",
                "title": f"New customer: {customer.company_name}",
                "description": f"Industry: {customer.industry or 'N/A'}",
                "customer_id": customer.id,
                "customer_name": customer.company_name,
                "timestamp": customer.created_at,
                "metadata": {
                    "contract_value": float(customer.contract_value or 0),
                    "industry": customer.industry
                }
            })

        # New deployments
        new_deployments = self.db.query(ProductDeployment).options(
            joinedload(ProductDeployment.customer)
        ).filter(
            ProductDeployment.deployment_date >= start_date,
            ProductDeployment.deployment_date <= end_date
        ).all()

        for deployment in new_deployments:
            activities.append({
                "activity_type": "new_deployment",
                "title": f"New deployment: {deployment.product_name.value}",
                "description": f"Environment: {deployment.environment.value}",
                "customer_id": deployment.customer_id,
                "customer_name": deployment.customer.company_name if deployment.customer else None,
                "timestamp": datetime.combine(deployment.deployment_date, datetime.min.time()),
                "metadata": {
                    "product": deployment.product_name.value,
                    "environment": deployment.environment.value,
                    "license_type": deployment.license_type
                }
            })

        # Recent interactions
        interactions = self.db.query(CustomerInteraction).options(
            joinedload(CustomerInteraction.customer)
        ).filter(
            CustomerInteraction.interaction_date >= start_datetime,
            CustomerInteraction.interaction_date <= end_datetime
        ).all()

        for interaction in interactions:
            activities.append({
                "activity_type": "interaction",
                "title": f"{interaction.interaction_type.value.replace('_', ' ').title()}",
                "description": interaction.subject,
                "customer_id": interaction.customer_id,
                "customer_name": interaction.customer.company_name if interaction.customer else None,
                "timestamp": interaction.interaction_date,
                "metadata": {
                    "type": interaction.interaction_type.value,
                    "sentiment": interaction.sentiment.value if interaction.sentiment else None,
                    "performed_by": interaction.performed_by
                }
            })

        # CSAT submissions
        csat_surveys = self.db.query(CSATSurvey).options(
            joinedload(CSATSurvey.customer)
        ).filter(
            CSATSurvey.submitted_at >= start_datetime,
            CSATSurvey.submitted_at <= end_datetime
        ).all()

        for survey in csat_surveys:
            activities.append({
                "activity_type": "csat",
                "title": f"NPS Response: {survey.score}/10" if survey.survey_type == SurveyType.nps else f"CSAT Response: {survey.score}/5",
                "description": survey.feedback_text[:100] if survey.feedback_text else None,
                "customer_id": survey.customer_id,
                "customer_name": survey.customer.company_name if survey.customer else None,
                "timestamp": survey.submitted_at,
                "metadata": {
                    "score": survey.score,
                    "survey_type": survey.survey_type.value
                }
            })

        # Alert triggers
        alerts = self.db.query(Alert).options(
            joinedload(Alert.customer)
        ).filter(
            Alert.created_at >= start_datetime,
            Alert.created_at <= end_datetime
        ).all()

        for alert in alerts:
            activities.append({
                "activity_type": "alert",
                "title": f"Alert: {alert.title}",
                "description": alert.description[:100] if alert.description else None,
                "customer_id": alert.customer_id,
                "customer_name": alert.customer.company_name if alert.customer else None,
                "timestamp": alert.created_at,
                "metadata": {
                    "severity": alert.severity.value,
                    "alert_type": alert.alert_type.value,
                    "is_resolved": alert.is_resolved
                }
            })

        # Sort by timestamp descending and limit (ensure all timestamps are naive for comparison)
        def get_naive_timestamp(item):
            ts = item["timestamp"]
            return ts.replace(tzinfo=None) if ts.tzinfo else ts

        activities.sort(key=get_naive_timestamp, reverse=True)
        activities = activities[:limit]

        return {
            "activities": activities,
            "total": len(activities)
        }

    def get_product_performance(self) -> Dict[str, Any]:
        """Get per-product performance metrics."""
        products = []

        for product in ProductName:
            deployments = self.db.query(ProductDeployment).filter(
                ProductDeployment.product_name == product
            ).all()

            deployment_count = len(deployments)
            active_deployments = sum(1 for d in deployments if d.is_active)
            inactive_deployments = deployment_count - active_deployments

            customer_ids = list(set(d.customer_id for d in deployments))
            customer_count = len(customer_ids)

            # Average health score for customers with this product
            if customer_ids:
                subquery = self.db.query(
                    HealthScore.customer_id,
                    func.max(HealthScore.calculated_at).label('latest')
                ).filter(
                    HealthScore.customer_id.in_(customer_ids)
                ).group_by(HealthScore.customer_id).subquery()

                avg_health = self.db.query(func.avg(HealthScore.overall_score)).join(
                    subquery,
                    and_(
                        HealthScore.customer_id == subquery.c.customer_id,
                        HealthScore.calculated_at == subquery.c.latest
                    )
                ).scalar()
            else:
                avg_health = None

            # Average CSAT for this product (non-NPS surveys)
            deployment_ids = [d.id for d in deployments]
            if deployment_ids:
                avg_csat = self.db.query(func.avg(CSATSurvey.score)).filter(
                    CSATSurvey.product_deployment_id.in_(deployment_ids),
                    CSATSurvey.survey_type != SurveyType.nps
                ).scalar()
            else:
                avg_csat = None

            products.append({
                "product": product.value,
                "deployment_count": deployment_count,
                "active_deployments": active_deployments,
                "inactive_deployments": inactive_deployments,
                "active_ratio": round(active_deployments / deployment_count, 2) if deployment_count > 0 else 0,
                "avg_health_score": round(float(avg_health), 1) if avg_health else None,
                "avg_csat_score": round(float(avg_csat), 2) if avg_csat else None,
                "customer_count": customer_count
            })

        return {"products": products}

    def get_account_manager_performance(self) -> Dict[str, Any]:
        """Get performance metrics by account manager."""
        # Get all unique account managers
        managers = self.db.query(Customer.account_manager).filter(
            Customer.account_manager.isnot(None)
        ).distinct().all()

        manager_names = [m[0] for m in managers if m[0]]

        # Get latest health scores
        subquery = self.db.query(
            HealthScore.customer_id,
            func.max(HealthScore.calculated_at).label('latest')
        ).group_by(HealthScore.customer_id).subquery()

        latest_scores = self.db.query(HealthScore).join(
            subquery,
            and_(
                HealthScore.customer_id == subquery.c.customer_id,
                HealthScore.calculated_at == subquery.c.latest
            )
        ).all()

        score_map = {s.customer_id: s.overall_score for s in latest_scores}

        result = []

        for manager in manager_names:
            customers = self.db.query(Customer).filter(
                Customer.account_manager == manager
            ).all()

            customer_count = len(customers)
            customer_ids = [c.id for c in customers]

            # Health scores
            health_scores = [score_map.get(c.id) for c in customers if score_map.get(c.id) is not None]
            avg_health = sum(health_scores) / len(health_scores) if health_scores else None

            # At-risk customers
            at_risk = sum(1 for c in customers if c.status == CustomerStatus.at_risk)

            # Churned customers
            churned = sum(1 for c in customers if c.status == CustomerStatus.churned)

            # Total contract value
            total_value = sum(float(c.contract_value or 0) for c in customers if c.status != CustomerStatus.churned)

            # Active alerts
            active_alerts = self.db.query(Alert).filter(
                Alert.customer_id.in_(customer_ids),
                Alert.is_resolved == False
            ).count() if customer_ids else 0

            result.append({
                "account_manager": manager,
                "customer_count": customer_count,
                "avg_health_score": round(avg_health, 1) if avg_health else None,
                "at_risk_customers": at_risk,
                "total_contract_value": total_value,
                "churned_customers": churned,
                "active_alerts": active_alerts
            })

        # Sort by customer count descending
        result.sort(key=lambda x: x["customer_count"], reverse=True)

        return {"managers": result}
