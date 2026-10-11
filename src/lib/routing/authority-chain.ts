import prisma from "@/lib/prisma";
import { UserRole, WorkflowMode } from "@prisma/client";

export interface AuthorityNode {
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  assignmentId?: string;
  assignedAt?: Date;
  semesters?: number[];
  academicPeriod?: string | null;
}

export interface SemesterRoutingNode {
  semester: number;
  coordinator: AuthorityNode | null;
  status: "ASSIGNED" | "MISSING" | "CONFLICT";
  candidates?: AuthorityNode[];
}

export interface AuthorityChainResolution {
  courseId: string;
  courseName: string;
  courseCode: string;
  totalSemesters: number;
  academicPeriod: string;
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  semester?: number | null;
  workflowMode?: WorkflowMode;
  coordinator: AuthorityNode | null;
  departmentHead: AuthorityNode | null;
  director: AuthorityNode | null;
  semesterRouting: SemesterRoutingNode[];
  isComplete: boolean;
  status: "COMPLETE" | "PARTIAL" | "UNRESOLVABLE";
  issues: string[];
}

/**
 * Check if a staff assignment covers a specific semester number.
 */
export function assignmentMatchesSemester(
  assignment: { semesters: number[]; academicPeriod?: string | null },
  semester: number
): boolean {
  if (assignment.semesters && assignment.semesters.length > 0) {
    return assignment.semesters.includes(semester);
  }
  if (assignment.academicPeriod === "ODD") {
    return semester % 2 === 1;
  }
  if (assignment.academicPeriod === "EVEN") {
    return semester % 2 === 0;
  }
  // Empty semesters array with no/ALL period covers all semesters
  return true;
}

/**
 * Resolve the authoritative redressal chain for a specific course and optional semester:
 * Tier 1: Course Coordinator (StaffAssignment where courseId = courseId, isActive = true, matching semester)
 * Tier 2: Department Head (StaffAssignment where departmentId = deptId, courseId = null, isActive = true)
 * Tier 3: School Director (User where role = DIRECTOR, isActive = true)
 */
export async function resolveAuthorityChain(
  courseId: string,
  semester?: number | null,
  workflowMode?: WorkflowMode
): Promise<AuthorityChainResolution> {
  const issues: string[] = [];

  const effectiveMode =
    workflowMode ||
    (await prisma.workflowConfiguration.findUnique({ where: { key: "DEFAULT" } }))?.mode ||
    WorkflowMode.HOD_DIRECTOR;

  // 1. Fetch course and parent department
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      department: true,
    },
  });

  if (!course) {
    return {
      courseId,
      courseName: "Unknown Course",
      courseCode: "UNKNOWN",
      totalSemesters: 0,
      academicPeriod: "ALL",
      departmentId: "",
      departmentName: "Unknown Department",
      departmentCode: "UNKNOWN",
      semester: semester ?? null,
      workflowMode: effectiveMode,
      coordinator: null,
      departmentHead: null,
      director: null,
      semesterRouting: [],
      isComplete: false,
      status: "UNRESOLVABLE",
      issues: ["Course does not exist in the database."],
    };
  }

  const totalSemesters = course.totalSemesters || 6;
  const courseAcademicPeriod = course.academicPeriod || "ALL";

  if (!course.isActive) {
    issues.push(`Course '${course.name}' (${course.code}) is inactive.`);
  }

  if (!course.department.isActive) {
    issues.push(`Parent department '${course.department.name}' (${course.department.code}) is inactive.`);
  }

  // Validate semester if provided
  if (semester !== undefined && semester !== null) {
    if (semester < 1 || semester > totalSemesters) {
      issues.push(
        `Invalid semester ${semester} for course '${course.name}'. Course has ${totalSemesters} configured semesters.`
      );
    }
  }

  // 2. Query active Course Coordinator assignments
  const coordinatorAssignments = await prisma.staffAssignment.findMany({
    where: {
      courseId: course.id,
      role: UserRole.COURSE_COORDINATOR,
      isActive: true,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  // Map each active assignment to an AuthorityNode
  const coordinatorNodes: AuthorityNode[] = coordinatorAssignments.map((a) => ({
    userId: a.user.id,
    fullName: a.user.fullName,
    email: a.user.email,
    role: a.user.role,
    isActive: a.user.isActive,
    assignmentId: a.id,
    assignedAt: a.assignedAt,
    semesters: a.semesters,
    academicPeriod: a.academicPeriod,
  }));

  // Build complete semester-by-semester routing mapping (1 .. totalSemesters)
  const semesterRouting: SemesterRoutingNode[] = [];
  for (let s = 1; s <= totalSemesters; s++) {
    const matchingAssignments = coordinatorAssignments.filter((a) =>
      assignmentMatchesSemester(a, s)
    );

    if (matchingAssignments.length === 0) {
      semesterRouting.push({
        semester: s,
        coordinator: null,
        status: "MISSING",
      });
    } else if (matchingAssignments.length === 1) {
      const match = matchingAssignments[0];
      const node: AuthorityNode = {
        userId: match.user.id,
        fullName: match.user.fullName,
        email: match.user.email,
        role: match.user.role,
        isActive: match.user.isActive,
        assignmentId: match.id,
        assignedAt: match.assignedAt,
        semesters: match.semesters,
        academicPeriod: match.academicPeriod,
      };

      semesterRouting.push({
        semester: s,
        coordinator: match.user.isActive ? node : null,
        status: match.user.isActive ? "ASSIGNED" : "MISSING",
      });
    } else {
      // Multiple active coordinators covering the same semester -> CONFLICT
      const candidateNodes: AuthorityNode[] = matchingAssignments.map((m) => ({
        userId: m.user.id,
        fullName: m.user.fullName,
        email: m.user.email,
        role: m.user.role,
        isActive: m.user.isActive,
        assignmentId: m.id,
        assignedAt: m.assignedAt,
        semesters: m.semesters,
        academicPeriod: m.academicPeriod,
      }));

      semesterRouting.push({
        semester: s,
        coordinator: null,
        status: "CONFLICT",
        candidates: candidateNodes,
      });
      issues.push(
        `Ambiguous configuration: ${matchingAssignments.length} active coordinators mapped to semester ${s} of ${course.name}.`
      );
    }
  }

  // Resolve Tier 1 Coordinator Node for this call
  let coordinatorNode: AuthorityNode | null = null;

  if (semester !== undefined && semester !== null) {
    if (semester >= 1 && semester <= totalSemesters) {
      const targetSem = semesterRouting.find((sr) => sr.semester === semester);
      if (targetSem) {
        if (targetSem.status === "CONFLICT") {
          // Conflict already recorded in issues
          coordinatorNode = null;
        } else if (targetSem.status === "ASSIGNED" && targetSem.coordinator) {
          coordinatorNode = targetSem.coordinator;
        } else {
          if (effectiveMode === WorkflowMode.COORDINATOR_HOD_DIRECTOR) {
            issues.push(`No active Course Coordinator assigned for semester ${semester} of ${course.name}.`);
          }
        }
      }
    }
  } else {
    // When no specific semester is requested (e.g. general course view, legacy calls)
    if (coordinatorAssignments.length === 0) {
      if (effectiveMode === WorkflowMode.COORDINATOR_HOD_DIRECTOR) {
        issues.push(`No active Course Coordinator assigned for ${course.name}.`);
      }
    } else {
      // Check if all semesters are covered
      const unassignedSemesters = semesterRouting.filter((sr) => sr.status !== "ASSIGNED");
      if (unassignedSemesters.length > 0 && effectiveMode === WorkflowMode.COORDINATOR_HOD_DIRECTOR) {
        const missingSems = unassignedSemesters.map((u) => u.semester).join(", ");
        issues.push(`Incomplete semester routing: semesters ${missingSems} are unassigned or conflicting for ${course.name}.`);
      }

      // If there's an all-semester coordinator or primary assignment
      const allSemAssignment = coordinatorAssignments.find((a) => a.semesters.length === 0);
      if (allSemAssignment && allSemAssignment.user.isActive) {
        coordinatorNode = coordinatorNodes.find((n) => n.assignmentId === allSemAssignment.id) || null;
      } else if (coordinatorNodes.length > 0 && coordinatorNodes[0].isActive) {
        coordinatorNode = coordinatorNodes[0];
      }
    }
  }

  // 3. Query active Department Head assignment
  const hodAssignments = await prisma.staffAssignment.findMany({
    where: {
      departmentId: course.departmentId,
      courseId: null,
      role: UserRole.DEPARTMENT_HEAD,
      isActive: true,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  let hodNode: AuthorityNode | null = null;
  if (hodAssignments.length === 0) {
    issues.push(`No active Department Head assigned for ${course.department.name}.`);
  } else {
    if (hodAssignments.length > 1) {
      issues.push(`Ambiguous configuration: ${hodAssignments.length} active Department Heads mapped to ${course.department.name}.`);
    }

    const primaryHod = hodAssignments[0];
    if (!primaryHod.user.isActive) {
      issues.push(`Assigned Department Head (${primaryHod.user.fullName}) is deactivated.`);
    } else {
      hodNode = {
        userId: primaryHod.user.id,
        fullName: primaryHod.user.fullName,
        email: primaryHod.user.email,
        role: primaryHod.user.role,
        isActive: primaryHod.user.isActive,
        assignmentId: primaryHod.id,
        assignedAt: primaryHod.assignedAt,
      };
    }
  }

  // 4. Query active School Director
  const activeDirectors = await prisma.user.findMany({
    where: {
      role: UserRole.DIRECTOR,
      isActive: true,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
  });

  let directorNode: AuthorityNode | null = null;
  if (activeDirectors.length === 0) {
    issues.push("No active Director configured for School of Basic Sciences.");
  } else {
    if (activeDirectors.length > 1) {
      issues.push(`Ambiguous configuration: ${activeDirectors.length} active Director accounts exist.`);
    }

    const primaryDir = activeDirectors[0];
    directorNode = {
      userId: primaryDir.id,
      fullName: primaryDir.fullName,
      email: primaryDir.email,
      role: primaryDir.role,
      isActive: primaryDir.isActive,
    };
  }

  // Determine completeness based on workflow mode
  let isComplete = false;
  if (effectiveMode === WorkflowMode.HOD_DIRECTOR) {
    const validSemester =
      semester === undefined ||
      semester === null ||
      (semester >= 1 && semester <= totalSemesters);

    isComplete = Boolean(
      hodNode &&
      directorNode &&
      course.isActive &&
      course.department.isActive &&
      hodAssignments.length === 1 &&
      activeDirectors.length === 1 &&
      validSemester &&
      issues.length === 0
    );
  } else {
    // COORDINATOR_HOD_DIRECTOR
    if (semester !== undefined && semester !== null) {
      isComplete = Boolean(
        coordinatorNode &&
        hodNode &&
        directorNode &&
        course.isActive &&
        course.department.isActive &&
        issues.length === 0
      );
    } else {
      const allSemestersAssigned =
        semesterRouting.length > 0 &&
        semesterRouting.every((sr) => sr.status === "ASSIGNED");

      isComplete = Boolean(
        allSemestersAssigned &&
        coordinatorNode &&
        hodNode &&
        directorNode &&
        course.isActive &&
        course.department.isActive &&
        hodAssignments.length === 1 &&
        activeDirectors.length === 1 &&
        issues.length === 0
      );
    }
  }

  const isPartial =
    effectiveMode === WorkflowMode.HOD_DIRECTOR
      ? Boolean(hodNode || directorNode)
      : Boolean(coordinatorNode || hodNode || directorNode);

  return {
    courseId: course.id,
    courseName: course.name,
    courseCode: course.code,
    totalSemesters,
    academicPeriod: courseAcademicPeriod,
    departmentId: course.department.id,
    departmentName: course.department.name,
    departmentCode: course.department.code,
    semester: semester ?? null,
    workflowMode: effectiveMode,
    coordinator: coordinatorNode,
    departmentHead: hodNode,
    director: directorNode,
    semesterRouting,
    isComplete,
    status: isComplete ? "COMPLETE" : isPartial ? "PARTIAL" : "UNRESOLVABLE",
    issues,
  };
}

/**
 * Validate all active courses across the School of Basic Sciences.
 * Returns overall system readiness report and routing matrix according to the workflow mode.
 */
export async function validateSchoolAuthorityMatrix(
  workflowMode?: WorkflowMode
): Promise<{
  allValid: boolean;
  totalCourses: number;
  completeCourses: number;
  incompleteCourses: number;
  activeDirector: AuthorityNode | null;
  workflowMode: WorkflowMode;
  chains: AuthorityChainResolution[];
}> {
  const effectiveMode =
    workflowMode ||
    (await prisma.workflowConfiguration.findUnique({ where: { key: "DEFAULT" } }))?.mode ||
    WorkflowMode.HOD_DIRECTOR;

  const courses = await prisma.course.findMany({
    where: { isActive: true },
    select: { id: true },
    orderBy: { name: "asc" },
  });

  const chains: AuthorityChainResolution[] = [];
  for (const c of courses) {
    const chain = await resolveAuthorityChain(c.id, null, effectiveMode);
    chains.push(chain);
  }

  // Get active Director
  const directorUser = await prisma.user.findFirst({
    where: { role: UserRole.DIRECTOR, isActive: true },
    select: { id: true, fullName: true, email: true, role: true, isActive: true },
  });

  const completeCount = chains.filter((c) => c.isComplete).length;
  const incompleteCount = chains.length - completeCount;

  return {
    allValid: chains.length > 0 && incompleteCount === 0 && Boolean(directorUser),
    totalCourses: chains.length,
    completeCourses: completeCount,
    incompleteCourses: incompleteCount,
    activeDirector: directorUser
      ? {
          userId: directorUser.id,
          fullName: directorUser.fullName,
          email: directorUser.email,
          role: directorUser.role,
          isActive: directorUser.isActive,
        }
      : null,
    workflowMode: effectiveMode,
    chains,
  };
}
