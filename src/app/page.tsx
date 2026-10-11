import React from "react";
import Link from "next/link";
import Image from "next/image";
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
  Award,
} from "lucide-react";

// Server component — dynamically fetch active departments from database
export const dynamic = "force-dynamic";

function getDepartmentIcon(code: string) {
  switch (code.toUpperCase()) {
    case "MATH":
      return <Binary className="w-5 h-5" aria-hidden="true" />;
    case "PHYS":
      return <Atom className="w-5 h-5" aria-hidden="true" />;
    case "CHEM":
      return <FlaskConical className="w-5 h-5" aria-hidden="true" />;
    case "GEOG":
      return <Compass className="w-5 h-5" aria-hidden="true" />;
    case "ENVS":
      return <Trees className="w-5 h-5" aria-hidden="true" />;
    default:
      return <GraduationCap className="w-5 h-5" aria-hidden="true" />;
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
    <div className="space-y-12 pb-16">
      {/* Official Institutional Hero Section */}
      <section className="bg-csjmu-900 text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8 border-b-4 border-gold-500 relative">
        <div className="max-w-7xl mx-auto">
          {/* Top Institutional Seal Badge */}
          <div className="flex flex-wrap items-center gap-2.5 mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold bg-csjmu-950 border border-csjmu-700 text-gold-300 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-gold-400 shrink-0" aria-hidden="true" />
              <span>Statutory Portal &bull; School of Basic Sciences</span>
            </span>
            <span className="text-xs text-slate-300 hidden sm:inline">
              Chhatrapati Shahu Ji Maharaj University, Kanpur
            </span>
            <span className="hidden md:inline-block w-1 h-1 rounded-full bg-slate-500" />
            <span className="text-xs text-gold-400 hidden md:inline font-medium">
              NAAC Accredited A++
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-6">
              {/* Emblems Masthead Display */}
              <div className="flex items-center gap-3 pb-1">
                <div className="w-14 h-14 bg-white rounded-full p-1 border border-gold-400 shadow-md shrink-0 flex items-center justify-center">
                  <Image
                    src="/assets/csjmu-emblem.png"
                    alt="CSJMU University Seal"
                    width={56}
                    height={56}
                    priority
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="h-10 w-px bg-white/20 shrink-0" aria-hidden="true" />
                <div className="w-14 h-14 rounded-full p-0.5 shrink-0 flex items-center justify-center">
                  <Image
                    src="/assets/samvad-emblem.png"
                    alt="SAMVAD Portal Emblem"
                    width={56}
                    height={56}
                    priority
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="pl-1">
                  <p className="text-xs font-bold text-gold-400 uppercase tracking-wider">
                    School of Basic Sciences
                  </p>
                  <p className="text-sm font-semibold text-white">
                    Grievance Redressal &amp; Appellate Mechanism
                  </p>
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white font-serif">
                Transparent, Multi-Tier Academic Redressal
              </h1>

              <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl font-normal">
                <strong>SAMVAD</strong> connects students directly with their designated Course Coordinators, Department Heads, and the School Director. Every grievance is adjudicated strictly by authorized human faculty through an immutable, auditable statutory workflow.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {currentUser && currentUser.isActive ? (
                  <>
                    <Link
                      href={getRoleDashboardPath(currentUser.role)}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 transition shadow-sm focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <span>Go to My Dashboard ({currentUser.role.replace(/_/g, " ")})</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>

                    <Link
                      href="/track"
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md text-sm font-semibold text-white bg-csjmu-800 hover:bg-csjmu-750 transition border border-csjmu-700 focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <Search className="w-4 h-4 text-gold-400" aria-hidden="true" />
                      <span>Track Grievance</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/register"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 transition shadow-sm focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <span>Student Registration</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>

                    <Link
                      href="/track"
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md text-sm font-semibold text-white bg-csjmu-800 hover:bg-csjmu-750 transition border border-csjmu-700 focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <Search className="w-4 h-4 text-gold-400" aria-hidden="true" />
                      <span>Track Status</span>
                    </Link>

                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium text-slate-200 hover:text-white hover:bg-white/10 transition"
                    >
                      <UserCheck className="w-4 h-4 text-slate-300" aria-hidden="true" />
                      <span>Official Staff Login</span>
                    </Link>
                  </>
                )}
              </div>

              {/* Quick Policy Badges */}
              <div className="pt-4 flex flex-wrap items-center gap-5 text-xs text-slate-300 border-t border-csjmu-800">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-gold-400" aria-hidden="true" />
                  <span>Confidential Student Records</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-gold-400" aria-hidden="true" />
                  <span>Immutable Audit Ledger</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-gold-400" aria-hidden="true" />
                  <span>Zero Automated/Bot Decisions</span>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        {/* Official Directives Notice Banner */}
        <NoticeBanner
          title="Statutory Directive &amp; Operational Governance"
          message="SAMVAD is the official grievance redressal system of the School of Basic Sciences under CSJMU Regulations. All academic and administrative grievances are processed strictly through human-supervised review tiers, maintaining comprehensive audit trails and data confidentiality across all SBS departments."
          variant="info"
        />

        {/* 4 Pillars of SAMVAD */}
        <section aria-labelledby="pillars-heading" className="space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-csjmu-800 bg-slate-100 px-3 py-1 rounded border border-slate-200">
              Institutional Principles
            </span>
            <h2 id="pillars-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              Engineered for Fairness, Transparency &amp; Accountability
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-csjmu-800" />
              <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-csjmu-800 mb-3">
                <UserCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Automated Decisions</h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Zero AI, chatbots, or algorithmic filtering. Every grievance is evaluated and resolved directly by designated SBS faculty and officers.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gold-500" />
              <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-gold-600 mb-3">
                <FileText className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Document Clarification</h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Reviewing coordinators can formally request missing proofs. Students upload supplementary documents directly to their existing case file.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600" />
              <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-emerald-700 mb-3">
                <Clock className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Immutable Audit Trail</h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Every action, internal faculty remark, status update, and tier escalation is logged with an immutable timestamp in PostgreSQL.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-csjmu-900" />
              <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-csjmu-900 mb-3">
                <Lock className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Strict Data Isolation</h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Course Coordinators and HoDs only see grievances in their designated department. Student grievances remain strictly private.
              </p>
            </div>
          </div>
        </section>

        {/* 3-Tier Redressal Hierarchy */}
        <section id="workflow" aria-labelledby="workflow-heading" className="space-y-6 pt-2">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-csjmu-800 bg-slate-100 px-3 py-1 rounded border border-slate-200">
              Redressal Architecture
            </span>
            <h2 id="workflow-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              Three-Tier Redressal Workflow
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              Petitions follow an orderly statutory chain of authority. Issues are resolved at the lowest possible tier, with seamless escalation to executive leadership.
            </p>
          </div>

          <WorkflowSteps />
        </section>

        {/* Departments of School of Basic Sciences */}
        <section id="departments" aria-labelledby="departments-heading" className="space-y-6 pt-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-csjmu-800 bg-slate-100 px-3 py-1 rounded border border-slate-200">
                Academic Jurisdiction
              </span>
              <h2 id="departments-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                Departments of School of Basic Sciences
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Grievances are categorized and routed according to the student&apos;s enrolled department and course.
              </p>
            </div>
            <div className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded border border-slate-200 font-medium">
              Synchronized from University Master Database
            </div>
          </div>

          {departments.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
              <p className="text-sm font-semibold">No active academic departments found.</p>
              <p className="text-xs text-slate-400 mt-1">Departments can be configured in the Administration Console.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
        <section aria-labelledby="guidelines-heading" className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200 space-y-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-csjmu-900 text-gold-400 flex items-center justify-center shadow-sm">
              <HelpCircle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="guidelines-heading" className="text-lg sm:text-xl font-bold text-slate-900">
                Grievance Lodging Guidelines &amp; Procedural Rules
              </h2>
              <p className="text-xs text-slate-500">
                Official statutory regulations for students and researchers of the School of Basic Sciences
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-slate-700">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <span className="w-2 h-2 rounded-full bg-csjmu-700" />
                <h3>Valid Grievance Categories</h3>
              </div>
              <p className="leading-relaxed text-slate-600">
                Academic Curriculum, Internal Assessment / Test Evaluations, Laboratory &amp; Instrument Facilities, Departmental Fee / Receipt Issues, Faculty Mentorship, and General Administrative Services within SBS.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <span className="w-2 h-2 rounded-full bg-csjmu-700" />
                <h3>Evidentiary Supporting Documents</h3>
              </div>
              <p className="leading-relaxed text-slate-600">
                Students can attach up to 3 supporting documents (PDF, JPEG, PNG, WebP, max 5MB each). Falsification of documents attracts university disciplinary procedures under the CSJMU Code of Conduct.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <span className="w-2 h-2 rounded-full bg-csjmu-700" />
                <h3>Document Request Responses</h3>
              </div>
              <p className="leading-relaxed text-slate-600">
                If the Course Coordinator or Department Head requests additional proofs, the student will receive an in-portal notification. The case status remains in <em>Awaiting Student Info</em> until uploaded.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <span className="w-2 h-2 rounded-full bg-csjmu-700" />
                <h3>Resolution &amp; Appellate Escalations</h3>
              </div>
              <p className="leading-relaxed text-slate-600">
                Once a resolution is recorded by an official, the student receives the formal resolution summary. If dissatisfied, an appeal may be escalated to the next tier within the approved statutory window.
              </p>
            </div>
          </div>
        </section>

        {/* Portal Engineering & Innovation Credit Section */}
        <section aria-labelledby="credits-heading" className="bg-csjmu-950 rounded-xl p-6 sm:p-8 text-white shadow-sm border border-csjmu-800 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-csjmu-900 border border-csjmu-800 text-gold-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                <span>Academic Innovation &bull; System Engineering</span>
              </div>

              <h2 id="credits-heading" className="text-xl sm:text-2xl font-bold tracking-tight text-white font-serif">
                Engineered for Institutional Integrity
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                SAMVAD is engineered to eliminate opaque processing and algorithmic bias in academic grievance administration. Developed in collaboration with the School of Basic Sciences, the platform pairs deterministic state transitions with cryptographic audit logging.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 bg-csjmu-900 px-3 py-1.5 rounded border border-csjmu-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Deterministic Workflow</span>
                </div>
                <div className="flex items-center gap-1.5 bg-csjmu-900 px-3 py-1.5 rounded border border-csjmu-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Immutable Audit Ledger</span>
                </div>
                <div className="flex items-center gap-1.5 bg-csjmu-900 px-3 py-1.5 rounded border border-csjmu-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Strict Role-Based Scoping</span>
                </div>
              </div>
            </div>

            {/* Author Credit Card */}
            <div className="lg:col-span-4 bg-csjmu-900 border border-csjmu-800 rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-400">
                <Code2 className="w-4 h-4" />
                <span>System Authorship</span>
              </div>

              <div>
                <p className="text-xs text-slate-400 font-medium">Designed and Developed by</p>
                <p className="text-sm sm:text-base font-bold text-white mt-0.5">
                  Harshit Gupta &amp; Anshika Soni
                </p>
              </div>

              <div className="pt-2 border-t border-csjmu-800 text-xs text-slate-300 space-y-1">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-gold-400 shrink-0" />
                  <span className="font-semibold text-gold-300">
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
