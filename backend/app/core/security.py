import secrets
import hashlib
from datetime import datetime, timedelta, timezone
import bcrypt
from fastapi import HTTPException, status
from sqlalchemy.orm import Session as DbSession
from backend.app.core.config import settings
from backend.app.models.entities import User, Session

def hash_password(password: str) -> str:
    """Hash password using bcrypt with standard 12 rounds."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def generate_session_token() -> str:
    """Generate cryptographically secure 256-bit session token."""
    return secrets.token_hex(32)

def hash_session_token(token: str) -> str:
    """Hash token using SHA-256 for safe database persistence."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def create_user_session(db: DbSession, user_id: str) -> tuple[str, datetime]:
    """Create a new session in DB and return (raw_token, expires_at)."""
    raw_token = generate_session_token()
    hashed_token = hash_session_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.SESSION_DURATION_SECONDS)

    session_record = Session(
        userId=user_id,
        token=hashed_token,
        expiresAt=expires_at.replace(tzinfo=None),  # Neon PostgreSQL TIMESTAMP is without timezone
    )
    db.add(session_record)
    db.commit()
    db.refresh(session_record)
    return raw_token, expires_at

def validate_session(db: DbSession, raw_token: str) -> User | None:
    """Validate raw session token and return active user, or None if invalid/expired."""
    if not raw_token:
        return None

    hashed_token = hash_session_token(raw_token)
    session_record = (
        db.query(Session)
        .filter(Session.token == hashed_token)
        .first()
    )

    if not session_record:
        return None

    # Check expiration
    if session_record.expiresAt < datetime.utcnow():
        db.delete(session_record)
        db.commit()
        return None

    user = db.query(User).filter(User.id == session_record.userId).first()
    if not user or not user.isActive:
        db.delete(session_record)
        db.commit()
        return None

    return user

def revoke_session(db: DbSession, raw_token: str) -> None:
    """Revoke session record by raw token."""
    if not raw_token:
        return
    hashed_token = hash_session_token(raw_token)
    session_record = db.query(Session).filter(Session.token == hashed_token).first()
    if session_record:
        db.delete(session_record)
        db.commit()

def revoke_all_user_sessions(db: DbSession, user_id: str) -> None:
    """Revoke all active sessions for a user (used on deactivation/password reset)."""
    db.query(Session).filter(Session.userId == user_id).delete(synchronize_session=False)
    db.commit()
