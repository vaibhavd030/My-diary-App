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

from my_diary.api import auth as auth_router
from my_diary.api import entries as entries_router
from my_diary.core.logging import configure_logging
from my_diary.core.settings import settings

log = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Startup/shutdown hooks."""
    configure_logging()
    log.info("my_diary_startup")
    yield
    log.info("my_diary_shutdown")


app = FastAPI(
    title="My Diary",
    description="Spiritual practice + wellness journaling API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(entries_router.router)


@app.get("/healthz", tags=["system"])
async def healthz() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}
