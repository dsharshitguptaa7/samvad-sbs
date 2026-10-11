import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guard";
import { UserRole, GrievanceStatus, GrievanceTier } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/director/grievances
 * Appellate queue returning grievances escalated to TIER_3_DIRECTOR (or all grievances across SBS for director overview).
 * Defaults to filtering by currentTier=TIER_3_DIRECTOR unless specified.
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole([UserRole.DIRECTOR]);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const tier = searchParams.get("tier")?.trim() || GrievanceTier.TIER_3_DIRECTOR;
    const departmentId = searchParams.get("departmentId")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (tier && Object.values(GrievanceTier).includes(tier as any)) {
      where.currentTier = tier as GrievanceTier;
    }

    if (status && Object.values(GrievanceStatus).includes(status as any)) {
      where.currentStatus = status as GrievanceStatus;
    }

    if (departmentId) {
      where.departmentId = departmentId;
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
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Director queue fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch director queue" }, { status: 500 });
  }
}
