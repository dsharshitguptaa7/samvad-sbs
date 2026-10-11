"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Building,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit2,
  Power,
  RotateCcw,
  BookOpen,
  Users,
  ShieldAlert,
  X,
} from "lucide-react";

interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  courseCount: number;
  activeStaffCount: number;
  grievanceCount: number;
  createdAt: string;
  updatedAt: string;
}

export function DepartmentManager() {
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    code: "",
    description: "",
    isActive: true,
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal
  const [editItem, setEditItem] = useState<DepartmentItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    code: "",
    description: "",
    isActive: true,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Confirm Toggle Status Modal
  const [toggleTarget, setToggleTarget] = useState<DepartmentItem | null>(null);
  const [toggleSubmitting, setToggleSubmitting] = useState(false);

  // Load departments from API
  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/departments");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load departments.");
      }
      setDepartments(data.departments);
    } catch (err: any) {
      setError(err.message || "Failed to load departments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Filtered list
  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && d.isActive) ||
        (statusFilter === "inactive" && !d.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [departments, searchQuery, statusFilter]);

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create department.");
      }

      setSuccessNotice(`Department '${data.department.name}' created successfully.`);
      setIsCreateOpen(false);
      setCreateForm({ name: "", code: "", description: "", isActive: true });
      fetchDepartments();
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create department.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (dept: DepartmentItem) => {
    setEditItem(dept);
    setEditForm({
      name: dept.name,
      code: dept.code,
      description: dept.description || "",
      isActive: dept.isActive,
    });
    setEditError(null);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    setEditSubmitting(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/admin/departments/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update department.");
      }

      setSuccessNotice(`Department '${data.department.name}' updated successfully.`);
      setEditItem(null);
      fetchDepartments();
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      setEditError(err.message || "Failed to update department.");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle Status Toggle Submit
  const handleToggleStatus = async () => {
    if (!toggleTarget) return;
    setToggleSubmitting(true);

    try {
      const newStatus = !toggleTarget.isActive;
      const res = await fetch(`/api/admin/departments/${toggleTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update status.");
      }

      setSuccessNotice(
        `Department '${toggleTarget.name}' ${newStatus ? "activated" : "deactivated"} successfully.`
      );
      setToggleTarget(null);
      fetchDepartments();
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to update department status.");
    } finally {
      setToggleSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Alerts */}
      {successNotice && (
        <div
          role="status"
          className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-900 text-sm animate-in fade-in"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
            <span className="font-medium">{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-900"
            aria-label="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-900 text-sm"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchDepartments}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-rose-300 rounded text-xs font-semibold text-rose-700 hover:bg-rose-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Departments</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{departments.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-csjmu-50 border border-csjmu-100 flex items-center justify-center text-csjmu-800">
            <Building className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Units</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">
              {departments.filter((d) => d.isActive).length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Archived / Inactive</p>
            <p className="text-2xl font-black text-slate-500 mt-1">
              {departments.filter((d) => !d.isActive).length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
            <Power className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Status Filter & Add Department */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by department name, code, or description..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
              aria-label="Search departments"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="py-2 px-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
            aria-label="Filter by department status"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <button
          onClick={() => {
            setCreateError(null);
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 rounded-lg transition shadow-sm focus-visible:ring-2 focus-visible:ring-csjmu-700"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Add Department</span>
        </button>
      </div>

      {/* Departments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-csjmu-800 animate-spin mx-auto" aria-hidden="true" />
            <p className="text-xs text-slate-500 font-medium">Loading academic departments...</p>
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Building className="w-10 h-10 text-slate-300 mx-auto" aria-hidden="true" />
            <h3 className="text-sm font-bold text-slate-700">No departments found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== "all"
                ? "No departments match your current filter criteria."
                : "No academic departments have been created yet. Click 'Add Department' to initialize."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                  <th scope="col" className="py-3 px-4">Department Name</th>
                  <th scope="col" className="py-3 px-3">Code</th>
                  <th scope="col" className="py-3 px-3 text-center">Courses</th>
                  <th scope="col" className="py-3 px-3 text-center">Faculty</th>
                  <th scope="col" className="py-3 px-3 text-center">Grievances</th>
                  <th scope="col" className="py-3 px-3">Status</th>
                  <th scope="col" className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDepartments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div>
                        <span className="font-bold">{dept.name}</span>
                        {dept.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {dept.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[11px]">
                        {dept.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        {dept.courseCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono">
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {dept.activeStaffCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono">
                      <span className="text-slate-600">{dept.grievanceCount}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      {dept.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" aria-hidden="true" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(dept)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                        title="Edit department details"
                        aria-label={`Edit ${dept.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => setToggleTarget(dept)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border transition ${
                          dept.isActive
                            ? "border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100"
                            : "border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
                        }`}
                        title={dept.isActive ? "Deactivate department" : "Activate department"}
                        aria-label={`${dept.isActive ? "Deactivate" : "Activate"} ${dept.name}`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{dept.isActive ? "Deactivate" : "Activate"}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-dept-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-csjmu-800" />
                <h3 id="create-dept-title" className="text-base font-bold text-slate-900">
                  Add Academic Department
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label htmlFor="dept-name" className="block font-semibold text-slate-700 mb-1">
                  Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="dept-name"
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Department of Mathematics"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-csjmu-600"
                />
              </div>

              <div>
                <label htmlFor="dept-code" className="block font-semibold text-slate-700 mb-1">
                  Department Code <span className="text-rose-500">*</span>
                </label>
                <input
                  id="dept-code"
                  type="text"
                  required
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. MATH"
                  maxLength={20}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-csjmu-600 uppercase"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Unique uppercase identifier used in tracking tokens (e.g. MATH, PHYS, CHEM).
                </p>
              </div>

              <div>
                <label htmlFor="dept-desc" className="block font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  id="dept-desc"
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Brief summary of department programs, fields, and lab infrastructure..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-csjmu-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="dept-active"
                  type="checkbox"
                  checked={createForm.isActive}
                  onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-csjmu-700 focus:ring-csjmu-600"
                />
                <label htmlFor="dept-active" className="text-slate-700 font-medium">
                  Active immediately (visible on landing page and student onboarding)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-csjmu-900 hover:bg-csjmu-800 text-white rounded-lg font-bold transition shadow"
                >
                  {createSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Create Department</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-dept-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-csjmu-800" />
                <h3 id="edit-dept-title" className="text-base font-bold text-slate-900">
                  Edit Department: {editItem.name}
                </h3>
              </div>
              <button
                onClick={() => setEditItem(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label htmlFor="edit-name" className="block font-semibold text-slate-700 mb-1">
                  Department Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="edit-name"
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-csjmu-600"
                />
              </div>

              <div>
                <label htmlFor="edit-code" className="block font-semibold text-slate-700 mb-1">
                  Department Code <span className="text-rose-500">*</span>
                </label>
                <input
                  id="edit-code"
                  type="text"
                  required
                  value={editForm.code}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                  maxLength={20}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-csjmu-600 uppercase"
                />
              </div>

              <div>
                <label htmlFor="edit-desc" className="block font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  id="edit-desc"
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-csjmu-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="edit-active"
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-csjmu-700 focus:ring-csjmu-600"
                />
                <label htmlFor="edit-active" className="text-slate-700 font-medium">
                  Active Status
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-csjmu-900 hover:bg-csjmu-800 text-white rounded-lg font-bold transition shadow"
                >
                  {editSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOGGLE STATUS CONFIRMATION MODAL */}
      {toggleTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="toggle-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 id="toggle-modal-title" className="text-base font-bold text-slate-900">
                {toggleTarget.isActive ? "Deactivate Department?" : "Reactivate Department?"}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {toggleTarget.isActive ? (
                  <>
                    Deactivating <strong>{toggleTarget.name}</strong> will hide it from student grievance lodging forms.
                    All existing grievances and past historical courses remain permanently preserved in the ledger.
                  </>
                ) : (
                  <>
                    Reactivating <strong>{toggleTarget.name}</strong> will make it immediately available for student course registration and grievance filing.
                  </>
                )}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setToggleTarget(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={toggleSubmitting}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition shadow ${
                  toggleTarget.isActive
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {toggleSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{toggleTarget.isActive ? "Confirm Deactivation" : "Confirm Activation"}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
