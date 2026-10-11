import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/auth/guard";
import { createAssignmentSchema } from "@/lib/auth/validation";

/**
 * GET /api/admin/assignments
 * List active and historical staff assignments with department, course, and user details.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole([UserRole.SYSTEM_ADMIN]);

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("departmentId") || "";
    const roleFilter = searchParams.get("role") || "";
    const activeOnly = searchParams.get("activeOnly") === "true";

    const whereClause: any = {};
    if (departmentId) whereClause.departmentId = departmentId;
    if (roleFilter && Object.values(UserRole).includes(roleFilter as UserRole)) {
      whereClause.role = roleFilter as UserRole;
    }
    if (activeOnly) whereClause.isActive = true;

    const assignments = await prisma.staffAssignment.findMany({
      where: whereClause,
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
        department: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true,
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { assignedAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      assignments,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("GET /api/admin/assignments error:", error);
    return NextResponse.json({ success: false, error: "Failed to load authority assignments." }, { status: 500 });
  }
}

/**
 * POST /api/admin/assignments
 * Create or replace a staff authority assignment:
 * - COURSE_COORDINATOR: mapped to departmentId + courseId.
 * - DEPARTMENT_HEAD: mapped to departmentId + null courseId. Enforces single active HoD per department.
 * - DIRECTOR: assigned as SBS Director (mapped to primary SBS department or school entity).
 *
 * When replacing an active HoD or Coordinator, marks previous active assignment as isActive = false,
 * unassignedAt = now(), preserving historical tenure.
 */
export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireRole([UserRole.SYSTEM_ADMIN]);

    const body = await request.json();
    const validationResult = createAssignmentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed.",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { userId, role, departmentId, courseId, semesters, academicPeriod } = validationResult.data;

    // 1. Validate Target User
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Staff user not found." }, { status: 404 });
    }

    if (!user.isActive) {
      return NextResponse.json({ success: false, error: "Cannot assign a deactivated staff user." }, { status: 400 });
    }

    // Target user role must match assignment role
    if (user.role !== role) {
      return NextResponse.json(
        {
          success: false,
          error: `User role (${user.role}) does not match assignment role (${role}). Update user role first if reassigned.`,
        },
        { status: 400 }
      );
    }

    // 2. Validate Department
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      return NextResponse.json({ success: false, error: "Department not found." }, { status: 404 });
    }

    if (!department.isActive) {
      return NextResponse.json({ success: false, error: "Cannot assign authority to an inactive department." }, { status: 400 });
    }

    // 3. Role-specific validation
    let targetCourse: any = null;
    if (role === UserRole.COURSE_COORDINATOR) {
      if (!courseId) {
        return NextResponse.json(
          { success: false, error: "Course Coordinator must be assigned to a specific course." },
          { status: 400 }
        );
      }

      targetCourse = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!targetCourse) {
        return NextResponse.json({ success: false, error: "Course not found." }, { status: 404 });
      }

      if (targetCourse.departmentId !== departmentId) {
        return NextResponse.json(
          { success: false, error: "Course does not belong to the selected department." },
          { status: 400 }
        );
      }

      if (!targetCourse.isActive) {
        return NextResponse.json({ success: false, error: "Cannot assign coordinator to an inactive course." }, { status: 400 });
      }
    }

    if (role === UserRole.DEPARTMENT_HEAD) {
      if (courseId) {
        return NextResponse.json(
          { success: false, error: "Department Head cannot be bound to a single course; must oversee whole department." },
          { status: 400 }
        );
      }
    }

    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    // 4. Atomic Transaction: supersede old active assignments and create new one
    const newAssignment = await prisma.$transaction(async (tx) => {
      if (role === UserRole.DEPARTMENT_HEAD) {
        // Enforce 1 active HOD per department: unassign current active HOD(s)
        await tx.staffAssignment.updateMany({
          where: {
            departmentId,
            role: UserRole.DEPARTMENT_HEAD,
            courseId: null,
            isActive: true,
          },
          data: {
            isActive: false,
            unassignedAt: new Date(),
          },
        });
      } else if (role === UserRole.COURSE_COORDINATOR && courseId) {
        const totalSemesters = targetCourse?.totalSemesters || 6;
        const normalizedSemesters = (semesters || []).filter((s) => s >= 1 && s <= totalSemesters);

        // Find existing active assignments for this course
        const existingAssignments = await tx.staffAssignment.findMany({
          where: {
            courseId,
            role: UserRole.COURSE_COORDINATOR,
            isActive: true,
          },
        });

        // Determine if an existing assignment overlaps with the new assignment's semesters
        const overlapsWithNew = (existing: { semesters: number[]; academicPeriod: string | null }) => {
          // If new assignment covers all semesters, everything overlaps
          if (normalizedSemesters.length === 0 && (!academicPeriod || academicPeriod === "ALL")) {
            return true;
          }
          // If existing assignment covers all semesters, it overlaps with any new assignment
          if (existing.semesters.length === 0 && (!existing.academicPeriod || existing.academicPeriod === "ALL")) {
            return true;
          }
          // Check semester-by-semester overlap
          for (let s = 1; s <= totalSemesters; s++) {
            const inNew = normalizedSemesters.length > 0
              ? normalizedSemesters.includes(s)
              : (academicPeriod === "ODD" ? s % 2 === 1 : (academicPeriod === "EVEN" ? s % 2 === 0 : true));
            const inExisting = existing.semesters.length > 0
              ? existing.semesters.includes(s)
              : (existing.academicPeriod === "ODD" ? s % 2 === 1 : (existing.academicPeriod === "EVEN" ? s % 2 === 0 : true));
            if (inNew && inExisting) return true;
          }
          return false;
        };

        const overlappingIds = existingAssignments
          .filter(overlapsWithNew)
          .map((a) => a.id);

        if (overlappingIds.length > 0) {
          await tx.staffAssignment.updateMany({
            where: { id: { in: overlappingIds } },
            data: {
              isActive: false,
              unassignedAt: new Date(),
            },
          });
        }
      }

      // Create new active assignment
      const created = await tx.staffAssignment.create({
        data: {
          userId,
          role,
          departmentId,
          courseId: courseId || null,
          semesters: semesters || [],
          academicPeriod: academicPeriod || null,
          isActive: true,
        },
        include: {
          user: { select: { fullName: true, email: true } },
          department: { select: { name: true, code: true } },
          course: { select: { name: true, code: true } },
        },
      });

      // Write SystemAuditLog
      await tx.systemAuditLog.create({
        data: {
          adminUserId: adminUser.id,
          action: "STAFF_AUTHORITY_ASSIGNED",
          targetModel: "StaffAssignment",
          targetId: created.id,
          details: {
            userId,
            staffName: created.user.fullName,
            role,
            departmentId,
            departmentName: created.department.name,
            courseId: courseId || null,
            courseName: created.course?.name || null,
            semesters: created.semesters,
            academicPeriod: created.academicPeriod,
          },
          ipAddress: clientIp,
        },
      });

      return created;
    });

    return NextResponse.json(
      {
        success: true,
        assignment: newAssignment,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error("POST /api/admin/assignments error:", error);
    return NextResponse.json({ success: false, error: "Failed to create authority assignment." }, { status: 500 });
  }
}
