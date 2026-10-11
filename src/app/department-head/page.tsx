import React from "react";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { UserRole } from "@prisma/client";
import { Building2, Shield, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { getRoleDashboardPath } from "@/lib/auth/role-routing";
import { HodClientDashboard } from "@/components/department-head/HodClientDashboard";

export const dynamic = "force-dynamic";

export default async function DepartmentHeadDashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login?redirect=/department-head");
  }

  if (user.role !== UserRole.DEPARTMENT_HEAD) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white border border-rose-200 rounded-xl text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-600 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">403 Forbidden &bull; Access Denied</h1>
        <p className="text-sm text-slate-600">
          This workspace is restricted to Department Heads (Tier 2). Your current role is <strong>{user.role}</strong>.
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

  // 1. Fetch active department assignment for this HoD
  const activeAssignments = await prisma.staffAssignment.findMany({
    where: {
      userId: user.id,
      role: UserRole.DEPARTMENT_HEAD,
      isActive: true,
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
    },
  });

  const assignedDepartmentIds = activeAssignments.map((a) => a.departmentId);

  // 2. Fetch initial grievances for queue
  let rawGrievances: any[] = [];
  let total = 0;

  if (assignedDepartmentIds.length > 0) {
    const where = {
      departmentId: { in: assignedDepartmentIds },
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

  const initialGrievances = rawGrievances.map((g) => ({
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

  const departmentNames = activeAssignments
    .map((a) => `${a.department?.name} (${a.department?.code})`)
    .join(", ");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="bg-csjmu-900 rounded-2xl p-6 sm:p-8 text-white border border-csjmu-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gold-400 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Tier 2 &bull; Department Head Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Departmental Adjudication Workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Department Head: <span className="font-semibold text-white">{user.fullName}</span> &bull; {user.email}
          </p>
        </div>

        <div className="bg-csjmu-800/80 border border-csjmu-700 p-4 rounded-xl text-xs space-y-1 w-full md:w-auto">
          <p className="text-gold-400 font-bold uppercase tracking-wider text-[10px]">
            Assigned Department Jurisdiction
          </p>
          <p className="font-semibold text-white">
            {departmentNames || "No Department Assigned"}
          </p>
          <p className="text-slate-300 text-[11px]">
            Total Departmental Grievances: <strong>{total}</strong>
          </p>
        </div>
      </div>

      {/* Main Interactive Table & Workflows */}
      <HodClientDashboard
        initialGrievances={initialGrievances}
        total={total}
        assignedDepartmentsCount={assignedDepartmentIds.length}
      />
    </div>
  );
}
