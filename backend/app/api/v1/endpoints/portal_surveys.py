"""
Customer Portal Survey Endpoints.
Allows customers to submit voluntary feedback, view pending surveys, and complete survey requests.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.core.database import get_db
from app.core.customer_dependencies import get_current_customer_user, CustomerUserContext
from app.models.csat_survey import SurveyType
from app.schemas.csat_survey import (
    CustomerFeedbackSubmit,
    CustomerSurveyTokenSubmit,
    CustomerPendingSurveyList,
    CustomerFeedbackHistoryList,
    PublicSurveyView,
    CSATSurveyResponse,
)
from app.services.customer_survey_service import CustomerSurveyService
from pydantic import BaseModel

router = APIRouter(prefix="/portal/surveys", tags=["Customer Portal Surveys"])


class MessageResponse(BaseModel):
    message: str


class AvailableProductsResponse(BaseModel):
    products: list[str]


# ==================== Authenticated Customer Endpoints ====================

@router.post("/feedback", response_model=CSATSurveyResponse, status_code=status.HTTP_201_CREATED)
async def submit_voluntary_feedback(
    feedback_data: CustomerFeedbackSubmit,
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Submit voluntary feedback from customer portal.

    **Requires customer authentication.**

    This creates a CSAT response without a survey request.
    Customer can choose to submit anonymously.

    Survey types available:
    - general_feedback: Open-ended feedback
    - product_feedback: Feedback about specific product (requires product field)
    """
    service = CustomerSurveyService(db)

    # Validate survey type for voluntary submission
    allowed_types = [SurveyType.general_feedback, SurveyType.product_feedback]
    if feedback_data.survey_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Voluntary feedback must be one of: {[t.value for t in allowed_types]}"
        )

    survey = service.submit_voluntary_feedback(
        customer_user=context.customer_user,
        customer=context.customer,
        feedback_data=feedback_data
    )

    return survey


@router.get("/pending", response_model=CustomerPendingSurveyList)
async def get_pending_surveys(
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Get pending survey requests for the customer.

    **Requires customer authentication.**

    Returns surveys that have been sent by Extravis staff and are waiting for response.
    """
    service = CustomerSurveyService(db)
    pending = service.get_pending_surveys(
        customer_user=context.customer_user,
        customer_id=context.customer_id
    )

    return CustomerPendingSurveyList(
        surveys=[service.to_pending_survey_response(p) for p in pending],
        total=len(pending)
    )


@router.get("/history", response_model=CustomerFeedbackHistoryList)
async def get_feedback_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Get history of feedback submitted by this customer user.

    **Requires customer authentication.**

    Only shows non-anonymous submissions by the current user.
    """
    service = CustomerSurveyService(db)
    surveys, total = service.get_feedback_history(
        customer_user=context.customer_user,
        customer_id=context.customer_id,
        skip=skip,
        limit=limit
    )

    return CustomerFeedbackHistoryList(
        feedback=[service.to_feedback_history_response(s) for s in surveys],
        total=total
    )


@router.get("/products", response_model=AvailableProductsResponse)
async def get_available_products(
    context: CustomerUserContext = Depends(get_current_customer_user),
    db: Session = Depends(get_db)
):
    """
    Get products available for product feedback.

    **Requires customer authentication.**

    Returns list of products deployed for the customer's company.
    """
    service = CustomerSurveyService(db)
    products = service.get_available_products(context.customer_id)
    return AvailableProductsResponse(products=products)


# ==================== Public Endpoints (Token-based) ====================

@router.get("/view/{token}", response_model=PublicSurveyView)
async def view_survey_by_token(
    token: str,
    db: Session = Depends(get_db)
):
    """
    View survey details by token.

    **Public endpoint - no authentication required.**

    Used to display survey form from email link.
    Returns survey info including related ticket if any.
    """
    service = CustomerSurveyService(db)

    try:
        survey_request = service.get_survey_by_token(token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

    # Get customer name
    customer_name = "Customer"
    if survey_request.customer:
        customer_name = survey_request.customer.company_name

    # Get ticket info if linked
    linked_ticket_number = None
    linked_ticket_subject = None
    if survey_request.linked_ticket:
        linked_ticket_number = survey_request.linked_ticket.ticket_number
        linked_ticket_subject = survey_request.linked_ticket.subject

    return PublicSurveyView(
        survey_type=survey_request.survey_type,
        customer_name=customer_name,
        linked_ticket_number=linked_ticket_number,
        linked_ticket_subject=linked_ticket_subject,
        custom_message=survey_request.custom_message,
        expires_at=survey_request.expires_at,
        is_expired=survey_request.is_expired,
        is_completed=survey_request.is_completed
    )


@router.post("/submit/{token}", response_model=CSATSurveyResponse)
async def submit_survey_by_token(
    token: str,
    submission: CustomerSurveyTokenSubmit,
    db: Session = Depends(get_db)
):
    """
    Submit survey response via token.

    **Public endpoint - no authentication required.**

    Used to submit survey from email link without requiring login.
    """
    service = CustomerSurveyService(db)

    try:
        survey = service.submit_survey_by_token(
            token=token,
            score=submission.score,
            feedback_text=submission.feedback_text,
            submitter_name=submission.submitter_name,
            submitter_email=submission.submitter_email
        )
    except Exception as e:
        if "expired" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail=str(e)
            )
        elif "already" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(e)
            )
        elif "cancelled" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail=str(e)
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

    return survey
