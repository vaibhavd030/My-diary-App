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
from my_diary.schemas.analytics import AnalyticsMonthOut, MonthlyStat
from sqlalchemy import cast, String as SqlString
from datetime import timedelta

async def _get_streak(session: AsyncSession, user_id: uuid.UUID, entry_type: str) -> int:
    """Compute current unbroken daily streak natively from historical tracking."""
    today = dt_date.today()
    result = await session.execute(
        select(Entry.entry_date)
        .where(and_(Entry.user_id == user_id, Entry.type == entry_type))
        .order_by(Entry.entry_date.desc())
    )
    dates = result.scalars().all()
    unique_dates = sorted(list(set(dates)), reverse=True)
    if not unique_dates:
        return 0
            
    if (today - unique_dates[0]) > timedelta(days=1):
        return 0

    streak = 1
    for i in range(len(unique_dates) - 1):
        if (unique_dates[i] - unique_dates[i+1]) == timedelta(days=1):
            streak += 1
        else:
            break
    return streak

async def _get_pw_item_streak(session: AsyncSession, user_id: uuid.UUID, item_key: str) -> int:
    """Compute current unbroken daily streak for a specific personal watch item."""
    today = dt_date.today()
    result = await session.execute(
        select(Entry.entry_date, Entry.data)
        .where(and_(Entry.user_id == user_id, Entry.type == "personal_watch"))
        .order_by(Entry.entry_date.desc())
    )
    rows = result.all()
    if not rows:
        return 0

    # Filter to only dates where the item was True
    streak_dates = [r[0] for r in rows if r[1].get(item_key) is True]
    if not streak_dates:
        return 0
        
    unique_dates = sorted(list(set(streak_dates)), reverse=True)

    if (today - unique_dates[0]) > timedelta(days=1):
        return 0

    streak = 1
    for i in range(len(unique_dates) - 1):
        if (unique_dates[i] - unique_dates[i+1]) == timedelta(days=1):
            streak += 1
        else:
            break
    return streak

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


async def get_analytics(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    year: int,
    month: int,
) -> AnalyticsMonthOut:
    """Compute detailed analytics for a specific month."""
    _, last_day = monthrange(year, month)
    start = dt_date(year, month, 1)
    end = dt_date(year, month, last_day)

    result = await session.execute(
        select(Entry).where(
            and_(
                Entry.user_id == user_id,
                Entry.entry_date >= start,
                Entry.entry_date <= end,
            )
        )
    )
    entries = result.scalars().all()

    # Grouping
    by_type: dict[str, list[Entry]] = {}
    for e in entries:
        by_type.setdefault(e.type, []).append(e)

    stats: dict[str, MonthlyStat] = {}

    # 1. Meditation
    med_entries = by_type.get("meditation", [])
    total_med_min = sum(e.data.get("duration_minutes", 0) or 0 for e in med_entries)
    unique_med_days = len(set(e.entry_date for e in med_entries))
    med_streak = await _get_streak(session, user_id, "meditation")
    stats["meditation"] = MonthlyStat(
        label="Meditation",
        value=round(total_med_min / 60, 1),
        unit="hours",
        secondary_value=unique_med_days,
        secondary_unit="days",
        heatmap_data={
            e.entry_date.isoformat(): min(4, (e.data.get("duration_minutes", 0) or 0) // 15)
            for e in med_entries
        },
        streak=med_streak,
    )

    # 2. Cleaning & Sitting (Aggregate hours too)
    for t in ["cleaning", "sitting"]:
        t_entries = by_type.get(t, [])
        total_min = sum(e.data.get("duration_minutes", 0) or 0 for e in t_entries)
        streak = await _get_streak(session, user_id, t)
        stats[t] = MonthlyStat(
            label=t.title(),
            value=round(total_min / 60, 1),
            unit="hours",
            secondary_value=len(t_entries),
            secondary_unit="sessions",
            heatmap_data={
                e.entry_date.isoformat(): min(4, (e.data.get("duration_minutes", 0) or 0) // 15)
                for e in t_entries
            },
            streak=streak
        )

    # 3. Sleep (User req: avg hours, heatmap green scale)
    sleep_entries = by_type.get("sleep", [])
    total_sleep_h = sum(e.data.get("duration_hours", 0) or 0 for e in sleep_entries)
    avg_sleep = (total_sleep_h / len(sleep_entries)) if sleep_entries else 0
    
    # Heatmap intensity: 7h+ is 4 (dark green), 6h is 3, 5h is 2, etc.
    stats["sleep"] = MonthlyStat(
        label="Sleep",
        value=round(avg_sleep, 1),
        unit="h/night",
        heatmap_data={
            e.entry_date.isoformat(): max(0, min(4, int(e.data.get("duration_hours", 0) or 0) - 3))
            for e in sleep_entries
        },
    )

    # 3. Personal Watch (aggregated items)
    pw_entries = by_type.get("personal_watch", [])
    pw_items = ["got_angry", "mtb", "junk_food", "scrolled_phone", "no_sugar", "slept_late"]
    for item in pw_items:
        count = sum(1 for e in pw_entries if e.data.get(item))
        streak = await _get_pw_item_streak(session, user_id, item)
            
        stats[item] = MonthlyStat(
            label=item.replace("_", " ").title(),
            value=count,
            unit="days",
            heatmap_data={
                e.entry_date.isoformat(): 4 if e.data.get(item) else 0
                for e in pw_entries
            },
            streak=streak
        )
    
    # 4. Others (Simplistic richness for now)
    for t in ["gym", "activity"]:
        t_entries = by_type.get(t, [])
        streak = await _get_streak(session, user_id, t)
        stats[t] = MonthlyStat(
            label=t.title(),
            value=len(t_entries),
            unit="sessions",
            heatmap_data={e.entry_date.isoformat(): 4 for e in t_entries},
            streak=streak
        )

    return AnalyticsMonthOut(year=year, month=month, stats=stats)


async def get_annual_analytics(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    year: int,
) -> AnalyticsMonthOut:
    """Categorise and summarize entries for an entire year."""
    start_date = dt_date(year, 1, 1)
    end_date = dt_date(year, 12, 31)

    result = await session.execute(
        select(Entry).where(
            and_(
                Entry.user_id == user_id,
                Entry.entry_date >= start_date,
                Entry.entry_date <= end_date,
            )
        )
    )
    rows = result.scalars().all()
    by_type: dict[str, list[Entry]] = {}
    for r in rows:
        by_type.setdefault(r.type, []).append(r)

    stats: dict[str, MonthlyStat] = {}

    # 1. Meditation
    med_entries = by_type.get("meditation", [])
    total_med_min = sum(float(e.data.get("duration_minutes", 0) or 0) for e in med_entries)
    unique_med_days = len(set(e.entry_date for e in med_entries))
    med_streak = await _get_streak(session, user_id, "meditation")
    stats["meditation"] = MonthlyStat(
        label="Meditation",
        value=round(total_med_min / 60.0, 1),
        unit="hours",
        secondary_value=int(unique_med_days),
        secondary_unit="days",
        heatmap_data={
            e.entry_date.isoformat(): int(min(4, float(e.data.get("duration_minutes", 0) or 0) // 15))
            for e in med_entries
        },
        streak=med_streak,
    )

    # 2. Cleaning & Sitting
    for t in ["cleaning", "sitting"]:
        t_entries = by_type.get(t, [])
        total_min = sum(float(e.data.get("duration_minutes", 0) or 0) for e in t_entries)
        t_streak = await _get_streak(session, user_id, t)
        stats[t] = MonthlyStat(
            label=t.title(),
            value=round(total_min / 60.0, 1),
            unit="hours",
            secondary_value=int(len(t_entries)),
            secondary_unit="sessions",
            heatmap_data={
                e.entry_date.isoformat(): int(min(4, float(e.data.get("duration_minutes", 0) or 0) // 15))
                for e in t_entries
            },
            streak=t_streak if t == "cleaning" else None
        )

    # 3. Sleep
    sleep_entries = by_type.get("sleep", [])
    total_sleep_h = sum(float(e.data.get("duration_hours", 0) or 0) for e in sleep_entries)
    avg_sleep = (total_sleep_h / len(sleep_entries)) if sleep_entries else 0.0
    stats["sleep"] = MonthlyStat(
        label="Sleep",
        value=round(float(avg_sleep), 1),
        unit="h avg",
        heatmap_data={
            e.entry_date.isoformat(): int(min(4, float(e.data.get("duration_hours", 0) or 0) // 2))
            for e in sleep_entries
        }
    )

    # 4. Gym & Activity
    for t in ["gym", "activity"]:
        t_entries = by_type.get(t, [])
        total_h = sum(float(e.data.get("duration_minutes", 0) or 0) for e in t_entries) / 60.0
        streak = await _get_streak(session, user_id, t)
        stats[t] = MonthlyStat(
            label=t.title(),
            value=round(total_h, 1),
            unit="hours",
            secondary_value=int(len(t_entries)),
            secondary_unit="sessions",
            heatmap_data={
                e.entry_date.isoformat(): int(min(4, float(e.data.get("duration_minutes", 0) or 0) // 15))
                for e in t_entries
            },
            streak=streak
        )

    # 5. Habits (PW)
    for t in ["got_angry", "mtb", "scrolled_phone", "junk_food", "no_sugar", "slept_late"]:
        pw_entries = [
            e for e in by_type.get("personal_watch", []) 
            if e.data.get(t) is True
        ]
        unique_days = len(set(e.entry_date for e in pw_entries))
        streak = await _get_pw_item_streak(session, user_id, t)

        stats[t] = MonthlyStat(
            label=t.replace("_", " ").title(),
            value=int(len(pw_entries)),
            unit="days",
            secondary_value=round(float((unique_days / 365.0) * 100.0), 1) if year > 0 else 0.0,
            secondary_unit="% year",
            heatmap_data={e.entry_date.isoformat(): 4 for e in pw_entries},
            streak=streak
        )

    return AnalyticsMonthOut(year=year, month=1, stats=stats)


async def search_entries(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    query: str,
) -> list[EntryOut]:
    """Find entries containing the search query string."""
    query_str = f"%{query}%"
    result = await session.execute(
        select(Entry).where(
            and_(
                Entry.user_id == user_id,
                cast(Entry.data, SqlString).ilike(query_str),
            )
        ).order_by(Entry.entry_date.desc()).limit(100)
    )
    rows = result.scalars().all()
    return [_to_out(row) for row in rows]


async def export_all_entries(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
) -> dict:
    """Return all entries for a user grouped by date, for export."""
    result = await session.execute(
        select(Entry)
        .where(Entry.user_id == user_id)
        .order_by(Entry.entry_date.asc(), Entry.type.asc())
    )
    rows = result.scalars().all()

    # Group by date
    grouped: dict[str, dict] = {}
    for row in rows:
        date_str = row.entry_date.isoformat()
        if date_str not in grouped:
            grouped[date_str] = {"date": date_str, "entries": {}}
        grouped[date_str]["entries"][row.type] = row.data

    return {
        "exported_at": dt_date.today().isoformat(),
        "total_days": len(grouped),
        "total_entries": len(rows),
        "days": list(grouped.values()),
    }
