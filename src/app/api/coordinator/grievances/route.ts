import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guard";
import { UserRole, GrievanceStatus, GrievanceTier } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/coordinator/grievances
 * Scoped query returning only grievances for courses actively assigned to the authenticated Coordinator.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireRole([UserRole.COURSE_COORDINATOR]);

    // 1. Fetch active course assignments with semester boundaries for this coordinator
    const activeAssignments = await prisma.staffAssignment.findMany({
      where: {
        userId: user.id,
        role: UserRole.COURSE_COORDINATOR,
        isActive: true,
        courseId: { not: null },
      },
      select: { courseId: true, semesters: true, academicPeriod: true },
    });

    if (activeAssignments.length === 0) {
      return NextResponse.json({
        grievances: [],
        total: 0,
        assignedCoursesCount: 0,
      });
    }

    const assignedCourseIds = Array.from(new Set(activeAssignments.map((a) => a.courseId!)));

    // 2. Query search/filter parameters
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const tier = searchParams.get("tier")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const skip = (page - 1) * limit;

    // Build assignment scope condition (courses and their designated semesters)
    const assignmentScopeConditions = activeAssignments.map((a) => {
      if (a.semesters.length > 0) {
        return {
          courseId: a.courseId!,
          OR: [
            { semester: { in: a.semesters } },
            { semester: null },
          ],
        };
      }
      if (a.academicPeriod === "ODD") {
        return {
          courseId: a.courseId!,
          OR: [
            { semester: { in: [1, 3, 5, 7, 9, 11] } },
            { semester: null },
          ],
        };
      }
      if (a.academicPeriod === "EVEN") {
        return {
          courseId: a.courseId!,
          OR: [
            { semester: { in: [2, 4, 6, 8, 10, 12] } },
            { semester: null },
          ],
        };
      }
      return {
        courseId: a.courseId!,
      };
    });

    const andConditions: any[] = [
      { OR: assignmentScopeConditions },
    ];

    if (status && Object.values(GrievanceStatus).includes(status as any)) {
      andConditions.push({ currentStatus: status as GrievanceStatus });
    }

    if (tier && Object.values(GrievanceTier).includes(tier as any)) {
      andConditions.push({ currentTier: tier as GrievanceTier });
    }

    if (search) {
      andConditions.push({
        OR: [
          { trackingNumber: { contains: search, mode: "insensitive" } },
          { subject: { contains: search, mode: "insensitive" } },
          { student: { fullName: { contains: search, mode: "insensitive" } } },
          { student: { rollNumber: { contains: search, mode: "insensitive" } } },
        ],
      });
    }

    const where: any = { AND: andConditions };

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
      semester: g.semester,
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
      assignedCoursesCount: assignedCourseIds.length,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Coordinator queue fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch coordinator queue" }, { status: 500 });
  }
}
