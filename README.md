# Customer Success Manager (CSM) Platform

A comprehensive Customer Success Management platform designed for B2B SaaS companies to monitor customer health, track engagements, manage CSAT/NPS surveys, and drive customer retention.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11+-green.svg)
![React](https://img.shields.io/badge/react-18+-61DAFB.svg)
![PostgreSQL](https://img.shields.io/badge/postgresql-14+-336791.svg)

## Features

### Customer Management
- Complete customer portfolio management with filtering and search
- Customer health scoring with trend analysis
- Contract and renewal tracking
- Industry and account manager segmentation

### Health Monitoring
- Automated health score calculation with weighted components:
  - Product Usage (15%)
  - Support Ticket Sentiment (25%)
  - Contract Value Trend (20%)
  - Engagement Score (20%)
  - CSAT Average (20%)
- Real-time health trends and distribution charts
- At-risk customer identification and alerts
- 6-month historical health score tracking

### CSAT & NPS Tracking
- Survey creation and distribution via public links
- CSAT score tracking by product and survey type
- NPS calculation with promoter/detractor analysis
- Feedback themes and sentiment analysis

### Support Tickets
- Full ticketing system with SLA tracking
- Priority levels with response times:
  - Critical: 4 hours
  - High: 8 hours
  - Medium: 24 hours
  - Low: 72 hours
- Auto-generated ticket numbers (TKT-YYYYMM-XXXX)
- Resolution tracking and history

### Customer Interactions
- Log all customer touchpoints (calls, emails, meetings, support tickets)
- Sentiment analysis for interactions
- Follow-up tracking and reminders
- Interaction timeline view

### Alert Management
- Automated alerts for health drops, contract expiry, low CSAT, inactivity
- Multi-severity levels (Critical, High, Medium, Low)
- Bulk operations (resolve, snooze)
- Custom alert creation

### Reporting
- On-demand report generation (Health Summary, CSAT Analysis, Executive Summary)
- Scheduled recurring reports (daily, weekly, monthly, quarterly)
- PDF export with charts and tables
- Email distribution to recipients

### Dashboard & Analytics
- Real-time KPI dashboard
- Health distribution and trends
- Customer segmentation charts
- Upcoming renewals tracking
- Account manager performance metrics
- Recent activity feed

### User Management
- Role-based access control (Admin, Manager, Viewer)
- Team member management
- Secure authentication with JWT tokens

### Security & Account Management
- **Two-Factor Authentication (2FA)** - TOTP-based authentication with QR code setup
- **Session Management** - View and revoke active sessions across devices
- **Account Deletion** - Secure account removal with password confirmation
- **Password Policies** - Strong password requirements

### Integrations
- **Slack** - Send notifications and alerts to Slack channels
- **Webhooks** - Custom webhook integrations for external systems
- **Salesforce** - Sync customer data with Salesforce CRM
- **HubSpot** - Connect with HubSpot CRM for customer data
- **Google Calendar** - Sync meetings and events
- **SMTP** - Custom email server configuration
- **API Access** - RESTful API with key-based authentication

### Customer Portal
- **Self-Service Tickets** - Customers can submit and track support requests
- **Survey Responses** - Complete satisfaction surveys directly
- **Announcements** - View company announcements and updates
- **Profile Management** - Update contact information and preferences
- **Password Reset** - Self-service password recovery

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: OAuth2 with JWT tokens
- **Task Scheduling**: APScheduler
- **PDF Generation**: ReportLab
- **Migrations**: Alembic

### Frontend (Admin Portal)
- **Framework**: React 18 with Vite
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Forms**: React Hook Form with Zod validation
- **UI Components**: Shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React

### Customer Portal
- **Framework**: React 18 with TypeScript
- **UI Components**: Ant Design
- **Build Tool**: Vite
- **State Management**: TanStack Query

## Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
- PostgreSQL 14 or higher
- npm or yarn

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd success-manager
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
python -m alembic upgrade head

# Seed the database (optional)
python seed_database.py
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env if needed
```

## Environment Variables

### Backend (.env)

```env
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=success_manager

# Security
SECRET_KEY=your-secret-key-here
REFRESH_SECRET_KEY=your-refresh-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=480
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# SMTP (Optional - for email notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=noreply@example.com
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_APP_NAME=Success Manager
```

## Running the Application

### Development Mode

**Backend:**
```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev
```

Access the application:
- Admin Portal: http://localhost:5173
- Customer Portal: http://localhost:5174
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Production Mode

See the [DEPLOYMENT.md](DEPLOYMENT.md) guide for comprehensive production deployment instructions.

**Quick Production Deployment with Docker:**
```bash
# Configure production environment
cp backend/.env.production.example backend/.env.production
# Edit .env.production with secure values

# Run security check
python scripts/security_check.py

# Deploy with Docker Compose
docker-compose -f docker-compose.production.yml up -d
```

**Manual Production:**

*Backend:*
```bash
cd backend
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

*Frontend:*
```bash
cd frontend
npm run build
# Serve dist folder with Nginx or your preferred web server
```

## Default Credentials

After running the seed script, you can log in with:

### Admin Portal
| Role    | Email                          | Password    |
|---------|--------------------------------|-------------|
| Admin   | admin@extravis.com            | Admin@123   |
| Manager | sarah.manager@extravis.com    | Manager@123 |
| Manager | james.manager@extravis.com    | Manager@123 |
| Viewer  | emily.viewer@extravis.com     | Viewer@123  |
| Viewer  | michael.viewer@extravis.com   | Viewer@123  |

### Customer Portal
| Company    | Email                       | Password     |
|------------|-----------------------------|--------------|
| TechCorp   | john.smith@techcorp.com    | Portal@123   |

## Database Setup

### Create Database

```sql
CREATE DATABASE success_manager;
```

### Run Migrations

```bash
cd backend
python -m alembic upgrade head
```

### Seed Data

```bash
cd backend
python seed_database.py
```

The seed script creates:
- 5 Users (1 admin, 2 managers, 2 viewers)
- 15 Customers (telecom, tech, financial industries)
- 26 Product Deployments (MonetX, SupportX, GreenX)
- 73 Health Scores with historical trends
- 115 CSAT Surveys
- 93 Customer Interactions
- 24 Alerts
- 5 Scheduled Reports

## API Documentation

Interactive API documentation is available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

See [backend/README.md](backend/README.md) for detailed API documentation.

## Project Structure

```
success-manager/
├── backend/
│   ├── alembic/              # Database migrations
│   ├── app/
│   │   ├── api/v1/           # API endpoints
│   │   ├── core/             # Configuration, security, database
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   └── utils/            # Utilities (seeder, etc.)
│   ├── main.py               # Application entry point
│   ├── .env.production       # Production environment (gitignored)
│   └── requirements.txt
├── frontend/                 # Admin Portal
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # Utilities
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   └── App.jsx           # Main app component
│   ├── package.json
│   └── vite.config.js
├── customer-portal/          # Customer Portal
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contexts/         # Auth context
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   └── App.tsx           # Main app component
│   ├── package.json
│   └── vite.config.ts
├── nginx/
│   └── nginx.production.conf # Nginx reverse proxy config
├── scripts/
│   ├── backup_database.sh    # Database backup script
│   ├── restore_database.sh   # Database restore script
│   ├── seed_standalone.py    # Standalone seeder
│   └── security_check.py     # Pre-deployment security check
├── backups/                  # Database backups (gitignored)
├── logs/                     # Application logs (gitignored)
├── docker-compose.yml        # Development Docker configuration
├── docker-compose.production.yml  # Production Docker configuration
├── DEPLOYMENT.md             # Production deployment guide
└── README.md                 # This file
```

## Docker Deployment

### Development
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production
```bash
# Configure environment
cp backend/.env.production.example backend/.env.production
# Edit with secure production values

# Run security verification
python scripts/security_check.py

# Deploy
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f

# Backup database
./scripts/backup_database.sh

# Restore database
./scripts/restore_database.sh backups/backup_file.sql.gz
```

## Screenshots

### Dashboard
The main dashboard provides an overview of key metrics including customer health distribution, CSAT trends, upcoming renewals, and recent activity.

### Customer Management
Manage your customer portfolio with advanced filtering, health score tracking, and detailed customer profiles.

### Health Scores
Monitor customer health across multiple dimensions with trend analysis and at-risk identification.

### Alerts
Stay on top of critical issues with automated alerts for health drops, contract expiry, and more.

### Reports
Generate and schedule comprehensive reports for stakeholders with PDF export capabilities.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Branding

The application uses Extravis branding colors:
- **Primary**: Purple (#9C27B0)
- **Secondary**: Blue (#2196F3)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the repository or contact the development team.
