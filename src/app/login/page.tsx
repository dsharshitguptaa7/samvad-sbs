"use client";

import React, { useState } from "react";
import Link from "next/link";
import { NoticeBanner } from "@/components/NoticeBanner";
import {
  LogIn,
  User,
  Shield,
  KeyRound,
  GraduationCap,
  Briefcase,
  AlertCircle,
  Info,
} from "lucide-react";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<"student" | "staff">("student");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
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

      {/* Non-Functional Banner */}
      <NoticeBanner
        title="Foundation Phase Notice: Non-Functional Login"
        message="Authentication endpoints, session token signing, and Argon2id password verification will be implemented in Phase 1. Form submission is deactivated for foundation review."
        variant="warning"
      />

      {submitted && (
        <div
          role="status"
          aria-live="polite"
          className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2.5"
        >
          <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <strong>Preview Attempt Handled:</strong> Real credential authentication is not yet enabled. No fake credentials or mock auth states are active.
          </div>
        </div>
      )}

      {/* Login Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Role Selector Tabs */}
        <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200" role="tablist" aria-label="Login user type">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "student"}
            onClick={() => {
              setActiveTab("student");
              setSubmitted(false);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition ${
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
              setSubmitted(false);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition ${
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
              Access your personal grievance dashboard, view coordinator remarks, and respond to document requests.
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
              {activeTab === "student" ? "CSJMU Roll Number or Email" : "Institutional Email ID"} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="identifier"
                name="identifier"
                type="text"
                required
                placeholder={activeTab === "student" ? "e.g. 240103001 or email" : "official@csjmu.ac.in"}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                Password <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500 cursor-default">
                Forgot password?
              </span>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Enter account password"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 transition shadow-sm focus-visible:ring-csjmu-600 mt-2"
          >
            <LogIn className="w-4 h-4" aria-hidden="true" />
            <span>Sign In to {activeTab === "student" ? "Student Account" : "Staff Console"}</span>
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
