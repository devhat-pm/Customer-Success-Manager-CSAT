#!/bin/bash
# Database Restore Script for Success Manager
# Usage: ./restore_database.sh backup_file.sql.gz

set -e

# Configuration
DB_CONTAINER="${DB_CONTAINER:-success_manager_db_prod}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-success_manager_prod}"

# Check arguments
if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -lh ./backups/*.sql.gz 2>/dev/null || echo "No backups found in ./backups/"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "WARNING: This will overwrite the current database!"
echo "Database: $POSTGRES_DB"
echo "Backup file: $BACKUP_FILE"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "Starting database restore..."

# Drop existing connections
echo "Terminating existing connections..."
docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();" || true

# Drop and recreate database
echo "Recreating database..."
docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" -c "DROP DATABASE IF EXISTS $POSTGRES_DB;"
docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" -c "CREATE DATABASE $POSTGRES_DB;"

# Restore from backup
echo "Restoring from backup..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" psql -U "$POSTGRES_USER" "$POSTGRES_DB"

echo ""
echo "Database restore completed successfully!"
echo "Please restart the backend service to apply changes."
