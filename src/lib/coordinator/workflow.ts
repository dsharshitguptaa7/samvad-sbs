import prisma from "@/lib/prisma";
import {
  Grievance,
  GrievanceStatus,
  GrievanceTier,
  TimelineActionType,
  TimelineVisibility,
  UserRole,
} from "@prisma/client";
import { resolveAuthorityChain, assignmentMatchesSemester } from "@/lib/routing/authority-chain";

export interface CoordinatorActionContext {
  coordinatorUserId: string;
  grievanceId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface WorkflowActionResult {
  success: boolean;
  grievance?: Grievance;
  error?: string;
  statusCode?: number;
}

/**
 * Verify that the coordinator has an active assignment for the given grievance's course and semester.
 */
export async function verifyCoordinatorAccess(
  coordinatorUserId: string,
  grievanceId: string
): Promise<{
  allowed: boolean;
  grievance: (Grievance & {
    course: { id: string; name: string; code: string; departmentId: string };
    department: { id: string; name: string; code: string };
    student: { id: string; fullName: string; email: string; rollNumber: string | null; enrollmentNo: string | null };
  }) | null;
  error?: string;
  statusCode?: number;
}> {
  // 1. Fetch grievance
  const grievance = await prisma.grievance.findUnique({
    where: { id: grievanceId },
    include: {
      course: true,
      department: true,
      student: {
        select: {
          id: true,
          fullName: true,
          email: true,
          rollNumber: true,
          enrollmentNo: true,
        },
      },
    },
  });

  if (!grievance) {
    return { allowed: false, grievance: null, error: "Grievance not found", statusCode: 404 };
  }

  // 2. Check coordinator active assignments for this specific course
  const assignments = await prisma.staffAssignment.findMany({
    where: {
      userId: coordinatorUserId,
      courseId: grievance.courseId,
      role: UserRole.COURSE_COORDINATOR,
      isActive: true,
    },
  });

  if (assignments.length === 0) {
    return {
      allowed: false,
      grievance: null,
      error: "Access denied. You are not the active Course Coordinator assigned to this course.",
      statusCode: 403,
    };
  }

  // 3. Enforce semester boundary if grievance has a semester specified
  if (grievance.semester !== null && grievance.semester !== undefined) {
    const coversSemester = assignments.some((a) =>
      assignmentMatchesSemester(a, grievance.semester!)
    );

    if (!coversSemester) {
      return {
        allowed: false,
        grievance: null,
        error: `Access denied. You are not assigned as Course Coordinator for semester ${grievance.semester} of this course.`,
        statusCode: 403,
      };
    }
  }

  return { allowed: true, grievance };
}

/**
 * Action 1: Mark Under Review (Tier 1)
 * Transition: SUBMITTED -> UNDER_REVIEW
 */
export async function coordinatorMarkUnderReview(
  ctx: CoordinatorActionContext,
  remarks?: string
): Promise<WorkflowActionResult> {
  const { allowed, grievance, error, statusCode } = await verifyCoordinatorAccess(
    ctx.coordinatorUserId,
    ctx.grievanceId
  );

  if (!allowed || !grievance) {
    return { success: false, error, statusCode };
  }

  // Invariant: Must be at Tier 1 and in SUBMITTED state
  if (grievance.currentTier !== GrievanceTier.TIER_1_COORDINATOR) {
    return {
      success: false,
      error: `Cannot mark under review: Grievance is currently at ${grievance.currentTier}.`,
      statusCode: 400,
    };
  }

  if (grievance.currentStatus !== GrievanceStatus.SUBMITTED) {
    return {
      success: false,
      error: `Cannot transition from status '${grievance.currentStatus}' to UNDER_REVIEW. Only SUBMITTED cases can be opened.`,
      statusCode: 400,
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const g = await tx.grievance.update({
      where: { id: grievance.id },
      data: {
        currentStatus: GrievanceStatus.UNDER_REVIEW,
      },
    });

    await tx.grievanceTimelineAction.create({
      data: {
        grievanceId: g.id,
        actorId: ctx.coordinatorUserId,
        actorRole: UserRole.COURSE_COORDINATOR,
        actionType: TimelineActionType.UNDER_REVIEW_MARKED,
        fromTier: GrievanceTier.TIER_1_COORDINATOR,
        toTier: GrievanceTier.TIER_1_COORDINATOR,
        fromStatus: GrievanceStatus.SUBMITTED,
        toStatus: GrievanceStatus.UNDER_REVIEW,
        remarks: remarks?.trim() || "Case taken up for active evaluation by Course Coordinator.",
        visibility: TimelineVisibility.PUBLIC_TO_STUDENT,
        ipAddress: ctx.ipAddress || null,
        userAgent: ctx.userAgent || null,
      },
    });

    return g;
  });

  return { success: true, grievance: updated };
}

/**
 * Action 2: Add Internal Faculty Remark
 * Does NOT change grievance state or tier. Visibility is strictly INTERNAL_STAFF_ONLY.
 */
export async function coordinatorAddInternalRemark(
  ctx: CoordinatorActionContext,
  remarks: string
): Promise<WorkflowActionResult> {
  const { allowed, grievance, error, statusCode } = await verifyCoordinatorAccess(
    ctx.coordinatorUserId,
    ctx.grievanceId
  );

  if (!allowed || !grievance) {
    return { success: false, error, statusCode };
  }

  // Record internal remark timeline entry
  await prisma.grievanceTimelineAction.create({
    data: {
      grievanceId: grievance.id,
      actorId: ctx.coordinatorUserId,
      actorRole: UserRole.COURSE_COORDINATOR,
      actionType: TimelineActionType.INTERNAL_REMARK_ADDED,
      fromTier: grievance.currentTier,
      toTier: grievance.currentTier,
      fromStatus: grievance.currentStatus,
      toStatus: grievance.currentStatus,
      remarks: remarks.trim(),
      visibility: TimelineVisibility.INTERNAL_STAFF_ONLY,
      ipAddress: ctx.ipAddress || null,
      userAgent: ctx.userAgent || null,
    },
  });

  return { success: true, grievance };
}

/**
 * Action 3: Request Additional Clarification / Documents from Student
 * Transition: UNDER_REVIEW -> AWAITING_STUDENT_INFO
 * Creates a DocumentRequest record and timeline action.
 */
export async function coordinatorRequestDocuments(
  ctx: CoordinatorActionContext,
  instructions: string,
  deadline?: Date | null
): Promise<WorkflowActionResult> {
  const { allowed, grievance, error, statusCode } = await verifyCoordinatorAccess(
    ctx.coordinatorUserId,
    ctx.grievanceId
  );

  if (!allowed || !grievance) {
    return { success: false, error, statusCode };
  }

  if (grievance.currentTier !== GrievanceTier.TIER_1_COORDINATOR) {
    return {
      success: false,
      error: `Cannot request documents: Grievance is currently at ${grievance.currentTier}.`,
      statusCode: 400,
    };
  }

  if (grievance.currentStatus !== GrievanceStatus.UNDER_REVIEW) {
    return {
      success: false,
      error: `Document requests can only be issued while case is UNDER_REVIEW (current status: ${grievance.currentStatus}).`,
      statusCode: 400,
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    // 1. Create DocumentRequest
    await tx.documentRequest.create({
      data: {
        grievanceId: grievance.id,
        requestedById: ctx.coordinatorUserId,
        requestedTier: GrievanceTier.TIER_1_COORDINATOR,
        instructions: instructions.trim(),
        deadline: deadline || null,
      },
    });

    // 2. Update grievance status
    const g = await tx.grievance.update({
      where: { id: grievance.id },
      data: {
        currentStatus: GrievanceStatus.AWAITING_STUDENT_INFO,
      },
    });

    // 3. Create Timeline entry (Public to student so they know documents are requested)
    await tx.grievanceTimelineAction.create({
      data: {
        grievanceId: g.id,
        actorId: ctx.coordinatorUserId,
        actorRole: UserRole.COURSE_COORDINATOR,
        actionType: TimelineActionType.DOCUMENTS_REQUESTED,
        fromTier: GrievanceTier.TIER_1_COORDINATOR,
        toTier: GrievanceTier.TIER_1_COORDINATOR,
        fromStatus: GrievanceStatus.UNDER_REVIEW,
        toStatus: GrievanceStatus.AWAITING_STUDENT_INFO,
        remarks: `Clarification requested: ${instructions.trim()}`,
        visibility: TimelineVisibility.PUBLIC_TO_STUDENT,
        ipAddress: ctx.ipAddress || null,
        userAgent: ctx.userAgent || null,
      },
    });

    return g;
  });

  return { success: true, grievance: updated };
}

/**
 * Action 4: Escalate to Department Head (Tier 1 -> Tier 2)
 * Transition: UNDER_REVIEW -> FORWARDED
 * Automatically reassigns assignedToUserId to the active Department Head resolved via authority chain.
 */
export async function coordinatorForwardToHod(
  ctx: CoordinatorActionContext,
  forwardingNotes: string
): Promise<WorkflowActionResult> {
  const { allowed, grievance, error, statusCode } = await verifyCoordinatorAccess(
    ctx.coordinatorUserId,
    ctx.grievanceId
  );

  if (!allowed || !grievance) {
    return { success: false, error, statusCode };
  }

  if (grievance.currentTier !== GrievanceTier.TIER_1_COORDINATOR) {
    return {
      success: false,
      error: `Cannot escalate: Grievance is currently at ${grievance.currentTier}.`,
      statusCode: 400,
    };
  }

  if (grievance.currentStatus !== GrievanceStatus.UNDER_REVIEW) {
    return {
      success: false,
      error: `Grievance must be UNDER_REVIEW before escalating to HoD (current status: ${grievance.currentStatus}).`,
      statusCode: 400,
    };
  }

  // Resolve Tier 2 Department Head from authority chain
  const chain = await resolveAuthorityChain(grievance.courseId, grievance.semester);
  if (!chain.departmentHead) {
    return {
      success: false,
      error: `Cannot escalate: No active Department Head is currently configured for department '${grievance.department.name}'. Please contact administration.`,
      statusCode: 422,
    };
  }

  const hodUserId = chain.departmentHead.userId;

  const updated = await prisma.$transaction(async (tx) => {
    // 1. Advance grievance tier and reassign to HoD
    const g = await tx.grievance.update({
      where: { id: grievance.id },
      data: {
        currentTier: GrievanceTier.TIER_2_HOD,
        currentStatus: GrievanceStatus.FORWARDED,
        assignedToUserId: hodUserId,
      },
    });

    // 2. Record timeline action
    await tx.grievanceTimelineAction.create({
      data: {
        grievanceId: g.id,
        actorId: ctx.coordinatorUserId,
        actorRole: UserRole.COURSE_COORDINATOR,
        actionType: TimelineActionType.FORWARDED,
        fromTier: GrievanceTier.TIER_1_COORDINATOR,
        toTier: GrievanceTier.TIER_2_HOD,
        fromStatus: GrievanceStatus.UNDER_REVIEW,
        toStatus: GrievanceStatus.FORWARDED,
        remarks: `Case forwarded to Department Head (${chain.departmentHead!.fullName}). Notes: ${forwardingNotes.trim()}`,
        visibility: TimelineVisibility.PUBLIC_TO_STUDENT,
        ipAddress: ctx.ipAddress || null,
        userAgent: ctx.userAgent || null,
      },
    });

    // 3. Record internal staff handover note
    await tx.grievanceTimelineAction.create({
      data: {
        grievanceId: g.id,
        actorId: ctx.coordinatorUserId,
        actorRole: UserRole.COURSE_COORDINATOR,
        actionType: TimelineActionType.INTERNAL_REMARK_ADDED,
        fromTier: GrievanceTier.TIER_2_HOD,
        toTier: GrievanceTier.TIER_2_HOD,
        fromStatus: GrievanceStatus.FORWARDED,
        toStatus: GrievanceStatus.FORWARDED,
        remarks: `Tier-1 Coordinator Escalation Handover: ${forwardingNotes.trim()}`,
        visibility: TimelineVisibility.INTERNAL_STAFF_ONLY,
        ipAddress: ctx.ipAddress || null,
        userAgent: ctx.userAgent || null,
      },
    });

    return g;
  });

  return { success: true, grievance: updated };
}

/**
 * Action 5: Formulate Tier 1 Resolution
 * Transition: UNDER_REVIEW -> RESOLVED
 * Sets resolvedAt = now(), resolutionSummary, and records public resolution timeline action.
 */
export async function coordinatorResolveGrievance(
  ctx: CoordinatorActionContext,
  resolutionSummary: string
): Promise<WorkflowActionResult> {
  const { allowed, grievance, error, statusCode } = await verifyCoordinatorAccess(
    ctx.coordinatorUserId,
    ctx.grievanceId
  );

  if (!allowed || !grievance) {
    return { success: false, error, statusCode };
  }

  if (grievance.currentTier !== GrievanceTier.TIER_1_COORDINATOR) {
    return {
      success: false,
      error: `Cannot resolve: Grievance is currently at ${grievance.currentTier}.`,
      statusCode: 400,
    };
  }

  if (grievance.currentStatus !== GrievanceStatus.UNDER_REVIEW) {
    return {
      success: false,
      error: `Grievance must be UNDER_REVIEW to be resolved (current status: ${grievance.currentStatus}).`,
      statusCode: 400,
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const g = await tx.grievance.update({
      where: { id: grievance.id },
      data: {
        currentStatus: GrievanceStatus.RESOLVED,
        resolvedAt: new Date(),
        resolutionSummary: resolutionSummary.trim(),
      },
    });

    await tx.grievanceTimelineAction.create({
      data: {
        grievanceId: g.id,
        actorId: ctx.coordinatorUserId,
        actorRole: UserRole.COURSE_COORDINATOR,
        actionType: TimelineActionType.RESOLVED,
        fromTier: GrievanceTier.TIER_1_COORDINATOR,
        toTier: GrievanceTier.TIER_1_COORDINATOR,
        fromStatus: GrievanceStatus.UNDER_REVIEW,
        toStatus: GrievanceStatus.RESOLVED,
        remarks: `Grievance resolved by Course Coordinator. Resolution: ${resolutionSummary.trim()}`,
        visibility: TimelineVisibility.PUBLIC_TO_STUDENT,
        ipAddress: ctx.ipAddress || null,
        userAgent: ctx.userAgent || null,
      },
    });

    return g;
  });

  return { success: true, grievance: updated };
}
