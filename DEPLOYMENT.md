# Success Manager - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Docker Deployment](#docker-deployment)
7. [SSL Configuration](#ssl-configuration)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Backup & Recovery](#backup--recovery)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+ / Debian 11+ / RHEL 8+
- **RAM**: Minimum 4GB, Recommended 8GB+
- **CPU**: 2+ cores
- **Storage**: 20GB+ SSD

### Software Requirements
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose (for containerized deployment)
- Nginx (for reverse proxy)

---

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/success-manager.git
cd success-manager
```

### 2. Generate Security Keys
```bash
# Generate SECRET_KEY (64 characters)
python -c "import secrets; print(secrets.token_urlsafe(64))"

# Generate REFRESH_SECRET_KEY (64 characters)
python -c "import secrets; print(secrets.token_urlsafe(64))"

# Generate strong database password
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. Configure Environment
```bash
# Copy production environment template
cp backend/.env.production backend/.env

# Edit with your production values
nano backend/.env
```

**Critical settings to update:**
- `POSTGRES_PASSWORD` - Strong database password
- `SECRET_KEY` - 64-character secret key
- `REFRESH_SECRET_KEY` - 64-character refresh secret key
- `BACKEND_CORS_ORIGINS` - Your production frontend URL
- `SMTP_*` - Email configuration for notifications

---

## Database Setup

### Option A: Local PostgreSQL
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE success_manager_prod;
CREATE USER success_manager_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE success_manager_prod TO success_manager_user;
\q
```

### Option B: Docker PostgreSQL
```bash
docker run -d \
  --name success_manager_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=success_manager_prod \
  -v postgres_data:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:15-alpine
```

### Run Migrations
```bash
cd backend
python -m alembic upgrade head
```

### Seed Initial Data
```bash
# Create admin user and demo data
python ../scripts/seed_standalone.py

# Or just create admin user
python ../scripts/seed_standalone.py --admin-only
```

---

## Backend Deployment

### Option A: Systemd Service
```bash
# Create virtual environment
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# Create systemd service file
sudo nano /etc/systemd/system/success-manager.service
```

```ini
[Unit]
Description=Success Manager Backend
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/success-manager/backend
Environment="PATH=/opt/success-manager/backend/venv/bin"
EnvironmentFile=/opt/success-manager/backend/.env
ExecStart=/opt/success-manager/backend/venv/bin/gunicorn main:app \
    -w 4 \
    -k uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --access-logfile /var/log/success-manager/access.log \
    --error-logfile /var/log/success-manager/error.log
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable success-manager
sudo systemctl start success-manager
```

### Option B: Docker
```bash
cd backend
docker build -t success-manager-backend .
docker run -d \
  --name success_manager_backend \
  --env-file .env.production \
  -p 8000:8000 \
  success-manager-backend
```

---

## Frontend Deployment

### Build for Production
```bash
cd frontend

# Install dependencies
npm ci

# Set API URL and build
VITE_API_URL=https://your-domain.com/api/v1 npm run build

# Output is in dist/ folder
```

### Deploy Static Files
```bash
# Copy to web server directory
sudo cp -r dist/* /var/www/success-manager/

# Or serve with Nginx directly
# (see Nginx configuration below)
```

---

## Docker Deployment (Recommended)

### Full Stack Deployment
```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f

# Stop services
docker-compose -f docker-compose.production.yml down
```

### Build and Push Images
```bash
# Build images
docker-compose -f docker-compose.production.yml build

# Tag and push to registry
docker tag success-manager-backend:latest your-registry/success-manager-backend:v1.0.0
docker push your-registry/success-manager-backend:v1.0.0
```

---

## SSL Configuration

### Using Let's Encrypt (Certbot)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

### Update Nginx Configuration
Replace placeholders in `nginx/nginx.production.conf`:
- `your-domain.com` → Your actual domain
- SSL certificate paths

---

## Monitoring & Maintenance

### Health Checks
```bash
# Check backend health
curl https://your-domain.com/health

# Expected response:
# {"status": "healthy", "version": "1.0.0"}
```

### Log Locations
- **Backend**: `/var/log/success-manager/` or Docker logs
- **Nginx**: `/var/log/nginx/`
- **PostgreSQL**: `/var/log/postgresql/`

### Performance Monitoring
```bash
# View container stats
docker stats

# View backend process
docker exec -it success_manager_backend_prod ps aux
```

---

## Backup & Recovery

### Automated Backups
```bash
# Make script executable
chmod +x scripts/backup_database.sh

# Add to crontab (daily at 2 AM)
crontab -e
0 2 * * * /opt/success-manager/scripts/backup_database.sh daily
```

### Manual Backup
```bash
./scripts/backup_database.sh manual_backup
```

### Restore from Backup
```bash
./scripts/restore_database.sh ./backups/backup_20240115_020000.sql.gz
```

---

## Troubleshooting

### Common Issues

#### Backend won't start
```bash
# Check logs
docker logs success_manager_backend_prod

# Common causes:
# - Database connection failed
# - Missing environment variables
# - Port already in use
```

#### Database connection errors
```bash
# Verify database is running
docker ps | grep db

# Test connection
docker exec -it success_manager_db_prod psql -U postgres -c "SELECT 1"
```

#### Frontend API errors
```bash
# Check CORS configuration
# Ensure BACKEND_CORS_ORIGINS includes frontend URL

# Check Nginx proxy settings
nginx -t
```

#### SSL certificate issues
```bash
# Renew certificate
sudo certbot renew

# Check certificate expiry
sudo certbot certificates
```

### Getting Help
- Check logs: `docker-compose logs -f`
- API Documentation: `https://your-domain.com/docs`
- GitHub Issues: [Report a bug](https://github.com/your-org/success-manager/issues)

---

## Security Checklist

Before going to production, ensure:

- [ ] All default passwords changed
- [ ] SECRET_KEY and REFRESH_SECRET_KEY are unique 64-char keys
- [ ] DEBUG=false in production
- [ ] CORS origins restricted to production domains only
- [ ] SSL/TLS enabled with valid certificate
- [ ] Database not exposed to public internet
- [ ] Regular backups configured
- [ ] Rate limiting enabled on auth endpoints
- [ ] Firewall configured (ports 80, 443 only)
- [ ] Application logs monitored

---

## Quick Reference

### Default Credentials
- **Email**: admin@extravis.com
- **Password**: Admin@123

⚠️ **IMPORTANT**: Change admin password immediately after first login!

### Key URLs
- Frontend: `https://your-domain.com`
- API: `https://your-domain.com/api/v1`
- API Docs: `https://your-domain.com/docs`
- Health Check: `https://your-domain.com/health`

### Docker Commands
```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Stop all services
docker-compose -f docker-compose.production.yml down

# View logs
docker-compose -f docker-compose.production.yml logs -f [service]

# Rebuild specific service
docker-compose -f docker-compose.production.yml up -d --build [service]

# Execute command in container
docker exec -it [container_name] [command]
```
