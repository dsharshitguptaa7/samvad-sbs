"use client";

import React from "react";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  Building2,
  ArrowRight,
  Shield,
  Download,
} from "lucide-react";
import {
  GrievanceStatus,
  GrievanceTier,
  TimelineActionType,
} from "@prisma/client";

export interface GrievanceDetailData {
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
  department: { name: string; code: string };
  course: { name: string; code: string };
  assignedTo: { fullName: string; role: string } | null;
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
    requestedTier: string;
  }[];
  timelineActions: {
    id: string;
    actionType: TimelineActionType;
    fromTier: string | null;
    toTier: string | null;
    fromStatus: string | null;
    toStatus: string | null;
    remarks: string | null;
    createdAt: string;
    actor: { fullName: string; role: string };
  }[];
}

interface GrievanceDetailModalProps {
  grievance: GrievanceDetailData;
  onClose: () => void;
}

export function GrievanceDetailModal({
  grievance,
  onClose,
}: GrievanceDetailModalProps) {
  const getStatusBadge = (status: GrievanceStatus) => {
    switch (status) {
      case "SUBMITTED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "UNDER_REVIEW":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "AWAITING_STUDENT_INFO":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "FORWARDED":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "RESOLVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "DISMISSED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getTierLabel = (tier: GrievanceTier) => {
    switch (tier) {
      case "TIER_1_COORDINATOR":
        return "Tier 1: Course Coordinator";
      case "TIER_2_HOD":
        return "Tier 2: Department Head";
      case "TIER_3_DIRECTOR":
        return "Tier 3: School Director";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                {grievance.trackingNumber}
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                  grievance.currentStatus
                )}`}
              >
                {grievance.currentStatus.replace(/_/g, " ")}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-2">
              {grievance.subject}
            </h2>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-1">
              <span>{grievance.course.name} ({grievance.course.code})</span>
              <span>&bull;</span>
              <span>{grievance.department.name}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
          >
            &times;
          </button>
        </div>

        {/* Current Review Tier & Authority */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500">
              Current Adjudication Level
            </div>
            <div className="text-sm font-bold text-csjmu-900 mt-0.5">
              {getTierLabel(grievance.currentTier)}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500">
              Assigned Official
            </div>
            <div className="text-sm font-medium text-slate-800 mt-0.5">
              {grievance.assignedTo
                ? `${grievance.assignedTo.fullName} (${grievance.assignedTo.role.replace(/_/g, " ")})`
                : "Not currently assigned"}
            </div>
          </div>
        </div>

        {/* Grievance Statement */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Statement of Grievance
          </h3>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
            {grievance.description}
          </div>
        </div>

        {/* Relief Sought (if any) */}
        {grievance.reliefSought && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Relief Sought
            </h3>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
              {grievance.reliefSought}
            </div>
          </div>
        )}

        {/* Outstanding Document Requests */}
        {grievance.documentRequests.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-purple-700" />
              <span>Faculty Document Requests</span>
            </h3>
            {grievance.documentRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl border border-purple-200 bg-purple-50 space-y-2 text-xs"
              >
                <div className="flex justify-between items-start font-semibold text-purple-900">
                  <span>Requirement:</span>
                  <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-purple-200">
                    {req.status}
                  </span>
                </div>
                <p className="text-purple-800 leading-relaxed">{req.instructions}</p>
                {req.deadline && (
                  <div className="text-[11px] text-purple-700">
                    Submission Deadline: {new Date(req.deadline).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Attached Evidence Documents */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Attached Documents ({grievance.documents.length})
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

        {/* Chronological Milestone Timeline */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Adjudication History & Timeline
          </h3>
          <div className="border-l-2 border-csjmu-200 ml-3 pl-4 space-y-4 text-xs">
            {grievance.timelineActions.map((action) => (
              <div key={action.id} className="relative">
                <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-csjmu-700 border-2 border-white ring-1 ring-csjmu-700" />
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-bold text-slate-900">
                    {action.actionType.replace(/_/g, " ")}
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
                  <p className="text-slate-700 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {action.remarks}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

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
