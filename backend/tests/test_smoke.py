"""End-to-end smoke test — exercises every entry type."""

from __future__ import annotations

from datetime import date as dt_date

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_full_day(client: AsyncClient) -> None:
    """Register, login, log every entry type, and verify the calendar."""
    # register + login
    r = await client.post(
        "/auth/register",
        json={
            "email": "vaibhav@example.com",
            "password": "a-strong-password",
            "first_name": "Vaibhav",
        },
    )
    assert r.status_code == 201, r.text

    r = await client.post(
        "/auth/login",
        json={"email": "vaibhav@example.com", "password": "a-strong-password"},
    )
    assert r.status_code == 200
    # Extract CSRF token from cookies
    csrf_token = client.cookies.get("csrftoken")
    assert csrf_token is not None

    today = dt_date.today().isoformat()

    payloads: dict[str, dict] = {
        "meditation": {
            "duration_minutes": 30,
            "place": "home",
            "felt": "calm, settled",
        },
        "cleaning": {"duration_minutes": 20},
        "sitting": {"duration_minutes": 45, "took_from": "Suresh ji"},
        "group_meditation": {"duration_minutes": 60, "place": "Centre"},
        "sleep": {
            "bedtime": "23:00:00",
            "wake_time": "07:00:00",
            "quality": 8,
        },
        "gym": {
            "duration_minutes": 60,
            "body_parts": ["chest", "triceps"],
            "intensity": 7,
        },
        "activity": {
            "activity_type": "run",
            "duration_minutes": 35,
            "distance_km": 5.5,
            "intensity": 6,
        },
        "journal_note": {"body": "A long, full day."},
    }

    for entry_type, data in payloads.items():
        r = await client.put(
            f"/api/days/{today}/{entry_type}",
            json={"data": data},
            headers={"X-CSRF-Token": csrf_token},
        )
        assert r.status_code == 200, f"{entry_type}: {r.text}"

    # sleep duration is auto-derived
    r = await client.get(f"/api/days/{today}")
    assert r.status_code == 200
    sleep = r.json()["entries"]["sleep"]["data"]
    assert sleep["duration_hours"] == 8.0

    # calendar reports richness == 8
    d = dt_date.today()
    r = await client.get(f"/api/calendar/{d.year}/{d.month}")
    cells = r.json()["cells"]
    today_cell = next(c for c in cells if c["date"] == today)
    assert today_cell["richness"] == 8

    # test logout
    r = await client.post("/auth/logout", headers={"X-CSRF-Token": csrf_token})
    assert r.status_code == 200
    
    # next request should be 401
    r = await client.get(f"/api/days/{today}")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_future_date_rejected(client: AsyncClient) -> None:
    """The API must refuse to write entries for tomorrow."""
    r = await client.post(
        "/auth/register",
        json={"email": "u@example.com", "password": "another-pass-1234"},
    )
    assert r.status_code == 201
    r = await client.post(
        "/auth/login",
        json={"email": "u@example.com", "password": "another-pass-1234"},
    )
    assert r.status_code == 200
    csrf_token = client.cookies.get("csrftoken")
    assert csrf_token is not None

    from datetime import timedelta

    tomorrow = (dt_date.today() + timedelta(days=1)).isoformat()
    r = await client.put(
        f"/api/days/{tomorrow}/journal_note",
        json={"data": {"body": "from the future"}},
        headers={"X-CSRF-Token": csrf_token},
    )
    assert r.status_code == 400
