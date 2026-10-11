import React from "react";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { UserRole, GrievanceTier } from "@prisma/client";
import { Award, Shield, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { getRoleDashboardPath } from "@/lib/auth/role-routing";
import { DirectorClientDashboard } from "@/components/director/DirectorClientDashboard";

export const dynamic = "force-dynamic";

export default async function DirectorDashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login?redirect=/director");
  }

  if (user.role !== UserRole.DIRECTOR) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white border border-rose-200 rounded-xl text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-600 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">403 Forbidden &bull; Access Denied</h1>
        <p className="text-sm text-slate-600">
          This workspace is restricted to the Director, School of Basic Sciences (Tier 3). Your current role is <strong>{user.role}</strong>.
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
          Your director account has been marked inactive. Please contact system administrator.
        </p>
      </div>
    );
  }

  // 1. Fetch initial escalated grievances for Director queue (defaults to Tier 3)
  const where = {
    currentTier: GrievanceTier.TIER_3_DIRECTOR,
  };

  const [totalEscalated, rawGrievances, totalSchoolGrievances] = await Promise.all([
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
    prisma.grievance.count(),
  ]);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="bg-csjmu-950 rounded-2xl p-6 sm:p-8 text-white border border-csjmu-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gold-400 uppercase tracking-wider mb-1">
            <Award className="w-4 h-4" />
            <span>Tier 3 &bull; Directorate of Basic Sciences</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Appellate Leadership Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            School Director: <span className="font-semibold text-white">{user.fullName}</span> &bull; {user.email}
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="bg-csjmu-900 border border-csjmu-800 p-3.5 rounded-xl text-xs space-y-0.5 flex-1 md:flex-initial">
            <p className="text-rose-400 font-bold uppercase tracking-wider text-[10px]">
              Active Tier 3 Appeals
            </p>
            <p className="font-extrabold text-xl text-white">
              {totalEscalated}
            </p>
          </div>
          <div className="bg-csjmu-900 border border-csjmu-800 p-3.5 rounded-xl text-xs space-y-0.5 flex-1 md:flex-initial">
            <p className="text-gold-400 font-bold uppercase tracking-wider text-[10px]">
              Total School Cases
            </p>
            <p className="font-extrabold text-xl text-white">
              {totalSchoolGrievances}
            </p>
          </div>
        </div>
      </div>

      {/* Main Interactive Table & Workflows */}
      <DirectorClientDashboard
        initialGrievances={initialGrievances}
        total={totalEscalated}
      />
    </div>
  );
}
