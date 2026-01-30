from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from uuid import UUID

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_manager_or_admin
from app.models.user import User
from app.models.csat_survey import SurveyType
from app.schemas.csat_survey import (
    CSATSurveyCreate,
    CSATSurveyResponse,
    CSATListResponse,
    CSATCustomerSummary,
    CSATAnalyticsResponse,
    GenerateSurveyLinkRequest,
    SurveyLinkResponse,
    PublicSurveySubmit,
    SurveyTokenInfo
)
from app.services.csat_service import CSATService

router = APIRouter(prefix="/csat", tags=["CSAT Surveys"])


@router.get("/", response_model=CSATListResponse)
async def list_surveys(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    customer_id: Optional[UUID] = Query(None, description="Filter by customer"),
    product_deployment_id: Optional[UUID] = Query(None, description="Filter by product deployment"),
    survey_type: Optional[SurveyType] = Query(None, description="Filter by survey type"),
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    sort_by: str = Query("submitted_at", description="Field to sort by"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all CSAT surveys with pagination and filtering.
    """
    csat_service = CSATService(db)
    surveys, total = csat_service.get_all(
        skip=skip,
        limit=limit,
        customer_id=customer_id,
        product_deployment_id=product_deployment_id,
        survey_type=survey_type,
        start_date=start_date,
        end_date=end_date,
        sort_by=sort_by,
        sort_order=sort_order
    )

    return CSATListResponse(
        surveys=surveys,
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/", response_model=CSATSurveyResponse, status_code=status.HTTP_201_CREATED)
async def submit_survey(
    survey_data: CSATSurveyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit a new CSAT survey response.
    - Score validation: 1-5 for CSAT, 0-10 for NPS
    - Auto-creates alert if score is low
    """
    csat_service = CSATService(db)
    survey = csat_service.create(survey_data)
    return survey


@router.get("/analytics", response_model=CSATAnalyticsResponse)
async def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get overall CSAT analytics including:
    - Average scores by product
    - Average scores by survey type
    - Monthly trend data
    - Top feedback themes
    """
    csat_service = CSATService(db)
    return csat_service.get_analytics()


@router.post("/survey-link", response_model=SurveyLinkResponse)
async def generate_survey_link(
    request: GenerateSurveyLinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_manager_or_admin)
):
    """
    Generate a unique survey link for a customer.
    Link expires based on expires_in_days (default 7 days).
    """
    csat_service = CSATService(db)
    result = csat_service.generate_survey_link(
        customer_id=request.customer_id,
        survey_type=request.survey_type,
        product_deployment_id=request.product_deployment_id,
        ticket_reference=request.ticket_reference,
        expires_in_days=request.expires_in_days
    )
    return SurveyLinkResponse(**result)


@router.get("/public/info/{token}", response_model=SurveyTokenInfo)
async def get_survey_info(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Get survey information from token (public endpoint, no auth required).
    Used to display survey form with pre-filled information.
    """
    csat_service = CSATService(db)
    payload = csat_service.validate_survey_token(token)
    return SurveyTokenInfo(**payload)


@router.post("/public/submit/{token}", response_model=CSATSurveyResponse)
async def submit_public_survey(
    token: str,
    survey_data: PublicSurveySubmit,
    db: Session = Depends(get_db)
):
    """
    Submit survey response via public link (no auth required).
    Token must be valid and not expired.
    """
    csat_service = CSATService(db)
    survey = csat_service.submit_public_survey(
        token=token,
        score=survey_data.score,
        feedback_text=survey_data.feedback_text,
        submitted_by_name=survey_data.submitted_by_name,
        submitted_by_email=survey_data.submitted_by_email
    )
    return survey


@router.get("/customer/{customer_id}/summary", response_model=CSATCustomerSummary)
async def get_customer_summary(
    customer_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get CSAT summary for a customer including:
    - Average CSAT score
    - NPS score calculation
    - Score trend over time
    - Response count by type
    """
    csat_service = CSATService(db)
    return csat_service.get_customer_summary(customer_id)


@router.get("/{survey_id}", response_model=CSATSurveyResponse)
async def get_survey(
    survey_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get survey details by ID.
    """
    csat_service = CSATService(db)
    return csat_service.get_by_id(survey_id)
