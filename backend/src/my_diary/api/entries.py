"""Journal-entry and calendar endpoints."""

from __future__ import annotations

import json
import uuid
from datetime import date as dt_date

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse as FastAPIJSONResponse
from pydantic import ValidationError

from my_diary.api.deps import CurrentUserDep, SessionDep
from my_diary.models.entries import ENTRY_MODEL_BY_TYPE, EntryType
from my_diary.schemas.api import (
    CalendarMonthOut,
    DayOut,
    EntryOut,
    EntryUpsertRequest,
)
from my_diary.schemas.analytics import AnalyticsMonthOut
from my_diary.services import entries as entries_service

router = APIRouter(prefix="/api", tags=["entries"])


def _ensure_known_type(entry_type: str) -> EntryType:
    """Validate ``entry_type`` is one of the known discriminator values."""
    if entry_type not in ENTRY_MODEL_BY_TYPE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown entry type: {entry_type!r}",
        )
    return entry_type  # type: ignore[return-value]


def _reject_future(entry_date: dt_date) -> None:
    """Refuse to create entries for dates that haven't happened yet."""
    if entry_date > dt_date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot write entries for future dates",
        )


@router.get("/days/{entry_date}", response_model=DayOut)
async def get_day(
    entry_date: dt_date,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> DayOut:
    """Fetch all entries for ``entry_date`` for the current user."""
    return await entries_service.get_day(
        session,
        user_id=uuid.UUID(current_user.id),
        entry_date=entry_date,
    )


@router.put("/days/{entry_date}/{entry_type}", response_model=EntryOut)
async def upsert_entry(
    entry_date: dt_date,
    entry_type: str,
    payload: EntryUpsertRequest,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> EntryOut:
    """Create or replace the entry for ``(date, type)``."""
    _reject_future(entry_date)
    known_type = _ensure_known_type(entry_type)
    data = {**payload.data, "date": entry_date.isoformat()}
    try:
        return await entries_service.upsert_entry(
            session,
            user_id=uuid.UUID(current_user.id),
            entry_date=entry_date,
            entry_type=known_type,
            data=data,
        )
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors(),
        ) from exc


@router.delete(
    "/days/{entry_date}/{entry_type}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_entry(
    entry_date: dt_date,
    entry_type: str,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> None:
    """Delete the entry for ``(date, type)`` if it exists."""
    known_type = _ensure_known_type(entry_type)
    deleted = await entries_service.delete_entry(
        session,
        user_id=uuid.UUID(current_user.id),
        entry_date=entry_date,
        entry_type=known_type,
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found"
        )


@router.get("/calendar/{year}/{month}", response_model=CalendarMonthOut)
async def calendar_month(
    year: int,
    month: int,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> CalendarMonthOut:
    """Return the calendar summary (richness per day) for a month."""
    if not 1 <= month <= 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Month must be 1-12"
        )
    return await entries_service.get_month(
        session,
        user_id=uuid.UUID(current_user.id),
        year=year,
        month=month,
    )


# NOTE: annual route MUST be registered before /{year}/{month} to avoid
# FastAPI routing "annual" as an integer month value (422 int_parsing).
@router.get("/analytics/{year}/annual", response_model=AnalyticsMonthOut)
async def get_annual_analytics(
    year: int,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> AnalyticsMonthOut:
    """Get annual analytics for a given year."""
    return await entries_service.get_annual_analytics(
        session,
        user_id=uuid.UUID(current_user.id),
        year=year,
    )


@router.get("/analytics/{year}/{month}", response_model=AnalyticsMonthOut)
async def analytics_month(
    year: int,
    month: int,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> AnalyticsMonthOut:
    """Return detailed analytics and heatmaps for a month."""
    if not 1 <= month <= 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Month must be 1-12"
        )
    return await entries_service.get_analytics(
        session,
        user_id=uuid.UUID(current_user.id),
        year=year,
        month=month,
    )


@router.get("/search", response_model=list[EntryOut])
async def search_entries(
    query: str,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> list[EntryOut]:
    """Search for entries containing the query string."""
    if len(query) < 2:
        return []
    return await entries_service.search_entries(
        session,
        user_id=uuid.UUID(current_user.id),
        query=query,
    )


@router.get("/export")
async def export_entries(
    session: SessionDep,
    current_user: CurrentUserDep,
) -> FastAPIJSONResponse:
    """Export all diary entries for the current user as a downloadable JSON file."""
    data = await entries_service.export_all_entries(
        session,
        user_id=uuid.UUID(current_user.id),
    )
    filename = f"my_diary_export_{dt_date.today().isoformat()}.json"
    return FastAPIJSONResponse(
        content=data,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
