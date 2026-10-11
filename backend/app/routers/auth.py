from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session as DbSession
from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.core.security import (
    hash_password,
    verify_password,
    create_user_session,
    revoke_session,
    revoke_all_user_sessions,
)
from backend.app.models.entities import User, Session
from backend.app.schemas.all_schemas import (
    RegisterStudentRequest,
    LoginRequest,
    ResetPasswordRequest,
    AuthResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=AuthResponse)
def register_student(
    payload: RegisterStudentRequest,
    response: Response,
    db: DbSession = Depends(get_db),
):
    # Check email duplicate
    if db.query(User).filter(User.email == payload.email.lower()).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    # Check rollNumber duplicate
    if db.query(User).filter(User.rollNumber == payload.rollNumber.strip()).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A student account with this Roll Number is already registered.",
        )

    # Check enrollmentNo duplicate
    if db.query(User).filter(User.enrollmentNo == payload.enrollmentNo.strip()).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A student account with this Enrollment Number is already registered.",
        )

    user = User(
        email=payload.email.lower().strip(),
        passwordHash=hash_password(payload.password),
        fullName=payload.fullName.strip(),
        role="STUDENT",
        rollNumber=payload.rollNumber.strip(),
        enrollmentNo=payload.enrollmentNo.strip(),
        phoneNumber=payload.phoneNumber.strip() if payload.phoneNumber else None,
        isActive=True,
        mustResetPassword=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create session cookie
    raw_token, expires_at = create_user_session(db, user.id)
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=raw_token,
        httponly=True,
        secure=(settings.ENVIRONMENT == "production"),
        samesite="lax",
        max_age=settings.SESSION_DURATION_SECONDS,
        expires=expires_at,
        path="/",
    )

    return AuthResponse(
        success=True,
        user=UserResponse.model_validate(user),
        message="Registration successful. Welcome to SAMVAD.",
    )

@router.post("/login", response_model=AuthResponse)
def login(
    payload: LoginRequest,
    response: Response,
    db: DbSession = Depends(get_db),
):
    ident = payload.identifier.strip()
    user = (
        db.query(User)
        .filter(
            (User.email == ident.lower())
            | (User.rollNumber == ident)
            | (User.enrollmentNo == ident)
        )
        .first()
    )

    if not user or not verify_password(payload.password, user.passwordHash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your email/roll number and password.",
        )

    if not user.isActive:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact the administrator.",
        )

    # Generate session
    raw_token, expires_at = create_user_session(db, user.id)
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=raw_token,
        httponly=True,
        secure=(settings.ENVIRONMENT == "production"),
        samesite="lax",
        max_age=settings.SESSION_DURATION_SECONDS,
        expires=expires_at,
        path="/",
    )

    return AuthResponse(
        success=True,
        user=UserResponse.model_validate(user),
        message="Login successful.",
    )

@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    db: DbSession = Depends(get_db),
):
    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if token:
        revoke_session(db, token)

    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/",
    )
    return {"success": True, "message": "Logged out successfully."}

@router.get("/me", response_model=AuthResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return AuthResponse(
        success=True,
        user=UserResponse.model_validate(current_user),
    )

@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    if current_user.mustResetPassword:
        # Initial staff password change
        current_user.passwordHash = hash_password(payload.newPassword)
        current_user.mustResetPassword = False
        db.commit()
        return {"success": True, "message": "Password updated successfully."}

    if payload.currentPassword:
        if not verify_password(payload.currentPassword, current_user.passwordHash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password does not match.",
            )
        current_user.passwordHash = hash_password(payload.newPassword)
        db.commit()
        return {"success": True, "message": "Password changed successfully."}

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Current password required for password change.",
    )
