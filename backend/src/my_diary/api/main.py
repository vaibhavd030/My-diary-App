"""FastAPI application entrypoint.

Run with:
    uvicorn my_diary.api.main:app --reload
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from my_diary.api import auth as auth_router
from my_diary.api import entries as entries_router
from my_diary.core.logging import configure_logging
from my_diary.core.settings import get_settings

log = structlog.get_logger(__name__)

from my_diary.api.limiter import limiter


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Startup/shutdown hooks."""
    configure_logging()
    
    # Auto-create tables for local development/testing to ensure "one command" works.
    # In production, migrations should be handled by Alembic.
    # DISABLED for migration-based readiness
    # settings = get_settings()
    # if settings.environment != "production":
    #     log.info("auto_creating_tables_for_development")
    #     from my_diary.db.models import Base
    #     from my_diary.db.session import engine
    #     async with engine.begin() as conn:
    #         await conn.run_sync(Base.metadata.create_all)

    log.info("my_diary_startup")
    yield
    log.info("my_diary_shutdown")


from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# Create the app instance first so the handler can be registered
app = FastAPI(
    title="My Diary",
    description="Spiritual practice + wellness journaling API",
    version="0.1.0",
    lifespan=lifespan,
)

# Set up rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    # Log detailed error for debugging
    log.error("validation_error", errors=exc.errors())
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

# Configure CORS origins robustly
settings = get_settings()
origins = []
if isinstance(settings.cors_origins, list):
    origins = [o.rstrip("/") for o in settings.cors_origins]
else:
    # Handle single string or empty
    origins = [settings.cors_origins.rstrip("/")] if settings.cors_origins else []

# Add common dev origins if not present
dev_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
for do in dev_origins:
    if do not in origins:
        origins.append(do)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Cookie", "X-CSRF-Token"],
)


from fastapi import Request

@app.middleware("http")
async def csrf_protect_middleware(request: Request, call_next):
    """Basic Double-Submit Cookie CSRF protection.
    
    If the 'access_token' cookie is present, check for a matching 'X-CSRF-Token' header 
    on state-changing requests.
    """
    if request.method in {"POST", "PUT", "DELETE"}:
        # Skip healthz and login/register (before session is established)
        if request.url.path not in {"/healthz", "/auth/login", "/auth/register"}:
            session_cookie = request.cookies.get("access_token")
            if session_cookie:
                csrf_header = request.headers.get("X-CSRF-Token")
                csrf_cookie = request.cookies.get("csrftoken")
                
                if not csrf_header or not csrf_cookie or csrf_header != csrf_cookie:
                    log.warning("csrf_validation_failed", path=request.url.path)
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "CSRF validation failed"},
                    )
    
    response = await call_next(request)
    return response

app.include_router(auth_router.router)
app.include_router(entries_router.router)


@app.get("/healthz", tags=["system"])
async def healthz() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}
