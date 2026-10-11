import prisma from "@/lib/prisma";
import {
  Grievance,
  GrievanceTier,
  GrievanceStatus,
  GrievanceCategory,
  TimelineActionType,
  TimelineVisibility,
  DocumentPurpose,
  UserRole,
  WorkflowMode,
} from "@prisma/client";
import { resolveAuthorityChain } from "@/lib/routing/authority-chain";
import { getActiveWorkflowConfiguration } from "@/lib/workflow/configuration";
import { generateUniqueTrackingNumber } from "./tracking";
import { StoredFileMetadata } from "@/lib/storage/provider";

export interface CreateGrievanceInput {
  studentId: string;
  courseId: string;
  semester?: number | null;
  category: GrievanceCategory;
  subject: string;
  description: string;
  reliefSought?: string | null;
  uploadedFiles?: StoredFileMetadata[];
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface CreateGrievanceResult {
  success: boolean;
  grievance?: Grievance & {
    department: { name: string; code: string };
    course: { name: string; code: string };
    assignedTo: { fullName: string; email: string } | null;
  };
  trackingNumber?: string;
  trackingToken?: string;
  error?: string;
  errorCode?: "UNRESOLVED_ROUTING" | "INVALID_COURSE" | "STUDENT_INACTIVE" | "INTERNAL_ERROR";
}

/**
 * Creates a student grievance atomically:
 * 1. Verifies student identity and active status.
 * 2. Verifies course existence, parent department, active status, and semester validity.
 * 3. Reads effective server-side WorkflowConfiguration (HOD_DIRECTOR vs COORDINATOR_HOD_DIRECTOR).
 * 4. Resolves authority chain according to effective workflow mode:
 *    - In HOD_DIRECTOR mode: Routes directly to Department Head. Coordinator is not required.
 *    - In COORDINATOR_HOD_DIRECTOR mode: Resolves semester-appropriate Coordinator and validates authority chain.
 * 5. Generates unique tracking number (CSJMU-SBS-YYYY-[DEPT]-[HEX]).
 * 6. Atomically creates Grievance with immutable workflowMode snapshot, initial timeline milestone,
 *    and attaches GrievanceDocument records in a single database transaction.
 */
export async function createStudentGrievance(
  input: CreateGrievanceInput
): Promise<CreateGrievanceResult> {
  const {
    studentId,
    courseId,
    semester,
    category,
    subject,
    description,
    reliefSought,
    uploadedFiles = [],
    ipAddress,
    userAgent,
  } = input;

  // 1. Verify student account
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, role: true, isActive: true, fullName: true },
  });

  if (!student || student.role !== UserRole.STUDENT) {
    return {
      success: false,
      error: "Only registered students can lodge grievances.",
      errorCode: "STUDENT_INACTIVE",
    };
  }

  if (!student.isActive) {
    return {
      success: false,
      error: "Your student account is deactivated. Please contact SBS administration.",
      errorCode: "STUDENT_INACTIVE",
    };
  }

  // 2. Fetch course & department
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { department: true },
  });

  if (!course) {
    return {
      success: false,
      error: "Selected course does not exist.",
      errorCode: "INVALID_COURSE",
    };
  }

  if (!course.isActive) {
    return {
      success: false,
      error: `Course '${course.name}' is currently inactive.`,
      errorCode: "INVALID_COURSE",
    };
  }

  if (!course.department.isActive) {
    return {
      success: false,
      error: `Department '${course.department.name}' is currently inactive.`,
      errorCode: "INVALID_COURSE",
    };
  }

  // Validate semester if provided
  const courseTotalSemesters = course.totalSemesters || 6;
  if (semester !== undefined && semester !== null) {
    if (semester < 1 || semester > courseTotalSemesters) {
      return {
        success: false,
        error: `Invalid semester ${semester} selected. Course '${course.name}' has ${courseTotalSemesters} semesters.`,
        errorCode: "INVALID_COURSE",
      };
    }
  }

  // 3. Read effective server-side WorkflowConfiguration
  const workflowConfig = await getActiveWorkflowConfiguration();

  // 4. Resolve Authority Chain for course, semester, and active workflow mode
  const chain = await resolveAuthorityChain(course.id, semester, workflowConfig.mode);

  const semLabel = semester ? ` (Semester ${semester})` : "";
  let targetTier: GrievanceTier;
  let assignedUserId: string;
  let assignedOfficialName: string;
  let submissionRemarks: string;

  if (workflowConfig.mode === WorkflowMode.HOD_DIRECTOR) {
    // Mode: HOD_DIRECTOR (Student -> HOD -> Director)
    if (!chain.departmentHead) {
      return {
        success: false,
        error: `Grievance routing is unconfigured: No active Department Head assigned for '${course.department.name}'. Please contact administration.`,
        errorCode: "UNRESOLVED_ROUTING",
      };
    }

    if (!chain.director) {
      return {
        success: false,
        error: "Grievance routing is unconfigured: No active School Director configured. Please contact administration.",
        errorCode: "UNRESOLVED_ROUTING",
      };
    }

    targetTier = GrievanceTier.TIER_2_HOD;
    assignedUserId = chain.departmentHead.userId;
    assignedOfficialName = chain.departmentHead.fullName;
    submissionRemarks = `Grievance submitted by student${semLabel}. Routed directly to Department Head (${assignedOfficialName}).`;
  } else {
    // Mode: COORDINATOR_HOD_DIRECTOR (Student -> Coordinator -> HOD -> Director)
    if (!chain.coordinator) {
      const semText = semester ? ` for semester ${semester}` : "";
      return {
        success: false,
        error: `Grievance routing is unconfigured: No active Course Coordinator assigned${semText} for '${course.name}'. Please contact administration.`,
        errorCode: "UNRESOLVED_ROUTING",
      };
    }

    if (!chain.departmentHead) {
      return {
        success: false,
        error: `Grievance routing is unconfigured: No active Department Head assigned for '${course.department.name}'. Please contact administration.`,
        errorCode: "UNRESOLVED_ROUTING",
      };
    }

    if (!chain.director) {
      return {
        success: false,
        error: "Grievance routing is unconfigured: No active School Director configured. Please contact administration.",
        errorCode: "UNRESOLVED_ROUTING",
      };
    }

    targetTier = GrievanceTier.TIER_1_COORDINATOR;
    assignedUserId = chain.coordinator.userId;
    assignedOfficialName = chain.coordinator.fullName;
    submissionRemarks = `Grievance submitted by student${semLabel}. Assigned to Course Coordinator (${assignedOfficialName}).`;
  }

  // 5. Generate unique tracking number and public tracking token
  const { trackingNumber, trackingToken } = await generateUniqueTrackingNumber(
    course.department.code
  );

  // 6. Atomic Transaction: Grievance + Timeline + Documents
  try {
    const createdGrievance = await prisma.$transaction(async (tx) => {
      // Create Grievance with immutable workflowMode and workflowVersion snapshot
      const g = await tx.grievance.create({
        data: {
          trackingNumber,
          studentId: student.id,
          departmentId: course.departmentId,
          courseId: course.id,
          semester: semester ?? null,
          assignedToUserId: assignedUserId,
          category,
          subject,
          description,
          reliefSought: reliefSought || null,
          currentTier: targetTier,
          currentStatus: GrievanceStatus.SUBMITTED,
          workflowMode: workflowConfig.mode,
          workflowVersion: workflowConfig.version,
        },
      });

      // Create Initial Timeline Milestone (SUBMITTED)
      await tx.grievanceTimelineAction.create({
        data: {
          grievanceId: g.id,
          actorId: student.id,
          actorRole: UserRole.STUDENT,
          actionType: TimelineActionType.SUBMITTED,
          fromTier: null,
          toTier: targetTier,
          fromStatus: null,
          toStatus: GrievanceStatus.SUBMITTED,
          remarks: submissionRemarks,
          visibility: TimelineVisibility.PUBLIC_TO_STUDENT,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });

      // Attach Uploaded Documents
      for (const file of uploadedFiles) {
        await tx.grievanceDocument.create({
          data: {
            grievanceId: g.id,
            uploadedById: student.id,
            fileName: file.fileName,
            storageKey: file.storageKey,
            fileSize: file.fileSize,
            mimeType: file.mimeType,
            sha256Hash: file.sha256Hash,
            purpose: DocumentPurpose.INITIAL_SUPPORT,
          },
        });
      }

      // Re-fetch with needed relations
      return tx.grievance.findUniqueOrThrow({
        where: { id: g.id },
        include: {
          department: { select: { name: true, code: true } },
          course: { select: { name: true, code: true } },
          assignedTo: { select: { fullName: true, email: true } },
        },
      });
    });

    return {
      success: true,
      grievance: createdGrievance,
      trackingNumber,
      trackingToken,
    };
  } catch (error: any) {
    console.error("Grievance creation transaction failed:", error);
    return {
      success: false,
      error: "Failed to persist grievance due to an internal error. Please try again.",
      errorCode: "INTERNAL_ERROR",
    };
  }
}
