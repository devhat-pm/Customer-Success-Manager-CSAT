#!/bin/bash
# Database Backup Script for Success Manager
# Usage: ./backup_database.sh [backup_name]
# Cron example: 0 2 * * * /path/to/backup_database.sh daily

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_CONTAINER="${DB_CONTAINER:-success_manager_db_prod}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-success_manager_prod}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${1:-backup}_${TIMESTAMP}"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.sql.gz"

echo "Starting database backup..."
echo "Database: $POSTGRES_DB"
echo "Backup file: $BACKUP_FILE"

# Create backup
docker exec "$DB_CONTAINER" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "Backup completed successfully!"
    echo "File: $BACKUP_FILE"
    echo "Size: $BACKUP_SIZE"
else
    echo "ERROR: Backup failed!"
    exit 1
fi

# Clean up old backups
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# List current backups
echo ""
echo "Current backups:"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "No backups found"

echo ""
echo "Backup process completed!"
