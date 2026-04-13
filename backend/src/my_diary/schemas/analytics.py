"""Analytics response schemas."""

from __future__ import annotations

from datetime import date as dt_date
from typing import Any

from pydantic import BaseModel, Field


class MonthlyStat(BaseModel):
    """Categorised summary for a specific practice/habit over a month."""

    label: str
    value: str | float | int
    unit: str | None = None
    secondary_value: str | float | int | None = None
    secondary_unit: str | None = None
    heatmap_data: dict[str, int] = Field(
        default_factory=dict, 
        description="Map of ISO date string to intensity level (0-4)"
    )


class AnalyticsMonthOut(BaseModel):
    """Full monthly analytics dashboard data."""

    year: int
    month: int
    stats: dict[str, MonthlyStat] = Field(default_factory=dict)
