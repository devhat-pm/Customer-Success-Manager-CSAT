"""
Service for Customer Portal survey operations.
Handles voluntary feedback submission, pending surveys, and feedback history.
"""
from datetime import datetime
from typing import Optional, List, Tuple
from uuid import UUID
import logging

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.customer import Customer
from app.models.customer_user import CustomerUser
from app.models.csat_survey import (
    CSATSurvey, SurveyRequest, SurveyType, SubmissionVia, SurveyRequestStatus
)
from app.models.support_ticket import SupportTicket
from app.models.product_deployment import ProductDeployment
from app.core.exceptions import NotFoundError, BadRequestError, ValidationError
from app.schemas.csat_survey import (
    CustomerFeedbackSubmit,
    CustomerPendingSurvey,
    CustomerFeedbackHistory,
)

logger = logging.getLogger(__name__)


class CustomerSurveyService:
    """Service for customer survey operations."""

    def __init__(self, db: Session):
        self.db = db

    def submit_voluntary_feedback(
        self,
        customer_user: CustomerUser,
        customer: Customer,
        feedback_data: CustomerFeedbackSubmit
    ) -> CSATSurvey:
        """
        Submit voluntary feedback from customer portal.
        This creates a CSAT response without a survey request.
        """
        # Validate product if product_feedback type
        product_deployment_id = None
        if feedback_data.survey_type == SurveyType.product_feedback:
            if not feedback_data.product:
                raise ValidationError(detail="Product is required for product feedback")

            # Verify product is deployed for customer
            deployment = self.db.query(ProductDeployment).filter(
                ProductDeployment.customer_id == customer.id,
                ProductDeployment.product_name == feedback_data.product,
                ProductDeployment.is_active == True
            ).first()
            if deployment:
                product_deployment_id = deployment.id

        # Determine submitter info
        if feedback_data.submit_anonymously:
            submitted_by_name = "Anonymous"
            submitted_by_email = f"anonymous@{customer.company_name.lower().replace(' ', '')}.com"
            submitted_by_customer_user_id = None
        else:
            submitted_by_name = customer_user.full_name
            submitted_by_email = customer_user.email
            submitted_by_customer_user_id = customer_user.id

        survey = CSATSurvey(
            customer_id=customer.id,
            product_deployment_id=product_deployment_id,
            survey_type=feedback_data.survey_type,
            score=feedback_data.score,
            feedback_text=feedback_data.feedback_text,
            submitted_by_name=submitted_by_name,
            submitted_by_email=submitted_by_email,
            submitted_at=datetime.utcnow(),
            submitted_by_customer_user_id=submitted_by_customer_user_id,
            submitted_anonymously=feedback_data.submit_anonymously,
            submitted_via=SubmissionVia.customer_portal
        )

        self.db.add(survey)
        self.db.commit()
        self.db.refresh(survey)

        logger.info(
            f"Customer {customer_user.email} submitted voluntary feedback "
            f"(type: {feedback_data.survey_type.value}, anonymous: {feedback_data.submit_anonymously})"
        )
        return survey

    def get_pending_surveys(
        self,
        customer_user: CustomerUser,
        customer_id: UUID
    ) -> List[SurveyRequest]:
        """
        Get pending survey requests for a customer.
        Returns surveys that:
        - Are for this customer
        - Are pending status
        - Are not expired
        - Are targeted to this user OR all contacts OR primary contact (if user is primary)
        """
        now = datetime.utcnow()

        query = self.db.query(SurveyRequest).filter(
            SurveyRequest.customer_id == customer_id,
            SurveyRequest.status == SurveyRequestStatus.pending,
            SurveyRequest.expires_at > now
        )

        # Filter by target
        if customer_user.is_primary_contact:
            # Primary contacts see surveys targeted to: all, primary, or specifically them
            query = query.filter(
                or_(
                    SurveyRequest.target_email == None,  # all contacts
                    SurveyRequest.target_email == customer_user.email,  # specific to them
                    SurveyRequest.target_customer_user_id == customer_user.id
                )
            )
        else:
            # Non-primary contacts only see surveys targeted to all or specifically them
            query = query.filter(
                or_(
                    SurveyRequest.target_email == None,
                    SurveyRequest.target_email == customer_user.email,
                    SurveyRequest.target_customer_user_id == customer_user.id
                )
            )

        return query.order_by(SurveyRequest.created_at.desc()).all()

    def get_feedback_history(
        self,
        customer_user: CustomerUser,
        customer_id: UUID,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[CSATSurvey], int]:
        """
        Get feedback history submitted by this customer user.
        Only shows non-anonymous submissions by this user.
        """
        query = self.db.query(CSATSurvey).filter(
            CSATSurvey.customer_id == customer_id,
            CSATSurvey.submitted_by_customer_user_id == customer_user.id,
            CSATSurvey.submitted_anonymously == False
        )

        total = query.count()
        surveys = query.order_by(CSATSurvey.submitted_at.desc()).offset(skip).limit(limit).all()

        return surveys, total

    def get_survey_by_token(self, token: str) -> SurveyRequest:
        """
        Get survey request by unique token.
        Used for public (unauthenticated) access via email link.
        """
        survey_request = self.db.query(SurveyRequest).filter(
            SurveyRequest.unique_survey_token == token
        ).first()

        if not survey_request:
            raise NotFoundError(detail="Survey not found or link is invalid")

        return survey_request

    def submit_survey_by_token(
        self,
        token: str,
        score: int,
        feedback_text: Optional[str] = None,
        submitter_name: Optional[str] = None,
        submitter_email: Optional[str] = None
    ) -> CSATSurvey:
        """
        Submit survey response via token (from email link).
        Public endpoint - no authentication required.
        """
        survey_request = self.get_survey_by_token(token)

        # Validate survey request status
        if survey_request.status == SurveyRequestStatus.completed:
            raise BadRequestError(detail="This survey has already been completed")

        if survey_request.status == SurveyRequestStatus.cancelled:
            raise BadRequestError(detail="This survey has been cancelled")

        if survey_request.is_expired:
            # Update status to expired
            survey_request.status = SurveyRequestStatus.expired
            self.db.commit()
            raise BadRequestError(detail="This survey link has expired")

        # Get customer info
        customer = self.db.query(Customer).filter(
            Customer.id == survey_request.customer_id
        ).first()

        # Determine submitter info
        if survey_request.target_customer_user_id:
            customer_user = self.db.query(CustomerUser).filter(
                CustomerUser.id == survey_request.target_customer_user_id
            ).first()
            if customer_user:
                submitter_name = submitter_name or customer_user.full_name
                submitter_email = submitter_email or customer_user.email

        if not submitter_name:
            submitter_name = survey_request.target_email or "Customer"
        if not submitter_email:
            submitter_email = survey_request.target_email or f"unknown@{customer.company_name.lower().replace(' ', '')}.com"

        # Get product deployment if linked ticket has product
        product_deployment_id = None
        if survey_request.linked_ticket:
            deployment = self.db.query(ProductDeployment).filter(
                ProductDeployment.customer_id == customer.id,
                ProductDeployment.product_name == survey_request.linked_ticket.product.value,
                ProductDeployment.is_active == True
            ).first()
            if deployment:
                product_deployment_id = deployment.id

        # Create CSAT response
        survey = CSATSurvey(
            customer_id=customer.id,
            product_deployment_id=product_deployment_id,
            survey_type=survey_request.survey_type,
            score=score,
            feedback_text=feedback_text,
            submitted_by_name=submitter_name,
            submitted_by_email=submitter_email,
            submitted_at=datetime.utcnow(),
            linked_ticket_id=survey_request.linked_ticket_id,
            survey_request_id=survey_request.id,
            submitted_by_customer_user_id=survey_request.target_customer_user_id,
            submitted_anonymously=False,
            submitted_via=SubmissionVia.email_link
        )

        self.db.add(survey)

        # Update survey request
        survey_request.status = SurveyRequestStatus.completed
        survey_request.completed_at = datetime.utcnow()
        survey_request.csat_response_id = survey.id

        self.db.commit()
        self.db.refresh(survey)

        logger.info(f"Survey {survey_request.id} completed via token by {submitter_email}")
        return survey

    def to_pending_survey_response(self, request: SurveyRequest) -> CustomerPendingSurvey:
        """Convert survey request to customer-facing pending survey."""
        linked_ticket_number = None
        linked_ticket_subject = None

        if request.linked_ticket:
            linked_ticket_number = request.linked_ticket.ticket_number
            linked_ticket_subject = request.linked_ticket.subject

        return CustomerPendingSurvey(
            id=request.id,
            survey_type=request.survey_type,
            linked_ticket_id=request.linked_ticket_id,
            linked_ticket_number=linked_ticket_number,
            linked_ticket_subject=linked_ticket_subject,
            sent_at=request.sent_at,
            expires_at=request.expires_at,
            custom_message=request.custom_message,
            survey_url=f"/api/v1/portal/surveys/submit/{request.unique_survey_token}"
        )

    def to_feedback_history_response(self, survey: CSATSurvey) -> CustomerFeedbackHistory:
        """Convert CSAT survey to customer feedback history item."""
        linked_ticket_number = None
        if survey.linked_ticket:
            linked_ticket_number = survey.linked_ticket.ticket_number

        product = None
        if survey.product_deployment:
            product = survey.product_deployment.product_name.value

        return CustomerFeedbackHistory(
            id=survey.id,
            survey_type=survey.survey_type,
            product=product,
            score=survey.score,
            feedback_text=survey.feedback_text,
            submitted_at=survey.submitted_at,
            linked_ticket_number=linked_ticket_number
        )

    def get_available_products(self, customer_id: UUID) -> List[str]:
        """Get list of products deployed for a customer (for feedback form)."""
        deployments = self.db.query(ProductDeployment).filter(
            ProductDeployment.customer_id == customer_id,
            ProductDeployment.is_active == True
        ).all()

        return list(set(d.product_name.value for d in deployments))

    def check_existing_ticket_survey(self, ticket_id: UUID) -> bool:
        """Check if a survey already exists for a ticket."""
        existing = self.db.query(CSATSurvey).filter(
            CSATSurvey.linked_ticket_id == ticket_id
        ).first()
        return existing is not None

    def check_pending_survey_for_ticket(self, ticket_id: UUID) -> bool:
        """Check if there's already a pending survey request for a ticket."""
        existing = self.db.query(SurveyRequest).filter(
            SurveyRequest.linked_ticket_id == ticket_id,
            SurveyRequest.status == SurveyRequestStatus.pending
        ).first()
        return existing is not None
