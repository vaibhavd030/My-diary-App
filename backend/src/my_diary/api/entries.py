"""Journal-entry and calendar endpoints."""

from __future__ import annotations

import uuid
from datetime import date as dt_date

from fastapi import APIRouter, HTTPException, status
from pydantic import ValidationError

from my_diary.api.deps import CurrentUserDep, SessionDep
from my_diary.models.entries import ENTRY_MODEL_BY_TYPE, EntryType
from my_diary.schemas.api import (
    CalendarMonthOut,
    DayOut,
    EntryOut,
    EntryUpsertRequest,
)
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
    """Refuse to create entries for dates that haven't happened yet.

    Raises:
        HTTPException: 400 when ``entry_date`` is strictly after today.
    """
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
    """Create or replace the entry for ``(date, type)``.

    The ``date`` field inside the payload is normalised to ``entry_date`` so
    clients can't spoof cross-date writes.
    """
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
