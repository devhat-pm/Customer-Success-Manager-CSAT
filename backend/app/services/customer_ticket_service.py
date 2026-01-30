"""
Service for Customer Portal ticket operations.
Handles ticket creation, viewing, and commenting by customers.
"""
from datetime import datetime, date
from typing import Optional, List, Tuple
from uuid import UUID
import logging

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.models.customer import Customer
from app.models.customer_user import CustomerUser
from app.models.support_ticket import (
    SupportTicket, TicketComment, ProductType, TicketPriority,
    TicketStatus, CreatorType, SLA_THRESHOLDS
)
from app.models.product_deployment import ProductDeployment
from app.core.exceptions import NotFoundError, BadRequestError
from app.schemas.support_ticket import (
    CustomerTicketCreate, CustomerTicketResponse, CustomerTicketDetail,
    CommentResponse
)
from app.services.email_service import EmailNotificationService
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


class CustomerTicketService:
    """Service for customer ticket operations."""

    def __init__(self, db: Session):
        self.db = db

    def _get_staff_emails_for_notification(self, customer: Customer) -> List[str]:
        """Get list of staff emails to notify about tickets."""
        emails = []

        # Always notify the assigned account manager if exists
        if customer.account_manager_id:
            account_manager = self.db.query(User).filter(User.id == customer.account_manager_id).first()
            if account_manager and account_manager.email:
                emails.append(account_manager.email)

        # Get all managers and admins
        managers_admins = self.db.query(User).filter(
            User.is_active == True,
            User.role.in_([UserRole.MANAGER, UserRole.ADMIN])
        ).all()

        for user in managers_admins:
            if user.email and user.email not in emails:
                emails.append(user.email)

        return emails[:5]  # Limit to 5 recipients

    def _generate_ticket_number(self) -> str:
        """Generate a unique ticket number in format TKT-YYYYMM-XXXX."""
        now = datetime.utcnow()
        prefix = f"TKT-{now.strftime('%Y%m')}-"

        # Get the latest ticket number for this month
        latest = self.db.query(SupportTicket).filter(
            SupportTicket.ticket_number.like(f"{prefix}%")
        ).order_by(SupportTicket.ticket_number.desc()).first()

        if latest:
            try:
                last_num = int(latest.ticket_number.split('-')[-1])
                new_num = last_num + 1
            except ValueError:
                new_num = 1
        else:
            new_num = 1

        return f"{prefix}{new_num:04d}"

    def get_customer_products(self, customer_id: UUID) -> List[str]:
        """Get list of products deployed for a customer."""
        # Get from deployed_products on customer
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if customer and customer.deployed_products:
            return customer.deployed_products

        # Fallback to product_deployments table
        deployments = self.db.query(ProductDeployment).filter(
            ProductDeployment.customer_id == customer_id,
            ProductDeployment.is_active == True
        ).all()

        if deployments:
            return list(set(d.product_name for d in deployments))

        # Default to all products if no deployments found
        return [p.value for p in ProductType]

    def create_customer_ticket(
        self,
        customer_user: CustomerUser,
        customer: Customer,
        ticket_data: CustomerTicketCreate
    ) -> SupportTicket:
        """Create a ticket from customer portal."""
        ticket_number = self._generate_ticket_number()

        ticket = SupportTicket(
            customer_id=customer.id,
            ticket_number=ticket_number,
            subject=ticket_data.subject,
            description=ticket_data.description,
            product=ticket_data.product,
            priority=ticket_data.priority,
            status=TicketStatus.open,
            created_by_type=CreatorType.customer,
            created_by_customer_user_id=customer_user.id,
            customer_contact_email=customer_user.email,
            sla_breached=False
        )

        self.db.add(ticket)
        self.db.commit()
        self.db.refresh(ticket)

        # Send email notifications
        try:
            email_service = EmailNotificationService(self.db)

            # Email to customer
            email_service.send_ticket_created_to_customer(
                recipient_email=customer_user.email,
                recipient_name=customer_user.full_name,
                ticket_id=ticket.id,
                ticket_number=ticket.ticket_number,
                ticket_subject=ticket.subject,
                product=ticket.product.value,
                priority=ticket.priority.value
            )

            # Email to staff
            staff_emails = self._get_staff_emails_for_notification(customer)
            if staff_emails:
                email_service.send_ticket_created_to_staff(
                    staff_emails=staff_emails,
                    company_name=customer.company_name,
                    submitter_name=customer_user.full_name,
                    submitter_email=customer_user.email,
                    ticket_id=ticket.id,
                    ticket_number=ticket.ticket_number,
                    ticket_subject=ticket.subject,
                    product=ticket.product.value,
                    priority=ticket.priority.value,
                    description=ticket.description
                )
        except Exception as e:
            logger.error(f"Failed to queue ticket creation emails: {e}")

        logger.info(f"Customer {customer_user.email} created ticket {ticket_number}")
        return ticket

    def get_customer_tickets(
        self,
        customer_id: UUID,
        skip: int = 0,
        limit: int = 50,
        status: Optional[TicketStatus] = None,
        product: Optional[ProductType] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None
    ) -> Tuple[List[SupportTicket], int]:
        """Get all tickets for a customer company."""
        query = self.db.query(SupportTicket).filter(
            SupportTicket.customer_id == customer_id
        )

        if status:
            query = query.filter(SupportTicket.status == status)

        if product:
            query = query.filter(SupportTicket.product == product)

        if date_from:
            query = query.filter(SupportTicket.created_at >= datetime.combine(date_from, datetime.min.time()))

        if date_to:
            query = query.filter(SupportTicket.created_at <= datetime.combine(date_to, datetime.max.time()))

        total = query.count()
        tickets = query.order_by(SupportTicket.created_at.desc()).offset(skip).limit(limit).all()

        return tickets, total

    def get_ticket_for_customer(self, ticket_id: UUID, customer_id: UUID) -> SupportTicket:
        """Get a ticket ensuring it belongs to the customer."""
        ticket = self.db.query(SupportTicket).filter(
            SupportTicket.id == ticket_id,
            SupportTicket.customer_id == customer_id
        ).first()

        if not ticket:
            raise NotFoundError(detail="Ticket not found")

        return ticket

    def close_ticket(
        self,
        ticket_id: UUID,
        customer_id: UUID,
        customer_user: CustomerUser,
        feedback: Optional[str] = None
    ) -> SupportTicket:
        """Close a ticket (customer action)."""
        ticket = self.get_ticket_for_customer(ticket_id, customer_id)

        if ticket.status == TicketStatus.closed:
            raise BadRequestError(detail="Ticket is already closed")

        # Add feedback as a comment if provided
        if feedback:
            comment = TicketComment(
                ticket_id=ticket.id,
                comment_text=f"Closing ticket with feedback: {feedback}",
                commenter_type=CreatorType.customer,
                commenter_customer_user_id=customer_user.id,
                is_internal=False
            )
            self.db.add(comment)

        # Update ticket status
        ticket.status = TicketStatus.closed
        if not ticket.resolved_at:
            ticket.resolved_at = datetime.utcnow()
            # Calculate resolution time
            time_delta = ticket.resolved_at - ticket.created_at
            ticket.resolution_time_hours = time_delta.total_seconds() / 3600

            # Check SLA breach
            sla_threshold = SLA_THRESHOLDS.get(ticket.priority, 24)
            if ticket.resolution_time_hours > sla_threshold:
                ticket.sla_breached = True

        ticket.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(ticket)

        logger.info(f"Customer closed ticket {ticket.ticket_number}")
        return ticket

    def reopen_ticket(self, ticket_id: UUID, customer_id: UUID) -> SupportTicket:
        """Reopen a closed ticket."""
        ticket = self.get_ticket_for_customer(ticket_id, customer_id)

        if ticket.status != TicketStatus.closed:
            raise BadRequestError(detail="Only closed tickets can be reopened")

        ticket.status = TicketStatus.open
        ticket.resolved_at = None
        ticket.resolution_time_hours = None
        ticket.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(ticket)

        logger.info(f"Customer reopened ticket {ticket.ticket_number}")
        return ticket

    def get_comments_for_customer(self, ticket_id: UUID) -> List[TicketComment]:
        """Get non-internal comments for a ticket."""
        return self.db.query(TicketComment).filter(
            TicketComment.ticket_id == ticket_id,
            TicketComment.is_internal == False
        ).order_by(TicketComment.created_at.asc()).all()

    def add_customer_comment(
        self,
        ticket_id: UUID,
        customer_id: UUID,
        customer_user: CustomerUser,
        comment_text: str,
        attachments: List[str] = None
    ) -> TicketComment:
        """Add a comment from a customer."""
        # Verify ticket belongs to customer
        ticket = self.get_ticket_for_customer(ticket_id, customer_id)

        comment = TicketComment(
            ticket_id=ticket.id,
            comment_text=comment_text,
            commenter_type=CreatorType.customer,
            commenter_customer_user_id=customer_user.id,
            is_internal=False,  # Customer comments are never internal
            attachments=attachments or []
        )

        self.db.add(comment)

        # Update ticket timestamp
        ticket.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(comment)

        # Send email notification to staff
        try:
            customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
            if customer:
                email_service = EmailNotificationService(self.db)
                staff_emails = self._get_staff_emails_for_notification(customer)
                if staff_emails:
                    email_service.send_ticket_comment_to_staff(
                        staff_emails=staff_emails,
                        company_name=customer.company_name,
                        commenter_name=customer_user.full_name,
                        commenter_email=customer_user.email,
                        ticket_id=ticket.id,
                        ticket_number=ticket.ticket_number,
                        ticket_subject=ticket.subject,
                        comment_text=comment_text
                    )
        except Exception as e:
            logger.error(f"Failed to queue comment notification email: {e}")

        logger.info(f"Customer {customer_user.email} added comment to ticket {ticket.ticket_number}")
        return comment

    def get_customer_ticket_stats(self, customer_id: UUID) -> dict:
        """Get ticket statistics for a customer."""
        base_query = self.db.query(SupportTicket).filter(
            SupportTicket.customer_id == customer_id
        )

        total = base_query.count()
        open_count = base_query.filter(SupportTicket.status == TicketStatus.open).count()
        in_progress_count = base_query.filter(SupportTicket.status == TicketStatus.in_progress).count()
        resolved_count = base_query.filter(SupportTicket.status == TicketStatus.resolved).count()
        closed_count = base_query.filter(SupportTicket.status == TicketStatus.closed).count()

        return {
            "total_tickets": total,
            "open_tickets": open_count,
            "in_progress_tickets": in_progress_count,
            "resolved_tickets": resolved_count,
            "closed_tickets": closed_count,
            "active_tickets": open_count + in_progress_count
        }

    def to_customer_response(self, ticket: SupportTicket) -> CustomerTicketResponse:
        """Convert ticket to customer-safe response (no internal fields)."""
        comment_count = self.db.query(TicketComment).filter(
            TicketComment.ticket_id == ticket.id,
            TicketComment.is_internal == False
        ).count()

        return CustomerTicketResponse(
            id=ticket.id,
            ticket_number=ticket.ticket_number,
            subject=ticket.subject,
            description=ticket.description,
            product=ticket.product,
            priority=ticket.priority,
            status=ticket.status,
            sla_breached=ticket.sla_breached,
            customer_visible_notes=ticket.customer_visible_notes,
            created_by_type=ticket.created_by_type,
            created_at=ticket.created_at,
            updated_at=ticket.updated_at,
            resolved_at=ticket.resolved_at,
            comment_count=comment_count
        )

    def to_customer_detail(self, ticket: SupportTicket, company_name: str) -> CustomerTicketDetail:
        """Convert ticket to detailed customer view with comments."""
        comments = self.get_comments_for_customer(ticket.id)

        return CustomerTicketDetail(
            id=ticket.id,
            ticket_number=ticket.ticket_number,
            subject=ticket.subject,
            description=ticket.description,
            product=ticket.product,
            priority=ticket.priority,
            status=ticket.status,
            sla_breached=ticket.sla_breached,
            customer_visible_notes=ticket.customer_visible_notes,
            created_by_type=ticket.created_by_type,
            created_at=ticket.created_at,
            updated_at=ticket.updated_at,
            resolved_at=ticket.resolved_at,
            comment_count=len(comments),
            comments=[self.to_comment_response(c) for c in comments],
            company_name=company_name
        )

    def to_comment_response(self, comment: TicketComment) -> CommentResponse:
        """Convert comment to response schema."""
        # Get commenter name
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
