from datetime import datetime, date, timedelta
from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func
import logging

from app.models.activity_log import ActivityLog, ActivityType
from app.models.customer import Customer
from app.models.user import User
from app.models.health_score import HealthScore
from app.models.alert import Alert
from app.models.csat_survey import CSATSurvey
from app.models.support_ticket import SupportTicket
from app.schemas.activity_log import ActivityLogCreate, ActivityLogUpdate
from app.core.exceptions import NotFoundError, ValidationError

logger = logging.getLogger(__name__)


class ActivityService:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, activity_id: UUID) -> ActivityLog:
        """Get activity by ID."""
        activity = self.db.query(ActivityLog).options(
            joinedload(ActivityLog.user),
            joinedload(ActivityLog.customer)
        ).filter(ActivityLog.id == activity_id).first()
        if not activity:
            raise NotFoundError(detail="Activity not found")
        return activity

    def create(self, activity_data: ActivityLogCreate, user_id: UUID) -> ActivityLog:
        """Create a new activity log entry."""
        # Verify customer exists
        customer = self.db.query(Customer).filter(Customer.id == activity_data.customer_id).first()
        if not customer:
            raise ValidationError(detail="Customer not found")

        activity = ActivityLog(
            customer_id=activity_data.customer_id,
            user_id=user_id,
            activity_type=activity_data.activity_type,
            title=activity_data.title,
            description=activity_data.description,
            activity_metadata=activity_data.activity_metadata,
            logged_at=datetime.utcnow()
        )

        self.db.add(activity)
        self.db.commit()
        self.db.refresh(activity)

        logger.info(f"Activity logged: {activity.activity_type.value} for customer {customer.company_name}")
        return activity

    def update(self, activity_id: UUID, activity_data: ActivityLogUpdate) -> ActivityLog:
        """Update an activity log entry."""
        activity = self.get_by_id(activity_id)

        if activity_data.activity_type is not None:
            activity.activity_type = activity_data.activity_type
        if activity_data.title is not None:
            activity.title = activity_data.title
        if activity_data.description is not None:
            activity.description = activity_data.description
        if activity_data.activity_metadata is not None:
            activity.activity_metadata = activity_data.activity_metadata

        self.db.commit()
        self.db.refresh(activity)

        logger.info(f"Activity updated: {activity.id}")
        return activity

    def delete(self, activity_id: UUID) -> None:
        """Delete an activity log entry."""
        activity = self.get_by_id(activity_id)
        self.db.delete(activity)
        self.db.commit()
        logger.info(f"Activity deleted: {activity_id}")

    def get_activities(
        self,
        customer_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
        activity_type: Optional[ActivityType] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[ActivityLog], int]:
        """Get activities with optional filters."""
        query = self.db.query(ActivityLog).options(
            joinedload(ActivityLog.user),
            joinedload(ActivityLog.customer)
        )

        if customer_id:
            query = query.filter(ActivityLog.customer_id == customer_id)
        if user_id:
            query = query.filter(ActivityLog.user_id == user_id)
        if activity_type:
            query = query.filter(ActivityLog.activity_type == activity_type)
        if date_from:
            query = query.filter(ActivityLog.logged_at >= datetime.combine(date_from, datetime.min.time()))
        if date_to:
            query = query.filter(ActivityLog.logged_at <= datetime.combine(date_to, datetime.max.time()))

        total = query.count()
        activities = query.order_by(desc(ActivityLog.logged_at)).offset(skip).limit(limit).all()

        return activities, total

    def get_recent_activities(self, limit: int = 20) -> List[ActivityLog]:
        """Get most recent activities across all customers."""
        activities = self.db.query(ActivityLog).options(
            joinedload(ActivityLog.user),
            joinedload(ActivityLog.customer)
        ).order_by(desc(ActivityLog.logged_at)).limit(limit).all()

        return activities

    def get_customer_timeline(
        self,
        customer_id: UUID,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get unified timeline for a customer including:
        - Activity logs
        - Health score changes
        - Alerts
        - CSAT surveys
        - Support tickets
        """
        # Verify customer exists
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise NotFoundError(detail="Customer not found")

        timeline_items = []

        # Get activities
        activities = self.db.query(ActivityLog).filter(
            ActivityLog.customer_id == customer_id
        ).order_by(desc(ActivityLog.logged_at)).limit(limit).all()

        for activity in activities:
            timeline_items.append({
                "id": activity.id,
                "type": "activity",
                "title": activity.title,
                "description": activity.description,
                "timestamp": activity.logged_at,
                "metadata": {
                    "activity_type": activity.activity_type.value,
                    "user_id": str(activity.user_id) if activity.user_id else None
                }
            })

        # Get health scores
        health_scores = self.db.query(HealthScore).filter(
            HealthScore.customer_id == customer_id
        ).order_by(desc(HealthScore.calculated_at)).limit(limit).all()

        for hs in health_scores:
            timeline_items.append({
                "id": hs.id,
                "type": "health_score",
                "title": f"Health Score: {hs.overall_score}",
                "description": f"Trend: {hs.score_trend.value if hs.score_trend else 'stable'}",
                "timestamp": hs.calculated_at,
                "metadata": {
                    "overall_score": hs.overall_score,
                    "risk_level": hs.risk_level.value if hs.risk_level else None,
                    "score_trend": hs.score_trend.value if hs.score_trend else None
                }
            })

        # Get alerts
        alerts = self.db.query(Alert).filter(
            Alert.customer_id == customer_id
        ).order_by(desc(Alert.created_at)).limit(limit).all()

        for alert in alerts:
            timeline_items.append({
                "id": alert.id,
                "type": "alert",
                "title": alert.title,
                "description": alert.description,
                "timestamp": alert.created_at,
                "metadata": {
                    "alert_type": alert.alert_type.value if hasattr(alert.alert_type, 'value') else str(alert.alert_type),
                    "severity": alert.severity.value if hasattr(alert.severity, 'value') else str(alert.severity),
                    "is_resolved": alert.is_resolved
                }
            })

        # Get CSAT surveys
        csat_surveys = self.db.query(CSATSurvey).filter(
            CSATSurvey.customer_id == customer_id
        ).order_by(desc(CSATSurvey.submitted_at)).limit(limit).all()

        for csat in csat_surveys:
            timeline_items.append({
                "id": csat.id,
                "type": "csat",
                "title": f"CSAT Survey: {csat.score}/5",
                "description": csat.feedback_text,
                "timestamp": csat.submitted_at,
                "metadata": {
                    "score": csat.score,
                    "survey_type": csat.survey_type.value if hasattr(csat.survey_type, 'value') else str(csat.survey_type),
                    "submitted_by": csat.submitted_by_name
                }
            })

        # Get support tickets
        tickets = self.db.query(SupportTicket).filter(
            SupportTicket.customer_id == customer_id
        ).order_by(desc(SupportTicket.created_at)).limit(limit).all()

        for ticket in tickets:
            timeline_items.append({
                "id": ticket.id,
                "type": "ticket",
                "title": f"Ticket: {ticket.subject}",
                "description": f"Status: {ticket.status.value}, Priority: {ticket.priority.value}",
                "timestamp": ticket.created_at,
                "metadata": {
                    "ticket_number": ticket.ticket_number,
                    "status": ticket.status.value,
                    "priority": ticket.priority.value,
                    "sla_breached": ticket.sla_breached
                }
            })

        # Sort all items by timestamp descending (ensure all timestamps are naive for comparison)
        def get_naive_timestamp(item):
            ts = item["timestamp"]
            return ts.replace(tzinfo=None) if ts.tzinfo else ts

        timeline_items.sort(key=get_naive_timestamp, reverse=True)

        # Return top N items
        return timeline_items[:limit]

    def get_activity_stats(
        self,
        customer_id: Optional[UUID] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get activity statistics."""
        since_date = datetime.utcnow() - timedelta(days=days)

        query = self.db.query(
            ActivityLog.activity_type,
            func.count(ActivityLog.id).label('count')
        ).filter(
            ActivityLog.logged_at >= since_date
        )

        if customer_id:
            query = query.filter(ActivityLog.customer_id == customer_id)

        query = query.group_by(ActivityLog.activity_type)
        results = query.all()

        stats = {
            "total": sum(r.count for r in results),
            "by_type": {r.activity_type.value: r.count for r in results},
            "period_days": days
        }

        return stats
