"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  GitCommit,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  UserCheck,
  Building2,
  Award,
  History,
  Lock,
  RefreshCw,
  ExternalLink,
  Info,
} from "lucide-react";
import { WorkflowMode } from "@prisma/client";

interface WorkflowConfigurationData {
  id: string;
  key: string;
  mode: WorkflowMode;
  version: number;
  updatedByUserId: string | null;
  updatedByFullName: string | null;
  updatedByEmail: string | null;
  changeReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowReadinessResult {
  mode: WorkflowMode;
  isReady: boolean;
  issues: string[];
  warnings: string[];
  summary: {
    totalCourses: number;
    totalDepartments: number;
    missingCoordinatorsCount: number;
    missingHodCount: number;
    hasActiveDirector: boolean;
  };
}

interface WorkflowAuditLogEntry {
  id: string;
  previousMode: WorkflowMode;
  newMode: WorkflowMode;
  reason: string;
  versionBefore: number;
  versionAfter: number;
  adminFullName: string;
  adminEmail: string;
  ipAddress?: string | null;
  createdAt: string;
}

interface WorkflowConfigManagerProps {
  onNavigateTab?: (tab: string) => void;
}

export function WorkflowConfigManager({ onNavigateTab }: WorkflowConfigManagerProps) {
  const [activeConfig, setActiveConfig] = useState<WorkflowConfigurationData | null>(null);
  const [readiness, setReadiness] = useState<Record<string, WorkflowReadinessResult> | null>(null);
  const [auditLogs, setAuditLogs] = useState<WorkflowAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Proposed mode selection
  const [selectedMode, setSelectedMode] = useState<WorkflowMode | null>(null);

  // Confirmation modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchWorkflowData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/workflow", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load workflow configuration.");
      }
      setActiveConfig(data.activeConfig);
      setReadiness(data.readiness);
      setAuditLogs(data.auditLogs || []);
      setSelectedMode(data.activeConfig.mode);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to query workflow configuration.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflowData();
  }, [fetchWorkflowData]);

  const handleApplyClick = () => {
    if (!selectedMode || !activeConfig) return;
    if (selectedMode === activeConfig.mode) {
      setErrorMsg("The selected workflow is already active.");
      return;
    }

    const targetReadiness = readiness?.[selectedMode];
    if (targetReadiness && !targetReadiness.isReady) {
      setErrorMsg(
        `Cannot activate ${selectedMode}: Mandatory authority requirements are incomplete. Please resolve issues first.`
      );
      return;
    }

    setChangeReason("");
    setErrorMsg(null);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMode || !activeConfig) return;

    if (changeReason.trim().length < 5) {
      setErrorMsg("A detailed justification of at least 5 characters is required.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: selectedMode,
          reason: changeReason.trim(),
          expectedVersion: activeConfig.version,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update workflow configuration.");
      }

      setSuccessMsg(`Workflow successfully updated to ${selectedMode}!`);
      setIsConfirmModalOpen(false);
      setChangeReason("");
      await fetchWorkflowData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to apply workflow change.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
        <RefreshCw className="w-6 h-6 text-csjmu-700 animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-600">Loading Workflow &amp; Routing Settings...</p>
      </div>
    );
  }

  const isHodDirectorActive = activeConfig?.mode === WorkflowMode.HOD_DIRECTOR;
  const isCoordinatorActive = activeConfig?.mode === WorkflowMode.COORDINATOR_HOD_DIRECTOR;

  const hodReadiness = readiness?.[WorkflowMode.HOD_DIRECTOR];
  const coordinatorReadiness = readiness?.[WorkflowMode.COORDINATOR_HOD_DIRECTOR];

  return (
    <div className="space-y-8">
      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMsg}</div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-rose-600 font-bold ml-2"
          >
            &times;
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successMsg}</div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-400 hover:text-emerald-600 font-bold ml-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* Active Workflow Status Hero */}
      <div className="bg-gradient-to-r from-csjmu-950 via-csjmu-900 to-csjmu-950 text-white rounded-2xl p-6 sm:p-8 border border-csjmu-800 shadow-lg relative overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-gold-400/20 text-gold-300 border border-gold-400/30">
                Active System Workflow
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10">
                Version {activeConfig?.version}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isHodDirectorActive ? "HOD &bull; Director Escalation Mode" : "Coordinator &bull; HOD &bull; Director Mode"}
            </h2>

            {/* Active Routing Sequence Pill */}
            <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
              <span className="bg-white/10 text-white px-3 py-1 rounded-lg border border-white/15 font-semibold">
                Student Submission
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-gold-400" />
              {isCoordinatorActive && (
                <>
                  <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-lg border border-blue-400/30 font-semibold">
                    Tier 1: Course Coordinator
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-gold-400" />
                </>
              )}
              <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-lg border border-purple-400/30 font-semibold">
                {isHodDirectorActive ? "Tier 2: Department Head (Direct)" : "Tier 2: Department Head"}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-gold-400" />
              <span className="bg-gold-500/20 text-gold-300 px-3 py-1 rounded-lg border border-gold-400/30 font-semibold">
                Tier 3: School Director
              </span>
            </div>
          </div>

          {/* Last Change Meta Box */}
          <div className="bg-white/5 border border-white/15 rounded-xl p-4 text-xs text-slate-300 space-y-1.5 w-full lg:w-80 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <Clock className="w-3.5 h-3.5 text-gold-400" />
              <span>Last Modified Details</span>
            </div>
            <p className="text-slate-200">
              By: <strong>{activeConfig?.updatedByFullName || "System Administrator"}</strong>
            </p>
            <p className="text-slate-400 text-[11px]">
              {activeConfig?.updatedAt
                ? new Date(activeConfig.updatedAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "Initial Deployment"}
            </p>
            {activeConfig?.changeReason && (
              <p className="text-slate-300 text-[11px] italic border-t border-white/10 pt-1.5">
                &ldquo;{activeConfig.changeReason}&rdquo;
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mode Switcher Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Supported Workflow Configurations</h3>
            <p className="text-xs text-slate-500">
              Select a workflow mode below. Changes apply to all future grievance lodgings.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchWorkflowData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recheck Readiness</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Option 1: HOD_DIRECTOR */}
          <div
            onClick={() => setSelectedMode(WorkflowMode.HOD_DIRECTOR)}
            className={`rounded-2xl border p-6 flex flex-col justify-between transition-all cursor-pointer relative ${
              selectedMode === WorkflowMode.HOD_DIRECTOR
                ? "bg-csjmu-50/50 border-csjmu-800 ring-2 ring-csjmu-800/20 shadow-md"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border flex items-center justify-center border-slate-400">
                    {selectedMode === WorkflowMode.HOD_DIRECTOR && (
                      <span className="w-2 h-2 rounded-full bg-csjmu-900" />
                    )}
                  </span>
                  <h4 className="text-base font-bold text-slate-900">HOD &bull; Director Workflow</h4>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Default Mode
                  </span>
                  {isHodDirectorActive && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      CURRENTLY ACTIVE
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Grievances route directly to the designated Department Head for adjudication. Coordinator assignments are optional and do not block student lodging.
              </p>

              {/* Path Diagram */}
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Routing Sequence
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded bg-slate-100 text-slate-800 font-semibold">Student</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-2 py-1 rounded bg-purple-100 text-purple-900 font-semibold flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-purple-700" />
                    HoD (Tier 2)
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-2 py-1 rounded bg-gold-100 text-gold-900 font-semibold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-gold-700" />
                    Director (Tier 3)
                  </span>
                </div>
              </div>

              {/* Readiness status */}
              <div className="pt-2">
                {hodReadiness?.isReady ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>All active departments have assigned HoDs &amp; School Director configured.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Configuration Prerequisites Incomplete:</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                      {hodReadiness?.issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Option 2: COORDINATOR_HOD_DIRECTOR */}
          <div
            onClick={() => setSelectedMode(WorkflowMode.COORDINATOR_HOD_DIRECTOR)}
            className={`rounded-2xl border p-6 flex flex-col justify-between transition-all cursor-pointer relative ${
              selectedMode === WorkflowMode.COORDINATOR_HOD_DIRECTOR
                ? "bg-csjmu-50/50 border-csjmu-800 ring-2 ring-csjmu-800/20 shadow-md"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border flex items-center justify-center border-slate-400">
                    {selectedMode === WorkflowMode.COORDINATOR_HOD_DIRECTOR && (
                      <span className="w-2 h-2 rounded-full bg-csjmu-900" />
                    )}
                  </span>
                  <h4 className="text-base font-bold text-slate-900">Coordinator &bull; HOD &bull; Director</h4>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Faculty Redressal
                  </span>
                  {isCoordinatorActive && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      CURRENTLY ACTIVE
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Grievances route first to the semester-appropriate Course Coordinator for faculty review, followed by Department Head and School Director escalations.
              </p>

              {/* Path Diagram */}
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Routing Sequence
                </span>
                <div className="flex items-center gap-1.5 text-xs flex-wrap">
                  <span className="px-2 py-1 rounded bg-slate-100 text-slate-800 font-semibold">Student</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-2 py-1 rounded bg-blue-100 text-blue-900 font-semibold flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-blue-700" />
                    Coordinator (Tier 1)
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-2 py-1 rounded bg-purple-100 text-purple-900 font-semibold flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-purple-700" />
                    HoD (Tier 2)
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="px-2 py-1 rounded bg-gold-100 text-gold-900 font-semibold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-gold-700" />
                    Director (Tier 3)
                  </span>
                </div>
              </div>

              {/* Readiness status */}
              <div className="pt-2">
                {coordinatorReadiness?.isReady ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Complete authority chain configured across all active courses and semesters.</span>
                  </div>
                ) : (
                  <div className="space-y-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Prerequisites Incomplete ({coordinatorReadiness?.issues.length} Issues):</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-800 max-h-24 overflow-y-auto">
                      {coordinatorReadiness?.issues.slice(0, 5).map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                      {(coordinatorReadiness?.issues.length || 0) > 5 && (
                        <li className="font-semibold italic">
                          + {(coordinatorReadiness?.issues.length || 0) - 5} more issues...
                        </li>
                      )}
                    </ul>

                    {onNavigateTab && (
                      <div className="pt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateTab("semester-matrix");
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-csjmu-900 hover:underline"
                        >
                          <span>Open Semester Matrix to Assign Coordinators</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Info className="w-4 h-4 text-csjmu-700 shrink-0" />
            <span>
              <strong>Historical Record Safety:</strong> Changing the active workflow applies exclusively to newly submitted grievances. Existing cases retain their historical routing and authority chain.
            </span>
          </div>

          <button
            type="button"
            onClick={handleApplyClick}
            disabled={
              !selectedMode ||
              selectedMode === activeConfig?.mode ||
              !(readiness?.[selectedMode]?.isReady ?? true)
            }
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 disabled:opacity-50 disabled:cursor-not-allowed shadow transition cursor-pointer shrink-0"
          >
            {selectedMode === activeConfig?.mode
              ? "Selected Mode Is Active"
              : `Switch to ${selectedMode === WorkflowMode.HOD_DIRECTOR ? "HOD Mode" : "Coordinator Mode"}`}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-csjmu-900 text-gold-400 flex items-center justify-center shadow-sm">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Workflow Transition</h3>
                <p className="text-xs text-slate-500">System Administrator Authorization Required</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Current Mode:</span>
                  <span className="font-bold text-slate-900">{activeConfig?.mode}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                  <span className="text-slate-500">Proposed New Mode:</span>
                  <span className="font-bold text-csjmu-900">{selectedMode}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                  <span className="text-slate-500">New Config Version:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {(activeConfig?.version || 1) + 1}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong>Attention:</strong> This configuration mutation will be logged into the permanent system audit ledger. New grievances will follow this updated routing sequence immediately upon activation.
              </div>

              <form onSubmit={handleConfirmSubmit} className="space-y-4 pt-2">
                <div>
                  <label htmlFor="reason" className="block font-bold text-slate-800 mb-1">
                    Administrative Justification / Reason <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    id="reason"
                    rows={3}
                    required
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="e.g. Switched to HOD-Direct workflow per Academic Council directives for Fall 2026."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Minimum 5 characters required.</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setIsConfirmModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || changeReason.trim().length < 5}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 transition shadow disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? "Committing to Ledger..." : "Authorize & Activate Workflow"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Audit Trail Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-csjmu-50 border border-csjmu-100 flex items-center justify-center text-csjmu-800">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Workflow Mutation Audit Trail</h3>
              <p className="text-[11px] text-slate-500">Immutable history of administrative workflow changes</p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded">
            {auditLogs.length} {auditLogs.length === 1 ? "Record" : "Records"}
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No administrative workflow changes recorded yet. Initial migration configuration active.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Administrator</th>
                  <th className="py-2.5 px-3">Transition</th>
                  <th className="py-2.5 px-3">Version</th>
                  <th className="py-2.5 px-3">Reason / Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      <div>{log.adminFullName}</div>
                      <div className="text-[10px] font-normal text-slate-400 font-mono">
                        {log.adminEmail}
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {log.previousMode}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="px-2 py-0.5 rounded bg-csjmu-50 text-csjmu-900 font-bold border border-csjmu-200">
                          {log.newMode}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                      v{log.versionBefore} &rarr; v{log.versionAfter}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={log.reason}>
                      {log.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
