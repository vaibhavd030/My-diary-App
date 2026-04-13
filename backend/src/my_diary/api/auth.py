from fastapi import APIRouter, HTTPException, status, Response, Depends
import secrets

from my_diary.api.deps import CurrentUserDep, SessionDep
from my_diary.core.security import create_access_token
from my_diary.schemas.api import (
    LoginRequest,
    PasswordChangeRequest,
    RegisterRequest,
    TokenResponse,
    UserPublic,
)
from my_diary.services import auth as auth_service
from my_diary.core.settings import get_settings
from my_diary.api.limiter import limiter
from fastapi import Request

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
async def register(request: Request, response: Response, payload: RegisterRequest, session: SessionDep) -> UserPublic:
    """Register a new user account."""
    try:
        user = await auth_service.register_user(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    
    # Set CSRF cookie on registration as well for immediate use if needed
    response.set_cookie(
        key="csrftoken",
        value=secrets.token_hex(32),
        httponly=False,
        secure=get_settings().environment == "production",
        samesite="lax",
        path="/",
    )
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, payload: LoginRequest, session: SessionDep, response: Response) -> TokenResponse:
    """Exchange email + password for a JWT access token and set httpOnly cookie."""
    user = await auth_service.authenticate(
        session, email=payload.email, password=payload.password
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    settings = get_settings()
    token = create_access_token(subject=user.id)
    
    # Set the secure, httpOnly session cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
        path="/",
        max_age=settings.access_token_expire_minutes * 60,
    )
    
    # Set the non-HttpOnly CSRF cookie (so JS can read it for Double-Submit)
    response.set_cookie(
        key="csrftoken",
        value=secrets.token_hex(32),
        httponly=False,
        secure=settings.environment == "production",
        samesite="lax",
        path="/",
        max_age=settings.access_token_expire_minutes * 60,
    )
    
    return TokenResponse(access_token=token, user=user)


@router.post("/logout")
async def logout(response: Response):
    """Clear session cookies."""
    settings = get_settings()
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        secure=settings.environment == "production",
        samesite="lax",
    )
    return {"detail": "Successfully logged out"}


@router.put("/password")
@limiter.limit("3/hour")
async def change_password(
    request: Request,
    payload: PasswordChangeRequest,
    session: SessionDep,
    current_user: CurrentUserDep,
):
    """Change the authenticated user's password."""
    import uuid
    success = await auth_service.update_password(
        session,
        user_id=uuid.UUID(current_user.id),
        current_password=payload.current_password,
        new_password=payload.new_password,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password",
        )
    return {"detail": "Password updated successfully"}


@router.get("/me", response_model=UserPublic)
async def me(response: Response, current_user: CurrentUserDep, request: Request) -> UserPublic:
    """Return the currently authenticated user's profile and ensure CSRF cookie exists."""
    if not request.cookies.get("csrftoken"):
        response.set_cookie(
            key="csrftoken",
            value=secrets.token_hex(32),
            httponly=False,
            secure=get_settings().environment == "production",
            samesite="lax",
            path="/",
        )
    return current_user
