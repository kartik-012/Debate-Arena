"""
Debate Arena — FastAPI application entry point.

Wires together middleware, routers, exception handlers, and the database
bootstrap. Run with:

    uvicorn app.main:app --reload
"""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db
from app.middleware.rate_limiter import RateLimiterMiddleware
from app.routers import debate, health
from app.utils.logger import get_logger

logger = get_logger(__name__)


# --------------------------------------------------------------------------- #
# Lifespan (startup / shutdown)
# --------------------------------------------------------------------------- #

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan: initialise the database on startup."""
    logger.info("Starting Debate Arena API (env=%s)", settings.ENVIRONMENT)
    await init_db()
    logger.info("Database ready — API accepting requests")
    yield
    logger.info("Shutting down Debate Arena API")


# --------------------------------------------------------------------------- #
# Application instance
# --------------------------------------------------------------------------- #

app = FastAPI(
    title="Debate Arena API",
    version="1.0.0",
    description=(
        "AI-vs-AI debate platform where language models argue both sides "
        "of a question and a judge model picks the winner."
    ),
    lifespan=lifespan,
)


# --------------------------------------------------------------------------- #
# Middleware (order matters: last added = first executed)
# --------------------------------------------------------------------------- #

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"https://debate-arena.*-kartik-012s-projects\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimiterMiddleware)


# --------------------------------------------------------------------------- #
# Routers
# --------------------------------------------------------------------------- #

app.include_router(health.router)
app.include_router(debate.router)


# --------------------------------------------------------------------------- #
# Global exception handlers
# --------------------------------------------------------------------------- #

@app.exception_handler(404)
async def not_found_handler(request: Request, exc: Exception) -> JSONResponse:
    """Return a consistent JSON body for 404 errors."""
    return JSONResponse(
        status_code=404,
        content={"detail": "The requested resource was not found."},
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Return a safe JSON body for unhandled 500 errors.

    The real exception is logged but never leaked to the client.
    """
    logger.exception("Unhandled server error on %s %s", request.method, request.url)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."},
    )
