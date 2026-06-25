"""
Health-check router.

Provides a lightweight endpoint that verifies the API and database are
reachable. Suitable for load-balancer probes and monitoring dashboards.
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.database import get_db, fetch_one
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    summary="Health check",
    description="Returns service health status including database connectivity.",
    response_class=JSONResponse,
)
async def health_check() -> JSONResponse:
    """
    Verify the API is running and the database is reachable.

    Returns a JSON object with:
    - **status**: ``"healthy"`` if everything is okay.
    - **version**: Current API version string.
    - **database**: ``"connected"`` or ``"disconnected"``.
    """
    db_status = "disconnected"

    try:
        async with get_db() as db:
            result = await fetch_one(db, "SELECT 1 AS ok")
            if result and result.get("ok") == 1:
                db_status = "connected"
    except Exception as exc:
        logger.error("Health check — database unreachable: %s", exc)

    status = "healthy" if db_status == "connected" else "degraded"

    return JSONResponse(
        status_code=200 if status == "healthy" else 503,
        content={
            "status": status,
            "version": "1.0.0",
            "database": db_status,
        },
    )


@router.get(
    "/health/quota",
    summary="Get Gemini quota status",
    description="Returns the current state of Gemini API rate-limiter buckets.",
)
async def get_quota_status() -> JSONResponse:
    """Returns information about available and consumed quota tokens."""
    from app.services.gemini_client import get_quota_info
    return JSONResponse(status_code=200, content=get_quota_info())
