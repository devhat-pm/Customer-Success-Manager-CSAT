"""
Service for Survey Request operations (staff-side).
Handles sending surveys, managing requests, and manual CSAT entry.
"""
from datetime import datetime, timedelta
from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
import secrets
import logging

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.models.customer import Customer
from app.models.customer_user import CustomerUser
from app.models.user import User
from app.models.csat_survey import (
    CSATSurvey, SurveyRequest, SurveyType, SubmissionVia, SurveyRequestStatus
)
from app.models.support_ticket import SupportTicket, TicketStatus
from app.models.product_deployment import ProductDeployment
from app.models.alert import Alert, AlertType, Severity
from app.core.exceptions import NotFoundError, BadRequestError, ValidationError
from app.schemas.csat_survey import (
    SurveyRequestCreate,
    BulkSurveyRequestCreate,
    SurveyRequestResponse,
    StaffManualCSATEntry,
)
from app.services.email_service import EmailNotificationService

logger = logging.getLogger(__name__)

# Configuration
MAX_SURVEYS_PER_CUSTOMER_PER_MONTH = 2
CSAT_LOW_THRESHOLD = 2


class SurveyRequestService:
    """Service for managing survey requests (staff operations)."""

    def __init__(self, db: Session):
        self.db = db

    def _generate_survey_token(self) -> str:
        """Generate a unique survey token."""
        return secrets.token_urlsafe(32)

    def _get_target_emails(
        self,
        customer_id: UUID,
        target_type: str,
        specific_email: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get target email addresses based on target type.
        Returns list of dicts with email and customer_user_id (if applicable).
        """
        targets = []

        if target_type == "specific" and specific_email:
            # Check if this email belongs to a customer user
            customer_user = self.db.query(CustomerUser).filter(
                CustomerUser.customer_id == customer_id,
                CustomerUser.email == specific_email,
                CustomerUser.is_active == True
            ).first()

            targets.append({
                "email": specific_email,
                "customer_user_id": customer_user.id if customer_user else None
            })
        elif target_type == "primary":
            # Get primary contact
            primary = self.db.query(CustomerUser).filter(
                CustomerUser.customer_id == customer_id,
                CustomerUser.is_primary_contact == True,
                CustomerUser.is_active == True
            ).first()

            if primary:
                targets.append({
                    "email": primary.email,
                    "customer_user_id": primary.id
                })
            else:
                # Fallback to customer contact
                customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
                if customer and customer.contact_email:
                    targets.append({
                        "email": customer.contact_email,
                        "customer_user_id": None
                    })
        else:  # "all"
            # Get all active customer users
            users = self.db.query(CustomerUser).filter(
                CustomerUser.customer_id == customer_id,
                CustomerUser.is_active == True
            ).all()

            for user in users:
                targets.append({
                    "email": user.email,
                    "customer_user_id": user.id
                })

            # If no portal users, use customer contact
            if not targets:
                customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
                if customer and customer.contact_email:
                    targets.append({
                        "email": customer.contact_email,
                        "customer_user_id": None
                    })

        return targets

    def _check_survey_fatigue(self, customer_id: UUID) -> bool:
        """
        Check if customer has too many pending surveys.
        Returns True if survey fatigue limit is reached.
        """
        # Count pending surveys in the last month
        one_month_ago = datetime.utcnow() - timedelta(days=30)

        pending_count = self.db.query(SurveyRequest).filter(
            SurveyRequest.customer_id == customer_id,
            SurveyRequest.created_at >= one_month_ago,
            SurveyRequest.status.in_([SurveyRequestStatus.pending, SurveyRequestStatus.completed])
        ).count()

        return pending_count >= MAX_SURVEYS_PER_CUSTOMER_PER_MONTH

    def create_survey_request(
        self,
        data: SurveyRequestCreate,
        staff_user: User
    ) -> List[SurveyRequest]:
        """
        Create survey request(s) and queue for sending.
        Returns list of created survey requests (one per target).
        """
        # Verify customer exists
        customer = self.db.query(Customer).filter(Customer.id == data.customer_id).first()
        if not customer:
            raise NotFoundError(detail="Customer not found")

        # Check for ticket if linked
        linked_ticket = None
        if data.linked_ticket_id:
            linked_ticket = self.db.query(SupportTicket).filter(
                SupportTicket.id == data.linked_ticket_id,
                SupportTicket.customer_id == data.customer_id
            ).first()
            if not linked_ticket:
                raise NotFoundError(detail="Ticket not found or doesn't belong to customer")

            # Check if survey already exists for this ticket
            existing_survey = self.db.query(SurveyRequest).filter(
                SurveyRequest.linked_ticket_id == data.linked_ticket_id,
                SurveyRequest.status.in_([SurveyRequestStatus.pending, SurveyRequestStatus.completed])
            ).first()
            if existing_survey:
                raise BadRequestError(detail="A survey request already exists for this ticket")

        # Get target emails
        targets = self._get_target_emails(
            data.customer_id,
            data.target_type,
            data.target_email
        )

        if not targets:
            raise BadRequestError(detail="No valid email targets found for this customer")

        # Create survey requests
        created_requests = []
        expires_at = datetime.utcnow() + timedelta(days=data.expires_in_days)

        for target in targets:
            survey_request = SurveyRequest(
                customer_id=data.customer_id,
                target_email=target["email"],
                target_customer_user_id=target.get("customer_user_id"),
                survey_type=data.survey_type,
                linked_ticket_id=data.linked_ticket_id,
                custom_message=data.custom_message,
                unique_survey_token=self._generate_survey_token(),
                sent_by_staff_id=staff_user.id,
                status=SurveyRequestStatus.pending,
                created_at=datetime.utcnow(),
                expires_at=expires_at
            )

            self.db.add(survey_request)
            created_requests.append(survey_request)

        self.db.commit()

        # Refresh all requests
        for req in created_requests:
            self.db.refresh(req)

        # Send survey request emails
        try:
            email_service = EmailNotificationService(self.db)
            ticket_number = linked_ticket.ticket_number if linked_ticket else None
            ticket_subject = linked_ticket.subject if linked_ticket else None

            for req in created_requests:
                # Get recipient name
                recipient_name = None
                if req.target_customer_user_id:
                    customer_user = self.db.query(CustomerUser).filter(
                        CustomerUser.id == req.target_customer_user_id
                    ).first()
                    if customer_user:
                        recipient_name = customer_user.full_name

                email_service.send_survey_request(
                    recipient_email=req.target_email,
                    recipient_name=recipient_name,
                    survey_id=req.id,
                    survey_type=req.survey_type.value,
                    survey_token=req.unique_survey_token,
                    expiry_date=req.expires_at,
                    custom_message=req.custom_message,
                    ticket_number=ticket_number,
                    ticket_subject=ticket_subject
                )
                # Mark as sent
                req.sent_at = datetime.utcnow()

            self.db.commit()
        except Exception as e:
            logger.error(f"Failed to queue survey request emails: {e}")

        logger.info(
            f"Created {len(created_requests)} survey request(s) for customer {customer.company_name} "
            f"(type: {data.survey_type.value}) by {staff_user.email}"
        )

        return created_requests

    def create_bulk_survey_requests(
        self,
        data: BulkSurveyRequestCreate,
        staff_user: User
    ) -> Tuple[List[SurveyRequest], List[Dict[str, Any]]]:
        """
        Create survey requests for multiple customers.
        Returns (created_requests, errors).
        """
        created_requests = []
        errors = []

        for customer_id in data.customer_ids:
            try:
                # Check survey fatigue
                if self._check_survey_fatigue(customer_id):
                    customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
                    errors.append({
                        "customer_id": str(customer_id),
                        "customer_name": customer.company_name if customer else "Unknown",
                        "error": "Survey fatigue limit reached (max 2 per month)"
                    })
                    continue

                single_request = SurveyRequestCreate(
                    customer_id=customer_id,
                    survey_type=data.survey_type,
                    target_type=data.target_type,
                    custom_message=data.custom_message,
                    expires_in_days=data.expires_in_days
                )

                requests = self.create_survey_request(single_request, staff_user)
                created_requests.extend(requests)

            except Exception as e:
                customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
                errors.append({
                    "customer_id": str(customer_id),
                    "customer_name": customer.company_name if customer else "Unknown",
                    "error": str(e)
                })

        return created_requests, errors

    def create_ticket_followup_survey(
        self,
        ticket: SupportTicket,
        staff_user: Optional[User] = None
    ) -> Optional[SurveyRequest]:
        """
        Create automatic ticket followup survey after resolution.
        Called when ticket status changes to resolved/closed.
        """
        # Check if survey already exists for this ticket
        existing = self.db.query(SurveyRequest).filter(
            SurveyRequest.linked_ticket_id == ticket.id,
            SurveyRequest.status.in_([SurveyRequestStatus.pending, SurveyRequestStatus.completed])
        ).first()
        if existing:
            logger.debug(f"Survey already exists for ticket {ticket.ticket_number}")
            return None

        # Check if CSAT already submitted for this ticket
        existing_csat = self.db.query(CSATSurvey).filter(
            CSATSurvey.linked_ticket_id == ticket.id
        ).first()
        if existing_csat:
            logger.debug(f"CSAT already submitted for ticket {ticket.ticket_number}")
            return None

        # Check survey fatigue
        if self._check_survey_fatigue(ticket.customer_id):
            logger.debug(f"Survey fatigue limit reached for customer of ticket {ticket.ticket_number}")
            return None

        # Determine target email
        target_email = ticket.customer_contact_email
        target_customer_user_id = ticket.created_by_customer_user_id

        if not target_email and ticket.created_by_customer_user:
            target_email = ticket.created_by_customer_user.email

        if not target_email:
            # Fallback to customer primary contact
            primary = self.db.query(CustomerUser).filter(
                CustomerUser.customer_id == ticket.customer_id,
                CustomerUser.is_primary_contact == True,
                CustomerUser.is_active == True
            ).first()
            if primary:
                target_email = primary.email
                target_customer_user_id = primary.id

        if not target_email:
            logger.warning(f"No email target found for ticket {ticket.ticket_number} followup survey")
            return None

        # Create survey request
        survey_request = SurveyRequest(
            customer_id=ticket.customer_id,
            target_email=target_email,
            target_customer_user_id=target_customer_user_id,
            survey_type=SurveyType.ticket_followup,
            linked_ticket_id=ticket.id,
            custom_message=f"Thank you for contacting support. We'd love to hear your feedback about ticket {ticket.ticket_number}.",
            unique_survey_token=self._generate_survey_token(),
            sent_by_staff_id=staff_user.id if staff_user else None,
            status=SurveyRequestStatus.pending,
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=7)  # 7 days for ticket followup
        )

        self.db.add(survey_request)
        self.db.commit()
        self.db.refresh(survey_request)

        # Send ticket resolution survey email
        try:
            email_service = EmailNotificationService(self.db)

            # Get recipient name
            recipient_name = None
            if target_customer_user_id:
                customer_user = self.db.query(CustomerUser).filter(
                    CustomerUser.id == target_customer_user_id
                ).first()
                if customer_user:
                    recipient_name = customer_user.full_name

            # Calculate resolution time
            resolution_time_hours = 0
            if ticket.resolution_time_hours:
                resolution_time_hours = ticket.resolution_time_hours
            elif ticket.resolved_at:
                time_diff = ticket.resolved_at - ticket.created_at
                resolution_time_hours = time_diff.total_seconds() / 3600

            email_service.send_ticket_resolution_survey(
                recipient_email=target_email,
                recipient_name=recipient_name,
                survey_id=survey_request.id,
                survey_token=survey_request.unique_survey_token,
                ticket_number=ticket.ticket_number,
                ticket_subject=ticket.subject,
                resolution_time_hours=resolution_time_hours
            )
            survey_request.sent_at = datetime.utcnow()
            self.db.commit()
        except Exception as e:
            logger.error(f"Failed to queue ticket resolution survey email: {e}")

        logger.info(f"Created ticket followup survey for ticket {ticket.ticket_number}")
        return survey_request

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        customer_id: Optional[UUID] = None,
        status: Optional[SurveyRequestStatus] = None,
        survey_type: Optional[SurveyType] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Tuple[List[SurveyRequest], int]:
        """Get all survey requests with filters."""
        query = self.db.query(SurveyRequest)

        if customer_id:
            query = query.filter(SurveyRequest.customer_id == customer_id)

        if status:
            query = query.filter(SurveyRequest.status == status)

        if survey_type:
            query = query.filter(SurveyRequest.survey_type == survey_type)

        if start_date:
            query = query.filter(SurveyRequest.created_at >= start_date)

        if end_date:
            query = query.filter(SurveyRequest.created_at <= end_date)

        total = query.count()
        requests = query.order_by(SurveyRequest.created_at.desc()).offset(skip).limit(limit).all()

        return requests, total

    def get_by_id(self, request_id: UUID) -> SurveyRequest:
        """Get survey request by ID."""
        request = self.db.query(SurveyRequest).filter(SurveyRequest.id == request_id).first()
        if not request:
            raise NotFoundError(detail="Survey request not found")
        return request

    def resend_reminder(self, request_id: UUID, staff_user: User) -> SurveyRequest:
        """Resend reminder for a pending survey."""
        request = self.get_by_id(request_id)

        if request.status != SurveyRequestStatus.pending:
            raise BadRequestError(detail=f"Cannot resend reminder for {request.status.value} survey")

        if request.is_expired:
            request.status = SurveyRequestStatus.expired
            self.db.commit()
            raise BadRequestError(detail="Survey has expired")

        # Send reminder email
        try:
            email_service = EmailNotificationService(self.db)

            # Get recipient name
            recipient_name = None
            if request.target_customer_user_id:
                customer_user = self.db.query(CustomerUser).filter(
                    CustomerUser.id == request.target_customer_user_id
                ).first()
                if customer_user:
                    recipient_name = customer_user.full_name

            ticket_number = None
            ticket_subject = None
            if request.linked_ticket:
                ticket_number = request.linked_ticket.ticket_number
                ticket_subject = request.linked_ticket.subject

            email_service.send_survey_reminder(
                recipient_email=request.target_email,
                recipient_name=recipient_name,
                survey_id=request.id,
                survey_token=request.unique_survey_token,
                expiry_date=request.expires_at,
                ticket_number=ticket_number,
                ticket_subject=ticket_subject
            )
        except Exception as e:
            logger.error(f"Failed to queue survey reminder email: {e}")

        # Update reminder timestamp
        request.reminder_sent_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(request)

        logger.info(f"Reminder sent for survey request {request.id} by {staff_user.email}")
        return request

    def cancel_survey_request(self, request_id: UUID, staff_user: User) -> SurveyRequest:
        """Cancel a pending survey request."""
        request = self.get_by_id(request_id)

        if request.status != SurveyRequestStatus.pending:
            raise BadRequestError(detail=f"Cannot cancel {request.status.value} survey")

        request.status = SurveyRequestStatus.cancelled
        request.cancelled_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(request)

        logger.info(f"Survey request {request.id} cancelled by {staff_user.email}")
        return request

    def create_manual_csat_entry(
        self,
        data: StaffManualCSATEntry,
        staff_user: User
    ) -> CSATSurvey:
        """
        Create CSAT entry manually (staff entering feedback from phone/email).
        """
        # Verify customer exists
        customer = self.db.query(Customer).filter(Customer.id == data.customer_id).first()
        if not customer:
            raise NotFoundError(detail="Customer not found")

        # Get product deployment if product specified
        product_deployment_id = None
        if data.product:
            deployment = self.db.query(ProductDeployment).filter(
                ProductDeployment.customer_id == data.customer_id,
                ProductDeployment.product_name == data.product,
                ProductDeployment.is_active == True
            ).first()
            if deployment:
                product_deployment_id = deployment.id

        # Verify ticket if linked
        if data.linked_ticket_id:
            ticket = self.db.query(SupportTicket).filter(
                SupportTicket.id == data.linked_ticket_id,
                SupportTicket.customer_id == data.customer_id
            ).first()
            if not ticket:
                raise NotFoundError(detail="Ticket not found or doesn't belong to customer")

        # Verify survey request if linked
        survey_request = None
        if data.survey_request_id:
            survey_request = self.db.query(SurveyRequest).filter(
                SurveyRequest.id == data.survey_request_id,
                SurveyRequest.customer_id == data.customer_id
            ).first()
            if not survey_request:
                raise NotFoundError(detail="Survey request not found")

            if survey_request.status == SurveyRequestStatus.completed:
                raise BadRequestError(detail="Survey request is already completed")

        # Create CSAT entry
        survey = CSATSurvey(
            customer_id=data.customer_id,
            product_deployment_id=product_deployment_id,
            survey_type=data.survey_type,
            score=data.score,
            feedback_text=data.feedback_text,
            submitted_by_name=data.submitted_by_name,
            submitted_by_email=data.submitted_by_email,
            submitted_at=datetime.utcnow(),
            linked_ticket_id=data.linked_ticket_id,
            survey_request_id=data.survey_request_id,
            submitted_anonymously=False,
            submitted_via=SubmissionVia.manual_entry,
            entered_by_staff_id=staff_user.id
        )

        self.db.add(survey)

        # Update survey request if linked
        if survey_request:
            survey_request.status = SurveyRequestStatus.completed
            survey_request.completed_at = datetime.utcnow()
            survey_request.csat_response_id = survey.id

        self.db.commit()
        self.db.refresh(survey)

        # Check for low score alert
        self._check_low_score_alert(survey, customer)

        logger.info(f"Manual CSAT entry created by {staff_user.email} for customer {customer.company_name}")
        return survey

    def _check_low_score_alert(self, survey: CSATSurvey, customer: Customer) -> None:
        """Create alert for low CSAT score."""
        if survey.score <= CSAT_LOW_THRESHOLD:
            severity = Severity.high if survey.score == 1 else Severity.medium

            alert = Alert(
                customer_id=survey.customer_id,
                alert_type=AlertType.low_csat,
                severity=severity,
                title=f"Low CSAT Score Received ({survey.score}/5)",
                description=(
                    f"{customer.company_name} submitted a {survey.survey_type.value} score of {survey.score}. "
                    f"Submitted by: {survey.submitted_by_name} ({survey.submitted_by_email}). "
                    f"Feedback: {survey.feedback_text or 'No feedback provided'}"
                )
            )
            self.db.add(alert)
            self.db.commit()
            logger.info(f"Low CSAT alert created for {customer.company_name}")

    def get_stats(self, customer_id: Optional[UUID] = None) -> Dict[str, Any]:
        """Get survey request statistics."""
        query = self.db.query(SurveyRequest)

        if customer_id:
            query = query.filter(SurveyRequest.customer_id == customer_id)

        total_sent = query.count()
        pending = query.filter(SurveyRequest.status == SurveyRequestStatus.pending).count()
        completed = query.filter(SurveyRequest.status == SurveyRequestStatus.completed).count()
        expired = query.filter(SurveyRequest.status == SurveyRequestStatus.expired).count()
        cancelled = query.filter(SurveyRequest.status == SurveyRequestStatus.cancelled).count()

        completion_rate = (completed / total_sent * 100) if total_sent > 0 else 0

        return {
            "total_sent": total_sent,
            "pending": pending,
            "completed": completed,
            "expired": expired,
            "cancelled": cancelled,
            "completion_rate": round(completion_rate, 2)
        }

    def expire_old_requests(self) -> int:
        """
        Mark expired survey requests as expired.
        Should be called periodically by a scheduler.
        """
        now = datetime.utcnow()

        expired_requests = self.db.query(SurveyRequest).filter(
            SurveyRequest.status == SurveyRequestStatus.pending,
            SurveyRequest.expires_at < now
        ).all()

        for request in expired_requests:
            request.status = SurveyRequestStatus.expired

        self.db.commit()

        if expired_requests:
            logger.info(f"Marked {len(expired_requests)} survey requests as expired")

        return len(expired_requests)

    def to_response(self, request: SurveyRequest) -> SurveyRequestResponse:
        """Convert survey request to response schema."""
        customer_name = None
        if request.customer:
            customer_name = request.customer.company_name

        sent_by_staff_name = None
        if request.sent_by_staff:
            sent_by_staff_name = request.sent_by_staff.full_name

        linked_ticket_number = None
        if request.linked_ticket:
            linked_ticket_number = request.linked_ticket.ticket_number

        return SurveyRequestResponse(
            id=request.id,
            customer_id=request.customer_id,
            customer_name=customer_name,
            target_email=request.target_email,
            survey_type=request.survey_type,
            linked_ticket_id=request.linked_ticket_id,
            linked_ticket_number=linked_ticket_number,
            unique_survey_token=request.unique_survey_token,
            sent_by_staff_id=request.sent_by_staff_id,
            sent_by_staff_name=sent_by_staff_name,
            status=request.status,
            created_at=request.created_at,
            sent_at=request.sent_at,
            expires_at=request.expires_at,
            reminder_sent_at=request.reminder_sent_at,
            completed_at=request.completed_at,
            csat_response_id=request.csat_response_id,
            custom_message=request.custom_message
        )
