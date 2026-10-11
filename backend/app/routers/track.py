from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session as DbSession
from backend.app.core.database import get_db
from backend.app.models.entities import Grievance, GrievanceTimelineAction

router = APIRouter(prefix="/track", tags=["Public Grievance Tracking"])

@router.get("")
def track_grievance(
    trackingNumber: str = Query(..., min_length=5),
    db: DbSession = Depends(get_db),
):
    """Anonymous tracking by trackingNumber — shows public timeline and non-confidential info only."""
    clean_num = trackingNumber.strip()
    grievance = (
        db.query(Grievance)
        .filter(Grievance.trackingNumber == clean_num)
        .first()
    )

    if not grievance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No grievance found matching this tracking reference number.",
        )

    # Fetch public timeline actions only
    actions = (
        db.query(GrievanceTimelineAction)
        .filter(
            GrievanceTimelineAction.grievanceId == grievance.id,
            GrievanceTimelineAction.visibility == "PUBLIC_TO_STUDENT",
        )
        .order_by(GrievanceTimelineAction.createdAt.asc())
        .all()
    )

    return {
        "success": True,
        "grievance": {
            "trackingNumber": grievance.trackingNumber,
            "category": grievance.category,
            "subject": grievance.subject,
            "currentTier": grievance.currentTier,
            "currentStatus": grievance.currentStatus,
            "departmentName": grievance.department.name if grievance.department else None,
            "courseName": grievance.course.name if grievance.course else None,
            "semester": grievance.semester,
            "createdAt": grievance.createdAt,
            "resolvedAt": grievance.resolvedAt,
            "resolutionSummary": grievance.resolutionSummary,
            "timeline": [
                {
                    "actionType": a.actionType,
                    "remarks": a.remarks,
                    "createdAt": a.createdAt,
                }
                for a in actions
            ],
        },
    }
