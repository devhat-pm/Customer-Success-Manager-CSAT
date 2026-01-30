"""
Service for Announcement management (staff operations).
"""
from datetime import datetime
from typing import Optional, List, Tuple
from uuid import UUID
import logging

from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.models.announcement import Announcement, AnnouncementPriority, AnnouncementTargetType
from app.models.user import User
from app.models.customer import Customer
from app.core.exceptions import NotFoundError, BadRequestError, ValidationError
from app.schemas.customer_dashboard import (
    AnnouncementCreate,
    AnnouncementUpdate,
    AnnouncementResponse,
)

logger = logging.getLogger(__name__)


class AnnouncementService:
    """Service for managing announcements."""

    def __init__(self, db: Session):
        self.db = db

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        include_inactive: bool = False,
        include_expired: bool = False
    ) -> Tuple[List[Announcement], int]:
        """Get all announcements with filtering."""
        query = self.db.query(Announcement)

        if not include_inactive:
            query = query.filter(Announcement.is_active == True)

        if not include_expired:
            now = datetime.utcnow()
            query = query.filter(
                or_(
                    Announcement.end_date == None,
                    Announcement.end_date >= now
                )
            )

        total = query.count()
        announcements = query.order_by(
            desc(Announcement.priority),
            desc(Announcement.created_at)
        ).offset(skip).limit(limit).all()

        return announcements, total

    def get_by_id(self, announcement_id: UUID) -> Announcement:
        """Get announcement by ID."""
        announcement = self.db.query(Announcement).filter(
            Announcement.id == announcement_id
        ).first()

        if not announcement:
            raise NotFoundError(detail="Announcement not found")

        return announcement

    def create(
        self,
        data: AnnouncementCreate,
        staff_user: User
    ) -> Announcement:
        """Create a new announcement."""
        # Validate dates
        if data.end_date and data.end_date <= data.start_date:
            raise ValidationError(detail="End date must be after start date")

        # Validate target customers if specific
        if data.target_type == "specific_customers":
            if not data.target_customer_ids:
                raise ValidationError(detail="Target customer IDs required for specific_customers target type")

            # Verify all customer IDs exist
            for customer_id in data.target_customer_ids:
                customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
                if not customer:
                    raise NotFoundError(detail=f"Customer {customer_id} not found")

        target_type = AnnouncementTargetType(data.target_type)

        announcement = Announcement(
            title=data.title,
            content=data.content,
            start_date=data.start_date,
            end_date=data.end_date,
            target_type=target_type,
            target_customer_ids=[str(cid) for cid in data.target_customer_ids],
            priority=data.priority,
            is_active=True,
            created_by_id=staff_user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        self.db.add(announcement)
        self.db.commit()
        self.db.refresh(announcement)

        logger.info(f"Announcement '{announcement.title}' created by {staff_user.email}")
        return announcement

    def update(
        self,
        announcement_id: UUID,
        data: AnnouncementUpdate,
        staff_user: User
    ) -> Announcement:
        """Update an announcement."""
        announcement = self.get_by_id(announcement_id)

        # Update fields
        if data.title is not None:
            announcement.title = data.title

        if data.content is not None:
            announcement.content = data.content

        if data.start_date is not None:
            announcement.start_date = data.start_date

        if data.end_date is not None:
            announcement.end_date = data.end_date

        # Validate dates after updates
        if announcement.end_date and announcement.end_date <= announcement.start_date:
            raise ValidationError(detail="End date must be after start date")

        if data.target_type is not None:
            announcement.target_type = AnnouncementTargetType(data.target_type)

        if data.target_customer_ids is not None:
            # Verify customer IDs if specific targeting
            if announcement.target_type == AnnouncementTargetType.specific_customers:
                for customer_id in data.target_customer_ids:
                    customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
                    if not customer:
                        raise NotFoundError(detail=f"Customer {customer_id} not found")
            announcement.target_customer_ids = [str(cid) for cid in data.target_customer_ids]

        if data.priority is not None:
            announcement.priority = data.priority

        if data.is_active is not None:
            announcement.is_active = data.is_active

        announcement.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(announcement)

        logger.info(f"Announcement '{announcement.title}' updated by {staff_user.email}")
        return announcement

    def delete(self, announcement_id: UUID, staff_user: User) -> None:
        """Delete an announcement."""
        announcement = self.get_by_id(announcement_id)
        title = announcement.title

        self.db.delete(announcement)
        self.db.commit()

        logger.info(f"Announcement '{title}' deleted by {staff_user.email}")

    def deactivate(self, announcement_id: UUID, staff_user: User) -> Announcement:
        """Soft delete - deactivate an announcement."""
        announcement = self.get_by_id(announcement_id)
        announcement.is_active = False
        announcement.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(announcement)

        logger.info(f"Announcement '{announcement.title}' deactivated by {staff_user.email}")
        return announcement

    def to_response(self, announcement: Announcement) -> AnnouncementResponse:
        """Convert announcement to response schema."""
        created_by_name = None
        if announcement.created_by:
            created_by_name = announcement.created_by.full_name

        return AnnouncementResponse(
            id=announcement.id,
            title=announcement.title,
            content=announcement.content,
            start_date=announcement.start_date,
            end_date=announcement.end_date,
            target_type=announcement.target_type.value,
            target_customer_ids=announcement.target_customer_ids or [],
            priority=announcement.priority,
            is_active=announcement.is_active,
            created_by_id=announcement.created_by_id,
            created_by_name=created_by_name,
            created_at=announcement.created_at,
            updated_at=announcement.updated_at
        )
