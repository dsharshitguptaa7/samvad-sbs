import secrets
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session as DbSession
from backend.app.core.database import get_db
from backend.app.core.deps import require_role
from backend.app.core.security import hash_password, revoke_all_user_sessions
from backend.app.models.entities import (
    User,
    Department,
    Course,
    StaffAssignment,
    SystemAuditLog,
    WorkflowConfiguration,
    WorkflowAuditLog,
)
from backend.app.schemas.all_schemas import (
    ProvisionStaffRequest,
    UpdateStaffProfileRequest,
    CreateDepartmentRequest,
    UpdateDepartmentRequest,
    CreateCourseRequest,
    UpdateCourseRequest,
    CreateAssignmentRequest,
    UpdateWorkflowConfigRequest,
)
from backend.app.services.routing import resolve_authority_chain

router = APIRouter(prefix="/admin", tags=["System Administration"])

# ---------------------------------------------------------------------------
# 1. STAFF MANAGEMENT
# ---------------------------------------------------------------------------
@router.get("/staff")
def list_staff(
    current_user: User = Depends(require_role(["SYSTEM_ADMIN"])),
    db: DbSession = Depends(get_db),
):
    staff_users = (
        db.query(User)
        .filter(User.role != "STUDENT")
        .order_by(User.createdAt.desc())
        .all()
    )
    result = []
    for u in staff_users:
        active_assignments = [
            {
                "id": a.id,
                "role": a.role,
                "departmentName": a.department.name if a.department else None,
                "courseName": a.course.name if a.course else None,
                "semesters": a.semesters,
                "isActive": a.isActive,
            }
            for a in u.staffAssignments
            if a.isActive
        ]
        result.append({
            "id": u.id,
            "email": u.email,
            "fullName": u.fullName,
            "role": u.role,
            "phoneNumber": u.phoneNumber,
            "isActive": u.isActive,
            "mustResetPassword": u.mustResetPassword,
            "createdAt": u.createdAt,
            "activeAssignments": active_assignments,
        })
    return result

@router.post("/staff")
def provision_staff(
    payload: ProvisionStaffRequest,
    request: Request,
    current_user: User = Depends(require_role(["SYSTEM_ADMIN"])),
    db: DbSession = Depends(get_db),
):
    if db.query(User).filter(User.email == payload.email.lower()).first():
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    temp_password = f"SBS@{secrets.token_hex(4)}!"
    staff_user = User(
        email=payload.email.lower().strip(),
        passwordHash=hash_password(temp_password),
        fullName=payload.fullName.strip(),
        role=payload.role,
        phoneNumber=payload.phoneNumber.strip() if payload.phoneNumber else None,
        isActive=True,
        mustResetPassword=True,
    )
    db.add(staff_user)
    db.flush()

    if payload.departmentId and payload.role in ["COURSE_COORDINATOR", "DEPARTMENT_HEAD"]:
        assignment = StaffAssignment(
            userId=staff_user.id,
            role=payload.role,
            departmentId=payload.departmentId,
            courseId=payload.courseId if payload.role == "COURSE_COORDINATOR" else None,
            semesters=payload.semesters if payload.role == "COURSE_COORDINATOR" else [],
            isActive=True,
        )
        db.add(assignment)

    client_ip = request.headers.get("x-forwarded-for") or request.client.host if request.client else None
    audit = SystemAuditLog(
        adminUserId=current_user.id,
        action="STAFF_PROVISIONED",
        targetModel="User",
        targetId=staff_user.id,
        details={"email": staff_user.email, "role": staff_user.role, "fullName": staff_user.fullName},
        ipAddress=client_ip,
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Staff account provisioned for {staff_user.fullName}.",
        "temporaryPassword": temp_password,
        "userId": staff_user.id,
    }

@router.patch("/staff/{id}")
def update_staff_profile(
    id: str,
    payload: UpdateStaffProfileRequest,
    request: Request,
    current_user: User = Depends(require_role(["SYSTEM_ADMIN"])),
    db: DbSession = Depends(get_db),
):
    staff_user = db.query(User).filter(User.id == id).first()
    if not staff_user:
        raise HTTPException(status_code=404, detail="Staff user not found.")

    client_ip = request.headers.get("x-forwarded-for") or request.client.host if request.client else None

    if payload.fullName is not None:
        staff_user.fullName = payload.fullName.strip()
    if payload.phoneNumber is not None:
        staff_user.phoneNumber = payload.phoneNumber.strip()
    if payload.isActive is not None:
        staff_user.isActive = payload.isActive
        if not payload.isActive:
            revoke_all_user_sessions(db, staff_user.id)

    audit = SystemAuditLog(
        adminUserId=current_user.id,
        action="STAFF_UPDATED",
        targetModel="User",
        targetId=staff_user.id,
        details={"isActive": staff_user.isActive, "fullName": staff_user.fullName},
        ipAddress=client_ip,
    )
    db.add(audit)
    db.commit()
    return {"success": True, "message": "Staff member updated."}

# ---------------------------------------------------------------------------
# 2. DEPARTMENTS & COURSES MANAGEMENT
# ---------------------------------------------------------------------------
@router.get("/departments")
def list_admin_departments(
    current_user: User = Depends(require_role(["SYSTEM_ADMIN"])),
    db: DbSession = Depends(get_db),
):
    departments = db.query(Department).order_by(Department.name.asc()).all()
    result = []
    for d in departments:
        result.append({
            "id": d.id,
            "name": d.name,
            "code": d.code,
            "description": d.description,
            "isActive": d.isActive,
            "courseCount": len(d.courses),
            "createdAt": d.createdAt,
        })
    return result

@router.post("/departments")
def create_department(
    payload: CreateDepartmentRequest,
    request: Request,
    current_user: User = Depends(require_role(["SYSTEM_ADMIN"])),
    db: DbSession = Depends(get_db),
):
    if db.query(Department).filter(Department.name == payload.name.strip()).first():
        raise HTTPException(status_code=400, detail="Department with this name already exists.")
    if db.query(Department).filter(Department.code == payload.code.strip().upper()).first():
        raise HTTPException(status_code=400, detail="Department with this code already exists.")

    dept = Department(
        name=payload.name.strip(),
        code=payload.code.strip().upper(),
        description=payload.description.strip() if payload.description else None,
        isActive=True,
    )
    db.add(dept)
    db.flush()

    client_ip = request.headers.get("x-forwarded-for") or request.client.host if request.client else None
    audit = SystemAuditLog(
        adminUserId=current_user.id,
        action="DEPARTMENT_CREATED",
        targetModel="Department",
        targetId=dept.id,
        details={"name": dept.name, "code": dept.code},
        ipAddress=client_ip,
    )
    db.add(audit)
    db.commit()
    return {"success": True, "department": {"id": dept.id, "name": dept.name, "code": dept.code}}

@router.patch("/departments/{id}")
def update_department(
    id: str,
    payload: UpdateDepartmentRequest,
    request: Request,
    current_user: User = Depends(require_role(["SYSTEM_ADMIN"])),
    db: DbSession = Depends(get_db),
):
    dept = db.query(Department).filter(Department.id == id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    if payload.name:
        dept.name = payload.name.strip()
    if payload.code:
        dept.code = payload.code.strip().upper()
    if payload.description is not None:
        dept.description = payload.description.strip()
    if payload.isActive is not None:
        dept.isActive = payload.isActive

    client_ip = request.headers.get("x-forwarded-for") or request.client.host if request.client else None
    audit = SystemAuditLog(
        adminUserId=current_user.id,
        action="DEPARTMENT_UPDATED",
        targetModel="Department",
        targetId=dept.id,
        details={"isActive": dept.isActive, "name": dept.name},
        ipAddress=client_ip,
    )
    db.add(audit)
    db.commit()
    return {"success": True, "message": "Department updated."}

@router.get("/courses")
def list_admin_courses(
    current_user: User = Depends(require_role(["SYSTEM_ADMIN"])),
    db: DbSession = Depends(get_db),
):
    courses = db.query(Course).order_by(Course.name.asc()).all()
    result = []
    for c in courses:
        coordinators = [
            {"id": a.id, "fullName": a.user.fullName, "semesters": a.semesters, "isActive": a.isActive}
            for a in c.staffAssignments
            if a.isActive and a.role == "COURSE_COORDINATOR"
        ]
        result.append({
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "programType": c.programType,
            "totalSemesters": c.totalSemesters,
            "academicPeriod": c.academicPeriod,
            "isActive": c.isActive,
            "department": {"id": c.department.id, "name": c.department.name, "code": c.department.code} if c.department else None,
            "activeCoordinators": coordinators,
        })
    return result

@router.post("/courses")
def create_course(
    payload: CreateCourseRequest,
    request: Request,
    current_user: User = Depends(require_role(["SYSTEM_ADMIN"])),
    db: DbSession = Depends(get_db),
):
    dept = db.query(Department).filter(Department.id == payload.departmentId).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    course = Course(
        departmentId=payload.departmentId,
        name=payload.name.strip(),
        code=payload.code.strip().upper(),
        programType=payload.programType,
        totalSemesters=payload.totalSemesters,
        academicPeriod=payload.academicPeriod,
        isActive=True,
    )
    db.add(course)
    db.flush()

    client_ip = request.headers.get("x-forwarded-for") or request.client.host if request.client else None
    audit = SystemAuditLog(
        adminUserId=current_user.id,
        action="COURSE_CREATED",
        targetModel="Course",
        targetId=course.id,
        details={"name": course.name, "code": course.code, "department": dept.name},
        ipAddress=client_ip,
    )
    db.add(audit)
    db.commit()
    return {"success": True, "course": {"id": course.id, "name": course.name, "code": course.code}}

@router.patch("/courses/{id}")
def update_course(
    id: str,
    payload: UpdateCourseRequest,
    request: Request,
    current_user: User = Depends(require_role(["SYSTEM_ADMIN"])),
    db: DbSession = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    if payload.name:
        course.name = payload.name.strip()
    if payload.code:
        course.code = payload.code.strip().upper()
    if payload.programType is not None:
        course.programType = payload.programType
    if payload.totalSemesters is not None:
        course.totalSemesters = payload.totalSemesters
    if payload.academicPeriod is not None:
        course.academicPeriod = payload.academicPeriod
    if payload.isActive is not None:
        course.isActive = payload.isActive

    client_ip = request.headers.get("x-forwarded-for") or request.client.host if request.client else None
    audit = SystemAuditLog(
        adminUserId=current_user.id,
        action="COURSE_UPDATED",
        targetModel="Course",
        targetId=course.id,
        details={"isActive": course.isActive, "name": course.name},
        ipAddress=client_ip,
    )
    db.add(audit)
    db.commit()
    return {"success": True, "message": "Course updated."}

# ---------------------------------------------------------------------------
# 3. ASSIGNMENTS MANAGEMENT
# ---------------------------------------------------------------------------
@router.get("/assignments")
def list_admin_assignments(
    current_user: User = Depends(require_role(["SYSTEM_ADMIN"])),
    db: DbSession = Depends(get_db),
):
    assignments = (
        db.query(StaffAssignment)
        .order_by(StaffAssignment.assignedAt.desc())
        .all()
    )
    result = []
    for a in assignments:
        result.append({
            "id": a.id,
            "role": a.role,
            "semesters": a.semesters,
            "academicPeriod": a.academicPeriod,
            "isActive": a.isActive,
            "assignedAt": a.assignedAt,
            "unassignedAt": a.unassignedAt,
            "user": {"id": a.user.id, "fullName": a.user.fullName, "email": a.user.email} if a.user else None,
            "department": {"id": a.department.id, "name": a.department.name} if a.department else None,
            "course": {"id": a.course.id, "name": a.course.name} if a.course else None,
        })
    return result

@router.post("/assignments")
def create_assignment(
    payload: CreateAssignmentRequest,
    request: Request,
    current_user: User = Depends(require_role(["SYSTEM_ADMIN"])),
    db: DbSession = Depends(get_db),
):
    user = db.query(User).filter(User.id == payload.userId).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    dept = db.query(Department).filter(Department.id == payload.departmentId).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    # If assigning HoD, deactivate previous active HoD for that department
    if payload.role == "DEPARTMENT_HEAD":
        previous_hod = (
            db.query(StaffAssignment)
            .filter(
                StaffAssignment.departmentId == dept.id,
                StaffAssignment.role == "DEPARTMENT_HEAD",
                StaffAssignment.isActive == True,
            )
            .all()
        )
        for prev in previous_hod:
            prev.isActive = False
            prev.unassignedAt = datetime.utcnow()

    assignment = StaffAssignment(
        userId=payload.userId,
        departmentId=payload.departmentId,
        role=payload.role,
        courseId=payload.courseId if payload.role == "COURSE_COORDINATOR" else None,
        semesters=payload.semesters if payload.role == "COURSE_COORDINATOR" else [],
        academicPeriod=payload.academicPeriod,
        isActive=True,
    )
    db.add(assignment)
    db.flush()

    client_ip = request.headers.get("x-forwarded-for") or request.client.host if request.client else None
    audit = SystemAuditLog(
        adminUserId=current_user.id,
        action="STAFF_AUTHORITY_ASSIGNED",
        targetModel="StaffAssignment",
        targetId=assignment.id,
        details={"user": user.fullName, "role": payload.role, "department": dept.name},
        ipAddress=client_ip,
    )
    db.add(audit)
    db.commit()
    return {"success": True, "message": "Authority assignment configured."}

@router.delete("/assignments/{id}")
def deactivate_assignment(
    id: str,
    request: Request,
    current_user: User = Depends(require_role(["SYSTEM_ADMIN"])),
    db: DbSession = Depends(get_db),
):
    assignment = db.query(StaffAssignment).filter(StaffAssignment.id == id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    assignment.isActive = False
    assignment.unassignedAt = datetime.utcnow()

    client_ip = request.headers.get("x-forwarded-for") or request.client.host if request.client else None
    audit = SystemAuditLog(
        adminUserId=current_user.id,
        action="STAFF_AUTHORITY_UNASSIGNED",
        targetModel="StaffAssignment",
        targetId=assignment.id,
        details={"role": assignment.role},
        ipAddress=client_ip,
    )
    db.add(audit)
    db.commit()
    return {"success": True, "message": "Authority assignment deactivated."}

# ---------------------------------------------------------------------------
# 4. ROUTING MATRIX REPORT
# ---------------------------------------------------------------------------
@router.get("/routing")
def get_routing_matrix(
    courseId: Optional[str] = None,
    current_user: User = Depends(require_role(["SYSTEM_ADMIN"])),
    db: DbSession = Depends(get_db),
):
    if courseId:
        res = resolve_authority_chain(db, course_id=courseId)
        return {"success": True, "resolution": res}

    # School-wide report
    courses = db.query(Course).filter(Course.isActive == True).all()
    matrix = []
    for c in courses:
        chain = resolve_authority_chain(db, course_id=c.id)
        matrix.append({
            "courseId": c.id,
            "courseName": c.name,
            "courseCode": c.code,
            "departmentName": c.department.name if c.department else None,
            "isComplete": chain["isComplete"],
            "issues": chain["issues"],
            "departmentHead": chain["departmentHead"].fullName if chain.get("departmentHead") else None,
            "director": chain["director"].fullName if chain.get("director") else None,
        })
    return {"success": True, "courses": matrix}

# ---------------------------------------------------------------------------
# 5. WORKFLOW CONFIGURATION & AUDIT
# ---------------------------------------------------------------------------
def validate_workflow_readiness(db: DbSession, target_mode: str) -> dict:
    issues = []
    warnings = []

    depts = db.query(Department).filter(Department.isActive == True).all()
    courses = db.query(Course).filter(Course.isActive == True).all()

    # Check HoD for departments with active courses
    for d in depts:
        has_active_courses = any(c.departmentId == d.id for c in courses)
        hod = (
            db.query(StaffAssignment)
            .join(User, StaffAssignment.userId == User.id)
            .filter(
                StaffAssignment.departmentId == d.id,
                StaffAssignment.role == "DEPARTMENT_HEAD",
                StaffAssignment.isActive == True,
                User.isActive == True,
            )
            .first()
        )
        if not hod:
            msg = f"Department '{d.name}' ({d.code}) has no active Head of Department assigned."
            if has_active_courses:
                issues.append(msg)
            else:
                warnings.append(f"{msg} (No active courses).")

    # Check Director
    director = db.query(User).filter(User.role == "DIRECTOR", User.isActive == True).first()
    if not director:
        issues.append("No active School Director configured for School of Basic Sciences.")

    # Check Coordinators if COORDINATOR_HOD_DIRECTOR
    coord_assignments = (
        db.query(StaffAssignment)
        .join(User, StaffAssignment.userId == User.id)
        .filter(
            StaffAssignment.role == "COURSE_COORDINATOR",
            StaffAssignment.isActive == True,
            User.isActive == True,
        )
        .all()
    )

    missing_coordinators_count = 0
    for c in courses:
        total_sems = c.totalSemesters or 6
        c_assignments = [a for a in coord_assignments if a.courseId == c.id]
        for sem in range(1, total_sems + 1):
            has_match = any(
                (not a.semesters or sem in a.semesters)
                for a in c_assignments
            )
            if not has_match:
                missing_coordinators_count += 1
                msg = f"Course '{c.name}' ({c.code}) is missing an active Coordinator for semester {sem}."
                if target_mode == "COORDINATOR_HOD_DIRECTOR":
                    issues.append(msg)
                else:
                    warnings.append(msg)

    is_ready = len(issues) == 0
    return {
        "mode": target_mode,
        "isReady": is_ready,
        "issues": issues,
        "warnings": warnings,
        "summary": {
            "totalCourses": len(courses),
            "totalDepartments": len(depts),
            "missingCoordinatorsCount": missing_coordinators_count,
            "hasActiveDirector": director is not None,
        },
    }

@router.get("/workflow")
def get_workflow_config(
    current_user: User = Depends(require_role(["SYSTEM_ADMIN"])),
    db: DbSession = Depends(get_db),
):
    cfg = db.query(WorkflowConfiguration).filter(WorkflowConfiguration.key == "DEFAULT").first()
    if not cfg:
        cfg = WorkflowConfiguration(key="DEFAULT", mode="HOD_DIRECTOR", version=1)
        db.add(cfg)
        db.commit()
        db.refresh(cfg)

    hod_readiness = validate_workflow_readiness(db, "HOD_DIRECTOR")
    coordinator_readiness = validate_workflow_readiness(db, "COORDINATOR_HOD_DIRECTOR")

    audit_logs = (
        db.query(WorkflowAuditLog)
        .order_by(WorkflowAuditLog.createdAt.desc())
        .limit(30)
        .all()
    )

    return {
        "activeConfig": {
            "id": cfg.id,
            "key": cfg.key,
            "mode": cfg.mode,
            "version": cfg.version,
            "updatedBy": cfg.updatedBy.fullName if cfg.updatedBy else None,
            "changeReason": cfg.changeReason,
            "updatedAt": cfg.updatedAt,
        },
        "readiness": {
            "HOD_DIRECTOR": hod_readiness,
            "COORDINATOR_HOD_DIRECTOR": coordinator_readiness,
        },
        "auditLogs": [
            {
                "id": l.id,
                "previousMode": l.previousMode,
                "newMode": l.newMode,
                "reason": l.reason,
                "versionBefore": l.versionBefore,
                "versionAfter": l.versionAfter,
                "adminEmail": l.adminUser.email if l.adminUser else None,
                "adminFullName": l.adminUser.fullName if l.adminUser else None,
                "createdAt": l.createdAt,
            }
            for l in audit_logs
        ],
    }

@router.post("/workflow")
def update_workflow_config(
    payload: UpdateWorkflowConfigRequest,
    request: Request,
    current_user: User = Depends(require_role(["SYSTEM_ADMIN"])),
    db: DbSession = Depends(get_db),
):
    cfg = db.query(WorkflowConfiguration).filter(WorkflowConfiguration.key == "DEFAULT").first()
    if not cfg:
        cfg = WorkflowConfiguration(key="DEFAULT", mode="HOD_DIRECTOR", version=1)
        db.add(cfg)
        db.commit()
        db.refresh(cfg)

    # Optimistic concurrency check
    if payload.expectedVersion is not None and payload.expectedVersion != cfg.version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Conflict: Workflow configuration version mismatch. Expected version {payload.expectedVersion}, but current version is {cfg.version}. Please refresh.",
        )

    # Readiness check
    if not payload.skipReadinessCheck:
        readiness = validate_workflow_readiness(db, payload.mode)
        if not readiness["isReady"]:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Cannot activate '{payload.mode}': mandatory authority prerequisites are incomplete. Issues: {', '.join(readiness['issues'])}",
            )

    client_ip = request.headers.get("x-forwarded-for") or request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    old_mode = cfg.mode
    old_version = cfg.version
    new_version = old_version + 1

    cfg.mode = payload.mode
    cfg.version = new_version
    cfg.updatedByUserId = current_user.id
    cfg.changeReason = payload.reason
    cfg.updatedAt = datetime.utcnow()

    # Immutable audit log
    audit = WorkflowAuditLog(
        configId=cfg.id,
        adminUserId=current_user.id,
        previousMode=old_mode,
        newMode=payload.mode,
        reason=payload.reason,
        versionBefore=old_version,
        versionAfter=new_version,
        ipAddress=client_ip,
        userAgent=user_agent,
    )
    db.add(audit)
    db.commit()
    db.refresh(cfg)

    return {
        "success": True,
        "message": f"Active workflow mode successfully transitioned to {payload.mode}.",
        "configuration": {
            "id": cfg.id,
            "key": cfg.key,
            "mode": cfg.mode,
            "version": cfg.version,
            "updatedAt": cfg.updatedAt,
        },
    }
