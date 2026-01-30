from datetime import datetime, date, timedelta
from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func
import re
import logging

from app.models.customer_interaction import CustomerInteraction, InteractionType, Sentiment
from app.models.customer import Customer
from app.schemas.customer_interaction import CustomerInteractionCreate, CustomerInteractionUpdate
from app.core.exceptions import NotFoundError

logger = logging.getLogger(__name__)

# Sentiment analysis keywords
POSITIVE_WORDS = [
    'thank', 'thanks', 'appreciate', 'great', 'excellent', 'amazing', 'wonderful',
    'fantastic', 'helpful', 'resolved', 'fixed', 'working', 'perfect', 'love',
    'happy', 'satisfied', 'pleased', 'impressed', 'awesome', 'brilliant',
    'outstanding', 'superb', 'delighted', 'grateful', 'success', 'smooth'
]

NEGATIVE_WORDS = [
    'frustrated', 'disappointed', 'angry', 'upset', 'annoyed', 'terrible',
    'horrible', 'awful', 'poor', 'bad', 'broken', 'failed', 'issue', 'problem',
    'bug', 'error', 'crash', 'slow', 'delay', 'waiting', 'unacceptable',
    'unhappy', 'dissatisfied', 'complaint', 'urgent', 'critical', 'escalate',
    'refund', 'cancel', 'worst', 'never', 'useless', 'waste'
]

# Sentiment score thresholds
POSITIVE_THRESHOLD = 0.3
NEGATIVE_THRESHOLD = -0.3


class InteractionService:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, interaction_id: UUID) -> CustomerInteraction:
        interaction = self.db.query(CustomerInteraction).filter(
            CustomerInteraction.id == interaction_id
        ).first()
        if not interaction:
            raise NotFoundError(detail="Interaction not found")
        return interaction

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        customer_id: Optional[UUID] = None,
        interaction_type: Optional[InteractionType] = None,
        sentiment: Optional[Sentiment] = None,
        performed_by: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        follow_up_required: Optional[bool] = None,
        sort_by: str = "interaction_date",
        sort_order: str = "desc"
    ) -> Tuple[List[Dict[str, Any]], int]:
        query = self.db.query(CustomerInteraction, Customer).join(
            Customer, CustomerInteraction.customer_id == Customer.id
        )

        if customer_id:
            query = query.filter(CustomerInteraction.customer_id == customer_id)

        if interaction_type:
            query = query.filter(CustomerInteraction.interaction_type == interaction_type)

        if sentiment:
            query = query.filter(CustomerInteraction.sentiment == sentiment)

        if performed_by:
            query = query.filter(CustomerInteraction.performed_by.ilike(f"%{performed_by}%"))

        if start_date:
            query = query.filter(CustomerInteraction.interaction_date >= datetime.combine(start_date, datetime.min.time()))

        if end_date:
            query = query.filter(CustomerInteraction.interaction_date <= datetime.combine(end_date, datetime.max.time()))

        if follow_up_required is not None:
            query = query.filter(CustomerInteraction.follow_up_required == follow_up_required)

        total = query.count()

        sort_column = getattr(CustomerInteraction, sort_by, CustomerInteraction.interaction_date)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        results = query.offset(skip).limit(limit).all()

        # Enrich with customer data
        interactions = []
        for interaction, customer in results:
            interactions.append({
                "id": interaction.id,
                "customer_id": interaction.customer_id,
                "customer_name": customer.company_name,
                "interaction_type": interaction.interaction_type,
                "subject": interaction.subject,
                "description": interaction.description,
                "sentiment": interaction.sentiment,
                "performed_by": interaction.performed_by,
                "performed_by_name": interaction.performed_by,
                "interaction_date": interaction.interaction_date,
                "follow_up_required": interaction.follow_up_required,
                "follow_up_date": interaction.follow_up_date,
            })

        return interactions, total

    def create(self, interaction_data: CustomerInteractionCreate) -> CustomerInteraction:
        # Verify customer exists
        customer = self.db.query(Customer).filter(Customer.id == interaction_data.customer_id).first()
        if not customer:
            raise NotFoundError(detail="Customer not found")

        # Auto-analyze sentiment from description if not explicitly provided
        sentiment = interaction_data.sentiment
        if sentiment == Sentiment.neutral and interaction_data.description:
            sentiment = self._analyze_sentiment(interaction_data.description)

        interaction = CustomerInteraction(
            customer_id=interaction_data.customer_id,
            interaction_type=interaction_data.interaction_type,
            subject=interaction_data.subject,
            description=interaction_data.description,
            sentiment=sentiment,
            performed_by=interaction_data.performed_by,
            interaction_date=interaction_data.interaction_date or datetime.utcnow(),
            follow_up_required=interaction_data.follow_up_required,
            follow_up_date=interaction_data.follow_up_date
        )

        self.db.add(interaction)
        self.db.commit()
        self.db.refresh(interaction)

        logger.info(f"Interaction logged: {interaction.interaction_type.value} for {customer.company_name}")
        return interaction

    def update(self, interaction_id: UUID, interaction_data: CustomerInteractionUpdate) -> CustomerInteraction:
        interaction = self.get_by_id(interaction_id)

        if interaction_data.interaction_type is not None:
            interaction.interaction_type = interaction_data.interaction_type

        if interaction_data.subject is not None:
            interaction.subject = interaction_data.subject

        if interaction_data.description is not None:
            interaction.description = interaction_data.description
            # Re-analyze sentiment if description changed and sentiment not explicitly set
            if interaction_data.sentiment is None:
                interaction.sentiment = self._analyze_sentiment(interaction_data.description)

        if interaction_data.sentiment is not None:
            interaction.sentiment = interaction_data.sentiment

        if interaction_data.performed_by is not None:
            interaction.performed_by = interaction_data.performed_by

        if interaction_data.interaction_date is not None:
            interaction.interaction_date = interaction_data.interaction_date

        if interaction_data.follow_up_required is not None:
            interaction.follow_up_required = interaction_data.follow_up_required

        if interaction_data.follow_up_date is not None:
            interaction.follow_up_date = interaction_data.follow_up_date

        self.db.commit()
        self.db.refresh(interaction)

        logger.info(f"Interaction updated: {interaction_id}")
        return interaction

    def delete(self, interaction_id: UUID) -> bool:
        interaction = self.get_by_id(interaction_id)
        self.db.delete(interaction)
        self.db.commit()
        logger.info(f"Interaction deleted: {interaction_id}")
        return True

    def _analyze_sentiment(self, text: str) -> Sentiment:
        """Analyze sentiment from text using keyword matching."""
        if not text:
            return Sentiment.neutral

        words = re.findall(r'\b\w+\b', text.lower())

        positive_count = sum(1 for word in words if word in POSITIVE_WORDS)
        negative_count = sum(1 for word in words if word in NEGATIVE_WORDS)
        total_sentiment_words = positive_count + negative_count

        if total_sentiment_words == 0:
            return Sentiment.neutral

        # Calculate sentiment score (-1 to 1)
        sentiment_score = (positive_count - negative_count) / total_sentiment_words

        if sentiment_score >= POSITIVE_THRESHOLD:
            return Sentiment.positive
        elif sentiment_score <= NEGATIVE_THRESHOLD:
            return Sentiment.negative
        else:
            return Sentiment.neutral

    def get_customer_interactions(
        self,
        customer_id: UUID,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Get all interactions for a specific customer."""
        # Verify customer exists
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise NotFoundError(detail="Customer not found")

        return self.get_all(
            skip=skip,
            limit=limit,
            customer_id=customer_id,
            sort_by="interaction_date",
            sort_order="desc"
        )

    def get_pending_followups(
        self,
        skip: int = 0,
        limit: int = 100,
        include_overdue: bool = True
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Get interactions requiring follow-up."""
        query = self.db.query(CustomerInteraction, Customer).join(
            Customer,
            CustomerInteraction.customer_id == Customer.id
        ).filter(CustomerInteraction.follow_up_required == True)

        if include_overdue:
            # All pending follow-ups (past and future)
            pass
        else:
            # Only upcoming follow-ups
            query = query.filter(CustomerInteraction.follow_up_date >= date.today())

        total = query.count()

        # Sort by follow-up date (overdue first)
        interactions = query.order_by(
            asc(CustomerInteraction.follow_up_date)
        ).offset(skip).limit(limit).all()

        results = []
        today = date.today()

        for interaction, customer in interactions:
            is_overdue = interaction.follow_up_date and interaction.follow_up_date < today
            days_until = (interaction.follow_up_date - today).days if interaction.follow_up_date else None

            results.append({
                "interaction_id": interaction.id,
                "customer_id": customer.id,
                "customer_name": customer.company_name,
                "account_manager": customer.account_manager,
                "interaction_type": interaction.interaction_type.value,
                "subject": interaction.subject,
                "performed_by": interaction.performed_by,
                "interaction_date": interaction.interaction_date.isoformat(),
                "follow_up_date": interaction.follow_up_date.isoformat() if interaction.follow_up_date else None,
                "is_overdue": is_overdue,
                "days_until_due": days_until
            })

        return results, total

    def get_summary_stats(self) -> Dict[str, Any]:
        """Get interaction summary statistics for dashboard."""
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)
        seven_days_ago = now - timedelta(days=7)

        # Total interactions
        total = self.db.query(CustomerInteraction).count()

        # Last 30 days
        last_30_days = self.db.query(CustomerInteraction).filter(
            CustomerInteraction.interaction_date >= thirty_days_ago
        ).count()

        # Last 7 days
        last_7_days = self.db.query(CustomerInteraction).filter(
            CustomerInteraction.interaction_date >= seven_days_ago
        ).count()

        # By type (last 30 days)
        by_type = {}
        for itype in InteractionType:
            count = self.db.query(CustomerInteraction).filter(
                CustomerInteraction.interaction_type == itype,
                CustomerInteraction.interaction_date >= thirty_days_ago
            ).count()
            by_type[itype.value] = count

        # By sentiment (last 30 days)
        by_sentiment = {}
        for sent in Sentiment:
            count = self.db.query(CustomerInteraction).filter(
                CustomerInteraction.sentiment == sent,
                CustomerInteraction.interaction_date >= thirty_days_ago
            ).count()
            by_sentiment[sent.value] = count

        # Pending follow-ups
        pending_followups = self.db.query(CustomerInteraction).filter(
            CustomerInteraction.follow_up_required == True
        ).count()

        overdue_followups = self.db.query(CustomerInteraction).filter(
            CustomerInteraction.follow_up_required == True,
            CustomerInteraction.follow_up_date < date.today()
        ).count()

        # Top performers (last 30 days)
        top_performers = self.db.query(
            CustomerInteraction.performed_by,
            func.count(CustomerInteraction.id).label('count')
        ).filter(
            CustomerInteraction.interaction_date >= thirty_days_ago
        ).group_by(
            CustomerInteraction.performed_by
        ).order_by(desc('count')).limit(5).all()

        # Daily trend (last 7 days)
        daily_trend = []
        for i in range(7):
            day = date.today() - timedelta(days=i)
            day_start = datetime.combine(day, datetime.min.time())
            day_end = datetime.combine(day, datetime.max.time())
            count = self.db.query(CustomerInteraction).filter(
                CustomerInteraction.interaction_date >= day_start,
                CustomerInteraction.interaction_date <= day_end
            ).count()
            daily_trend.append({
                "date": day.isoformat(),
                "count": count
            })

        daily_trend.reverse()

        return {
            "total_interactions": total,
            "last_30_days": last_30_days,
            "last_7_days": last_7_days,
            "by_type": by_type,
            "by_sentiment": by_sentiment,
            "pending_followups": pending_followups,
            "overdue_followups": overdue_followups,
            "top_performers": [
                {"name": name, "count": count}
                for name, count in top_performers
            ],
            "daily_trend": daily_trend
        }
