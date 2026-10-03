import React from "react";
import Link from "next/link";
import { NoticeBanner } from "@/components/NoticeBanner";
import { WorkflowSteps } from "@/components/WorkflowSteps";
import { DepartmentCard } from "@/components/DepartmentCard";
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
} from "lucide-react";

export default function HomePage() {
  const departments = [
    {
      name: "Department of Mathematics",
      code: "MATH",
      programs: ["B.Sc. Mathematics", "M.Sc. Mathematics", "Ph.D. Mathematics"],
      description:
        "Pure & Applied Mathematics, Numerical Analysis, Mathematical Modeling, and Operational Research.",
      icon: <Binary className="w-6 h-6" aria-hidden="true" />,
    },
    {
      name: "Department of Physics",
      code: "PHYS",
      programs: ["B.Sc. Physics", "M.Sc. Physics", "Ph.D. Physics"],
      description:
        "Condensed Matter Physics, Electronics, Nuclear Physics, Optics, and Advanced Experimental Laboratories.",
      icon: <Atom className="w-6 h-6" aria-hidden="true" />,
    },
    {
      name: "Department of Chemistry",
      code: "CHEM",
      programs: ["B.Sc. Chemistry", "M.Sc. Chemistry", "Ph.D. Chemistry"],
      description:
        "Organic, Inorganic, Physical, and Analytical Chemistry with state-of-the-art wet lab infrastructure.",
      icon: <FlaskConical className="w-6 h-6" aria-hidden="true" />,
    },
    {
      name: "Department of Geography",
      code: "GEOG",
      programs: ["B.A. / B.Sc. Geography", "M.A. / M.Sc. Geography"],
      description:
        "Geomorphology, Cartography, GIS & Remote Sensing, Climatology, and Regional Planning Studies.",
      icon: <Compass className="w-6 h-6" aria-hidden="true" />,
    },
    {
      name: "Department of Environmental Sciences",
      code: "ENVS",
      programs: ["M.Sc. Environmental Science", "Ph.D. Environmental Science"],
      description:
        "Ecological Conservation, Environmental Pollution & Toxicology, Waste Management, and Climate Dynamics.",
      icon: <Trees className="w-6 h-6" aria-hidden="true" />,
    },
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-csjmu-900 to-csjmu-950 text-white pt-12 pb-20 px-4 sm:px-6 lg:px-8 border-b border-csjmu-800">
        <div className="max-w-7xl mx-auto">
          {/* Top Badge */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gold-400/20 text-gold-300 border border-gold-400/30">
              <ShieldCheck className="w-4 h-4 text-gold-400" aria-hidden="true" />
              Official Portal &bull; School of Basic Sciences
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Chhatrapati Shahu Ji Maharaj University, Kanpur
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                Transparent, Multi-Tier Grievance Redressal for Basic Sciences
              </h1>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                <strong>SAMVAD</strong> connects students directly with their Course Coordinators, Department Heads, and the School Director. Every grievance is adjudicated strictly by authorized human officials through an immutable, auditable workflow.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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
                  <span>Zero Automated/AI Decisions</span>
                </div>
              </div>
            </div>

            {/* Hero Right: Quick Status / Fast Lookup Box */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl p-6 sm:p-8 text-slate-900 shadow-2xl border border-slate-200">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-csjmu-900 text-gold-400 flex items-center justify-center">
                      <Search className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Direct Status Check</h2>
                      <p className="text-xs text-slate-500">Check grievance using reference token</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    24x7
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="hero-tracking" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Grievance Tracking Number
                    </label>
                    <div className="relative">
                      <input
                        id="hero-tracking"
                        type="text"
                        placeholder="e.g. CSJMU-SBS-2026-MATH-0142"
                        className="w-full px-3.5 py-2.5 text-xs font-mono rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
                        disabled
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Sample format: CSJMU-SBS-YYYY-[DEPT]-[SEQ]
                    </p>
                  </div>

                  <Link
                    href="/track"
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-csjmu-900 hover:bg-csjmu-800 transition"
                  >
                    <span>Inspect Public Tracking View</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>

                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900">
                    <strong>Foundation Notice:</strong> Tracking lookup backend is scheduled for activation in Phase 3.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Foundation Notice Banner */}
        <NoticeBanner
          title="Foundation Stage Notice (Phase 0/1 Active)"
          message="SAMVAD Portal foundation is actively configured. Visual layouts, navigation, and accessibility scaffolds are rendered below. User registration, credential authentication, and database grievance persistence will be activated in upcoming phases. All forms are marked nonfunctional."
          variant="warning"
        />

        {/* 4 Pillars of SAMVAD */}
        <section aria-labelledby="pillars-heading" className="space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-csjmu-700 bg-csjmu-50 px-3 py-1 rounded-full border border-csjmu-100">
              Institutional Principles
            </span>
            <h2 id="pillars-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              Engineered for Fairness, Transparency & Accountability
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-csjmu-50 border border-csjmu-100 flex items-center justify-center text-csjmu-800 mb-4">
                <UserCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Automated Decisions</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Zero AI, chatbots, or algorithmic filtering. Every grievance is read, reviewed, and decided by designated SBS faculty and officers.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-csjmu-50 border border-csjmu-100 flex items-center justify-center text-csjmu-800 mb-4">
                <FileText className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Document Clarification</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Reviewing coordinators can formally request missing proofs. Students upload documents directly to their existing case file.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-csjmu-50 border border-csjmu-100 flex items-center justify-center text-csjmu-800 mb-4">
                <Clock className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Immutable Audit Trail</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Every action, internal faculty remark, status update, and tier escalation is logged with an immutable timestamp in PostgreSQL.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-csjmu-50 border border-csjmu-100 flex items-center justify-center text-csjmu-800 mb-4">
                <Lock className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Strict Data Isolation</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Course Coordinators and HoDs only see grievances in their designated department. Student grievances remain private.
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
            <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md">
              Additional departments dynamically configurable by Administrator
            </div>
          </div>

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
        </section>

        {/* FAQ & Policy Guidelines */}
        <section aria-labelledby="guidelines-heading" className="bg-white rounded-2xl p-8 border border-slate-200 space-y-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-csjmu-900 text-gold-400 flex items-center justify-center">
              <HelpCircle className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 id="guidelines-heading" className="text-xl font-bold text-slate-900">
                Grievance Lodging Guidelines & Rules
              </h2>
              <p className="text-xs text-slate-500">
                General instructions for students of the School of Basic Sciences
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700">
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">Valid Grievance Categories</h3>
              <p className="leading-relaxed">
                Academic Curriculum, Internal Assessment / Test Evaluations, Laboratory & Instrument Facilities, Departmental Fee / Receipt Issues, Faculty Mentorship, and General Administrative Services within SBS.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">Evidentiary Supporting Documents</h3>
              <p className="leading-relaxed">
                Students can attach up to 3 supporting documents (PDF, JPEG, PNG, max 5MB each). Falsification of documents attracts university disciplinary procedures under CSJMU code of conduct.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">Document Request Responding</h3>
              <p className="leading-relaxed">
                If the Course Coordinator or Department Head requests additional proofs, the student will receive an in-portal notification. The case status remains in <em>Awaiting Student Info</em> until uploaded.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">Resolution & Appeals</h3>
              <p className="leading-relaxed">
                Once a resolution is recorded by an official, the student receives the formal resolution summary. If dissatisfied, an appeal may be escalated to the next tier within the approved window.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
