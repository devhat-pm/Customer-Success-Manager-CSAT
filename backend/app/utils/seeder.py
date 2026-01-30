import logging
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.customer import Customer, CustomerStatus
from app.models.health_score import HealthScore, RiskLevel, ScoreTrend
from app.models.health_score_history import HealthScoreHistory
from app.models.csat_survey import CSATSurvey, SurveyType
from app.models.support_ticket import SupportTicket, ProductType, TicketPriority, TicketStatus
from app.models.activity_log import ActivityLog, ActivityType

logger = logging.getLogger(__name__)

DEFAULT_ADMIN = {
    "email": "admin@extravis.com",
    "password": "Admin@123",
    "full_name": "System Administrator",
    "role": UserRole.admin
}

# Sample data for generating realistic demo content
COMPANY_NAMES = [
    "TechCorp International",
    "Global Finance Solutions",
    "Quantum Dynamics",
    "Apex Industries",
    "NovaStar Communications"
]

INDUSTRIES = [
    "Technology",
    "Financial Services",
    "Manufacturing",
    "Healthcare",
    "Telecommunications"
]

CONTACT_NAMES = [
    "John Smith",
    "Sarah Johnson",
    "Michael Chen",
    "Emily Rodriguez",
    "David Kim"
]

FEEDBACK_SAMPLES = [
    "Great product, very satisfied with the service.",
    "Support team was helpful but response time could improve.",
    "Excellent onboarding experience, smooth implementation.",
    "Some features need improvement, but overall good.",
    "Very happy with the platform, exceeded expectations.",
    "Good value for money, would recommend.",
    "The team is responsive and professional.",
    "Minor issues but quickly resolved by support.",
    "Outstanding customer service experience.",
    "Product works as expected, stable performance."
]

TICKET_SUBJECTS = [
    "Login issues after password reset",
    "Dashboard not loading properly",
    "Report generation timeout",
    "API integration error",
    "Data sync discrepancy",
    "Performance issues on dashboard",
    "Feature request: Export to Excel",
    "User permission configuration",
    "SSL certificate renewal inquiry",
    "Mobile app sync problems"
]

ACTIVITY_TITLES = [
    "Quarterly Business Review",
    "Product Demo Session",
    "Support Follow-up Call",
    "Contract Renewal Discussion",
    "Feature Training Session",
    "Escalation Resolution",
    "Health Check Meeting",
    "Onboarding Kickoff",
    "Success Planning Session",
    "Technical Deep Dive"
]


def create_default_admin(db: Session) -> None:
    """Create default admin user if it doesn't exist."""
    existing_admin = db.query(User).filter(User.email == DEFAULT_ADMIN["email"]).first()

    if existing_admin:
        logger.info(f"Default admin user already exists: {DEFAULT_ADMIN['email']}")
        return

    admin_user = User(
        email=DEFAULT_ADMIN["email"],
        full_name=DEFAULT_ADMIN["full_name"],
        hashed_password=get_password_hash(DEFAULT_ADMIN["password"]),
        role=DEFAULT_ADMIN["role"],
        is_active=True
    )

    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    logger.info(f"Default admin user created: {DEFAULT_ADMIN['email']}")


def get_or_create_manager(db: Session) -> User:
    """Get existing manager or create one for demo data."""
    manager = db.query(User).filter(User.role == UserRole.manager).first()

    if not manager:
        manager = db.query(User).filter(User.role == UserRole.admin).first()

    if not manager:
        manager = User(
            email="manager@extravis.com",
            full_name="Demo Manager",
            hashed_password=get_password_hash("Manager@123"),
            role=UserRole.manager,
            is_active=True
        )
        db.add(manager)
        db.commit()
        db.refresh(manager)
        logger.info("Created demo manager user")

    return manager


def seed_demo_data(db: Session) -> dict:
    """
    Seed comprehensive demo data for testing and development.

    Creates:
    - 5 Customers with various statuses
    - Health scores for each customer
    - 6 months of health score history
    - 5-10 CSAT responses per customer
    - 3-8 Support tickets per customer
    - 5-10 Activity logs per customer

    Returns:
        dict: Summary of created records
    """
    logger.info("Starting comprehensive demo data seeding...")

    summary = {
        "customers": 0,
        "health_scores": 0,
        "health_score_history": 0,
        "csat_surveys": 0,
        "support_tickets": 0,
        "activity_logs": 0
    }

    try:
        # Get or create manager
        manager = get_or_create_manager(db)

        # Customer statuses to distribute
        statuses = [
            CustomerStatus.active,
            CustomerStatus.active,
            CustomerStatus.at_risk,
            CustomerStatus.onboarding,
            CustomerStatus.active
        ]

        customers = []

        # Create 5 customers
        for i in range(5):
            # Check if customer already exists
            existing = db.query(Customer).filter(
                Customer.company_name == COMPANY_NAMES[i]
            ).first()

            if existing:
                customers.append(existing)
                logger.info(f"Customer '{COMPANY_NAMES[i]}' already exists, using existing record")
                continue

            contract_start = datetime.utcnow().date() - timedelta(days=random.randint(180, 365))
            contract_end = contract_start + timedelta(days=random.randint(365, 730))

            customer = Customer(
                company_name=COMPANY_NAMES[i],
                industry=INDUSTRIES[i],
                contact_name=CONTACT_NAMES[i],
                contact_email=f"contact{i+1}@{COMPANY_NAMES[i].lower().replace(' ', '')}.com",
                contact_phone=f"+1-555-{random.randint(100,999)}-{random.randint(1000,9999)}",
                deployed_products=[random.choice([["MonetX"], ["SupportX"], ["GreenX"], ["MonetX", "SupportX"]])][0],
                contract_start_date=contract_start,
                contract_end_date=contract_end,
                contract_value=random.randint(50000, 500000),
                account_manager_id=manager.id,
                account_manager=manager.full_name,
                status=statuses[i]
            )
            db.add(customer)
            customers.append(customer)
            summary["customers"] += 1

        db.commit()

        # Refresh customers to get IDs
        for customer in customers:
            db.refresh(customer)

        # Create health scores and history for each customer
        for customer in customers:
            # Create current health score
            overall = random.randint(40, 95) if customer.status != CustomerStatus.at_risk else random.randint(25, 55)

            if overall >= 80:
                risk_level = RiskLevel.low
            elif overall >= 60:
                risk_level = RiskLevel.medium
            elif overall >= 40:
                risk_level = RiskLevel.high
            else:
                risk_level = RiskLevel.critical

            trends = [ScoreTrend.improving, ScoreTrend.stable, ScoreTrend.declining]

            health_score = HealthScore(
                customer_id=customer.id,
                overall_score=overall,
                product_adoption_score=random.randint(40, 100),
                support_health_score=random.randint(40, 100),
                engagement_score=random.randint(40, 100),
                financial_health_score=random.randint(50, 100),
                sla_compliance_score=random.randint(60, 100),
                risk_level=risk_level,
                score_trend=random.choice(trends),
                calculated_at=datetime.utcnow(),
                notes=f"Latest health assessment for {customer.company_name}"
            )
            db.add(health_score)
            summary["health_scores"] += 1

            # Create 6 months of health score history
            for month in range(6):
                history_date = datetime.utcnow() - timedelta(days=30 * (month + 1))
                history_score = max(20, min(100, overall + random.randint(-15, 15)))

                if history_score >= 80:
                    hist_risk = "low"
                elif history_score >= 60:
                    hist_risk = "medium"
                elif history_score >= 40:
                    hist_risk = "high"
                else:
                    hist_risk = "critical"

                history = HealthScoreHistory(
                    customer_id=customer.id,
                    overall_score=history_score,
                    product_adoption_score=random.randint(40, 100),
                    support_health_score=random.randint(40, 100),
                    engagement_score=random.randint(40, 100),
                    financial_health_score=random.randint(50, 100),
                    sla_compliance_score=random.randint(60, 100),
                    risk_level=hist_risk,
                    recorded_at=history_date
                )
                db.add(history)
                summary["health_score_history"] += 1

            # Create CSAT surveys (5-10 per customer)
            num_surveys = random.randint(5, 10)
            survey_types = list(SurveyType)

            for j in range(num_surveys):
                survey_date = datetime.utcnow() - timedelta(days=random.randint(1, 180))

                survey = CSATSurvey(
                    customer_id=customer.id,
                    survey_type=random.choice(survey_types),
                    score=random.randint(3, 5) if customer.status == CustomerStatus.active else random.randint(1, 4),
                    feedback_text=random.choice(FEEDBACK_SAMPLES),
                    submitted_by_name=customer.contact_name,
                    submitted_by_email=customer.contact_email,
                    submitted_at=survey_date,
                    ticket_reference=f"TKT-{random.randint(1000, 9999)}" if random.random() > 0.5 else None
                )
                db.add(survey)
                summary["csat_surveys"] += 1

            # Create support tickets (3-8 per customer)
            num_tickets = random.randint(3, 8)
            products = list(ProductType)
            priorities = list(TicketPriority)
            ticket_statuses = list(TicketStatus)

            for j in range(num_tickets):
                ticket_date = datetime.utcnow() - timedelta(days=random.randint(1, 90))
                status = random.choice(ticket_statuses)

                resolved_at = None
                resolution_time = None
                if status in [TicketStatus.resolved, TicketStatus.closed]:
                    resolved_at = ticket_date + timedelta(hours=random.randint(1, 72))
                    resolution_time = (resolved_at - ticket_date).total_seconds() / 3600

                ticket = SupportTicket(
                    customer_id=customer.id,
                    ticket_number=f"TKT-{random.randint(10000, 99999)}",
                    subject=random.choice(TICKET_SUBJECTS),
                    description=f"Detailed description for ticket from {customer.company_name}",
                    product=random.choice(products),
                    priority=random.choice(priorities),
                    status=status,
                    sla_breached=random.random() < 0.1,
                    resolution_time_hours=resolution_time,
                    created_at=ticket_date,
                    resolved_at=resolved_at
                )
                db.add(ticket)
                summary["support_tickets"] += 1

            # Create activity logs (5-10 per customer)
            num_activities = random.randint(5, 10)
            activity_types = list(ActivityType)

            for j in range(num_activities):
                activity_date = datetime.utcnow() - timedelta(days=random.randint(1, 120))

                activity = ActivityLog(
                    customer_id=customer.id,
                    user_id=manager.id,
                    activity_type=random.choice(activity_types),
                    title=random.choice(ACTIVITY_TITLES),
                    description=f"Activity recorded for {customer.company_name} by {manager.full_name}",
                    logged_at=activity_date,
                    created_at=activity_date
                )
                db.add(activity)
                summary["activity_logs"] += 1

        db.commit()
        logger.info(f"Demo data seeding completed: {summary}")
        return summary

    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding demo data: {e}")
        raise


def clear_demo_data(db: Session) -> dict:
    """
    Clear all demo data from the database.
    Preserves the admin user.

    Returns:
        dict: Summary of deleted records
    """
    logger.info("Clearing demo data...")

    summary = {
        "activity_logs": db.query(ActivityLog).delete(),
        "support_tickets": db.query(SupportTicket).delete(),
        "csat_surveys": db.query(CSATSurvey).delete(),
        "health_score_history": db.query(HealthScoreHistory).delete(),
        "health_scores": db.query(HealthScore).delete(),
        "customers": db.query(Customer).delete()
    }

    db.commit()
    logger.info(f"Demo data cleared: {summary}")
    return summary


def run_seeder() -> None:
    """Run all seeders."""
    logger.info("Running database seeders...")

    db = SessionLocal()
    try:
        create_default_admin(db)
        seed_demo_data(db)
        logger.info("Database seeding completed successfully.")
    except Exception as e:
        logger.error(f"Error during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_seeder()
