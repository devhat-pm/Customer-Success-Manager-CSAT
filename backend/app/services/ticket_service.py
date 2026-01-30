from datetime import datetime, date
from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, and_, or_
import logging

from app.models.support_ticket import (
    SupportTicket,
    TicketComment,
    ProductType,
    TicketPriority,
    TicketStatus,
    CreatorType,
    SLA_THRESHOLDS,
)
from app.models.customer import Customer
from app.models.customer_user import CustomerUser
from app.models.user import User
from app.schemas.support_ticket import TicketCreate, TicketUpdate, CommentResponse
from app.core.exceptions import NotFoundError, BadRequestError
from app.services.email_service import EmailNotificationService

logger = logging.getLogger(__name__)


class TicketService:
    def __init__(self, db: Session):
        self.db = db

    def _get_customer_notification_info(self, ticket: SupportTicket) -> Optional[Dict[str, Any]]:
        """Get customer user info for email notification."""
        # First try the original creator if it's a customer
        if ticket.created_by_customer_user_id:
            customer_user = self.db.query(CustomerUser).filter(
                CustomerUser.id == ticket.created_by_customer_user_id
            ).first()
            if customer_user:
                return {
                    "email": customer_user.email,
                    "name": customer_user.full_name
                }

        # Fallback to customer_contact_email
        if ticket.customer_contact_email:
            return {
                "email": ticket.customer_contact_email,
                "name": None
            }

        # Try to find the primary contact for the customer
        primary_contact = self.db.query(CustomerUser).filter(
            CustomerUser.customer_id == ticket.customer_id,
            CustomerUser.is_primary_contact == True,
            CustomerUser.is_active == True
        ).first()
        if primary_contact:
            return {
                "email": primary_contact.email,
                "name": primary_contact.full_name
            }

        return None

    def generate_ticket_number(self) -> str:
        """
        Generate unique ticket number in format TKT-YYYYMM-XXXX.
        Example: TKT-202411-0001
        """
        now = datetime.utcnow()
        year_month = now.strftime("%Y%m")
        prefix = f"TKT-{year_month}-"

        # Find the highest ticket number for this month
        latest_ticket = (
            self.db.query(SupportTicket)
            .filter(SupportTicket.ticket_number.like(f"{prefix}%"))
            .order_by(desc(SupportTicket.ticket_number))
            .first()
        )

        if latest_ticket:
            # Extract the sequence number and increment
            try:
                current_seq = int(latest_ticket.ticket_number.split("-")[-1])
                next_seq = current_seq + 1
            except (ValueError, IndexError):
                next_seq = 1
        else:
            next_seq = 1

        return f"{prefix}{next_seq:04d}"

    def create(self, ticket_data: TicketCreate, staff_user: Optional[User] = None) -> SupportTicket:
        """Create a new support ticket (staff creation)."""
        # Verify customer exists
        customer = self.db.query(Customer).filter(Customer.id == ticket_data.customer_id).first()
        if not customer:
            raise NotFoundError(detail="Customer not found")

        # Generate unique ticket number
        ticket_number = self.generate_ticket_number()

        ticket = SupportTicket(
            customer_id=ticket_data.customer_id,
            ticket_number=ticket_number,
            subject=ticket_data.subject,
            description=ticket_data.description,
            product=ticket_data.product,
            priority=ticket_data.priority,
            status=TicketStatus.open,
            sla_breached=False,
            created_by_type=CreatorType.staff,
            created_by_staff_user_id=staff_user.id if staff_user else None,
            customer_contact_email=ticket_data.customer_contact_email,
            internal_notes=ticket_data.internal_notes,
            customer_visible_notes=ticket_data.customer_visible_notes,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        self.db.add(ticket)
        self.db.commit()
        self.db.refresh(ticket)

        logger.info(f"Staff created ticket {ticket.ticket_number} for customer {customer.company_name}")
        return ticket

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        customer_id: Optional[UUID] = None,
        product: Optional[ProductType] = None,
        status: Optional[TicketStatus] = None,
        priority: Optional[TicketPriority] = None,
        sla_breached: Optional[bool] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> Tuple[List[SupportTicket], int]:
        """Get all tickets with filtering and pagination."""
        query = self.db.query(SupportTicket).options(joinedload(SupportTicket.customer))

        # Apply filters
        if customer_id:
            query = query.filter(SupportTicket.customer_id == customer_id)

        if product:
            query = query.filter(SupportTicket.product == product)

        if status:
            query = query.filter(SupportTicket.status == status)

        if priority:
            query = query.filter(SupportTicket.priority == priority)

        if sla_breached is not None:
            query = query.filter(SupportTicket.sla_breached == sla_breached)

        if date_from:
            query = query.filter(SupportTicket.created_at >= datetime.combine(date_from, datetime.min.time()))

        if date_to:
            query = query.filter(SupportTicket.created_at <= datetime.combine(date_to, datetime.max.time()))

        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    SupportTicket.ticket_number.ilike(search_pattern),
                    SupportTicket.subject.ilike(search_pattern),
                    SupportTicket.description.ilike(search_pattern),
                )
            )

        # Get total count before pagination
        total = query.count()

        # Apply sorting
        sort_column = getattr(SupportTicket, sort_by, SupportTicket.created_at)
        if sort_order == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())

        # Apply pagination
        tickets = query.offset(skip).limit(limit).all()

        return tickets, total

    def get_by_id(self, ticket_id: UUID) -> SupportTicket:
        """Get ticket by ID."""
        ticket = (
            self.db.query(SupportTicket)
            .options(joinedload(SupportTicket.customer))
            .filter(SupportTicket.id == ticket_id)
            .first()
        )

        if not ticket:
            raise NotFoundError(detail="Ticket not found")

        return ticket

    def get_by_ticket_number(self, ticket_number: str) -> SupportTicket:
        """Get ticket by ticket number."""
        ticket = (
            self.db.query(SupportTicket)
            .options(joinedload(SupportTicket.customer))
            .filter(SupportTicket.ticket_number == ticket_number)
            .first()
        )

        if not ticket:
            raise NotFoundError(detail="Ticket not found")

        return ticket

    def update(
        self,
        ticket_id: UUID,
        ticket_data: TicketUpdate,
        trigger_followup_survey: bool = False,
        staff_user: Optional[User] = None
    ) -> SupportTicket:
        """
        Update a ticket.
        - When status changes to resolved/closed, calculate resolution time and check SLA.
        - Optionally triggers followup survey when resolved (if trigger_followup_survey=True).
        """
        ticket = self.db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()

        if not ticket:
            raise NotFoundError(detail="Ticket not found")

        # Track if status is being changed to resolved/closed
        old_status = ticket.status
        new_status = ticket_data.status if ticket_data.status else old_status
        status_becoming_resolved = (
            new_status in [TicketStatus.resolved, TicketStatus.closed]
            and old_status not in [TicketStatus.resolved, TicketStatus.closed]
        )

        # Update fields
        update_data = ticket_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(ticket, field, value)

        # Handle resolution
        if status_becoming_resolved:
            ticket.resolved_at = datetime.utcnow()

            # Calculate resolution time in hours
            time_diff = ticket.resolved_at - ticket.created_at
            ticket.resolution_time_hours = time_diff.total_seconds() / 3600

            # Check SLA breach
            sla_threshold = SLA_THRESHOLDS.get(ticket.priority, 72)
            if ticket.resolution_time_hours > sla_threshold:
                ticket.sla_breached = True
                logger.warning(
                    f"Ticket {ticket.ticket_number} breached SLA: "
                    f"{ticket.resolution_time_hours:.2f}h > {sla_threshold}h threshold"
                )

        ticket.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(ticket)

        # Send status update email if status changed
        if old_status != new_status:
            try:
                customer_info = self._get_customer_notification_info(ticket)
                if customer_info:
                    email_service = EmailNotificationService(self.db)
                    email_service.send_ticket_status_update(
                        recipient_email=customer_info["email"],
                        recipient_name=customer_info["name"],
                        ticket_id=ticket.id,
                        ticket_number=ticket.ticket_number,
                        ticket_subject=ticket.subject,
                        old_status=old_status.value,
                        new_status=new_status.value
                    )
            except Exception as e:
                logger.error(f"Failed to queue status update email: {e}")

        # Trigger followup survey if requested and status is being resolved
        if trigger_followup_survey and status_becoming_resolved:
            try:
                from app.services.survey_request_service import SurveyRequestService
                survey_service = SurveyRequestService(self.db)
                survey_service.create_ticket_followup_survey(ticket, staff_user)
            except Exception as e:
                logger.warning(f"Failed to create followup survey for ticket {ticket.ticket_number}: {e}")

        logger.info(f"Updated ticket {ticket.ticket_number}")
        return ticket

    def delete(self, ticket_id: UUID) -> None:
        """Delete a ticket."""
        ticket = self.db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()

        if not ticket:
            raise NotFoundError(detail="Ticket not found")

        ticket_number = ticket.ticket_number
        self.db.delete(ticket)
        self.db.commit()

        logger.info(f"Deleted ticket {ticket_number}")

    def get_stats(self, customer_id: Optional[UUID] = None) -> Dict[str, Any]:
        """
        Get ticket statistics.
        Optionally filter by customer_id.
        """
        query = self.db.query(SupportTicket)

        if customer_id:
            query = query.filter(SupportTicket.customer_id == customer_id)

        all_tickets = query.all()
        total = len(all_tickets)

        if total == 0:
            return {
                "total_tickets": 0,
                "open_tickets": 0,
                "in_progress_tickets": 0,
                "resolved_tickets": 0,
                "closed_tickets": 0,
                "by_priority": {p.value: 0 for p in TicketPriority},
                "by_product": {p.value: 0 for p in ProductType},
                "sla_breach_count": 0,
                "sla_breach_rate": 0.0,
                "avg_resolution_time_hours": None,
                "critical_open_count": 0,
            }

        # Count by status
        open_count = sum(1 for t in all_tickets if t.status == TicketStatus.open)
        in_progress_count = sum(1 for t in all_tickets if t.status == TicketStatus.in_progress)
        resolved_count = sum(1 for t in all_tickets if t.status == TicketStatus.resolved)
        closed_count = sum(1 for t in all_tickets if t.status == TicketStatus.closed)

        # Count by priority
        by_priority = {}
        for p in TicketPriority:
            by_priority[p.value] = sum(1 for t in all_tickets if t.priority == p)

        # Count by product
        by_product = {}
        for p in ProductType:
            by_product[p.value] = sum(1 for t in all_tickets if t.product == p)

        # SLA breach stats
        sla_breach_count = sum(1 for t in all_tickets if t.sla_breached)
        sla_breach_rate = (sla_breach_count / total * 100) if total > 0 else 0.0

        # Average resolution time (only for resolved/closed tickets)
        resolved_tickets = [
            t for t in all_tickets
            if t.status in [TicketStatus.resolved, TicketStatus.closed]
            and t.resolution_time_hours is not None
        ]
        avg_resolution_time = None
        if resolved_tickets:
            avg_resolution_time = sum(t.resolution_time_hours for t in resolved_tickets) / len(resolved_tickets)

        # Critical open tickets
        critical_open_count = sum(
            1 for t in all_tickets
            if t.priority == TicketPriority.critical
            and t.status in [TicketStatus.open, TicketStatus.in_progress]
        )

        return {
            "total_tickets": total,
            "open_tickets": open_count,
            "in_progress_tickets": in_progress_count,
            "resolved_tickets": resolved_count,
            "closed_tickets": closed_count,
            "by_priority": by_priority,
            "by_product": by_product,
            "sla_breach_count": sla_breach_count,
            "sla_breach_rate": round(sla_breach_rate, 2),
            "avg_resolution_time_hours": round(avg_resolution_time, 2) if avg_resolution_time else None,
            "critical_open_count": critical_open_count,
        }

    def get_critical_tickets(self) -> Tuple[List[SupportTicket], int]:
        """
        Get all critical priority tickets that are open or in progress.
        Sorted by created_at ascending (oldest first - most urgent).
        """
        query = (
            self.db.query(SupportTicket)
            .options(joinedload(SupportTicket.customer))
            .filter(
                SupportTicket.priority == TicketPriority.critical,
                SupportTicket.status.in_([TicketStatus.open, TicketStatus.in_progress]),
            )
            .order_by(SupportTicket.created_at.asc())
        )

        total = query.count()
        tickets = query.all()

        return tickets, total

    def get_customer_tickets(
        self,
        customer_id: UUID,
        skip: int = 0,
        limit: int = 50,
        include_closed: bool = True,
    ) -> Tuple[List[SupportTicket], int]:
        """Get all tickets for a specific customer."""
        query = (
            self.db.query(SupportTicket)
            .filter(SupportTicket.customer_id == customer_id)
        )

        if not include_closed:
            query = query.filter(SupportTicket.status != TicketStatus.closed)

        total = query.count()
        tickets = query.order_by(desc(SupportTicket.created_at)).offset(skip).limit(limit).all()

        return tickets, total

    def check_sla_breaches(self) -> List[SupportTicket]:
        """
        Check all open/in-progress tickets for SLA breaches.
        Updates sla_breached flag and returns list of newly breached tickets.
        """
        now = datetime.utcnow()
        newly_breached = []

        # Get all open/in-progress tickets that haven't been marked as breached
        tickets = (
            self.db.query(SupportTicket)
            .filter(
                SupportTicket.status.in_([TicketStatus.open, TicketStatus.in_progress]),
                SupportTicket.sla_breached == False,
            )
            .all()
        )

        for ticket in tickets:
            # Calculate hours since creation
            hours_open = (now - ticket.created_at).total_seconds() / 3600
            sla_threshold = SLA_THRESHOLDS.get(ticket.priority, 72)

            if hours_open > sla_threshold:
                ticket.sla_breached = True
                ticket.updated_at = now
                newly_breached.append(ticket)
                logger.warning(
                    f"Ticket {ticket.ticket_number} breached SLA: "
                    f"{hours_open:.2f}h > {sla_threshold}h threshold"
                )

        if newly_breached:
            self.db.commit()

        return newly_breached

    def get_sla_at_risk_tickets(self, threshold_percentage: float = 80) -> List[Dict[str, Any]]:
        """
        Get tickets that are approaching SLA breach (e.g., 80% of SLA time elapsed).
        """
        now = datetime.utcnow()
        at_risk = []

        tickets = (
            self.db.query(SupportTicket)
            .options(joinedload(SupportTicket.customer))
            .filter(
                SupportTicket.status.in_([TicketStatus.open, TicketStatus.in_progress]),
                SupportTicket.sla_breached == False,
            )
            .all()
        )

        for ticket in tickets:
            # Ensure both datetimes are naive for comparison
            created_at = ticket.created_at.replace(tzinfo=None) if ticket.created_at.tzinfo else ticket.created_at
            hours_open = (now - created_at).total_seconds() / 3600
            sla_threshold = SLA_THRESHOLDS.get(ticket.priority, 72)
            percentage_used = (hours_open / sla_threshold * 100) if sla_threshold > 0 else 100

            if percentage_used >= threshold_percentage:
                at_risk.append({
                    "ticket": ticket,
                    "hours_open": round(hours_open, 2),
                    "sla_threshold_hours": sla_threshold,
                    "percentage_used": round(percentage_used, 2),
                    "hours_remaining": round(max(0, sla_threshold - hours_open), 2),
                })

        # Sort by percentage used descending (most urgent first)
        at_risk.sort(key=lambda x: x["percentage_used"], reverse=True)

        return at_risk

    # ==================== Comment Methods ====================

    def get_ticket_with_comments(self, ticket_id: UUID, include_internal: bool = True) -> SupportTicket:
        """Get ticket with all comments loaded."""
        ticket = (
            self.db.query(SupportTicket)
            .options(
                joinedload(SupportTicket.customer),
                joinedload(SupportTicket.comments)
            )
            .filter(SupportTicket.id == ticket_id)
            .first()
        )

        if not ticket:
            raise NotFoundError(detail="Ticket not found")

        return ticket

    def get_comments(self, ticket_id: UUID, include_internal: bool = True) -> List[TicketComment]:
        """Get comments for a ticket."""
        query = self.db.query(TicketComment).filter(TicketComment.ticket_id == ticket_id)

        if not include_internal:
            query = query.filter(TicketComment.is_internal == False)

        return query.order_by(TicketComment.created_at.asc()).all()

    def add_staff_comment(
        self,
        ticket_id: UUID,
        staff_user: User,
        comment_text: str,
        is_internal: bool = False,
        attachments: List[str] = None
    ) -> TicketComment:
        """Add a comment from staff."""
        ticket = self.get_by_id(ticket_id)

        comment = TicketComment(
            ticket_id=ticket.id,
            comment_text=comment_text,
            commenter_type=CreatorType.staff,
            commenter_staff_user_id=staff_user.id,
            is_internal=is_internal,
            attachments=attachments or []
        )

        self.db.add(comment)
        ticket.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(comment)

        # Send email to customer for non-internal comments
        if not is_internal:
            try:
                customer_info = self._get_customer_notification_info(ticket)
                if customer_info:
                    email_service = EmailNotificationService(self.db)
                    email_service.send_ticket_comment_to_customer(
                        recipient_email=customer_info["email"],
                        recipient_name=customer_info["name"],
                        ticket_id=ticket.id,
                        ticket_number=ticket.ticket_number,
                        ticket_subject=ticket.subject,
                        commenter_name=staff_user.full_name or "Support Team",
                        comment_text=comment_text
                    )
            except Exception as e:
                logger.error(f"Failed to queue comment notification email: {e}")

        logger.info(f"Staff {staff_user.email} added {'internal ' if is_internal else ''}comment to ticket {ticket.ticket_number}")
        return comment

    def add_internal_note(
        self,
        ticket_id: UUID,
        staff_user: User,
        note_text: str
    ) -> TicketComment:
        """Quick method to add internal note (always internal)."""
        return self.add_staff_comment(
            ticket_id=ticket_id,
            staff_user=staff_user,
            comment_text=note_text,
            is_internal=True
        )

    def get_comment_count(self, ticket_id: UUID, include_internal: bool = True) -> int:
        """Get comment count for a ticket."""
        query = self.db.query(TicketComment).filter(TicketComment.ticket_id == ticket_id)
        if not include_internal:
            query = query.filter(TicketComment.is_internal == False)
        return query.count()

    def to_comment_response(self, comment: TicketComment) -> CommentResponse:
        """Convert comment to response schema."""
        commenter_name = None
        if comment.commenter_type == CreatorType.customer and comment.commenter_customer_user:
            commenter_name = comment.commenter_customer_user.full_name
        elif comment.commenter_type == CreatorType.staff and comment.commenter_staff_user:
            commenter_name = comment.commenter_staff_user.full_name

        return CommentResponse(
            id=comment.id,
            ticket_id=comment.ticket_id,
            comment_text=comment.comment_text,
            commenter_type=comment.commenter_type,
            commenter_name=commenter_name,
            commenter_customer_user_id=comment.commenter_customer_user_id,
            commenter_staff_user_id=comment.commenter_staff_user_id,
            is_internal=comment.is_internal,
            attachments=comment.attachments or [],
            created_at=comment.created_at
        )
