import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, handleAuthError } from "@/lib/auth/guard";
import { updateDepartmentSchema } from "@/lib/auth/validation";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

/**
 * PATCH /api/admin/departments/[id]
 * Updates department details or toggles active/inactive status.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const adminUser = await requireRole([UserRole.SYSTEM_ADMIN]);
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Department ID is required." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = updateDepartmentSchema.safeParse(body);

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

    const { name, code, description, isActive } = validationResult.data;

    // Check department exists
    const existingDept = await prisma.department.findUnique({
      where: { id },
    });

    if (!existingDept) {
      return NextResponse.json(
        { success: false, error: "Department not found." },
        { status: 404 }
      );
    }

    // Check conflict if name or code is changing
    if (code && code !== existingDept.code) {
      const codeConflict = await prisma.department.findUnique({
        where: { code },
      });
      if (codeConflict && codeConflict.id !== id) {
        return NextResponse.json(
          {
            success: false,
            error: "Another department with this code already exists.",
            code: "DUPLICATE_RESOURCE",
          },
          { status: 409 }
        );
      }
    }

    if (name && name.toLowerCase() !== existingDept.name.toLowerCase()) {
      const nameConflict = await prisma.department.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          id: { not: id },
        },
      });
      if (nameConflict) {
        return NextResponse.json(
          {
            success: false,
            error: "Another department with this name already exists.",
            code: "DUPLICATE_RESOURCE",
          },
          { status: 409 }
        );
      }
    }

    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    // Atomic update and audit logging
    const updatedDept = await prisma.$transaction(async (tx) => {
      const dept = await tx.department.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(code !== undefined && { code }),
          ...(description !== undefined && { description }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      await tx.systemAuditLog.create({
        data: {
          adminUserId: adminUser.id,
          action: "DEPARTMENT_UPDATED",
          targetModel: "Department",
          targetId: dept.id,
          details: {
            previous: {
              name: existingDept.name,
              code: existingDept.code,
              isActive: existingDept.isActive,
            },
            updated: {
              name: dept.name,
              code: dept.code,
              isActive: dept.isActive,
            },
          },
          ipAddress: clientIp,
        },
      });

      return dept;
    });

    return NextResponse.json({
      success: true,
      message: `Department '${updatedDept.name}' updated successfully.`,
      department: updatedDept,
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          error: "A department with this code or name already exists.",
          code: "DUPLICATE_RESOURCE",
        },
        { status: 409 }
      );
    }
    return handleAuthError(error);
  }
}
