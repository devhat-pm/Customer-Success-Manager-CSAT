import os
from datetime import datetime, timedelta
from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
import logging

from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from app.core.config import settings
from app.core.exceptions import NotFoundError, BadRequestError
from app.models.scheduled_report import ScheduledReport, ReportType, Frequency
from app.models.report_history import ReportHistory, ReportStatus
from app.schemas.scheduled_report import ScheduledReportCreate, ScheduledReportUpdate
from app.services.report_generator_service import ReportGeneratorService

logger = logging.getLogger(__name__)


class ScheduledReportService:
    def __init__(self, db: Session):
        self.db = db
        self.reports_dir = os.path.join(os.path.dirname(__file__), "..", "..", "reports")
        os.makedirs(self.reports_dir, exist_ok=True)

    def get_by_id(self, report_id: UUID) -> ScheduledReport:
        report = self.db.query(ScheduledReport).filter(
            ScheduledReport.id == report_id
        ).first()
        if not report:
            raise NotFoundError(detail="Scheduled report not found")
        return report

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        report_type: Optional[ReportType] = None,
        frequency: Optional[Frequency] = None,
        is_active: Optional[bool] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Tuple[List[ScheduledReport], int]:
        query = self.db.query(ScheduledReport)

        if report_type:
            query = query.filter(ScheduledReport.report_type == report_type)

        if frequency:
            query = query.filter(ScheduledReport.frequency == frequency)

        if is_active is not None:
            query = query.filter(ScheduledReport.is_active == is_active)

        total = query.count()

        sort_column = getattr(ScheduledReport, sort_by, ScheduledReport.created_at)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        reports = query.offset(skip).limit(limit).all()
        return reports, total

    def create(self, report_data: ScheduledReportCreate) -> ScheduledReport:
        report = ScheduledReport(
            report_name=report_data.report_name,
            report_type=report_data.report_type,
            frequency=report_data.frequency,
            recipients=report_data.recipients,
            filters=report_data.filters,
            next_scheduled_at=report_data.next_scheduled_at,
            is_active=report_data.is_active
        )

        self.db.add(report)
        self.db.commit()
        self.db.refresh(report)

        logger.info(f"Scheduled report created: {report.report_name}")
        return report

    def update(self, report_id: UUID, report_data: ScheduledReportUpdate) -> ScheduledReport:
        report = self.get_by_id(report_id)

        if report_data.report_name is not None:
            report.report_name = report_data.report_name

        if report_data.report_type is not None:
            report.report_type = report_data.report_type

        if report_data.frequency is not None:
            report.frequency = report_data.frequency

        if report_data.recipients is not None:
            report.recipients = report_data.recipients

        if report_data.filters is not None:
            report.filters = report_data.filters

        if report_data.next_scheduled_at is not None:
            report.next_scheduled_at = report_data.next_scheduled_at

        if report_data.is_active is not None:
            report.is_active = report_data.is_active

        self.db.commit()
        self.db.refresh(report)

        logger.info(f"Scheduled report updated: {report_id}")
        return report

    def delete(self, report_id: UUID) -> None:
        report = self.get_by_id(report_id)
        self.db.delete(report)
        self.db.commit()
        logger.info(f"Scheduled report deleted: {report_id}")

    def toggle_active(self, report_id: UUID) -> ScheduledReport:
        report = self.get_by_id(report_id)
        report.is_active = not report.is_active
        self.db.commit()
        self.db.refresh(report)
        logger.info(f"Scheduled report {report_id} active status: {report.is_active}")
        return report

    def generate_report(
        self,
        report_type: ReportType,
        filters: Optional[Dict[str, Any]] = None,
        scheduled_report_id: Optional[UUID] = None
    ) -> ReportHistory:
        """Generate a report and save to file system."""
        generator = ReportGeneratorService(self.db)

        # Generate PDF based on type
        if report_type == ReportType.health_summary:
            pdf_buffer = generator.generate_health_summary_report(filters)
        elif report_type == ReportType.csat_analysis:
            pdf_buffer = generator.generate_csat_analysis_report(filters)
        elif report_type == ReportType.customer_overview:
            pdf_buffer = generator.generate_customer_overview_report(filters=filters)
        elif report_type == ReportType.executive_summary:
            pdf_buffer = generator.generate_executive_summary_report(filters)
        else:
            raise BadRequestError(detail=f"Unknown report type: {report_type}")

        # Save to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{report_type.value}_{timestamp}.pdf"
        file_path = os.path.join(self.reports_dir, filename)

        pdf_content = pdf_buffer.getvalue()
        with open(file_path, 'wb') as f:
            f.write(pdf_content)

        file_size = len(pdf_content)

        # Create history record
        history = ReportHistory(
            scheduled_report_id=scheduled_report_id,
            report_type=report_type.value,
            file_path=file_path,
            file_size=file_size,
            status=ReportStatus.completed
        )

        self.db.add(history)

        # Update scheduled report if applicable
        if scheduled_report_id:
            scheduled_report = self.get_by_id(scheduled_report_id)
            scheduled_report.last_generated_at = datetime.utcnow()
            scheduled_report.next_scheduled_at = self._calculate_next_run(
                scheduled_report.frequency
            )

        self.db.commit()
        self.db.refresh(history)

        logger.info(f"Report generated: {filename} ({file_size} bytes)")
        return history

    def _calculate_next_run(self, frequency: Frequency) -> datetime:
        """Calculate next scheduled run time based on frequency."""
        now = datetime.utcnow()

        if frequency == Frequency.daily:
            next_run = now + timedelta(days=1)
        elif frequency == Frequency.weekly:
            next_run = now + timedelta(weeks=1)
        elif frequency == Frequency.monthly:
            # Add roughly one month
            if now.month == 12:
                next_run = now.replace(year=now.year + 1, month=1)
            else:
                next_run = now.replace(month=now.month + 1)
        elif frequency == Frequency.quarterly:
            # Add roughly three months
            month = now.month + 3
            year = now.year
            if month > 12:
                month -= 12
                year += 1
            next_run = now.replace(year=year, month=month)
        else:
            next_run = now + timedelta(days=1)

        # Set to 6 AM
        return next_run.replace(hour=6, minute=0, second=0, microsecond=0)

    def get_history(
        self,
        skip: int = 0,
        limit: int = 50,
        scheduled_report_id: Optional[UUID] = None,
        report_type: Optional[str] = None,
        status: Optional[ReportStatus] = None
    ) -> Tuple[List[ReportHistory], int]:
        """Get report generation history."""
        query = self.db.query(ReportHistory)

        if scheduled_report_id:
            query = query.filter(ReportHistory.scheduled_report_id == scheduled_report_id)

        if report_type:
            query = query.filter(ReportHistory.report_type == report_type)

        if status:
            query = query.filter(ReportHistory.status == status)

        total = query.count()
        history = query.order_by(desc(ReportHistory.generated_at)).offset(skip).limit(limit).all()

        return history, total

    def get_history_by_id(self, history_id: UUID) -> ReportHistory:
        history = self.db.query(ReportHistory).filter(
            ReportHistory.id == history_id
        ).first()
        if not history:
            raise NotFoundError(detail="Report history not found")
        return history

    def get_report_file(self, history_id: UUID) -> Tuple[bytes, str]:
        """Get report file content for download."""
        history = self.get_history_by_id(history_id)

        if not os.path.exists(history.file_path):
            raise NotFoundError(detail="Report file not found")

        with open(history.file_path, 'rb') as f:
            content = f.read()

        filename = os.path.basename(history.file_path)
        return content, filename

    def run_due_reports(self) -> Dict[str, Any]:
        """Run all scheduled reports that are due."""
        now = datetime.utcnow()

        due_reports = self.db.query(ScheduledReport).filter(
            ScheduledReport.is_active == True,
            ScheduledReport.next_scheduled_at <= now
        ).all()

        results = {
            "total_due": len(due_reports),
            "generated": 0,
            "failed": 0,
            "errors": []
        }

        for report in due_reports:
            try:
                history = self.generate_report(
                    report_type=report.report_type,
                    filters=report.filters,
                    scheduled_report_id=report.id
                )

                # Send emails to recipients
                if report.recipients:
                    self._send_report_emails(report, history)

                results["generated"] += 1
                logger.info(f"Generated scheduled report: {report.report_name}")

            except Exception as e:
                results["failed"] += 1
                results["errors"].append({
                    "report_id": str(report.id),
                    "report_name": report.report_name,
                    "error": str(e)
                })
                logger.error(f"Failed to generate report {report.report_name}: {e}")

                # Record failure in history
                failure_history = ReportHistory(
                    scheduled_report_id=report.id,
                    report_type=report.report_type.value,
                    file_path="",
                    file_size=0,
                    status=ReportStatus.failed,
                    error_message=str(e)
                )
                self.db.add(failure_history)
                self.db.commit()

        return results

    def _send_report_emails(self, report: ScheduledReport, history: ReportHistory) -> None:
        """Send report to recipients via email."""
        try:
            from app.utils.email import send_report_email

            with open(history.file_path, 'rb') as f:
                attachment_content = f.read()

            filename = os.path.basename(history.file_path)

            for recipient in report.recipients:
                send_report_email(
                    to_email=recipient,
                    report_name=report.report_name,
                    report_type=report.report_type.value,
                    attachment_content=attachment_content,
                    attachment_filename=filename
                )

            logger.info(f"Report emails sent to {len(report.recipients)} recipients")

        except ImportError:
            logger.warning("Email utility not configured, skipping email delivery")
        except Exception as e:
            logger.error(f"Failed to send report emails: {e}")

    def get_dashboard_stats(self) -> Dict[str, Any]:
        """Get report dashboard statistics."""
        total_scheduled = self.db.query(ScheduledReport).count()
        active_scheduled = self.db.query(ScheduledReport).filter(
            ScheduledReport.is_active == True
        ).count()

        # Reports generated this month
        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        generated_this_month = self.db.query(ReportHistory).filter(
            ReportHistory.generated_at >= month_start,
            ReportHistory.status == ReportStatus.completed
        ).count()

        # Failed this month
        failed_this_month = self.db.query(ReportHistory).filter(
            ReportHistory.generated_at >= month_start,
            ReportHistory.status == ReportStatus.failed
        ).count()

        # By type
        by_type = {}
        for rt in ReportType:
            count = self.db.query(ScheduledReport).filter(
                ScheduledReport.report_type == rt
            ).count()
            by_type[rt.value] = count

        return {
            "total_scheduled": total_scheduled,
            "active_scheduled": active_scheduled,
            "generated_this_month": generated_this_month,
            "failed_this_month": failed_this_month,
            "by_type": by_type
        }
