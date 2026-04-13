"""User registration and authentication business logic."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from my_diary.core.security import hash_password, verify_password
from my_diary.db.models import User
from my_diary.schemas.api import RegisterRequest, UserPublic


def _to_public(user: User) -> UserPublic:
    """Map an ORM ``User`` row to its public-facing response."""
    return UserPublic(
        id=str(user.id),
        email=user.email,
        is_admin=user.is_admin,
        first_name=user.first_name,
        last_name=user.last_name,
        abhyasi_id=user.abhyasi_id,
        created_at=user.created_at,
    )


async def register_user(session: AsyncSession, payload: RegisterRequest) -> UserPublic:
    """Create a new user account.

    Args:
        session: Active async SQLAlchemy session.
        payload: Validated registration request.

    Returns:
        The public profile of the newly-created user.

    Raises:
        ValueError: If the email is already registered.
    """
    email = payload.email.lower().strip()
    existing = await session.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none() is not None:
        raise ValueError("Email already registered")

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        abhyasi_id=payload.abhyasi_id,
    )
    session.add(user)
    await session.flush()
    return _to_public(user)


async def authenticate(
    session: AsyncSession, *, email: str, password: str
) -> UserPublic | None:
    """Verify credentials and return the user if valid.

    Args:
        session: Active async SQLAlchemy session.
        email: User-supplied email (case-insensitive).
        password: User-supplied plaintext password.

    Returns:
        The user's public profile on success, None on failure.
    """
    normalised = email.lower().strip()
    result = await session.execute(select(User).where(User.email == normalised))
    user = result.scalar_one_or_none()
    if user is None:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return _to_public(user)


async def get_user_by_id(
    session: AsyncSession, user_id: uuid.UUID
) -> UserPublic | None:
    """Fetch a user by UUID."""
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    return _to_public(user) if user is not None else None


async def update_password(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    current_password: str,
    new_password: str,
) -> bool:
    """Verify current password and set a new one.

    Returns: True on success, False if current password is incorrect.
    """
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        return False

    if not verify_password(current_password, user.password_hash):
        return False

    user.password_hash = hash_password(new_password)
    await session.commit()
    return True
