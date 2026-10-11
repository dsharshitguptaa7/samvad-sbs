import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, handleAuthError } from "@/lib/auth/guard";
import { createCourseSchema } from "@/lib/auth/validation";
import { UserRole } from "@prisma/client";

/**
 * GET /api/admin/courses
 * Lists all courses with department info and currently active coordinator assignments.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole([UserRole.SYSTEM_ADMIN]);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const departmentId = searchParams.get("departmentId") || "";
    const statusFilter = searchParams.get("status") || "all";

    const whereClause: any = {};

    if (query) {
      whereClause.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { code: { contains: query, mode: "insensitive" } },
        { programType: { contains: query, mode: "insensitive" } },
      ];
    }

    if (departmentId) {
      whereClause.departmentId = departmentId;
    }

    if (statusFilter === "active") {
      whereClause.isActive = true;
    } else if (statusFilter === "inactive") {
      whereClause.isActive = false;
    }

    const courses = await prisma.course.findMany({
      where: whereClause,
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true,
          },
        },
        staffAssignments: {
          where: {
            isActive: true,
            role: UserRole.COURSE_COORDINATOR,
          },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            grievances: true,
          },
        },
      },
      orderBy: [{ department: { name: "asc" } }, { name: "asc" }],
    });

    return NextResponse.json({
      success: true,
      courses: courses.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        programType: c.programType,
        totalSemesters: c.totalSemesters,
        academicPeriod: c.academicPeriod,
        isActive: c.isActive,
        department: c.department,
        assignedCoordinators: c.staffAssignments.map((sa) => ({
          ...sa.user,
          semesters: sa.semesters,
          academicPeriod: sa.academicPeriod,
          assignmentId: sa.id,
        })),
        grievanceCount: c._count.grievances,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * POST /api/admin/courses
 * Admin course creation with department relationship verification and audit logging.
 */
export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireRole([UserRole.SYSTEM_ADMIN]);

    const body = await request.json();
    const validationResult = createCourseSchema.safeParse(body);

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

    const { departmentId, name, code, programType, totalSemesters, academicPeriod, isActive } =
      validationResult.data;

    // Verify parent department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      return NextResponse.json(
        {
          success: false,
          error: "Selected department does not exist.",
          code: "INVALID_FOREIGN_KEY",
        },
        { status: 400 }
      );
    }

    // Check composite uniqueness: Course code within the same department
    const existing = await prisma.course.findUnique({
      where: {
        departmentId_code: {
          departmentId,
          code: code.toUpperCase(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `A course with code '${code.toUpperCase()}' already exists in ${department.name}.`,
          code: "DUPLICATE_RESOURCE",
        },
        { status: 409 }
      );
    }

    const clientIp =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Atomic creation and audit logging
    const createdCourse = await prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: {
          departmentId,
          name,
          code: code.toUpperCase(),
          programType: programType || null,
          totalSemesters: totalSemesters ?? 6,
          academicPeriod: academicPeriod || "ALL",
          isActive: isActive ?? true,
        },
        include: {
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      await tx.systemAuditLog.create({
        data: {
          adminUserId: adminUser.id,
          action: "COURSE_CREATED",
          targetModel: "Course",
          targetId: course.id,
          details: {
            name: course.name,
            code: course.code,
            department: department.name,
            programType: course.programType,
            totalSemesters: course.totalSemesters,
            academicPeriod: course.academicPeriod,
            isActive: course.isActive,
          },
          ipAddress: clientIp,
        },
      });

      return course;
    });

    return NextResponse.json(
      {
        success: true,
        message: `Course '${createdCourse.name}' created successfully in ${department.name}.`,
        course: createdCourse,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          error: "A course with this code already exists in this department.",
          code: "DUPLICATE_RESOURCE",
        },
        { status: 409 }
      );
    }
    return handleAuthError(error);
  }
}
