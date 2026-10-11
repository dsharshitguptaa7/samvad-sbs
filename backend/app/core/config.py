import os
from typing import List
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load project root .env
load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env")))

class Settings(BaseSettings):
    PROJECT_NAME: str = "SAMVAD Backend"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    
    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://neondb_owner:password@ep-billowing-wind-b39aytse.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require")
    
    # Session Configuration
    SESSION_COOKIE_NAME: str = "samvad_session"
    SESSION_DURATION_SECONDS: int = 8 * 60 * 60  # 8 hours
    SESSION_SECRET: str = os.getenv("SESSION_SECRET", "super-secret-session-key-must-be-at-least-32-chars-long")
    
    # Environment & CORS
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", os.getenv("NODE_ENV", "development"))
    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
    
    # Storage Configuration
    STORAGE_LOCAL_DIR: str = os.getenv("STORAGE_LOCAL_DIR", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".storage", "grievances")))
    MAX_FILE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5MB

    @property
    def sqlalchemy_database_url(self) -> str:
        # Translate postgresql:// to postgresql+psycopg:// for SQLAlchemy with psycopg 3
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        elif url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+psycopg://", 1)
        return url

    @property
    def cors_origins(self) -> List[str]:
        origins = [self.FRONTEND_ORIGIN]
        if "http://localhost:3000" not in origins:
            origins.append("http://localhost:3000")
        if "http://127.0.0.1:3000" not in origins:
            origins.append("http://127.0.0.1:3000")
        return origins

settings = Settings()
