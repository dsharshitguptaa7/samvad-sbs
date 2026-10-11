"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  LogIn,
  Shield,
  GraduationCap,
  Briefcase,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { getRoleDashboardPath } from "@/lib/auth/role-routing";

interface LoginFormProps {
  initialRedirect?: string;
  initialError?: string;
}

export function LoginForm({ initialRedirect, initialError }: LoginFormProps) {
  const searchParams = useSearchParams();
  const redirectTarget = initialRedirect || searchParams.get("redirect") || "";
  const errorParam = initialError || searchParams.get("error") || "";

  const [activeTab, setActiveTab] = useState<"student" | "staff">("student");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    if (errorParam === "role_mismatch") {
      return "Access restricted: The requested area requires different privileges. Please sign in with an authorized account.";
    }
    return null;
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const identifier = formData.get("identifier");
    const password = formData.get("password");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password,
          portalType: activeTab,
          redirect: redirectTarget || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || "Authentication failed. Please verify your credentials.");
        setLoading(false);
        return;
      }

      setSuccessMessage("Authenticated successfully! Loading portal workspace...");

      // Authoritative redirect using full document navigation to guarantee clean session sync
      const destination = data.redirectUrl || getRoleDashboardPath(data.user?.role);
      setTimeout(() => {
        window.location.href = destination;
      }, 400);
    } catch {
      setErrorMessage("Network error occurred during login. Please check server connectivity.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-6">
      {/* Page Title */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 mx-auto rounded-xl bg-csjmu-900 border border-csjmu-800 flex items-center justify-center text-gold-400 shadow-md">
          <Shield className="w-7 h-7" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          SAMVAD Portal Sign In
        </h1>
        <p className="text-xs text-slate-600">
          School of Basic Sciences &bull; CSJMU Kanpur
        </p>
      </div>

      {/* Error / Success Alerts */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <strong>Sign In Failed:</strong>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <strong>Success:</strong>
            <p className="mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Login Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Role Selector Tabs */}
        <div
          className="flex rounded-lg bg-slate-100 p-1 border border-slate-200"
          role="tablist"
          aria-label="Login user type"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "student"}
            onClick={() => {
              setActiveTab("student");
              setErrorMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition cursor-pointer ${
              activeTab === "student"
                ? "bg-white text-csjmu-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <GraduationCap className="w-4 h-4" aria-hidden="true" />
            <span>Student Portal</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "staff"}
            onClick={() => {
              setActiveTab("staff");
              setErrorMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition cursor-pointer ${
              activeTab === "staff"
                ? "bg-white text-csjmu-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Briefcase className="w-4 h-4" aria-hidden="true" />
            <span>Faculty & Staff</span>
          </button>
        </div>

        {/* Tab Description */}
        <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-100">
          {activeTab === "student" ? (
            <p>
              Access your student grievance dashboard, view coordinator remarks, and respond to document requests.
            </p>
          ) : (
            <p>
              Authorized access for <strong>Course Coordinators</strong>, <strong>Department Heads</strong>, <strong>Director SBS</strong>, and <strong>Administrators</strong>.
            </p>
          )}
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="identifier" className="block text-xs font-semibold text-slate-700 mb-1">
              {activeTab === "student" ? "CSJMU Roll Number or Email" : "Institutional Email ID"}{" "}
              <span className="text-rose-500">*</span>
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              required
              placeholder={activeTab === "student" ? "e.g. 240103001 or email" : "official@csjmu.ac.in"}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                Password <span className="text-rose-500">*</span>
              </label>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="Enter account password"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 transition shadow-sm focus-visible:ring-csjmu-600 disabled:opacity-50 cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" aria-hidden="true" />
                <span>Sign In to {activeTab === "student" ? "Student Account" : "Staff Console"}</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Info */}
        <div className="pt-4 border-t border-slate-100 text-center space-y-2 text-xs">
          {activeTab === "student" ? (
            <p className="text-slate-600">
              New to SBS SAMVAD?{" "}
              <Link href="/register" className="text-csjmu-800 font-bold hover:underline">
                Register as Student
              </Link>
            </p>
          ) : (
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Faculty and officer accounts are managed by the System Administrator. Contact SBS IT Office for initial credentials.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
