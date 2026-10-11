import React from "react";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { UserRole } from "@prisma/client";
import { UserCheck, Shield, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { getRoleDashboardPath } from "@/lib/auth/role-routing";
import { CoordinatorClientDashboard } from "@/components/coordinator/CoordinatorClientDashboard";

export const dynamic = "force-dynamic";

export default async function CoordinatorDashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login?redirect=/coordinator");
  }

  if (user.role !== UserRole.COURSE_COORDINATOR) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white border border-rose-200 rounded-xl text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-600 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">403 Forbidden &bull; Access Denied</h1>
        <p className="text-sm text-slate-600">
          This workspace is restricted to Course Coordinators (Tier 1). Your current role is <strong>{user.role}</strong>.
        </p>
        <div className="pt-2">
          <Link
            href={getRoleDashboardPath(user.role)}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg bg-csjmu-900 text-white hover:bg-csjmu-800"
          >
            Go to Your Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!user.isActive) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white border border-rose-200 rounded-xl text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-600 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">Account Deactivated</h1>
        <p className="text-sm text-slate-600">
          Your faculty account has been marked inactive. Please contact SBS administration.
        </p>
      </div>
    );
  }

  // 1. Fetch active course IDs for this coordinator
  const activeAssignments = await prisma.staffAssignment.findMany({
    where: {
      userId: user.id,
      role: UserRole.COURSE_COORDINATOR,
      isActive: true,
      courseId: { not: null },
    },
    include: {
      course: { select: { id: true, name: true, code: true } },
    },
  });

  const assignedCourseIds = activeAssignments
    .map((a) => a.courseId)
    .filter((id): id is string => id !== null);

  // 2. Fetch initial grievances for queue
  let rawGrievances: any[] = [];
  let total = 0;

  if (assignedCourseIds.length > 0) {
    const where = {
      courseId: { in: assignedCourseIds },
    };

    [total, rawGrievances] = await Promise.all([
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
        take: 10,
      }),
    ]);
  }

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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Workspace Header */}
      <div className="bg-csjmu-900 rounded-2xl p-6 sm:p-8 text-white border border-csjmu-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gold-400 uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4" />
            <span>Tier 1 &bull; Course Coordinator Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Assigned Course Grievance Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Officer: <span className="font-semibold text-white">{user.fullName}</span> &bull; {user.email}
          </p>
        </div>

        {/* Assigned courses summary */}
        <div className="bg-csjmu-800/80 rounded-xl px-4 py-3 border border-csjmu-700 text-xs">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Assigned Courses ({activeAssignments.length})
          </div>
          <div className="font-semibold text-white mt-0.5">
            {activeAssignments.length > 0
              ? activeAssignments.map((a) => a.course?.code).join(", ")
              : "None Assigned"}
          </div>
        </div>
      </div>

      {/* Main Interactive Coordinator Dashboard */}
      <CoordinatorClientDashboard
        initialGrievances={serializedGrievances}
        total={total}
        assignedCoursesCount={assignedCourseIds.length}
      />
    </div>
  );
}
