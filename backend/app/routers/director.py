from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session as DbSession
from backend.app.core.database import get_db
from backend.app.core.deps import require_role
from backend.app.models.entities import (
    User,
    Grievance,
    DocumentRequest,
    GrievanceTimelineAction,
)
from backend.app.schemas.all_schemas import WorkflowActionRequest

router = APIRouter(prefix="/director/grievances", tags=["Director Grievances"])

@router.get("")
def list_director_grievances(
    current_user: User = Depends(require_role(["DIRECTOR"])),
    db: DbSession = Depends(get_db),
):
    grievances = (
        db.query(Grievance)
        .filter(Grievance.currentTier == "TIER_3_DIRECTOR")
        .order_by(Grievance.createdAt.desc())
        .all()
    )

    result = []
    for g in grievances:
        result.append({
            "id": g.id,
            "trackingNumber": g.trackingNumber,
            "category": g.category,
            "subject": g.subject,
            "description": g.description,
            "currentTier": g.currentTier,
            "currentStatus": g.currentStatus,
            "semester": g.semester,
            "createdAt": g.createdAt,
            "student": {"fullName": g.student.fullName, "rollNumber": g.student.rollNumber, "email": g.student.email} if g.student else None,
            "course": {"name": g.course.name, "code": g.course.code} if g.course else None,
            "department": {"name": g.department.name} if g.department else None,
        })
    return result

@router.get("/{id}")
def get_director_grievance_detail(
    id: str,
    current_user: User = Depends(require_role(["DIRECTOR"])),
    db: DbSession = Depends(get_db),
):
    grievance = db.query(Grievance).filter(Grievance.id == id).first()
    if not grievance:
        raise HTTPException(status_code=404, detail="Grievance not found.")

    return {
        "id": grievance.id,
        "trackingNumber": grievance.trackingNumber,
        "category": grievance.category,
        "subject": grievance.subject,
        "description": grievance.description,
        "reliefSought": grievance.reliefSought,
        "currentTier": grievance.currentTier,
        "currentStatus": grievance.currentStatus,
        "semester": grievance.semester,
        "createdAt": grievance.createdAt,
        "resolvedAt": grievance.resolvedAt,
        "resolutionSummary": grievance.resolutionSummary,
        "student": {"fullName": grievance.student.fullName, "rollNumber": grievance.student.rollNumber, "email": grievance.student.email} if grievance.student else None,
        "course": {"name": grievance.course.name, "code": grievance.course.code} if grievance.course else None,
        "department": {"name": grievance.department.name} if grievance.department else None,
        "documents": [
            {"id": d.id, "fileName": d.fileName, "fileSize": d.fileSize, "mimeType": d.mimeType, "purpose": d.purpose, "createdAt": d.createdAt}
            for d in grievance.documents
        ],
        "documentRequests": [
            {"id": dr.id, "instructions": dr.instructions, "deadline": dr.deadline, "status": dr.status, "fulfilledAt": dr.fulfilledAt, "createdAt": dr.createdAt}
            for dr in grievance.documentRequests
        ],
        "timelineActions": [
            {"id": a.id, "actorRole": a.actorRole, "actionType": a.actionType, "fromStatus": a.fromStatus, "toStatus": a.toStatus, "remarks": a.remarks, "visibility": a.visibility, "createdAt": a.createdAt}
            for a in grievance.timelineActions
        ],
    }

@router.patch("/{id}")
def handle_director_action(
    id: str,
    payload: WorkflowActionRequest,
    request: Request,
    current_user: User = Depends(require_role(["DIRECTOR"])),
    db: DbSession = Depends(get_db),
):
    grievance = db.query(Grievance).filter(Grievance.id == id).first()
    if not grievance:
        raise HTTPException(status_code=404, detail="Grievance not found.")

    client_ip = request.headers.get("x-forwarded-for") or request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    action = payload.action

    if action == "MARK_UNDER_REVIEW":
        old_status = grievance.currentStatus
        grievance.currentStatus = "UNDER_REVIEW"
        timeline = GrievanceTimelineAction(
            grievanceId=grievance.id,
            actorId=current_user.id,
            actorRole="DIRECTOR",
            actionType="UNDER_REVIEW_MARKED",
            fromTier=grievance.currentTier,
            toTier=grievance.currentTier,
            fromStatus=old_status,
            toStatus="UNDER_REVIEW",
            remarks=payload.remarks or "Director initiated executive review.",
            visibility="PUBLIC_TO_STUDENT",
            ipAddress=client_ip,
            userAgent=user_agent,
        )
        db.add(timeline)

    elif action == "INTERNAL_REMARK":
        if not payload.remarks:
            raise HTTPException(status_code=400, detail="Remarks are required for internal note.")
        timeline = GrievanceTimelineAction(
            grievanceId=grievance.id,
            actorId=current_user.id,
            actorRole="DIRECTOR",
            actionType="INTERNAL_REMARK_ADDED",
            fromTier=grievance.currentTier,
            toTier=grievance.currentTier,
            fromStatus=grievance.currentStatus,
            toStatus=grievance.currentStatus,
            remarks=payload.remarks,
            visibility="INTERNAL_STAFF_ONLY",
            ipAddress=client_ip,
            userAgent=user_agent,
        )
        db.add(timeline)

    elif action == "REQUEST_DOCUMENTS":
        if not payload.instructions:
            raise HTTPException(status_code=400, detail="Document request instructions are required.")
        doc_req = DocumentRequest(
            grievanceId=grievance.id,
            requestedById=current_user.id,
            requestedTier="TIER_3_DIRECTOR",
            instructions=payload.instructions,
            deadline=payload.deadline,
        )
        db.add(doc_req)
        old_status = grievance.currentStatus
        grievance.currentStatus = "AWAITING_STUDENT_INFO"
        timeline = GrievanceTimelineAction(
            grievanceId=grievance.id,
            actorId=current_user.id,
            actorRole="DIRECTOR",
            actionType="DOCUMENTS_REQUESTED",
            fromTier=grievance.currentTier,
            toTier=grievance.currentTier,
            fromStatus=old_status,
            toStatus="AWAITING_STUDENT_INFO",
            remarks=f"Director requested documentation: {payload.instructions}",
            visibility="PUBLIC_TO_STUDENT",
            ipAddress=client_ip,
            userAgent=user_agent,
        )
        db.add(timeline)

    elif action == "RESOLVE":
        if not payload.resolutionSummary:
            raise HTTPException(status_code=400, detail="Resolution summary is required.")
        old_status = grievance.currentStatus
        grievance.currentStatus = "RESOLVED"
        grievance.resolvedAt = datetime.utcnow()
        grievance.resolutionSummary = payload.resolutionSummary

        timeline = GrievanceTimelineAction(
            grievanceId=grievance.id,
            actorId=current_user.id,
            actorRole="DIRECTOR",
            actionType="RESOLVED",
            fromTier=grievance.currentTier,
            toTier=grievance.currentTier,
            fromStatus=old_status,
            toStatus="RESOLVED",
            remarks=payload.resolutionSummary,
            visibility="PUBLIC_TO_STUDENT",
            ipAddress=client_ip,
            userAgent=user_agent,
        )
        db.add(timeline)

    elif action == "DISMISS":
        if not payload.resolutionSummary:
            raise HTTPException(status_code=400, detail="Dismissal justification reason is required.")
        old_status = grievance.currentStatus
        grievance.currentStatus = "DISMISSED"
        grievance.resolvedAt = datetime.utcnow()
        grievance.resolutionSummary = payload.resolutionSummary

        timeline = GrievanceTimelineAction(
            grievanceId=grievance.id,
            actorId=current_user.id,
            actorRole="DIRECTOR",
            actionType="DISMISSED",
            fromTier=grievance.currentTier,
            toTier=grievance.currentTier,
            fromStatus=old_status,
            toStatus="DISMISSED",
            remarks=f"Grievance dismissed: {payload.resolutionSummary}",
            visibility="PUBLIC_TO_STUDENT",
            ipAddress=client_ip,
            userAgent=user_agent,
        )
        db.add(timeline)

    db.commit()
    db.refresh(grievance)
    return {"success": True, "message": f"Action {action} processed successfully.", "currentStatus": grievance.currentStatus}
