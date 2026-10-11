import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guard";
import { UserRole, GrievanceStatus, GrievanceTier } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/department-head/grievances
 * Scoped query returning only grievances for the department actively assigned to the authenticated HoD.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireRole([UserRole.DEPARTMENT_HEAD]);

    // 1. Fetch active department assignment for this HoD
    const activeAssignments = await prisma.staffAssignment.findMany({
      where: {
        userId: user.id,
        role: UserRole.DEPARTMENT_HEAD,
        isActive: true,
      },
      select: { departmentId: true },
    });

    const assignedDepartmentIds = activeAssignments
      .map((a) => a.departmentId)
      .filter((id): id is string => id !== null);

    if (assignedDepartmentIds.length === 0) {
      return NextResponse.json({
        grievances: [],
        total: 0,
        assignedDepartmentsCount: 0,
      });
    }

    // 2. Query search/filter parameters
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const tier = searchParams.get("tier")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const skip = (page - 1) * limit;

    const where: any = {
      departmentId: { in: assignedDepartmentIds },
    };

    if (status && Object.values(GrievanceStatus).includes(status as any)) {
      where.currentStatus = status as GrievanceStatus;
    }

    if (tier && Object.values(GrievanceTier).includes(tier as any)) {
      where.currentTier = tier as GrievanceTier;
    }

    if (search) {
      where.OR = [
        { trackingNumber: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { student: { fullName: { contains: search, mode: "insensitive" } } },
        { student: { rollNumber: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [total, rawGrievances] = await Promise.all([
      prisma.grievance.count({ where }),
      prisma.grievance.findMany({
        where,
        include: {
          department: { select: { name: true, code: true } },
          course: { select: { name: true, code: true } },
          student: {
            select: {
              fullName: true,
              email: true,
              rollNumber: true,
              enrollmentNo: true,
            },
          },
          documents: { select: { id: true } },
          documentRequests: {
            where: { status: "PENDING" },
            select: { id: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const serializedGrievances = rawGrievances.map((g) => ({
      id: g.id,
      trackingNumber: g.trackingNumber,
      subject: g.subject,
      category: g.category,
      currentTier: g.currentTier,
      currentStatus: g.currentStatus,
      createdAt: g.createdAt.toISOString(),
      studentName: g.student.fullName,
      studentEmail: g.student.email,
      studentRollNumber: g.student.rollNumber,
      departmentName: g.department.name,
      courseName: g.course.name,
      documentsCount: g.documents.length,
      pendingRequestsCount: g.documentRequests.length,
    }));

    return NextResponse.json({
      grievances: serializedGrievances,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      assignedDepartmentsCount: assignedDepartmentIds.length,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("HOD queue fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch HOD queue" }, { status: 500 });
  }
}
