from typing import List, Callable
from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.orm import Session as DbSession
from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.security import validate_session
from backend.app.models.entities import User

def get_current_user(
    request: Request,
    db: DbSession = Depends(get_db),
) -> User:
    """Dependency to retrieve currently authenticated active user from session cookie or header."""
    # 1. Check HTTP-only cookie
    token = request.cookies.get(settings.SESSION_COOKIE_NAME)

    # 2. Check Authorization Bearer header fallback
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
        )

    user = validate_session(db, token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please sign in again.",
        )

    if not user.isActive:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact the administrator.",
        )

    return user

def require_role(allowed_roles: List[str]) -> Callable[[User], User]:
    """Factory dependency to enforce role-based access control."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: required one of {allowed_roles}, current role is '{current_user.role}'.",
            )
        return current_user
    return role_checker
