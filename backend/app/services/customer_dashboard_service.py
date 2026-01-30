"""
Service for Customer Portal Dashboard.
Provides limited view of customer data compared to staff dashboards.
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID
import logging

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from app.models.customer import Customer
from app.models.customer_user import CustomerUser
from app.models.support_ticket import SupportTicket, TicketStatus
from app.models.product_deployment import ProductDeployment
from app.models.health_score import HealthScore
from app.models.csat_survey import CSATSurvey, SurveyRequest, SurveyRequestStatus
from app.models.announcement import Announcement, AnnouncementTargetType
from app.models.activity_log import ActivityLog
from app.core.exceptions import NotFoundError
from app.schemas.customer_dashboard import (
    CustomerHealthScore,
    RecentTicket,
    TicketsSummary,
    DeployedProduct,
    CustomerProducts,
    ActivityItem,
    RecentActivity,
    PendingSurveyItem,
    PendingSurveys,
    AccountManagerInfo,
    ContractInfo,
    AnnouncementItem,
    AnnouncementsList,
    CustomerDashboard,
)

logger = logging.getLogger(__name__)

# Health score messages based on score range
HEALTH_MESSAGES = {
    (80, 100): "Your account is in great health!",
    (60, 79): "Your account is healthy with room for improvement.",
    (40, 59): "We'd like to help improve your experience.",
    (0, 39): "Let's connect to address some concerns.",
}

# Product documentation URLs (can be configured elsewhere)
PRODUCT_DOCS = {
    "MonetX": "https://docs.extravis.com/monetx",
    "SupportX": "https://docs.extravis.com/supportx",
    "GreenX": "https://docs.extravis.com/greenx",
}


class CustomerDashboardService:
    """Service for customer dashboard operations."""

    def __init__(self, db: Session):
        self.db = db

    def _get_health_message(self, score: int) -> str:
        """Get health message based on score."""
        for (low, high), message in HEALTH_MESSAGES.items():
            if low <= score <= high:
                return message
        return "Your account status is being evaluated."

    def _get_risk_level_for_customer(self, risk_level: str) -> str:
        """Convert internal risk level to customer-friendly version."""
        # Don't show "critical" to customers - rename to "attention_needed"
        if risk_level and risk_level.lower() == "critical":
            return "attention_needed"
        return risk_level or "low"

    def get_health_score(self, customer_id: UUID) -> Optional[CustomerHealthScore]:
        """
        Get limited health score view for customer.
        Only shows overall score, not component breakdown.
        """
        health_score = self.db.query(HealthScore).filter(
            HealthScore.customer_id == customer_id
        ).first()

        if not health_score:
            return None

        # Get trend value from score_trend enum
        trend = "stable"
        if health_score.score_trend:
            trend = health_score.score_trend.value if hasattr(health_score.score_trend, 'value') else str(health_score.score_trend)

        # Get risk level value
        risk_level = "low"
        if health_score.risk_level:
            risk_level = health_score.risk_level.value if hasattr(health_score.risk_level, 'value') else str(health_score.risk_level)

        return CustomerHealthScore(
            overall_score=health_score.overall_score,
            trend=trend,
            risk_level=self._get_risk_level_for_customer(risk_level),
            health_message=self._get_health_message(health_score.overall_score),
            last_calculated=health_score.calculated_at
        )

    def get_tickets_summary(self, customer_id: UUID, recent_limit: int = 5) -> TicketsSummary:
        """Get ticket summary for customer."""
        # Get counts by status
        tickets = self.db.query(SupportTicket).filter(
            SupportTicket.customer_id == customer_id
        ).all()

        open_count = sum(1 for t in tickets if t.status == TicketStatus.open)
        in_progress_count = sum(1 for t in tickets if t.status == TicketStatus.in_progress)
        resolved_count = sum(1 for t in tickets if t.status == TicketStatus.resolved)
        closed_count = sum(1 for t in tickets if t.status == TicketStatus.closed)

        # Get recent tickets
        recent = self.db.query(SupportTicket).filter(
            SupportTicket.customer_id == customer_id
        ).order_by(desc(SupportTicket.updated_at)).limit(recent_limit).all()

        recent_tickets = [
            RecentTicket(
                id=t.id,
                ticket_number=t.ticket_number,
                subject=t.subject,
                status=t.status,
                priority=t.priority,
                product=t.product,
                created_at=t.created_at,
                updated_at=t.updated_at
            )
            for t in recent
        ]

        return TicketsSummary(
            open_count=open_count,
            in_progress_count=in_progress_count,
            resolved_count=resolved_count,
            closed_count=closed_count,
            total_count=len(tickets),
            recent_tickets=recent_tickets
        )

    def get_products(self, customer_id: UUID) -> CustomerProducts:
        """Get deployed products for customer."""
        deployments = self.db.query(ProductDeployment).filter(
            ProductDeployment.customer_id == customer_id
        ).all()

        products = []
        for d in deployments:
            product_name = d.product_name.value if hasattr(d.product_name, 'value') else d.product_name
            products.append(
                DeployedProduct(
                    product_name=product_name,
                    deployment_id=d.id,
                    is_active=d.is_active,
                    deployed_date=d.deployment_date,
                    version=d.version,
                    documentation_url=PRODUCT_DOCS.get(product_name)
                )
            )

        return CustomerProducts(
            products=products,
            total=len(products)
        )

    def get_recent_activity(
        self,
        customer_id: UUID,
        customer_user: CustomerUser,
        limit: int = 10,
        skip: int = 0
    ) -> RecentActivity:
        """
        Get recent activity visible to customer.
        Filters out internal staff activities.
        """
        activities = []

        # Get recent ticket activities
        recent_tickets = self.db.query(SupportTicket).filter(
            SupportTicket.customer_id == customer_id
        ).order_by(desc(SupportTicket.updated_at)).limit(20).all()

        for ticket in recent_tickets:
            # Add ticket creation
            activities.append(
                ActivityItem(
                    id=ticket.id,
                    activity_type="ticket_created",
                    title=f"Ticket {ticket.ticket_number} created",
                    description=ticket.subject,
                    related_id=ticket.id,
                    related_type="ticket",
                    timestamp=ticket.created_at
                )
            )
            # Add ticket status changes (if resolved recently)
            if ticket.resolved_at and ticket.resolved_at > datetime.utcnow() - timedelta(days=30):
                activities.append(
                    ActivityItem(
                        id=ticket.id,
                        activity_type="ticket_resolved",
                        title=f"Ticket {ticket.ticket_number} resolved",
                        description=ticket.subject,
                        related_id=ticket.id,
                        related_type="ticket",
                        timestamp=ticket.resolved_at
                    )
                )

        # Get recent survey completions by this customer
        completed_surveys = self.db.query(CSATSurvey).filter(
            CSATSurvey.customer_id == customer_id,
            CSATSurvey.submitted_by_customer_user_id == customer_user.id
        ).order_by(desc(CSATSurvey.submitted_at)).limit(10).all()

        for survey in completed_surveys:
            activities.append(
                ActivityItem(
                    id=survey.id,
                    activity_type="survey_completed",
                    title="Feedback submitted",
                    description=f"{survey.survey_type.value} survey completed",
                    related_id=survey.id,
                    related_type="survey",
                    timestamp=survey.submitted_at
                )
            )

        # Sort by timestamp descending
        activities.sort(key=lambda x: x.timestamp, reverse=True)

        # Apply pagination
        total = len(activities)
        activities = activities[skip:skip + limit]

        return RecentActivity(
            activities=activities,
            total=total
        )

    def get_pending_surveys(
        self,
        customer_id: UUID,
        customer_user: CustomerUser
    ) -> PendingSurveys:
        """Get pending survey requests for customer."""
        now = datetime.utcnow()

        # Get pending surveys
        pending = self.db.query(SurveyRequest).filter(
            SurveyRequest.customer_id == customer_id,
            SurveyRequest.status == SurveyRequestStatus.pending,
            SurveyRequest.expires_at > now,
            or_(
                SurveyRequest.target_email == None,
                SurveyRequest.target_email == customer_user.email,
                SurveyRequest.target_customer_user_id == customer_user.id
            )
        ).order_by(SurveyRequest.expires_at.asc()).all()

        surveys = []
        for s in pending:
            ticket_number = None
            if s.linked_ticket:
                ticket_number = s.linked_ticket.ticket_number

            surveys.append(
                PendingSurveyItem(
                    id=s.id,
                    survey_type=s.survey_type.value,
                    related_ticket_number=ticket_number,
                    expires_at=s.expires_at,
                    survey_url=f"/api/v1/portal/surveys/submit/{s.unique_survey_token}"
                )
            )

        return PendingSurveys(
            surveys=surveys,
            total=len(surveys)
        )

    def get_contract_info(self, customer: Customer) -> ContractInfo:
        """Get contract information for customer."""
        days_until_renewal = None
        is_expiring_soon = False

        if customer.contract_end_date:
            today = datetime.utcnow().date()
            if customer.contract_end_date >= today:
                days_until_renewal = (customer.contract_end_date - today).days
                is_expiring_soon = days_until_renewal <= 90

        account_manager = None
        if customer.account_manager_user:
            account_manager = AccountManagerInfo(
                name=customer.account_manager_user.full_name,
                email=customer.account_manager_user.email,
                phone=None  # Could add phone field to User model if needed
            )
        elif customer.account_manager:
            # Fallback to legacy field
            account_manager = AccountManagerInfo(
                name=customer.account_manager,
                email=customer.contact_email,
                phone=None
            )

        return ContractInfo(
            contract_start_date=customer.contract_start_date,
            contract_end_date=customer.contract_end_date,
            days_until_renewal=days_until_renewal,
            is_expiring_soon=is_expiring_soon,
            account_manager=account_manager
        )

    def get_announcements(self, customer_id: UUID) -> AnnouncementsList:
        """Get active announcements visible to customer."""
        now = datetime.utcnow()

        # Get all active announcements that are currently visible
        announcements = self.db.query(Announcement).filter(
            Announcement.is_active == True,
            Announcement.start_date <= now,
            or_(
                Announcement.end_date == None,
                Announcement.end_date >= now
            )
        ).order_by(
            desc(Announcement.priority),  # Important first
            desc(Announcement.start_date)
        ).all()

        # Filter to announcements visible to this customer
        visible = []
        for a in announcements:
            if a.is_visible_to_customer(customer_id):
                visible.append(
                    AnnouncementItem(
                        id=a.id,
                        title=a.title,
                        content=a.content,
                        priority=a.priority,
                        start_date=a.start_date,
                        end_date=a.end_date
                    )
                )

        return AnnouncementsList(
            announcements=visible,
            total=len(visible)
        )

    def get_full_dashboard(
        self,
        customer: Customer,
        customer_user: CustomerUser
    ) -> CustomerDashboard:
        """
        Get complete dashboard data in a single call.
        """
        return CustomerDashboard(
            customer_name=customer_user.full_name,
            company_name=customer.company_name,
            logo_url=customer.logo_url,
            last_login=customer_user.last_login,
            health_score=self.get_health_score(customer.id),
            tickets_summary=self.get_tickets_summary(customer.id),
            products=self.get_products(customer.id),
            recent_activity=self.get_recent_activity(customer.id, customer_user),
            pending_surveys=self.get_pending_surveys(customer.id, customer_user),
            contract_info=self.get_contract_info(customer),
            announcements=self.get_announcements(customer.id)
        )
