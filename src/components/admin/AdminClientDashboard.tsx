"use client";

import React, { useState } from "react";
import { Building, BookOpen, Shield, Users, KeyRound, Layers, Link2, GitCommit, LayoutGrid } from "lucide-react";
import { DepartmentManager } from "@/components/admin/DepartmentManager";
import { CourseManager } from "@/components/admin/CourseManager";
import { StaffManager } from "@/components/admin/StaffManager";
import { AssignmentManager } from "@/components/admin/AssignmentManager";
import { RoutingMatrixViewer } from "@/components/admin/RoutingMatrixViewer";
import { WorkflowConfigManager } from "@/components/admin/WorkflowConfigManager";
import { Sliders } from "lucide-react";

interface AdminClientDashboardProps {
  userEmail: string;
}

export function AdminClientDashboard({ userEmail }: AdminClientDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "departments" | "courses" | "staff" | "assignments" | "semester-matrix" | "routing" | "workflow" | "overview"
  >("workflow");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <div className="bg-csjmu-950 rounded-2xl p-6 sm:p-8 text-white border border-csjmu-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gold-400 uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            <span>Master Console &bull; School of Basic Sciences</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            System Administration
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Logged in as: <span className="font-mono text-white">{userEmail}</span>
          </p>
        </div>

        {/* Global tab indicator */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-csjmu-900 border border-csjmu-800 text-xs text-gold-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Authority & Routing Control Mode</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex flex-wrap gap-1 sm:gap-2" aria-label="Administration Sections">
          <button
            onClick={() => setActiveTab("staff")}
            className={`inline-flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
              activeTab === "staff"
                ? "border-csjmu-900 text-csjmu-950 bg-slate-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
            aria-current={activeTab === "staff" ? "page" : undefined}
          >
            <Users className="w-4 h-4" />
            <span>Staff Accounts</span>
          </button>

          <button
            onClick={() => setActiveTab("assignments")}
            className={`inline-flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
              activeTab === "assignments"
                ? "border-csjmu-900 text-csjmu-950 bg-slate-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
            aria-current={activeTab === "assignments" ? "page" : undefined}
          >
            <Link2 className="w-4 h-4" />
            <span>Authority Assignments</span>
          </button>

          <button
            onClick={() => setActiveTab("semester-matrix")}
            className={`inline-flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
              activeTab === "semester-matrix"
                ? "border-csjmu-900 text-csjmu-950 bg-slate-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
            aria-current={activeTab === "semester-matrix" ? "page" : undefined}
          >
            <LayoutGrid className="w-4 h-4 text-csjmu-700" />
            <span>Semester Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab("routing")}
            className={`inline-flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
              activeTab === "routing"
                ? "border-csjmu-900 text-csjmu-950 bg-slate-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
            aria-current={activeTab === "routing" ? "page" : undefined}
          >
            <GitCommit className="w-4 h-4" />
            <span>Routing Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab("workflow")}
            className={`inline-flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
              activeTab === "workflow"
                ? "border-csjmu-900 text-csjmu-950 bg-slate-50/50 text-gold-600"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
            aria-current={activeTab === "workflow" ? "page" : undefined}
          >
            <Sliders className="w-4 h-4 text-csjmu-700" />
            <span>Workflow &amp; Routing Settings</span>
          </button>

          <button
            onClick={() => setActiveTab("departments")}
            className={`inline-flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
              activeTab === "departments"
                ? "border-csjmu-900 text-csjmu-950 bg-slate-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
            aria-current={activeTab === "departments" ? "page" : undefined}
          >
            <Building className="w-4 h-4" />
            <span>Department Master</span>
          </button>

          <button
            onClick={() => setActiveTab("courses")}
            className={`inline-flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
              activeTab === "courses"
                ? "border-csjmu-900 text-csjmu-950 bg-slate-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
            aria-current={activeTab === "courses" ? "page" : undefined}
          >
            <BookOpen className="w-4 h-4" />
            <span>Course Catalog</span>
          </button>

          <button
            onClick={() => setActiveTab("overview")}
            className={`inline-flex items-center gap-2 py-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-csjmu-900 text-csjmu-950 bg-slate-50/50"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
            aria-current={activeTab === "overview" ? "page" : undefined}
          >
            <Layers className="w-4 h-4" />
            <span>System Modules</span>
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "staff" && (
          <section aria-labelledby="staff-heading" className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 id="staff-heading" className="text-lg font-bold text-slate-900">
                  Staff Authority Accounts
                </h2>
                <p className="text-xs text-slate-500">
                  Provision Course Coordinators, Department Heads, and School Director accounts. Issue one-time password setup tokens.
                </p>
              </div>
            </div>
            <StaffManager />
          </section>
        )}

        {activeTab === "assignments" && (
          <section aria-labelledby="assignments-heading" className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 id="assignments-heading" className="text-lg font-bold text-slate-900">
                  Authority Assignments & Bindings
                </h2>
                <p className="text-xs text-slate-500">
                  Map Course Coordinators to specific course offerings and Department Heads to departments. Historical tenures are archived.
                </p>
              </div>
            </div>
            <AssignmentManager initialView="TABLE" />
          </section>
        )}

        {activeTab === "semester-matrix" && (
          <section aria-labelledby="semester-matrix-heading" className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 id="semester-matrix-heading" className="text-lg font-bold text-slate-900">
                  Semester-Wise Course Coordinator Matrix
                </h2>
                <p className="text-xs text-slate-500">
                  Complete semester coverage matrix across all courses. Inspect assigned Tier 1 coordinators, odd/even presets, missing coverage, and potential conflicts.
                </p>
              </div>
            </div>
            <AssignmentManager initialView="MATRIX" />
          </section>
        )}

        {activeTab === "routing" && (
          <section aria-labelledby="routing-heading" className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 id="routing-heading" className="text-lg font-bold text-slate-900">
                  Authority Routing Matrix & Health Inspection
                </h2>
                <p className="text-xs text-slate-500">
                  Deterministic resolution of 3-tier grievance escalation chains across every academic course in the School of Basic Sciences.
                </p>
              </div>
            </div>
            <RoutingMatrixViewer />
          </section>
        )}

        {activeTab === "workflow" && (
          <section aria-labelledby="workflow-settings-heading" className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 id="workflow-settings-heading" className="text-lg font-bold text-slate-900">
                  Workflow &amp; Routing Settings
                </h2>
                <p className="text-xs text-slate-500">
                  Configure global grievance resolution routing between HOD-Direct and Coordinator multi-tier modes with pre-flight safety verification.
                </p>
              </div>
            </div>
            <WorkflowConfigManager onNavigateTab={(tab) => setActiveTab(tab as any)} />
          </section>
        )}

        {activeTab === "departments" && (
          <section aria-labelledby="departments-heading" className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 id="departments-heading" className="text-lg font-bold text-slate-900">
                  Academic Departments & Units
                </h2>
                <p className="text-xs text-slate-500">
                  Manage academic units of the School of Basic Sciences. Deactivated departments are hidden from new student onboarding.
                </p>
              </div>
            </div>
            <DepartmentManager />
          </section>
        )}

        {activeTab === "courses" && (
          <section aria-labelledby="courses-heading" className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 id="courses-heading" className="text-lg font-bold text-slate-900">
                  Course Offerings & Programs
                </h2>
                <p className="text-xs text-slate-500">
                  Manage courses tied to academic departments. View assigned Course Coordinators responsible for Tier 1 redressal.
                </p>
              </div>
            </div>
            <CourseManager onNavigateToSemesterMatrix={() => setActiveTab("semester-matrix")} />
          </section>
        )}

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-lg bg-csjmu-50 border border-csjmu-100 flex items-center justify-center text-csjmu-800">
                  <Building className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Academic Master Data</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Phase 1 active: Academic departments and course programs dynamically stored in Neon PostgreSQL with system audit logs.
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Operational
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-lg bg-csjmu-50 border border-csjmu-100 flex items-center justify-center text-csjmu-800">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Authority & Staff Management</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Phase 2 active: Provision Course Coordinators, Department Heads (HoD), and School Director with single-use setup links.
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Operational
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-lg bg-csjmu-50 border border-csjmu-100 flex items-center justify-center text-csjmu-800">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Credential Resets & Security</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Admin one-time setup token issuance, instant session revocation upon deactivation/reset, and transactional audit trails.
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Operational
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
