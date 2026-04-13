from fastapi import Depends, HTTPException, status, Request
import jwt
import uuid
from typing import Annotated
from sqlalchemy.ext.asyncio import AsyncSession

from my_diary.core.security import decode_access_token
from my_diary.db.session import get_session
from my_diary.schemas.api import UserPublic
from my_diary.services import auth as auth_service

SessionDep = Annotated[AsyncSession, Depends(get_session)]

async def get_current_user(
    session: SessionDep,
    request: Request,
) -> UserPublic:
    """Resolve the current user from the 'access_token' cookie.

    Raises:
        HTTPException: 401 if the token is missing, invalid, or the user no
        longer exists.
    """
    token = request.cookies.get("access_token")
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        ) from exc

    subject = payload.get("sub")
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session missing subject",
        )
    try:
        user_id = uuid.UUID(subject)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed session subject",
        ) from exc

    user = await auth_service.get_user_by_id(session, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user

CurrentUserDep = Annotated[UserPublic, Depends(get_current_user)]
