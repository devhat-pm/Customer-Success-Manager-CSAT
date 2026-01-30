import os
from datetime import datetime, date, timedelta
from typing import Dict, Any, Optional, List
from uuid import UUID
from io import BytesIO
import logging

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import settings
from app.models.customer import Customer, CustomerStatus
from app.models.health_score import HealthScore, ScoreTrend
from app.models.csat_survey import CSATSurvey, SurveyType
from app.models.alert import Alert, Severity
from app.models.product_deployment import ProductDeployment
from app.models.customer_interaction import CustomerInteraction

logger = logging.getLogger(__name__)


class ReportGeneratorService:
    def __init__(self, db: Session):
        self.db = db
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles for reports with Extravis branding."""
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#9C27B0')  # Extravis Primary
        ))
        self.styles.add(ParagraphStyle(
            name='SectionTitle',
            parent=self.styles['Heading2'],
            fontSize=16,
            spaceBefore=20,
            spaceAfter=10,
            textColor=colors.HexColor('#7B1FA2')  # Extravis Primary 700
        ))
        self.styles.add(ParagraphStyle(
            name='SubSection',
            parent=self.styles['Heading3'],
            fontSize=12,
            spaceBefore=15,
            spaceAfter=8,
            textColor=colors.HexColor('#4a5568')
        ))
        self.styles.add(ParagraphStyle(
            name='CustomBodyText',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=6
        ))
        self.styles.add(ParagraphStyle(
            name='FooterText',
            parent=self.styles['Normal'],
            fontSize=8,
            alignment=TA_CENTER,
            textColor=colors.gray
        ))

    def generate_health_summary_report(
        self,
        filters: Optional[Dict[str, Any]] = None
    ) -> BytesIO:
        """Generate health summary PDF report."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch
        )

        elements = []

        # Title
        elements.append(Paragraph("Customer Health Summary Report", self.styles['ReportTitle']))
        elements.append(Paragraph(
            f"Generated on: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
            self.styles['BodyText']
        ))
        elements.append(Spacer(1, 20))

        # Overall Health Distribution
        elements.append(Paragraph("Health Score Distribution", self.styles['SectionTitle']))

        health_data = self._get_health_distribution()
        if health_data:
            table_data = [["Health Status", "Count", "Percentage"]]
            total = sum(h['count'] for h in health_data)
            for item in health_data:
                percentage = (item['count'] / total * 100) if total > 0 else 0
                table_data.append([item['status'], str(item['count']), f"{percentage:.1f}%"])

            table = Table(table_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch])
            table.setStyle(self._get_table_style())
            elements.append(table)
        else:
            elements.append(Paragraph("No health score data available.", self.styles['BodyText']))

        elements.append(Spacer(1, 20))

        # At-Risk Customers
        elements.append(Paragraph("At-Risk Customers", self.styles['SectionTitle']))

        at_risk = self._get_at_risk_customers()
        if at_risk:
            table_data = [["Customer", "Health Score", "Trend", "Key Concerns"]]
            for customer in at_risk[:10]:
                table_data.append([
                    customer['company_name'],
                    str(customer['health_score']),
                    customer['trend'],
                    customer['concerns'][:50] + "..." if len(customer.get('concerns', '')) > 50 else customer.get('concerns', 'N/A')
                ])

            table = Table(table_data, colWidths=[2*inch, 1*inch, 1*inch, 2.5*inch])
            table.setStyle(self._get_table_style())
            elements.append(table)
        else:
            elements.append(Paragraph("No at-risk customers identified.", self.styles['BodyText']))

        elements.append(Spacer(1, 20))

        # Trend Analysis
        elements.append(Paragraph("Score Trend Analysis", self.styles['SectionTitle']))

        trend_data = self._get_trend_analysis()
        table_data = [["Trend", "Customer Count"]]
        for trend, count in trend_data.items():
            table_data.append([trend.replace('_', ' ').title(), str(count)])

        table = Table(table_data, colWidths=[3*inch, 2*inch])
        table.setStyle(self._get_table_style())
        elements.append(table)

        # Footer
        elements.append(Spacer(1, 40))
        elements.append(Paragraph(
            "This report is auto-generated by the Customer Success Management System.",
            self.styles['FooterText']
        ))

        doc.build(elements)
        buffer.seek(0)
        return buffer

    def generate_csat_analysis_report(
        self,
        filters: Optional[Dict[str, Any]] = None
    ) -> BytesIO:
        """Generate CSAT analysis PDF report."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch
        )

        elements = []

        # Title
        elements.append(Paragraph("CSAT Analysis Report", self.styles['ReportTitle']))
        elements.append(Paragraph(
            f"Generated on: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
            self.styles['BodyText']
        ))
        elements.append(Spacer(1, 20))

        # Overall CSAT Score
        elements.append(Paragraph("Overall CSAT Metrics", self.styles['SectionTitle']))

        csat_metrics = self._get_csat_metrics()
        metrics_data = [
            ["Metric", "Value"],
            ["Average CSAT Score", f"{csat_metrics['avg_csat']:.2f}" if csat_metrics['avg_csat'] else "N/A"],
            ["Total Responses", str(csat_metrics['total_responses'])],
            ["NPS Score", f"{csat_metrics['nps']:.1f}" if csat_metrics['nps'] is not None else "N/A"],
            ["Response Rate (30 days)", f"{csat_metrics['response_rate']:.1f}%" if csat_metrics['response_rate'] else "N/A"]
        ]

        table = Table(metrics_data, colWidths=[3*inch, 2*inch])
        table.setStyle(self._get_table_style())
        elements.append(table)

        elements.append(Spacer(1, 20))

        # Score by Survey Type
        elements.append(Paragraph("Scores by Survey Type", self.styles['SectionTitle']))

        by_type = self._get_csat_by_type()
        if by_type:
            table_data = [["Survey Type", "Avg Score", "Count"]]
            for item in by_type:
                table_data.append([
                    item['survey_type'],
                    f"{item['avg_score']:.2f}",
                    str(item['count'])
                ])

            table = Table(table_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch])
            table.setStyle(self._get_table_style())
            elements.append(table)

        elements.append(Spacer(1, 20))

        # Low Scores Analysis
        elements.append(Paragraph("Recent Low Scores (Below 3)", self.styles['SectionTitle']))

        low_scores = self._get_low_csat_scores()
        if low_scores:
            table_data = [["Customer", "Score", "Type", "Date"]]
            for item in low_scores[:10]:
                table_data.append([
                    item['customer_name'],
                    str(item['score']),
                    item['survey_type'],
                    item['date']
                ])

            table = Table(table_data, colWidths=[2.5*inch, 1*inch, 1.5*inch, 1.5*inch])
            table.setStyle(self._get_table_style())
            elements.append(table)
        else:
            elements.append(Paragraph("No low scores in the selected period.", self.styles['BodyText']))

        # Footer
        elements.append(Spacer(1, 40))
        elements.append(Paragraph(
            "This report is auto-generated by the Customer Success Management System.",
            self.styles['FooterText']
        ))

        doc.build(elements)
        buffer.seek(0)
        return buffer

    def generate_customer_overview_report(
        self,
        customer_id: Optional[UUID] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> BytesIO:
        """Generate customer overview PDF report."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch
        )

        elements = []

        # Title
        elements.append(Paragraph("Customer Overview Report", self.styles['ReportTitle']))
        elements.append(Paragraph(
            f"Generated on: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
            self.styles['BodyText']
        ))
        elements.append(Spacer(1, 20))

        # Customer Summary
        elements.append(Paragraph("Customer Base Summary", self.styles['SectionTitle']))

        customer_stats = self._get_customer_stats()
        stats_data = [
            ["Metric", "Value"],
            ["Total Customers", str(customer_stats['total'])],
            ["Active Customers", str(customer_stats['active'])],
            ["At Risk", str(customer_stats['at_risk'])],
            ["Churned", str(customer_stats['churned'])],
            ["New This Month", str(customer_stats['new_this_month'])]
        ]

        table = Table(stats_data, colWidths=[3*inch, 2*inch])
        table.setStyle(self._get_table_style())
        elements.append(table)

        elements.append(Spacer(1, 20))

        # Product Deployment Overview
        elements.append(Paragraph("Product Deployment Overview", self.styles['SectionTitle']))

        deployment_stats = self._get_deployment_stats()
        if deployment_stats:
            table_data = [["Product", "Active Deployments", "Avg Health Score"]]
            for item in deployment_stats:
                table_data.append([
                    item['product'],
                    str(item['count']),
                    f"{item['avg_health']:.1f}" if item['avg_health'] else "N/A"
                ])

            table = Table(table_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch])
            table.setStyle(self._get_table_style())
            elements.append(table)

        elements.append(Spacer(1, 20))

        # Contract Renewals Coming Up
        elements.append(Paragraph("Upcoming Contract Renewals (Next 60 Days)", self.styles['SectionTitle']))

        renewals = self._get_upcoming_renewals(60)
        if renewals:
            table_data = [["Customer", "Contract End", "Value", "Days Left"]]
            for item in renewals[:10]:
                table_data.append([
                    item['company_name'],
                    item['contract_end'],
                    f"${item['contract_value']:,.2f}" if item['contract_value'] else "N/A",
                    str(item['days_left'])
                ])

            table = Table(table_data, colWidths=[2*inch, 1.5*inch, 1.5*inch, 1*inch])
            table.setStyle(self._get_table_style())
            elements.append(table)
        else:
            elements.append(Paragraph("No renewals in the next 60 days.", self.styles['BodyText']))

        # Footer
        elements.append(Spacer(1, 40))
        elements.append(Paragraph(
            "This report is auto-generated by the Customer Success Management System.",
            self.styles['FooterText']
        ))

        doc.build(elements)
        buffer.seek(0)
        return buffer

    def generate_executive_summary_report(
        self,
        filters: Optional[Dict[str, Any]] = None
    ) -> BytesIO:
        """Generate executive summary PDF report."""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch
        )

        elements = []

        # Title
        elements.append(Paragraph("Executive Summary Report", self.styles['ReportTitle']))
        elements.append(Paragraph(
            f"Generated on: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
            self.styles['BodyText']
        ))
        elements.append(Spacer(1, 20))

        # Key Metrics
        elements.append(Paragraph("Key Performance Indicators", self.styles['SectionTitle']))

        kpis = self._get_executive_kpis()
        kpi_data = [
            ["KPI", "Current", "Change"],
            ["Total Customers", str(kpis['total_customers']), "-"],
            ["Average Health Score", f"{kpis['avg_health']:.1f}" if kpis['avg_health'] else "N/A", "-"],
            ["Average CSAT Score", f"{kpis['avg_csat']:.2f}" if kpis['avg_csat'] else "N/A", "-"],
            ["NPS Score", f"{kpis['nps']:.1f}" if kpis['nps'] is not None else "N/A", "-"],
            ["Active Alerts", str(kpis['active_alerts']), "-"],
            ["At-Risk Customers", str(kpis['at_risk_count']), "-"]
        ]

        table = Table(kpi_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch])
        table.setStyle(self._get_table_style())
        elements.append(table)

        elements.append(Spacer(1, 20))

        # Critical Alerts
        elements.append(Paragraph("Critical Alerts Requiring Attention", self.styles['SectionTitle']))

        critical_alerts = self._get_critical_alerts()
        if critical_alerts:
            table_data = [["Customer", "Alert Type", "Severity", "Created"]]
            for alert in critical_alerts[:5]:
                table_data.append([
                    alert['customer_name'],
                    alert['alert_type'],
                    alert['severity'],
                    alert['created_at']
                ])

            table = Table(table_data, colWidths=[2*inch, 1.5*inch, 1*inch, 1.5*inch])
            table.setStyle(self._get_table_style())
            elements.append(table)
        else:
            elements.append(Paragraph("No critical alerts.", self.styles['BodyText']))

        elements.append(Spacer(1, 20))

        # Recent Activity Summary
        elements.append(Paragraph("Recent Activity (Last 7 Days)", self.styles['SectionTitle']))

        activity = self._get_recent_activity()
        activity_data = [
            ["Activity Type", "Count"],
            ["Customer Interactions", str(activity['interactions'])],
            ["CSAT Responses", str(activity['csat_responses'])],
            ["Alerts Created", str(activity['alerts_created'])],
            ["Alerts Resolved", str(activity['alerts_resolved'])]
        ]

        table = Table(activity_data, colWidths=[3*inch, 2*inch])
        table.setStyle(self._get_table_style())
        elements.append(table)

        # Footer
        elements.append(Spacer(1, 40))
        elements.append(Paragraph(
            "This report is auto-generated by the Customer Success Management System.",
            self.styles['FooterText']
        ))

        doc.build(elements)
        buffer.seek(0)
        return buffer

    def _get_table_style(self) -> TableStyle:
        """Get standard table style for reports with Extravis branding."""
        return TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#9C27B0')),  # Extravis Primary
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F3E5F5')),  # Extravis Primary 50
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#4A148C')),  # Extravis Primary 900
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E1BEE7')),  # Extravis Primary 100
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F3E5F5')]),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ])

    def _get_health_distribution(self) -> List[Dict[str, Any]]:
        """Get health score distribution data."""
        from sqlalchemy import case

        # Get latest health score per customer
        subquery = self.db.query(
            HealthScore.customer_id,
            func.max(HealthScore.calculated_at).label('latest')
        ).group_by(HealthScore.customer_id).subquery()

        results = self.db.query(
            case(
                (HealthScore.overall_score >= 80, 'Healthy'),
                (HealthScore.overall_score >= 60, 'Needs Attention'),
                (HealthScore.overall_score >= 40, 'At Risk'),
                else_='Critical'
            ).label('status'),
            func.count().label('count')
        ).join(
            subquery,
            (HealthScore.customer_id == subquery.c.customer_id) &
            (HealthScore.calculated_at == subquery.c.latest)
        ).group_by('status').all()

        return [{'status': r.status, 'count': r.count} for r in results]

    def _get_at_risk_customers(self) -> List[Dict[str, Any]]:
        """Get at-risk customers with low health scores."""
        from sqlalchemy.orm import joinedload

        subquery = self.db.query(
            HealthScore.customer_id,
            func.max(HealthScore.calculated_at).label('latest')
        ).group_by(HealthScore.customer_id).subquery()

        results = self.db.query(HealthScore).options(
            joinedload(HealthScore.customer)
        ).join(
            subquery,
            (HealthScore.customer_id == subquery.c.customer_id) &
            (HealthScore.calculated_at == subquery.c.latest)
        ).filter(HealthScore.overall_score < 60).order_by(
            HealthScore.overall_score
        ).limit(10).all()

        return [{
            'company_name': hs.customer.company_name if hs.customer else 'Unknown',
            'health_score': hs.overall_score,
            'trend': hs.score_trend.value if hs.score_trend else 'stable',
            'concerns': self._identify_concerns(hs)
        } for hs in results]

    def _identify_concerns(self, health_score: HealthScore) -> str:
        """Identify key concerns from health score factors."""
        concerns = []
        factors = health_score.factors or {}

        if factors.get('engagement', 100) < 50:
            concerns.append("Low engagement")
        if factors.get('adoption', 100) < 50:
            concerns.append("Low adoption")
        if factors.get('support', 100) < 50:
            concerns.append("Support issues")
        if factors.get('financial', 100) < 50:
            concerns.append("Financial concerns")

        return ", ".join(concerns) if concerns else "Score trending down"

    def _get_trend_analysis(self) -> Dict[str, int]:
        """Get trend analysis data."""
        results = {}
        for trend in ScoreTrend:
            count = self.db.query(HealthScore).filter(
                HealthScore.score_trend == trend
            ).count()
            results[trend.value] = count
        return results

    def _get_csat_metrics(self) -> Dict[str, Any]:
        """Get overall CSAT metrics (non-NPS surveys)."""
        avg_csat = self.db.query(func.avg(CSATSurvey.score)).filter(
            CSATSurvey.survey_type != SurveyType.nps
        ).scalar()

        total = self.db.query(CSATSurvey).count()

        # NPS calculation
        nps_surveys = self.db.query(CSATSurvey).filter(
            CSATSurvey.survey_type == SurveyType.nps
        ).all()

        nps = None
        if nps_surveys:
            promoters = sum(1 for s in nps_surveys if s.score >= 9)
            detractors = sum(1 for s in nps_surveys if s.score <= 6)
            total_nps = len(nps_surveys)
            nps = ((promoters - detractors) / total_nps * 100) if total_nps > 0 else None

        return {
            'avg_csat': avg_csat,
            'total_responses': total,
            'nps': nps,
            'response_rate': None
        }

    def _get_csat_by_type(self) -> List[Dict[str, Any]]:
        """Get CSAT scores by survey type."""
        results = self.db.query(
            CSATSurvey.survey_type,
            func.avg(CSATSurvey.score).label('avg_score'),
            func.count().label('count')
        ).group_by(CSATSurvey.survey_type).all()

        return [{
            'survey_type': r.survey_type.value,
            'avg_score': float(r.avg_score) if r.avg_score else 0,
            'count': r.count
        } for r in results]

    def _get_low_csat_scores(self) -> List[Dict[str, Any]]:
        """Get recent low CSAT scores."""
        from sqlalchemy.orm import joinedload

        results = self.db.query(CSATSurvey).options(
            joinedload(CSATSurvey.customer)
        ).filter(
            CSATSurvey.score < 3
        ).order_by(CSATSurvey.submitted_at.desc()).limit(10).all()

        return [{
            'customer_name': s.customer.company_name if s.customer else 'Unknown',
            'score': s.score,
            'survey_type': s.survey_type.value,
            'date': s.submitted_at.strftime('%Y-%m-%d') if s.submitted_at else 'N/A'
        } for s in results]

    def _get_customer_stats(self) -> Dict[str, int]:
        """Get customer statistics."""
        total = self.db.query(Customer).count()
        active = self.db.query(Customer).filter(
            Customer.status == CustomerStatus.active
        ).count()
        at_risk = self.db.query(Customer).filter(
            Customer.status == CustomerStatus.at_risk
        ).count()
        churned = self.db.query(Customer).filter(
            Customer.status == CustomerStatus.churned
        ).count()

        month_start = date.today().replace(day=1)
        new_this_month = self.db.query(Customer).filter(
            Customer.onboarding_date >= month_start
        ).count()

        return {
            'total': total,
            'active': active,
            'at_risk': at_risk,
            'churned': churned,
            'new_this_month': new_this_month
        }

    def _get_deployment_stats(self) -> List[Dict[str, Any]]:
        """Get deployment statistics by product."""
        from app.models.product_deployment import ProductName

        results = []
        for product in ProductName:
            count = self.db.query(ProductDeployment).filter(
                ProductDeployment.product_name == product,
                ProductDeployment.is_active == True
            ).count()

            if count > 0:
                results.append({
                    'product': product.value,
                    'count': count,
                    'avg_health': None
                })

        return results

    def _get_upcoming_renewals(self, days: int) -> List[Dict[str, Any]]:
        """Get customers with upcoming contract renewals."""
        cutoff_date = date.today() + timedelta(days=days)

        results = self.db.query(Customer).filter(
            Customer.contract_end_date <= cutoff_date,
            Customer.contract_end_date >= date.today(),
            Customer.status != CustomerStatus.churned
        ).order_by(Customer.contract_end_date).all()

        return [{
            'company_name': c.company_name,
            'contract_end': c.contract_end_date.strftime('%Y-%m-%d') if c.contract_end_date else 'N/A',
            'contract_value': float(c.contract_value) if c.contract_value else None,
            'days_left': (c.contract_end_date - date.today()).days if c.contract_end_date else 0
        } for c in results]

    def _get_executive_kpis(self) -> Dict[str, Any]:
        """Get executive KPIs."""
        total_customers = self.db.query(Customer).count()

        avg_health = self.db.query(func.avg(HealthScore.overall_score)).scalar()

        avg_csat = self.db.query(func.avg(CSATSurvey.score)).filter(
            CSATSurvey.survey_type != SurveyType.nps
        ).scalar()

        # NPS
        nps_surveys = self.db.query(CSATSurvey).filter(
            CSATSurvey.survey_type == SurveyType.nps
        ).all()
        nps = None
        if nps_surveys:
            promoters = sum(1 for s in nps_surveys if s.score >= 9)
            detractors = sum(1 for s in nps_surveys if s.score <= 6)
            total_nps = len(nps_surveys)
            nps = ((promoters - detractors) / total_nps * 100) if total_nps > 0 else None

        active_alerts = self.db.query(Alert).filter(Alert.is_resolved == False).count()

        at_risk_count = self.db.query(Customer).filter(
            Customer.status == CustomerStatus.at_risk
        ).count()

        return {
            'total_customers': total_customers,
            'avg_health': float(avg_health) if avg_health else None,
            'avg_csat': float(avg_csat) if avg_csat else None,
            'nps': nps,
            'active_alerts': active_alerts,
            'at_risk_count': at_risk_count
        }

    def _get_critical_alerts(self) -> List[Dict[str, Any]]:
        """Get critical unresolved alerts."""
        from sqlalchemy.orm import joinedload

        results = self.db.query(Alert).options(
            joinedload(Alert.customer)
        ).filter(
            Alert.is_resolved == False,
            Alert.severity.in_([Severity.critical, Severity.high])
        ).order_by(Alert.created_at.desc()).limit(5).all()

        return [{
            'customer_name': a.customer.company_name if a.customer else 'Unknown',
            'alert_type': a.alert_type.value,
            'severity': a.severity.value,
            'created_at': a.created_at.strftime('%Y-%m-%d') if a.created_at else 'N/A'
        } for a in results]

    def _get_recent_activity(self) -> Dict[str, int]:
        """Get recent activity summary."""
        week_ago = datetime.utcnow() - timedelta(days=7)

        interactions = self.db.query(CustomerInteraction).filter(
            CustomerInteraction.interaction_date >= week_ago
        ).count()

        csat_responses = self.db.query(CSATSurvey).filter(
            CSATSurvey.submitted_at >= week_ago
        ).count()

        alerts_created = self.db.query(Alert).filter(
            Alert.created_at >= week_ago
        ).count()

        alerts_resolved = self.db.query(Alert).filter(
            Alert.resolved_at >= week_ago
        ).count()

        return {
            'interactions': interactions,
            'csat_responses': csat_responses,
            'alerts_created': alerts_created,
            'alerts_resolved': alerts_resolved
        }
