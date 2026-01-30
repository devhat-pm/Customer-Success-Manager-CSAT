#!/usr/bin/env python3
"""
Standalone Demo Data Seeder for Success Manager
Usage: python seed_standalone.py [--clear]

This script can be run independently to seed the database with demo data.
"""

import sys
import os
import argparse
import logging

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.core.database import SessionLocal, engine
from app.models import *  # Import all models to ensure tables exist
from app.utils.seeder import seed_demo_data, clear_demo_data, create_default_admin

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description='Seed Success Manager database with demo data')
    parser.add_argument('--clear', action='store_true', help='Clear existing data before seeding')
    parser.add_argument('--admin-only', action='store_true', help='Only create admin user')
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("Success Manager - Database Seeder")
    logger.info("=" * 60)

    db = SessionLocal()

    try:
        if args.admin_only:
            logger.info("Creating admin user only...")
            create_default_admin(db)
            logger.info("Admin user created!")
            logger.info("Email: admin@extravis.com")
            logger.info("Password: Admin@123")
        else:
            if args.clear:
                logger.info("Clearing existing demo data...")
                summary = clear_demo_data(db)
                logger.info(f"Cleared: {summary}")

            logger.info("Seeding demo data...")
            summary = seed_demo_data(db)

            logger.info("")
            logger.info("=" * 60)
            logger.info("SEEDING COMPLETE!")
            logger.info("=" * 60)
            logger.info("")
            logger.info("Summary:")
            for key, value in summary.items():
                logger.info(f"  - {key}: {value}")
            logger.info("")
            logger.info("Login credentials:")
            logger.info("  Email: admin@extravis.com")
            logger.info("  Password: Admin@123")
            logger.info("")

    except Exception as e:
        logger.error(f"Error during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
