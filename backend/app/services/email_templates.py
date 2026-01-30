"""
Email templates for the notification system.
Templates are simple HTML with placeholders that get replaced with actual data.
"""
from typing import Dict, Any
from app.models.email_queue import EmailTemplateType


# Base HTML template wrapper
BASE_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background: #2563eb;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }}
        .header img {{
            height: 40px;
            width: auto;
            filter: brightness(0) invert(1);
        }}
        .content {{
            background: #f9fafb;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
            border-radius: 0 0 8px 8px;
        }}
        .button {{
            display: inline-block;
            background: #2563eb;
            color: white !important;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
        }}
        .button:hover {{
            background: #1d4ed8;
        }}
        .footer {{
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
        }}
        .footer img {{
            height: 24px;
            width: auto;
            margin-bottom: 10px;
        }}
        .ticket-info {{
            background: white;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
            margin: 15px 0;
        }}
        .priority-critical {{ color: #dc2626; font-weight: bold; }}
        .priority-high {{ color: #ea580c; font-weight: bold; }}
        .priority-medium {{ color: #ca8a04; }}
        .priority-low {{ color: #16a34a; }}
        .status-badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
        }}
        .status-open {{ background: #dbeafe; color: #1e40af; }}
        .status-in_progress {{ background: #fef3c7; color: #92400e; }}
        .status-resolved {{ background: #d1fae5; color: #065f46; }}
        .status-closed {{ background: #e5e7eb; color: #374151; }}
    </style>
</head>
<body>
    <div class="header">
        <img src="{logo_url}" alt="Success Manager" onerror="this.style.display='none'">
    </div>
    <div class="content">
        {content}
    </div>
    <div class="footer">
        <img src="{logo_url}" alt="Success Manager" onerror="this.style.display='none'">
        <p>© {year} Success Manager. All rights reserved.</p>
        <p>This is an automated message. Please do not reply directly to this email.</p>
    </div>
</body>
</html>
"""

# Individual templates
TEMPLATES = {
    # ==================== Auth Templates ====================

    EmailTemplateType.invitation: {
        "subject": "You've been invited to the Extravis Customer Portal",
        "content": """
        <h2>Welcome to Extravis!</h2>
        <p>Hi {recipient_name},</p>
        <p><strong>{inviter_name}</strong> from Extravis has invited you to join the Customer Portal for <strong>{company_name}</strong>.</p>

        <p>With the Extravis Customer Portal, you can:</p>
        <ul>
            <li>Submit and track support tickets</li>
            <li>View your account health and product status</li>
            <li>Provide feedback to help us serve you better</li>
            <li>Access important announcements and updates</li>
        </ul>

        <p style="text-align: center;">
            <a href="{signup_url}" class="button">Complete Your Registration</a>
        </p>

        <p><strong>Note:</strong> This invitation link will expire in 7 days.</p>

        <p>If you have any questions, please contact your account manager or reply to this email.</p>

        <p>Best regards,<br>The Extravis Team</p>
        """
    },

    EmailTemplateType.welcome: {
        "subject": "Welcome to the Extravis Customer Portal",
        "content": """
        <h2>Welcome aboard, {recipient_name}!</h2>
        <p>Congratulations on creating your Extravis Customer Portal account!</p>

        <p>You now have access to:</p>
        <ul>
            <li><strong>Support Center</strong> - Submit and track your support tickets</li>
            <li><strong>Dashboard</strong> - View your account health and product status</li>
            <li><strong>Feedback</strong> - Share your experience and help us improve</li>
        </ul>

        <p style="text-align: center;">
            <a href="{login_url}" class="button">Go to Customer Portal</a>
        </p>

        <p>Need help getting started? Contact your account manager: <strong>{account_manager_name}</strong></p>

        <p>Best regards,<br>The Extravis Team</p>
        """
    },

    EmailTemplateType.password_reset: {
        "subject": "Reset your Extravis Portal password",
        "content": """
        <h2>Password Reset Request</h2>
        <p>Hi {recipient_name},</p>
        <p>We received a request to reset your password for your Extravis Customer Portal account.</p>

        <p style="text-align: center;">
            <a href="{reset_url}" class="button">Reset Your Password</a>
        </p>

        <p><strong>This link will expire in 1 hour.</strong></p>

        <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>

        <p>For security reasons, if you suspect unauthorized access to your account, please contact support immediately.</p>

        <p>Best regards,<br>The Extravis Team</p>
        """
    },

    EmailTemplateType.password_changed: {
        "subject": "Your Extravis Portal password was changed",
        "content": """
        <h2>Password Changed Successfully</h2>
        <p>Hi {recipient_name},</p>
        <p>Your Extravis Customer Portal password was successfully changed on {changed_at}.</p>

        <p><strong>If you made this change</strong>, no further action is needed.</p>

        <p><strong>If you did NOT make this change</strong>, please contact support immediately:</p>
        <ul>
            <li>Email: support@extravis.com</li>
            <li>Phone: {support_phone}</li>
        </ul>

        <p>Best regards,<br>The Extravis Team</p>
        """
    },

    EmailTemplateType.admin_password_reset: {
        "subject": "Reset your Success Manager Admin password",
        "content": """
        <h2>Password Reset Request</h2>
        <p>Hi {recipient_name},</p>
        <p>We received a request to reset your password for your Success Manager Admin account.</p>

        <p style="text-align: center;">
            <a href="{reset_url}" class="button">Reset Your Password</a>
        </p>

        <p><strong>This link will expire in 1 hour.</strong></p>

        <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>

        <p>For security reasons, if you suspect unauthorized access to your account, please contact your system administrator immediately.</p>

        <p>Best regards,<br>The Success Manager Team</p>
        """
    },

    # ==================== Ticket Templates - Customer ====================

    EmailTemplateType.ticket_created_customer: {
        "subject": "Ticket #{ticket_number} created: {ticket_subject}",
        "content": """
        <h2>Your Support Ticket Has Been Created</h2>
        <p>Hi {recipient_name},</p>
        <p>Thank you for contacting Extravis Support. Your ticket has been created and our team will review it shortly.</p>

        <div class="ticket-info">
            <p><strong>Ticket Number:</strong> {ticket_number}</p>
            <p><strong>Subject:</strong> {ticket_subject}</p>
            <p><strong>Product:</strong> {product}</p>
            <p><strong>Priority:</strong> <span class="priority-{priority_class}">{priority}</span></p>
            <p><strong>Status:</strong> <span class="status-badge status-open">Open</span></p>
        </div>

        <p><strong>Expected Response Time:</strong> {response_time}</p>

        <p style="text-align: center;">
            <a href="{ticket_url}" class="button">View Ticket</a>
        </p>

        <p>We'll notify you when there's an update on your ticket.</p>

        <p>Best regards,<br>Extravis Support Team</p>
        """
    },

    EmailTemplateType.ticket_status_update: {
        "subject": "Ticket #{ticket_number} update: Status changed to {new_status}",
        "content": """
        <h2>Ticket Status Updated</h2>
        <p>Hi {recipient_name},</p>
        <p>The status of your support ticket has been updated.</p>

        <div class="ticket-info">
            <p><strong>Ticket Number:</strong> {ticket_number}</p>
            <p><strong>Subject:</strong> {ticket_subject}</p>
            <p><strong>Previous Status:</strong> {old_status}</p>
            <p><strong>New Status:</strong> <span class="status-badge status-{status_class}">{new_status}</span></p>
        </div>

        {comment_section}

        <p style="text-align: center;">
            <a href="{ticket_url}" class="button">View Ticket</a>
        </p>

        <p>Best regards,<br>Extravis Support Team</p>
        """
    },

    EmailTemplateType.ticket_comment_customer: {
        "subject": "New reply on your ticket #{ticket_number}",
        "content": """
        <h2>New Reply on Your Ticket</h2>
        <p>Hi {recipient_name},</p>
        <p><strong>{commenter_name}</strong> from Extravis Support has replied to your ticket.</p>

        <div class="ticket-info">
            <p><strong>Ticket Number:</strong> {ticket_number}</p>
            <p><strong>Subject:</strong> {ticket_subject}</p>
        </div>

        <div style="background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0;">
            <p><em>"{comment_preview}"</em></p>
        </div>

        <p style="text-align: center;">
            <a href="{ticket_url}" class="button">View Full Conversation</a>
        </p>

        <p>Best regards,<br>Extravis Support Team</p>
        """
    },

    # ==================== Ticket Templates - Staff ====================

    EmailTemplateType.ticket_created_staff: {
        "subject": "New ticket from {company_name}: {ticket_subject}",
        "content": """
        <h2>New Support Ticket</h2>
        <p>A new support ticket has been submitted.</p>

        <div class="ticket-info">
            <p><strong>Customer:</strong> {company_name}</p>
            <p><strong>Submitted by:</strong> {submitter_name} ({submitter_email})</p>
            <p><strong>Ticket Number:</strong> {ticket_number}</p>
            <p><strong>Subject:</strong> {ticket_subject}</p>
            <p><strong>Product:</strong> {product}</p>
            <p><strong>Priority:</strong> <span class="priority-{priority_class}">{priority}</span></p>
        </div>

        <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <p><strong>Description:</strong></p>
            <p>{description_preview}</p>
        </div>

        <p style="text-align: center;">
            <a href="{ticket_url}" class="button">View in Admin Portal</a>
        </p>
        """
    },

    EmailTemplateType.ticket_comment_staff: {
        "subject": "Customer replied to ticket #{ticket_number}",
        "content": """
        <h2>Customer Reply Received</h2>
        <p>A customer has replied to a support ticket.</p>

        <div class="ticket-info">
            <p><strong>Customer:</strong> {company_name}</p>
            <p><strong>From:</strong> {commenter_name} ({commenter_email})</p>
            <p><strong>Ticket Number:</strong> {ticket_number}</p>
            <p><strong>Subject:</strong> {ticket_subject}</p>
        </div>

        <div style="background: white; padding: 15px; border-left: 4px solid #16a34a; margin: 15px 0;">
            <p><em>"{comment_preview}"</em></p>
        </div>

        <p style="text-align: center;">
            <a href="{ticket_url}" class="button">View Ticket</a>
        </p>
        """
    },

    # ==================== Survey Templates ====================

    EmailTemplateType.survey_request: {
        "subject": "We'd love your feedback - {survey_type_display}",
        "content": """
        <h2>Your Feedback Matters</h2>
        <p>Hi {recipient_name},</p>
        <p>At Extravis, we're committed to providing you with the best possible experience. Your feedback helps us understand what's working well and where we can improve.</p>

        {ticket_section}

        <p>This quick survey takes about <strong>2 minutes</strong> to complete.</p>

        <p style="text-align: center;">
            <a href="{survey_url}" class="button">Share Your Feedback</a>
        </p>

        <p><strong>Note:</strong> This survey link will expire on {expiry_date}.</p>

        {custom_message_section}

        <p>Thank you for being a valued Extravis customer!</p>

        <p>Best regards,<br>The Extravis Team</p>
        """
    },

    EmailTemplateType.survey_reminder: {
        "subject": "Reminder: Your feedback is valuable to us",
        "content": """
        <h2>Quick Reminder</h2>
        <p>Hi {recipient_name},</p>
        <p>We recently sent you a survey and would love to hear your thoughts. Your feedback directly influences how we improve our products and services.</p>

        {ticket_section}

        <p style="text-align: center;">
            <a href="{survey_url}" class="button">Complete Survey (2 min)</a>
        </p>

        <p><strong>⚠️ This survey link will expire on {expiry_date}.</strong></p>

        <p>Thank you for taking the time to help us serve you better!</p>

        <p>Best regards,<br>The Extravis Team</p>
        """
    },

    EmailTemplateType.ticket_resolution_survey: {
        "subject": "How did we do? Rate your support experience",
        "content": """
        <h2>Your Ticket Has Been Resolved</h2>
        <p>Hi {recipient_name},</p>
        <p>Great news! Your support ticket <strong>#{ticket_number}</strong> has been resolved.</p>

        <div class="ticket-info">
            <p><strong>Subject:</strong> {ticket_subject}</p>
            <p><strong>Resolution Time:</strong> {resolution_time}</p>
        </div>

        <p>We'd love to know how we did. Please take a moment to rate your experience:</p>

        <p style="text-align: center;">
            <a href="{survey_url}" class="button">Rate Your Experience</a>
        </p>

        <p>Your feedback helps us improve our support for all customers.</p>

        <p>Thank you for choosing Extravis!</p>

        <p>Best regards,<br>Extravis Support Team</p>
        """
    },

    # ==================== Alert Templates - Staff ====================

    EmailTemplateType.alert_health_drop: {
        "subject": "Alert: Health score dropped for {company_name}",
        "content": """
        <h2 style="color: #dc2626;">Health Score Alert</h2>
        <p>Hi {recipient_name},</p>
        <p>The health score for <strong>{company_name}</strong> has dropped significantly and requires your attention.</p>

        <div class="ticket-info" style="border-left: 4px solid #dc2626;">
            <p><strong>Customer:</strong> {company_name}</p>
            <p><strong>Previous Score:</strong> {previous_score}</p>
            <p><strong>Current Score:</strong> <span style="color: #dc2626; font-weight: bold;">{current_score}</span></p>
            <p><strong>Change:</strong> <span style="color: #dc2626;">-{score_change} points</span></p>
            <p><strong>Risk Level:</strong> <span style="color: #dc2626; font-weight: bold;">{risk_level}</span></p>
        </div>

        <p><strong>Contributing Factors:</strong></p>
        <ul>
            {factors_list}
        </ul>

        <p style="text-align: center;">
            <a href="{customer_url}" class="button" style="background: #dc2626;">View Customer Details</a>
        </p>

        <p>Please review this customer immediately to prevent potential churn.</p>

        <p>Best regards,<br>Success Manager System</p>
        """
    },

    EmailTemplateType.alert_contract_expiry: {
        "subject": "Contract Expiring: {company_name} - {days_remaining} days left",
        "content": """
        <h2 style="color: #ea580c;">Contract Expiry Alert</h2>
        <p>Hi {recipient_name},</p>
        <p>The contract for <strong>{company_name}</strong> is expiring soon and requires attention.</p>

        <div class="ticket-info" style="border-left: 4px solid #ea580c;">
            <p><strong>Customer:</strong> {company_name}</p>
            <p><strong>Contract Value:</strong> {contract_value}</p>
            <p><strong>Expiry Date:</strong> {expiry_date}</p>
            <p><strong>Days Remaining:</strong> <span style="color: #ea580c; font-weight: bold;">{days_remaining} days</span></p>
            <p><strong>Account Manager:</strong> {account_manager}</p>
        </div>

        <p><strong>Recommended Actions:</strong></p>
        <ul>
            <li>Schedule renewal discussion with the customer</li>
            <li>Review current contract terms and usage</li>
            <li>Prepare renewal proposal with any upsell opportunities</li>
            <li>Check for any outstanding issues or concerns</li>
        </ul>

        <p style="text-align: center;">
            <a href="{customer_url}" class="button" style="background: #ea580c;">View Customer Profile</a>
        </p>

        <p>Best regards,<br>Success Manager System</p>
        """
    },

    EmailTemplateType.alert_low_csat: {
        "subject": "Low CSAT Alert: {company_name} rated {score}/5",
        "content": """
        <h2 style="color: #ca8a04;">Low CSAT Score Alert</h2>
        <p>Hi {recipient_name},</p>
        <p>A low CSAT score has been received from <strong>{company_name}</strong>.</p>

        <div class="ticket-info" style="border-left: 4px solid #ca8a04;">
            <p><strong>Customer:</strong> {company_name}</p>
            <p><strong>Score:</strong> <span style="color: #ca8a04; font-weight: bold;">{score}/5</span></p>
            <p><strong>Survey Type:</strong> {survey_type}</p>
            <p><strong>Submitted By:</strong> {submitter_name}</p>
            <p><strong>Date:</strong> {submitted_date}</p>
        </div>

        <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <p><strong>Customer Feedback:</strong></p>
            <p><em>"{feedback_text}"</em></p>
        </div>

        <p style="text-align: center;">
            <a href="{customer_url}" class="button" style="background: #ca8a04;">Review & Take Action</a>
        </p>

        <p>Please follow up with this customer to address their concerns.</p>

        <p>Best regards,<br>Success Manager System</p>
        """
    },

    EmailTemplateType.alert_customer_at_risk: {
        "subject": "Customer At Risk: {company_name} - Immediate Action Required",
        "content": """
        <h2 style="color: #dc2626;">Customer At Risk Alert</h2>
        <p>Hi {recipient_name},</p>
        <p><strong>{company_name}</strong> has been flagged as at-risk and requires immediate attention.</p>

        <div class="ticket-info" style="border-left: 4px solid #dc2626;">
            <p><strong>Customer:</strong> {company_name}</p>
            <p><strong>Industry:</strong> {industry}</p>
            <p><strong>Contract Value:</strong> {contract_value}</p>
            <p><strong>Account Manager:</strong> {account_manager}</p>
            <p><strong>Risk Status:</strong> <span style="color: #dc2626; font-weight: bold;">AT RISK</span></p>
        </div>

        <p><strong>Risk Indicators:</strong></p>
        <ul>
            {risk_indicators}
        </ul>

        <p><strong>Recent Activity:</strong></p>
        <ul>
            {recent_activity}
        </ul>

        <p style="text-align: center;">
            <a href="{customer_url}" class="button" style="background: #dc2626;">View Customer & Take Action</a>
        </p>

        <p>Immediate intervention is recommended to prevent churn.</p>

        <p>Best regards,<br>Success Manager System</p>
        """
    },

    EmailTemplateType.alert_escalation: {
        "subject": "Escalation Alert: {company_name} - {escalation_type}",
        "content": """
        <h2 style="color: #7c3aed;">Escalation Alert</h2>
        <p>Hi {recipient_name},</p>
        <p>An escalation has been raised for <strong>{company_name}</strong>.</p>

        <div class="ticket-info" style="border-left: 4px solid #7c3aed;">
            <p><strong>Customer:</strong> {company_name}</p>
            <p><strong>Escalation Type:</strong> {escalation_type}</p>
            <p><strong>Severity:</strong> <span style="color: #7c3aed; font-weight: bold;">{severity}</span></p>
            <p><strong>Raised By:</strong> {raised_by}</p>
            <p><strong>Date:</strong> {escalation_date}</p>
        </div>

        <div style="background: #f5f3ff; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <p><strong>Description:</strong></p>
            <p>{description}</p>
        </div>

        <p style="text-align: center;">
            <a href="{escalation_url}" class="button" style="background: #7c3aed;">View Escalation Details</a>
        </p>

        <p>Please address this escalation as a priority.</p>

        <p>Best regards,<br>Success Manager System</p>
        """
    },

    # ==================== Customer Notification Templates ====================

    EmailTemplateType.customer_created: {
        "subject": "New Customer Added: {company_name}",
        "content": """
        <h2 style="color: #16a34a;">New Customer Onboarded</h2>
        <p>Hi {recipient_name},</p>
        <p>A new customer has been added to the Success Manager platform.</p>

        <div class="ticket-info" style="border-left: 4px solid #16a34a;">
            <p><strong>Company:</strong> {company_name}</p>
            <p><strong>Industry:</strong> {industry}</p>
            <p><strong>Contact:</strong> {contact_name}</p>
            <p><strong>Email:</strong> {contact_email}</p>
            <p><strong>Contract Value:</strong> {contract_value}</p>
            <p><strong>Account Manager:</strong> {account_manager}</p>
            <p><strong>Status:</strong> <span style="color: #16a34a;">Onboarding</span></p>
        </div>

        <p><strong>Next Steps:</strong></p>
        <ul>
            <li>Schedule kickoff meeting with customer</li>
            <li>Set up product deployments</li>
            <li>Send portal invitation to customer contacts</li>
            <li>Define success metrics and goals</li>
        </ul>

        <p style="text-align: center;">
            <a href="{customer_url}" class="button" style="background: #16a34a;">View Customer Profile</a>
        </p>

        <p>Best regards,<br>Success Manager System</p>
        """
    },

    EmailTemplateType.health_score_update: {
        "subject": "Health Score Update: {company_name} - Now at {current_score}",
        "content": """
        <h2>Health Score Update</h2>
        <p>Hi {recipient_name},</p>
        <p>The health score for <strong>{company_name}</strong> has been updated.</p>

        <div class="ticket-info">
            <p><strong>Customer:</strong> {company_name}</p>
            <p><strong>Previous Score:</strong> {previous_score}</p>
            <p><strong>Current Score:</strong> <span style="font-weight: bold; color: {score_color};">{current_score}</span></p>
            <p><strong>Trend:</strong> {trend}</p>
        </div>

        <p><strong>Score Breakdown:</strong></p>
        <ul>
            <li>Engagement: {engagement_score}</li>
            <li>Adoption: {adoption_score}</li>
            <li>Support: {support_score}</li>
            <li>Financial: {financial_score}</li>
        </ul>

        <p style="text-align: center;">
            <a href="{customer_url}" class="button">View Full Health Report</a>
        </p>

        <p>Best regards,<br>Success Manager System</p>
        """
    },

    EmailTemplateType.contract_renewal_reminder: {
        "subject": "Contract Renewal Reminder: {company_name}",
        "content": """
        <h2>Contract Renewal Reminder</h2>
        <p>Hi {recipient_name},</p>
        <p>This is a reminder about the upcoming contract renewal for <strong>{company_name}</strong>.</p>

        <div class="ticket-info">
            <p><strong>Customer:</strong> {company_name}</p>
            <p><strong>Current Contract Value:</strong> {contract_value}</p>
            <p><strong>Renewal Date:</strong> {renewal_date}</p>
            <p><strong>Days Until Renewal:</strong> {days_remaining}</p>
        </div>

        <p><strong>Customer Health Summary:</strong></p>
        <ul>
            <li>Health Score: {health_score}</li>
            <li>Average CSAT: {avg_csat}</li>
            <li>Open Tickets: {open_tickets}</li>
        </ul>

        <p style="text-align: center;">
            <a href="{customer_url}" class="button">Prepare Renewal</a>
        </p>

        <p>Best regards,<br>Success Manager System</p>
        """
    },

    # ==================== Report Templates ====================

    EmailTemplateType.scheduled_report: {
        "subject": "{report_name} - {report_date}",
        "content": """
        <h2>{report_name}</h2>
        <p>Hi {recipient_name},</p>
        <p>Your scheduled report is ready.</p>

        <div class="ticket-info">
            <p><strong>Report:</strong> {report_name}</p>
            <p><strong>Period:</strong> {report_period}</p>
            <p><strong>Generated:</strong> {generated_at}</p>
        </div>

        {report_summary}

        <p style="text-align: center;">
            <a href="{report_url}" class="button">View Full Report</a>
        </p>

        <p>This report was automatically generated based on your scheduled report settings.</p>

        <p>Best regards,<br>Success Manager System</p>
        """
    },

    EmailTemplateType.weekly_digest: {
        "subject": "Weekly Digest - {week_range}",
        "content": """
        <h2>Your Weekly Digest</h2>
        <p>Hi {recipient_name},</p>
        <p>Here's your weekly summary for <strong>{week_range}</strong>.</p>

        <div class="ticket-info">
            <h3 style="margin-top: 0;">Key Metrics</h3>
            <p><strong>Total Customers:</strong> {total_customers}</p>
            <p><strong>Active:</strong> {active_customers} | <strong>At Risk:</strong> <span style="color: #dc2626;">{at_risk_customers}</span></p>
            <p><strong>Average Health Score:</strong> {avg_health_score}</p>
            <p><strong>Average CSAT:</strong> {avg_csat}/5</p>
        </div>

        <div class="ticket-info">
            <h3 style="margin-top: 0;">This Week's Activity</h3>
            <p><strong>New Tickets:</strong> {new_tickets}</p>
            <p><strong>Resolved Tickets:</strong> {resolved_tickets}</p>
            <p><strong>New Surveys:</strong> {new_surveys}</p>
            <p><strong>Alerts Generated:</strong> {new_alerts}</p>
        </div>

        {customers_needing_attention}

        <p style="text-align: center;">
            <a href="{dashboard_url}" class="button">Go to Dashboard</a>
        </p>

        <p>Best regards,<br>Success Manager System</p>
        """
    },

    EmailTemplateType.custom: {
        "subject": "{subject}",
        "content": """
        {content}
        """
    },
}


def render_template(
    template_type: EmailTemplateType,
    data: Dict[str, Any]
) -> tuple[str, str]:
    """
    Render an email template with the provided data.

    Returns: (subject, html_body)
    """
    from datetime import datetime
    from app.core.config import settings

    template = TEMPLATES.get(template_type)
    if not template:
        raise ValueError(f"Unknown template type: {template_type}")

    # Add common data
    data.setdefault("year", datetime.utcnow().year)
    data.setdefault("support_phone", "1-800-EXTRAVIS")
    data.setdefault("logo_url", settings.LOGO_URL)

    # Render subject
    subject = template["subject"].format(**data)

    # Handle optional sections
    content = template["content"]

    # Comment section for status updates
    if "{comment_section}" in content:
        if data.get("comment_text"):
            comment_section = f"""
            <div style="background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 15px 0;">
                <p><strong>Comment from support:</strong></p>
                <p><em>"{data['comment_text']}"</em></p>
            </div>
            """
        else:
            comment_section = ""
        content = content.replace("{comment_section}", comment_section)

    # Ticket section for surveys
    if "{ticket_section}" in content:
        if data.get("ticket_number"):
            ticket_section = f"""
            <div class="ticket-info">
                <p>This feedback is related to your recent support ticket:</p>
                <p><strong>Ticket #{data['ticket_number']}:</strong> {data.get('ticket_subject', 'Support Request')}</p>
            </div>
            """
        else:
            ticket_section = ""
        content = content.replace("{ticket_section}", ticket_section)

    # Custom message section for surveys
    if "{custom_message_section}" in content:
        if data.get("custom_message"):
            custom_section = f"""
            <div style="background: #eff6ff; padding: 15px; border-radius: 6px; margin: 15px 0;">
                <p><em>"{data['custom_message']}"</em></p>
            </div>
            """
        else:
            custom_section = ""
        content = content.replace("{custom_message_section}", custom_section)

    # Render content
    try:
        rendered_content = content.format(**data)
    except KeyError as e:
        raise ValueError(f"Missing template variable: {e}")

    # Wrap in base template
    html_body = BASE_TEMPLATE.format(
        subject=subject,
        content=rendered_content,
        year=data["year"],
        logo_url=data["logo_url"]
    )

    return subject, html_body


def get_template_preview(template_type: EmailTemplateType) -> Dict[str, str]:
    """Get template info for preview."""
    template = TEMPLATES.get(template_type)
    if not template:
        raise ValueError(f"Unknown template type: {template_type}")

    return {
        "template_type": template_type.value,
        "subject_template": template["subject"],
        "content_preview": template["content"][:500] + "..."
    }


def get_all_template_types() -> list[Dict[str, str]]:
    """Get list of all template types with descriptions."""
    return [
        {"type": t.value, "description": t.value.replace("_", " ").title()}
        for t in EmailTemplateType
    ]
