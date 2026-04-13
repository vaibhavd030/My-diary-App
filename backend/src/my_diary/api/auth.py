"""Auth endpoints — register, login, /me."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from my_diary.api.deps import CurrentUserDep, SessionDep
from my_diary.core.security import create_access_token
from my_diary.schemas.api import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserPublic,
)
from my_diary.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, session: SessionDep) -> UserPublic:
    """Register a new user account."""
    try:
        return await auth_service.register_user(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, session: SessionDep) -> TokenResponse:
    """Exchange email + password for a JWT access token."""
    user = await auth_service.authenticate(
        session, email=payload.email, password=payload.password
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token(subject=user.id)
    return TokenResponse(access_token=token, user=user)


@router.get("/me", response_model=UserPublic)
async def me(current_user: CurrentUserDep) -> UserPublic:
    """Return the currently authenticated user's profile."""
    return current_user
