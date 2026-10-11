from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session as DbSession
from backend.app.models.entities import (
    Course,
    Department,
    StaffAssignment,
    User,
    WorkflowConfiguration,
)

def assignment_matches_semester(semesters: List[int], academic_period: Optional[str], semester: int) -> bool:
    """Check if coordinator assignment applies to given semester."""
    if semesters and len(semesters) > 0:
        return semester in semesters
    if academic_period == "ODD":
        return semester % 2 == 1
    if academic_period == "EVEN":
        return semester % 2 == 0
    return True

def get_active_workflow_mode(db: DbSession) -> str:
    """Get currently active workflow mode from database (defaults to HOD_DIRECTOR)."""
    cfg = db.query(WorkflowConfiguration).filter(WorkflowConfiguration.key == "DEFAULT").first()
    if cfg:
        return cfg.mode
    return "HOD_DIRECTOR"

def resolve_authority_chain(
    db: DbSession,
    course_id: str,
    semester: Optional[int] = None,
    mode: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Resolve authority chain for a given course and semester according to active or specified workflow mode.
    Returns:
    {
        "course": course,
        "department": department,
        "coordinator": user or None,
        "departmentHead": user or None,
        "director": user or None,
        "isComplete": bool,
        "issues": list[str]
    }
    """
    if not mode:
        mode = get_active_workflow_mode(db)

    course = db.query(Course).filter(Course.id == course_id, Course.isActive == True).first()
    if not course:
        return {"isComplete": False, "issues": [f"Course '{course_id}' not found or inactive."]}

    dept = db.query(Department).filter(Department.id == course.departmentId, Department.isActive == True).first()
    if not dept:
        return {"isComplete": False, "issues": [f"Department for course '{course.name}' not found or inactive."]}

    issues = []

    # 1. Resolve HoD (Tier 2)
    hod_assignment = (
        db.query(StaffAssignment)
        .join(User, StaffAssignment.userId == User.id)
        .filter(
            StaffAssignment.departmentId == dept.id,
            StaffAssignment.role == "DEPARTMENT_HEAD",
            StaffAssignment.courseId == None,
            StaffAssignment.isActive == True,
            User.isActive == True,
        )
        .first()
    )
    hod_user = hod_assignment.user if hod_assignment else None
    if not hod_user:
        issues.append(f"No active Department Head assigned for '{dept.name}'.")

    # 2. Resolve Director (Tier 3)
    director_user = db.query(User).filter(User.role == "DIRECTOR", User.isActive == True).first()
    if not director_user:
        issues.append("No active School Director configured.")

    # 3. Resolve Coordinator (Tier 1) if mode is COORDINATOR_HOD_DIRECTOR
    coordinator_user = None
    if mode == "COORDINATOR_HOD_DIRECTOR":
        if semester is None:
            issues.append(f"Semester is required to resolve Course Coordinator for '{course.name}'.")
        else:
            coord_assignments = (
                db.query(StaffAssignment)
                .join(User, StaffAssignment.userId == User.id)
                .filter(
                    StaffAssignment.courseId == course.id,
                    StaffAssignment.role == "COURSE_COORDINATOR",
                    StaffAssignment.isActive == True,
                    User.isActive == True,
                )
                .all()
            )
            matched = None
            for ca in coord_assignments:
                if assignment_matches_semester(ca.semesters, ca.academicPeriod, semester):
                    matched = ca.user
                    break
            coordinator_user = matched
            if not coordinator_user:
                issues.append(f"No active Course Coordinator assigned for '{course.name}' semester {semester}.")

    is_complete = len(issues) == 0

    return {
        "course": course,
        "department": dept,
        "coordinator": coordinator_user,
        "departmentHead": hod_user,
        "director": director_user,
        "isComplete": is_complete,
        "issues": issues,
        "mode": mode,
    }
