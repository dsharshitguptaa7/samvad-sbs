from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session as DbSession
from backend.app.core.database import get_db
from backend.app.core.deps import get_current_user
from backend.app.models.entities import User, GrievanceDocument
from backend.app.services.storage import storage_service

router = APIRouter(prefix="/documents", tags=["Evidence Documents"])

@router.get("/{id}")
@router.get("/{id}/download")
async def get_document(
    id: str,
    current_user: User = Depends(get_current_user),
    db: DbSession = Depends(get_db),
):
    """
    Secure evidentiary document download.
    Rules:
    - SYSTEM_ADMIN: Strictly forbidden (separation of powers).
    - STUDENT: Allowed only if current_user.id == grievance.studentId.
    - STAFF (COORDINATOR, HOD, DIRECTOR): Allowed if user is active.
    """
    if current_user.role == "SYSTEM_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Administrators cannot inspect grievance evidence files.",
        )

    doc = db.query(GrievanceDocument).filter(GrievanceDocument.id == id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    # Tenancy check
    if current_user.role == "STUDENT":
        if doc.grievance.studentId != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You do not own this document.",
            )
    else:
        # Staff verification
        if not current_user.isActive:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive.",
            )

    file_result = await storage_service.get_file_content(doc.storageKey)
    if not file_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File content not found in storage repository.",
        )

    content, mime_type = file_result
    headers = {
        "Content-Type": doc.mimeType or mime_type,
        "Content-Length": str(doc.fileSize),
        "Content-Disposition": f'inline; filename="{doc.fileName}"',
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
    }
    return Response(content=content, media_type=mime_type, headers=headers)
