from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session as DbSession
from backend.app.core.database import get_db
from backend.app.core.deps import require_role
from backend.app.models.entities import (
    User,
    StaffAssignment,
    Grievance,
    DocumentRequest,
    GrievanceTimelineAction,
)
from backend.app.schemas.all_schemas import WorkflowActionRequest
from backend.app.services.routing import resolve_authority_chain

router = APIRouter(prefix="/coordinator/grievances", tags=["Coordinator Grievances"])

def verify_coordinator_assignment(db: DbSession, user_id: str, course_id: str, semester: Optional[int]) -> bool:
    assignments = (
        db.query(StaffAssignment)
        .filter(
            StaffAssignment.userId == user_id,
            StaffAssignment.role == "COURSE_COORDINATOR",
            StaffAssignment.courseId == course_id,
            StaffAssignment.isActive == True,
        )
        .all()
    )
    if not assignments:
        return False
    if semester is None:
        return True
    for a in assignments:
        if not a.semesters or len(a.semesters) == 0 or semester in a.semesters:
            return True
    return False

@router.get("")
def list_coordinator_grievances(
    current_user: User = Depends(require_role(["COURSE_COORDINATOR"])),
    db: DbSession = Depends(get_db),
):
    # Fetch active assignments for this coordinator
    assignments = (
        db.query(StaffAssignment)
        .filter(
            StaffAssignment.userId == current_user.id,
            StaffAssignment.role == "COURSE_COORDINATOR",
            StaffAssignment.isActive == True,
        )
        .all()
    )
    course_ids = [a.courseId for a in assignments if a.courseId]

    grievances = (
        db.query(Grievance)
        .filter(
            Grievance.courseId.in_(course_ids),
            Grievance.currentTier == "TIER_1_COORDINATOR",
        )
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
def get_coordinator_grievance_detail(
    id: str,
    current_user: User = Depends(require_role(["COURSE_COORDINATOR"])),
    db: DbSession = Depends(get_db),
):
    grievance = db.query(Grievance).filter(Grievance.id == id).first()
    if not grievance:
        raise HTTPException(status_code=404, detail="Grievance not found.")

    if not verify_coordinator_assignment(db, current_user.id, grievance.courseId, grievance.semester):
        raise HTTPException(status_code=403, detail="Access denied. You are not assigned to this course/semester.")

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
def handle_coordinator_action(
    id: str,
    payload: WorkflowActionRequest,
    request: Request,
    current_user: User = Depends(require_role(["COURSE_COORDINATOR"])),
    db: DbSession = Depends(get_db),
):
    grievance = db.query(Grievance).filter(Grievance.id == id).first()
    if not grievance:
        raise HTTPException(status_code=404, detail="Grievance not found.")

    if not verify_coordinator_assignment(db, current_user.id, grievance.courseId, grievance.semester):
        raise HTTPException(status_code=403, detail="Access denied. You are not assigned to this course/semester.")

    if grievance.currentTier != "TIER_1_COORDINATOR":
        raise HTTPException(status_code=400, detail=f"Grievance is currently at {grievance.currentTier}, not Tier 1.")

    client_ip = request.headers.get("x-forwarded-for") or request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    action = payload.action

    if action == "MARK_UNDER_REVIEW":
        old_status = grievance.currentStatus
        grievance.currentStatus = "UNDER_REVIEW"
        timeline = GrievanceTimelineAction(
            grievanceId=grievance.id,
            actorId=current_user.id,
            actorRole="COURSE_COORDINATOR",
            actionType="UNDER_REVIEW_MARKED",
            fromTier=grievance.currentTier,
            toTier=grievance.currentTier,
            fromStatus=old_status,
            toStatus="UNDER_REVIEW",
            remarks=payload.remarks or "Coordinator commenced review.",
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
            actorRole="COURSE_COORDINATOR",
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
            requestedTier="TIER_1_COORDINATOR",
            instructions=payload.instructions,
            deadline=payload.deadline,
        )
        db.add(doc_req)
        old_status = grievance.currentStatus
        grievance.currentStatus = "AWAITING_STUDENT_INFO"
        timeline = GrievanceTimelineAction(
            grievanceId=grievance.id,
            actorId=current_user.id,
            actorRole="COURSE_COORDINATOR",
            actionType="DOCUMENTS_REQUESTED",
            fromTier=grievance.currentTier,
            toTier=grievance.currentTier,
            fromStatus=old_status,
            toStatus="AWAITING_STUDENT_INFO",
            remarks=f"Additional documentation requested: {payload.instructions}",
            visibility="PUBLIC_TO_STUDENT",
            ipAddress=client_ip,
            userAgent=user_agent,
        )
        db.add(timeline)

    elif action == "FORWARD_TO_HOD":
        chain = resolve_authority_chain(db, course_id=grievance.courseId, semester=grievance.semester)
        if not chain.get("departmentHead"):
            raise HTTPException(status_code=422, detail="No active Head of Department configured for escalation.")

        hod_user = chain["departmentHead"]
        old_status = grievance.currentStatus
        grievance.currentTier = "TIER_2_HOD"
        grievance.currentStatus = "FORWARDED"
        grievance.assignedToUserId = hod_user.id

        timeline = GrievanceTimelineAction(
            grievanceId=grievance.id,
            actorId=current_user.id,
            actorRole="COURSE_COORDINATOR",
            actionType="FORWARDED",
            fromTier="TIER_1_COORDINATOR",
            toTier="TIER_2_HOD",
            fromStatus=old_status,
            toStatus="FORWARDED",
            remarks=f"Forwarded to Department Head ({hod_user.fullName}). Remarks: {payload.remarks or 'Escalated'}",
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
            actorRole="COURSE_COORDINATOR",
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

    db.commit()
    db.refresh(grievance)
    return {"success": True, "message": f"Action {action} processed successfully.", "currentStatus": grievance.currentStatus}
