"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Eye,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  RefreshCw,
} from "lucide-react";
import { GrievanceStatus, GrievanceTier } from "@prisma/client";
import {
  CoordinatorWorkflowModal,
  CoordinatorGrievanceDetail,
} from "./CoordinatorWorkflowModal";

interface GrievanceRow {
  id: string;
  trackingNumber: string;
  subject: string;
  category: string;
  currentTier: GrievanceTier;
  currentStatus: GrievanceStatus;
  createdAt: string;
  studentName: string;
  studentEmail: string;
  studentRollNumber: string | null;
  departmentName: string;
  courseName: string;
  documentsCount: number;
  pendingRequestsCount: number;
}

interface CoordinatorClientDashboardProps {
  initialGrievances: GrievanceRow[];
  total: number;
  assignedCoursesCount: number;
}

export function CoordinatorClientDashboard({
  initialGrievances,
  total,
  assignedCoursesCount,
}: CoordinatorClientDashboardProps) {
  const [grievances, setGrievances] = useState<GrievanceRow[]>(initialGrievances);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(Math.ceil(total / 10) || 1);
  const [loading, setLoading] = useState(false);

  const [selectedGrievance, setSelectedGrievance] = useState<CoordinatorGrievanceDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchGrievances = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (tierFilter) params.set("tier", tierFilter);
      params.set("page", page.toString());

      const res = await fetch(`/api/coordinator/grievances?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setGrievances(data.grievances);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      console.error("Queue fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, tierFilter, page]);

  useEffect(() => {
    fetchGrievances();
  }, [fetchGrievances]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchGrievances();
  };

  const openWorkflowModal = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/coordinator/grievances/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelectedGrievance(data.grievance);
    } catch (err: any) {
      alert(err.message || "Failed to load grievance details");
    } finally {
      setLoadingDetail(false);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tracking number, subject, or student roll number..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="AWAITING_STUDENT_INFO">AWAITING_STUDENT_INFO</option>
              <option value="FORWARDED">FORWARDED</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>

            <select
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600 bg-white"
            >
              <option value="">All Tiers</option>
              <option value="TIER_1_COORDINATOR">Tier 1 (Coordinator)</option>
              <option value="TIER_2_HOD">Tier 2 (HoD)</option>
              <option value="TIER_3_DIRECTOR">Tier 3 (Director)</option>
            </select>

            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-csjmu-900 hover:bg-csjmu-950 rounded-xl transition shadow-sm shrink-0"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Grievance Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Assigned Course Grievances ({grievances.length} displayed)
          </div>
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Updating...</span>
            </div>
          )}
        </div>

        {grievances.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-700">No Grievances in Queue</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {assignedCoursesCount === 0
                ? "You have not been assigned to any academic courses by System Admin. Contact admin to assign your courses."
                : "No student grievances match your active filter criteria."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold">
                  <th className="py-3 px-4">Tracking ID</th>
                  <th className="py-3 px-4">Student & Roll No</th>
                  <th className="py-3 px-4">Subject & Program</th>
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Lodged Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grievances.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-csjmu-900">
                      {g.trackingNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{g.studentName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {g.studentRollNumber || g.studentEmail}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">{g.subject}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {g.courseName} &bull; {g.category.replace(/_/g, " ")}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700">
                        {g.currentTier === "TIER_1_COORDINATOR"
                          ? "Tier 1 (CC)"
                          : g.currentTier === "TIER_2_HOD"
                          ? "Tier 2 (HoD)"
                          : "Tier 3 (Dir)"}
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
                        onClick={() => openWorkflowModal(g.id)}
                        disabled={loadingDetail}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-100 font-bold transition shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5 text-csjmu-800" />
                        <span>Adjudicate</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-200 flex justify-between items-center bg-slate-50 text-xs">
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-slate-200 rounded bg-white text-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-slate-200 rounded bg-white text-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Workflow Decision Modal */}
      {selectedGrievance && (
        <CoordinatorWorkflowModal
          grievance={selectedGrievance}
          onClose={() => setSelectedGrievance(null)}
          onActionComplete={() => {
            setSelectedGrievance(null);
            fetchGrievances();
          }}
        />
      )}
    </div>
  );
}
