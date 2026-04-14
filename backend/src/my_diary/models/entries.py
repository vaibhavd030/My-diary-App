"""Pydantic v2 domain models for journal entries.

Shapes mirror My-Tele-PA's ``life_os.models.wellness`` so entries written here
and there share a schema. Each entry type is persisted as a JSON payload
against a single ``entries`` table, discriminated by ``type``.
"""

from __future__ import annotations

import enum
from datetime import date as dt_date
from datetime import datetime as dt_datetime
from datetime import time as dt_time
from typing import Annotated, Literal

from pydantic import BaseModel, Field, model_validator


# ─── Practice entries ───────────────────────────────────────────────────────


class PracticeBase(BaseModel):
    """Common fields for all spiritual-practice entries."""

    date: dt_date = Field(description="Calendar date of the practice")
    datetime_logged: dt_datetime | None = Field(
        default=None, description="When the practice was done (optional)"
    )
    duration_minutes: Annotated[int, Field(ge=1, le=300)] | None = None
    notes: str | None = Field(default=None, max_length=2000)


class MeditationEntry(PracticeBase):
    """A morning or ad-hoc meditation session.

    Attributes:
        place: Where the session was held.
        felt: Subjective felt-sense after the session.
    """

    place: str | None = Field(default=None, max_length=120)
    felt: str | None = Field(default=None, max_length=500)
    quality: Annotated[int, Field(ge=1, le=10)] | None = None
    is_distracted: bool = False
    is_deep_unaware: bool = False
    is_deep_transmission: bool = False
    is_calm_deep_end: bool = False


class CleaningEntry(PracticeBase):
    """A Heartfulness cleaning practice session."""


class SittingEntry(PracticeBase):
    """A Heartfulness sitting / transmission session.

    Attributes:
        took_from: Name of the trainer/preceptor who gave the sitting.
    """

    took_from: str | None = Field(default=None, max_length=120)


class GroupMeditationEntry(PracticeBase):
    """A satsang / group meditation session.

    Attributes:
        place: Venue of the group meditation.
    """

    place: str | None = Field(default=None, max_length=200)


# ─── Body entries ───────────────────────────────────────────────────────────


class SleepEntry(BaseModel):
    """One night of sleep.

    Attributes:
        date: Calendar date the sleep **ended** on (i.e. this morning).
        bedtime: When the user went to bed (HH:MM, previous evening usually).
        wake_time: When the user woke up (HH:MM, this morning).
        duration_hours: Computed sleep duration. Auto-derived if bedtime and
            wake_time are present; otherwise can be entered manually.
        quality: Subjective quality 1–10.
        notes: Optional free-text.
    """

    date: dt_date
    bedtime: dt_time | None = None
    wake_time: dt_time | None = None
    duration_hours: Annotated[float, Field(ge=0, le=24)] | None = None
    quality: Annotated[int, Field(ge=1, le=10)] | None = None
    notes: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def compute_duration(self) -> "SleepEntry":
        """Auto-derive ``duration_hours`` from ``bedtime`` and ``wake_time``.

        Treats bedtime as belonging to the previous calendar day if it's
        after wake_time (e.g. bed 23:00, wake 07:00 → 8h).
        """
        if self.bedtime is not None and self.wake_time is not None:
            bed_min = self.bedtime.hour * 60 + self.bedtime.minute
            wake_min = self.wake_time.hour * 60 + self.wake_time.minute
            if wake_min <= bed_min:
                wake_min += 24 * 60
            derived = (wake_min - bed_min) / 60.0
            if self.duration_hours is None:
                self.duration_hours = round(derived, 2)
        return self


class MuscleGroup(enum.StrEnum):
    """Body-parts options for a gym session."""

    FULL_BODY = "full_body"
    CHEST = "chest"
    BICEPS = "biceps"
    TRICEPS = "triceps"
    SHOULDERS = "shoulders"
    BACK = "back"
    ABS = "abs"
    LOWER_BODY = "lower_body"
    UPPER_BODY = "upper_body"
    STRETCHING = "stretching"


class GymEntry(BaseModel):
    """A gym / weights session.

    Attributes:
        date: Calendar date of the session.
        datetime_logged: Exact datetime (optional).
        body_parts: One or more muscle groups trained.
        duration_minutes: Length of the session in minutes.
        intensity: Subjective intensity 1–10.
        notes: Optional free-text.
    """

    date: dt_date
    datetime_logged: dt_datetime | None = None
    body_parts: list[MuscleGroup] = Field(default_factory=list)
    duration_minutes: Annotated[int, Field(ge=1, le=600)] | None = None
    intensity: Annotated[int, Field(ge=1, le=10)] | None = None
    notes: str | None = Field(default=None, max_length=1000)


class ActivityType(enum.StrEnum):
    """Activity / sport options outside the gym."""

    RUN = "run"
    WALK = "walk"
    SWIM = "swim"
    CYCLE = "cycle"
    BADMINTON = "badminton"
    TENNIS = "tennis"
    PICKLEBALL = "pickleball"
    YOGA = "yoga"
    OTHER = "other"


class ActivityEntry(BaseModel):
    """A non-gym physical activity.

    Attributes:
        date: Calendar date of the activity.
        datetime_logged: Exact datetime (optional).
        activity_type: One of the known activities.
        duration_minutes: Length of the activity in minutes.
        distance_km: Distance covered, where meaningful.
        intensity: Subjective intensity 1–10.
        notes: Optional free-text.
    """

    date: dt_date
    datetime_logged: dt_datetime | None = None
    activity_type: ActivityType = ActivityType.OTHER
    duration_minutes: Annotated[int, Field(ge=1, le=600)] | None = None
    distance_km: Annotated[float, Field(ge=0, le=1000)] | None = None
    intensity: Annotated[int, Field(ge=1, le=10)] | None = None
    notes: str | None = Field(default=None, max_length=1000)


# ─── Reflection ─────────────────────────────────────────────────────────────


class JournalNote(BaseModel):
    """Free-form daily journal note.

    Attributes:
        date: Calendar date of the entry.
        body: Free-text journal content.
    """

    date: dt_date
    body: str = Field(default="", max_length=20000)


class PersonalWatchEntry(BaseModel):
    """Daily habit and personal check items.

    Attributes:
        date: Calendar date of the checks.
        got_angry: Whether the user got angry today.
        mtb: Mouth to Brain spiritual check.
        junk_food: Whether outside/junk food was consumed.
        scrolled_phone: Whether phone was used in bed.
        no_sugar: Whether the user avoided sugar today.
        slept_late: Whether the user went to bed later than desired.
    """

    date: dt_date
    got_angry: bool = False
    mtb: bool = False
    junk_food: bool = False
    scrolled_phone: bool = False
    no_sugar: bool = False
    slept_late: bool = False


# ─── Discriminated-union helpers ────────────────────────────────────────────

EntryType = Literal[
    "meditation",
    "cleaning",
    "sitting",
    "group_meditation",
    "sleep",
    "gym",
    "activity",
    "journal_note",
    "personal_watch",
]

ENTRY_MODEL_BY_TYPE: dict[EntryType, type[BaseModel]] = {
    "meditation": MeditationEntry,
    "cleaning": CleaningEntry,
    "sitting": SittingEntry,
    "group_meditation": GroupMeditationEntry,
    "sleep": SleepEntry,
    "gym": GymEntry,
    "activity": ActivityEntry,
    "journal_note": JournalNote,
    "personal_watch": PersonalWatchEntry,
}


def parse_entry_payload(entry_type: EntryType, data: dict) -> BaseModel:
    """Validate a raw payload against its entry-type Pydantic model.

    Args:
        entry_type: Discriminator string from the entries table.
        data: Raw dict loaded from the JSON column or the request body.

    Returns:
        A validated Pydantic model instance of the appropriate subclass.

    Raises:
        KeyError: If ``entry_type`` is not a known entry type.
        ValidationError: If ``data`` does not satisfy the model.
    """
    model_cls = ENTRY_MODEL_BY_TYPE[entry_type]
    return model_cls.model_validate(data)
