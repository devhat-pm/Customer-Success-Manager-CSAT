# Success Manager - Backend API

FastAPI-based REST API for the Success Manager customer success platform.

## Quick Start

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Run migrations
python -m alembic upgrade head

# Seed database (optional)
python seed_database.py

# Start server
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

Interactive documentation available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Authentication

The API uses OAuth2 with JWT tokens.

### Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@extravis.com&password=Admin@123"
```

Response:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

### Using Tokens
Include the access token in all authenticated requests:
```bash
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"
```

### Token Refresh
```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "<refresh_token>"}'
```

## API Endpoints

### Authentication (`/api/v1/auth`)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/login` | Login with email/password | No |
| POST | `/refresh` | Refresh access token | No |
| POST | `/logout` | Invalidate refresh token | Yes |
| GET | `/me` | Get current user profile | Yes |
| PUT | `/me` | Update profile (name, email) | Yes |
| PUT | `/me/password` | Change password | Yes |

### Users (`/api/v1/users`) - Admin Only
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all users with filtering |
| POST | `/` | Create new user |
| GET | `/{user_id}` | Get user by ID |
| PUT | `/{user_id}` | Update user |
| DELETE | `/{user_id}` | Soft delete user |
| PUT | `/{user_id}/activate` | Activate/deactivate user |

### Customers (`/api/v1/customers`)
| Method | Path | Description | Access |
|--------|------|-------------|--------|
| GET | `/` | List customers with health scores | All |
| POST | `/` | Create customer | Manager+ |
| GET | `/industries` | Get unique industries | All |
| GET | `/account-managers` | Get account managers | All |
| GET | `/{id}` | Get customer details | All |
| PUT | `/{id}` | Update customer | Manager+ |
| DELETE | `/{id}` | Soft delete (churn) | Manager+ |
| GET | `/{id}/timeline` | Activity timeline | All |
| GET | `/{id}/health-history` | Health score history | All |

### Product Deployments (`/api/v1/deployments`)
| Method | Path | Description | Access |
|--------|------|-------------|--------|
| GET | `/` | List deployments | All |
| POST | `/` | Create deployment | Manager+ |
| GET | `/stats` | Deployment statistics | All |
| GET | `/expiring` | Expiring licenses | All |
| GET | `/by-product/{name}` | Deployments by product | All |
| GET | `/{id}` | Deployment details | All |
| PUT | `/{id}` | Update deployment | Manager+ |
| DELETE | `/{id}` | Deactivate deployment | Manager+ |

### Health Scores (`/api/v1/health-scores`)
| Method | Path | Description | Access |
|--------|------|-------------|--------|
| POST | `/calculate/{customer_id}` | Calculate health score | Manager+ |
| POST | `/calculate-all` | Batch calculate all | Manager+ |
| GET | `/customer/{id}` | Get customer score | All |
| GET | `/customer/{id}/history` | Score history | All |
| GET | `/trends` | Overall trends | All |
| GET | `/at-risk` | At-risk customers | All |
| GET | `/distribution` | Score distribution | All |

### CSAT Surveys (`/api/v1/csat`)
| Method | Path | Description | Access |
|--------|------|-------------|--------|
| GET | `/` | List surveys | All |
| POST | `/` | Submit survey | All |
| GET | `/analytics` | CSAT analytics | All |
| POST | `/survey-link` | Generate survey link | Manager+ |
| GET | `/public/info/{token}` | Survey info (public) | None |
| POST | `/public/submit/{token}` | Submit via link (public) | None |
| GET | `/customer/{id}/summary` | Customer CSAT summary | All |
| GET | `/{id}` | Survey details | All |

### Customer Interactions (`/api/v1/interactions`)
| Method | Path | Description | Access |
|--------|------|-------------|--------|
| GET | `/` | List interactions | All |
| POST | `/` | Log interaction | All |
| GET | `/summary` | Interaction summary | All |
| GET | `/pending-followups` | Pending follow-ups | All |
| GET | `/customer/{id}` | Customer interactions | All |
| GET | `/{id}` | Interaction details | All |
| PUT | `/{id}` | Update interaction | All |
| DELETE | `/{id}` | Delete interaction | Manager+ |

### Alerts (`/api/v1/alerts`)
| Method | Path | Description | Access |
|--------|------|-------------|--------|
| GET | `/` | List alerts | All |
| POST | `/` | Create alert | All |
| GET | `/dashboard` | Alert dashboard | All |
| GET | `/stats` | Alert statistics | All |
| POST | `/bulk-resolve` | Bulk resolve | Manager+ |
| POST | `/run-checks` | Trigger alert checks | Manager+ |
| GET | `/customer/{id}` | Customer alerts | All |
| GET | `/{id}` | Alert details | All |
| PUT | `/{id}` | Update alert | All |
| PUT | `/{id}/resolve` | Resolve alert | All |
| PUT | `/{id}/snooze` | Snooze alert | All |

### Reports (`/api/v1/reports`)
| Method | Path | Description | Access |
|--------|------|-------------|--------|
| GET | `/scheduled` | List scheduled reports | All |
| POST | `/scheduled` | Create schedule | Manager+ |
| GET | `/scheduled/{id}` | Schedule details | All |
| PUT | `/scheduled/{id}` | Update schedule | Manager+ |
| DELETE | `/scheduled/{id}` | Delete schedule | Manager+ |
| PUT | `/scheduled/{id}/toggle` | Toggle active | Manager+ |
| POST | `/generate` | Generate report | All |
| GET | `/history` | Report history | All |
| GET | `/history/{id}` | History entry | All |
| GET | `/history/{id}/download` | Download PDF | All |
| GET | `/dashboard` | Report stats | All |
| POST | `/run-scheduled` | Run due reports | Manager+ |

### Dashboard (`/api/v1/dashboard`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Overview statistics |
| GET | `/health-distribution` | Health distribution |
| GET | `/health-trends` | Health trends |
| GET | `/csat-trends` | CSAT trends |
| GET | `/customer-segments` | Customer segments |
| GET | `/upcoming-renewals` | Upcoming renewals |
| GET | `/recent-activity` | Activity feed |
| GET | `/product-performance` | Product metrics |
| GET | `/account-manager-performance` | AM metrics |

### Scheduler (`/api/v1/scheduler`) - Admin Only
| Method | Path | Description |
|--------|------|-------------|
| GET | `/jobs` | List scheduled jobs |
| POST | `/jobs/{id}/run` | Trigger job manually |

## Database Schema

### Core Models

**User**
- id (UUID, PK)
- email (unique)
- full_name
- hashed_password
- role (admin/manager/viewer)
- is_active
- last_login
- created_at, updated_at

**Customer**
- id (UUID, PK)
- company_name (unique)
- industry
- contact_name, contact_email, contact_phone
- contract_start_date, contract_end_date
- contract_value (Decimal)
- account_manager
- status (active/at_risk/churned/onboarding)
- created_at, updated_at

**ProductDeployment**
- id (UUID, PK)
- customer_id (FK)
- product_name (MonetX/SupportX/GreenX)
- deployment_date
- version
- environment (cloud/on_premise/hybrid)
- license_type, license_expiry
- is_active
- created_at, updated_at

**HealthScore**
- id (UUID, PK)
- customer_id (FK)
- product_deployment_id (FK, nullable)
- overall_score, engagement_score, adoption_score, support_score, financial_score
- score_trend (improving/stable/declining)
- calculated_at
- factors (JSONB)

**CSATSurvey**
- id (UUID, PK)
- customer_id (FK)
- product_deployment_id (FK, nullable)
- survey_type (post_ticket/quarterly/nps/onboarding)
- score
- feedback_text
- submitted_by_name, submitted_by_email
- submitted_at
- ticket_reference

**CustomerInteraction**
- id (UUID, PK)
- customer_id (FK)
- interaction_type (support_ticket/meeting/email/call/escalation/training)
- subject, description
- sentiment (positive/neutral/negative)
- performed_by
- interaction_date
- follow_up_required, follow_up_date

**Alert**
- id (UUID, PK)
- customer_id (FK)
- alert_type (health_drop/contract_expiry/low_csat/escalation/inactivity)
- severity (low/medium/high/critical)
- title, description
- is_resolved
- resolved_by, resolved_at
- created_at

**ScheduledReport**
- id (UUID, PK)
- report_name
- report_type (health_summary/csat_analysis/customer_overview/executive_summary)
- frequency (daily/weekly/monthly/quarterly)
- recipients (JSONB)
- filters (JSONB)
- last_generated_at
- next_scheduled_at
- is_active
- created_at, updated_at

**ReportHistory**
- id (UUID, PK)
- scheduled_report_id (FK, nullable)
- report_type
- generated_at
- status (pending/generating/completed/failed)
- file_path
- error_message
- filters (JSONB)

## Running Migrations

```bash
# Create a new migration
python -m alembic revision --autogenerate -m "Description"

# Apply migrations
python -m alembic upgrade head

# Rollback one version
python -m alembic downgrade -1

# View migration history
python -m alembic history
```

## Testing

```bash
# Run API tests
python test_api.py

# Expected output: ALL API TESTS PASSED!
```

## Scheduled Jobs

The following jobs run automatically:

| Job | Schedule | Description |
|-----|----------|-------------|
| daily_health_scores | Daily 00:00 | Calculate health scores for all customers |
| contract_expiry_check | Daily 08:00 | Alert for contracts expiring in 30/60/90 days |
| license_expiry_check | Daily 08:30 | Alert for licenses expiring soon |
| inactivity_check | Daily 09:00 | Alert for inactive customers |
| scheduled_reports | Hourly | Generate and send due reports |

## Project Structure

```
backend/
├── alembic/
│   ├── versions/           # Migration files
│   └── env.py             # Alembic configuration
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/  # API route handlers
│   │       └── router.py   # Route aggregation
│   ├── core/
│   │   ├── config.py       # Settings and configuration
│   │   ├── database.py     # Database connection
│   │   ├── dependencies.py # FastAPI dependencies
│   │   ├── exceptions.py   # Custom exceptions
│   │   ├── scheduler.py    # Background job scheduler
│   │   └── security.py     # JWT and password hashing
│   ├── models/             # SQLAlchemy ORM models
│   ├── schemas/            # Pydantic validation schemas
│   ├── services/           # Business logic layer
│   └── utils/
│       ├── email.py        # Email sending
│       └── seeder.py       # Default admin seeder
├── main.py                 # Application entry point
├── seed_database.py        # Full database seeder
├── test_api.py            # API test script
├── requirements.txt        # Python dependencies
├── alembic.ini            # Alembic config
└── README.md              # This file
```

## Error Responses

All API errors follow this format:

```json
{
  "detail": "Error message here"
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict (duplicate resource)
- 422: Validation Error
- 500: Internal Server Error

## Rate Limiting

Currently no rate limiting is implemented. For production, consider adding:
- SlowAPI for rate limiting
- Redis for distributed rate limiting

## CORS Configuration

CORS is configured via the `BACKEND_CORS_ORIGINS` environment variable. Default allows:
- http://localhost:5173
- http://localhost:3000
