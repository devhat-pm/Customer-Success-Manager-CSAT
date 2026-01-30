"""
Rate Limiting Middleware for Success Manager

Provides configurable rate limiting for API endpoints to prevent abuse.
Uses in-memory storage by default, can be extended to use Redis for distributed systems.
"""

import time
from collections import defaultdict
from typing import Callable, Optional
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings


class RateLimitExceeded(HTTPException):
    def __init__(self, retry_after: int = 60):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Please retry after {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )


class InMemoryRateLimiter:
    """Simple in-memory rate limiter using sliding window algorithm."""

    def __init__(self):
        self.requests = defaultdict(list)

    def is_allowed(self, key: str, limit: int, window: int = 60) -> tuple[bool, int]:
        """
        Check if request is allowed.

        Args:
            key: Unique identifier (e.g., IP address + endpoint)
            limit: Maximum requests allowed in window
            window: Time window in seconds

        Returns:
            Tuple of (is_allowed, retry_after_seconds)
        """
        now = time.time()
        window_start = now - window

        # Clean old requests
        self.requests[key] = [
            timestamp for timestamp in self.requests[key]
            if timestamp > window_start
        ]

        if len(self.requests[key]) >= limit:
            # Calculate retry after
            oldest_in_window = min(self.requests[key])
            retry_after = int(oldest_in_window + window - now) + 1
            return False, retry_after

        self.requests[key].append(now)
        return True, 0

    def get_remaining(self, key: str, limit: int, window: int = 60) -> int:
        """Get remaining requests in current window."""
        now = time.time()
        window_start = now - window

        current_requests = [
            timestamp for timestamp in self.requests[key]
            if timestamp > window_start
        ]

        return max(0, limit - len(current_requests))


# Global rate limiter instance
rate_limiter = InMemoryRateLimiter()


# Rate limit configurations
RATE_LIMITS = {
    # Auth endpoints - stricter limits
    "/api/v1/auth/login": {"limit": 10, "window": 60},      # 10 per minute
    "/api/v1/auth/register": {"limit": 5, "window": 60},     # 5 per minute
    "/api/v1/auth/refresh": {"limit": 30, "window": 60},     # 30 per minute

    # Admin endpoints - moderate limits
    "/api/v1/admin/seed-demo-data": {"limit": 2, "window": 60},  # 2 per minute

    # Default for all other endpoints
    "default": {"limit": 100, "window": 60}  # 100 per minute
}


def get_rate_limit_config(path: str) -> dict:
    """Get rate limit configuration for a path."""
    # Check for exact match first
    if path in RATE_LIMITS:
        return RATE_LIMITS[path]

    # Check for prefix match
    for pattern, config in RATE_LIMITS.items():
        if pattern != "default" and path.startswith(pattern):
            return config

    return RATE_LIMITS["default"]


def get_client_ip(request: Request) -> str:
    """Extract client IP from request, handling proxies."""
    # Check X-Forwarded-For header (set by reverse proxy)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # Get the first IP (original client)
        return forwarded.split(",")[0].strip()

    # Check X-Real-IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    # Fallback to direct connection
    if request.client:
        return request.client.host

    return "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware that applies rate limiting to all requests.

    Rate limits are configurable per endpoint path.
    """

    def __init__(self, app, enabled: bool = True):
        super().__init__(app)
        self.enabled = enabled

    async def dispatch(self, request: Request, call_next: Callable):
        # Skip rate limiting if disabled
        if not self.enabled:
            return await call_next(request)

        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/docs", "/openapi.json"]:
            return await call_next(request)

        # Get client identifier
        client_ip = get_client_ip(request)
        path = request.url.path

        # Get rate limit config for this path
        config = get_rate_limit_config(path)
        limit = config["limit"]
        window = config["window"]

        # Create unique key for this client + endpoint
        rate_key = f"{client_ip}:{path}"

        # Check rate limit
        allowed, retry_after = rate_limiter.is_allowed(rate_key, limit, window)

        if not allowed:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": f"Rate limit exceeded. Maximum {limit} requests per {window} seconds.",
                    "retry_after": retry_after
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + retry_after)
                }
            )

        # Process request
        response = await call_next(request)

        # Add rate limit headers to response
        remaining = rate_limiter.get_remaining(rate_key, limit, window)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + window)

        return response


def rate_limit(limit: int = 100, window: int = 60):
    """
    Decorator for rate limiting specific endpoints.

    Usage:
        @app.get("/my-endpoint")
        @rate_limit(limit=10, window=60)
        async def my_endpoint():
            ...
    """
    def decorator(func: Callable):
        async def wrapper(request: Request, *args, **kwargs):
            client_ip = get_client_ip(request)
            rate_key = f"{client_ip}:{request.url.path}:{func.__name__}"

            allowed, retry_after = rate_limiter.is_allowed(rate_key, limit, window)

            if not allowed:
                raise RateLimitExceeded(retry_after=retry_after)

            return await func(request, *args, **kwargs)

        return wrapper
    return decorator
