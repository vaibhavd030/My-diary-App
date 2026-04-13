"""Application settings — loaded from environment variables.

Usage:
    from my_diary.core.settings import settings
    print(settings.database_url)
"""

from __future__ import annotations

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All application configuration, loaded from .env or environment."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    environment: str = Field(default="development")
    database_url: str = Field(
        default="sqlite+aiosqlite:///./diary.db",
        description="Async SQLAlchemy DB URL"
    )
    jwt_secret: SecretStr = Field(description="JWT signing secret")

    jwt_algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=60 * 24 * 7)

    timezone: str = Field(default="Europe/London")
    log_level: str = Field(default="INFO")
    log_format: str = Field(default="console")
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])

    @field_validator("jwt_algorithm")
    @classmethod
    def validate_algorithm(cls, v: str) -> str:
        """Ensure a supported JWT algorithm is configured."""
        if v not in {"HS256", "HS384", "HS512"}:
            raise ValueError(f"Unsupported JWT algorithm: {v!r}")
        return v


from functools import lru_cache


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()  # type: ignore[call-arg]
