import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    DateTime,
    ForeignKey,
    Text,
    ARRAY,
)
from sqlalchemy.dialects.postgresql import JSONB, ENUM
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

# Postgres Enum types created by Prisma
user_role_enum = ENUM(
    "STUDENT", "COURSE_COORDINATOR", "DEPARTMENT_HEAD", "DIRECTOR", "SYSTEM_ADMIN",
    name="UserRole", create_type=False
)

grievance_tier_enum = ENUM(
    "TIER_1_COORDINATOR", "TIER_2_HOD", "TIER_3_DIRECTOR",
    name="GrievanceTier", create_type=False
)

grievance_status_enum = ENUM(
    "SUBMITTED", "UNDER_REVIEW", "AWAITING_STUDENT_INFO", "FORWARDED", "RESOLVED", "DISMISSED",
    name="GrievanceStatus", create_type=False
)

grievance_category_enum = ENUM(
    "ACADEMIC", "EXAMINATION", "LABORATORY", "ADMINISTRATIVE", "FACULTY_MENTORSHIP", "OTHER",
    name="GrievanceCategory", create_type=False
)

workflow_mode_enum = ENUM(
    "HOD_DIRECTOR", "COORDINATOR_HOD_DIRECTOR",
    name="WorkflowMode", create_type=False
)

document_request_status_enum = ENUM(
    "PENDING", "FULFILLED", "CANCELLED",
    name="DocumentRequestStatus", create_type=False
)

timeline_action_type_enum = ENUM(
    "SUBMITTED", "ASSIGNED", "UNDER_REVIEW_MARKED", "DOCUMENTS_REQUESTED", "DOCUMENTS_SUBMITTED",
    "INTERNAL_REMARK_ADDED", "FORWARDED", "RESOLVED", "DISMISSED",
    name="TimelineActionType", create_type=False
)

timeline_visibility_enum = ENUM(
    "PUBLIC_TO_STUDENT", "INTERNAL_STAFF_ONLY",
    name="TimelineVisibility", create_type=False
)

document_purpose_enum = ENUM(
    "INITIAL_SUPPORT", "REQUESTED_SUPPLEMENT", "RESOLUTION_PROOF",
    name="DocumentPurpose", create_type=False
)

class User(Base):
    __tablename__ = "User"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    passwordHash = Column(String, nullable=False)
    fullName = Column(String, nullable=False)
    role = Column(user_role_enum, nullable=False, default="STUDENT", index=True)
    phoneNumber = Column(String, nullable=True)
    rollNumber = Column(String, unique=True, nullable=True, index=True)
    enrollmentNo = Column(String, unique=True, nullable=True)
    isActive = Column(Boolean, nullable=False, default=True)
    mustResetPassword = Column(Boolean, nullable=False, default=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    staffAssignments = relationship("StaffAssignment", back_populates="user")
    studentGrievances = relationship("Grievance", foreign_keys="[Grievance.studentId]", back_populates="student")
    assignedGrievances = relationship("Grievance", foreign_keys="[Grievance.assignedToUserId]", back_populates="assignedTo")
    uploadedDocuments = relationship("GrievanceDocument", back_populates="uploadedBy")
    requestedDocuments = relationship("DocumentRequest", back_populates="requestedBy")
    timelineActions = relationship("GrievanceTimelineAction", back_populates="actor")
    adminAuditLogs = relationship("SystemAuditLog", back_populates="adminUser")
    workflowAuditLogs = relationship("WorkflowAuditLog", back_populates="adminUser")


class Session(Base):
    __tablename__ = "Session"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    userId = Column(String, ForeignKey("User.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String, unique=True, nullable=False, index=True)
    expiresAt = Column(DateTime, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="sessions")


class PasswordResetToken(Base):
    __tablename__ = "PasswordResetToken"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    userId = Column(String, ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    tokenHash = Column(String, unique=True, nullable=False)
    expiresAt = Column(DateTime, nullable=False)
    usedAt = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)


class Department(Base):
    __tablename__ = "Department"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True, nullable=False)
    code = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)
    isActive = Column(Boolean, nullable=False, default=True, index=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    courses = relationship("Course", back_populates="department")
    staffAssignments = relationship("StaffAssignment", back_populates="department")
    grievances = relationship("Grievance", back_populates="department")


class Course(Base):
    __tablename__ = "Course"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    departmentId = Column(String, ForeignKey("Department.id", ondelete="RESTRICT"), nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    programType = Column(String, nullable=True)
    totalSemesters = Column(Integer, default=6, nullable=False)
    academicPeriod = Column(String, default="ALL", nullable=True)
    isActive = Column(Boolean, nullable=False, default=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    department = relationship("Department", back_populates="courses")
    staffAssignments = relationship("StaffAssignment", back_populates="course")
    grievances = relationship("Grievance", back_populates="course")


class StaffAssignment(Base):
    __tablename__ = "StaffAssignment"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    userId = Column(String, ForeignKey("User.id", ondelete="RESTRICT"), nullable=False)
    role = Column(user_role_enum, nullable=False)  # COURSE_COORDINATOR or DEPARTMENT_HEAD
    departmentId = Column(String, ForeignKey("Department.id", ondelete="RESTRICT"), nullable=False)
    courseId = Column(String, ForeignKey("Course.id", ondelete="RESTRICT"), nullable=True)
    semesters = Column(ARRAY(Integer), default=[], nullable=False)
    academicPeriod = Column(String, nullable=True)
    isActive = Column(Boolean, nullable=False, default=True)
    assignedAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    unassignedAt = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="staffAssignments")
    department = relationship("Department", back_populates="staffAssignments")
    course = relationship("Course", back_populates="staffAssignments")


class Grievance(Base):
    __tablename__ = "Grievance"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    trackingNumber = Column(String, unique=True, nullable=False, index=True)
    studentId = Column(String, ForeignKey("User.id", ondelete="RESTRICT"), nullable=False)
    departmentId = Column(String, ForeignKey("Department.id", ondelete="RESTRICT"), nullable=False)
    courseId = Column(String, ForeignKey("Course.id", ondelete="RESTRICT"), nullable=False)
    semester = Column(Integer, nullable=True)
    assignedToUserId = Column(String, ForeignKey("User.id", ondelete="SET NULL"), nullable=True)

    category = Column(grievance_category_enum, nullable=False)
    subject = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    reliefSought = Column(String(500), nullable=True)

    currentTier = Column(grievance_tier_enum, default="TIER_1_COORDINATOR", nullable=False)
    currentStatus = Column(grievance_status_enum, default="SUBMITTED", nullable=False)
    workflowMode = Column(workflow_mode_enum, default="HOD_DIRECTOR", nullable=False)
    workflowVersion = Column(Integer, default=1, nullable=False)

    resolvedAt = Column(DateTime, nullable=True)
    resolutionSummary = Column(Text, nullable=True)

    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    student = relationship("User", foreign_keys=[studentId], back_populates="studentGrievances")
    assignedTo = relationship("User", foreign_keys=[assignedToUserId], back_populates="assignedGrievances")
    department = relationship("Department", back_populates="grievances")
    course = relationship("Course", back_populates="grievances")
    documents = relationship("GrievanceDocument", back_populates="grievance")
    documentRequests = relationship("DocumentRequest", back_populates="grievance")
    timelineActions = relationship("GrievanceTimelineAction", back_populates="grievance")


class GrievanceDocument(Base):
    __tablename__ = "GrievanceDocument"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    grievanceId = Column(String, ForeignKey("Grievance.id", ondelete="RESTRICT"), nullable=False)
    uploadedById = Column(String, ForeignKey("User.id", ondelete="RESTRICT"), nullable=False)
    requestId = Column(String, ForeignKey("DocumentRequest.id", ondelete="SET NULL"), nullable=True)

    fileName = Column(String, nullable=False)
    storageKey = Column(String, unique=True, nullable=False)
    fileSize = Column(Integer, nullable=False)
    mimeType = Column(String, nullable=False)
    sha256Hash = Column(String, nullable=True)
    purpose = Column(document_purpose_enum, default="INITIAL_SUPPORT", nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)

    grievance = relationship("Grievance", back_populates="documents")
    uploadedBy = relationship("User", back_populates="uploadedDocuments")
    documentRequest = relationship("DocumentRequest", back_populates="documents")


class DocumentRequest(Base):
    __tablename__ = "DocumentRequest"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    grievanceId = Column(String, ForeignKey("Grievance.id", ondelete="RESTRICT"), nullable=False)
    requestedById = Column(String, ForeignKey("User.id", ondelete="RESTRICT"), nullable=False)
    requestedTier = Column(grievance_tier_enum, nullable=False)
    instructions = Column(Text, nullable=False)
    deadline = Column(DateTime, nullable=True)
    status = Column(document_request_status_enum, default="PENDING", nullable=False)
    fulfilledAt = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    grievance = relationship("Grievance", back_populates="documentRequests")
    requestedBy = relationship("User", back_populates="requestedDocuments")
    documents = relationship("GrievanceDocument", back_populates="documentRequest")


class GrievanceTimelineAction(Base):
    __tablename__ = "GrievanceTimelineAction"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    grievanceId = Column(String, ForeignKey("Grievance.id", ondelete="RESTRICT"), nullable=False)
    actorId = Column(String, ForeignKey("User.id", ondelete="RESTRICT"), nullable=False)
    actorRole = Column(user_role_enum, nullable=False)

    actionType = Column(timeline_action_type_enum, nullable=False)
    fromTier = Column(grievance_tier_enum, nullable=True)
    toTier = Column(grievance_tier_enum, nullable=True)
    fromStatus = Column(grievance_status_enum, nullable=True)
    toStatus = Column(grievance_status_enum, nullable=True)

    remarks = Column(Text, nullable=True)
    visibility = Column(timeline_visibility_enum, default="PUBLIC_TO_STUDENT", nullable=False)
    ipAddress = Column(String, nullable=True)
    userAgent = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)

    grievance = relationship("Grievance", back_populates="timelineActions")
    actor = relationship("User", back_populates="timelineActions")


class SystemAuditLog(Base):
    __tablename__ = "SystemAuditLog"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    adminUserId = Column(String, ForeignKey("User.id", ondelete="RESTRICT"), nullable=False)
    action = Column(String, nullable=False)
    targetModel = Column(String, nullable=False)
    targetId = Column(String, nullable=False)
    details = Column(JSONB, nullable=True)
    ipAddress = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)

    adminUser = relationship("User", back_populates="adminAuditLogs")


class WorkflowConfiguration(Base):
    __tablename__ = "WorkflowConfiguration"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String, unique=True, default="DEFAULT", nullable=False)
    mode = Column(workflow_mode_enum, default="HOD_DIRECTOR", nullable=False)
    version = Column(Integer, default=1, nullable=False)
    updatedByUserId = Column(String, ForeignKey("User.id", ondelete="SET NULL"), nullable=True)
    changeReason = Column(Text, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    updatedBy = relationship("User", foreign_keys=[updatedByUserId])
    auditLogs = relationship("WorkflowAuditLog", back_populates="config")


class WorkflowAuditLog(Base):
    __tablename__ = "WorkflowAuditLog"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    configId = Column(String, ForeignKey("WorkflowConfiguration.id", ondelete="CASCADE"), nullable=False)
    adminUserId = Column(String, ForeignKey("User.id", ondelete="RESTRICT"), nullable=False)
    previousMode = Column(workflow_mode_enum, nullable=False)
    newMode = Column(workflow_mode_enum, nullable=False)
    reason = Column(Text, nullable=False)
    versionBefore = Column(Integer, nullable=False)
    versionAfter = Column(Integer, nullable=False)
    ipAddress = Column(String, nullable=True)
    userAgent = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)

    config = relationship("WorkflowConfiguration", back_populates="auditLogs")
    adminUser = relationship("User", back_populates="workflowAuditLogs")
