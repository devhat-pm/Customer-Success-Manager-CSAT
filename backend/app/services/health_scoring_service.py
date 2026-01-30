"""
Health Score Calculation Service

Implements the exact specification for customer health score calculation:
- Product Adoption (15%): Based on number of deployed products
- Support Health (25%): Based on ticket count, resolution time, escalations
- Engagement (20%): Based on meetings, calls, emails in last 90 days
- Financial Health (20%): Based on days until contract expiry
- SLA Compliance (20%): Based on SLA breach rate for tickets

Risk Level Thresholds:
- 80-100 = LOW (Green)
- 60-79 = MEDIUM (Yellow)
- 40-59 = HIGH (Orange)
- 0-39 = CRITICAL (Red)

Trend Determination:
- Compare current score with score from 30 days ago
- Difference >= +5 = IMPROVING
- Difference <= -5 = DECLINING
- Otherwise = STABLE
"""

from datetime import datetime, date, timedelta
from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from decimal import Decimal
import logging

from app.models.customer import Customer, CustomerStatus
from app.models.product_deployment import ProductDeployment
from app.models.health_score import HealthScore, ScoreTrend, RiskLevel
from app.models.health_score_history import HealthScoreHistory
from app.models.customer_interaction import CustomerInteraction, InteractionType
from app.models.support_ticket import SupportTicket, TicketPriority, TicketStatus
from app.models.csat_survey import CSATSurvey, SurveyType
from app.models.alert import Alert, AlertType, Severity
from app.core.exceptions import NotFoundError

logger = logging.getLogger(__name__)

# ============================================================
# WEIGHTS PER SPECIFICATION
# ============================================================
WEIGHTS = {
    "product_adoption": 0.15,    # 15%
    "support_health": 0.25,      # 25%
    "engagement": 0.20,          # 20%
    "financial_health": 0.20,    # 20%
    "sla_compliance": 0.20       # 20%
}

# Risk Level Thresholds
RISK_THRESHOLDS = {
    "low": 80,       # 80-100
    "medium": 60,    # 60-79
    "high": 40,      # 40-59
    "critical": 0    # 0-39
}

# Trend detection threshold
TREND_THRESHOLD = 5  # Points difference for trend detection

# Alert thresholds
SUB_SCORE_DROP_THRESHOLD = 15


class HealthScoringService:
    def __init__(self, db: Session):
        self.db = db

    # ============================================================
    # MAIN CALCULATION METHOD
    # ============================================================

    def calculate_customer_health_score(
        self,
        customer_id: UUID,
        product_deployment_id: Optional[UUID] = None
    ) -> HealthScore:
        """
        Calculate and store health score for a customer using exact specification.

        Formula:
        Overall = (Product Adoption × 0.15) + (Support Health × 0.25) +
                  (Engagement × 0.20) + (Financial Health × 0.20) +
                  (SLA Compliance × 0.20)
        """
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise NotFoundError(detail="Customer not found")

        # Calculate all 5 component scores per specification
        product_adoption_score = self._calculate_product_adoption_score(customer)
        support_health_score = self._calculate_support_health_score(customer_id)
        engagement_score = self._calculate_engagement_score(customer_id)
        financial_health_score = self._calculate_financial_health_score(customer)
        sla_compliance_score = self._calculate_sla_compliance_score(customer_id)

        # Calculate weighted overall score per specification
        overall_score = int(
            (product_adoption_score * WEIGHTS["product_adoption"]) +
            (support_health_score * WEIGHTS["support_health"]) +
            (engagement_score * WEIGHTS["engagement"]) +
            (financial_health_score * WEIGHTS["financial_health"]) +
            (sla_compliance_score * WEIGHTS["sla_compliance"])
        )

        # Determine risk level per specification
        risk_level = self._determine_risk_level(overall_score)

        # Determine trend by comparing with 30 days ago per specification
        score_trend = self._determine_trend(customer_id, overall_score)

        # Build detailed factors breakdown
        factors = {
            "product_adoption": {
                "score": product_adoption_score,
                "weight": WEIGHTS["product_adoption"],
                "details": self._get_product_adoption_details(customer)
            },
            "support_health": {
                "score": support_health_score,
                "weight": WEIGHTS["support_health"],
                "details": self._get_support_health_details(customer_id)
            },
            "engagement": {
                "score": engagement_score,
                "weight": WEIGHTS["engagement"],
                "details": self._get_engagement_details(customer_id)
            },
            "financial_health": {
                "score": financial_health_score,
                "weight": WEIGHTS["financial_health"],
                "details": self._get_financial_health_details(customer)
            },
            "sla_compliance": {
                "score": sla_compliance_score,
                "weight": WEIGHTS["sla_compliance"],
                "details": self._get_sla_compliance_details(customer_id)
            }
        }

        # Create health score record
        health_score = HealthScore(
            customer_id=customer_id,
            product_deployment_id=product_deployment_id,
            overall_score=overall_score,
            product_adoption_score=product_adoption_score,
            support_health_score=support_health_score,
            engagement_score=engagement_score,
            financial_health_score=financial_health_score,
            sla_compliance_score=sla_compliance_score,
            # Legacy fields for backward compatibility
            adoption_score=product_adoption_score,
            support_score=support_health_score,
            financial_score=financial_health_score,
            risk_level=risk_level,
            score_trend=score_trend,
            calculated_at=datetime.utcnow(),
            factors=factors
        )

        self.db.add(health_score)

        # Also save to health_score_history for trend tracking
        history_record = HealthScoreHistory(
            customer_id=customer_id,
            overall_score=overall_score,
            product_adoption_score=product_adoption_score,
            support_health_score=support_health_score,
            engagement_score=engagement_score,
            financial_health_score=financial_health_score,
            sla_compliance_score=sla_compliance_score,
            risk_level=risk_level.value,
            recorded_at=datetime.utcnow()
        )
        self.db.add(history_record)

        # Update customer status if at risk
        if risk_level in [RiskLevel.high, RiskLevel.critical]:
            if customer.status not in [CustomerStatus.churned]:
                customer.status = CustomerStatus.at_risk
                customer.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(health_score)

        # Check and create alerts
        self._check_and_create_alerts(customer_id, health_score)

        logger.info(
            f"Health score calculated for customer {customer_id}: "
            f"overall={overall_score}, risk={risk_level.value}, trend={score_trend.value}"
        )
        return health_score

    # ============================================================
    # COMPONENT SCORE CALCULATIONS - EXACT SPECIFICATION
    # ============================================================

    def _calculate_product_adoption_score(self, customer: Customer) -> int:
        """
        PRODUCT ADOPTION SCORE (15% weight)

        Specification:
        - 3 products deployed = 100
        - 2 products deployed = 70
        - 1 product deployed = 40
        - 0 products = 0
        - Bonus: +10 if contract age < 90 days (new customer grace)
        - Cap at 100
        """
        # Get active product deployments for this customer
        active_deployments = self.db.query(ProductDeployment).filter(
            ProductDeployment.customer_id == customer.id,
            ProductDeployment.is_active == True
        ).all()

        # Count unique products deployed
        unique_products = set(d.product_name for d in active_deployments)
        product_count = len(unique_products)

        # Base score based on product count
        if product_count >= 3:
            base_score = 100
        elif product_count == 2:
            base_score = 70
        elif product_count == 1:
            base_score = 40
        else:
            base_score = 0

        # Grace period bonus for new customers (< 90 days)
        contract_age_days = (datetime.utcnow().date() - customer.contract_start_date).days
        if contract_age_days < 90:
            base_score = min(100, base_score + 10)

        return base_score

    def _calculate_support_health_score(self, customer_id: UUID) -> int:
        """
        SUPPORT HEALTH SCORE (25% weight)

        Specification:
        - Start with 100
        - Subtract: (ticket_count_90_days × 2)
        - Subtract: (avg_resolution_hours / 24) × 5
        - Subtract: (escalation_count × 10)
        - Minimum = 0, Maximum = 100
        """
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)

        # Get tickets from last 90 days
        tickets = self.db.query(SupportTicket).filter(
            SupportTicket.customer_id == customer_id,
            SupportTicket.created_at >= ninety_days_ago
        ).all()

        if not tickets:
            return 100  # No tickets = perfect support health

        ticket_count = len(tickets)

        # Calculate average resolution time
        resolved_tickets = [t for t in tickets if t.resolution_time_hours is not None]
        if resolved_tickets:
            avg_resolution_hours = sum(t.resolution_time_hours for t in resolved_tickets) / len(resolved_tickets)
        else:
            avg_resolution_hours = 0

        # Count escalations (critical priority tickets)
        escalation_count = len([t for t in tickets if t.priority == TicketPriority.critical])

        # Calculate score per specification
        score = 100
        score -= ticket_count * 2                           # -2 per ticket
        score -= (avg_resolution_hours / 24) * 5            # -5 per day of avg resolution
        score -= escalation_count * 10                      # -10 per escalation

        return max(0, min(100, int(score)))

    def _calculate_engagement_score(self, customer_id: UUID) -> int:
        """
        ENGAGEMENT SCORE (20% weight)

        Specification:
        - meetings_90_days × 15
        - calls_90_days × 10
        - emails_90_days × 5
        - Cap at 100
        """
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)

        # Get interactions from last 90 days
        interactions = self.db.query(CustomerInteraction).filter(
            CustomerInteraction.customer_id == customer_id,
            CustomerInteraction.interaction_date >= ninety_days_ago
        ).all()

        # Count by type
        meetings = len([i for i in interactions if i.interaction_type == InteractionType.meeting])
        calls = len([i for i in interactions if i.interaction_type == InteractionType.call])
        emails = len([i for i in interactions if i.interaction_type == InteractionType.email])

        # Calculate score per specification
        score = (meetings * 15) + (calls * 10) + (emails * 5)

        return min(100, score)

    def _calculate_financial_health_score(self, customer: Customer) -> int:
        """
        FINANCIAL HEALTH SCORE (20% weight)

        Specification:
        - Days until contract end:
          - > 180 days = 100
          - 90-180 days = 80
          - 30-90 days = 50
          - < 30 days = 20
          - Expired = 0
        """
        if not customer.contract_end_date:
            return 50  # No end date = neutral score

        days_until_expiry = (customer.contract_end_date - datetime.utcnow().date()).days

        if days_until_expiry < 0:
            return 0          # Expired
        elif days_until_expiry < 30:
            return 20
        elif days_until_expiry < 90:
            return 50
        elif days_until_expiry < 180:
            return 80
        else:
            return 100

    def _calculate_sla_compliance_score(self, customer_id: UUID) -> int:
        """
        SLA COMPLIANCE SCORE (20% weight)

        Specification:
        - breach_rate = sla_breached_tickets / total_tickets_90_days
        - Score = (1 - breach_rate) × 100
        - If no tickets = 100
        """
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)

        # Get tickets from last 90 days
        tickets = self.db.query(SupportTicket).filter(
            SupportTicket.customer_id == customer_id,
            SupportTicket.created_at >= ninety_days_ago
        ).all()

        if not tickets:
            return 100  # No tickets = perfect SLA compliance

        breached_count = len([t for t in tickets if t.sla_breached])
        breach_rate = breached_count / len(tickets)

        return int((1 - breach_rate) * 100)

    # ============================================================
    # RISK LEVEL & TREND DETERMINATION - EXACT SPECIFICATION
    # ============================================================

    def _determine_risk_level(self, overall_score: int) -> RiskLevel:
        """
        RISK LEVEL DETERMINATION

        Specification:
        - 80-100 = LOW (Green)
        - 60-79 = MEDIUM (Yellow)
        - 40-59 = HIGH (Orange)
        - 0-39 = CRITICAL (Red)
        """
        if overall_score >= 80:
            return RiskLevel.low
        elif overall_score >= 60:
            return RiskLevel.medium
        elif overall_score >= 40:
            return RiskLevel.high
        else:
            return RiskLevel.critical

    def _determine_trend(self, customer_id: UUID, current_score: int) -> ScoreTrend:
        """
        TREND DETERMINATION

        Specification:
        - Compare current overall_score with score from 30 days ago
        - If difference >= +5 → IMPROVING (↑ green arrow)
        - If difference <= -5 → DECLINING (↓ red arrow)
        - Otherwise → STABLE (→ gray arrow)
        """
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        # Get score from approximately 30 days ago
        old_score_record = self.db.query(HealthScore).filter(
            HealthScore.customer_id == customer_id,
            HealthScore.calculated_at <= thirty_days_ago
        ).order_by(desc(HealthScore.calculated_at)).first()

        if not old_score_record:
            return ScoreTrend.stable  # No historical data

        difference = current_score - old_score_record.overall_score

        if difference >= TREND_THRESHOLD:
            return ScoreTrend.improving
        elif difference <= -TREND_THRESHOLD:
            return ScoreTrend.declining
        else:
            return ScoreTrend.stable

    # ============================================================
    # DETAIL METHODS FOR FACTORS BREAKDOWN
    # ============================================================

    def _get_product_adoption_details(self, customer: Customer) -> Dict[str, Any]:
        """Get detailed product adoption metrics."""
        active_deployments = self.db.query(ProductDeployment).filter(
            ProductDeployment.customer_id == customer.id,
            ProductDeployment.is_active == True
        ).all()

        unique_products = list(set(d.product_name.value for d in active_deployments))
        contract_age_days = (datetime.utcnow().date() - customer.contract_start_date).days

        return {
            "deployed_products": unique_products,
            "product_count": len(unique_products),
            "contract_age_days": contract_age_days,
            "is_new_customer": contract_age_days < 90,
            "grace_period_applied": contract_age_days < 90
        }

    def _get_support_health_details(self, customer_id: UUID) -> Dict[str, Any]:
        """Get detailed support health metrics."""
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)

        tickets = self.db.query(SupportTicket).filter(
            SupportTicket.customer_id == customer_id,
            SupportTicket.created_at >= ninety_days_ago
        ).all()

        resolved_tickets = [t for t in tickets if t.resolution_time_hours is not None]
        avg_resolution = (
            sum(t.resolution_time_hours for t in resolved_tickets) / len(resolved_tickets)
            if resolved_tickets else None
        )
        escalations = len([t for t in tickets if t.priority == TicketPriority.critical])

        return {
            "ticket_count_90_days": len(tickets),
            "avg_resolution_hours": round(avg_resolution, 2) if avg_resolution else None,
            "escalation_count": escalations,
            "open_tickets": len([t for t in tickets if t.status in [TicketStatus.open, TicketStatus.in_progress]])
        }

    def _get_engagement_details(self, customer_id: UUID) -> Dict[str, Any]:
        """Get detailed engagement metrics."""
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)

        interactions = self.db.query(CustomerInteraction).filter(
            CustomerInteraction.customer_id == customer_id,
            CustomerInteraction.interaction_date >= ninety_days_ago
        ).all()

        meetings = len([i for i in interactions if i.interaction_type == InteractionType.meeting])
        calls = len([i for i in interactions if i.interaction_type == InteractionType.call])
        emails = len([i for i in interactions if i.interaction_type == InteractionType.email])

        last_interaction = self.db.query(CustomerInteraction).filter(
            CustomerInteraction.customer_id == customer_id
        ).order_by(desc(CustomerInteraction.interaction_date)).first()

        return {
            "meetings_90_days": meetings,
            "calls_90_days": calls,
            "emails_90_days": emails,
            "total_interactions_90_days": len(interactions),
            "last_interaction_date": last_interaction.interaction_date.isoformat() if last_interaction else None,
            "days_since_last_interaction": (
                (datetime.utcnow() - last_interaction.interaction_date).days
                if last_interaction else None
            )
        }

    def _get_financial_health_details(self, customer: Customer) -> Dict[str, Any]:
        """Get detailed financial health metrics."""
        today = datetime.utcnow().date()
        days_until_expiry = (customer.contract_end_date - today).days if customer.contract_end_date else None

        return {
            "contract_value": float(customer.contract_value) if customer.contract_value else None,
            "contract_start_date": customer.contract_start_date.isoformat() if customer.contract_start_date else None,
            "contract_end_date": customer.contract_end_date.isoformat() if customer.contract_end_date else None,
            "days_until_expiry": days_until_expiry,
            "is_expired": days_until_expiry is not None and days_until_expiry < 0,
            "tenure_days": (today - customer.contract_start_date).days if customer.contract_start_date else None
        }

    def _get_sla_compliance_details(self, customer_id: UUID) -> Dict[str, Any]:
        """Get detailed SLA compliance metrics."""
        ninety_days_ago = datetime.utcnow() - timedelta(days=90)

        tickets = self.db.query(SupportTicket).filter(
            SupportTicket.customer_id == customer_id,
            SupportTicket.created_at >= ninety_days_ago
        ).all()

        total = len(tickets)
        breached = len([t for t in tickets if t.sla_breached])
        breach_rate = (breached / total * 100) if total > 0 else 0

        return {
            "total_tickets_90_days": total,
            "sla_breached_count": breached,
            "breach_rate_percent": round(breach_rate, 2),
            "compliance_rate_percent": round(100 - breach_rate, 2)
        }

    # ============================================================
    # ALERTS
    # ============================================================

    def _check_and_create_alerts(self, customer_id: UUID, health_score: HealthScore) -> None:
        """Check conditions and create alerts if necessary."""
        alerts_to_create = []

        # Check overall score thresholds
        if health_score.risk_level == RiskLevel.critical:
            alerts_to_create.append({
                "alert_type": AlertType.health_drop,
                "severity": Severity.critical,
                "title": "Critical Health Score Alert",
                "description": f"Customer health score dropped to {health_score.overall_score} (CRITICAL risk level). Immediate attention required."
            })
        elif health_score.risk_level == RiskLevel.high:
            alerts_to_create.append({
                "alert_type": AlertType.health_drop,
                "severity": Severity.high,
                "title": "High Risk Health Score Alert",
                "description": f"Customer health score is {health_score.overall_score} (HIGH risk level). Review recommended."
            })

        # Check for significant sub-score drops
        previous_score = self.db.query(HealthScore).filter(
            HealthScore.customer_id == customer_id,
            HealthScore.id != health_score.id
        ).order_by(desc(HealthScore.calculated_at)).first()

        if previous_score:
            sub_scores = [
                ("Product Adoption", getattr(previous_score, 'product_adoption_score', previous_score.adoption_score or 0), health_score.product_adoption_score),
                ("Support Health", getattr(previous_score, 'support_health_score', previous_score.support_score or 0), health_score.support_health_score),
                ("Engagement", previous_score.engagement_score, health_score.engagement_score),
                ("Financial Health", getattr(previous_score, 'financial_health_score', previous_score.financial_score or 0), health_score.financial_health_score),
                ("SLA Compliance", getattr(previous_score, 'sla_compliance_score', 100), health_score.sla_compliance_score)
            ]

            for name, old, new in sub_scores:
                if old and new and (old - new >= SUB_SCORE_DROP_THRESHOLD):
                    alerts_to_create.append({
                        "alert_type": AlertType.health_drop,
                        "severity": Severity.medium,
                        "title": f"{name} Score Drop",
                        "description": f"{name} score dropped from {old} to {new} ({old - new} point decrease)."
                    })

        # Check for consecutive declining trend
        recent_scores = self.db.query(HealthScore).filter(
            HealthScore.customer_id == customer_id
        ).order_by(desc(HealthScore.calculated_at)).limit(3).all()

        if len(recent_scores) >= 3:
            all_declining = all(s.score_trend == ScoreTrend.declining for s in recent_scores)
            if all_declining:
                alerts_to_create.append({
                    "alert_type": AlertType.health_drop,
                    "severity": Severity.high,
                    "title": "Persistent Declining Health",
                    "description": "Customer health score has been declining for 3 consecutive calculations. Intervention recommended."
                })

        # Create alerts (avoid duplicates for same day)
        today_start = datetime.combine(date.today(), datetime.min.time())
        for alert_data in alerts_to_create:
            existing = self.db.query(Alert).filter(
                Alert.customer_id == customer_id,
                Alert.alert_type == alert_data["alert_type"],
                Alert.title == alert_data["title"],
                Alert.created_at >= today_start,
                Alert.is_resolved == False
            ).first()

            if not existing:
                alert = Alert(
                    customer_id=customer_id,
                    **alert_data
                )
                self.db.add(alert)

        self.db.commit()

    # ============================================================
    # BATCH OPERATIONS & QUERIES
    # ============================================================

    def calculate_all_health_scores(self) -> Dict[str, Any]:
        """Calculate health scores for all active customers."""
        active_customers = self.db.query(Customer).filter(
            Customer.status.in_([CustomerStatus.active, CustomerStatus.at_risk, CustomerStatus.onboarding])
        ).all()

        results = {
            "total_customers": len(active_customers),
            "calculated": 0,
            "failed": 0,
            "errors": []
        }

        for customer in active_customers:
            try:
                self.calculate_customer_health_score(customer.id)
                results["calculated"] += 1
            except Exception as e:
                results["failed"] += 1
                results["errors"].append({
                    "customer_id": str(customer.id),
                    "error": str(e)
                })
                logger.error(f"Failed to calculate health score for {customer.id}: {e}")

        logger.info(f"Batch health score calculation complete: {results['calculated']}/{results['total_customers']}")
        return results

    def get_latest_health_score(self, customer_id: UUID) -> Optional[HealthScore]:
        """Get the latest health score for a customer."""
        return self.db.query(HealthScore).filter(
            HealthScore.customer_id == customer_id
        ).order_by(desc(HealthScore.calculated_at)).first()

    def get_health_score_history(
        self,
        customer_id: UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[HealthScore], int]:
        """Get health score history for a customer."""
        query = self.db.query(HealthScore).filter(
            HealthScore.customer_id == customer_id
        )

        if start_date:
            query = query.filter(HealthScore.calculated_at >= datetime.combine(start_date, datetime.min.time()))

        if end_date:
            query = query.filter(HealthScore.calculated_at <= datetime.combine(end_date, datetime.max.time()))

        total = query.count()
        scores = query.order_by(desc(HealthScore.calculated_at)).offset(skip).limit(limit).all()

        return scores, total

    def get_overall_trends(self) -> Dict[str, Any]:
        """Get overall health trends across all customers."""
        # Get latest score for each customer
        subquery = self.db.query(
            HealthScore.customer_id,
            func.max(HealthScore.calculated_at).label('max_date')
        ).group_by(HealthScore.customer_id).subquery()

        latest_scores = self.db.query(HealthScore).join(
            subquery,
            and_(
                HealthScore.customer_id == subquery.c.customer_id,
                HealthScore.calculated_at == subquery.c.max_date
            )
        ).all()

        if not latest_scores:
            return {
                "total_customers": 0,
                "average_score": None,
                "trend_distribution": {},
                "risk_distribution": {},
                "score_brackets": {}
            }

        avg_score = sum(s.overall_score for s in latest_scores) / len(latest_scores)

        trend_distribution = {
            "improving": len([s for s in latest_scores if s.score_trend == ScoreTrend.improving]),
            "stable": len([s for s in latest_scores if s.score_trend == ScoreTrend.stable]),
            "declining": len([s for s in latest_scores if s.score_trend == ScoreTrend.declining])
        }

        risk_distribution = {
            "low": len([s for s in latest_scores if s.risk_level == RiskLevel.low]),
            "medium": len([s for s in latest_scores if s.risk_level == RiskLevel.medium]),
            "high": len([s for s in latest_scores if s.risk_level == RiskLevel.high]),
            "critical": len([s for s in latest_scores if s.risk_level == RiskLevel.critical])
        }

        score_brackets = {
            "excellent (80-100)": len([s for s in latest_scores if s.overall_score >= 80]),
            "good (60-79)": len([s for s in latest_scores if 60 <= s.overall_score < 80]),
            "at_risk (40-59)": len([s for s in latest_scores if 40 <= s.overall_score < 60]),
            "critical (0-39)": len([s for s in latest_scores if s.overall_score < 40])
        }

        return {
            "total_customers": len(latest_scores),
            "average_score": round(avg_score, 1),
            "trend_distribution": trend_distribution,
            "risk_distribution": risk_distribution,
            "score_brackets": score_brackets
        }

    def get_at_risk_customers(
        self,
        threshold: int = 60,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Get customers with health score below threshold."""
        # Get latest score for each customer
        subquery = self.db.query(
            HealthScore.customer_id,
            func.max(HealthScore.calculated_at).label('max_date')
        ).group_by(HealthScore.customer_id).subquery()

        at_risk_query = self.db.query(HealthScore, Customer).join(
            subquery,
            and_(
                HealthScore.customer_id == subquery.c.customer_id,
                HealthScore.calculated_at == subquery.c.max_date
            )
        ).join(Customer).filter(
            HealthScore.overall_score < threshold
        ).order_by(HealthScore.overall_score.asc())

        total = at_risk_query.count()
        results = at_risk_query.offset(skip).limit(limit).all()

        at_risk_customers = []
        for score, customer in results:
            at_risk_customers.append({
                "customer_id": customer.id,
                "company_name": customer.company_name,
                "account_manager": customer.account_manager,
                "status": customer.status.value,
                "overall_score": score.overall_score,
                "product_adoption_score": score.product_adoption_score,
                "support_health_score": score.support_health_score,
                "engagement_score": score.engagement_score,
                "financial_health_score": score.financial_health_score,
                "sla_compliance_score": score.sla_compliance_score,
                "risk_level": score.risk_level.value,
                "score_trend": score.score_trend.value,
                "calculated_at": score.calculated_at.isoformat(),
                "days_until_contract_end": (customer.contract_end_date - date.today()).days if customer.contract_end_date else None
            })

        return at_risk_customers, total

    def get_score_distribution(self) -> Dict[str, Any]:
        """Get score distribution for dashboard charts."""
        # Get latest score for each customer
        subquery = self.db.query(
            HealthScore.customer_id,
            func.max(HealthScore.calculated_at).label('max_date')
        ).group_by(HealthScore.customer_id).subquery()

        latest_scores = self.db.query(HealthScore).join(
            subquery,
            and_(
                HealthScore.customer_id == subquery.c.customer_id,
                HealthScore.calculated_at == subquery.c.max_date
            )
        ).all()

        if not latest_scores:
            return {
                "overall_distribution": [],
                "sub_score_averages": {},
                "histogram": []
            }

        # Overall distribution by 10-point buckets
        histogram = [0] * 10
        for score in latest_scores:
            bucket = min(9, score.overall_score // 10)
            histogram[bucket] += 1

        histogram_data = [
            {"range": f"{i*10}-{i*10+9}", "count": histogram[i]}
            for i in range(10)
        ]

        # Sub-score averages (using new field names)
        sub_score_averages = {
            "product_adoption": round(sum(s.product_adoption_score for s in latest_scores) / len(latest_scores), 1),
            "support_health": round(sum(s.support_health_score for s in latest_scores) / len(latest_scores), 1),
            "engagement": round(sum(s.engagement_score for s in latest_scores) / len(latest_scores), 1),
            "financial_health": round(sum(s.financial_health_score for s in latest_scores) / len(latest_scores), 1),
            "sla_compliance": round(sum(s.sla_compliance_score for s in latest_scores) / len(latest_scores), 1)
        }

        # Distribution categories
        distribution = {
            "low_risk": {"min": 80, "max": 100, "count": len([s for s in latest_scores if s.overall_score >= 80])},
            "medium_risk": {"min": 60, "max": 79, "count": len([s for s in latest_scores if 60 <= s.overall_score < 80])},
            "high_risk": {"min": 40, "max": 59, "count": len([s for s in latest_scores if 40 <= s.overall_score < 60])},
            "critical_risk": {"min": 0, "max": 39, "count": len([s for s in latest_scores if s.overall_score < 40])}
        }

        return {
            "total_customers": len(latest_scores),
            "overall_distribution": distribution,
            "sub_score_averages": sub_score_averages,
            "histogram": histogram_data
        }
