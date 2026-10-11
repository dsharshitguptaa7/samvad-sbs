import React from "react";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { UserRole } from "@prisma/client";
import { Shield, GraduationCap, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getRoleDashboardPath } from "@/lib/auth/role-routing";
import { StudentClientDashboard } from "@/components/student/StudentClientDashboard";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login?redirect=/student");
  }

  if (user.role !== UserRole.STUDENT) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white border border-rose-200 rounded-xl text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-600 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">403 Forbidden &bull; Access Denied</h1>
        <p className="text-sm text-slate-600">
          This portal workspace is restricted exclusively to Students. Your current role is <strong>{user.role}</strong>.
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
        <AlertCircle className="w-12 h-12 text-rose-600 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">Account Deactivated</h1>
        <p className="text-sm text-slate-600">
          Your student account has been marked inactive. Please contact the School of Basic Sciences administration.
        </p>
      </div>
    );
  }

  // 1. Fetch authenticated student's grievances
  const rawGrievances = await prisma.grievance.findMany({
    where: { studentId: user.id },
    include: {
      department: { select: { name: true, code: true } },
      course: { select: { name: true, code: true } },
      documents: { select: { id: true } },
      documentRequests: {
        where: { status: "PENDING" },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedGrievances = rawGrievances.map((g) => ({
    id: g.id,
    trackingNumber: g.trackingNumber,
    subject: g.subject,
    category: g.category,
    currentTier: g.currentTier,
    currentStatus: g.currentStatus,
    createdAt: g.createdAt.toISOString(),
    departmentName: g.department.name,
    courseName: g.course.name,
    documentsCount: g.documents.length,
    pendingRequestsCount: g.documentRequests.length,
  }));

  // 2. Fetch active courses for lodging dropdown
  const activeCourses = await prisma.course.findMany({
    where: {
      isActive: true,
      department: { isActive: true },
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
    },
    orderBy: { name: "asc" },
  });

  const serializedCourses = activeCourses.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    departmentId: c.departmentId,
    departmentName: c.department.name,
    totalSemesters: c.totalSemesters,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Student Welcome Header */}
      <div className="bg-gradient-to-r from-csjmu-900 to-csjmu-950 rounded-2xl p-6 sm:p-8 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gold-400 uppercase tracking-wider mb-1">
            <GraduationCap className="w-4 h-4" />
            <span>Student Redressal Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {user.fullName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            CSJMU Roll Number: <span className="font-mono font-bold text-white">{user.rollNumber}</span> &bull; Enrollment: <span className="font-mono text-white">{user.enrollmentNo}</span>
          </p>
        </div>

        <Link
          href="/track"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 transition shadow"
        >
          <Clock className="w-4 h-4" />
          <span>Public Tracking Desk</span>
        </Link>
      </div>

      {/* Main Interactive Student Dashboard */}
      <StudentClientDashboard
        initialGrievances={serializedGrievances}
        courses={serializedCourses}
      />
    </div>
  );
}
