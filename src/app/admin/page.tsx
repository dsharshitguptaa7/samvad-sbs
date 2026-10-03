import React from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { UserRole } from "@prisma/client";
import { Shield, Users, Building, KeyRound, AlertTriangle } from "lucide-react";

export default async function AdminDashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login?redirect=/admin");
  }

  if (user.role !== UserRole.SYSTEM_ADMIN) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white border border-rose-200 rounded-xl text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-600 mx-auto" />
        <h1 className="text-xl font-bold text-slate-900">403 Forbidden &bull; Access Denied</h1>
        <p className="text-sm text-slate-600">
          This administration console is restricted exclusively to System Administrators. Your current role is <strong>{user.role}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="bg-csjmu-950 rounded-2xl p-6 sm:p-8 text-white border border-csjmu-800 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gold-400 uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            <span>Master Console &bull; School of Basic Sciences</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            System Administration
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Logged in as: <span className="font-mono text-white">{user.email}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-csjmu-50 border border-csjmu-100 flex items-center justify-center text-csjmu-800">
            <Building className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Department Master</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Manage academic units (Mathematics, Physics, Chemistry, Geography, Environmental Sciences) and course programs.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-csjmu-50 border border-csjmu-100 flex items-center justify-center text-csjmu-800">
            <Users className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Staff Onboarding & Roles</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Provision Course Coordinators, Department Heads, and Director accounts with departmental bindings.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-lg bg-csjmu-50 border border-csjmu-100 flex items-center justify-center text-csjmu-800">
            <KeyRound className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Security & Credential Resets</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Perform administrative password resets with forced reset flags and inspect system audit logs.
          </p>
        </div>
      </div>
    </div>
  );
}
