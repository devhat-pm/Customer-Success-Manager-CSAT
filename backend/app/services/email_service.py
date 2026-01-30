"""
Email Service for queuing and sending email notifications.
"""
from datetime import datetime, timedelta
from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from sqlalchemy.orm import Session
from sqlalchemy import desc, and_

from app.models.email_queue import EmailQueue, EmailStatus, EmailTemplateType
from app.services.email_templates import render_template
from app.core.config import settings
from app.core.exceptions import NotFoundError, BadRequestError

logger = logging.getLogger(__name__)

# Configuration
MAX_RETRY_COUNT = 3
BATCH_SIZE = 50


class EmailService:
    """Service for managing email queue and sending emails."""

    def __init__(self, db: Session):
        self.db = db

    def queue_email(
        self,
        template_type: EmailTemplateType,
        recipient_email: str,
        recipient_name: Optional[str],
        template_data: Dict[str, Any],
        scheduled_at: Optional[datetime] = None,
        reference_type: Optional[str] = None,
        reference_id: Optional[UUID] = None
    ) -> EmailQueue:
        """
        Queue an email for sending.

        Args:
            template_type: Type of email template to use
            recipient_email: Email address to send to
            recipient_name: Recipient's name for personalization
            template_data: Data to populate the template
            scheduled_at: When to send (default: immediately)
            reference_type: Type of related object (ticket, survey, etc.)
            reference_id: ID of related object
        """
        # Add recipient name to template data
        template_data["recipient_name"] = recipient_name or "Valued Customer"

        # Render template to get subject
        try:
            subject, _ = render_template(template_type, template_data.copy())
        except Exception as e:
            logger.error(f"Failed to render template {template_type}: {e}")
            subject = f"Extravis Notification"

        email = EmailQueue(
            template_type=template_type,
            subject=subject,
            template_data=template_data,
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            status=EmailStatus.pending,
            scheduled_at=scheduled_at or datetime.utcnow(),
            reference_type=reference_type,
            reference_id=reference_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        self.db.add(email)
        self.db.commit()
        self.db.refresh(email)

        logger.info(f"Queued email {email.id}: {template_type.value} to {recipient_email}")
        return email

    def get_pending_emails(self, limit: int = BATCH_SIZE) -> List[EmailQueue]:
        """Get pending emails ready to be sent."""
        now = datetime.utcnow()

        return self.db.query(EmailQueue).filter(
            EmailQueue.status == EmailStatus.pending,
            EmailQueue.scheduled_at <= now,
            EmailQueue.retry_count < MAX_RETRY_COUNT
        ).order_by(EmailQueue.scheduled_at.asc()).limit(limit).all()

    def send_email(self, email: EmailQueue) -> bool:
        """
        Actually send an email.

        Returns True if successful, False otherwise.
        """
        try:
            # Mark as sending
            email.status = EmailStatus.sending
            email.updated_at = datetime.utcnow()
            self.db.commit()

            # Render the template
            template_data = email.template_data.copy()
            template_data["recipient_name"] = email.recipient_name or "Valued Customer"
            subject, html_body = render_template(email.template_type, template_data)

            # Send via configured method
            success = self._send_smtp(
                to_email=email.recipient_email,
                to_name=email.recipient_name,
                subject=subject,
                html_body=html_body
            )

            if success:
                email.status = EmailStatus.sent
                email.sent_at = datetime.utcnow()
                logger.info(f"Email {email.id} sent successfully to {email.recipient_email}")
            else:
                raise Exception("SMTP send returned False")

            email.updated_at = datetime.utcnow()
            self.db.commit()
            return True

        except Exception as e:
            logger.error(f"Failed to send email {email.id}: {e}")
            email.status = EmailStatus.failed
            email.error_message = str(e)[:500]
            email.retry_count += 1
            email.updated_at = datetime.utcnow()

            # If max retries reached, keep as failed
            if email.retry_count >= MAX_RETRY_COUNT:
                logger.error(f"Email {email.id} exceeded max retries, marking as permanently failed")
            else:
                # Reset to pending for retry
                email.status = EmailStatus.pending
                email.scheduled_at = datetime.utcnow() + timedelta(minutes=5 * email.retry_count)

            self.db.commit()
            return False

    def _send_smtp(
        self,
        to_email: str,
        to_name: Optional[str],
        subject: str,
        html_body: str
    ) -> bool:
        """Send email via SMTP."""
        # Get SMTP configuration from settings
        smtp_host = getattr(settings, 'SMTP_HOST', None)
        smtp_port = getattr(settings, 'SMTP_PORT', 587)
        smtp_user = getattr(settings, 'SMTP_USER', None)
        smtp_password = getattr(settings, 'SMTP_PASSWORD', None)
        from_email = getattr(settings, 'EMAIL_FROM_ADDRESS', 'noreply@extravis.com')
        from_name = getattr(settings, 'EMAIL_FROM_NAME', 'Extravis')

        # If SMTP not configured, log and return success (dev mode)
        if not smtp_host or not smtp_user:
            logger.warning(f"SMTP not configured. Would send email to {to_email}: {subject}")
            logger.debug(f"Email body preview: {html_body[:200]}...")
            return True

        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{from_name} <{from_email}>"
            msg['To'] = f"{to_name} <{to_email}>" if to_name else to_email

            # Attach HTML body
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)

            # Connect and send
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(from_email, to_email, msg.as_string())

            return True

        except Exception as e:
            logger.error(f"SMTP error sending to {to_email}: {e}")
            raise

    def process_queue(self) -> Dict[str, int]:
        """
        Process pending emails in the queue.

        Returns dict with counts of processed, sent, and failed emails.
        """
        pending = self.get_pending_emails()
        results = {"processed": 0, "sent": 0, "failed": 0}

        for email in pending:
            results["processed"] += 1
            if self.send_email(email):
                results["sent"] += 1
            else:
                results["failed"] += 1

        if results["processed"] > 0:
            logger.info(f"Email queue processed: {results}")

        return results

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[EmailStatus] = None,
        template_type: Optional[EmailTemplateType] = None,
        recipient_email: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Tuple[List[EmailQueue], int]:
        """Get emails from queue with filtering."""
        query = self.db.query(EmailQueue)

        if status:
            query = query.filter(EmailQueue.status == status)

        if template_type:
            query = query.filter(EmailQueue.template_type == template_type)

        if recipient_email:
            query = query.filter(EmailQueue.recipient_email.ilike(f"%{recipient_email}%"))

        if start_date:
            query = query.filter(EmailQueue.created_at >= start_date)

        if end_date:
            query = query.filter(EmailQueue.created_at <= end_date)

        total = query.count()
        emails = query.order_by(desc(EmailQueue.created_at)).offset(skip).limit(limit).all()

        return emails, total

    def get_by_id(self, email_id: UUID) -> EmailQueue:
        """Get email by ID."""
        email = self.db.query(EmailQueue).filter(EmailQueue.id == email_id).first()
        if not email:
            raise NotFoundError(detail="Email not found")
        return email

    def retry_email(self, email_id: UUID) -> EmailQueue:
        """Manually retry a failed email."""
        email = self.get_by_id(email_id)

        if email.status not in [EmailStatus.failed]:
            raise BadRequestError(detail=f"Cannot retry email with status: {email.status.value}")

        # Reset for retry
        email.status = EmailStatus.pending
        email.scheduled_at = datetime.utcnow()
        email.error_message = None
        email.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(email)

        logger.info(f"Email {email.id} queued for retry")
        return email

    def cancel_email(self, email_id: UUID) -> EmailQueue:
        """Cancel a pending email."""
        email = self.get_by_id(email_id)

        if email.status != EmailStatus.pending:
            raise BadRequestError(detail=f"Cannot cancel email with status: {email.status.value}")

        email.status = EmailStatus.cancelled
        email.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(email)

        logger.info(f"Email {email.id} cancelled")
        return email

    def get_stats(self) -> Dict[str, Any]:
        """Get email queue statistics."""
        total = self.db.query(EmailQueue).count()
        pending = self.db.query(EmailQueue).filter(EmailQueue.status == EmailStatus.pending).count()
        sent = self.db.query(EmailQueue).filter(EmailQueue.status == EmailStatus.sent).count()
        failed = self.db.query(EmailQueue).filter(EmailQueue.status == EmailStatus.failed).count()
        cancelled = self.db.query(EmailQueue).filter(EmailQueue.status == EmailStatus.cancelled).count()

        # Recent failures
        recent_failures = self.db.query(EmailQueue).filter(
            EmailQueue.status == EmailStatus.failed,
            EmailQueue.updated_at >= datetime.utcnow() - timedelta(hours=24)
        ).count()

        return {
            "total": total,
            "pending": pending,
            "sent": sent,
            "failed": failed,
            "cancelled": cancelled,
            "recent_failures_24h": recent_failures
        }


# ==================== Notification Helper Functions ====================

class EmailNotificationService:
    """
    High-level service for sending specific notification types.
    Used by other services to queue emails without worrying about templates.
    """

    def __init__(self, db: Session):
        self.db = db
        self.email_service = EmailService(db)
        self.portal_base_url = getattr(settings, 'PORTAL_BASE_URL', 'https://portal.extravis.com')
        self.admin_base_url = getattr(settings, 'ADMIN_BASE_URL', 'https://admin.extravis.com')

    def send_invitation_email(
        self,
        recipient_email: str,
        recipient_name: str,
        company_name: str,
        inviter_name: str,
        signup_token: str
    ) -> EmailQueue:
        """Send portal invitation email."""
        return self.email_service.queue_email(
            template_type=EmailTemplateType.invitation,
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            template_data={
                "company_name": company_name,
                "inviter_name": inviter_name,
                "signup_url": f"{self.portal_base_url}/signup?token={signup_token}"
            },
            reference_type="invitation"
        )

    def send_welcome_email(
        self,
        recipient_email: str,
        recipient_name: str,
        account_manager_name: str = "Your Account Manager"
    ) -> EmailQueue:
        """Send welcome email after signup."""
        return self.email_service.queue_email(
            template_type=EmailTemplateType.welcome,
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            template_data={
                "login_url": f"{self.portal_base_url}/login",
                "account_manager_name": account_manager_name
            }
        )

    def send_password_reset_email(
        self,
        recipient_email: str,
        recipient_name: str,
        reset_token: str
    ) -> EmailQueue:
        """Send password reset email."""
        return self.email_service.queue_email(
            template_type=EmailTemplateType.password_reset,
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            template_data={
                "reset_url": f"{self.portal_base_url}/reset-password?token={reset_token}"
            }
        )

    def send_password_changed_email(
        self,
        recipient_email: str,
        recipient_name: str
    ) -> EmailQueue:
        """Send password changed confirmation."""
        return self.email_service.queue_email(
            template_type=EmailTemplateType.password_changed,
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            template_data={
                "changed_at": datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC")
            }
        )

    def send_admin_password_reset_email(
        self,
        recipient_email: str,
        recipient_name: str,
        reset_token: str
    ) -> EmailQueue:
        """Send password reset email for admin users."""
        return self.email_service.queue_email(
            template_type=EmailTemplateType.admin_password_reset,
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            template_data={
                "reset_url": f"{self.admin_base_url}/reset-password?token={reset_token}"
            }
        )

    def send_ticket_created_to_customer(
        self,
        recipient_email: str,
        recipient_name: str,
        ticket_id: UUID,
        ticket_number: str,
        ticket_subject: str,
        product: str,
        priority: str
    ) -> EmailQueue:
        """Send ticket creation confirmation to customer."""
        # Response times based on priority
        response_times = {
            "critical": "Within 4 hours",
            "high": "Within 8 hours",
            "medium": "Within 24 hours",
            "low": "Within 72 hours"
        }

        return self.email_service.queue_email(
            template_type=EmailTemplateType.ticket_created_customer,
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            template_data={
                "ticket_number": ticket_number,
                "ticket_subject": ticket_subject,
                "product": product,
                "priority": priority.title(),
                "priority_class": priority.lower(),
                "response_time": response_times.get(priority.lower(), "Within 24 hours"),
                "ticket_url": f"{self.portal_base_url}/tickets/{ticket_id}"
            },
            reference_type="ticket",
            reference_id=ticket_id
        )

    def send_ticket_created_to_staff(
        self,
        staff_emails: List[str],
        company_name: str,
        submitter_name: str,
        submitter_email: str,
        ticket_id: UUID,
        ticket_number: str,
        ticket_subject: str,
        product: str,
        priority: str,
        description: str
    ) -> List[EmailQueue]:
        """Send ticket notification to staff."""
        emails = []
        for staff_email in staff_emails:
            email = self.email_service.queue_email(
                template_type=EmailTemplateType.ticket_created_staff,
                recipient_email=staff_email,
                recipient_name=None,
                template_data={
                    "company_name": company_name,
                    "submitter_name": submitter_name,
                    "submitter_email": submitter_email,
                    "ticket_number": ticket_number,
                    "ticket_subject": ticket_subject,
                    "product": product,
                    "priority": priority.title(),
                    "priority_class": priority.lower(),
                    "description_preview": description[:300] + "..." if len(description) > 300 else description,
                    "ticket_url": f"{self.admin_base_url}/tickets/{ticket_id}"
                },
                reference_type="ticket",
                reference_id=ticket_id
            )
            emails.append(email)
        return emails

    def send_ticket_status_update(
        self,
        recipient_email: str,
        recipient_name: str,
        ticket_id: UUID,
        ticket_number: str,
        ticket_subject: str,
        old_status: str,
        new_status: str,
        comment_text: Optional[str] = None
    ) -> EmailQueue:
        """Send ticket status update to customer."""
        return self.email_service.queue_email(
            template_type=EmailTemplateType.ticket_status_update,
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            template_data={
                "ticket_number": ticket_number,
                "ticket_subject": ticket_subject,
                "old_status": old_status.replace("_", " ").title(),
                "new_status": new_status.replace("_", " ").title(),
                "status_class": new_status.lower(),
                "comment_text": comment_text,
                "ticket_url": f"{self.portal_base_url}/tickets/{ticket_id}"
            },
            reference_type="ticket",
            reference_id=ticket_id
        )

    def send_ticket_comment_to_customer(
        self,
        recipient_email: str,
        recipient_name: str,
        ticket_id: UUID,
        ticket_number: str,
        ticket_subject: str,
        commenter_name: str,
        comment_text: str
    ) -> EmailQueue:
        """Send comment notification to customer."""
        return self.email_service.queue_email(
            template_type=EmailTemplateType.ticket_comment_customer,
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            template_data={
                "ticket_number": ticket_number,
                "ticket_subject": ticket_subject,
                "commenter_name": commenter_name,
                "comment_preview": comment_text[:200] + "..." if len(comment_text) > 200 else comment_text,
                "ticket_url": f"{self.portal_base_url}/tickets/{ticket_id}"
            },
            reference_type="ticket",
            reference_id=ticket_id
        )

    def send_ticket_comment_to_staff(
        self,
        staff_emails: List[str],
        company_name: str,
        commenter_name: str,
        commenter_email: str,
        ticket_id: UUID,
        ticket_number: str,
        ticket_subject: str,
        comment_text: str
    ) -> List[EmailQueue]:
        """Send comment notification to staff."""
        emails = []
        for staff_email in staff_emails:
            email = self.email_service.queue_email(
                template_type=EmailTemplateType.ticket_comment_staff,
                recipient_email=staff_email,
                recipient_name=None,
                template_data={
                    "company_name": company_name,
                    "commenter_name": commenter_name,
                    "commenter_email": commenter_email,
                    "ticket_number": ticket_number,
                    "ticket_subject": ticket_subject,
                    "comment_preview": comment_text[:200] + "..." if len(comment_text) > 200 else comment_text,
                    "ticket_url": f"{self.admin_base_url}/tickets/{ticket_id}"
                },
                reference_type="ticket",
                reference_id=ticket_id
            )
            emails.append(email)
        return emails

    def send_survey_request(
        self,
        recipient_email: str,
        recipient_name: str,
        survey_id: UUID,
        survey_type: str,
        survey_token: str,
        expiry_date: datetime,
        custom_message: Optional[str] = None,
        ticket_number: Optional[str] = None,
        ticket_subject: Optional[str] = None
    ) -> EmailQueue:
        """Send survey request email."""
        survey_type_display = survey_type.replace("_", " ").title()

        return self.email_service.queue_email(
            template_type=EmailTemplateType.survey_request,
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            template_data={
                "survey_type_display": survey_type_display,
                "survey_url": f"{self.portal_base_url}/surveys/submit/{survey_token}",
                "expiry_date": expiry_date.strftime("%B %d, %Y"),
                "custom_message": custom_message,
                "ticket_number": ticket_number,
                "ticket_subject": ticket_subject
            },
            reference_type="survey",
            reference_id=survey_id
        )

    def send_survey_reminder(
        self,
        recipient_email: str,
        recipient_name: str,
        survey_id: UUID,
        survey_token: str,
        expiry_date: datetime,
        ticket_number: Optional[str] = None,
        ticket_subject: Optional[str] = None
    ) -> EmailQueue:
        """Send survey reminder email."""
        return self.email_service.queue_email(
            template_type=EmailTemplateType.survey_reminder,
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            template_data={
                "survey_url": f"{self.portal_base_url}/surveys/submit/{survey_token}",
                "expiry_date": expiry_date.strftime("%B %d, %Y"),
                "ticket_number": ticket_number,
                "ticket_subject": ticket_subject
            },
            reference_type="survey",
            reference_id=survey_id
        )

    def send_ticket_resolution_survey(
        self,
        recipient_email: str,
        recipient_name: str,
        survey_id: UUID,
        survey_token: str,
        ticket_number: str,
        ticket_subject: str,
        resolution_time_hours: float
    ) -> EmailQueue:
        """Send ticket resolution survey email."""
        # Format resolution time
        if resolution_time_hours < 1:
            resolution_time = f"{int(resolution_time_hours * 60)} minutes"
        elif resolution_time_hours < 24:
            resolution_time = f"{resolution_time_hours:.1f} hours"
        else:
            days = resolution_time_hours / 24
            resolution_time = f"{days:.1f} days"

        return self.email_service.queue_email(
            template_type=EmailTemplateType.ticket_resolution_survey,
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            template_data={
                "ticket_number": ticket_number,
                "ticket_subject": ticket_subject,
                "resolution_time": resolution_time,
                "survey_url": f"{self.portal_base_url}/surveys/submit/{survey_token}"
            },
            reference_type="survey",
            reference_id=survey_id
        )

    # ==================== Alert Notifications ====================

    def send_health_drop_alert(
        self,
        staff_emails: List[str],
        company_name: str,
        customer_id: UUID,
        previous_score: int,
        current_score: int,
        risk_level: str,
        factors: List[str]
    ) -> List[EmailQueue]:
        """Send health score drop alert to staff."""
        factors_list = "".join([f"<li>{f}</li>" for f in factors])
        emails = []
        for staff_email in staff_emails:
            email = self.email_service.queue_email(
                template_type=EmailTemplateType.alert_health_drop,
                recipient_email=staff_email,
                recipient_name=None,
                template_data={
                    "company_name": company_name,
                    "previous_score": previous_score,
                    "current_score": current_score,
                    "score_change": previous_score - current_score,
                    "risk_level": risk_level,
                    "factors_list": factors_list,
                    "customer_url": f"{self.admin_base_url}/customers/{customer_id}"
                },
                reference_type="alert",
                reference_id=customer_id
            )
            emails.append(email)
        return emails

    def send_contract_expiry_alert(
        self,
        staff_emails: List[str],
        company_name: str,
        customer_id: UUID,
        contract_value: str,
        expiry_date: str,
        days_remaining: int,
        account_manager: str
    ) -> List[EmailQueue]:
        """Send contract expiry alert to staff."""
        emails = []
        for staff_email in staff_emails:
            email = self.email_service.queue_email(
                template_type=EmailTemplateType.alert_contract_expiry,
                recipient_email=staff_email,
                recipient_name=None,
                template_data={
                    "company_name": company_name,
                    "contract_value": contract_value,
                    "expiry_date": expiry_date,
                    "days_remaining": days_remaining,
                    "account_manager": account_manager,
                    "customer_url": f"{self.admin_base_url}/customers/{customer_id}"
                },
                reference_type="alert",
                reference_id=customer_id
            )
            emails.append(email)
        return emails

    def send_low_csat_alert(
        self,
        staff_emails: List[str],
        company_name: str,
        customer_id: UUID,
        score: int,
        survey_type: str,
        submitter_name: str,
        feedback_text: str,
        submitted_date: str
    ) -> List[EmailQueue]:
        """Send low CSAT score alert to staff."""
        emails = []
        for staff_email in staff_emails:
            email = self.email_service.queue_email(
                template_type=EmailTemplateType.alert_low_csat,
                recipient_email=staff_email,
                recipient_name=None,
                template_data={
                    "company_name": company_name,
                    "score": score,
                    "survey_type": survey_type,
                    "submitter_name": submitter_name,
                    "feedback_text": feedback_text[:500] if feedback_text else "No feedback provided",
                    "submitted_date": submitted_date,
                    "customer_url": f"{self.admin_base_url}/customers/{customer_id}"
                },
                reference_type="csat",
                reference_id=customer_id
            )
            emails.append(email)
        return emails

    def send_customer_at_risk_alert(
        self,
        staff_emails: List[str],
        company_name: str,
        customer_id: UUID,
        industry: str,
        contract_value: str,
        account_manager: str,
        risk_indicators: List[str],
        recent_activity: List[str]
    ) -> List[EmailQueue]:
        """Send customer at risk alert to staff."""
        risk_list = "".join([f"<li>{r}</li>" for r in risk_indicators])
        activity_list = "".join([f"<li>{a}</li>" for a in recent_activity])
        emails = []
        for staff_email in staff_emails:
            email = self.email_service.queue_email(
                template_type=EmailTemplateType.alert_customer_at_risk,
                recipient_email=staff_email,
                recipient_name=None,
                template_data={
                    "company_name": company_name,
                    "industry": industry,
                    "contract_value": contract_value,
                    "account_manager": account_manager,
                    "risk_indicators": risk_list,
                    "recent_activity": activity_list,
                    "customer_url": f"{self.admin_base_url}/customers/{customer_id}"
                },
                reference_type="alert",
                reference_id=customer_id
            )
            emails.append(email)
        return emails

    def send_escalation_alert(
        self,
        staff_emails: List[str],
        company_name: str,
        escalation_id: UUID,
        escalation_type: str,
        severity: str,
        raised_by: str,
        description: str,
        escalation_date: str
    ) -> List[EmailQueue]:
        """Send escalation alert to staff."""
        emails = []
        for staff_email in staff_emails:
            email = self.email_service.queue_email(
                template_type=EmailTemplateType.alert_escalation,
                recipient_email=staff_email,
                recipient_name=None,
                template_data={
                    "company_name": company_name,
                    "escalation_type": escalation_type,
                    "severity": severity,
                    "raised_by": raised_by,
                    "description": description,
                    "escalation_date": escalation_date,
                    "escalation_url": f"{self.admin_base_url}/alerts/{escalation_id}"
                },
                reference_type="escalation",
                reference_id=escalation_id
            )
            emails.append(email)
        return emails

    # ==================== Customer Notifications ====================

    def send_customer_created_notification(
        self,
        staff_emails: List[str],
        company_name: str,
        customer_id: UUID,
        industry: str,
        contact_name: str,
        contact_email: str,
        contract_value: str,
        account_manager: str
    ) -> List[EmailQueue]:
        """Send new customer notification to staff."""
        emails = []
        for staff_email in staff_emails:
            email = self.email_service.queue_email(
                template_type=EmailTemplateType.customer_created,
                recipient_email=staff_email,
                recipient_name=None,
                template_data={
                    "company_name": company_name,
                    "industry": industry,
                    "contact_name": contact_name,
                    "contact_email": contact_email,
                    "contract_value": contract_value,
                    "account_manager": account_manager,
                    "customer_url": f"{self.admin_base_url}/customers/{customer_id}"
                },
                reference_type="customer",
                reference_id=customer_id
            )
            emails.append(email)
        return emails

    def send_weekly_digest(
        self,
        recipient_email: str,
        recipient_name: str,
        week_range: str,
        total_customers: int,
        active_customers: int,
        at_risk_customers: int,
        avg_health_score: float,
        avg_csat: float,
        new_tickets: int,
        resolved_tickets: int,
        new_surveys: int,
        new_alerts: int,
        customers_needing_attention: List[dict]
    ) -> EmailQueue:
        """Send weekly digest email to staff."""
        # Format customers needing attention
        if customers_needing_attention:
            attention_html = "<div class='ticket-info'><h3 style='margin-top: 0;'>Customers Needing Attention</h3><ul>"
            for c in customers_needing_attention[:5]:
                attention_html += f"<li><strong>{c['name']}</strong> - {c['reason']}</li>"
            attention_html += "</ul></div>"
        else:
            attention_html = ""

        return self.email_service.queue_email(
            template_type=EmailTemplateType.weekly_digest,
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            template_data={
                "week_range": week_range,
                "total_customers": total_customers,
                "active_customers": active_customers,
                "at_risk_customers": at_risk_customers,
                "avg_health_score": f"{avg_health_score:.0f}",
                "avg_csat": f"{avg_csat:.1f}",
                "new_tickets": new_tickets,
                "resolved_tickets": resolved_tickets,
                "new_surveys": new_surveys,
                "new_alerts": new_alerts,
                "customers_needing_attention": attention_html,
                "dashboard_url": f"{self.admin_base_url}/dashboard"
            }
        )
