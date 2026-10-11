"use client";

import React, { useState } from "react";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  FilePlus,
  Eye,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { GrievanceLodgingForm } from "./GrievanceLodgingForm";
import {
  GrievanceDetailModal,
  GrievanceDetailData,
} from "./GrievanceDetailModal";
import { GrievanceStatus, GrievanceTier } from "@prisma/client";

interface CourseOption {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  departmentName: string;
}

interface GrievanceSummary {
  id: string;
  trackingNumber: string;
  subject: string;
  category: string;
  currentTier: GrievanceTier;
  currentStatus: GrievanceStatus;
  createdAt: string;
  departmentName: string;
  courseName: string;
  documentsCount: number;
  pendingRequestsCount: number;
}

interface StudentClientDashboardProps {
  initialGrievances: GrievanceSummary[];
  courses: CourseOption[];
}

export function StudentClientDashboard({
  initialGrievances,
  courses,
}: StudentClientDashboardProps) {
  const [grievances, setGrievances] = useState<GrievanceSummary[]>(initialGrievances);
  const [showLodgingForm, setShowLodgingForm] = useState(false);
  const [selectedGrievance, setSelectedGrievance] = useState<GrievanceDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [newlyCreatedTrackingNumber, setNewlyCreatedTrackingNumber] = useState<string | null>(null);

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

  const getTierBadge = (tier: GrievanceTier) => {
    switch (tier) {
      case "TIER_1_COORDINATOR":
        return "Tier 1 (Coordinator)";
      case "TIER_2_HOD":
        return "Tier 2 (HoD)";
      case "TIER_3_DIRECTOR":
        return "Tier 3 (Director)";
    }
  };

  const viewGrievanceDetails = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/student/grievances/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelectedGrievance(data.grievance);
    } catch (err: any) {
      alert(err.message || "Failed to load grievance details");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSubmissionSuccess = (trackingNumber: string) => {
    setShowLodgingForm(false);
    setNewlyCreatedTrackingNumber(trackingNumber);
    // Reload page to reflect updated database records
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {newlyCreatedTrackingNumber && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start justify-between text-xs text-emerald-900">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm">Grievance Lodged Successfully!</div>
              <div className="mt-1 leading-relaxed">
                Your case has been recorded and assigned to Tier-1 Course Coordinator. Your Tracking Number is:{" "}
                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-300">
                  {newlyCreatedTrackingNumber}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setNewlyCreatedTrackingNumber(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* Lodging Form Modal / Expandable View */}
      {showLodgingForm ? (
        <GrievanceLodgingForm
          courses={courses}
          onSuccess={handleSubmissionSuccess}
          onCancel={() => setShowLodgingForm(false)}
        />
      ) : (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Grievance Submission & History
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track active adjudications, respond to faculty requests, or lodge a new formal complaint.
            </p>
          </div>
          <button
            onClick={() => setShowLodgingForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 rounded-xl transition shadow-sm"
          >
            <FilePlus className="w-4 h-4" />
            <span>Lodge New Grievance</span>
          </button>
        </div>
      )}

      {/* Grievance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
            My Lodged Grievances ({grievances.length})
          </div>
        </div>

        {grievances.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-700">No Grievances Lodged</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven&apos;t submitted any grievances yet. Click &quot;Lodge New Grievance&quot; above to submit an academic issue.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold">
                  <th className="py-3 px-4">Tracking ID</th>
                  <th className="py-3 px-4">Subject & Program</th>
                  <th className="py-3 px-4">Current Tier</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted On</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grievances.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-csjmu-900">
                      {g.trackingNumber}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">{g.subject}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {g.courseName} &bull; {g.category.replace(/_/g, " ")}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700">
                        {getTierBadge(g.currentTier)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block font-bold px-2 py-0.5 rounded text-[10px] border ${getStatusBadge(
                          g.currentStatus
                        )}`}
                      >
                        {g.currentStatus.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(g.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => viewGrievanceDetails(g.id)}
                        disabled={loadingDetail}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-csjmu-800" />
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Viewing Full Grievance History */}
      {selectedGrievance && (
        <GrievanceDetailModal
          grievance={selectedGrievance}
          onClose={() => setSelectedGrievance(null)}
        />
      )}
    </div>
  );
}
