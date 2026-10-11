import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, handleAuthError } from "@/lib/auth/guard";
import { updateCourseSchema } from "@/lib/auth/validation";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

/**
 * PATCH /api/admin/courses/[id]
 * Updates course details or toggles active status.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const adminUser = await requireRole([UserRole.SYSTEM_ADMIN]);
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Course ID is required." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = updateCourseSchema.safeParse(body);

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

    const existingCourse = await prisma.course.findUnique({
      where: { id },
      include: {
        department: true,
      },
    });

    if (!existingCourse) {
      return NextResponse.json(
        { success: false, error: "Course not found." },
        { status: 404 }
      );
    }

    const targetDeptId = departmentId || existingCourse.departmentId;
    const targetCode = code ? code.toUpperCase() : existingCourse.code;

    // Check composite uniqueness if code or department changed
    if (
      targetCode !== existingCourse.code ||
      targetDeptId !== existingCourse.departmentId
    ) {
      const conflict = await prisma.course.findUnique({
        where: {
          departmentId_code: {
            departmentId: targetDeptId,
            code: targetCode,
          },
        },
      });

      if (conflict && conflict.id !== id) {
        return NextResponse.json(
          {
            success: false,
            error: `Another course with code '${targetCode}' already exists in this department.`,
            code: "DUPLICATE_RESOURCE",
          },
          { status: 409 }
        );
      }
    }

    const clientIp =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Atomic update and audit logging
    const updatedCourse = await prisma.$transaction(async (tx) => {
      const course = await tx.course.update({
        where: { id },
        data: {
          ...(departmentId && { departmentId }),
          ...(name !== undefined && { name }),
          ...(code !== undefined && { code: code.toUpperCase() }),
          ...(programType !== undefined && { programType }),
          ...(totalSemesters !== undefined && { totalSemesters }),
          ...(academicPeriod !== undefined && { academicPeriod }),
          ...(isActive !== undefined && { isActive }),
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
          action: "COURSE_UPDATED",
          targetModel: "Course",
          targetId: course.id,
          details: {
            previous: {
              name: existingCourse.name,
              code: existingCourse.code,
              totalSemesters: existingCourse.totalSemesters,
              academicPeriod: existingCourse.academicPeriod,
              isActive: existingCourse.isActive,
              departmentId: existingCourse.departmentId,
            },
            updated: {
              name: course.name,
              code: course.code,
              totalSemesters: course.totalSemesters,
              academicPeriod: course.academicPeriod,
              isActive: course.isActive,
              departmentId: course.departmentId,
            },
          },
          ipAddress: clientIp,
        },
      });

      return course;
    });

    return NextResponse.json({
      success: true,
      message: `Course '${updatedCourse.name}' updated successfully.`,
      course: updatedCourse,
    });
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
