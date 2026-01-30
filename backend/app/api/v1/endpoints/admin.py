from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_admin_user
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/seed-demo-data")
async def seed_demo_data_endpoint(
    clear_existing: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    Seed demo data for testing (admin only).

    This endpoint populates the database with realistic test data including:
    - 5 Customers with various statuses (active, at_risk, onboarding)
    - Health scores for each customer
    - 6 months of health score history
    - 5-10 CSAT surveys per customer
    - 3-8 Support tickets per customer
    - 5-10 Activity logs per customer

    Args:
        clear_existing: If True, clear all existing data before seeding (default: True)
    """
    try:
        from app.utils.seeder import seed_demo_data, clear_demo_data

        if clear_existing:
            clear_demo_data(db)

        summary = seed_demo_data(db)

        return {
            "success": True,
            "message": "Demo data seeded successfully",
            "summary": summary
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to seed demo data: {str(e)}"
        )


@router.get("/system-info")
async def get_system_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    Get system information and database statistics (admin only).
    """
    from app.models.customer import Customer
    from app.models.health_score import HealthScore
    from app.models.csat_survey import CSATSurvey
    from app.models.alert import Alert
    from app.models.product_deployment import ProductDeployment
    from sqlalchemy import func

    stats = {
        "database": {
            "total_users": db.query(User).count(),
            "total_customers": db.query(Customer).count(),
            "total_health_scores": db.query(HealthScore).count(),
            "total_csat_surveys": db.query(CSATSurvey).count(),
            "total_alerts": db.query(Alert).count(),
            "total_deployments": db.query(ProductDeployment).count(),
        },
        "active_counts": {
            "active_users": db.query(User).filter(User.is_active == True).count(),
            "open_alerts": db.query(Alert).filter(Alert.is_resolved == False).count(),
            "active_deployments": db.query(ProductDeployment).filter(ProductDeployment.is_active == True).count(),
        }
    }

    return stats


@router.delete("/clear-demo-data")
async def clear_demo_data_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """
    Clear all demo data from the database (admin only).

    WARNING: This will delete all customer data, health scores, tickets, etc.
    User accounts are preserved.
    """
    try:
        from app.utils.seeder import clear_demo_data

        summary = clear_demo_data(db)

        return {
            "success": True,
            "message": "All demo data cleared successfully.",
            "summary": summary
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear demo data: {str(e)}"
        )
