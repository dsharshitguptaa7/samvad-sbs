from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.app.core.config import settings
from backend.app.services.storage import storage_service
from backend.app.routers import (
    auth,
    departments,
    track,
    student,
    documents,
    coordinator,
    department_head,
    director,
    admin,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify persistent storage directory existence and write permissions on startup
    storage_service.verify_storage_health()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware configured strictly for exact frontend origin with credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "SAMVAD FastAPI Backend",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }

# Register all routers under API prefix (/api)
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(departments.router, prefix=settings.API_V1_PREFIX)
app.include_router(track.router, prefix=settings.API_V1_PREFIX)
app.include_router(student.router, prefix=settings.API_V1_PREFIX)
app.include_router(documents.router, prefix=settings.API_V1_PREFIX)
app.include_router(coordinator.router, prefix=settings.API_V1_PREFIX)
app.include_router(department_head.router, prefix=settings.API_V1_PREFIX)
app.include_router(director.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin.router, prefix=settings.API_V1_PREFIX)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
