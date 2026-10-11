from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# ---------------------------------------------------------------------------
# AUTH SCHEMAS
# ---------------------------------------------------------------------------
class RegisterStudentRequest(BaseModel):
    fullName: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    rollNumber: str = Field(..., min_length=3, max_length=50)
    enrollmentNo: str = Field(..., min_length=3, max_length=50)
    phoneNumber: Optional[str] = None

class LoginRequest(BaseModel):
    identifier: str = Field(..., min_length=2)  # email, rollNumber, or enrollmentNo
    password: str = Field(..., min_length=1)

class ResetPasswordRequest(BaseModel):
    currentPassword: Optional[str] = None
    newPassword: str = Field(..., min_length=8)
    token: Optional[str] = None

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    fullName: str
    role: str
    rollNumber: Optional[str] = None
    enrollmentNo: Optional[str] = None
    phoneNumber: Optional[str] = None
    isActive: bool
    mustResetPassword: bool
    createdAt: datetime

class AuthResponse(BaseModel):
    success: bool
    user: UserResponse
    message: Optional[str] = None

# ---------------------------------------------------------------------------
# DEPARTMENT & COURSE SCHEMAS
# ---------------------------------------------------------------------------
class CourseDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    code: str
    programType: Optional[str] = None
    totalSemesters: int
    academicPeriod: Optional[str] = None
    isActive: bool

class DepartmentDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    code: str
    description: Optional[str] = None
    isActive: bool
    courses: List[CourseDetail] = []

class CreateDepartmentRequest(BaseModel):
    name: str = Field(..., min_length=3)
    code: str = Field(..., min_length=2, max_length=20)
    description: Optional[str] = None

class UpdateDepartmentRequest(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    isActive: Optional[bool] = None

class CreateCourseRequest(BaseModel):
    departmentId: str
    name: str = Field(..., min_length=3)
    code: str = Field(..., min_length=2, max_length=20)
    programType: Optional[str] = None
    totalSemesters: int = 6
    academicPeriod: Optional[str] = "ALL"

class UpdateCourseRequest(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    programType: Optional[str] = None
    totalSemesters: Optional[int] = None
    academicPeriod: Optional[str] = None
    isActive: Optional[bool] = None

# ---------------------------------------------------------------------------
# STAFF & ASSIGNMENTS SCHEMAS
# ---------------------------------------------------------------------------
class ProvisionStaffRequest(BaseModel):
    fullName: str = Field(..., min_length=2)
    email: EmailStr
    role: str = Field(..., pattern="^(COURSE_COORDINATOR|DEPARTMENT_HEAD|DIRECTOR|SYSTEM_ADMIN)$")
    phoneNumber: Optional[str] = None
    departmentId: Optional[str] = None
    courseId: Optional[str] = None
    semesters: List[int] = []

class UpdateStaffProfileRequest(BaseModel):
    fullName: Optional[str] = None
    phoneNumber: Optional[str] = None
    isActive: Optional[bool] = None

class CreateAssignmentRequest(BaseModel):
    userId: str
    departmentId: str
    role: str = Field(..., pattern="^(COURSE_COORDINATOR|DEPARTMENT_HEAD)$")
    courseId: Optional[str] = None
    semesters: List[int] = []
    academicPeriod: Optional[str] = None

# ---------------------------------------------------------------------------
# GRIEVANCE & TIMELINE SCHEMAS
# ---------------------------------------------------------------------------
class CreateGrievanceRequest(BaseModel):
    courseId: str
    category: str
    subject: str = Field(..., min_length=5, max_length=150)
    description: str = Field(..., min_length=15)
    reliefSought: Optional[str] = Field(None, max_length=500)
    semester: Optional[int] = None

class GrievanceDocumentInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    fileName: str
    fileSize: int
    mimeType: str
    purpose: str
    createdAt: datetime

class DocumentRequestInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    instructions: str
    deadline: Optional[datetime] = None
    status: str
    fulfilledAt: Optional[datetime] = None
    createdAt: datetime

class TimelineActionInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    actorRole: str
    actionType: str
    fromTier: Optional[str] = None
    toTier: Optional[str] = None
    fromStatus: Optional[str] = None
    toStatus: Optional[str] = None
    remarks: Optional[str] = None
    visibility: str
    createdAt: datetime

class GrievanceDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    trackingNumber: str
    category: str
    subject: str
    description: str
    reliefSought: Optional[str] = None
    currentTier: str
    currentStatus: str
    workflowMode: str
    workflowVersion: int
    semester: Optional[int] = None
    resolvedAt: Optional[datetime] = None
    resolutionSummary: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime
    department: Optional[Any] = None
    course: Optional[Any] = None
    student: Optional[Any] = None
    assignedTo: Optional[Any] = None
    documents: List[GrievanceDocumentInfo] = []
    documentRequests: List[DocumentRequestInfo] = []
    timelineActions: List[TimelineActionInfo] = []

class WorkflowActionRequest(BaseModel):
    action: str = Field(..., pattern="^(MARK_UNDER_REVIEW|INTERNAL_REMARK|REQUEST_DOCUMENTS|FORWARD_TO_HOD|FORWARD_TO_DIRECTOR|RESOLVE|DISMISS)$")
    remarks: Optional[str] = None
    instructions: Optional[str] = None
    deadline: Optional[datetime] = None
    resolutionSummary: Optional[str] = None

# ---------------------------------------------------------------------------
# WORKFLOW CONFIGURATION SCHEMAS
# ---------------------------------------------------------------------------
class UpdateWorkflowConfigRequest(BaseModel):
    mode: str = Field(..., pattern="^(HOD_DIRECTOR|COORDINATOR_HOD_DIRECTOR)$")
    reason: str = Field(..., min_length=5, max_length=500)
    expectedVersion: Optional[int] = None
    skipReadinessCheck: Optional[bool] = False
