import React from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { UserRole } from "@prisma/client";
import { Award, Shield, AlertTriangle } from "lucide-react";

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
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="bg-csjmu-950 rounded-2xl p-6 sm:p-8 text-white border border-csjmu-800 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gold-400 uppercase tracking-wider mb-1">
            <Award className="w-4 h-4" />
            <span>Tier 3 &bull; Directorate of Basic Sciences</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Appellate Leadership Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Executive Officer: <span className="font-semibold text-white">{user.fullName}</span> &bull; {user.email}
          </p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center space-y-3">
        <Shield className="w-10 h-10 text-csjmu-800 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Tier 3 Directorate Initialized</h2>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Server-side role authorization validated for role <strong>DIRECTOR</strong>. Final institutional resolution queue will activate in Phase 5.
        </p>
      </div>
    </div>
  );
}
