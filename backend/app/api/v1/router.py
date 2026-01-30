from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    users,
    customers,
    deployments,
    health_scores,
    scheduler,
    csat,
    interactions,
    activities,
    alerts,
    reports,
    dashboard,
    tickets,
    admin,
    customer_users,
    portal_auth,
    portal_tickets,
    portal_surveys,
    portal_dashboard,
    survey_requests,
    announcements,
    email_admin,
    settings,
    account,
)

api_router = APIRouter()

# Staff/Admin Portal endpoints
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(customers.router)
api_router.include_router(deployments.router)
api_router.include_router(health_scores.router)
api_router.include_router(csat.router)
api_router.include_router(interactions.router)
api_router.include_router(activities.router)
api_router.include_router(alerts.router)
api_router.include_router(reports.router)
api_router.include_router(dashboard.router)
api_router.include_router(scheduler.router)
api_router.include_router(tickets.router)
api_router.include_router(admin.router)
api_router.include_router(customer_users.router)
api_router.include_router(survey_requests.router)
api_router.include_router(announcements.router)
api_router.include_router(email_admin.router)
api_router.include_router(settings.router)
api_router.include_router(account.router, prefix="/account", tags=["account"])

# Customer Portal endpoints
api_router.include_router(portal_auth.router)
api_router.include_router(portal_tickets.router)
api_router.include_router(portal_surveys.router)
api_router.include_router(portal_dashboard.router)
