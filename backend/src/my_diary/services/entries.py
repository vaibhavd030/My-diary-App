"""Business logic for journal entries."""

from __future__ import annotations

import uuid
from calendar import monthrange
from datetime import date as dt_date

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from my_diary.db.models import Entry
from my_diary.models.entries import (
    ENTRY_MODEL_BY_TYPE,
    EntryType,
    parse_entry_payload,
)
from my_diary.schemas.api import (
    CalendarCell,
    CalendarMonthOut,
    DayOut,
    EntryOut,
)

KNOWN_ENTRY_TYPES: tuple[EntryType, ...] = tuple(ENTRY_MODEL_BY_TYPE.keys())


def _to_out(row: Entry) -> EntryOut:
    """Map an ORM ``Entry`` row to its API response shape."""
    return EntryOut(
        id=str(row.id),
        entry_date=row.entry_date,
        type=row.type,
        data=row.data,
        updated_at=row.updated_at,
    )


async def upsert_entry(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    entry_date: dt_date,
    entry_type: EntryType,
    data: dict,
) -> EntryOut:
    """Create-or-replace the entry for ``(user, date, type)``.

    The incoming ``data`` dict is validated against the matching Pydantic
    model before any DB write.

    Args:
        session: Active async SQLAlchemy session.
        user_id: Owning user's UUID.
        entry_date: Calendar date of the entry.
        entry_type: One of the known entry types.
        data: Raw JSON-compatible payload.

    Returns:
        The persisted entry, shaped for API response.

    Raises:
        ValidationError: If ``data`` doesn't match the entry-type model.
    """
    validated = parse_entry_payload(entry_type, data)
    clean = validated.model_dump(mode="json")

    result = await session.execute(
        select(Entry).where(
            and_(
                Entry.user_id == user_id,
                Entry.entry_date == entry_date,
                Entry.type == entry_type,
            )
        )
    )
    row = result.scalar_one_or_none()

    if row is None:
        row = Entry(
            user_id=user_id,
            entry_date=entry_date,
            type=entry_type,
            data=clean,
        )
        session.add(row)
    else:
        row.data = clean

    await session.flush()
    return _to_out(row)


async def delete_entry(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    entry_date: dt_date,
    entry_type: EntryType,
) -> bool:
    """Delete the entry for ``(user, date, type)`` if it exists.

    Returns:
        True if a row was deleted, False if nothing matched.
    """
    result = await session.execute(
        select(Entry).where(
            and_(
                Entry.user_id == user_id,
                Entry.entry_date == entry_date,
                Entry.type == entry_type,
            )
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        return False
    await session.delete(row)
    return True


async def get_day(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    entry_date: dt_date,
) -> DayOut:
    """Fetch all entries for a single day, grouped by type.

    Returns:
        A ``DayOut`` with a dict of ``type -> EntryOut`` (possibly empty).
    """
    result = await session.execute(
        select(Entry).where(
            and_(Entry.user_id == user_id, Entry.entry_date == entry_date)
        )
    )
    rows = result.scalars().all()
    return DayOut(
        date=entry_date,
        entries={row.type: _to_out(row) for row in rows},
    )


async def get_month(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    year: int,
    month: int,
) -> CalendarMonthOut:
    """Summarise a month for the calendar view.

    For each day in the month, returns the count of distinct entry types
    logged (``richness``) and the list of type names.
    """
    _, last_day = monthrange(year, month)
    start = dt_date(year, month, 1)
    end = dt_date(year, month, last_day)

    result = await session.execute(
        select(Entry.entry_date, Entry.type).where(
            and_(
                Entry.user_id == user_id,
                Entry.entry_date >= start,
                Entry.entry_date <= end,
            )
        )
    )
    rows = result.all()

    by_day: dict[dt_date, list[str]] = {}
    for entry_date, entry_type in rows:
        by_day.setdefault(entry_date, []).append(entry_type)

    cells: list[CalendarCell] = []
    for day in range(1, last_day + 1):
        d = dt_date(year, month, day)
        types = by_day.get(d, [])
        cells.append(CalendarCell(date=d, richness=len(types), types=types))

    return CalendarMonthOut(year=year, month=month, cells=cells)
