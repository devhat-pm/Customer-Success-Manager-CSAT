"""
Dependencies for Customer Portal authentication.
Used to protect customer-facing endpoints.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.customer_security import decode_customer_access_token
from app.models.customer_user import CustomerUser
from app.models.customer import Customer

# Separate OAuth2 scheme for customer portal
customer_oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/portal/auth/login",
    auto_error=False  # Don't auto-error, we'll handle it with better messages
)


class CustomerAuthenticationError(HTTPException):
    """Authentication error for customer portal."""
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )


class CustomerInactiveError(HTTPException):
    """Error when customer user account is inactive."""
    def __init__(self, detail: str = "Your account has been deactivated"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )


class PortalAccessDisabledError(HTTPException):
    """Error when customer company's portal access is disabled."""
    def __init__(self, detail: str = "Portal access is not available for your organization"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )


class CustomerUserContext:
    """
    Context object containing the authenticated customer user and their company.
    Passed to endpoints requiring customer authentication.
    """
    def __init__(self, customer_user: CustomerUser, customer: Customer):
        self.customer_user = customer_user
        self.customer = customer

    @property
    def user_id(self):
        return self.customer_user.id

    @property
    def customer_id(self):
        return self.customer.id

    @property
    def email(self):
        return self.customer_user.email

    @property
    def company_name(self):
        return self.customer.company_name


async def get_current_customer_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(customer_oauth2_scheme)
) -> CustomerUserContext:
    """
    Dependency that validates customer authentication and returns context.

    Checks:
    1. Valid JWT token with correct type and issuer
    2. Customer user exists and is active
    3. Customer user is verified
    4. Customer company has portal access enabled
    """
    if token is None:
        raise CustomerAuthenticationError("Authentication required")

    # Decode and validate token
    payload = decode_customer_access_token(token)
    if payload is None:
        raise CustomerAuthenticationError("Invalid or expired token")

    customer_user_id = payload.get("sub")
    customer_id = payload.get("customer_id")

    if not customer_user_id or not customer_id:
        raise CustomerAuthenticationError("Invalid token payload")

    # Get customer user
    customer_user = db.query(CustomerUser).filter(
        CustomerUser.id == customer_user_id
    ).first()

    if customer_user is None:
        raise CustomerAuthenticationError("User not found")

    # Check user is active
    if not customer_user.is_active:
        raise CustomerInactiveError()

    # Check user is verified
    if not customer_user.is_verified:
        raise CustomerAuthenticationError("Account not verified")

    # Get customer company
    customer = db.query(Customer).filter(
        Customer.id == customer_user.customer_id
    ).first()

    if customer is None:
        raise CustomerAuthenticationError("Organization not found")

    # Check portal access is enabled
    if not customer.portal_enabled:
        raise PortalAccessDisabledError()

    return CustomerUserContext(customer_user, customer)


async def get_optional_customer_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(customer_oauth2_scheme)
) -> Optional[CustomerUserContext]:
    """
    Optional customer authentication - returns None if not authenticated.
    Useful for endpoints that work differently for authenticated vs anonymous users.
    """
    if token is None:
        return None

    try:
        return await get_current_customer_user(db, token)
    except HTTPException:
        return None
