import prisma from "@/lib/prisma";
import {
  Grievance,
  GrievanceStatus,
  GrievanceTier,
  TimelineActionType,
  TimelineVisibility,
  UserRole,
} from "@prisma/client";
import { resolveAuthorityChain } from "@/lib/routing/authority-chain";

export interface WorkflowActionContext {
  actorUserId: string;
  grievanceId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface WorkflowResult {
  success: boolean;
  grievance?: Grievance;
  error?: string;
  statusCode?: number;
}

// =============================================================================
// TIER 2: DEPARTMENT HEAD (HoD) WORKFLOW SERVICE
// =============================================================================

/**
 * Verify that the user is the active Department Head for the department of the grievance.
 */
export async function verifyHodAccess(
  hodUserId: string,
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

  // Check that the user is an active HoD for this department
  const assignment = await prisma.staffAssignment.findFirst({
    where: {
      userId: hodUserId,
      departmentId: grievance.departmentId,
      courseId: null,
      role: UserRole.DEPARTMENT_HEAD,
      isActive: true,
    },
  });

  if (!assignment) {
    return {
      allowed: false,
      grievance: null,
      error: "Access denied. You are not the active Department Head for this department.",
      statusCode: 403,
    };
  }

  return { allowed: true, grievance };
}

/**
 * HoD Action 1: Mark Under Review (Tier 2)
 * Transition: FORWARDED -> UNDER_REVIEW (when currentTier is TIER_2_HOD)
 */
export async function hodMarkUnderReview(
  ctx: WorkflowActionContext,
  remarks?: string
): Promise<WorkflowResult> {
  const { allowed, grievance, error, statusCode } = await verifyHodAccess(
    ctx.actorUserId,
    ctx.grievanceId
  );

  if (!allowed || !grievance) return { success: false, error, statusCode };

  if (grievance.currentTier !== GrievanceTier.TIER_2_HOD) {
    return {
      success: false,
      error: `Cannot initiate HoD review: Grievance is at ${grievance.currentTier}.`,
      statusCode: 400,
    };
  }

  if (
    grievance.currentStatus !== GrievanceStatus.FORWARDED &&
    grievance.currentStatus !== GrievanceStatus.SUBMITTED
  ) {
    return {
      success: false,
      error: `Grievance must be in FORWARDED or SUBMITTED status to be opened at Tier 2 (current: ${grievance.currentStatus}).`,
      statusCode: 400,
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const g = await tx.grievance.update({
      where: { id: grievance.id },
      data: { currentStatus: GrievanceStatus.UNDER_REVIEW },
    });

    await tx.grievanceTimelineAction.create({
      data: {
        grievanceId: g.id,
        actorId: ctx.actorUserId,
        actorRole: UserRole.DEPARTMENT_HEAD,
        actionType: TimelineActionType.UNDER_REVIEW_MARKED,
        fromTier: GrievanceTier.TIER_2_HOD,
        toTier: GrievanceTier.TIER_2_HOD,
        fromStatus: grievance.currentStatus,
        toStatus: GrievanceStatus.UNDER_REVIEW,
        remarks:
          remarks?.trim() ||
          (grievance.currentStatus === GrievanceStatus.SUBMITTED
            ? "Directly submitted grievance taken up for departmental review by Department Head."
            : "Case taken up for departmental review by Department Head."),
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
 * HoD Action 2: Add Confidential Faculty Note
 */
export async function hodAddInternalRemark(
  ctx: WorkflowActionContext,
  remarks: string
): Promise<WorkflowResult> {
  const { allowed, grievance, error, statusCode } = await verifyHodAccess(
    ctx.actorUserId,
    ctx.grievanceId
  );

  if (!allowed || !grievance) return { success: false, error, statusCode };

  await prisma.grievanceTimelineAction.create({
    data: {
      grievanceId: grievance.id,
      actorId: ctx.actorUserId,
      actorRole: UserRole.DEPARTMENT_HEAD,
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
 * HoD Action 3: Request Additional Clarification / Documents
 * Transition: UNDER_REVIEW -> AWAITING_STUDENT_INFO
 */
export async function hodRequestDocuments(
  ctx: WorkflowActionContext,
  instructions: string,
  deadline?: Date | null
): Promise<WorkflowResult> {
  const { allowed, grievance, error, statusCode } = await verifyHodAccess(
    ctx.actorUserId,
    ctx.grievanceId
  );

  if (!allowed || !grievance) return { success: false, error, statusCode };

  if (grievance.currentTier !== GrievanceTier.TIER_2_HOD) {
    return {
      success: false,
      error: `Cannot request documents: Grievance is at ${grievance.currentTier}.`,
      statusCode: 400,
    };
  }

  if (grievance.currentStatus !== GrievanceStatus.UNDER_REVIEW) {
    return {
      success: false,
      error: `Grievance must be UNDER_REVIEW to request documents (current: ${grievance.currentStatus}).`,
      statusCode: 400,
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.documentRequest.create({
      data: {
        grievanceId: grievance.id,
        requestedById: ctx.actorUserId,
        requestedTier: GrievanceTier.TIER_2_HOD,
        instructions: instructions.trim(),
        deadline: deadline || null,
      },
    });

    const g = await tx.grievance.update({
      where: { id: grievance.id },
      data: { currentStatus: GrievanceStatus.AWAITING_STUDENT_INFO },
    });

    await tx.grievanceTimelineAction.create({
      data: {
        grievanceId: g.id,
        actorId: ctx.actorUserId,
        actorRole: UserRole.DEPARTMENT_HEAD,
        actionType: TimelineActionType.DOCUMENTS_REQUESTED,
        fromTier: GrievanceTier.TIER_2_HOD,
        toTier: GrievanceTier.TIER_2_HOD,
        fromStatus: GrievanceStatus.UNDER_REVIEW,
        toStatus: GrievanceStatus.AWAITING_STUDENT_INFO,
        remarks: `Department Head requested additional evidence: ${instructions.trim()}`,
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
 * HoD Action 4: Escalate to School Director (Tier 2 -> Tier 3)
 * Transition: UNDER_REVIEW -> FORWARDED
 * Reassigns to active Director resolved via authority chain.
 */
export async function hodForwardToDirector(
  ctx: WorkflowActionContext,
  forwardingNotes: string
): Promise<WorkflowResult> {
  const { allowed, grievance, error, statusCode } = await verifyHodAccess(
    ctx.actorUserId,
    ctx.grievanceId
  );

  if (!allowed || !grievance) return { success: false, error, statusCode };

  if (grievance.currentTier !== GrievanceTier.TIER_2_HOD) {
    return {
      success: false,
      error: `Cannot escalate to Director: Grievance is at ${grievance.currentTier}.`,
      statusCode: 400,
    };
  }

  if (grievance.currentStatus !== GrievanceStatus.UNDER_REVIEW) {
    return {
      success: false,
      error: `Grievance must be UNDER_REVIEW before escalating to Director (current: ${grievance.currentStatus}).`,
      statusCode: 400,
    };
  }

  // Resolve Tier 3 Director via authority chain
  const chain = await resolveAuthorityChain(grievance.courseId);
  if (!chain.director) {
    return {
      success: false,
      error: "Cannot escalate: No active Director configured for School of Basic Sciences. Contact administration.",
      statusCode: 422,
    };
  }

  const directorUserId = chain.director.userId;

  const updated = await prisma.$transaction(async (tx) => {
    const g = await tx.grievance.update({
      where: { id: grievance.id },
      data: {
        currentTier: GrievanceTier.TIER_3_DIRECTOR,
        currentStatus: GrievanceStatus.FORWARDED,
        assignedToUserId: directorUserId,
      },
    });

    await tx.grievanceTimelineAction.create({
      data: {
        grievanceId: g.id,
        actorId: ctx.actorUserId,
        actorRole: UserRole.DEPARTMENT_HEAD,
        actionType: TimelineActionType.FORWARDED,
        fromTier: GrievanceTier.TIER_2_HOD,
        toTier: GrievanceTier.TIER_3_DIRECTOR,
        fromStatus: GrievanceStatus.UNDER_REVIEW,
        toStatus: GrievanceStatus.FORWARDED,
        remarks: `Case escalated to School Director (${chain.director!.fullName}). Reason: ${forwardingNotes.trim()}`,
        visibility: TimelineVisibility.PUBLIC_TO_STUDENT,
        ipAddress: ctx.ipAddress || null,
        userAgent: ctx.userAgent || null,
      },
    });

    await tx.grievanceTimelineAction.create({
      data: {
        grievanceId: g.id,
        actorId: ctx.actorUserId,
        actorRole: UserRole.DEPARTMENT_HEAD,
        actionType: TimelineActionType.INTERNAL_REMARK_ADDED,
        fromTier: GrievanceTier.TIER_3_DIRECTOR,
        toTier: GrievanceTier.TIER_3_DIRECTOR,
        fromStatus: GrievanceStatus.FORWARDED,
        toStatus: GrievanceStatus.FORWARDED,
        remarks: `Tier-2 HoD Escalation Handover: ${forwardingNotes.trim()}`,
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
 * HoD Action 5: Formulate Departmental Resolution (Tier 2)
 */
export async function hodResolveGrievance(
  ctx: WorkflowActionContext,
  resolutionSummary: string
): Promise<WorkflowResult> {
  const { allowed, grievance, error, statusCode } = await verifyHodAccess(
    ctx.actorUserId,
    ctx.grievanceId
  );

  if (!allowed || !grievance) return { success: false, error, statusCode };

  if (grievance.currentTier !== GrievanceTier.TIER_2_HOD) {
    return {
      success: false,
      error: `Cannot resolve at Tier 2: Grievance is at ${grievance.currentTier}.`,
      statusCode: 400,
    };
  }

  if (grievance.currentStatus !== GrievanceStatus.UNDER_REVIEW) {
    return {
      success: false,
      error: `Grievance must be UNDER_REVIEW to formulate resolution (current: ${grievance.currentStatus}).`,
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
        actorId: ctx.actorUserId,
        actorRole: UserRole.DEPARTMENT_HEAD,
        actionType: TimelineActionType.RESOLVED,
        fromTier: GrievanceTier.TIER_2_HOD,
        toTier: GrievanceTier.TIER_2_HOD,
        fromStatus: GrievanceStatus.UNDER_REVIEW,
        toStatus: GrievanceStatus.RESOLVED,
        remarks: `Grievance resolved by Department Head. Resolution: ${resolutionSummary.trim()}`,
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
 * HoD Action 6: Dismiss Grievance with Grounds (Tier 2)
 */
export async function hodDismissGrievance(
  ctx: WorkflowActionContext,
  grounds: string,
  reasoning: string
): Promise<WorkflowResult> {
  const { allowed, grievance, error, statusCode } = await verifyHodAccess(
    ctx.actorUserId,
    ctx.grievanceId
  );

  if (!allowed || !grievance) return { success: false, error, statusCode };

  if (grievance.currentTier !== GrievanceTier.TIER_2_HOD) {
    return {
      success: false,
      error: `Cannot dismiss at Tier 2: Grievance is at ${grievance.currentTier}.`,
      statusCode: 400,
    };
  }

  if (grievance.currentStatus !== GrievanceStatus.UNDER_REVIEW) {
    return {
      success: false,
      error: `Grievance must be UNDER_REVIEW to be dismissed (current: ${grievance.currentStatus}).`,
      statusCode: 400,
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const summary = `Dismissed by Department Head. Grounds: ${grounds}. Findings: ${reasoning.trim()}`;
    const g = await tx.grievance.update({
      where: { id: grievance.id },
      data: {
        currentStatus: GrievanceStatus.DISMISSED,
        resolvedAt: new Date(),
        resolutionSummary: summary,
      },
    });

    await tx.grievanceTimelineAction.create({
      data: {
        grievanceId: g.id,
        actorId: ctx.actorUserId,
        actorRole: UserRole.DEPARTMENT_HEAD,
        actionType: TimelineActionType.DISMISSED,
        fromTier: GrievanceTier.TIER_2_HOD,
        toTier: GrievanceTier.TIER_2_HOD,
        fromStatus: GrievanceStatus.UNDER_REVIEW,
        toStatus: GrievanceStatus.DISMISSED,
        remarks: summary,
        visibility: TimelineVisibility.PUBLIC_TO_STUDENT,
        ipAddress: ctx.ipAddress || null,
        userAgent: ctx.userAgent || null,
      },
    });

    return g;
  });

  return { success: true, grievance: updated };
}

// =============================================================================
// TIER 3: SCHOOL DIRECTOR WORKFLOW SERVICE
// =============================================================================

/**
 * Verify that the user is the active Director for the School of Basic Sciences.
 */
export async function verifyDirectorAccess(
  directorUserId: string,
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

  // Director has jurisdiction over all SBS grievances
  const directorUser = await prisma.user.findFirst({
    where: {
      id: directorUserId,
      role: UserRole.DIRECTOR,
      isActive: true,
    },
  });

  if (!directorUser) {
    return {
      allowed: false,
      grievance: null,
      error: "Access denied. Active Director clearance required.",
      statusCode: 403,
    };
  }

  return { allowed: true, grievance };
}

/**
 * Director Action 1: Mark Under Review (Tier 3)
 * Transition: FORWARDED -> UNDER_REVIEW (when currentTier is TIER_3_DIRECTOR)
 */
export async function directorMarkUnderReview(
  ctx: WorkflowActionContext,
  remarks?: string
): Promise<WorkflowResult> {
  const { allowed, grievance, error, statusCode } = await verifyDirectorAccess(
    ctx.actorUserId,
    ctx.grievanceId
  );

  if (!allowed || !grievance) return { success: false, error, statusCode };

  if (grievance.currentTier !== GrievanceTier.TIER_3_DIRECTOR) {
    return {
      success: false,
      error: `Cannot initiate Directorate review: Grievance is currently at ${grievance.currentTier}.`,
      statusCode: 400,
    };
  }

  if (grievance.currentStatus !== GrievanceStatus.FORWARDED) {
    return {
      success: false,
      error: `Grievance must be in FORWARDED status to be opened at Tier 3 (current: ${grievance.currentStatus}).`,
      statusCode: 400,
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const g = await tx.grievance.update({
      where: { id: grievance.id },
      data: { currentStatus: GrievanceStatus.UNDER_REVIEW },
    });

    await tx.grievanceTimelineAction.create({
      data: {
        grievanceId: g.id,
        actorId: ctx.actorUserId,
        actorRole: UserRole.DIRECTOR,
        actionType: TimelineActionType.UNDER_REVIEW_MARKED,
        fromTier: GrievanceTier.TIER_3_DIRECTOR,
        toTier: GrievanceTier.TIER_3_DIRECTOR,
        fromStatus: GrievanceStatus.FORWARDED,
        toStatus: GrievanceStatus.UNDER_REVIEW,
        remarks: remarks?.trim() || "Case taken up for appellate review by Director, School of Basic Sciences.",
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
 * Director Action 2: Add Directorate Directive / Confidential Note
 */
export async function directorAddInternalRemark(
  ctx: WorkflowActionContext,
  remarks: string
): Promise<WorkflowResult> {
  const { allowed, grievance, error, statusCode } = await verifyDirectorAccess(
    ctx.actorUserId,
    ctx.grievanceId
  );

  if (!allowed || !grievance) return { success: false, error, statusCode };

  await prisma.grievanceTimelineAction.create({
    data: {
      grievanceId: grievance.id,
      actorId: ctx.actorUserId,
      actorRole: UserRole.DIRECTOR,
      actionType: TimelineActionType.INTERNAL_REMARK_ADDED,
      fromTier: grievance.currentTier,
      toTier: grievance.currentTier,
      fromStatus: grievance.currentStatus,
      toStatus: grievance.currentStatus,
      remarks: `Directorate Directive: ${remarks.trim()}`,
      visibility: TimelineVisibility.INTERNAL_STAFF_ONLY,
      ipAddress: ctx.ipAddress || null,
      userAgent: ctx.userAgent || null,
    },
  });

  return { success: true, grievance };
}

/**
 * Director Action 3: Request Additional Evidence / Clarification
 */
export async function directorRequestDocuments(
  ctx: WorkflowActionContext,
  instructions: string,
  deadline?: Date | null
): Promise<WorkflowResult> {
  const { allowed, grievance, error, statusCode } = await verifyDirectorAccess(
    ctx.actorUserId,
    ctx.grievanceId
  );

  if (!allowed || !grievance) return { success: false, error, statusCode };

  if (grievance.currentTier !== GrievanceTier.TIER_3_DIRECTOR) {
    return {
      success: false,
      error: `Cannot request documents at Tier 3: Grievance is at ${grievance.currentTier}.`,
      statusCode: 400,
    };
  }

  if (grievance.currentStatus !== GrievanceStatus.UNDER_REVIEW) {
    return {
      success: false,
      error: `Grievance must be UNDER_REVIEW to request documents (current: ${grievance.currentStatus}).`,
      statusCode: 400,
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.documentRequest.create({
      data: {
        grievanceId: grievance.id,
        requestedById: ctx.actorUserId,
        requestedTier: GrievanceTier.TIER_3_DIRECTOR,
        instructions: instructions.trim(),
        deadline: deadline || null,
      },
    });

    const g = await tx.grievance.update({
      where: { id: grievance.id },
      data: { currentStatus: GrievanceStatus.AWAITING_STUDENT_INFO },
    });

    await tx.grievanceTimelineAction.create({
      data: {
        grievanceId: g.id,
        actorId: ctx.actorUserId,
        actorRole: UserRole.DIRECTOR,
        actionType: TimelineActionType.DOCUMENTS_REQUESTED,
        fromTier: GrievanceTier.TIER_3_DIRECTOR,
        toTier: GrievanceTier.TIER_3_DIRECTOR,
        fromStatus: GrievanceStatus.UNDER_REVIEW,
        toStatus: GrievanceStatus.AWAITING_STUDENT_INFO,
        remarks: `Directorate requested additional proof: ${instructions.trim()}`,
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
 * Director Action 4: Formulate Final Institutional Resolution (Tier 3)
 */
export async function directorResolveGrievance(
  ctx: WorkflowActionContext,
  resolutionSummary: string
): Promise<WorkflowResult> {
  const { allowed, grievance, error, statusCode } = await verifyDirectorAccess(
    ctx.actorUserId,
    ctx.grievanceId
  );

  if (!allowed || !grievance) return { success: false, error, statusCode };

  if (grievance.currentTier !== GrievanceTier.TIER_3_DIRECTOR) {
    return {
      success: false,
      error: `Cannot formulate Tier 3 resolution: Grievance is at ${grievance.currentTier}.`,
      statusCode: 400,
    };
  }

  if (grievance.currentStatus !== GrievanceStatus.UNDER_REVIEW) {
    return {
      success: false,
      error: `Grievance must be UNDER_REVIEW to formulate resolution (current: ${grievance.currentStatus}).`,
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
        actorId: ctx.actorUserId,
        actorRole: UserRole.DIRECTOR,
        actionType: TimelineActionType.RESOLVED,
        fromTier: GrievanceTier.TIER_3_DIRECTOR,
        toTier: GrievanceTier.TIER_3_DIRECTOR,
        fromStatus: GrievanceStatus.UNDER_REVIEW,
        toStatus: GrievanceStatus.RESOLVED,
        remarks: `Final institutional resolution ordered by Director, School of Basic Sciences: ${resolutionSummary.trim()}`,
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
 * Director Action 5: Dismiss Grievance with Grounds (Tier 3)
 */
export async function directorDismissGrievance(
  ctx: WorkflowActionContext,
  grounds: string,
  reasoning: string
): Promise<WorkflowResult> {
  const { allowed, grievance, error, statusCode } = await verifyDirectorAccess(
    ctx.actorUserId,
    ctx.grievanceId
  );

  if (!allowed || !grievance) return { success: false, error, statusCode };

  if (grievance.currentTier !== GrievanceTier.TIER_3_DIRECTOR) {
    return {
      success: false,
      error: `Cannot dismiss at Tier 3: Grievance is at ${grievance.currentTier}.`,
      statusCode: 400,
    };
  }

  if (grievance.currentStatus !== GrievanceStatus.UNDER_REVIEW) {
    return {
      success: false,
      error: `Grievance must be UNDER_REVIEW to be dismissed (current: ${grievance.currentStatus}).`,
      statusCode: 400,
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const summary = `Appellate dismissal by Director SBS. Grounds: ${grounds}. Findings: ${reasoning.trim()}`;
    const g = await tx.grievance.update({
      where: { id: grievance.id },
      data: {
        currentStatus: GrievanceStatus.DISMISSED,
        resolvedAt: new Date(),
        resolutionSummary: summary,
      },
    });

    await tx.grievanceTimelineAction.create({
      data: {
        grievanceId: g.id,
        actorId: ctx.actorUserId,
        actorRole: UserRole.DIRECTOR,
        actionType: TimelineActionType.DISMISSED,
        fromTier: GrievanceTier.TIER_3_DIRECTOR,
        toTier: GrievanceTier.TIER_3_DIRECTOR,
        fromStatus: GrievanceStatus.UNDER_REVIEW,
        toStatus: GrievanceStatus.DISMISSED,
        remarks: summary,
        visibility: TimelineVisibility.PUBLIC_TO_STUDENT,
        ipAddress: ctx.ipAddress || null,
        userAgent: ctx.userAgent || null,
      },
    });

    return g;
  });

  return { success: true, grievance: updated };
}
