"use client";

import React, { useState } from "react";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  Download,
  Send,
  ArrowUpRight,
  Shield,
  MessageSquare,
  Lock,
  XCircle,
} from "lucide-react";
import { GrievanceStatus, GrievanceTier } from "@prisma/client";

export interface HodGrievanceDetail {
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
    remarks: string;
    visibility: string;
    createdAt: string;
    actor: {
      fullName: string;
      role: string;
    };
  }[];
}

interface HodWorkflowModalProps {
  grievance: HodGrievanceDetail;
  onClose: () => void;
  onActionSuccess: (updatedGrievance: any) => void;
}

export function HodWorkflowModal({
  grievance,
  onClose,
  onActionSuccess,
}: HodWorkflowModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "action">("overview");
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form states
  const [underReviewRemarks, setUnderReviewRemarks] = useState("");
  const [internalRemarks, setInternalRemarks] = useState("");
  const [requestInstructions, setRequestInstructions] = useState("");
  const [requestDeadline, setRequestDeadline] = useState("");
  const [forwardingNotes, setForwardingNotes] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [dismissGrounds, setDismissGrounds] = useState("INSUFFICIENT_EVIDENCE");
  const [dismissReasoning, setDismissReasoning] = useState("");

  const isAtHodTier = grievance.currentTier === GrievanceTier.TIER_2_HOD;
  const isForwarded = grievance.currentStatus === GrievanceStatus.FORWARDED;
  const isSubmitted = grievance.currentStatus === GrievanceStatus.SUBMITTED;
  const isUnderReview = grievance.currentStatus === GrievanceStatus.UNDER_REVIEW;
  const isAwaitingStudent = grievance.currentStatus === GrievanceStatus.AWAITING_STUDENT_INFO;
  const isResolvedOrDismissed =
    grievance.currentStatus === GrievanceStatus.RESOLVED ||
    grievance.currentStatus === GrievanceStatus.DISMISSED;

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      let payload: any = { action: selectedAction };

      if (selectedAction === "MARK_UNDER_REVIEW") {
        payload.remarks = underReviewRemarks;
      } else if (selectedAction === "ADD_INTERNAL_REMARK") {
        if (!internalRemarks.trim()) {
          setErrorMsg("Internal remark text is required.");
          setLoading(false);
          return;
        }
        payload.remarks = internalRemarks;
      } else if (selectedAction === "REQUEST_DOCUMENTS") {
        if (requestInstructions.trim().length < 10) {
          setErrorMsg("Clarification instructions must be at least 10 characters.");
          setLoading(false);
          return;
        }
        payload.instructions = requestInstructions;
        if (requestDeadline) {
          payload.deadline = new Date(requestDeadline).toISOString();
        }
      } else if (selectedAction === "FORWARD_TO_DIRECTOR") {
        if (forwardingNotes.trim().length < 15) {
          setErrorMsg("Forwarding justification must be at least 15 characters.");
          setLoading(false);
          return;
        }
        payload.forwardingNotes = forwardingNotes;
      } else if (selectedAction === "RESOLVE") {
        if (resolutionSummary.trim().length < 20) {
          setErrorMsg("Resolution summary must be at least 20 characters.");
          setLoading(false);
          return;
        }
        payload.resolutionSummary = resolutionSummary;
      } else if (selectedAction === "DISMISS") {
        if (dismissReasoning.trim().length < 20) {
          setErrorMsg("Dismissal reasoning must be at least 20 characters.");
          setLoading(false);
          return;
        }
        payload.grounds = dismissGrounds;
        payload.reasoning = dismissReasoning;
      }

      const res = await fetch(`/api/department-head/grievances/${grievance.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to execute action.");
      }

      setSuccessMsg(data.message || "Action processed successfully.");
      setTimeout(() => {
        onActionSuccess(data.grievance);
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-csjmu-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gold-400 uppercase tracking-wider">
              <Building2 className="w-4 h-4" />
              <span>Tier 2 &bull; HoD Adjudication</span>
              <span className="text-slate-300 font-mono">[{grievance.trackingNumber}]</span>
            </div>
            <h2 className="text-lg font-bold text-white truncate max-w-xl">
              {grievance.subject}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {/* Sub-bar / Navigation Tabs */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("overview")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "overview"
                  ? "bg-csjmu-800 text-white"
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              Grievance Details
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "timeline"
                  ? "bg-csjmu-800 text-white"
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              Timeline & Audit ({grievance.timelineActions.length})
            </button>
            <button
              onClick={() => setActiveTab("action")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "action"
                  ? "bg-csjmu-800 text-white"
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              Take Action / Adjudicate
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-slate-500">Status:</span>
            <span
              className={`px-2 py-0.5 rounded-full font-bold ${
                grievance.currentStatus === "RESOLVED"
                  ? "bg-emerald-100 text-emerald-800"
                  : grievance.currentStatus === "DISMISSED"
                  ? "bg-rose-100 text-rose-800"
                  : grievance.currentStatus === "UNDER_REVIEW"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {grievance.currentStatus}
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Student and Academic Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Student Information
                  </h4>
                  <p className="text-sm font-semibold text-slate-900">{grievance.student.fullName}</p>
                  <p className="text-xs text-slate-600">{grievance.student.email}</p>
                  <p className="text-xs text-slate-600">
                    Roll No: {grievance.student.rollNumber || "N/A"} &bull; Enr: {grievance.student.enrollmentNo || "N/A"}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Academic Scoping
                  </h4>
                  <p className="text-sm font-semibold text-slate-900">
                    {grievance.department.name} ({grievance.department.code})
                  </p>
                  <p className="text-xs text-slate-600">
                    Course: {grievance.course.name} ({grievance.course.code})
                  </p>
                  <p className="text-xs text-slate-600">Category: {grievance.category}</p>
                </div>
              </div>

              {/* Grievance Text */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Grievance Description
                </h4>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {grievance.description}
                </div>
              </div>

              {/* Relief Sought */}
              {grievance.reliefSought && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Relief Sought by Student
                  </h4>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                    {grievance.reliefSought}
                  </div>
                </div>
              )}

              {/* Resolution / Dismissal Summary if closed */}
              {grievance.resolutionSummary && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Formal Redressal / Dismissal Summary
                  </h4>
                  <div
                    className={`p-4 rounded-xl border text-sm ${
                      grievance.currentStatus === "DISMISSED"
                        ? "bg-rose-50 border-rose-200 text-rose-900"
                        : "bg-emerald-50 border-emerald-200 text-emerald-900"
                    }`}
                  >
                    {grievance.resolutionSummary}
                  </div>
                </div>
              )}

              {/* Uploaded Evidence Documents */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Student Uploaded Documents ({grievance.documents.length})
                </h4>
                {grievance.documents.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No files attached to this grievance.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {grievance.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-5 h-5 text-csjmu-800 shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-900 truncate">{doc.fileName}</p>
                            <p className="text-[10px] text-slate-500">
                              {(doc.fileSize / 1024).toFixed(1)} KB &bull; {doc.purpose}
                            </p>
                          </div>
                        </div>
                        <a
                          href={`/api/documents/${doc.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-csjmu-800 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
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

          {activeTab === "timeline" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Full Departmental & Tier Audit Log
                </h4>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  Includes confidential internal notes
                </span>
              </div>

              <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                {grievance.timelineActions.map((act) => {
                  const isInternal = act.visibility === "INTERNAL_STAFF_ONLY";
                  return (
                    <div key={act.id} className="relative flex items-start gap-3 pl-2">
                      <div
                        className={`w-4 h-4 rounded-full mt-1 shrink-0 z-10 ${
                          isInternal
                            ? "bg-amber-500 ring-4 ring-amber-100"
                            : "bg-csjmu-800 ring-4 ring-csjmu-100"
                        }`}
                      />
                      <div
                        className={`flex-1 p-3 rounded-xl border text-xs ${
                          isInternal
                            ? "bg-amber-50/70 border-amber-200 text-amber-950"
                            : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold">
                            {act.actor.fullName} ({act.actor.role})
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(act.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-1.5 text-[10px]">
                          <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {act.actionType}
                          </span>
                          {isInternal && (
                            <span className="bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-semibold">
                              CONFIDENTIAL
                            </span>
                          )}
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{act.remarks}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "action" && (
            <div className="space-y-6">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {isResolvedOrDismissed ? (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
                  <Shield className="w-8 h-8 text-slate-400 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800">Case Concluded</h4>
                  <p className="text-xs text-slate-600">
                    This grievance has reached a finalized state ({grievance.currentStatus}). No further Tier 2 actions can be performed.
                  </p>
                </div>
              ) : !isAtHodTier ? (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                  <h4 className="text-sm font-bold text-amber-900">Current Tier: {grievance.currentTier}</h4>
                  <p className="text-xs text-amber-700">
                    This grievance is currently at {grievance.currentTier}. Tier 2 HoD actions can only be executed when the case is actively assigned to Tier 2.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleExecuteAction} className="space-y-6">
                  {/* Select Action Radio Group */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Select Department Head Action
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(isForwarded || isSubmitted) && (
                        <label
                          className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                            selectedAction === "MARK_UNDER_REVIEW"
                              ? "bg-csjmu-50 border-csjmu-800 ring-2 ring-csjmu-800/20"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="hodAction"
                            value="MARK_UNDER_REVIEW"
                            checked={selectedAction === "MARK_UNDER_REVIEW"}
                            onChange={(e) => setSelectedAction(e.target.value)}
                            className="mt-1 text-csjmu-800 focus:ring-csjmu-800"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-900">Begin Formal Review</p>
                            <p className="text-[11px] text-slate-500">
                              {isSubmitted
                                ? "Open directly lodged grievance and shift to UNDER_REVIEW status."
                                : "Open forwarded case and shift to UNDER_REVIEW status."}
                            </p>
                          </div>
                        </label>
                      )}

                      {(isUnderReview || isAwaitingStudent) && (
                        <>
                          <label
                            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                              selectedAction === "ADD_INTERNAL_REMARK"
                                ? "bg-amber-50 border-amber-600 ring-2 ring-amber-600/20"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="hodAction"
                              value="ADD_INTERNAL_REMARK"
                              checked={selectedAction === "ADD_INTERNAL_REMARK"}
                              onChange={(e) => setSelectedAction(e.target.value)}
                              className="mt-1 text-amber-600 focus:ring-amber-600"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-900">Confidential Note</p>
                              <p className="text-[11px] text-slate-500">
                                Record internal observation invisible to student.
                              </p>
                            </div>
                          </label>

                          <label
                            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                              selectedAction === "REQUEST_DOCUMENTS"
                                ? "bg-blue-50 border-blue-600 ring-2 ring-blue-600/20"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="hodAction"
                              value="REQUEST_DOCUMENTS"
                              checked={selectedAction === "REQUEST_DOCUMENTS"}
                              onChange={(e) => setSelectedAction(e.target.value)}
                              className="mt-1 text-blue-600 focus:ring-blue-600"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-900">Request Clarification</p>
                              <p className="text-[11px] text-slate-500">
                                Issue official request for additional evidence.
                              </p>
                            </div>
                          </label>

                          <label
                            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                              selectedAction === "FORWARD_TO_DIRECTOR"
                                ? "bg-purple-50 border-purple-600 ring-2 ring-purple-600/20"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="hodAction"
                              value="FORWARD_TO_DIRECTOR"
                              checked={selectedAction === "FORWARD_TO_DIRECTOR"}
                              onChange={(e) => setSelectedAction(e.target.value)}
                              className="mt-1 text-purple-600 focus:ring-purple-600"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-900">Forward to Director (Tier 3)</p>
                              <p className="text-[11px] text-slate-500">
                                Escalate policy or school-wide matter to School Director.
                              </p>
                            </div>
                          </label>

                          <label
                            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                              selectedAction === "RESOLVE"
                                ? "bg-emerald-50 border-emerald-600 ring-2 ring-emerald-600/20"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="hodAction"
                              value="RESOLVE"
                              checked={selectedAction === "RESOLVE"}
                              onChange={(e) => setSelectedAction(e.target.value)}
                              className="mt-1 text-emerald-600 focus:ring-emerald-600"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-900">Record Departmental Resolution</p>
                              <p className="text-[11px] text-slate-500">
                                Grant redressal and conclude grievance.
                              </p>
                            </div>
                          </label>

                          <label
                            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                              selectedAction === "DISMISS"
                                ? "bg-rose-50 border-rose-600 ring-2 ring-rose-600/20"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="hodAction"
                              value="DISMISS"
                              checked={selectedAction === "DISMISS"}
                              onChange={(e) => setSelectedAction(e.target.value)}
                              className="mt-1 text-rose-600 focus:ring-rose-600"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-900">Dismiss with Grounds</p>
                              <p className="text-[11px] text-slate-500">
                                Reject complaint with mandatory grounds and findings.
                              </p>
                            </div>
                          </label>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Dynamic Action Fields */}
                  {selectedAction === "MARK_UNDER_REVIEW" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700">
                        Opening Remarks (Optional)
                      </label>
                      <textarea
                        value={underReviewRemarks}
                        onChange={(e) => setUnderReviewRemarks(e.target.value)}
                        placeholder="e.g., Initiated departmental review; scheduled enquiry..."
                        className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-csjmu-800 focus:border-csjmu-800"
                        rows={3}
                      />
                    </div>
                  )}

                  {selectedAction === "ADD_INTERNAL_REMARK" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700">
                        Confidential Departmental Note *
                      </label>
                      <textarea
                        value={internalRemarks}
                        onChange={(e) => setInternalRemarks(e.target.value)}
                        placeholder="Internal observation, committee notes, or faculty discussion. Never shown to student."
                        className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-600 focus:border-amber-600"
                        rows={4}
                        required
                      />
                    </div>
                  )}

                  {selectedAction === "REQUEST_DOCUMENTS" && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-700">
                          Instructions for Student * (Min 10 characters)
                        </label>
                        <textarea
                          value={requestInstructions}
                          onChange={(e) => setRequestInstructions(e.target.value)}
                          placeholder="Please provide attendance slip, fee receipt, or written explanation..."
                          className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          rows={3}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700">
                          Response Deadline (Optional)
                        </label>
                        <input
                          type="datetime-local"
                          value={requestDeadline}
                          onChange={(e) => setRequestDeadline(e.target.value)}
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        />
                      </div>
                    </div>
                  )}

                  {selectedAction === "FORWARD_TO_DIRECTOR" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700">
                        Escalation Justification for School Director * (Min 15 characters)
                      </label>
                      <textarea
                        value={forwardingNotes}
                        onChange={(e) => setForwardingNotes(e.target.value)}
                        placeholder="Explain why this matter requires Directorate appellate decision or School-wide policy intervention..."
                        className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                        rows={4}
                        required
                      />
                    </div>
                  )}

                  {selectedAction === "RESOLVE" && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700">
                        Departmental Resolution Summary * (Min 20 characters)
                      </label>
                      <textarea
                        value={resolutionSummary}
                        onChange={(e) => setResolutionSummary(e.target.value)}
                        placeholder="Describe the corrective action taken, findings, and formal departmental redressal granted..."
                        className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                        rows={4}
                        required
                      />
                    </div>
                  )}

                  {selectedAction === "DISMISS" && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-700">
                          Statutory Grounds for Dismissal *
                        </label>
                        <select
                          value={dismissGrounds}
                          onChange={(e) => setDismissGrounds(e.target.value)}
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-600 focus:border-rose-600"
                        >
                          <option value="INSUFFICIENT_EVIDENCE">Insufficient Evidence / Unsubstantiated</option>
                          <option value="OUT_OF_JURISDICTION">Out of Jurisdiction / Beyond Scope</option>
                          <option value="DUPLICATE_SUBMISSION">Duplicate Submission</option>
                          <option value="OTHER">Other Ground</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700">
                          Reasoning & Factual Findings * (Min 20 characters)
                        </label>
                        <textarea
                          value={dismissReasoning}
                          onChange={(e) => setDismissReasoning(e.target.value)}
                          placeholder="Provide the reasoned basis for dismissal based on enquiry findings..."
                          className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-600 focus:border-rose-600"
                          rows={4}
                          required
                        />
                      </div>
                    </div>
                  )}

                  {selectedAction && (
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setSelectedAction("")}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-5 py-2 bg-csjmu-900 hover:bg-csjmu-800 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                      >
                        {loading ? "Processing..." : "Confirm & Execute Action"}
                      </button>
                    </div>
                  )}
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
