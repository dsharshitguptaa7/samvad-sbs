import React from "react";
import { UserCheck, Building2, Award, ArrowRight, FileCheck, CheckCircle2 } from "lucide-react";

export function WorkflowSteps() {
  const tiers = [
    {
      step: "01",
      level: "Tier 1",
      title: "Course Coordinator",
      role: "Faculty Level Redressal",
      icon: <UserCheck className="w-5 h-5 text-csjmu-700" aria-hidden="true" />,
      accent: "from-blue-600 to-csjmu-700",
      description:
        "Initial evaluation of course-specific academic grievances. Authorized to review proofs, request supplementary documents from the student, record internal notes, resolve directly, or forward to HoD.",
      actions: ["Document Clarification Request", "Internal Faculty Remarks", "Direct Resolution", "Forward to HoD"],
    },
    {
      step: "02",
      level: "Tier 2",
      title: "Department Head (HoD)",
      role: "Departmental Adjudication",
      icon: <Building2 className="w-5 h-5 text-csjmu-700" aria-hidden="true" />,
      accent: "from-csjmu-700 to-csjmu-900",
      description:
        "Departmental oversight across all courses. Reviews escalated complaints, conducts departmental inquiries, requests further evidence, adds department findings, resolves, or refers to the School Director.",
      actions: ["Cross-Course Inquiries", "Evidence Verification", "Departmental Resolution", "Escalate to Director"],
    },
    {
      step: "03",
      level: "Tier 3",
      title: "Director SBS",
      role: "School Appellate Authority",
      icon: <Award className="w-5 h-5 text-gold-600" aria-hidden="true" />,
      accent: "from-gold-500 to-amber-600",
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
            className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-300 p-6 flex flex-col justify-between relative overflow-hidden group"
          >
            {/* Top Indicator */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${tier.accent}`} />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-400">
                    STEP {tier.step}
                  </span>
                  <span className="text-xs font-bold tracking-wider uppercase bg-csjmu-50 text-csjmu-800 px-2.5 py-0.5 rounded-full border border-csjmu-100">
                    {tier.level}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center group-hover:scale-105 group-hover:bg-csjmu-50 transition-all">
                  {tier.icon}
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 group-hover:text-csjmu-900 transition-colors">
                {tier.title}
              </h3>
              <p className="text-xs font-semibold text-csjmu-700 mt-0.5">{tier.role}</p>

              <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                {tier.description}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                Statutory Authority &amp; Actions
              </span>
              <ul className="space-y-2">
                {tier.actions.map((act) => (
                  <li key={act} className="text-xs text-slate-700 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Process Guarantee Callout */}
      <div className="bg-gradient-to-r from-csjmu-950 via-csjmu-900 to-csjmu-950 text-white rounded-xl p-5 border border-csjmu-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-gold-400">
            <FileCheck className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <strong className="text-white block font-semibold">Deterministic Accountability &amp; Immutable Audit Trail</strong>
            <span className="text-slate-300 text-[11px] mt-0.5 block">
              Every status update, document request, and officer remark is cryptographically linked with timestamped audit records. Zero algorithmic triage.
            </span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-full border border-white/15 text-gold-300 font-semibold text-[11px]">
          <span>Tier 1 (Course)</span>
          <ArrowRight className="w-3 h-3 text-gold-400" aria-hidden="true" />
          <span>Tier 2 (HoD)</span>
          <ArrowRight className="w-3 h-3 text-gold-400" aria-hidden="true" />
          <span>Tier 3 (Director)</span>
        </div>
      </div>
    </div>
  );
}
