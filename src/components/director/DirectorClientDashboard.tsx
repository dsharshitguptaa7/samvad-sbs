"use client";

import React, { useState } from "react";
import {
  Search,
  Filter,
  Eye,
  Award,
  RefreshCw,
} from "lucide-react";
import { GrievanceStatus, GrievanceTier } from "@prisma/client";
import {
  DirectorWorkflowModal,
  DirectorGrievanceDetail,
} from "./DirectorWorkflowModal";

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

interface DirectorClientDashboardProps {
  initialGrievances: GrievanceRow[];
  total: number;
}

export function DirectorClientDashboard({
  initialGrievances,
  total,
}: DirectorClientDashboardProps) {
  const [grievances, setGrievances] = useState<GrievanceRow[]>(initialGrievances);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tierFilter, setTierFilter] = useState(GrievanceTier.TIER_3_DIRECTOR);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(Math.ceil(total / 10) || 1);
  const [loading, setLoading] = useState(false);

  const [selectedGrievance, setSelectedGrievance] = useState<DirectorGrievanceDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchGrievances = async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "10",
      });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (tierFilter) params.set("tier", tierFilter);

      const res = await fetch(`/api/director/grievances?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setGrievances(data.grievances);
        setTotalPages(data.totalPages || 1);
        setPage(data.page || 1);
      }
    } catch (err) {
      console.error("Failed to load Director grievances:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGrievances(1);
  };

  const openGrievanceModal = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/director/grievances/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedGrievance(data.grievance);
      }
    } catch (err) {
      console.error("Failed to fetch grievance detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleActionSuccess = (updatedGrievance: any) => {
    setSelectedGrievance(null);
    fetchGrievances(page);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search across SBS by tracking ID, subject, student name, or roll number..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-csjmu-900 focus:border-csjmu-900"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-200 rounded-xl text-xs px-3 py-2 bg-white text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="FORWARDED">FORWARDED (Escalated to Directorate)</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="AWAITING_STUDENT_INFO">AWAITING_STUDENT_INFO</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="DISMISSED">DISMISSED</option>
            </select>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as any)}
              className="border border-slate-200 rounded-xl text-xs px-3 py-2 bg-white text-slate-700 font-medium"
            >
              <option value="TIER_3_DIRECTOR">Tier 3 (Escalated to Director)</option>
              <option value="">All School Tiers (Overview)</option>
              <option value="TIER_2_HOD">Tier 2 (HoD Queue)</option>
              <option value="TIER_1_COORDINATOR">Tier 1 (Coordinator Queue)</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-csjmu-950 hover:bg-csjmu-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setTierFilter(GrievanceTier.TIER_3_DIRECTOR);
                fetchGrievances(1);
              }}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors"
              title="Reset Filters"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Grievance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-csjmu-900" />
            Loading Directorate appellate queue...
          </div>
        ) : grievances.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Award className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Escalated Grievances Pending</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are currently no cases escalated to Tier 3 matching your filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Tracking ID</th>
                  <th className="px-4 py-3">Subject & Category</th>
                  <th className="px-4 py-3">Department & Course</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Appellate Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grievances.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-semibold text-csjmu-950">
                      {g.trackingNumber}
                      <span className="block text-[10px] font-sans font-normal text-slate-400">
                        {new Date(g.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-900 truncate max-w-xs">{g.subject}</p>
                      <span className="inline-block mt-0.5 text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {g.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-900">{g.departmentName}</p>
                      <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{g.courseName}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-900">{g.studentName}</p>
                      <p className="text-[10px] text-slate-400">
                        {g.studentRollNumber ? `Roll: ${g.studentRollNumber}` : g.studentEmail}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          g.currentTier === "TIER_3_DIRECTOR"
                            ? "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
                            : g.currentTier === "TIER_2_HOD"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {g.currentTier === "TIER_3_DIRECTOR"
                          ? "Tier 3 (Director)"
                          : g.currentTier === "TIER_2_HOD"
                          ? "Tier 2 (HoD)"
                          : "Tier 1 (Coordinator)"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          g.currentStatus === "RESOLVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : g.currentStatus === "DISMISSED"
                            ? "bg-rose-100 text-rose-800"
                            : g.currentStatus === "UNDER_REVIEW"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {g.currentStatus}
                      </span>
                      {g.pendingRequestsCount > 0 && (
                        <span className="block text-[9px] text-blue-600 font-semibold mt-0.5">
                          Req. Pending ({g.pendingRequestsCount})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => openGrievanceModal(g.id)}
                        disabled={loadingDetail}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-csjmu-900 hover:bg-csjmu-950 text-white rounded-lg font-semibold transition-colors text-xs shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Adjudicate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => fetchGrievances(page - 1)}
                className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => fetchGrievances(page + 1)}
                className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Workflow Modal */}
      {selectedGrievance && (
        <DirectorWorkflowModal
          grievance={selectedGrievance}
          onClose={() => setSelectedGrievance(null)}
          onActionSuccess={handleActionSuccess}
        />
      )}
    </div>
  );
}
