import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, List

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(
    to_email: str,
    subject: str,
    body: str,
    html_body: Optional[str] = None,
    attachment_content: Optional[bytes] = None,
    attachment_filename: Optional[str] = None
) -> bool:
    """
    Send an email using SMTP.

    Args:
        to_email: Recipient email address
        subject: Email subject
        body: Plain text body
        html_body: Optional HTML body
        attachment_content: Optional attachment content as bytes
        attachment_filename: Optional attachment filename

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Check if email settings are configured
        if not hasattr(settings, 'SMTP_HOST') or not settings.SMTP_HOST:
            logger.warning("SMTP not configured, skipping email send")
            return False

        msg = MIMEMultipart('alternative')
        msg['From'] = settings.SMTP_FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject

        # Attach plain text body
        msg.attach(MIMEText(body, 'plain'))

        # Attach HTML body if provided
        if html_body:
            msg.attach(MIMEText(html_body, 'html'))

        # Attach file if provided
        if attachment_content and attachment_filename:
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(attachment_content)
            encoders.encode_base64(part)
            part.add_header(
                'Content-Disposition',
                f'attachment; filename="{attachment_filename}"'
            )
            msg.attach(part)

        # Connect and send
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"Email sent successfully to {to_email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_report_email(
    to_email: str,
    report_name: str,
    report_type: str,
    attachment_content: bytes,
    attachment_filename: str
) -> bool:
    """
    Send a report email with PDF attachment.

    Args:
        to_email: Recipient email address
        report_name: Name of the report
        report_type: Type of report
        attachment_content: PDF content as bytes
        attachment_filename: PDF filename

    Returns:
        bool: True if email sent successfully
    """
    subject = f"Report: {report_name}"

    body = f"""
Hello,

Your scheduled report "{report_name}" has been generated.

Report Type: {report_type}
Generated At: {attachment_filename.split('_')[-1].replace('.pdf', '')}

Please find the report attached to this email.

Best regards,
Customer Success Management System
"""

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #2d3748; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f7fafc; }}
        .footer {{ text-align: center; padding: 10px; color: #666; font-size: 12px; }}
        .report-info {{ background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }}
        .label {{ font-weight: bold; color: #2d3748; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Report Generated</h1>
        </div>
        <div class="content">
            <p>Hello,</p>
            <p>Your scheduled report <strong>"{report_name}"</strong> has been generated.</p>

            <div class="report-info">
                <p><span class="label">Report Type:</span> {report_type}</p>
                <p><span class="label">Filename:</span> {attachment_filename}</p>
            </div>

            <p>Please find the report attached to this email.</p>
        </div>
        <div class="footer">
            <p>Customer Success Management System</p>
        </div>
    </div>
</body>
</html>
"""

    return send_email(
        to_email=to_email,
        subject=subject,
        body=body,
        html_body=html_body,
        attachment_content=attachment_content,
        attachment_filename=attachment_filename
    )


def send_alert_notification(
    to_email: str,
    alert_title: str,
    alert_description: str,
    customer_name: str,
    severity: str
) -> bool:
    """
    Send an alert notification email.

    Args:
        to_email: Recipient email address
        alert_title: Alert title
        alert_description: Alert description
        customer_name: Customer name
        severity: Alert severity

    Returns:
        bool: True if email sent successfully
    """
    severity_colors = {
        'critical': '#e53e3e',
        'high': '#dd6b20',
        'medium': '#d69e2e',
        'low': '#38a169'
    }

    color = severity_colors.get(severity.lower(), '#718096')

    subject = f"[{severity.upper()}] Alert: {alert_title}"

    body = f"""
Alert Notification

Title: {alert_title}
Customer: {customer_name}
Severity: {severity.upper()}

Description:
{alert_description}

Please review this alert in the Customer Success Management System.
"""

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: {color}; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f7fafc; }}
        .footer {{ text-align: center; padding: 10px; color: #666; font-size: 12px; }}
        .alert-info {{ background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid {color}; }}
        .label {{ font-weight: bold; color: #2d3748; }}
        .severity {{ display: inline-block; padding: 5px 10px; background-color: {color}; color: white; border-radius: 3px; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Alert Notification</h1>
        </div>
        <div class="content">
            <div class="alert-info">
                <p><span class="label">Title:</span> {alert_title}</p>
                <p><span class="label">Customer:</span> {customer_name}</p>
                <p><span class="label">Severity:</span> <span class="severity">{severity.upper()}</span></p>
            </div>

            <p><strong>Description:</strong></p>
            <p>{alert_description}</p>

            <p>Please review this alert in the Customer Success Management System.</p>
        </div>
        <div class="footer">
            <p>Customer Success Management System</p>
        </div>
    </div>
</body>
</html>
"""

    return send_email(
        to_email=to_email,
        subject=subject,
        body=body,
        html_body=html_body
    )


def send_bulk_emails(
    recipients: List[str],
    subject: str,
    body: str,
    html_body: Optional[str] = None,
    attachment_content: Optional[bytes] = None,
    attachment_filename: Optional[str] = None
) -> dict:
    """
    Send email to multiple recipients.

    Args:
        recipients: List of email addresses
        subject: Email subject
        body: Plain text body
        html_body: Optional HTML body
        attachment_content: Optional attachment content
        attachment_filename: Optional attachment filename

    Returns:
        dict: Results with success and failure counts
    """
    results = {
        "total": len(recipients),
        "success": 0,
        "failed": 0,
        "failed_emails": []
    }

    for email in recipients:
        success = send_email(
            to_email=email,
            subject=subject,
            body=body,
            html_body=html_body,
            attachment_content=attachment_content,
            attachment_filename=attachment_filename
        )

        if success:
            results["success"] += 1
        else:
            results["failed"] += 1
            results["failed_emails"].append(email)

    return results
