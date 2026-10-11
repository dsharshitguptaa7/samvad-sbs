import prisma from "@/lib/prisma";
import { WorkflowMode, UserRole } from "@prisma/client";
import { resolveAuthorityChain, assignmentMatchesSemester } from "@/lib/routing/authority-chain";

export { WorkflowMode };

export interface WorkflowConfigurationData {
  id: string;
  key: string;
  mode: WorkflowMode;
  version: number;
  updatedByUserId: string | null;
  updatedByFullName: string | null;
  updatedByEmail: string | null;
  changeReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowReadinessSummary {
  totalCourses: number;
  totalDepartments: number;
  missingCoordinatorsCount: number;
  missingHodCount: number;
  hasActiveDirector: boolean;
}

export interface WorkflowReadinessResult {
  mode: WorkflowMode;
  isReady: boolean;
  issues: string[];
  warnings: string[];
  summary: WorkflowReadinessSummary;
}

export interface UpdateWorkflowInput {
  mode: WorkflowMode;
  reason: string;
  expectedVersion?: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  skipReadinessCheck?: boolean;
}

export interface WorkflowAuditLogEntry {
  id: string;
  previousMode: WorkflowMode;
  newMode: WorkflowMode;
  reason: string;
  versionBefore: number;
  versionAfter: number;
  adminFullName: string;
  adminEmail: string;
  ipAddress?: string | null;
  createdAt: Date;
}

/**
 * Retrieve the active system workflow configuration.
 * Creates the default HOD_DIRECTOR record if it does not exist (durable initialization).
 */
export async function getActiveWorkflowConfiguration(): Promise<WorkflowConfigurationData> {
  let config = await prisma.workflowConfiguration.findUnique({
    where: { key: "DEFAULT" },
    include: {
      updatedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  if (!config) {
    config = await prisma.workflowConfiguration.create({
      data: {
        key: "DEFAULT",
        mode: WorkflowMode.HOD_DIRECTOR,
        version: 1,
        changeReason: "Initial default configuration: Student -> HOD -> Director",
      },
      include: {
        updatedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  return {
    id: config.id,
    key: config.key,
    mode: config.mode,
    version: config.version,
    updatedByUserId: config.updatedByUserId,
    updatedByFullName: config.updatedBy?.fullName ?? null,
    updatedByEmail: config.updatedBy?.email ?? null,
    changeReason: config.changeReason,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

/**
 * Validates whether the active academic and staff authority structure satisfies
 * the mandatory prerequisites for a given workflow mode.
 */
export async function validateWorkflowReadiness(
  targetMode: WorkflowMode
): Promise<WorkflowReadinessResult> {
  const issues: string[] = [];
  const warnings: string[] = [];

  // 1. Fetch active departments and courses
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    include: {
      courses: {
        where: { isActive: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const activeCourses = departments.flatMap((d) => d.courses);

  // 2. Fetch active HoDs
  const activeHodAssignments = await prisma.staffAssignment.findMany({
    where: {
      role: UserRole.DEPARTMENT_HEAD,
      courseId: null,
      isActive: true,
      user: { isActive: true },
    },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
    },
  });

  const hodDeptMap = new Map<string, string>();
  for (const a of activeHodAssignments) {
    hodDeptMap.set(a.departmentId, a.user.fullName);
  }

  let missingHodCount = 0;
  for (const dept of departments) {
    if (!hodDeptMap.has(dept.id)) {
      missingHodCount++;
      const hasActiveCourses = dept.courses && dept.courses.length > 0;
      const hodMsg = `Department '${dept.name}' (${dept.code}) has no active Head of Department assigned.`;
      if (hasActiveCourses) {
        issues.push(hodMsg);
      } else {
        warnings.push(`${hodMsg} (No active courses currently enrolled).`);
      }
    }
  }

  // 3. Fetch active Director
  const activeDirector = await prisma.user.findFirst({
    where: {
      role: UserRole.DIRECTOR,
      isActive: true,
    },
    select: { id: true, fullName: true, email: true },
  });

  if (!activeDirector) {
    issues.push("No active School Director configured for School of Basic Sciences.");
  }

  // 4. Fetch coordinator assignments for courses
  const activeCoordinatorAssignments = await prisma.staffAssignment.findMany({
    where: {
      role: UserRole.COURSE_COORDINATOR,
      isActive: true,
      courseId: { not: null },
      user: { isActive: true },
    },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
    },
  });

  let missingCoordinatorsCount = 0;
  for (const course of activeCourses) {
    const totalSems = course.totalSemesters || 6;
    const courseAssignments = activeCoordinatorAssignments.filter((a) => a.courseId === course.id);

    for (let sem = 1; sem <= totalSems; sem++) {
      const match = courseAssignments.find((a) => assignmentMatchesSemester(a, sem));
      if (!match) {
        missingCoordinatorsCount++;
        const semMsg = `Course '${course.name}' (${course.code}) is missing an active Coordinator for semester ${sem}.`;
        if (targetMode === WorkflowMode.COORDINATOR_HOD_DIRECTOR) {
          issues.push(semMsg);
        } else {
          warnings.push(semMsg);
        }
      }
    }
  }

  const isReady = issues.length === 0;

  return {
    mode: targetMode,
    isReady,
    issues,
    warnings,
    summary: {
      totalCourses: activeCourses.length,
      totalDepartments: departments.length,
      missingCoordinatorsCount,
      missingHodCount,
      hasActiveDirector: Boolean(activeDirector),
    },
  };
}

/**
 * Updates the global workflow configuration atomically with:
 * - Role verification (SYSTEM_ADMIN)
 * - Optimistic concurrency control (expectedVersion check)
 * - Authority readiness verification
 * - Immutable audit log insertion
 * - System audit log recording
 */
export async function updateWorkflowConfiguration(
  adminUserId: string,
  input: UpdateWorkflowInput
): Promise<{
  success: boolean;
  configuration?: WorkflowConfigurationData;
  error?: string;
  statusCode?: number;
  issues?: string[];
}> {
  // 1. Verify administrator
  const admin = await prisma.user.findUnique({
    where: { id: adminUserId },
    select: { id: true, role: true, isActive: true, fullName: true, email: true },
  });

  if (!admin || admin.role !== UserRole.SYSTEM_ADMIN || !admin.isActive) {
    return {
      success: false,
      error: "Access denied. Only active System Administrators can modify workflow configuration.",
      statusCode: 403,
    };
  }

  // 2. Validate mode
  if (
    input.mode !== WorkflowMode.HOD_DIRECTOR &&
    input.mode !== WorkflowMode.COORDINATOR_HOD_DIRECTOR
  ) {
    return {
      success: false,
      error: `Unsupported workflow mode '${input.mode}'.`,
      statusCode: 400,
    };
  }

  // 3. Validate change reason
  const cleanReason = (input.reason || "").trim();
  if (cleanReason.length < 5) {
    return {
      success: false,
      error: "A valid change reason of at least 5 characters is required.",
      statusCode: 400,
    };
  }

  // 4. Optimistic concurrency check against current configuration
  const currentConfigRecord = await prisma.workflowConfiguration.findUnique({
    where: { key: "DEFAULT" },
  });

  if (currentConfigRecord && input.expectedVersion !== undefined && input.expectedVersion !== currentConfigRecord.version) {
    return {
      success: false,
      error: `Conflict: Workflow configuration version mismatch. Expected version ${input.expectedVersion}, but current version is ${currentConfigRecord.version}. Please refresh.`,
      statusCode: 409,
    };
  }

  // 5. Validate readiness for target mode
  if (!input.skipReadinessCheck) {
    const readiness = await validateWorkflowReadiness(input.mode);
    if (!readiness.isReady) {
      return {
        success: false,
        error: `Cannot activate '${input.mode}': mandatory authority prerequisites are incomplete.`,
        statusCode: 422,
        issues: readiness.issues,
      };
    }
  }

  // 6. Execute atomic transaction with concurrency check
  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentConfig = await tx.workflowConfiguration.findUnique({
        where: { key: "DEFAULT" },
      });

      if (!currentConfig) {
        throw new Error("Workflow configuration record not found.");
      }

      // Optimistic concurrency check
      if (
        input.expectedVersion !== undefined &&
        input.expectedVersion !== currentConfig.version
      ) {
        const err: any = new Error(
          `Conflict: Workflow configuration version mismatch. Expected version ${input.expectedVersion}, but current version is ${currentConfig.version}. Please refresh.`
        );
        err.statusCode = 409;
        throw err;
      }

      // If already in target mode, no update needed
      if (currentConfig.mode === input.mode) {
        return {
          config: currentConfig,
          alreadyActive: true,
        };
      }

      const nextVersion = currentConfig.version + 1;

      // Update configuration
      const updated = await tx.workflowConfiguration.update({
        where: { key: "DEFAULT" },
        data: {
          mode: input.mode,
          version: nextVersion,
          updatedByUserId: admin.id,
          changeReason: cleanReason,
        },
        include: {
          updatedBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      // Record WorkflowAuditLog
      await tx.workflowAuditLog.create({
        data: {
          configId: updated.id,
          adminUserId: admin.id,
          previousMode: currentConfig.mode,
          newMode: input.mode,
          reason: cleanReason,
          versionBefore: currentConfig.version,
          versionAfter: nextVersion,
          ipAddress: input.ipAddress || null,
          userAgent: input.userAgent || null,
        },
      });

      // Record SystemAuditLog
      await tx.systemAuditLog.create({
        data: {
          adminUserId: admin.id,
          action: "WORKFLOW_MODE_CHANGED",
          targetModel: "WorkflowConfiguration",
          targetId: updated.id,
          details: {
            previousMode: currentConfig.mode,
            newMode: input.mode,
            reason: cleanReason,
            versionBefore: currentConfig.version,
            versionAfter: nextVersion,
          },
          ipAddress: input.ipAddress || null,
        },
      });

      return {
        config: updated,
        alreadyActive: false,
      };
    });

    return {
      success: true,
      configuration: {
        id: result.config.id,
        key: result.config.key,
        mode: result.config.mode,
        version: result.config.version,
        updatedByUserId: result.config.updatedByUserId,
        updatedByFullName: (result.config as any).updatedBy?.fullName ?? admin.fullName,
        updatedByEmail: (result.config as any).updatedBy?.email ?? admin.email,
        changeReason: result.config.changeReason,
        createdAt: result.config.createdAt,
        updatedAt: result.config.updatedAt,
      },
    };
  } catch (err: any) {
    if (err.statusCode) {
      return {
        success: false,
        error: err.message,
        statusCode: err.statusCode,
      };
    }
    console.error("Workflow configuration transaction error:", err);
    return {
      success: false,
      error: err.message || "Failed to update workflow configuration.",
      statusCode: 500,
    };
  }
}

/**
 * Retrieve immutable audit history for workflow configuration updates.
 */
export async function getWorkflowAuditHistory(
  limit = 25
): Promise<WorkflowAuditLogEntry[]> {
  const logs = await prisma.workflowAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      adminUser: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
  });

  return logs.map((log) => ({
    id: log.id,
    previousMode: log.previousMode,
    newMode: log.newMode,
    reason: log.reason,
    versionBefore: log.versionBefore,
    versionAfter: log.versionAfter,
    adminFullName: log.adminUser.fullName,
    adminEmail: log.adminUser.email,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt,
  }));
}
