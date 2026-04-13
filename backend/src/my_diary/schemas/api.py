"""API request/response schemas."""

from __future__ import annotations

from datetime import date as dt_date
from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field


# ─── Auth ───────────────────────────────────────────────────────────────────


class RegisterRequest(BaseModel):
    """New-user registration payload."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    first_name: str | None = Field(default=None, max_length=120)
    last_name: str | None = Field(default=None, max_length=120)
    abhyasi_id: str | None = Field(default=None, max_length=40)


class LoginRequest(BaseModel):
    """Login payload."""

    email: EmailStr
    password: str


class UserPublic(BaseModel):
    """Public-facing user profile (no secrets)."""

    id: str
    email: EmailStr
    is_admin: bool = False
    first_name: str | None = None
    last_name: str | None = None
    abhyasi_id: str | None = None
    created_at: datetime


class PasswordChangeRequest(BaseModel):
    """Payload for changing own password."""

    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    """JWT access token response."""

    access_token: str
    token_type: str = "bearer"
    user: UserPublic


# ─── Entries ────────────────────────────────────────────────────────────────


class EntryUpsertRequest(BaseModel):
    """Create-or-replace an entry for ``(date, type)``."""

    data: dict[str, Any]


class EntryOut(BaseModel):
    """Single entry returned to the client."""

    id: str
    entry_date: dt_date
    type: str
    data: dict[str, Any]
    updated_at: datetime


class DayOut(BaseModel):
    """All entries for a single day, keyed by type."""

    date: dt_date
    entries: dict[str, EntryOut] = Field(default_factory=dict)


class CalendarCell(BaseModel):
    """One day in the monthly calendar summary."""

    date: dt_date
    richness: int = Field(ge=0, le=10)
    types: list[str] = Field(default_factory=list)


class CalendarMonthOut(BaseModel):
    """Monthly calendar summary for a single user."""

    year: int
    month: int = Field(ge=1, le=12)
    cells: list[CalendarCell]
