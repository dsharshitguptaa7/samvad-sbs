import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { getRoleDashboardPath } from "@/lib/auth/role-routing";
import { NoticeBanner } from "@/components/NoticeBanner";
import { WorkflowSteps } from "@/components/WorkflowSteps";
import { DepartmentCard } from "@/components/DepartmentCard";
import { HeroTrackingCard } from "@/components/HeroTrackingCard";
import {
  ShieldCheck,
  FileText,
  Clock,
  Lock,
  ArrowRight,
  Search,
  UserCheck,
  HelpCircle,
  Binary,
  Atom,
  FlaskConical,
  Compass,
  Trees,
  GraduationCap,
  Sparkles,
  Code2,
  CheckCircle2,
  BookOpen,
} from "lucide-react";

// Server component — dynamically fetch active departments from database
export const dynamic = "force-dynamic";

function getDepartmentIcon(code: string) {
  switch (code.toUpperCase()) {
    case "MATH":
      return <Binary className="w-6 h-6" aria-hidden="true" />;
    case "PHYS":
      return <Atom className="w-6 h-6" aria-hidden="true" />;
    case "CHEM":
      return <FlaskConical className="w-6 h-6" aria-hidden="true" />;
    case "GEOG":
      return <Compass className="w-6 h-6" aria-hidden="true" />;
    case "ENVS":
      return <Trees className="w-6 h-6" aria-hidden="true" />;
    default:
      return <GraduationCap className="w-6 h-6" aria-hidden="true" />;
  }
}

export default async function HomePage() {
  const currentUser = await getSessionUser();

  // Query active departments with active courses dynamically from database
  let departments: Array<{
    name: string;
    code: string;
    programs: string[];
    description: string;
    icon: React.ReactNode;
  }> = [];

  try {
    const dbDepartments = await prisma.department.findMany({
      where: { isActive: true },
      include: {
        courses: {
          where: { isActive: true },
          select: { name: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    departments = dbDepartments.map((dept) => ({
      name: dept.name,
      code: dept.code,
      programs: dept.courses.map((c) => c.name),
      description: dept.description || "Academic programs and research laboratories in the School of Basic Sciences.",
      icon: getDepartmentIcon(dept.code),
    }));
  } catch (error) {
    console.error("Failed to fetch departments from database:", error);
  }

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-csjmu-900 via-csjmu-950 to-csjmu-950 text-white pt-12 pb-20 px-4 sm:px-6 lg:px-8 border-b border-csjmu-800 relative overflow-hidden">
        {/* Subtle background glow effect */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-gold-400/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Top Institutional Badge */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gold-400/15 text-gold-300 border border-gold-400/30 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-gold-400" aria-hidden="true" />
              Statutory Redressal Portal &bull; School of Basic Sciences
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Chhatrapati Shahu Ji Maharaj University, Kanpur
            </span>
            <span className="hidden md:inline-block w-1 h-1 rounded-full bg-slate-600" />
            <span className="text-xs text-slate-400 hidden md:inline">
              NAAC Accredited A++
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                Transparent, Multi-Tier Grievance Redressal for Basic Sciences
              </h1>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl font-normal">
                <strong>SAMVAD</strong> connects students directly with their Course Coordinators, Department Heads, and the School Director. Every grievance is adjudicated strictly by authorized human officials through an immutable, auditable workflow.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {currentUser && currentUser.isActive ? (
                  <>
                    <Link
                      href={getRoleDashboardPath(currentUser.role)}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 transition shadow-lg focus-visible:ring-white"
                    >
                      <span>Go to My Dashboard ({currentUser.role})</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>

                    <Link
                      href="/track"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold text-white bg-csjmu-800 hover:bg-csjmu-700 transition border border-csjmu-700 focus-visible:ring-white"
                    >
                      <Search className="w-4 h-4 text-gold-400" aria-hidden="true" />
                      <span>Track Grievance Status</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/register"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 transition shadow-lg focus-visible:ring-white"
                    >
                      <span>Student Registration</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>

                    <Link
                      href="/track"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-sm font-semibold text-white bg-csjmu-800 hover:bg-csjmu-700 transition border border-csjmu-700 focus-visible:ring-white"
                    >
                      <Search className="w-4 h-4 text-gold-400" aria-hidden="true" />
                      <span>Track Grievance Status</span>
                    </Link>

                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition"
                    >
                      <UserCheck className="w-4 h-4 text-slate-400" aria-hidden="true" />
                      <span>Staff Portal</span>
                    </Link>
                  </>
                )}
              </div>

              {/* Quick Policy Reassurance */}
              <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-slate-400 border-t border-csjmu-800/80">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gold-400" aria-hidden="true" />
                  <span>Confidential Student Records</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gold-400" aria-hidden="true" />
                  <span>Immutable Audit Trail</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-gold-400" aria-hidden="true" />
                  <span>Zero Automated / AI Decisions</span>
                </div>
              </div>
            </div>

            {/* Hero Right: Direct Status Check Form */}
            <div className="lg:col-span-5">
              <HeroTrackingCard />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Official Directives Notice Banner */}
        <NoticeBanner
          title="Institutional Directive & Operational Governance"
          message="SAMVAD is the statutory grievance redressal system of the School of Basic Sciences under CSJMU Regulations. All academic and administrative grievances are processed strictly through human-supervised review tiers, maintaining comprehensive audit trails and data confidentiality across all SBS departments."
          variant="info"
        />

        {/* 4 Pillars of SAMVAD */}
        <section aria-labelledby="pillars-heading" className="space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-csjmu-700 bg-csjmu-50 px-3 py-1 rounded-full border border-csjmu-100">
              Institutional Principles
            </span>
            <h2 id="pillars-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              Engineered for Fairness, Transparency &amp; Accountability
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600" />
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 mb-4 group-hover:scale-105 transition-transform">
                <UserCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Automated Decisions</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Zero AI, chatbots, or algorithmic filtering. Every grievance is read, reviewed, and decided by designated SBS faculty and officers.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 mb-4 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Document Clarification</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Reviewing coordinators can formally request missing proofs. Students upload documents directly to their existing case file.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600" />
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 mb-4 group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Immutable Audit Trail</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Every action, internal faculty remark, status update, and tier escalation is logged with an immutable timestamp in PostgreSQL.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-purple-600" />
              <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 mb-4 group-hover:scale-105 transition-transform">
                <Lock className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Strict Data Isolation</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Course Coordinators and HoDs only see grievances in their designated department. Student grievances remain strictly private.
              </p>
            </div>
          </div>
        </section>

        {/* 3-Tier Redressal Hierarchy */}
        <section id="workflow" aria-labelledby="workflow-heading" className="space-y-6 pt-4">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-csjmu-700 bg-csjmu-50 px-3 py-1 rounded-full border border-csjmu-100">
              Redressal Architecture
            </span>
            <h2 id="workflow-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              Three-Tier Redressal Workflow
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Complaints follow an orderly chain of authority. Issues are resolved at the lowest possible tier, with seamless escalation to executive leadership.
            </p>
          </div>

          <WorkflowSteps />
        </section>

        {/* Departments of School of Basic Sciences */}
        <section id="departments" aria-labelledby="departments-heading" className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-csjmu-700 bg-csjmu-50 px-3 py-1 rounded-full border border-csjmu-100">
                Academic Scope
              </span>
              <h2 id="departments-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                Departments of School of Basic Sciences
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Grievances are categorized and routed according to the student&apos;s enrolled department and course.
              </p>
            </div>
            <div className="text-xs text-slate-600 bg-slate-100 px-3.5 py-1.5 rounded-lg border border-slate-200/80 font-medium">
              Dynamically loaded from University Master Database
            </div>
          </div>

          {departments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <p className="text-sm font-semibold">No active academic departments found.</p>
              <p className="text-xs text-slate-400 mt-1">The system administrator can configure academic departments in the Admin Panel.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departments.map((dept) => (
                <DepartmentCard
                  key={dept.code}
                  name={dept.name}
                  code={dept.code}
                  programs={dept.programs}
                  description={dept.description}
                  icon={dept.icon}
                />
              ))}
            </div>
          )}
        </section>

        {/* Grievance Lodging Guidelines & Rules */}
        <section aria-labelledby="guidelines-heading" className="bg-white rounded-2xl p-8 border border-slate-200/90 space-y-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-csjmu-900 text-gold-400 flex items-center justify-center shadow-sm">
              <HelpCircle className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 id="guidelines-heading" className="text-xl font-bold text-slate-900">
                Grievance Lodging Guidelines &amp; Procedural Rules
              </h2>
              <p className="text-xs text-slate-500">
                Official statutory regulations for students and researchers of the School of Basic Sciences
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <span className="w-2 h-2 rounded-full bg-csjmu-700" />
                <h3>Valid Grievance Categories</h3>
              </div>
              <p className="leading-relaxed text-slate-600">
                Academic Curriculum, Internal Assessment / Test Evaluations, Laboratory &amp; Instrument Facilities, Departmental Fee / Receipt Issues, Faculty Mentorship, and General Administrative Services within SBS.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <span className="w-2 h-2 rounded-full bg-csjmu-700" />
                <h3>Evidentiary Supporting Documents</h3>
              </div>
              <p className="leading-relaxed text-slate-600">
                Students can attach up to 3 supporting documents (PDF, JPEG, PNG, max 5MB each). Falsification of documents attracts university disciplinary procedures under the CSJMU Code of Conduct.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <span className="w-2 h-2 rounded-full bg-csjmu-700" />
                <h3>Document Request Responding</h3>
              </div>
              <p className="leading-relaxed text-slate-600">
                If the Course Coordinator or Department Head requests additional proofs, the student will receive an in-portal notification. The case status remains in <em>Awaiting Student Info</em> until uploaded.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <span className="w-2 h-2 rounded-full bg-csjmu-700" />
                <h3>Resolution &amp; Appellate Appeals</h3>
              </div>
              <p className="leading-relaxed text-slate-600">
                Once a resolution is recorded by an official, the student receives the formal resolution summary. If dissatisfied, an appeal may be escalated to the next tier within the approved statutory window.
              </p>
            </div>
          </div>
        </section>

        {/* Portal Engineering & Innovation Credit Section */}
        <section aria-labelledby="credits-heading" className="bg-gradient-to-r from-csjmu-950 via-csjmu-900 to-csjmu-950 rounded-2xl p-8 sm:p-10 text-white shadow-xl border border-csjmu-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gold-400/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-400/10 border border-gold-400/30 text-gold-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                <span>Academic Innovation &bull; System Engineering</span>
              </div>

              <h2 id="credits-heading" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Engineered for Institutional Integrity
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed">
                SAMVAD is engineered to eliminate opaque processing and algorithmic bias in academic grievance administration. Developed in collaboration with the School of Basic Sciences, the platform pairs deterministic state transitions with cryptographic audit logging.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Deterministic Workflow</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Immutable Audit Ledger</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Strict Role-Based Scoping</span>
                </div>
              </div>
            </div>

            {/* Author Credit Card */}
            <div className="lg:col-span-4 bg-white/5 border border-white/15 rounded-xl p-5 text-center sm:text-left space-y-3 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-400">
                <Code2 className="w-4 h-4" />
                <span>System Authorship</span>
              </div>

              <div>
                <p className="text-xs text-slate-400 font-medium">Designed and Developed by</p>
                <p className="text-base font-bold text-white mt-0.5">
                  Harshit Gupta &amp; Anshika Soni
                </p>
              </div>

              <div className="pt-2 border-t border-white/10 text-xs text-slate-300 space-y-1">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-gold-400 shrink-0" />
                  <span className="font-medium text-gold-300">
                    M.Sc Mathematics with AI and DS
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 pl-6">
                  Department of Mathematics, School of Basic Sciences, CSJMU Kanpur
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
