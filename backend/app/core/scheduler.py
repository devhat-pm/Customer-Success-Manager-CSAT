from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
import logging

from app.core.database import SessionLocal
from app.services.health_scoring_service import HealthScoringService
from app.services.alert_service import AlertService
from app.services.scheduled_report_service import ScheduledReportService
from app.services.email_service import EmailService

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def calculate_daily_health_scores():
    """Calculate health scores for all active customers."""
    logger.info("Starting daily health score calculation...")
    db = SessionLocal()
    try:
        health_service = HealthScoringService(db)
        result = health_service.calculate_all_health_scores()
        logger.info(f"Daily health score calculation complete: {result['calculated']}/{result['total_customers']} calculated")
    except Exception as e:
        logger.error(f"Error in daily health score calculation: {e}")
    finally:
        db.close()


def check_contract_expiry_alerts():
    """Check for expiring contracts and create alerts."""
    logger.info("Checking for contract expiry alerts...")
    db = SessionLocal()
    try:
        alert_service = AlertService(db)
        # Check for contracts expiring in next 30 days
        count = alert_service.check_contract_expiry_alerts(days_threshold=30)
        logger.info(f"Created {count} contract expiry alerts")
    except Exception as e:
        logger.error(f"Error checking contract expiry: {e}")
    finally:
        db.close()


def check_license_expiry_alerts():
    """Check for expiring licenses and create alerts."""
    logger.info("Checking for license expiry alerts...")
    db = SessionLocal()
    try:
        alert_service = AlertService(db)
        # Check for licenses expiring in next 30 days
        count = alert_service.check_license_expiry_alerts(days_threshold=30)
        logger.info(f"Created {count} license expiry alerts")
    except Exception as e:
        logger.error(f"Error checking license expiry: {e}")
    finally:
        db.close()


def check_inactivity_alerts():
    """Check for inactive customers and create alerts."""
    logger.info("Checking for customer inactivity alerts...")
    db = SessionLocal()
    try:
        alert_service = AlertService(db)
        # Check for customers with no interactions in last 30 days
        count = alert_service.check_inactivity_alerts(days_threshold=30)
        logger.info(f"Created {count} inactivity alerts")
    except Exception as e:
        logger.error(f"Error checking customer inactivity: {e}")
    finally:
        db.close()


def run_scheduled_reports():
    """Run due scheduled reports."""
    logger.info("Running scheduled reports...")
    db = SessionLocal()
    try:
        report_service = ScheduledReportService(db)
        results = report_service.run_due_reports()
        logger.info(f"Scheduled reports complete: {results['generated']} generated, {results['failed']} failed")
    except Exception as e:
        logger.error(f"Error running scheduled reports: {e}")
    finally:
        db.close()


def process_email_queue():
    """Process pending emails in the queue."""
    logger.info("Processing email queue...")
    db = SessionLocal()
    try:
        email_service = EmailService(db)
        result = email_service.process_queue()
        if result['processed'] > 0:
            logger.info(f"Email queue processed: {result['sent']} sent, {result['failed']} failed out of {result['processed']}")
    except Exception as e:
        logger.error(f"Error processing email queue: {e}")
    finally:
        db.close()


def setup_scheduler():
    """Configure and start the scheduler."""

    # Daily health score calculation at midnight
    scheduler.add_job(
        calculate_daily_health_scores,
        CronTrigger(hour=0, minute=0),
        id="daily_health_scores",
        name="Calculate daily health scores",
        replace_existing=True
    )

    # Contract expiry check daily at 8 AM
    scheduler.add_job(
        check_contract_expiry_alerts,
        CronTrigger(hour=8, minute=0),
        id="contract_expiry_check",
        name="Check contract expiry alerts",
        replace_existing=True
    )

    # License expiry check daily at 8:30 AM
    scheduler.add_job(
        check_license_expiry_alerts,
        CronTrigger(hour=8, minute=30),
        id="license_expiry_check",
        name="Check license expiry alerts",
        replace_existing=True
    )

    # Inactivity check daily at 9 AM
    scheduler.add_job(
        check_inactivity_alerts,
        CronTrigger(hour=9, minute=0),
        id="inactivity_check",
        name="Check customer inactivity alerts",
        replace_existing=True
    )

    # Scheduled reports check every hour
    scheduler.add_job(
        run_scheduled_reports,
        CronTrigger(minute=0),
        id="scheduled_reports",
        name="Run scheduled reports",
        replace_existing=True
    )

    # Email queue processing every minute
    scheduler.add_job(
        process_email_queue,
        IntervalTrigger(minutes=1),
        id="email_queue_processing",
        name="Process email queue",
        replace_existing=True
    )

    logger.info("Scheduler configured with jobs:")
    for job in scheduler.get_jobs():
        logger.info(f"  - {job.name} ({job.id}): {job.trigger}")


def start_scheduler():
    """Start the scheduler."""
    if not scheduler.running:
        setup_scheduler()
        scheduler.start()
        logger.info("Scheduler started")


def stop_scheduler():
    """Stop the scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped")


def get_scheduler_jobs():
    """Get list of scheduled jobs."""
    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "trigger": str(job.trigger),
            "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None
        })
    return jobs


def run_job_now(job_id: str) -> bool:
    """Manually trigger a job to run immediately."""
    job = scheduler.get_job(job_id)
    if job:
        job.func()
        return True
    return False
