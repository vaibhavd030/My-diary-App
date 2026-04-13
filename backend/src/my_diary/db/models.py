"""SQLAlchemy ORM models.

Schema:
    users    — auth + profile
    entries  — one row per (user, date, type). ``data`` holds a Pydantic-
               validated payload as JSONB.
"""

from __future__ import annotations

import uuid
from datetime import date as dt_date
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Date,
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def _utcnow() -> datetime:
    """Return a timezone-aware UTC ``datetime`` for default timestamps."""
    return datetime.now(tz=timezone.utc)


class User(Base):
    """Application user.

    Attributes:
        id: UUID primary key.
        email: Unique lowercase email.
        password_hash: bcrypt hash.
        first_name / last_name: Display name parts.
        abhyasi_id: Optional Heartfulness abhyasi id.
        created_at: Creation timestamp (UTC).
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    abhyasi_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now()
    )

    entries: Mapped[list["Entry"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Entry(Base):
    """A single journal entry for one ``(user, date, type)`` triple."""

    __tablename__ = "entries"
    __table_args__ = (
        UniqueConstraint("user_id", "entry_date", "type", name="uq_entry_user_date_type"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    entry_date: Mapped[dt_date] = mapped_column(Date, index=True, nullable=False)
    type: Mapped[str] = mapped_column(String(40), nullable=False)
    data: Mapped[dict] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        onupdate=_utcnow,
        server_default=func.now(),
    )

    user: Mapped["User"] = relationship(back_populates="entries")
