import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, handleAuthError } from "@/lib/auth/guard";
import { createDepartmentSchema } from "@/lib/auth/validation";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/departments
 * Admin listing of all departments with course counts and audit timestamps.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole([UserRole.SYSTEM_ADMIN]);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const statusFilter = searchParams.get("status") || "all";

    const whereClause: any = {};

    if (query) {
      whereClause.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { code: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }

    if (statusFilter === "active") {
      whereClause.isActive = true;
    } else if (statusFilter === "inactive") {
      whereClause.isActive = false;
    }

    const departments = await prisma.department.findMany({
      where: whereClause,
      include: {
        courses: {
          select: {
            id: true,
            name: true,
            code: true,
            programType: true,
            isActive: true,
          },
          orderBy: { name: "asc" },
        },
        _count: {
          select: {
            courses: true,
            staffAssignments: { where: { isActive: true } },
            grievances: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      departments: departments.map((d) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        description: d.description,
        isActive: d.isActive,
        courses: d.courses,
        courseCount: d._count.courses,
        activeStaffCount: d._count.staffAssignments,
        grievanceCount: d._count.grievances,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

/**
 * POST /api/admin/departments
 * Admin department creation with uniqueness verification and audit logging.
 */
export async function POST(request: NextRequest) {
  try {
    const adminUser = await requireRole([UserRole.SYSTEM_ADMIN]);

    const body = await request.json();
    const validationResult = createDepartmentSchema.safeParse(body);

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

    // Check existing code/name before create
    const existing = await prisma.department.findFirst({
      where: {
        OR: [
          { code: code.toUpperCase() },
          { name: { equals: name, mode: "insensitive" } },
        ],
      },
    });

    if (existing) {
      const field = existing.code === code.toUpperCase() ? "code" : "name";
      return NextResponse.json(
        {
          success: false,
          error: `A department with this ${field} already exists.`,
          code: "DUPLICATE_RESOURCE",
        },
        { status: 409 }
      );
    }

    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    // Atomic creation and audit log
    const createdDept = await prisma.$transaction(async (tx) => {
      const dept = await tx.department.create({
        data: {
          name,
          code: code.toUpperCase(),
          description: description || null,
          isActive: isActive ?? true,
        },
      });

      await tx.systemAuditLog.create({
        data: {
          adminUserId: adminUser.id,
          action: "DEPARTMENT_CREATED",
          targetModel: "Department",
          targetId: dept.id,
          details: {
            name: dept.name,
            code: dept.code,
            isActive: dept.isActive,
          },
          ipAddress: clientIp,
        },
      });

      return dept;
    });

    return NextResponse.json(
      {
        success: true,
        message: `Department '${createdDept.name}' created successfully.`,
        department: createdDept,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(", ")
        : error.meta?.target || "unique field";
      return NextResponse.json(
        {
          success: false,
          error: `A department with this ${target} already exists.`,
          code: "DUPLICATE_RESOURCE",
        },
        { status: 409 }
      );
    }
    return handleAuthError(error);
  }
}
