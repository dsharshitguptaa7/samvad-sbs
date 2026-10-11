"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  LogIn,
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
    <div className="max-w-md mx-auto px-4 py-10 space-y-6">
      {/* Official University Identity Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 bg-white rounded-full p-1 border border-gold-500/60 shadow-sm shrink-0 flex items-center justify-center">
            <Image
              src="/assets/csjmu-emblem.png"
              alt="CSJMU University Seal"
              width={48}
              height={48}
              priority
              className="w-full h-full object-contain"
            />
          </div>
          <div className="h-8 w-px bg-slate-300 shrink-0" aria-hidden="true" />
          <div className="w-12 h-12 rounded-full p-0.5 shrink-0 flex items-center justify-center">
            <Image
              src="/assets/samvad-emblem.png"
              alt="SAMVAD Portal Emblem"
              width={48}
              height={48}
              priority
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-serif">
            SAMVAD Portal Login
          </h1>
          <p className="text-xs font-semibold text-csjmu-800 uppercase tracking-wider mt-0.5">
            School of Basic Sciences &bull; CSJMU Kanpur
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Statutory Academic Grievance Redressal System
          </p>
        </div>
      </div>

      {/* Error / Success Alerts */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-2.5"
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
          className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-start gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <strong>Success:</strong>
            <p className="mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Login Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-5">
        {/* Role Selector Tabs */}
        <div
          className="flex rounded-md bg-slate-100 p-1 border border-slate-200"
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
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded text-xs font-bold transition cursor-pointer ${
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
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded text-xs font-bold transition cursor-pointer ${
              activeTab === "staff"
                ? "bg-white text-csjmu-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Briefcase className="w-4 h-4" aria-hidden="true" />
            <span>Faculty / Officer</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="identifier" className="block text-xs font-bold text-slate-700 mb-1">
              {activeTab === "student"
                ? "Email Address, Roll Number, or Enrollment No."
                : "Official Institutional Email Address"}
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              required
              autoComplete="username"
              placeholder={
                activeTab === "student"
                  ? "e.g. 2301234567 or student@csjmu.ac.in"
                  : "e.g. hod.math@csjmu.ac.in"
              }
              className="w-full px-3.5 py-2 text-xs rounded-md border border-slate-300 focus:border-csjmu-700 focus:ring-1 focus:ring-csjmu-700 outline-none transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-xs font-bold text-slate-700">
                Password
              </label>
              <Link
                href="/reset-password"
                className="text-[11px] text-csjmu-700 hover:text-csjmu-900 hover:underline font-medium"
              >
                Forgot Password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2 text-xs rounded-md border border-slate-300 focus:border-csjmu-700 focus:ring-1 focus:ring-csjmu-700 outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider text-csjmu-950 bg-gold-400 hover:bg-gold-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" aria-hidden="true" />
                <span>Sign In to Workspace</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center space-y-2">
          {activeTab === "student" ? (
            <p className="text-xs text-slate-600">
              New student in School of Basic Sciences?{" "}
              <Link
                href="/register"
                className="font-bold text-csjmu-800 hover:text-csjmu-950 hover:underline"
              >
                Create Student Account
              </Link>
            </p>
          ) : (
            <p className="text-[11px] text-slate-500">
              Staff, Coordinators, Department Heads &amp; Directors use their university-assigned credentials.
            </p>
          )}

          <div className="pt-2">
            <Link
              href="/track"
              className="inline-block text-xs font-medium text-slate-500 hover:text-csjmu-800 transition"
            >
              Have a Tracking Number? Track without signing in &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
