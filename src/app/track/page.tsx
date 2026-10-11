"use client";

import React, { useState } from "react";
import {
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  GraduationCap,
  Layers,
  ShieldCheck,
} from "lucide-react";

interface PublicMilestone {
  actionType: string;
  fromTier: string | null;
  toTier: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  timestamp: string;
}

interface PublicTrackingRecord {
  trackingNumber: string;
  category: string;
  currentStatus: string;
  currentTier: string;
  submittedAt: string;
  resolvedAt: string | null;
  departmentName: string;
  departmentCode: string;
  courseName: string;
  courseCode: string;
  milestones: PublicMilestone[];
}

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useCallback } from "react";

function TrackGrievanceContent() {
  const searchParams = useSearchParams();
  const [tokenInput, setTokenInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<PublicTrackingRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRecord = useCallback(async (token: string) => {
    if (!token.trim()) return;
    setError(null);
    setRecord(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/track?trackingNumber=${encodeURIComponent(token.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Grievance record not found.");
      }

      setRecord(data.trackingRecord);
    } catch (err: any) {
      setError(err.message || "Failed to search tracking record.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const param = searchParams.get("trackingNumber");
    if (param) {
      setTokenInput(param.toUpperCase());
      fetchRecord(param.toUpperCase());
    }
  }, [searchParams, fetchRecord]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecord(tokenInput);
  };

  const getStatusBadge = (status: string) => {
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

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case "TIER_1_COORDINATOR":
        return "Tier 1: Course Coordinator Review";
      case "TIER_2_HOD":
        return "Tier 2: Department Head Review";
      case "TIER_3_DIRECTOR":
        return "Tier 3: School Director Review";
      default:
        return tier.replace(/_/g, " ");
    }
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
        <p className="mt-1 text-sm text-slate-600 leading-relaxed">
          Enter your official tracking token to check real-time progress across review tiers.
          For privacy protection, student identity and confidential files are strictly hidden on public lookups.
        </p>
      </div>

      {/* Search Input Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label htmlFor="trackingId" className="block text-xs font-bold text-slate-700 mb-1.5">
              Grievance Tracking Number <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  id="trackingId"
                  name="trackingId"
                  type="text"
                  required
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="e.g. CSJMU-SBS-2026-MATH-0142"
                  className="w-full px-4 py-3 text-sm font-mono uppercase rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 transition shadow-sm focus-visible:ring-csjmu-600 shrink-0 disabled:opacity-50"
              >
                {loading ? (
                  <span>Querying Ledger...</span>
                ) : (
                  <>
                    <Search className="w-4 h-4" aria-hidden="true" />
                    <span>Search Tracking Record</span>
                  </>
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Format: <span className="font-mono">CSJMU-SBS-[YEAR]-[DEPT]-[CODE]</span>
            </p>
          </div>
        </form>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          <div className="leading-relaxed font-medium">{error}</div>
        </div>
      )}

      {/* Result Display */}
      {record && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                  {record.trackingNumber}
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                    record.currentStatus
                  )}`}
                >
                  {record.currentStatus.replace(/_/g, " ")}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-2">
                {record.courseName} ({record.courseCode})
              </h2>
              <div className="text-xs text-slate-500 mt-0.5">
                {record.departmentName} &bull; Category: {record.category.replace(/_/g, " ")}
              </div>
            </div>

            <div className="text-right sm:border-l sm:pl-4 sm:border-slate-200 text-xs text-slate-500">
              <div>Lodged On:</div>
              <div className="font-bold text-slate-800 mt-0.5">
                {new Date(record.submittedAt).toLocaleDateString("en-IN", {
                  dateStyle: "medium",
                })}
              </div>
            </div>
          </div>

          {/* Current Tier Notice */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center gap-3">
            <Layers className="w-5 h-5 text-csjmu-800 shrink-0" />
            <div className="text-xs text-csjmu-900">
              <span className="font-bold">Active Review Tier:</span> {getTierLabel(record.currentTier)}
            </div>
          </div>

          {/* Public Milestone Timeline */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Public Milestone Trail
            </h3>
            <div className="border-l-2 border-csjmu-200 ml-3 pl-4 space-y-5 text-xs">
              {record.milestones.map((m, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-csjmu-700 border-2 border-white ring-1 ring-csjmu-700" />
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-bold text-slate-900">
                      {m.actionType.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(m.timestamp).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {m.toTier && <span>Moved to {getTierLabel(m.toTier)} &bull; </span>}
                    {m.toStatus && <span>Status: {m.toStatus.replace(/_/g, " ")}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy Notice Footnote */}
          <div className="pt-4 border-t border-slate-200 flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              End-to-end institutional privacy: Complainant details and confidential file attachments are protected under CSJMU grievance policy.
            </span>
          </div>
        </div>
      )}

      {/* Empty State when no query has been run */}
      {!record && !error && (
        <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
            <FileText className="w-6 h-6" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">No Query Executed</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Enter your tracking token above to query the live grievance database.
          </p>
        </div>
      )}
    </div>
  );
}

export default function TrackGrievancePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-500 text-sm">
          Loading Grievance Tracking Desk...
        </div>
      }
    >
      <TrackGrievanceContent />
    </Suspense>
  );
}
