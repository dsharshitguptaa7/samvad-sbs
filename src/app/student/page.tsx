import React from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { UserRole } from "@prisma/client";
import { Shield, GraduationCap, Clock, FilePlus, AlertCircle } from "lucide-react";
import Link from "next/link";

export default async function StudentDashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login?redirect=/student");
  }

  if (user.role !== UserRole.STUDENT) {
    redirect("/login?error=role_mismatch");
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-csjmu-900 to-csjmu-950 rounded-2xl p-6 sm:p-8 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
          <span>Track Lodged Cases</span>
        </Link>
      </div>

      {/* Grid of Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-csjmu-50 border border-csjmu-100 flex items-center justify-center text-csjmu-800">
            <FilePlus className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Lodge Grievance</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Submit a course-specific grievance with supporting documents for review by your Course Coordinator.
          </p>
          <span className="inline-block text-xs font-semibold text-csjmu-700 bg-csjmu-50 px-2 py-1 rounded">
            Scheduled for Phase 3
          </span>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-csjmu-50 border border-csjmu-100 flex items-center justify-center text-csjmu-800">
            <Clock className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Document Requests</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Respond to formal clarification requests and upload supplementary proofs requested by faculty.
          </p>
          <span className="inline-block text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
            No pending requests
          </span>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-csjmu-50 border border-csjmu-100 flex items-center justify-center text-csjmu-800">
            <Shield className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Security & Session</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your session is protected with encrypted HTTP-only cookies and automatic idle timeout.
          </p>
          <div className="text-[11px] text-slate-500 font-mono">
            Role Clearance: STUDENT
          </div>
        </div>
      </div>
    </div>
  );
}
