from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DbSession
from backend.app.core.database import get_db
from backend.app.models.entities import Department, Course
from backend.app.schemas.all_schemas import DepartmentDetail, CourseDetail

router = APIRouter(prefix="/departments", tags=["Departments Public"])

@router.get("", response_model=List[DepartmentDetail])
def list_active_departments(db: DbSession = Depends(get_db)):
    """Public endpoint listing active departments and their active courses."""
    departments = (
        db.query(Department)
        .filter(Department.isActive == True)
        .order_by(Department.name.asc())
        .all()
    )

    result = []
    for dept in departments:
        active_courses = [
            CourseDetail.model_validate(c)
            for c in dept.courses
            if c.isActive
        ]
        result.append(
            DepartmentDetail(
                id=dept.id,
                name=dept.name,
                code=dept.code,
                description=dept.description,
                isActive=dept.isActive,
                courses=active_courses,
            )
        )

    return result
