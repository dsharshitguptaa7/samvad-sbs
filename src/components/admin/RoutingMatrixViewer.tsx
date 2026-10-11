"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  GitCommit,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Building,
  RotateCcw,
  ArrowRight,
  Shield,
  HelpCircle,
} from "lucide-react";

interface AuthorityNode {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface ChainItem {
  courseId: string;
  courseName: string;
  courseCode: string;
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  coordinator: AuthorityNode | null;
  departmentHead: AuthorityNode | null;
  director: AuthorityNode | null;
  isComplete: boolean;
  status: "COMPLETE" | "PARTIAL" | "UNRESOLVABLE";
  issues: string[];
}

interface MatrixReport {
  allValid: boolean;
  totalCourses: number;
  completeCourses: number;
  incompleteCourses: number;
  activeDirector: AuthorityNode | null;
  workflowMode?: string;
  chains: ChainItem[];
}

export function RoutingMatrixViewer() {
  const [report, setReport] = useState<MatrixReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/routing");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to evaluate authority routing matrix.");
      }
      setReport(data.matrix);
    } catch (err: any) {
      setError(err.message || "Failed to load routing matrix.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  return (
    <div className="space-y-6">
      {/* Overview Status Banner */}
      {report && (
        <div
          className={`p-6 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            report.allValid
              ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
              : "bg-amber-50/70 border-amber-200 text-amber-950"
          }`}
        >
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
              {report.allValid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">All Authority Chains Operational</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-amber-800">Action Required: Unresolved Routing Chains</span>
                </>
              )}
              {report.workflowMode && (
                <span className="ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-csjmu-900 text-gold-300 border border-csjmu-800 normal-case">
                  Mode: {report.workflowMode}
                </span>
              )}
            </div>
            <h3 className="text-lg font-extrabold tracking-tight">
              {report.allValid
                ? "School of Basic Sciences Redressal Matrix is Complete"
                : `${report.incompleteCourses} of ${report.totalCourses} courses have missing or incomplete authority assignments`}
            </h3>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Every grievance lodged by a student requires a deterministic 3-tier adjudication path (Course Coordinator &rarr; Department Head &rarr; School Director).
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchMatrix}
              className="inline-flex items-center gap-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Re-Evaluate Matrix</span>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={fetchMatrix} className="px-3 py-1 bg-white border border-rose-300 rounded font-semibold text-rose-700 text-xs">
            Retry
          </button>
        </div>
      )}

      {/* Director Status Card */}
      {report && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold-50 border border-gold-200 text-gold-700 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tier 3 Executive Redressal</p>
              <p className="text-sm font-bold text-slate-900">
                {report.activeDirector ? report.activeDirector.fullName : "No Active Director Configured"}
              </p>
              <p className="text-xs text-slate-500 font-mono">
                {report.activeDirector ? report.activeDirector.email : "School of Basic Sciences Executive Directorate"}
              </p>
            </div>
          </div>

          <div>
            {report.activeDirector ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active Director Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Missing Director
              </span>
            )}
          </div>
        </div>
      )}

      {/* Chains Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-csjmu-800" />
          <span>Course Authority Resolution Chains ({report?.chains.length || 0})</span>
        </h3>

        {loading ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-3">
            <Loader2 className="w-8 h-8 text-csjmu-800 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Evaluating authoritative redressal paths...</p>
          </div>
        ) : !report || report.chains.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500">No active course programs found to evaluate.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {report.chains.map((chain) => (
              <div
                key={chain.courseId}
                className={`bg-white rounded-xl border p-5 shadow-sm transition ${
                  chain.isComplete ? "border-slate-200" : "border-amber-300 bg-amber-50/20"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{chain.courseName}</span>
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border">
                        {chain.courseCode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>{chain.departmentName} ({chain.departmentCode})</span>
                    </p>
                  </div>

                  <div>
                    {chain.isComplete ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ready for Lodging</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Incomplete Chain</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Authority Nodes Flow */}
                <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Tier 1 */}
                  <div
                    className={`p-3 rounded-lg border space-y-1 ${
                      chain.coordinator
                        ? "bg-slate-50 border-slate-200"
                        : "bg-rose-50/60 border-rose-200 text-rose-900"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <span>Tier 1: Course Coordinator</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </div>
                    {chain.coordinator ? (
                      <div>
                        <p className="font-bold text-slate-900">{chain.coordinator.fullName}</p>
                        <p className="text-[11px] text-slate-500 font-mono line-clamp-1">
                          {chain.coordinator.email}
                        </p>
                      </div>
                    ) : (
                      <div className="text-rose-700 font-semibold text-[11px]">
                        No Coordinator Assigned
                      </div>
                    )}
                  </div>

                  {/* Tier 2 */}
                  <div
                    className={`p-3 rounded-lg border space-y-1 ${
                      chain.departmentHead
                        ? "bg-slate-50 border-slate-200"
                        : "bg-rose-50/60 border-rose-200 text-rose-900"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <span>Tier 2: Department Head</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </div>
                    {chain.departmentHead ? (
                      <div>
                        <p className="font-bold text-slate-900">{chain.departmentHead.fullName}</p>
                        <p className="text-[11px] text-slate-500 font-mono line-clamp-1">
                          {chain.departmentHead.email}
                        </p>
                      </div>
                    ) : (
                      <div className="text-rose-700 font-semibold text-[11px]">
                        No HoD Assigned
                      </div>
                    )}
                  </div>

                  {/* Tier 3 */}
                  <div
                    className={`p-3 rounded-lg border space-y-1 ${
                      chain.director
                        ? "bg-slate-50 border-slate-200"
                        : "bg-rose-50/60 border-rose-200 text-rose-900"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <span>Tier 3: School Director</span>
                      <Shield className="w-3 h-3 text-gold-500" />
                    </div>
                    {chain.director ? (
                      <div>
                        <p className="font-bold text-slate-900">{chain.director.fullName}</p>
                        <p className="text-[11px] text-slate-500 font-mono line-clamp-1">
                          {chain.director.email}
                        </p>
                      </div>
                    ) : (
                      <div className="text-rose-700 font-semibold text-[11px]">
                        No Director Configured
                      </div>
                    )}
                  </div>
                </div>

                {/* Issues List */}
                {chain.issues.length > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
                    <p className="font-bold text-[11px] flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                      <span>Resolution Issues:</span>
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                      {chain.issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
