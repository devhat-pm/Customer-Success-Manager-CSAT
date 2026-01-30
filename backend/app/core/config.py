from pydantic_settings import BaseSettings
from typing import List, Optional
from urllib.parse import quote_plus
import secrets


class Settings(BaseSettings):
    PROJECT_NAME: str = "Success Manager"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "Haider@12"
    POSTGRES_DB: str = "success_manager"

    @property
    def DATABASE_URL(self) -> str:
        # URL-encode password to handle special characters like @
        encoded_password = quote_plus(self.POSTGRES_PASSWORD)
        return f"postgresql://{self.POSTGRES_USER}:{encoded_password}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    REFRESH_SECRET_KEY: str = secrets.token_urlsafe(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours per specification
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"]

    # SMTP Email Settings
    SMTP_HOST: str = "smtp.office365.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "supportx@extravis.co"
    SMTP_PASSWORD: str = "Y!149214049419af"
    SMTP_TLS: bool = True
    SMTP_FROM_EMAIL: str = "supportx@extravis.co"

    # Email Notification Settings
    EMAIL_FROM_ADDRESS: str = "supportx@extravis.co"
    EMAIL_FROM_NAME: str = "Success Manager"

    # Portal URLs (for generating links in emails)
    PORTAL_BASE_URL: str = "https://portal.extravis.com"
    ADMIN_BASE_URL: str = "https://admin.extravis.com"

    # Logo URL for emails (should be publicly accessible)
    LOGO_URL: str = "https://portal.extravis.com/logo.svg"

    # SendGrid (alternative to SMTP)
    SENDGRID_API_KEY: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
