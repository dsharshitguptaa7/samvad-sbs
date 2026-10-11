"use client";

import React, { useState } from "react";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  Building2,
  Download,
  Send,
  ArrowUpRight,
  Shield,
  MessageSquare,
  Lock,
} from "lucide-react";
import { GrievanceStatus, GrievanceTier } from "@prisma/client";

export interface CoordinatorGrievanceDetail {
  id: string;
  trackingNumber: string;
  subject: string;
  description: string;
  reliefSought: string | null;
  category: string;
  currentTier: GrievanceTier;
  currentStatus: GrievanceStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolutionSummary: string | null;
  department: { name: string; code: string };
  course: { name: string; code: string };
  student: {
    fullName: string;
    email: string;
    rollNumber: string | null;
    enrollmentNo: string | null;
  };
  documents: {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    purpose: string;
    createdAt: string;
  }[];
  documentRequests: {
    id: string;
    instructions: string;
    deadline: string | null;
    status: string;
    createdAt: string;
  }[];
  timelineActions: {
    id: string;
    actionType: string;
    fromTier: string | null;
    toTier: string | null;
    fromStatus: string | null;
    toStatus: string | null;
    remarks: string | null;
    visibility: string;
    createdAt: string;
    actor: { fullName: string; role: string };
  }[];
}

interface WorkflowModalProps {
  grievance: CoordinatorGrievanceDetail;
  onClose: () => void;
  onActionComplete: () => void;
}

export function CoordinatorWorkflowModal({
  grievance,
  onClose,
  onActionComplete,
}: WorkflowModalProps) {
  const [activeTab, setActiveTab] = useState<"details" | "actions" | "timeline">("actions");
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form states
  const [underReviewRemarks, setUnderReviewRemarks] = useState("");
  const [internalRemark, setInternalRemark] = useState("");
  const [docRequestInstructions, setDocRequestInstructions] = useState("");
  const [docRequestDeadline, setDocRequestDeadline] = useState("");
  const [forwardingNotes, setForwardingNotes] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");

  const executeAction = async (action: string, payload: any) => {
    setActionError(null);
    setActionSuccess(null);
    setLoadingAction(true);

    try {
      const res = await fetch(`/api/coordinator/grievances/${grievance.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to execute action");

      setActionSuccess(data.message || "Action executed successfully.");
      setTimeout(() => {
        onActionComplete();
      }, 1200);
    } catch (err: any) {
      setActionError(err.message || "Error executing workflow action");
    } finally {
      setLoadingAction(false);
    }
  };

  const isUnderReview = grievance.currentStatus === "UNDER_REVIEW";
  const isSubmitted = grievance.currentStatus === "SUBMITTED";
  const isResolved = grievance.currentStatus === "RESOLVED" || grievance.currentStatus === "DISMISSED";
  const isForwarded = grievance.currentStatus === "FORWARDED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                {grievance.trackingNumber}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                {grievance.currentStatus.replace(/_/g, " ")}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                {grievance.currentTier.replace(/_/g, " ")}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-2">{grievance.subject}</h2>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-1">
              <span>Student: <strong className="text-slate-700">{grievance.student.fullName}</strong> ({grievance.student.rollNumber || grievance.student.email})</span>
              <span>&bull;</span>
              <span>Course: {grievance.course.name}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
          >
            &times;
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab("actions")}
            className={`pb-2.5 px-4 transition border-b-2 ${
              activeTab === "actions"
                ? "border-csjmu-800 text-csjmu-900"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Adjudication Actions
          </button>
          <button
            onClick={() => setActiveTab("details")}
            className={`pb-2.5 px-4 transition border-b-2 ${
              activeTab === "details"
                ? "border-csjmu-800 text-csjmu-900"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Grievance & Documents ({grievance.documents.length})
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`pb-2.5 px-4 transition border-b-2 ${
              activeTab === "timeline"
                ? "border-csjmu-800 text-csjmu-900"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Timeline & Internal Audit ({grievance.timelineActions.length})
          </button>
        </div>

        {/* Alerts */}
        {actionError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="font-medium">{actionError}</div>
          </div>
        )}

        {actionSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="font-medium">{actionSuccess}</div>
          </div>
        )}

        {/* Tab 1: Adjudication Actions */}
        {activeTab === "actions" && (
          <div className="space-y-6">
            {/* Status notice */}
            {isResolved && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                <span className="font-bold text-slate-900">Case Resolved:</span> This grievance has already been resolved or closed. No further workflow actions are permitted at Tier 1.
              </div>
            )}

            {isForwarded && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900">
                <span className="font-bold">Case Escalated:</span> This grievance has been forwarded to Tier 2 (Department Head). Further evaluation is under HoD jurisdiction.
              </div>
            )}

            {!isResolved && !isForwarded && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Mark Under Review */}
                {isSubmitted && (
                  <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <Clock className="w-4 h-4 text-csjmu-800" />
                      <span>1. Acknowledge & Mark Under Review</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Move state from SUBMITTED to UNDER_REVIEW to formally initiate Tier-1 academic evaluation.
                    </p>
                    <textarea
                      rows={2}
                      value={underReviewRemarks}
                      onChange={(e) => setUnderReviewRemarks(e.target.value)}
                      placeholder="Optional opening remarks for student timeline..."
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                    />
                    <button
                      onClick={() => executeAction("MARK_UNDER_REVIEW", { remarks: underReviewRemarks })}
                      disabled={loadingAction}
                      className="w-full py-2 text-xs font-bold text-white bg-csjmu-900 hover:bg-csjmu-950 rounded-lg transition"
                    >
                      Acknowledge & Begin Review
                    </button>
                  </div>
                )}

                {/* 2. Add Internal Remark */}
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span>Internal Faculty Note (Confidential)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Visible strictly to faculty officials (Tier 1-3). Hidden from student and public tracking.
                  </p>
                  <textarea
                    rows={2}
                    value={internalRemark}
                    onChange={(e) => setInternalRemark(e.target.value)}
                    placeholder="Record confidential deliberation notes..."
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                  />
                  <button
                    onClick={() => executeAction("ADD_INTERNAL_REMARK", { remarks: internalRemark })}
                    disabled={loadingAction || internalRemark.trim().length < 3}
                    className="w-full py-2 text-xs font-bold text-slate-800 bg-amber-200 hover:bg-amber-300 rounded-lg transition disabled:opacity-50"
                  >
                    Save Confidential Note
                  </button>
                </div>

                {/* 3. Issue Document Request */}
                {isUnderReview && (
                  <div className="p-5 bg-purple-50/50 rounded-xl border border-purple-200 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-950">
                      <MessageSquare className="w-4 h-4 text-purple-700" />
                      <span>Request Evidence from Student</span>
                    </div>
                    <p className="text-[11px] text-purple-800 leading-relaxed">
                      Issues formal clarification alert to student. Shifts state to AWAITING_STUDENT_INFO.
                    </p>
                    <textarea
                      rows={2}
                      value={docRequestInstructions}
                      onChange={(e) => setDocRequestInstructions(e.target.value)}
                      placeholder="Specify required proof (e.g. upload stamped assignment submission receipt)..."
                      className="w-full text-xs p-2.5 rounded-lg border border-purple-300"
                    />
                    <button
                      onClick={() => executeAction("REQUEST_DOCUMENTS", { instructions: docRequestInstructions })}
                      disabled={loadingAction || docRequestInstructions.trim().length < 10}
                      className="w-full py-2 text-xs font-bold text-purple-950 bg-purple-200 hover:bg-purple-300 rounded-lg transition disabled:opacity-50"
                    >
                      Issue Clarification Request
                    </button>
                  </div>
                )}

                {/* 4. Escalate to Department Head */}
                {isUnderReview && (
                  <div className="p-5 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
                      <ArrowUpRight className="w-4 h-4 text-indigo-700" />
                      <span>Escalate to Department Head (Tier 2)</span>
                    </div>
                    <p className="text-[11px] text-indigo-800 leading-relaxed">
                      Advances tier to TIER_2_HOD and transfers assigned ownership to the active HoD.
                    </p>
                    <textarea
                      rows={2}
                      value={forwardingNotes}
                      onChange={(e) => setForwardingNotes(e.target.value)}
                      placeholder="Reason for escalation and summary of coordinator findings..."
                      className="w-full text-xs p-2.5 rounded-lg border border-indigo-300"
                    />
                    <button
                      onClick={() => executeAction("FORWARD_TO_HOD", { forwardingNotes })}
                      disabled={loadingAction || forwardingNotes.trim().length < 10}
                      className="w-full py-2 text-xs font-bold text-white bg-indigo-800 hover:bg-indigo-900 rounded-lg transition disabled:opacity-50"
                    >
                      Forward to Department Head
                    </button>
                  </div>
                )}

                {/* 5. Formulate Resolution */}
                {isUnderReview && (
                  <div className="p-5 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3 md:col-span-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      <span>Formulate Final Tier-1 Resolution</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Concludes grievance adjudication at Course Coordinator level. Sets state to RESOLVED.
                    </p>
                    <textarea
                      rows={3}
                      value={resolutionSummary}
                      onChange={(e) => setResolutionSummary(e.target.value)}
                      placeholder="Detailed statement of resolution, corrective actions taken, and administrative decision..."
                      className="w-full text-xs p-2.5 rounded-lg border border-emerald-300"
                    />
                    <button
                      onClick={() => executeAction("RESOLVE", { resolutionSummary })}
                      disabled={loadingAction || resolutionSummary.trim().length < 15}
                      className="w-full py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition disabled:opacity-50"
                    >
                      Resolve Grievance
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Grievance Details & Files */}
        {activeTab === "details" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Statement of Grievance
              </h3>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                {grievance.description}
              </div>
            </div>

            {grievance.reliefSought && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Relief Sought by Student
                </h3>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800">
                  {grievance.reliefSought}
                </div>
              </div>
            )}

            {/* Attached Documents */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Attached Evidentiary Documents ({grievance.documents.length})
              </h3>
              {grievance.documents.length === 0 ? (
                <div className="text-xs text-slate-400 italic">No files attached to this grievance.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {grievance.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs"
                    >
                      <div className="truncate pr-2">
                        <div className="font-medium text-slate-800 truncate">{doc.fileName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {(doc.fileSize / 1024).toFixed(1)} KB &bull; {doc.mimeType}
                        </div>
                      </div>
                      <a
                        href={`/api/documents/${doc.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-csjmu-800 hover:text-csjmu-950 hover:bg-slate-200 rounded transition shrink-0"
                        title="Download document"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Timeline & Audit History */}
        {activeTab === "timeline" && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Complete Adjudication Audit Log (Public & Internal)
            </h3>
            <div className="border-l-2 border-csjmu-200 ml-3 pl-4 space-y-4 text-xs">
              {grievance.timelineActions.map((action) => (
                <div key={action.id} className="relative">
                  <div
                    className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 border-white ring-1 ${
                      action.visibility === "INTERNAL_STAFF_ONLY"
                        ? "bg-amber-600 ring-amber-600"
                        : "bg-csjmu-700 ring-csjmu-700"
                    }`}
                  />
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-bold text-slate-900">
                      {action.actionType.replace(/_/g, " ")}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        action.visibility === "INTERNAL_STAFF_ONLY"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {action.visibility === "INTERNAL_STAFF_ONLY" ? "Confidential Note" : "Public Milestone"}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(action.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Official: {action.actor.fullName} ({action.actor.role.replace(/_/g, " ")})
                  </div>
                  {action.remarks && (
                    <p
                      className={`mt-1 leading-relaxed p-2.5 rounded-lg border text-xs ${
                        action.visibility === "INTERNAL_STAFF_ONLY"
                          ? "bg-amber-50/50 border-amber-200 text-amber-950 font-mono"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      {action.remarks}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
