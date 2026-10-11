"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit2,
  Power,
  RotateCcw,
  Building,
  UserCheck,
  ShieldAlert,
  X,
  GraduationCap,
  LayoutGrid,
} from "lucide-react";

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface AssignedCoordinator {
  id: string;
  fullName: string;
  email: string;
}

interface CourseItem {
  id: string;
  name: string;
  code: string;
  programType: string | null;
  totalSemesters?: number;
  academicPeriod?: string | null;
  isActive: boolean;
  department: DepartmentOption;
  assignedCoordinators: AssignedCoordinator[];
  grievanceCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CourseManagerProps {
  onNavigateToSemesterMatrix?: (courseId?: string) => void;
}

export function CourseManager({ onNavigateToSemesterMatrix }: CourseManagerProps = {}) {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    departmentId: "",
    name: "",
    code: "",
    programType: "Postgraduate",
    isActive: true,
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal
  const [editItem, setEditItem] = useState<CourseItem | null>(null);
  const [editForm, setEditForm] = useState({
    departmentId: "",
    name: "",
    code: "",
    programType: "",
    isActive: true,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Status Toggle Target
  const [toggleTarget, setToggleTarget] = useState<CourseItem | null>(null);
  const [toggleSubmitting, setToggleSubmitting] = useState(false);

  // Fetch departments and courses
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [coursesRes, deptsRes] = await Promise.all([
        fetch("/api/admin/courses"),
        fetch("/api/admin/departments"),
      ]);

      const coursesData = await coursesRes.json();
      const deptsData = await deptsRes.json();

      if (!coursesRes.ok || !coursesData.success) {
        throw new Error(coursesData.error || "Failed to load courses.");
      }
      if (!deptsRes.ok || !deptsData.success) {
        throw new Error(deptsData.error || "Failed to load departments.");
      }

      setCourses(coursesData.courses);
      setDepartments(deptsData.departments);

      if (deptsData.departments.length > 0) {
        setCreateForm((prev) => (prev.departmentId ? prev : { ...prev, departmentId: deptsData.departments[0].id }));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load course master data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.programType && c.programType.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.department.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept =
        selectedDeptFilter === "all" || c.department.id === selectedDeptFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && c.isActive) ||
        (statusFilter === "inactive" && !c.isActive);

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [courses, searchQuery, selectedDeptFilter, statusFilter]);

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create course.");
      }

      setSuccessNotice(`Course '${data.course.name}' created successfully.`);
      setIsCreateOpen(false);
      setCreateForm({
        departmentId: departments[0]?.id || "",
        name: "",
        code: "",
        programType: "Postgraduate",
        isActive: true,
      });
      fetchData();
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create course.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (course: CourseItem) => {
    setEditItem(course);
    setEditForm({
      departmentId: course.department.id,
      name: course.name,
      code: course.code,
      programType: course.programType || "",
      isActive: course.isActive,
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
      const res = await fetch(`/api/admin/courses/${editItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update course.");
      }

      setSuccessNotice(`Course '${data.course.name}' updated successfully.`);
      setEditItem(null);
      fetchData();
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      setEditError(err.message || "Failed to update course.");
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
      const res = await fetch(`/api/admin/courses/${toggleTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update course status.");
      }

      setSuccessNotice(
        `Course '${toggleTarget.name}' ${newStatus ? "activated" : "deactivated"} successfully.`
      );
      setToggleTarget(null);
      fetchData();
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to update course status.");
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
            onClick={fetchData}
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
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Courses</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{courses.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-csjmu-50 border border-csjmu-100 flex items-center justify-center text-csjmu-800">
            <BookOpen className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Offerings</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">
              {courses.filter((c) => c.isActive).length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Archived Courses</p>
            <p className="text-2xl font-black text-slate-500 mt-1">
              {courses.filter((c) => !c.isActive).length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
            <Power className="w-5 h-5" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Department Filter, Status Filter & Add Course */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by course name, code, or program..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
              aria-label="Search courses"
            />
          </div>

          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="py-2 px-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
            aria-label="Filter courses by department"
          >
            <option value="all">All Departments ({departments.length})</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="py-2 px-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
            aria-label="Filter courses by status"
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
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 rounded-lg transition shadow-sm focus-visible:ring-2 focus-visible:ring-csjmu-700 shrink-0"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Add Course</span>
        </button>
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-csjmu-800 animate-spin mx-auto" aria-hidden="true" />
            <p className="text-xs text-slate-500 font-medium">Loading courses...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" aria-hidden="true" />
            <h3 className="text-sm font-bold text-slate-700">No courses found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || selectedDeptFilter !== "all" || statusFilter !== "all"
                ? "No courses match your filter criteria."
                : "No courses have been created yet. Click 'Add Course' to associate a course program with a department."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                  <th scope="col" className="py-3 px-4">Course Name</th>
                  <th scope="col" className="py-3 px-3">Code</th>
                  <th scope="col" className="py-3 px-3">Parent Department</th>
                  <th scope="col" className="py-3 px-3">Program Level</th>
                  <th scope="col" className="py-3 px-3">Semesters</th>
                  <th scope="col" className="py-3 px-3">Assigned Coordinator</th>
                  <th scope="col" className="py-3 px-3">Status</th>
                  <th scope="col" className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCourses.map((crs) => (
                  <tr key={crs.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <span className="font-bold">{crs.name}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[11px]">
                        {crs.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {crs.department.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[11px]">
                        {crs.programType || "Standard"}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        <span>{crs.totalSemesters || 6} Sems</span>
                        {crs.academicPeriod && crs.academicPeriod !== "ALL" && (
                          <span className="text-[10px] text-csjmu-800 font-bold">({crs.academicPeriod})</span>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      {crs.assignedCoordinators.length > 0 ? (
                        <div className="space-y-0.5">
                          {crs.assignedCoordinators.map((coord) => (
                            <div key={coord.id} className="inline-flex items-center gap-1 text-[11px] font-medium text-csjmu-900 bg-csjmu-50 border border-csjmu-100 px-2 py-0.5 rounded">
                              <UserCheck className="w-3 h-3 text-csjmu-700" />
                              <span>{coord.fullName}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="inline-block text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          Unassigned (Tier 1 Empty)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      {crs.isActive ? (
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
                      {onNavigateToSemesterMatrix && (
                        <button
                          onClick={() => onNavigateToSemesterMatrix(crs.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-csjmu-200 bg-csjmu-50 text-csjmu-900 hover:bg-csjmu-100 transition"
                          title="View semester coordinator matrix for this course"
                        >
                          <LayoutGrid className="w-3.5 h-3.5 text-csjmu-700" />
                          <span>Semester Matrix</span>
                        </button>
                      )}

                      <button
                        onClick={() => openEditModal(crs)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                        title="Edit course details"
                        aria-label={`Edit ${crs.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => setToggleTarget(crs)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border transition ${
                          crs.isActive
                            ? "border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100"
                            : "border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
                        }`}
                        title={crs.isActive ? "Deactivate course" : "Activate course"}
                        aria-label={`${crs.isActive ? "Deactivate" : "Activate"} ${crs.name}`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{crs.isActive ? "Deactivate" : "Activate"}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE COURSE MODAL */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-course-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-csjmu-800" />
                <h3 id="create-course-title" className="text-base font-bold text-slate-900">
                  Add Course Offering
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
                <label htmlFor="crs-dept" className="block font-semibold text-slate-700 mb-1">
                  Parent Department <span className="text-rose-500">*</span>
                </label>
                <select
                  id="crs-dept"
                  required
                  value={createForm.departmentId}
                  onChange={(e) => setCreateForm({ ...createForm, departmentId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-csjmu-600"
                >
                  <option value="" disabled>Select department...</option>
                  {departments
                    .filter((d) => d.isActive)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="crs-name" className="block font-semibold text-slate-700 mb-1">
                  Course Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="crs-name"
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. M.Sc. Mathematics"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-csjmu-600"
                />
              </div>

              <div>
                <label htmlFor="crs-code" className="block font-semibold text-slate-700 mb-1">
                  Course Code <span className="text-rose-500">*</span>
                </label>
                <input
                  id="crs-code"
                  type="text"
                  required
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. MSCMATH"
                  maxLength={30}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-csjmu-600 uppercase"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Unique course code within this department.
                </p>
              </div>

              <div>
                <label htmlFor="crs-prog" className="block font-semibold text-slate-700 mb-1">
                  Program Level
                </label>
                <select
                  id="crs-prog"
                  value={createForm.programType}
                  onChange={(e) => setCreateForm({ ...createForm, programType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-csjmu-600"
                >
                  <option value="Undergraduate">Undergraduate (B.Sc. / B.A.)</option>
                  <option value="Postgraduate">Postgraduate (M.Sc. / M.A.)</option>
                  <option value="Doctoral">Doctoral (Ph.D.)</option>
                  <option value="Diploma">Post Graduate Diploma</option>
                  <option value="Certificate">Certificate Program</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="crs-active"
                  type="checkbox"
                  checked={createForm.isActive}
                  onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-csjmu-700 focus:ring-csjmu-600"
                />
                <label htmlFor="crs-active" className="text-slate-700 font-medium">
                  Active immediately (selectable in student grievance forms)
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
                    <span>Create Course</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT COURSE MODAL */}
      {editItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-course-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-csjmu-800" />
                <h3 id="edit-course-title" className="text-base font-bold text-slate-900">
                  Edit Course: {editItem.name}
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
                <label htmlFor="edit-crs-dept" className="block font-semibold text-slate-700 mb-1">
                  Parent Department <span className="text-rose-500">*</span>
                </label>
                <select
                  id="edit-crs-dept"
                  required
                  value={editForm.departmentId}
                  onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-csjmu-600"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code}) {!d.isActive && "(Inactive)"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="edit-crs-name" className="block font-semibold text-slate-700 mb-1">
                  Course Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="edit-crs-name"
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-csjmu-600"
                />
              </div>

              <div>
                <label htmlFor="edit-crs-code" className="block font-semibold text-slate-700 mb-1">
                  Course Code <span className="text-rose-500">*</span>
                </label>
                <input
                  id="edit-crs-code"
                  type="text"
                  required
                  value={editForm.code}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                  maxLength={30}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-csjmu-600 uppercase"
                />
              </div>

              <div>
                <label htmlFor="edit-crs-prog" className="block font-semibold text-slate-700 mb-1">
                  Program Level
                </label>
                <select
                  id="edit-crs-prog"
                  value={editForm.programType}
                  onChange={(e) => setEditForm({ ...editForm, programType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-csjmu-600"
                >
                  <option value="Undergraduate">Undergraduate (B.Sc. / B.A.)</option>
                  <option value="Postgraduate">Postgraduate (M.Sc. / M.A.)</option>
                  <option value="Doctoral">Doctoral (Ph.D.)</option>
                  <option value="Diploma">Post Graduate Diploma</option>
                  <option value="Certificate">Certificate Program</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="edit-crs-active"
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-csjmu-700 focus:ring-csjmu-600"
                />
                <label htmlFor="edit-crs-active" className="text-slate-700 font-medium">
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

      {/* STATUS TOGGLE CONFIRMATION MODAL */}
      {toggleTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="toggle-course-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 id="toggle-course-modal-title" className="text-base font-bold text-slate-900">
                {toggleTarget.isActive ? "Deactivate Course?" : "Reactivate Course?"}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {toggleTarget.isActive ? (
                  <>
                    Deactivating <strong>{toggleTarget.name}</strong> ({toggleTarget.code}) will prevent students from lodging new complaints for this course.
                    All existing grievances and assigned audit records remain permanently intact in the university ledger.
                  </>
                ) : (
                  <>
                    Reactivating <strong>{toggleTarget.name}</strong> ({toggleTarget.code}) will immediately re-enable it for student grievance filing.
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
