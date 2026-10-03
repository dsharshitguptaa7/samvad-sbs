import React from "react";
import { UserCheck, Building2, Award, ArrowRight, FileCheck, CheckCircle2 } from "lucide-react";

export function WorkflowSteps() {
  const tiers = [
    {
      level: "Tier 1",
      title: "Course Coordinator",
      role: "Faculty Level Redressal",
      icon: <UserCheck className="w-6 h-6 text-csjmu-700" aria-hidden="true" />,
      description:
        "Initial evaluation of course-specific academic grievances. Authorized to review proofs, request supplementary documents from the student, record internal notes, resolve at the course level, or forward to HoD.",
      actions: ["Document Clarification Request", "Internal Faculty Remarks", "Direct Resolution", "Forward to HoD"],
    },
    {
      level: "Tier 2",
      title: "Department Head (HoD)",
      role: "Departmental Adjudication",
      icon: <Building2 className="w-6 h-6 text-csjmu-700" aria-hidden="true" />,
      description:
        "Departmental oversight across all courses. Reviews escalated complaints, conducts departmental inquiries, requests further evidence, adds department findings, resolves, or refers to the School Director.",
      actions: ["Cross-Course Inquiries", "Evidence Verification", "Departmental Resolution", "Escalate to Director"],
    },
    {
      level: "Tier 3",
      title: "Director SBS",
      role: "School Appellate Authority",
      icon: <Award className="w-6 h-6 text-csjmu-700" aria-hidden="true" />,
      description:
        "Highest authority within the School of Basic Sciences. Reviews escalated petitions, convenes academic grievance hearings, provides executive directives, and issues final institutional resolution.",
      actions: ["Appellate Review", "Executive Directives", "Final Institutional Resolution", "Statutory Closure"],
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {tiers.map((tier, idx) => (
          <div
            key={tier.level}
            className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 flex flex-col justify-between relative overflow-hidden"
          >
            {/* Top Indicator */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-csjmu-700 to-csjmu-900" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold tracking-widest uppercase bg-csjmu-50 text-csjmu-800 px-2.5 py-1 rounded border border-csjmu-100">
                  {tier.level}
                </span>
                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                  {tier.icon}
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900">{tier.title}</h3>
              <p className="text-xs font-semibold text-csjmu-700 mt-0.5">{tier.role}</p>

              <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                {tier.description}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                Permitted Actions
              </span>
              <ul className="space-y-1.5">
                {tier.actions.map((act) => (
                  <li key={act} className="text-xs text-slate-700 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-csjmu-600 shrink-0" aria-hidden="true" />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Process Guarantee Callout */}
      <div className="bg-slate-100 rounded-lg p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-700">
        <div className="flex items-center gap-3">
          <FileCheck className="w-5 h-5 text-csjmu-800 shrink-0" aria-hidden="true" />
          <span>
            <strong>Deterministic Accountability:</strong> Every remark, transition, and document request creates an immutable, timestamped audit log. Zero automated triage or AI filtering.
          </span>
        </div>
        <div className="shrink-0 flex items-center gap-1.5 text-csjmu-800 font-semibold">
          <span>Tier 1</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Tier 2</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Tier 3</span>
        </div>
      </div>
    </div>
  );
}
