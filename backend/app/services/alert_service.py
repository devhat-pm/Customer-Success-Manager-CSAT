from datetime import datetime, date, timedelta
from typing import Optional, List, Tuple, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func, asc
import logging

from app.models.alert import Alert, AlertType, Severity
from app.models.customer import Customer, CustomerStatus
from app.models.product_deployment import ProductDeployment
from app.schemas.alert import AlertCreate, AlertUpdate
from app.core.exceptions import NotFoundError

logger = logging.getLogger(__name__)


class AlertService:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, alert_id: UUID) -> Alert:
        alert = self.db.query(Alert).filter(Alert.id == alert_id).first()
        if not alert:
            raise NotFoundError(detail="Alert not found")
        return alert

    def get_alert_with_customer(self, alert_id: UUID) -> Dict[str, Any]:
        alert = self.db.query(Alert).options(
            joinedload(Alert.customer)
        ).filter(Alert.id == alert_id).first()

        if not alert:
            raise NotFoundError(detail="Alert not found")

        return {
            "alert": alert,
            "customer": {
                "id": alert.customer.id,
                "company_name": alert.customer.company_name,
                "contact_name": alert.customer.contact_name,
                "contact_email": alert.customer.contact_email,
                "account_manager": alert.customer.account_manager,
                "status": alert.customer.status
            } if alert.customer else None
        }

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        customer_id: Optional[UUID] = None,
        alert_type: Optional[AlertType] = None,
        severity: Optional[Severity] = None,
        is_resolved: Optional[bool] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Tuple[List[Alert], int]:
        query = self.db.query(Alert)

        if customer_id:
            query = query.filter(Alert.customer_id == customer_id)

        if alert_type:
            query = query.filter(Alert.alert_type == alert_type)

        if severity:
            query = query.filter(Alert.severity == severity)

        if is_resolved is not None:
            query = query.filter(Alert.is_resolved == is_resolved)

        total = query.count()

        # Custom sort for severity
        if sort_by == "severity":
            severity_order = {
                Severity.critical: 0,
                Severity.high: 1,
                Severity.medium: 2,
                Severity.low: 3
            }
            if sort_order.lower() == "asc":
                query = query.order_by(asc(Alert.severity))
            else:
                query = query.order_by(desc(Alert.severity))
        else:
            sort_column = getattr(Alert, sort_by, Alert.created_at)
            if sort_order.lower() == "asc":
                query = query.order_by(asc(sort_column))
            else:
                query = query.order_by(desc(sort_column))

        alerts = query.offset(skip).limit(limit).all()
        return alerts, total

    def create(self, alert_data: AlertCreate) -> Alert:
        # Verify customer exists
        customer = self.db.query(Customer).filter(
            Customer.id == alert_data.customer_id
        ).first()
        if not customer:
            raise NotFoundError(detail="Customer not found")

        alert = Alert(
            customer_id=alert_data.customer_id,
            alert_type=alert_data.alert_type,
            severity=alert_data.severity,
            title=alert_data.title,
            description=alert_data.description
        )

        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)

        logger.info(f"Alert created: {alert.title} for customer {customer.company_name}")
        return alert

    def update(self, alert_id: UUID, alert_data: AlertUpdate) -> Alert:
        alert = self.get_by_id(alert_id)

        if alert_data.alert_type is not None:
            alert.alert_type = alert_data.alert_type

        if alert_data.severity is not None:
            alert.severity = alert_data.severity

        if alert_data.title is not None:
            alert.title = alert_data.title

        if alert_data.description is not None:
            alert.description = alert_data.description

        if alert_data.is_resolved is not None:
            alert.is_resolved = alert_data.is_resolved
            if alert_data.is_resolved:
                alert.resolved_at = datetime.utcnow()

        if alert_data.resolved_by is not None:
            alert.resolved_by = alert_data.resolved_by

        self.db.commit()
        self.db.refresh(alert)

        logger.info(f"Alert updated: {alert_id}")
        return alert

    def resolve(self, alert_id: UUID, resolved_by: str) -> Alert:
        alert = self.get_by_id(alert_id)
        alert.is_resolved = True
        alert.resolved_by = resolved_by
        alert.resolved_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(alert)

        logger.info(f"Alert resolved: {alert_id} by {resolved_by}")
        return alert

    def snooze(self, alert_id: UUID, snooze_days: int, snoozed_by: str) -> Alert:
        """Snooze an alert for X days by marking it resolved with a note."""
        alert = self.get_by_id(alert_id)

        snooze_until = date.today() + timedelta(days=snooze_days)
        alert.is_resolved = True
        alert.resolved_by = f"Snoozed by {snoozed_by} until {snooze_until}"
        alert.resolved_at = datetime.utcnow()

        # Add snooze info to description
        alert.description = f"{alert.description}\n\n[Snoozed until {snooze_until} by {snoozed_by}]"

        self.db.commit()
        self.db.refresh(alert)

        logger.info(f"Alert snoozed: {alert_id} for {snooze_days} days by {snoozed_by}")
        return alert

    def bulk_resolve(self, alert_ids: List[UUID], resolved_by: str) -> int:
        count = 0
        for alert_id in alert_ids:
            try:
                self.resolve(alert_id, resolved_by)
                count += 1
            except NotFoundError:
                continue

        return count

    def get_dashboard_summary(self) -> Dict[str, Any]:
        """Get alert summary for dashboard."""
        # Count by severity (unresolved only)
        by_severity = {}
        for severity in Severity:
            count = self.db.query(Alert).filter(
                Alert.severity == severity,
                Alert.is_resolved == False
            ).count()
            by_severity[severity.value] = count

        # Count by type (unresolved only)
        by_type = {}
        for alert_type in AlertType:
            count = self.db.query(Alert).filter(
                Alert.alert_type == alert_type,
                Alert.is_resolved == False
            ).count()
            by_type[alert_type.value] = count

        # Total unresolved
        total_unresolved = self.db.query(Alert).filter(Alert.is_resolved == False).count()

        # Recent critical/high alerts (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_critical = self.db.query(Alert).options(
            joinedload(Alert.customer)
        ).filter(
            Alert.severity.in_([Severity.critical, Severity.high]),
            Alert.is_resolved == False,
            Alert.created_at >= week_ago
        ).order_by(desc(Alert.created_at)).limit(10).all()

        recent_alerts = []
        for alert in recent_critical:
            recent_alerts.append({
                "id": alert.id,
                "customer_id": alert.customer_id,
                "customer_name": alert.customer.company_name if alert.customer else None,
                "alert_type": alert.alert_type.value,
                "severity": alert.severity.value,
                "title": alert.title,
                "created_at": alert.created_at.isoformat()
            })

        # Alerts created today
        today_start = datetime.combine(date.today(), datetime.min.time())
        created_today = self.db.query(Alert).filter(Alert.created_at >= today_start).count()

        # Resolved today
        resolved_today = self.db.query(Alert).filter(
            Alert.resolved_at >= today_start
        ).count()

        return {
            "total_unresolved": total_unresolved,
            "by_severity": by_severity,
            "by_type": by_type,
            "recent_critical_alerts": recent_alerts,
            "created_today": created_today,
            "resolved_today": resolved_today
        }

    def get_unresolved_count(self, customer_id: Optional[UUID] = None) -> Dict[str, int]:
        query = self.db.query(Alert).filter(Alert.is_resolved == False)

        if customer_id:
            query = query.filter(Alert.customer_id == customer_id)

        total = query.count()

        by_severity = {}
        for severity in Severity:
            count = query.filter(Alert.severity == severity).count()
            by_severity[severity.value] = count

        by_type = {}
        for alert_type in AlertType:
            count = query.filter(Alert.alert_type == alert_type).count()
            by_type[alert_type.value] = count

        return {
            "total": total,
            "by_severity": by_severity,
            "by_type": by_type
        }

    def get_alert_stats(self) -> Dict[str, Any]:
        total = self.db.query(Alert).count()
        unresolved = self.db.query(Alert).filter(Alert.is_resolved == False).count()
        resolved = total - unresolved

        # Alerts created in last 7 days
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent = self.db.query(Alert).filter(Alert.created_at >= week_ago).count()

        # Average resolution time (for resolved alerts)
        resolved_alerts = self.db.query(Alert).filter(
            Alert.is_resolved == True,
            Alert.resolved_at.isnot(None)
        ).all()

        if resolved_alerts:
            resolution_times = []
            for alert in resolved_alerts:
                if alert.resolved_at and alert.created_at:
                    diff = (alert.resolved_at - alert.created_at).total_seconds() / 3600
                    resolution_times.append(diff)
            avg_resolution_hours = sum(resolution_times) / len(resolution_times) if resolution_times else None
        else:
            avg_resolution_hours = None

        # By severity
        severity_breakdown = {}
        for severity in Severity:
            severity_breakdown[severity.value] = {
                "total": self.db.query(Alert).filter(Alert.severity == severity).count(),
                "unresolved": self.db.query(Alert).filter(
                    Alert.severity == severity,
                    Alert.is_resolved == False
                ).count()
            }

        return {
            "total_alerts": total,
            "unresolved": unresolved,
            "resolved": resolved,
            "created_last_7_days": recent,
            "avg_resolution_hours": round(avg_resolution_hours, 1) if avg_resolution_hours else None,
            "by_severity": severity_breakdown
        }

    def get_customer_alerts(
        self,
        customer_id: UUID,
        include_resolved: bool = False,
        skip: int = 0,
        limit: int = 50
    ) -> Tuple[List[Alert], int]:
        # Verify customer exists
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise NotFoundError(detail="Customer not found")

        query = self.db.query(Alert).filter(Alert.customer_id == customer_id)

        if not include_resolved:
            query = query.filter(Alert.is_resolved == False)

        total = query.count()
        alerts = query.order_by(
            desc(Alert.severity),
            desc(Alert.created_at)
        ).offset(skip).limit(limit).all()

        return alerts, total

    def check_contract_expiry_alerts(self, days_threshold: int = 30) -> int:
        """Check for expiring contracts and create alerts."""
        expiry_date = date.today() + timedelta(days=days_threshold)

        customers = self.db.query(Customer).filter(
            Customer.contract_end_date <= expiry_date,
            Customer.contract_end_date >= date.today(),
            Customer.status != CustomerStatus.churned
        ).all()

        alerts_created = 0
        today_start = datetime.combine(date.today(), datetime.min.time())

        for customer in customers:
            days_until = (customer.contract_end_date - date.today()).days

            if days_until <= 7:
                severity = Severity.critical
            elif days_until <= 14:
                severity = Severity.high
            elif days_until <= 30:
                severity = Severity.medium
            else:
                severity = Severity.low

            existing = self.db.query(Alert).filter(
                Alert.customer_id == customer.id,
                Alert.alert_type == AlertType.contract_expiry,
                Alert.created_at >= today_start,
                Alert.is_resolved == False
            ).first()

            if not existing:
                alert = Alert(
                    customer_id=customer.id,
                    alert_type=AlertType.contract_expiry,
                    severity=severity,
                    title=f"Contract Expiring in {days_until} Days",
                    description=f"Contract for {customer.company_name} expires on {customer.contract_end_date}. "
                                f"Contact {customer.contact_name} ({customer.contact_email}) for renewal discussion."
                )
                self.db.add(alert)
                alerts_created += 1

        self.db.commit()
        logger.info(f"Created {alerts_created} contract expiry alerts")
        return alerts_created

    def check_license_expiry_alerts(self, days_threshold: int = 30) -> int:
        """Check for expiring licenses and create alerts."""
        expiry_date = date.today() + timedelta(days=days_threshold)
        today_start = datetime.combine(date.today(), datetime.min.time())

        deployments = self.db.query(ProductDeployment).options(
            joinedload(ProductDeployment.customer)
        ).filter(
            ProductDeployment.license_expiry <= expiry_date,
            ProductDeployment.license_expiry >= date.today(),
            ProductDeployment.is_active == True
        ).all()

        alerts_created = 0

        for deployment in deployments:
            if not deployment.customer or deployment.customer.status == CustomerStatus.churned:
                continue

            days_until = (deployment.license_expiry - date.today()).days

            if days_until <= 7:
                severity = Severity.critical
            elif days_until <= 14:
                severity = Severity.high
            elif days_until <= 30:
                severity = Severity.medium
            else:
                severity = Severity.low

            existing = self.db.query(Alert).filter(
                Alert.customer_id == deployment.customer_id,
                Alert.alert_type == AlertType.contract_expiry,
                Alert.title.contains(deployment.product_name.value),
                Alert.created_at >= today_start,
                Alert.is_resolved == False
            ).first()

            if not existing:
                alert = Alert(
                    customer_id=deployment.customer_id,
                    alert_type=AlertType.contract_expiry,
                    severity=severity,
                    title=f"{deployment.product_name.value} License Expiring in {days_until} Days",
                    description=f"License for {deployment.product_name.value} ({deployment.customer.company_name}) "
                                f"expires on {deployment.license_expiry}. License type: {deployment.license_type}."
                )
                self.db.add(alert)
                alerts_created += 1

        self.db.commit()
        logger.info(f"Created {alerts_created} license expiry alerts")
        return alerts_created

    def check_inactivity_alerts(self, days_threshold: int = 30) -> int:
        """Check for inactive customers and create alerts."""
        from app.models.customer_interaction import CustomerInteraction

        threshold_date = datetime.utcnow() - timedelta(days=days_threshold)
        today_start = datetime.combine(date.today(), datetime.min.time())

        customers_with_interactions = self.db.query(CustomerInteraction.customer_id).filter(
            CustomerInteraction.interaction_date >= threshold_date
        ).distinct().subquery()

        inactive_customers = self.db.query(Customer).filter(
            Customer.status.in_([CustomerStatus.active, CustomerStatus.at_risk]),
            ~Customer.id.in_(customers_with_interactions)
        ).all()

        alerts_created = 0

        for customer in inactive_customers:
            existing = self.db.query(Alert).filter(
                Alert.customer_id == customer.id,
                Alert.alert_type == AlertType.inactivity,
                Alert.created_at >= today_start,
                Alert.is_resolved == False
            ).first()

            if not existing:
                alert = Alert(
                    customer_id=customer.id,
                    alert_type=AlertType.inactivity,
                    severity=Severity.medium,
                    title="Customer Inactivity Alert",
                    description=f"No interactions with {customer.company_name} in the last {days_threshold} days. "
                                f"Consider reaching out to maintain engagement."
                )
                self.db.add(alert)
                alerts_created += 1

        self.db.commit()
        logger.info(f"Created {alerts_created} inactivity alerts")
        return alerts_created

    def run_all_alert_checks(self) -> Dict[str, int]:
        """Run all automated alert checks."""
        results = {
            "contract_expiry": self.check_contract_expiry_alerts(30),
            "license_expiry": self.check_license_expiry_alerts(30),
            "inactivity": self.check_inactivity_alerts(30)
        }
        return results
