#!/usr/bin/env python3
"""
Comprehensive Database Seeder for Success Manager

This script populates the database with realistic test data including:
- 5 Users (1 admin, 2 managers, 2 viewers)
- 15 Customers (telecom, tech, financial industries)
- 25 Product Deployments
- 50+ Health Scores
- 100+ CSAT Surveys
- 75+ Customer Interactions
- 20+ Alerts
- 5 Scheduled Reports

Usage: python seed_database.py [--clear]

Options:
    --clear     Clear all existing data before seeding (default behavior)
    --append    Append to existing data instead of clearing
"""

import sys
import os
import random
import logging
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List
import uuid

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.customer import Customer, CustomerStatus
from app.models.product_deployment import ProductDeployment, ProductName, Environment
from app.models.health_score import HealthScore, ScoreTrend
from app.models.csat_survey import CSATSurvey, SurveyType
from app.models.customer_interaction import CustomerInteraction, InteractionType, Sentiment
from app.models.alert import Alert, AlertType, Severity
from app.models.scheduled_report import ScheduledReport, ReportType, Frequency

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# =============================================================================
# SEED DATA DEFINITIONS
# =============================================================================

USERS_DATA = [
    {
        "email": "admin@extravis.com",
        "full_name": "System Administrator",
        "password": "Admin@123",
        "role": UserRole.admin
    },
    {
        "email": "sarah.manager@extravis.com",
        "full_name": "Sarah Johnson",
        "password": "Manager@123",
        "role": UserRole.manager
    },
    {
        "email": "james.manager@extravis.com",
        "full_name": "James Wilson",
        "password": "Manager@123",
        "role": UserRole.manager
    },
    {
        "email": "emily.viewer@extravis.com",
        "full_name": "Emily Brown",
        "password": "Viewer@123",
        "role": UserRole.viewer
    },
    {
        "email": "michael.viewer@extravis.com",
        "full_name": "Michael Davis",
        "password": "Viewer@123",
        "role": UserRole.viewer
    }
]

# Telecom Companies (Middle East focus)
TELECOM_CUSTOMERS = [
    {
        "company_name": "Mobily",
        "industry": "Telecommunications",
        "contact_name": "Ahmed Al-Rashid",
        "contact_email": "ahmed.rashid@mobily.com.sa",
        "contact_phone": "+966 11 555 0001",
        "contract_value": Decimal("2500000.00"),
        "status": CustomerStatus.active
    },
    {
        "company_name": "Omantel",
        "industry": "Telecommunications",
        "contact_name": "Fatima Al-Balushi",
        "contact_email": "fatima.balushi@omantel.om",
        "contact_phone": "+968 2420 1000",
        "contract_value": Decimal("1800000.00"),
        "status": CustomerStatus.active
    },
    {
        "company_name": "STC (Saudi Telecom)",
        "industry": "Telecommunications",
        "contact_name": "Mohammed Al-Faisal",
        "contact_email": "m.faisal@stc.com.sa",
        "contact_phone": "+966 11 452 8000",
        "contract_value": Decimal("3500000.00"),
        "status": CustomerStatus.active
    },
    {
        "company_name": "Etisalat UAE",
        "industry": "Telecommunications",
        "contact_name": "Khalid Al-Mansouri",
        "contact_email": "k.mansouri@etisalat.ae",
        "contact_phone": "+971 2 618 0101",
        "contract_value": Decimal("2200000.00"),
        "status": CustomerStatus.at_risk
    },
    {
        "company_name": "Zain Kuwait",
        "industry": "Telecommunications",
        "contact_name": "Sara Al-Mutawa",
        "contact_email": "s.mutawa@zain.com",
        "contact_phone": "+965 2222 0000",
        "contract_value": Decimal("1500000.00"),
        "status": CustomerStatus.active
    }
]

# Tech Companies
TECH_CUSTOMERS = [
    {
        "company_name": "TechVentures Inc",
        "industry": "Technology",
        "contact_name": "David Chen",
        "contact_email": "d.chen@techventures.com",
        "contact_phone": "+1 415 555 0102",
        "contract_value": Decimal("850000.00"),
        "status": CustomerStatus.active
    },
    {
        "company_name": "CloudScale Solutions",
        "industry": "Technology",
        "contact_name": "Jennifer Martinez",
        "contact_email": "j.martinez@cloudscale.io",
        "contact_phone": "+1 650 555 0203",
        "contract_value": Decimal("1200000.00"),
        "status": CustomerStatus.active
    },
    {
        "company_name": "DataSync Technologies",
        "industry": "Technology",
        "contact_name": "Robert Kim",
        "contact_email": "r.kim@datasync.tech",
        "contact_phone": "+1 408 555 0304",
        "contract_value": Decimal("650000.00"),
        "status": CustomerStatus.onboarding
    },
    {
        "company_name": "AI Innovations Ltd",
        "industry": "Technology",
        "contact_name": "Priya Patel",
        "contact_email": "p.patel@aiinnovations.co.uk",
        "contact_phone": "+44 20 7946 0958",
        "contract_value": Decimal("980000.00"),
        "status": CustomerStatus.active
    },
    {
        "company_name": "SecureNet Systems",
        "industry": "Technology",
        "contact_name": "Marcus Thompson",
        "contact_email": "m.thompson@securenet.com",
        "contact_phone": "+1 202 555 0405",
        "contract_value": Decimal("720000.00"),
        "status": CustomerStatus.at_risk
    }
]

# Financial Institutions
FINANCIAL_CUSTOMERS = [
    {
        "company_name": "Gulf National Bank",
        "industry": "Financial Services",
        "contact_name": "Abdullah Al-Qahtani",
        "contact_email": "a.qahtani@gnb.com.sa",
        "contact_phone": "+966 11 476 0000",
        "contract_value": Decimal("4200000.00"),
        "status": CustomerStatus.active
    },
    {
        "company_name": "Emirates Investment Bank",
        "industry": "Financial Services",
        "contact_name": "Reem Al-Hashemi",
        "contact_email": "r.hashemi@eib.ae",
        "contact_phone": "+971 4 335 0000",
        "contract_value": Decimal("3100000.00"),
        "status": CustomerStatus.active
    },
    {
        "company_name": "Oman Finance House",
        "industry": "Financial Services",
        "contact_name": "Yusuf Al-Harthi",
        "contact_email": "y.harthi@ofh.om",
        "contact_phone": "+968 2477 0000",
        "contract_value": Decimal("1900000.00"),
        "status": CustomerStatus.at_risk
    },
    {
        "company_name": "Qatar Capital Partners",
        "industry": "Financial Services",
        "contact_name": "Noura Al-Thani",
        "contact_email": "n.thani@qcp.qa",
        "contact_phone": "+974 4496 0000",
        "contract_value": Decimal("2800000.00"),
        "status": CustomerStatus.active
    },
    {
        "company_name": "Bahrain Investment Corp",
        "industry": "Financial Services",
        "contact_name": "Hassan Al-Khalifa",
        "contact_email": "h.khalifa@bic.bh",
        "contact_phone": "+973 1754 0000",
        "contract_value": Decimal("1650000.00"),
        "status": CustomerStatus.churned
    }
]

ALL_CUSTOMERS = TELECOM_CUSTOMERS + TECH_CUSTOMERS + FINANCIAL_CUSTOMERS

ACCOUNT_MANAGERS = ["Sarah Johnson", "James Wilson"]

# Feedback templates for CSAT surveys
POSITIVE_FEEDBACK = [
    "Excellent support! The team resolved our issue quickly and professionally.",
    "Very satisfied with the product performance and the support received.",
    "The training session was comprehensive and very helpful for our team.",
    "Great experience overall. The product has improved our efficiency significantly.",
    "Outstanding customer service. Quick response times and knowledgeable staff.",
    "The new features are exactly what we needed. Great job listening to customer feedback!",
    "Smooth deployment process. The technical team was very supportive.",
    "Product exceeded our expectations. Highly recommend to others.",
]

NEUTRAL_FEEDBACK = [
    "Service was adequate. No major issues but room for improvement.",
    "Product works as expected. Documentation could be more detailed.",
    "Support was helpful but took longer than expected to resolve.",
    "Generally satisfied but would like to see more frequent updates.",
    "Meeting was informative. Looking forward to seeing the proposed changes.",
    "Product is good but pricing is on the higher side.",
]

NEGATIVE_FEEDBACK = [
    "Response time was too slow. We had to wait several days for a resolution.",
    "The product had several bugs that affected our operations.",
    "Training was not sufficient for our complex use case.",
    "Disappointed with the recent update. It caused compatibility issues.",
    "Support team seemed unfamiliar with our specific deployment.",
    "Contract terms are not flexible enough for our needs.",
]

# Interaction subjects and descriptions
INTERACTION_TEMPLATES = {
    InteractionType.support_ticket: [
        ("API Integration Issue", "Customer reported issues with API authentication. Provided updated credentials and documentation."),
        ("Performance Degradation", "Investigated performance issues in production environment. Identified and optimized database queries."),
        ("Feature Request: Dashboard", "Customer requested new dashboard widgets for custom KPIs. Logged feature request for product team."),
        ("Login Authentication Error", "User unable to login due to SSO configuration. Reset configuration and verified access."),
        ("Data Export Failure", "Export feature failing for large datasets. Applied pagination fix and confirmed resolution."),
        ("Mobile App Crash", "App crashing on specific device models. Identified memory issue and deployed hotfix."),
        ("Report Generation Error", "Scheduled reports not being generated. Fixed cron job configuration."),
        ("Integration Sync Issue", "Third-party integration not syncing properly. Updated API version and reconfigured webhooks."),
    ],
    InteractionType.meeting: [
        ("Quarterly Business Review", "Reviewed Q3 performance metrics, discussed roadmap items, and addressed customer concerns about upcoming contract renewal."),
        ("Product Roadmap Discussion", "Presented upcoming features and gathered feedback on priorities. Customer interested in advanced analytics module."),
        ("Executive Alignment Meeting", "Met with C-level executives to discuss strategic partnership opportunities and expansion plans."),
        ("Technical Architecture Review", "Deep dive into system architecture for planned scaling. Discussed migration to microservices."),
        ("Success Planning Session", "Developed success metrics and KPIs for the next quarter. Identified potential risks and mitigation strategies."),
        ("Onboarding Kickoff", "Initial meeting to set expectations, introduce team members, and review implementation timeline."),
    ],
    InteractionType.email: [
        ("Contract Renewal Inquiry", "Customer inquired about early renewal options and potential volume discounts."),
        ("Feature Update Announcement", "Sent email announcing new features in latest release. Customer expressed interest in beta program."),
        ("Billing Clarification", "Addressed questions about recent invoice and explained prorated charges for added licenses."),
        ("Survey Follow-up", "Followed up on low CSAT score to understand concerns and propose remediation steps."),
        ("Product Documentation Update", "Shared updated API documentation and migration guide for version upgrade."),
        ("Maintenance Window Notification", "Notified about scheduled maintenance and provided workaround procedures."),
    ],
    InteractionType.call: [
        ("Emergency Support Call", "Customer reported critical production issue. Escalated to engineering and resolved within SLA."),
        ("Check-in Call", "Regular check-in to assess satisfaction and discuss any pending issues."),
        ("Upsell Discussion", "Discussed additional product modules that could benefit customer's use case."),
        ("Technical Consultation", "Provided technical guidance on best practices for system integration."),
        ("Issue Resolution Follow-up", "Followed up on previously reported issue to confirm resolution and gather feedback."),
    ],
    InteractionType.escalation: [
        ("Critical System Outage", "Major production outage affecting customer operations. Engaged crisis management team and restored service."),
        ("SLA Breach Complaint", "Customer escalated due to repeated SLA misses. Reviewed processes and implemented improvements."),
        ("Executive Escalation", "Customer CEO contacted our leadership about ongoing issues. Scheduled executive review meeting."),
        ("Security Concern Escalation", "Potential security vulnerability reported. Immediate investigation and patch deployed."),
    ],
    InteractionType.training: [
        ("Admin Training Session", "Conducted 3-hour admin training covering system configuration, user management, and reporting."),
        ("End User Training", "Group training for 25 end users on daily workflows and best practices."),
        ("Advanced Features Workshop", "Deep-dive training on advanced analytics and custom reporting capabilities."),
        ("New Hire Onboarding", "Training session for newly onboarded customer team members."),
        ("Certification Program", "Customer team completed certification program. All participants passed with distinction."),
    ]
}

# Alert templates
ALERT_TEMPLATES = {
    AlertType.health_drop: [
        ("Health Score Dropped Below 60", "Customer health score decreased from {prev} to {curr}. Main factors: reduced engagement and pending support tickets."),
        ("Critical Health Score Decline", "Significant drop in health score detected. Immediate attention required to prevent churn risk."),
        ("Health Trend Declining", "Health score has been declining for 3 consecutive periods. Review customer engagement strategy."),
    ],
    AlertType.contract_expiry: [
        ("Contract Expiring in 30 Days", "Customer contract will expire on {date}. Initiate renewal discussion."),
        ("Contract Expiring in 90 Days", "Contract renewal due in 3 months. Schedule QBR to discuss renewal terms."),
        ("Contract Expired - Grace Period", "Contract has expired. Customer is in 14-day grace period."),
    ],
    AlertType.low_csat: [
        ("Low CSAT Score Received", "Customer submitted CSAT score of {score}/5. Follow up to address concerns."),
        ("Multiple Low CSAT Responses", "Customer has submitted 3 low CSAT scores this month. Escalate to account manager."),
        ("NPS Detractor Alert", "Customer identified as NPS detractor (score: {score}). Risk of negative word-of-mouth."),
    ],
    AlertType.escalation: [
        ("Support Ticket Escalated", "Support ticket #{ticket} has been escalated. Customer frustrated with resolution time."),
        ("Executive Complaint Filed", "Customer executive contacted leadership about service quality."),
        ("Repeated Issue Escalation", "Same issue escalated 3 times. Review root cause and implement permanent fix."),
    ],
    AlertType.inactivity: [
        ("No Login in 14 Days", "Primary users have not logged in for 14 days. Check on product adoption."),
        ("Decreased Product Usage", "Product usage dropped by 50% compared to last month."),
        ("Feature Abandonment Detected", "Customer stopped using key features. Schedule training session."),
    ]
}

# =============================================================================
# SEEDER FUNCTIONS
# =============================================================================

def clear_all_data(db: Session) -> None:
    """Clear all existing data from the database."""
    logger.info("Clearing existing data...")

    # Delete in order of dependencies (reverse of creation)
    db.query(Alert).delete()
    db.query(CustomerInteraction).delete()
    db.query(CSATSurvey).delete()
    db.query(HealthScore).delete()
    db.query(ProductDeployment).delete()
    db.query(Customer).delete()
    db.query(ScheduledReport).delete()
    db.query(User).delete()

    db.commit()
    logger.info("All existing data cleared.")


def seed_users(db: Session) -> List[User]:
    """Seed user accounts."""
    logger.info("Seeding users...")
    users = []

    for user_data in USERS_DATA:
        user = User(
            email=user_data["email"],
            full_name=user_data["full_name"],
            hashed_password=get_password_hash(user_data["password"]),
            role=user_data["role"],
            is_active=True,
            last_login=datetime.utcnow() - timedelta(days=random.randint(0, 7))
        )
        db.add(user)
        users.append(user)

    db.commit()
    logger.info(f"Created {len(users)} users.")
    return users


def seed_customers(db: Session) -> List[Customer]:
    """Seed customer accounts."""
    logger.info("Seeding customers...")
    customers = []

    for i, customer_data in enumerate(ALL_CUSTOMERS):
        # Generate contract dates
        start_months_ago = random.randint(6, 24)
        contract_start = date.today() - timedelta(days=start_months_ago * 30)
        contract_length = random.choice([12, 24, 36])  # months
        contract_end = contract_start + timedelta(days=contract_length * 30)

        # Assign account manager in round-robin fashion
        account_manager = ACCOUNT_MANAGERS[i % len(ACCOUNT_MANAGERS)]

        customer = Customer(
            company_name=customer_data["company_name"],
            industry=customer_data["industry"],
            contact_name=customer_data["contact_name"],
            contact_email=customer_data["contact_email"],
            contact_phone=customer_data["contact_phone"],
            contract_start_date=contract_start,
            contract_end_date=contract_end,
            contract_value=customer_data["contract_value"],
            account_manager=account_manager,
            status=customer_data["status"]
        )
        db.add(customer)
        customers.append(customer)

    db.commit()
    logger.info(f"Created {len(customers)} customers.")
    return customers


def seed_product_deployments(db: Session, customers: List[Customer]) -> List[ProductDeployment]:
    """Seed product deployments."""
    logger.info("Seeding product deployments...")
    deployments = []

    products = list(ProductName)
    environments = list(Environment)
    versions = {
        ProductName.MonetX: ["4.2.1", "4.3.0", "4.3.1", "5.0.0"],
        ProductName.SupportX: ["3.1.0", "3.2.0", "3.2.1", "3.3.0"],
        ProductName.GreenX: ["2.0.0", "2.1.0", "2.1.1", "2.2.0"]
    }
    license_types = ["Enterprise", "Professional", "Standard"]

    for customer in customers:
        # Each customer gets 1-3 products
        num_products = random.randint(1, 3)
        customer_products = random.sample(products, num_products)

        for product in customer_products:
            deployment_date = customer.contract_start_date + timedelta(days=random.randint(7, 30))
            license_expiry = customer.contract_end_date

            deployment = ProductDeployment(
                customer_id=customer.id,
                product_name=product,
                deployment_date=deployment_date,
                version=random.choice(versions[product]),
                environment=random.choice(environments),
                license_type=random.choice(license_types),
                license_expiry=license_expiry,
                is_active=customer.status != CustomerStatus.churned
            )
            db.add(deployment)
            deployments.append(deployment)

    db.commit()
    logger.info(f"Created {len(deployments)} product deployments.")
    return deployments


def seed_health_scores(db: Session, customers: List[Customer], deployments: List[ProductDeployment]) -> List[HealthScore]:
    """Seed health scores with historical data."""
    logger.info("Seeding health scores...")
    health_scores = []

    # Group deployments by customer
    customer_deployments = {}
    for d in deployments:
        if d.customer_id not in customer_deployments:
            customer_deployments[d.customer_id] = []
        customer_deployments[d.customer_id].append(d)

    trends = list(ScoreTrend)

    for customer in customers:
        customer_deps = customer_deployments.get(customer.id, [])

        # Generate 3-6 historical health scores per customer
        num_scores = random.randint(3, 6)

        # Base score depends on customer status
        if customer.status == CustomerStatus.active:
            base_score = random.randint(65, 95)
        elif customer.status == CustomerStatus.at_risk:
            base_score = random.randint(35, 60)
        elif customer.status == CustomerStatus.churned:
            base_score = random.randint(15, 40)
        else:  # onboarding
            base_score = random.randint(50, 75)

        for i in range(num_scores):
            days_ago = (num_scores - i - 1) * 30  # Monthly scores
            calculated_at = datetime.utcnow() - timedelta(days=days_ago)

            # Add some variance to the scores
            variance = random.randint(-10, 10)
            overall = max(0, min(100, base_score + variance))

            # Component scores
            engagement = max(0, min(100, overall + random.randint(-15, 15)))
            adoption = max(0, min(100, overall + random.randint(-15, 15)))
            support = max(0, min(100, overall + random.randint(-10, 10)))
            financial = max(0, min(100, overall + random.randint(-10, 20)))

            # Determine trend
            if customer.status == CustomerStatus.at_risk:
                trend = random.choices(trends, weights=[0.1, 0.3, 0.6])[0]
            elif customer.status == CustomerStatus.active:
                trend = random.choices(trends, weights=[0.4, 0.4, 0.2])[0]
            else:
                trend = random.choice(trends)

            # Pick a random deployment or None
            deployment = random.choice(customer_deps) if customer_deps and random.random() > 0.3 else None

            health_score = HealthScore(
                customer_id=customer.id,
                product_deployment_id=deployment.id if deployment else None,
                overall_score=overall,
                engagement_score=engagement,
                adoption_score=adoption,
                support_score=support,
                financial_score=financial,
                score_trend=trend,
                calculated_at=calculated_at,
                factors={
                    "login_frequency": random.randint(1, 10),
                    "feature_usage": random.randint(20, 100),
                    "support_tickets": random.randint(0, 5),
                    "nps_score": random.randint(-100, 100)
                }
            )
            db.add(health_score)
            health_scores.append(health_score)

    db.commit()
    logger.info(f"Created {len(health_scores)} health scores.")
    return health_scores


def seed_csat_surveys(db: Session, customers: List[Customer], deployments: List[ProductDeployment]) -> List[CSATSurvey]:
    """Seed CSAT survey responses."""
    logger.info("Seeding CSAT surveys...")
    surveys = []

    survey_types = list(SurveyType)

    # Group deployments by customer
    customer_deployments = {}
    for d in deployments:
        if d.customer_id not in customer_deployments:
            customer_deployments[d.customer_id] = []
        customer_deployments[d.customer_id].append(d)

    # Contact persons for surveys
    survey_submitters = [
        ("Technical Lead", "techleader"),
        ("Operations Manager", "ops.manager"),
        ("System Admin", "sysadmin"),
        ("End User", "enduser"),
        ("Support Contact", "support.contact"),
    ]

    for customer in customers:
        customer_deps = customer_deployments.get(customer.id, [])

        # Generate 5-12 CSAT surveys per customer
        num_surveys = random.randint(5, 12)

        # Score distribution based on customer status
        if customer.status == CustomerStatus.active:
            score_weights = [0.05, 0.1, 0.2, 0.35, 0.3]  # More 4s and 5s
        elif customer.status == CustomerStatus.at_risk:
            score_weights = [0.15, 0.25, 0.3, 0.2, 0.1]  # More 2s and 3s
        elif customer.status == CustomerStatus.churned:
            score_weights = [0.3, 0.3, 0.25, 0.1, 0.05]  # More 1s and 2s
        else:
            score_weights = [0.1, 0.15, 0.25, 0.3, 0.2]

        for _ in range(num_surveys):
            days_ago = random.randint(1, 180)
            submitted_at = datetime.utcnow() - timedelta(days=days_ago)

            score = random.choices([1, 2, 3, 4, 5], weights=score_weights)[0]
            survey_type = random.choice(survey_types)

            # Select feedback based on score
            if score >= 4:
                feedback = random.choice(POSITIVE_FEEDBACK)
            elif score == 3:
                feedback = random.choice(NEUTRAL_FEEDBACK)
            else:
                feedback = random.choice(NEGATIVE_FEEDBACK)

            # Submitter info
            role, email_prefix = random.choice(survey_submitters)
            domain = customer.contact_email.split('@')[1]
            submitter_email = f"{email_prefix}@{domain}"

            # Pick deployment
            deployment = random.choice(customer_deps) if customer_deps else None

            # Ticket reference for post-ticket surveys
            ticket_ref = f"TKT-{random.randint(10000, 99999)}" if survey_type == SurveyType.post_ticket else None

            survey = CSATSurvey(
                customer_id=customer.id,
                product_deployment_id=deployment.id if deployment else None,
                survey_type=survey_type,
                score=score,
                feedback_text=feedback,
                submitted_by_name=f"{role} - {customer.company_name}",
                submitted_by_email=submitter_email,
                submitted_at=submitted_at,
                ticket_reference=ticket_ref
            )
            db.add(survey)
            surveys.append(survey)

    db.commit()
    logger.info(f"Created {len(surveys)} CSAT surveys.")
    return surveys


def seed_interactions(db: Session, customers: List[Customer]) -> List[CustomerInteraction]:
    """Seed customer interactions."""
    logger.info("Seeding customer interactions...")
    interactions = []

    interaction_types = list(InteractionType)
    sentiments = list(Sentiment)
    performers = ["Sarah Johnson", "James Wilson", "Support Team", "Technical Support", "Account Management"]

    for customer in customers:
        # Generate 4-8 interactions per customer
        num_interactions = random.randint(4, 8)

        # Sentiment distribution based on customer status
        if customer.status == CustomerStatus.active:
            sentiment_weights = [0.5, 0.35, 0.15]
        elif customer.status == CustomerStatus.at_risk:
            sentiment_weights = [0.2, 0.4, 0.4]
        elif customer.status == CustomerStatus.churned:
            sentiment_weights = [0.1, 0.3, 0.6]
        else:
            sentiment_weights = [0.35, 0.45, 0.2]

        for _ in range(num_interactions):
            days_ago = random.randint(1, 120)
            interaction_date = datetime.utcnow() - timedelta(days=days_ago)

            interaction_type = random.choice(interaction_types)
            templates = INTERACTION_TEMPLATES[interaction_type]
            subject, description = random.choice(templates)

            sentiment = random.choices(sentiments, weights=sentiment_weights)[0]
            performer = random.choice(performers)

            # Follow-up logic
            follow_up_required = random.random() < 0.3
            follow_up_date = None
            if follow_up_required:
                follow_up_date = (datetime.utcnow() + timedelta(days=random.randint(1, 14))).date()

            interaction = CustomerInteraction(
                customer_id=customer.id,
                interaction_type=interaction_type,
                subject=subject,
                description=f"{description} Customer: {customer.company_name}",
                sentiment=sentiment,
                performed_by=performer,
                interaction_date=interaction_date,
                follow_up_required=follow_up_required,
                follow_up_date=follow_up_date
            )
            db.add(interaction)
            interactions.append(interaction)

    db.commit()
    logger.info(f"Created {len(interactions)} customer interactions.")
    return interactions


def seed_alerts(db: Session, customers: List[Customer]) -> List[Alert]:
    """Seed alerts."""
    logger.info("Seeding alerts...")
    alerts = []

    alert_types = list(AlertType)
    severities = list(Severity)

    for customer in customers:
        # More alerts for at-risk and churned customers
        if customer.status == CustomerStatus.at_risk:
            num_alerts = random.randint(2, 4)
            severity_weights = [0.1, 0.2, 0.4, 0.3]
        elif customer.status == CustomerStatus.churned:
            num_alerts = random.randint(3, 5)
            severity_weights = [0.05, 0.15, 0.3, 0.5]
        elif customer.status == CustomerStatus.active:
            num_alerts = random.randint(0, 2)
            severity_weights = [0.4, 0.35, 0.2, 0.05]
        else:
            num_alerts = random.randint(1, 2)
            severity_weights = [0.3, 0.4, 0.25, 0.05]

        for _ in range(num_alerts):
            days_ago = random.randint(0, 60)
            created_at = datetime.utcnow() - timedelta(days=days_ago)

            alert_type = random.choice(alert_types)
            templates = ALERT_TEMPLATES[alert_type]
            title_template, desc_template = random.choice(templates)

            # Format with placeholders
            title = title_template.format(
                prev=random.randint(60, 80),
                curr=random.randint(30, 55),
                date=(date.today() + timedelta(days=random.randint(30, 90))).strftime("%Y-%m-%d"),
                score=random.randint(1, 3),
                ticket=random.randint(10000, 99999)
            )
            description = desc_template.format(
                prev=random.randint(60, 80),
                curr=random.randint(30, 55),
                date=(date.today() + timedelta(days=random.randint(30, 90))).strftime("%Y-%m-%d"),
                score=random.randint(1, 3),
                ticket=random.randint(10000, 99999)
            )

            severity = random.choices(severities, weights=severity_weights)[0]

            # Some alerts are resolved
            is_resolved = random.random() < 0.4
            resolved_by = None
            resolved_at = None
            if is_resolved:
                resolved_by = random.choice(["Sarah Johnson", "James Wilson", "System Administrator"])
                resolved_at = created_at + timedelta(days=random.randint(1, 7))

            alert = Alert(
                customer_id=customer.id,
                alert_type=alert_type,
                severity=severity,
                title=title,
                description=f"{description} (Customer: {customer.company_name})",
                is_resolved=is_resolved,
                resolved_by=resolved_by,
                resolved_at=resolved_at,
                created_at=created_at
            )
            db.add(alert)
            alerts.append(alert)

    db.commit()
    logger.info(f"Created {len(alerts)} alerts.")
    return alerts


def seed_scheduled_reports(db: Session) -> List[ScheduledReport]:
    """Seed scheduled reports."""
    logger.info("Seeding scheduled reports...")
    reports = []

    report_configs = [
        {
            "report_name": "Weekly Health Summary",
            "report_type": ReportType.health_summary,
            "frequency": Frequency.weekly,
            "recipients": ["admin@extravis.com", "sarah.manager@extravis.com"],
            "filters": {"status": ["active", "at_risk"], "min_score": 0}
        },
        {
            "report_name": "Monthly CSAT Analysis",
            "report_type": ReportType.csat_analysis,
            "frequency": Frequency.monthly,
            "recipients": ["admin@extravis.com", "james.manager@extravis.com"],
            "filters": {"survey_types": ["quarterly", "post_ticket"]}
        },
        {
            "report_name": "Quarterly Executive Summary",
            "report_type": ReportType.executive_summary,
            "frequency": Frequency.quarterly,
            "recipients": ["admin@extravis.com", "sarah.manager@extravis.com", "james.manager@extravis.com"],
            "filters": {"include_financials": True, "include_trends": True}
        },
        {
            "report_name": "Daily Customer Overview",
            "report_type": ReportType.customer_overview,
            "frequency": Frequency.daily,
            "recipients": ["sarah.manager@extravis.com"],
            "filters": {"status": ["at_risk"], "days_to_renewal": 30}
        },
        {
            "report_name": "Monthly Customer Performance",
            "report_type": ReportType.customer_overview,
            "frequency": Frequency.monthly,
            "recipients": ["admin@extravis.com", "james.manager@extravis.com"],
            "filters": {"industries": ["Telecommunications", "Financial Services"]}
        }
    ]

    for config in report_configs:
        # Calculate next scheduled time based on frequency
        now = datetime.utcnow()
        if config["frequency"] == Frequency.daily:
            next_scheduled = now.replace(hour=6, minute=0, second=0, microsecond=0) + timedelta(days=1)
        elif config["frequency"] == Frequency.weekly:
            days_until_monday = (7 - now.weekday()) % 7
            next_scheduled = now.replace(hour=6, minute=0, second=0, microsecond=0) + timedelta(days=days_until_monday or 7)
        elif config["frequency"] == Frequency.monthly:
            if now.day < 1:
                next_scheduled = now.replace(day=1, hour=6, minute=0, second=0, microsecond=0)
            else:
                month = now.month + 1 if now.month < 12 else 1
                year = now.year if now.month < 12 else now.year + 1
                next_scheduled = now.replace(year=year, month=month, day=1, hour=6, minute=0, second=0, microsecond=0)
        else:  # quarterly
            current_quarter = (now.month - 1) // 3
            next_quarter_month = (current_quarter + 1) * 3 + 1
            if next_quarter_month > 12:
                next_quarter_month = 1
                year = now.year + 1
            else:
                year = now.year
            next_scheduled = datetime(year, next_quarter_month, 1, 6, 0, 0)

        # Last generated (for non-daily reports)
        last_generated = None
        if random.random() > 0.3:
            if config["frequency"] == Frequency.weekly:
                last_generated = now - timedelta(days=random.randint(1, 7))
            elif config["frequency"] == Frequency.monthly:
                last_generated = now - timedelta(days=random.randint(1, 30))
            else:
                last_generated = now - timedelta(days=random.randint(1, 90))

        report = ScheduledReport(
            report_name=config["report_name"],
            report_type=config["report_type"],
            frequency=config["frequency"],
            recipients=config["recipients"],
            filters=config["filters"],
            last_generated_at=last_generated,
            next_scheduled_at=next_scheduled,
            is_active=True
        )
        db.add(report)
        reports.append(report)

    db.commit()
    logger.info(f"Created {len(reports)} scheduled reports.")
    return reports


def print_summary(users, customers, deployments, health_scores, surveys, interactions, alerts, reports):
    """Print summary of seeded data."""
    print("\n" + "=" * 60)
    print("DATABASE SEEDING COMPLETED SUCCESSFULLY")
    print("=" * 60)
    print(f"\nCreated:")
    print(f"  - {len(users)} Users")
    print(f"  - {len(customers)} Customers")
    print(f"  - {len(deployments)} Product Deployments")
    print(f"  - {len(health_scores)} Health Scores")
    print(f"  - {len(surveys)} CSAT Surveys")
    print(f"  - {len(interactions)} Customer Interactions")
    print(f"  - {len(alerts)} Alerts")
    print(f"  - {len(reports)} Scheduled Reports")

    print("\n" + "-" * 60)
    print("USER CREDENTIALS (for testing):")
    print("-" * 60)
    for user_data in USERS_DATA:
        print(f"  {user_data['role'].value:10} | {user_data['email']:35} | {user_data['password']}")

    print("\n" + "-" * 60)
    print("CUSTOMER BREAKDOWN:")
    print("-" * 60)

    # Count by status
    status_counts = {}
    for c in customers:
        status_counts[c.status.value] = status_counts.get(c.status.value, 0) + 1
    for status, count in status_counts.items():
        print(f"  {status:12}: {count}")

    # Count by industry
    print("\n  By Industry:")
    industry_counts = {}
    for c in customers:
        industry_counts[c.industry] = industry_counts.get(c.industry, 0) + 1
    for industry, count in industry_counts.items():
        print(f"    {industry:25}: {count}")

    print("\n" + "=" * 60 + "\n")


def run_seeder(clear_data: bool = True) -> None:
    """Run the complete database seeder."""
    logger.info("Starting database seeding...")

    db = SessionLocal()
    try:
        if clear_data:
            clear_all_data(db)

        # Seed in order of dependencies
        users = seed_users(db)
        customers = seed_customers(db)
        deployments = seed_product_deployments(db, customers)
        health_scores = seed_health_scores(db, customers, deployments)
        surveys = seed_csat_surveys(db, customers, deployments)
        interactions = seed_interactions(db, customers)
        alerts = seed_alerts(db, customers)
        reports = seed_scheduled_reports(db)

        # Print summary
        print_summary(users, customers, deployments, health_scores, surveys, interactions, alerts, reports)

        logger.info("Database seeding completed successfully!")

    except Exception as e:
        logger.error(f"Error during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    # Check command line arguments
    append_mode = "--append" in sys.argv
    clear_data = not append_mode

    if append_mode:
        print("Running in APPEND mode - existing data will be preserved")
    else:
        print("Running in CLEAR mode - existing data will be deleted")

    run_seeder(clear_data=clear_data)
