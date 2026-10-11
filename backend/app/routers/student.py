import random
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, status
from sqlalchemy.orm import Session as DbSession
from backend.app.core.database import get_db
from backend.app.core.deps import require_role
from backend.app.models.entities import (
    User,
    Course,
    Department,
    Grievance,
    GrievanceDocument,
    DocumentRequest,
    GrievanceTimelineAction,
    WorkflowConfiguration,
)
from backend.app.services.routing import resolve_authority_chain
from backend.app.services.storage import storage_service
from backend.app.schemas.all_schemas import (
    GrievanceDetailResponse,
    CreateGrievanceRequest,
)

router = APIRouter(prefix="/student/grievances", tags=["Student Grievances"])

def generate_tracking_number(dept_code: str) -> str:
    year = datetime.utcnow().year
    rand_seq = random.randint(1000, 9999)
    return f"CSJMU-SBS-{year}-{dept_code.upper()}-{rand_seq}"

@router.get("", response_model=List[dict])
def list_student_grievances(
    current_user: User = Depends(require_role(["STUDENT"])),
    db: DbSession = Depends(get_db),
):
    grievances = (
        db.query(Grievance)
        .filter(Grievance.studentId == current_user.id)
        .order_by(Grievance.createdAt.desc())
        .all()
    )

    result = []
    for g in grievances:
        pending_requests = [
            dr for dr in g.documentRequests if dr.status == "PENDING"
        ]
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
            "resolvedAt": g.resolvedAt,
            "resolutionSummary": g.resolutionSummary,
            "department": {"name": g.department.name, "code": g.department.code} if g.department else None,
            "course": {"name": g.course.name, "code": g.course.code} if g.course else None,
            "hasPendingDocumentRequest": len(pending_requests) > 0,
            "documentsCount": len(g.documents),
        })

    return result

@router.post("")
async def submit_grievance(
    request: Request,
    courseId: str = Form(...),
    category: str = Form(...),
    subject: str = Form(...),
    description: str = Form(...),
    reliefSought: Optional[str] = Form(None),
    semester: Optional[int] = Form(None),
    declarationConfirmed: Optional[str] = Form(None),
    documents: List[UploadFile] = File([]),
    files: List[UploadFile] = File([]),
    current_user: User = Depends(require_role(["STUDENT"])),
    db: DbSession = Depends(get_db),
):
    # 1. Validate Course
    course = db.query(Course).filter(Course.id == courseId, Course.isActive == True).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The selected course was not found or is currently inactive.",
        )

    # 2. Get active workflow configuration
    cfg = db.query(WorkflowConfiguration).filter(WorkflowConfiguration.key == "DEFAULT").first()
    wf_mode = cfg.mode if cfg else "HOD_DIRECTOR"
    wf_version = cfg.version if cfg else 1

    # 3. Resolve Authority Chain
    chain = resolve_authority_chain(db, course_id=course.id, semester=semester, mode=wf_mode)
    if not chain["isComplete"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unable to route grievance: {', '.join(chain['issues'])}",
        )

    # 4. Determine Initial Tier and Assigned Authority
    if wf_mode == "HOD_DIRECTOR":
        initial_tier = "TIER_2_HOD"
        initial_status = "SUBMITTED"
        assigned_user_id = chain["departmentHead"].id
        tier_remark = f"Routed directly to Department Head ({chain['departmentHead'].fullName}) under active HoD-Direct policy."
    else:
        initial_tier = "TIER_1_COORDINATOR"
        initial_status = "SUBMITTED"
        assigned_user_id = chain["coordinator"].id
        tier_remark = f"Routed to Course Coordinator ({chain['coordinator'].fullName}) for Semester {semester} review."

    tracking_num = generate_tracking_number(course.department.code)

    grievance = Grievance(
        trackingNumber=tracking_num,
        studentId=current_user.id,
        departmentId=course.departmentId,
        courseId=course.id,
        semester=semester,
        assignedToUserId=assigned_user_id,
        category=category,
        subject=subject.strip(),
        description=description.strip(),
        reliefSought=reliefSought.strip() if reliefSought else None,
        currentTier=initial_tier,
        currentStatus=initial_status,
        workflowMode=wf_mode,
        workflowVersion=wf_version,
    )
    db.add(grievance)
    db.flush()

    # 5. Timeline submission action
    client_ip = request.headers.get("x-forwarded-for") or request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    timeline = GrievanceTimelineAction(
        grievanceId=grievance.id,
        actorId=current_user.id,
        actorRole="STUDENT",
        actionType="SUBMITTED",
        fromTier=None,
        toTier=initial_tier,
        fromStatus=None,
        toStatus=initial_status,
        remarks=f"Grievance submitted by student. {tier_remark}",
        visibility="PUBLIC_TO_STUDENT",
        ipAddress=client_ip,
        userAgent=user_agent,
    )
    db.add(timeline)

    # 6. Save attached documents
    uploaded_records = []
    saved_storage_keys = []
    upload_list = [f for f in (documents + files) if f and f.filename]
    try:
        for doc in upload_list:
            file_meta = await storage_service.save_file(doc)
            saved_storage_keys.append(file_meta["storageKey"])
            doc_record = GrievanceDocument(
                grievanceId=grievance.id,
                uploadedById=current_user.id,
                fileName=file_meta["fileName"],
                storageKey=file_meta["storageKey"],
                fileSize=file_meta["fileSize"],
                mimeType=file_meta["mimeType"],
                sha256Hash=file_meta["sha256Hash"],
                purpose="INITIAL_SUPPORT",
            )
            db.add(doc_record)
            uploaded_records.append(doc_record)
    except Exception as exc:
        for key in saved_storage_keys:
            await storage_service.delete_file(key)
        raise exc

    db.commit()
    db.refresh(grievance)

    return {
        "success": True,
        "message": "Grievance submitted successfully.",
        "trackingNumber": grievance.trackingNumber,
        "grievanceId": grievance.id,
        "grievance": {
            "id": grievance.id,
            "trackingNumber": grievance.trackingNumber,
            "currentTier": grievance.currentTier,
            "currentStatus": grievance.currentStatus,
            "workflowMode": grievance.workflowMode,
        },
    }

@router.get("/{id}")
def get_student_grievance_detail(
    id: str,
    current_user: User = Depends(require_role(["STUDENT"])),
    db: DbSession = Depends(get_db),
):
    grievance = (
        db.query(Grievance)
        .filter(Grievance.id == id, Grievance.studentId == current_user.id)
        .first()
    )

    if not grievance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grievance not found or unauthorized.",
        )

    # Filter timeline actions for student: PUBLIC_TO_STUDENT only
    public_actions = [
        a for a in grievance.timelineActions if a.visibility == "PUBLIC_TO_STUDENT"
    ]

    return {
        "id": grievance.id,
        "trackingNumber": grievance.trackingNumber,
        "category": grievance.category,
        "subject": grievance.subject,
        "description": grievance.description,
        "reliefSought": grievance.reliefSought,
        "currentTier": grievance.currentTier,
        "currentStatus": grievance.currentStatus,
        "workflowMode": grievance.workflowMode,
        "workflowVersion": grievance.workflowVersion,
        "semester": grievance.semester,
        "resolvedAt": grievance.resolvedAt,
        "resolutionSummary": grievance.resolutionSummary,
        "createdAt": grievance.createdAt,
        "updatedAt": grievance.updatedAt,
        "department": {"id": grievance.department.id, "name": grievance.department.name, "code": grievance.department.code} if grievance.department else None,
        "course": {"id": grievance.course.id, "name": grievance.course.name, "code": grievance.course.code} if grievance.course else None,
        "documents": [
            {
                "id": d.id,
                "fileName": d.fileName,
                "fileSize": d.fileSize,
                "mimeType": d.mimeType,
                "purpose": d.purpose,
                "createdAt": d.createdAt,
            }
            for d in grievance.documents
        ],
        "documentRequests": [
            {
                "id": dr.id,
                "instructions": dr.instructions,
                "deadline": dr.deadline,
                "status": dr.status,
                "fulfilledAt": dr.fulfilledAt,
                "createdAt": dr.createdAt,
            }
            for dr in grievance.documentRequests
        ],
        "timelineActions": [
            {
                "id": a.id,
                "actorRole": a.actorRole,
                "actionType": a.actionType,
                "fromTier": a.fromTier,
                "toTier": a.toTier,
                "fromStatus": a.fromStatus,
                "toStatus": a.toStatus,
                "remarks": a.remarks,
                "visibility": a.visibility,
                "createdAt": a.createdAt,
            }
            for a in public_actions
        ],
    }

@router.post("/{id}/documents")
async def fulfill_document_request(
    id: str,
    requestId: str = Form(...),
    document: UploadFile = File(...),
    current_user: User = Depends(require_role(["STUDENT"])),
    db: DbSession = Depends(get_db),
):
    grievance = db.query(Grievance).filter(Grievance.id == id, Grievance.studentId == current_user.id).first()
    if not grievance:
        raise HTTPException(status_code=404, detail="Grievance not found.")

    doc_req = db.query(DocumentRequest).filter(DocumentRequest.id == requestId, DocumentRequest.grievanceId == grievance.id).first()
    if not doc_req:
        raise HTTPException(status_code=404, detail="Document request not found.")

    if doc_req.status != "PENDING":
        raise HTTPException(status_code=400, detail="This document request is no longer pending.")

    file_meta = await storage_service.save_file(document)
    doc_record = GrievanceDocument(
        grievanceId=grievance.id,
        uploadedById=current_user.id,
        requestId=doc_req.id,
        fileName=file_meta["fileName"],
        storageKey=file_meta["storageKey"],
        fileSize=file_meta["fileSize"],
        mimeType=file_meta["mimeType"],
        sha256Hash=file_meta["sha256Hash"],
        purpose="REQUESTED_SUPPLEMENT",
    )
    db.add(doc_record)

    doc_req.status = "FULFILLED"
    doc_req.fulfilledAt = datetime.utcnow()

    # Revert grievance status back to UNDER_REVIEW
    old_status = grievance.currentStatus
    grievance.currentStatus = "UNDER_REVIEW"

    # Timeline action
    timeline = GrievanceTimelineAction(
        grievanceId=grievance.id,
        actorId=current_user.id,
        actorRole="STUDENT",
        actionType="DOCUMENTS_SUBMITTED",
        fromTier=grievance.currentTier,
        toTier=grievance.currentTier,
        fromStatus=old_status,
        toStatus="UNDER_REVIEW",
        remarks=f"Student submitted requested evidence: {file_meta['fileName']}",
        visibility="PUBLIC_TO_STUDENT",
    )
    db.add(timeline)
    db.commit()

    return {"success": True, "message": "Document submitted successfully."}
