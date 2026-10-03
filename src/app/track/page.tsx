"use client";

import React, { useState } from "react";
import { NoticeBanner } from "@/components/NoticeBanner";
import {
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  Building2,
  Award,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export default function TrackGrievancePage() {
  const [token, setToken] = useState("CSJMU-SBS-2026-MATH-0142");
  const [showDemoTimeline, setShowDemoTimeline] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDemoTimeline(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-csjmu-800 uppercase tracking-wider mb-2">
          <Search className="w-4 h-4 text-csjmu-700" aria-hidden="true" />
          <span>Grievance Transparency Desk</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Track Grievance Redressal Status
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter your unique tracking token to inspect real-time progress across review tiers without logging in.
        </p>
      </div>

      {/* Notice Banner */}
      <NoticeBanner
        title="Foundation Phase Notice: Non-Functional Search Backend"
        message="Live database queries against the PostgreSQL grievance ledger will be linked in Phase 3 (Student Grievance Lodging & Timeline). The search below demonstrates the public milestone timeline component layout."
        variant="warning"
      />

      {/* Search Input Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label htmlFor="trackingId" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Grievance Tracking Number <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  id="trackingId"
                  name="trackingId"
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="e.g. CSJMU-SBS-2026-MATH-0142"
                  className="w-full px-4 py-3 text-sm font-mono rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 transition shadow-sm focus-visible:ring-csjmu-600 shrink-0"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
                <span>Search Tracking Record</span>
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Format: <span className="font-mono">CSJMU-SBS-YYYY-[DEPT_CODE]-[SEQ]</span>
            </p>
          </div>
        </form>
      </div>

      {/* Empty State vs Mock Timeline Demonstration */}
      {!showDemoTimeline ? (
        <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
            <FileText className="w-6 h-6" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">No Query Executed</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click &quot;Search Tracking Record&quot; above to preview how public grievance milestones, tier escalations, and official public remarks will be rendered.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Layout Demo Alert */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
            <span>
              <strong>Sample Layout Preview:</strong> The timeline below illustrates the public audit display for a grievance in the School of Basic Sciences.
            </span>
          </div>

          {/* Grievance Summary Header */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono font-bold text-csjmu-800 bg-csjmu-50 px-2.5 py-1 rounded border border-csjmu-100">
                  {token}
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-2">
                  Clarification on M.Sc. Mathematics Lab Component Evaluation
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Under Review &bull; Tier 1
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Department</span>
                <span className="font-semibold text-slate-800">Mathematics</span>
              </div>
              <div>
                <span className="text-slate-500 block">Course</span>
                <span className="font-semibold text-slate-800">M.Sc. Mathematics</span>
              </div>
              <div>
                <span className="text-slate-500 block">Category</span>
                <span className="font-semibold text-slate-800">Examination & Evaluation</span>
              </div>
              <div>
                <span className="text-slate-500 block">Submitted On</span>
                <span className="font-semibold text-slate-800">02 Oct 2026</span>
              </div>
            </div>
          </div>

          {/* Chronological Public Milestone Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-csjmu-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gold-500" aria-hidden="true" />
              Public Milestones & Redressal History
            </h3>

            <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {/* Event 1 */}
              <div className="relative">
                <div className="absolute -left-[29px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-white" />
                <div className="text-xs font-semibold text-slate-400">02 Oct 2026 &bull; 10:15 AM</div>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">Grievance Submitted by Student</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Lodged with 2 evidentiary attachments (Grade sheet, Assignment copy).
                </p>
              </div>

              {/* Event 2 */}
              <div className="relative">
                <div className="absolute -left-[29px] top-0.5 w-4 h-4 rounded-full bg-csjmu-700 ring-4 ring-white" />
                <div className="text-xs font-semibold text-slate-400">02 Oct 2026 &bull; 02:40 PM</div>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">Assigned to Course Coordinator (Tier 1)</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Assigned to Faculty Coordinator for M.Sc. Mathematics. Grievance marked as <em>Under Review</em>.
                </p>
              </div>

              {/* Event 3: Document Request Notice */}
              <div className="relative">
                <div className="absolute -left-[29px] top-0.5 w-4 h-4 rounded-full bg-amber-500 ring-4 ring-white" />
                <div className="text-xs font-semibold text-slate-400">03 Oct 2026 &bull; 11:20 AM</div>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">Supplementary Document Requested</h4>
                <div className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
                  <strong>Official Request from Course Coordinator:</strong>
                  <p>
                    &ldquo;Please submit the signed lab attendance sheet from Week 6 for verification of attendance waiver.&rdquo;
                  </p>
                  <span className="inline-block mt-2 font-semibold text-[11px] text-amber-800">
                    Action required: Student must log in to upload requested document.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
