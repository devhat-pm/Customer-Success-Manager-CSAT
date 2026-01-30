from datetime import datetime, date, timedelta
from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
import uuid
import hashlib
import hmac
import secrets
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func, extract
from collections import Counter
import re
import logging

from app.models.csat_survey import CSATSurvey, SurveyType, SubmissionVia
from app.models.customer import Customer
from app.models.product_deployment import ProductDeployment
from app.models.alert import Alert, AlertType, Severity
from app.schemas.csat_survey import CSATSurveyCreate
from app.core.config import settings
from app.core.exceptions import NotFoundError, ValidationError

logger = logging.getLogger(__name__)

# Low score thresholds for auto-alerts
CSAT_LOW_THRESHOLD = 2  # 1-5 scale
NPS_DETRACTOR_THRESHOLD = 6  # 0-10 scale

# Common positive and negative keywords for feedback analysis
POSITIVE_KEYWORDS = [
    'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best',
    'helpful', 'quick', 'fast', 'efficient', 'professional', 'friendly',
    'resolved', 'satisfied', 'happy', 'thank', 'appreciate', 'good', 'awesome'
]

NEGATIVE_KEYWORDS = [
    'bad', 'poor', 'terrible', 'awful', 'worst', 'hate', 'slow', 'delayed',
    'frustrated', 'disappointed', 'unhappy', 'angry', 'issue', 'problem',
    'bug', 'broken', 'fail', 'never', 'waste', 'horrible', 'unacceptable'
]


class CSATService:
    def __init__(self, db: Session):
        self.db = db
        self._token_secret = settings.SECRET_KEY

    def get_by_id(self, survey_id: UUID) -> CSATSurvey:
        survey = self.db.query(CSATSurvey).filter(CSATSurvey.id == survey_id).first()
        if not survey:
            raise NotFoundError(detail="Survey not found")
        return survey

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        customer_id: Optional[UUID] = None,
        product_deployment_id: Optional[UUID] = None,
        survey_type: Optional[SurveyType] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        sort_by: str = "submitted_at",
        sort_order: str = "desc"
    ) -> Tuple[List[CSATSurvey], int]:
        query = self.db.query(CSATSurvey)

        if customer_id:
            query = query.filter(CSATSurvey.customer_id == customer_id)

        if product_deployment_id:
            query = query.filter(CSATSurvey.product_deployment_id == product_deployment_id)

        if survey_type:
            query = query.filter(CSATSurvey.survey_type == survey_type)

        if start_date:
            query = query.filter(CSATSurvey.submitted_at >= datetime.combine(start_date, datetime.min.time()))

        if end_date:
            query = query.filter(CSATSurvey.submitted_at <= datetime.combine(end_date, datetime.max.time()))

        total = query.count()

        sort_column = getattr(CSATSurvey, sort_by, CSATSurvey.submitted_at)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        surveys = query.offset(skip).limit(limit).all()
        return surveys, total

    def create(self, survey_data: CSATSurveyCreate) -> CSATSurvey:
        # Verify customer exists
        customer = self.db.query(Customer).filter(Customer.id == survey_data.customer_id).first()
        if not customer:
            raise NotFoundError(detail="Customer not found")

        # Validate score based on survey type
        self._validate_score(survey_data.survey_type, survey_data.score)

        # Verify product deployment if provided
        if survey_data.product_deployment_id:
            deployment = self.db.query(ProductDeployment).filter(
                ProductDeployment.id == survey_data.product_deployment_id,
                ProductDeployment.customer_id == survey_data.customer_id
            ).first()
            if not deployment:
                raise ValidationError(detail="Product deployment not found or doesn't belong to customer")

        survey = CSATSurvey(
            customer_id=survey_data.customer_id,
            product_deployment_id=survey_data.product_deployment_id,
            survey_type=survey_data.survey_type,
            score=survey_data.score,
            feedback_text=survey_data.feedback_text,
            submitted_by_name=survey_data.submitted_by_name,
            submitted_by_email=survey_data.submitted_by_email,
            ticket_reference=survey_data.ticket_reference,
            submitted_at=datetime.utcnow(),
            linked_ticket_id=getattr(survey_data, 'linked_ticket_id', None),
            submitted_via=SubmissionVia.manual_entry,  # Default for staff-created surveys
            submitted_anonymously=False
        )

        self.db.add(survey)
        self.db.commit()
        self.db.refresh(survey)

        # Check for low score and create alert
        self._check_low_score_alert(survey, customer)

        logger.info(f"CSAT survey submitted: {survey.survey_type.value} score {survey.score} for {customer.company_name}")
        return survey

    def _validate_score(self, survey_type: SurveyType, score: int) -> None:
        if survey_type == SurveyType.nps:
            if not 0 <= score <= 10:
                raise ValidationError(detail="NPS score must be between 0 and 10")
        else:
            if not 1 <= score <= 5:
                raise ValidationError(detail="CSAT score must be between 1 and 5")

    def _check_low_score_alert(self, survey: CSATSurvey, customer: Customer) -> None:
        is_low_score = False
        severity = Severity.medium

        if survey.survey_type == SurveyType.nps:
            if survey.score <= NPS_DETRACTOR_THRESHOLD:
                is_low_score = True
                if survey.score <= 3:
                    severity = Severity.high
        else:
            if survey.score <= CSAT_LOW_THRESHOLD:
                is_low_score = True
                if survey.score == 1:
                    severity = Severity.high

        if is_low_score:
            alert = Alert(
                customer_id=survey.customer_id,
                alert_type=AlertType.low_csat,
                severity=severity,
                title=f"Low {survey.survey_type.value.upper()} Score Received",
                description=f"{customer.company_name} submitted a {survey.survey_type.value} score of {survey.score}. "
                           f"Submitted by: {survey.submitted_by_name} ({survey.submitted_by_email}). "
                           f"Feedback: {survey.feedback_text or 'No feedback provided'}"
            )
            self.db.add(alert)
            self.db.commit()
            logger.info(f"Low CSAT alert created for {customer.company_name}")

    def get_customer_summary(self, customer_id: UUID) -> Dict[str, Any]:
        """Get CSAT summary for a customer."""
        # Verify customer exists
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise NotFoundError(detail="Customer not found")

        surveys = self.db.query(CSATSurvey).filter(
            CSATSurvey.customer_id == customer_id
        ).all()

        if not surveys:
            return {
                "customer_id": customer_id,
                "customer_name": customer.company_name,
                "total_responses": 0,
                "average_csat": None,
                "nps_score": None,
                "response_count_by_type": {},
                "score_trend": [],
                "recent_feedback": []
            }

        # Calculate average CSAT (non-NPS surveys)
        csat_surveys = [s for s in surveys if s.survey_type != SurveyType.nps]
        avg_csat = sum(s.score for s in csat_surveys) / len(csat_surveys) if csat_surveys else None

        # Calculate NPS
        nps_surveys = [s for s in surveys if s.survey_type == SurveyType.nps]
        nps_score = self._calculate_nps(nps_surveys) if nps_surveys else None

        # Response count by type
        response_count = {}
        for survey_type in SurveyType:
            count = len([s for s in surveys if s.survey_type == survey_type])
            if count > 0:
                response_count[survey_type.value] = count

        # Score trend (last 6 months, monthly averages)
        six_months_ago = datetime.utcnow() - timedelta(days=180)
        recent_surveys = [s for s in surveys if s.submitted_at >= six_months_ago]
        score_trend = self._calculate_monthly_trend(recent_surveys)

        # Recent feedback
        recent_feedback = sorted(surveys, key=lambda x: x.submitted_at, reverse=True)[:5]

        return {
            "customer_id": customer_id,
            "customer_name": customer.company_name,
            "total_responses": len(surveys),
            "average_csat": round(avg_csat, 2) if avg_csat else None,
            "nps_score": nps_score,
            "response_count_by_type": response_count,
            "score_trend": score_trend,
            "recent_feedback": [
                {
                    "id": s.id,
                    "survey_type": s.survey_type.value,
                    "score": s.score,
                    "feedback": s.feedback_text,
                    "submitted_at": s.submitted_at.isoformat(),
                    "submitted_by": s.submitted_by_name
                }
                for s in recent_feedback
            ]
        }

    def _calculate_nps(self, nps_surveys: List[CSATSurvey]) -> int:
        """Calculate NPS score: % Promoters - % Detractors."""
        if not nps_surveys:
            return None

        total = len(nps_surveys)
        promoters = len([s for s in nps_surveys if s.score >= 9])  # 9-10
        detractors = len([s for s in nps_surveys if s.score <= 6])  # 0-6
        # Passives are 7-8, not counted

        nps = ((promoters - detractors) / total) * 100
        return round(nps)

    def _calculate_monthly_trend(self, surveys: List[CSATSurvey]) -> List[Dict[str, Any]]:
        """Calculate monthly score averages."""
        monthly_data = {}

        for survey in surveys:
            month_key = survey.submitted_at.strftime("%Y-%m")
            if month_key not in monthly_data:
                monthly_data[month_key] = {"scores": [], "count": 0}

            # Normalize NPS to 1-5 scale for comparison
            if survey.survey_type == SurveyType.nps:
                normalized_score = (survey.score / 10) * 5
            else:
                normalized_score = survey.score

            monthly_data[month_key]["scores"].append(normalized_score)
            monthly_data[month_key]["count"] += 1

        trend = []
        for month, data in sorted(monthly_data.items()):
            avg = sum(data["scores"]) / len(data["scores"])
            trend.append({
                "month": month,
                "average_score": round(avg, 2),
                "response_count": data["count"]
            })

        return trend

    def get_analytics(self) -> Dict[str, Any]:
        """Get overall CSAT analytics."""
        surveys = self.db.query(CSATSurvey).all()

        if not surveys:
            return {
                "total_responses": 0,
                "overall_average": None,
                "overall_nps": None,
                "by_product": {},
                "by_survey_type": {},
                "monthly_trend": [],
                "top_themes": {"positive": [], "negative": []}
            }

        # Overall averages
        csat_surveys = [s for s in surveys if s.survey_type != SurveyType.nps]
        overall_avg = sum(s.score for s in csat_surveys) / len(csat_surveys) if csat_surveys else None

        nps_surveys = [s for s in surveys if s.survey_type == SurveyType.nps]
        overall_nps = self._calculate_nps(nps_surveys)

        # By product
        by_product = {}
        for survey in surveys:
            if survey.product_deployment_id:
                deployment = self.db.query(ProductDeployment).filter(
                    ProductDeployment.id == survey.product_deployment_id
                ).first()
                if deployment:
                    product = deployment.product_name.value
                    if product not in by_product:
                        by_product[product] = {"scores": [], "count": 0}
                    by_product[product]["scores"].append(survey.score)
                    by_product[product]["count"] += 1

        for product in by_product:
            by_product[product]["average"] = round(
                sum(by_product[product]["scores"]) / len(by_product[product]["scores"]), 2
            )
            del by_product[product]["scores"]

        # By survey type
        by_type = {}
        for survey_type in SurveyType:
            type_surveys = [s for s in surveys if s.survey_type == survey_type]
            if type_surveys:
                by_type[survey_type.value] = {
                    "count": len(type_surveys),
                    "average": round(sum(s.score for s in type_surveys) / len(type_surveys), 2)
                }

        # Monthly trend (last 12 months)
        twelve_months_ago = datetime.utcnow() - timedelta(days=365)
        recent_surveys = [s for s in surveys if s.submitted_at >= twelve_months_ago]
        monthly_trend = self._calculate_monthly_trend(recent_surveys)

        # Top themes from feedback
        all_feedback = " ".join([s.feedback_text for s in surveys if s.feedback_text])
        themes = self._extract_themes(all_feedback)

        return {
            "total_responses": len(surveys),
            "overall_average": round(overall_avg, 2) if overall_avg else None,
            "overall_nps": overall_nps,
            "by_product": by_product,
            "by_survey_type": by_type,
            "monthly_trend": monthly_trend,
            "top_themes": themes
        }

    def _extract_themes(self, text: str) -> Dict[str, List[Dict[str, Any]]]:
        """Extract top positive and negative themes from feedback text."""
        if not text:
            return {"positive": [], "negative": []}

        words = re.findall(r'\b\w+\b', text.lower())
        word_counts = Counter(words)

        positive_themes = []
        negative_themes = []

        for word, count in word_counts.most_common(100):
            if word in POSITIVE_KEYWORDS:
                positive_themes.append({"keyword": word, "count": count})
            elif word in NEGATIVE_KEYWORDS:
                negative_themes.append({"keyword": word, "count": count})

        return {
            "positive": positive_themes[:10],
            "negative": negative_themes[:10]
        }

    def generate_survey_link(
        self,
        customer_id: UUID,
        survey_type: SurveyType,
        product_deployment_id: Optional[UUID] = None,
        ticket_reference: Optional[str] = None,
        expires_in_days: int = 7
    ) -> Dict[str, Any]:
        """Generate a unique survey link for a customer."""
        # Verify customer exists
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise NotFoundError(detail="Customer not found")

        # Create token data
        token_id = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(days=expires_in_days)

        # Create token payload
        payload = {
            "token_id": token_id,
            "customer_id": str(customer_id),
            "survey_type": survey_type.value,
            "product_deployment_id": str(product_deployment_id) if product_deployment_id else None,
            "ticket_reference": ticket_reference,
            "expires_at": expires_at.isoformat()
        }

        # Generate signed token
        token = self._generate_token(payload)

        return {
            "token": token,
            "survey_url": f"/api/v1/csat/public/submit/{token}",
            "customer_name": customer.company_name,
            "survey_type": survey_type.value,
            "expires_at": expires_at.isoformat()
        }

    def _generate_token(self, payload: Dict[str, Any]) -> str:
        """Generate a signed token."""
        import json
        import base64

        # Encode payload
        payload_str = json.dumps(payload, sort_keys=True)
        payload_b64 = base64.urlsafe_b64encode(payload_str.encode()).decode()

        # Create signature
        signature = hmac.new(
            self._token_secret.encode(),
            payload_b64.encode(),
            hashlib.sha256
        ).hexdigest()[:16]

        return f"{payload_b64}.{signature}"

    def validate_survey_token(self, token: str) -> Dict[str, Any]:
        """Validate and decode a survey token."""
        import json
        import base64

        try:
            parts = token.split('.')
            if len(parts) != 2:
                raise ValidationError(detail="Invalid token format")

            payload_b64, signature = parts

            # Verify signature
            expected_signature = hmac.new(
                self._token_secret.encode(),
                payload_b64.encode(),
                hashlib.sha256
            ).hexdigest()[:16]

            if not hmac.compare_digest(signature, expected_signature):
                raise ValidationError(detail="Invalid token signature")

            # Decode payload
            payload_str = base64.urlsafe_b64decode(payload_b64.encode()).decode()
            payload = json.loads(payload_str)

            # Check expiration
            expires_at = datetime.fromisoformat(payload["expires_at"])
            if datetime.utcnow() > expires_at:
                raise ValidationError(detail="Survey link has expired")

            return payload

        except (ValueError, KeyError, json.JSONDecodeError) as e:
            raise ValidationError(detail=f"Invalid token: {str(e)}")

    def submit_public_survey(
        self,
        token: str,
        score: int,
        feedback_text: Optional[str],
        submitted_by_name: str,
        submitted_by_email: str
    ) -> CSATSurvey:
        """Submit a survey response via public link."""
        # Validate token
        payload = self.validate_survey_token(token)

        # Create survey
        survey_type = SurveyType(payload["survey_type"])

        survey_data = CSATSurveyCreate(
            customer_id=UUID(payload["customer_id"]),
            product_deployment_id=UUID(payload["product_deployment_id"]) if payload.get("product_deployment_id") else None,
            survey_type=survey_type,
            score=score,
            feedback_text=feedback_text,
            submitted_by_name=submitted_by_name,
            submitted_by_email=submitted_by_email,
            ticket_reference=payload.get("ticket_reference")
        )

        return self.create(survey_data)
