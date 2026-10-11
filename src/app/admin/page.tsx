import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getRoleDashboardPath } from "@/lib/auth/role-routing";
import { UserRole } from "@prisma/client";
import { AlertTriangle } from "lucide-react";
import { AdminClientDashboard } from "@/components/admin/AdminClientDashboard";

export const dynamic = "force-dynamic";

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
          Your administrator account has been marked inactive. Please contact the university administration.
        </p>
      </div>
    );
  }

  return <AdminClientDashboard userEmail={user.email} />;
}
