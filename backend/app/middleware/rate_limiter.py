"""
In-memory per-IP rate limiter implemented as Starlette-compatible middleware.

Tracks request timestamps per client IP in a dictionary. Old entries are
pruned on every request to prevent unbounded memory growth. When the
configured limit is exceeded a 429 JSON response is returned.
"""

from __future__ import annotations

import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Sliding window duration in seconds
_WINDOW_SECONDS: int = 60

# Clean up IPs that haven't been seen for this many seconds
_STALE_THRESHOLD_SECONDS: int = 300


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    Per-IP sliding-window rate limiter.

    - Allows up to ``settings.RATE_LIMIT_PER_MINUTE`` requests per IP
      within a rolling 60-second window.
    - Returns ``429 Too Many Requests`` with a JSON body when exceeded.
    - Periodically evicts stale entries so memory stays bounded.
    """

    def __init__(self, app: object) -> None:
        super().__init__(app)  # type: ignore[arg-type]
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._last_cleanup: float = time.time()

    # --------------------------------------------------------------------- #
    # Middleware entry point
    # --------------------------------------------------------------------- #
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Skip rate-limiting for health checks
        if request.url.path == "/health":
            return await call_next(request)

        client_ip = self._client_ip(request)
        now = time.time()

        # Periodic stale-entry cleanup
        if now - self._last_cleanup > _STALE_THRESHOLD_SECONDS:
            self._cleanup(now)

        # Slide the window: keep only timestamps within the last 60 s
        self._requests[client_ip] = [
            ts for ts in self._requests[client_ip] if now - ts < _WINDOW_SECONDS
        ]

        if len(self._requests[client_ip]) >= settings.RATE_LIMIT_PER_MINUTE:
            logger.warning("Rate limit exceeded for IP %s", client_ip)
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."},
            )

        self._requests[client_ip].append(now)
        return await call_next(request)

    # --------------------------------------------------------------------- #
    # Helpers
    # --------------------------------------------------------------------- #
    @staticmethod
    def _client_ip(request: Request) -> str:
        """Extract the client IP, respecting X-Forwarded-For if present."""
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _cleanup(self, now: float) -> None:
        """Remove entries for IPs that haven't made a request recently."""
        stale_ips = [
            ip
            for ip, timestamps in self._requests.items()
            if not timestamps or now - timestamps[-1] > _STALE_THRESHOLD_SECONDS
        ]
        for ip in stale_ips:
            del self._requests[ip]
        self._last_cleanup = now
        if stale_ips:
            logger.debug("Rate limiter cleanup: evicted %d stale IPs", len(stale_ips))
