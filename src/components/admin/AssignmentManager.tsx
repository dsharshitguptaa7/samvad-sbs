"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Link2,
  Plus,
  Building,
  BookOpen,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Power,
  RotateCcw,
  Search,
  X,
  ShieldAlert,
  LayoutGrid,
  ListFilter,
  Calendar,
} from "lucide-react";

interface AssignmentUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface AssignmentDepartment {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface AssignmentCourse {
  id: string;
  name: string;
  code: string;
  totalSemesters?: number;
  academicPeriod?: string | null;
  isActive: boolean;
}

interface StaffAssignmentItem {
  id: string;
  role: "COURSE_COORDINATOR" | "DEPARTMENT_HEAD" | "DIRECTOR";
  isActive: boolean;
  assignedAt: string;
  unassignedAt: string | null;
  semesters?: number[];
  academicPeriod?: string | null;
  user: AssignmentUser;
  department: AssignmentDepartment;
  course: AssignmentCourse | null;
}

interface RawDepartment {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  courses: Array<{
    id: string;
    name: string;
    code: string;
    totalSemesters?: number;
    academicPeriod?: string | null;
    isActive: boolean;
  }>;
}

interface AssignmentManagerProps {
  initialView?: "TABLE" | "MATRIX";
  defaultCourseId?: string;
  onViewChange?: (view: "TABLE" | "MATRIX") => void;
}

export function AssignmentManager({
  initialView = "TABLE",
  defaultCourseId,
  onViewChange,
}: AssignmentManagerProps = {}) {
  const [assignments, setAssignments] = useState<StaffAssignmentItem[]>([]);
  const [staffUsers, setStaffUsers] = useState<AssignmentUser[]>([]);
  const [departments, setDepartments] = useState<RawDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // View Mode
  const [viewMode, setViewMode] = useState<"TABLE" | "MATRIX">(initialView);

  // Sync viewMode when initialView prop changes
  useEffect(() => {
    setViewMode(initialView);
  }, [initialView]);

  const handleViewChange = (newView: "TABLE" | "MATRIX") => {
    setViewMode(newView);
    onViewChange?.(newView);
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [activeOnly, setActiveOnly] = useState(true);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    userId: "",
    role: "COURSE_COORDINATOR" as "COURSE_COORDINATOR" | "DEPARTMENT_HEAD",
    departmentId: "",
    courseId: "",
    semesterMode: "ALL" as "ALL" | "ODD" | "EVEN" | "PAIR_1_2" | "PAIR_3_4" | "PAIR_5_6" | "CUSTOM",
    selectedSemesters: [] as number[],
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Deactivate Target
  const [deactivateTarget, setDeactivateTarget] = useState<StaffAssignmentItem | null>(null);
  const [deactivateSubmitting, setDeactivateSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignRes, staffRes, deptRes] = await Promise.all([
        fetch("/api/admin/assignments"),
        fetch("/api/admin/staff"),
        fetch("/api/admin/departments"),
      ]);

      const assignData = await assignRes.json();
      const staffData = await staffRes.json();
      const deptData = await deptRes.json();

      if (!assignRes.ok || !assignData.success) throw new Error(assignData.error || "Failed to load assignments.");
      if (!staffRes.ok || !staffData.success) throw new Error(staffData.error || "Failed to load staff.");
      if (!deptRes.ok || !deptData.success) throw new Error(deptData.error || "Failed to load departments.");

      setAssignments(Array.isArray(assignData.assignments) ? assignData.assignments : []);
      setStaffUsers(Array.isArray(staffData.staff) ? staffData.staff : []);
      const normalizedDepts = (Array.isArray(deptData.departments) ? deptData.departments : []).map(
        (d: any) => ({
          ...d,
          courses: Array.isArray(d.courses) ? d.courses : [],
        })
      );
      setDepartments(normalizedDepts);

      if (normalizedDepts.length > 0 && !createForm.departmentId) {
        setCreateForm((prev) => ({
          ...prev,
          departmentId: normalizedDepts[0].id,
        }));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load authority assignments.");
    } finally {
      setLoading(false);
    }
  }, [createForm.departmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Selected department courses for creation modal
  const activeCoursesForSelectedDept = useMemo(() => {
    const dept = departments.find((d) => d.id === createForm.departmentId);
    return Array.isArray(dept?.courses) ? dept.courses.filter((c) => c.isActive) : [];
  }, [departments, createForm.departmentId]);

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchesSearch =
        a.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.department.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.course && a.course.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRole = roleFilter === "all" || a.role === roleFilter;
      const matchesDept = deptFilter === "all" || a.department.id === deptFilter;
      const matchesActive = !activeOnly || a.isActive;

      return matchesSearch && matchesRole && matchesDept && matchesActive;
    });
  }, [assignments, searchQuery, roleFilter, deptFilter, activeOnly]);

  // Computed course mapping matrix for all courses
  const courseMappings = useMemo(() => {
    const list: Array<{
      course: { id: string; name: string; code: string; totalSemesters: number; academicPeriod: string };
      department: { id: string; name: string; code: string };
      semesters: Array<{
        semester: number;
        coordinators: Array<{ id: string; fullName: string; email: string }>;
        status: "ASSIGNED" | "MISSING" | "CONFLICT";
      }>;
      allAssigned: boolean;
      hasConflict: boolean;
    }> = [];

    const deptsToInclude = deptFilter === "all" ? departments : departments.filter((d) => d.id === deptFilter);

    for (const d of deptsToInclude) {
      for (const c of d.courses || []) {
        if (!c.isActive) continue;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const match = c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q);
          if (!match) continue;
        }

        const totalSems = c.totalSemesters || 6;
        const activeCourseAssignments = assignments.filter(
          (a) => a.isActive && a.role === "COURSE_COORDINATOR" && a.course?.id === c.id
        );

        const semesterData = [];
        let allAssigned = true;
        let hasConflict = false;

        for (let s = 1; s <= totalSems; s++) {
          const matching = activeCourseAssignments.filter((a) => {
            if (a.semesters && a.semesters.length > 0) return a.semesters.includes(s);
            if (a.academicPeriod === "ODD") return s % 2 === 1;
            if (a.academicPeriod === "EVEN") return s % 2 === 0;
            return true;
          });

          const coords = matching.map((m) => ({ id: m.user.id, fullName: m.user.fullName, email: m.user.email }));
          const status: "ASSIGNED" | "MISSING" | "CONFLICT" =
            coords.length === 1 ? "ASSIGNED" : coords.length === 0 ? "MISSING" : "CONFLICT";
          if (status !== "ASSIGNED") allAssigned = false;
          if (status === "CONFLICT") hasConflict = true;

          semesterData.push({ semester: s, coordinators: coords, status });
        }

        list.push({
          course: {
            id: c.id,
            name: c.name,
            code: c.code,
            totalSemesters: totalSems,
            academicPeriod: c.academicPeriod || "ALL",
          },
          department: { id: d.id, name: d.name, code: d.code },
          semesters: semesterData,
          allAssigned,
          hasConflict,
        });
      }
    }

    return list;
  }, [departments, assignments, deptFilter, searchQuery]);

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);

    let semestersToSubmit: number[] = [];
    let academicPeriodToSubmit: string | null = null;

    if (createForm.role === "COURSE_COORDINATOR") {
      const selectedCourse = activeCoursesForSelectedDept.find((c) => c.id === createForm.courseId);
      const totalSems = selectedCourse?.totalSemesters || 6;

      if (createForm.semesterMode === "ALL") {
        semestersToSubmit = [];
        academicPeriodToSubmit = "ALL";
      } else if (createForm.semesterMode === "ODD") {
        semestersToSubmit = Array.from({ length: totalSems }, (_, i) => i + 1).filter((s) => s % 2 === 1);
        academicPeriodToSubmit = "ODD";
      } else if (createForm.semesterMode === "EVEN") {
        semestersToSubmit = Array.from({ length: totalSems }, (_, i) => i + 1).filter((s) => s % 2 === 0);
        academicPeriodToSubmit = "EVEN";
      } else if (createForm.semesterMode === "PAIR_1_2") {
        semestersToSubmit = [1, 2].filter((s) => s <= totalSems);
      } else if (createForm.semesterMode === "PAIR_3_4") {
        semestersToSubmit = [3, 4].filter((s) => s <= totalSems);
      } else if (createForm.semesterMode === "PAIR_5_6") {
        semestersToSubmit = [5, 6].filter((s) => s <= totalSems);
      } else if (createForm.semesterMode === "CUSTOM") {
        semestersToSubmit = createForm.selectedSemesters.sort((a, b) => a - b);
        if (semestersToSubmit.length === 0) {
          setCreateError("Please select at least one semester for this coordinator assignment.");
          setCreateSubmitting(false);
          return;
        }
      }
    }

    const payload = {
      userId: createForm.userId,
      role: createForm.role,
      departmentId: createForm.departmentId,
      courseId: createForm.role === "COURSE_COORDINATOR" ? createForm.courseId : null,
      semesters: semestersToSubmit,
      academicPeriod: academicPeriodToSubmit,
    };

    try {
      const res = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create assignment.");
      }

      setSuccessNotice(`Authority assignment created for ${data.assignment.user.fullName}.`);
      setIsCreateOpen(false);
      fetchData();
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create assignment.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Handle Deactivate Submit
  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivateSubmitting(true);

    try {
      const res = await fetch(`/api/admin/assignments/${deactivateTarget.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to deactivate assignment.");
      }

      setSuccessNotice("Authority assignment deactivated.");
      setDeactivateTarget(null);
      fetchData();
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to deactivate assignment.");
    } finally {
      setDeactivateSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successNotice && (
        <div
          role="status"
          className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-900 text-sm animate-in fade-in"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{successNotice}</span>
          </div>
          <button onClick={() => setSuccessNotice(null)} className="text-emerald-700 hover:text-emerald-900">
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
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
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

      {/* Top Subtab Bar for Authority Assignments vs Semester Matrix */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-lg">
          <button
            type="button"
            onClick={() => handleViewChange("MATRIX")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-md transition ${
              viewMode === "MATRIX"
                ? "bg-white text-csjmu-950 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-csjmu-800" />
            <span>Semester-Wise Routing Matrix</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-csjmu-50 text-csjmu-900 border border-csjmu-200 font-bold">
              {courseMappings.length} Courses
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleViewChange("TABLE")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-md transition ${
              viewMode === "TABLE"
                ? "bg-white text-csjmu-950 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ListFilter className="w-4 h-4 text-csjmu-800" />
            <span>Authority Tenures & History</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
              {assignments.length} Records
            </span>
          </button>
        </div>

        <button
          onClick={() => {
            setCreateError(null);
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 rounded-lg transition shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Assign Authority</span>
        </button>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assignments by official, course, or department..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="py-2 px-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
          >
            <option value="all">All Roles</option>
            <option value="COURSE_COORDINATOR">Course Coordinators</option>
            <option value="DEPARTMENT_HEAD">Department Heads (HoD)</option>
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="py-2 px-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
          >
            <option value="all">All Departments ({departments.length})</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded border-slate-300 text-csjmu-800 focus:ring-csjmu-600"
            />
            <span>Active Tenures Only</span>
          </label>
        </div>
      </div>

      {viewMode === "MATRIX" ? (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
              <Loader2 className="w-8 h-8 text-csjmu-800 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Loading semester routing matrix...</p>
            </div>
          ) : courseMappings.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No courses match filter</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active courses found for the selected department and search query.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {courseMappings.map((cm) => (
                <div
                  key={cm.course.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">
                          {cm.course.name} ({cm.course.code})
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {cm.course.totalSemesters} Semesters
                        </span>
                        {cm.allAssigned ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            All Semesters Assigned
                          </span>
                        ) : cm.hasConflict ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Semester Conflict Detected
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Incomplete Coverage
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {cm.department.name} ({cm.department.code}) &bull; Active Academic Period: {cm.course.academicPeriod}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setCreateForm({
                          userId: "",
                          role: "COURSE_COORDINATOR",
                          departmentId: cm.department.id,
                          courseId: cm.course.id,
                          semesterMode: "ALL",
                          selectedSemesters: [],
                        });
                        setIsCreateOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 shrink-0 self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Assign Coordinator</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    {cm.semesters.map((s) => (
                      <div
                        key={s.semester}
                        className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between space-y-1.5 ${
                          s.status === "ASSIGNED"
                            ? "bg-emerald-50/70 border-emerald-200"
                            : s.status === "CONFLICT"
                            ? "bg-amber-50 border-amber-200"
                            : "bg-rose-50/70 border-rose-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">Semester {s.semester}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              s.status === "ASSIGNED"
                                ? "bg-emerald-100 text-emerald-800"
                                : s.status === "CONFLICT"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {s.status}
                          </span>
                        </div>

                        {s.status === "ASSIGNED" && s.coordinators[0] ? (
                          <div className="text-[11px] text-emerald-950 font-medium">
                            <span className="font-semibold">{s.coordinators[0].fullName}</span>
                            <p className="text-[10px] text-emerald-700 truncate">{s.coordinators[0].email}</p>
                          </div>
                        ) : s.status === "CONFLICT" ? (
                          <div className="text-[10px] text-amber-900 font-semibold">
                            {s.coordinators.map((c) => c.fullName).join(", ")}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-rose-700 font-medium italic">
                              Unassigned
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setCreateForm({
                                  userId: "",
                                  role: "COURSE_COORDINATOR",
                                  departmentId: cm.department.id,
                                  courseId: cm.course.id,
                                  semesterMode: "CUSTOM",
                                  selectedSemesters: [s.semester],
                                });
                                setIsCreateOpen(true);
                              }}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 hover:bg-rose-200 text-rose-800 transition"
                              title={`Assign Coordinator for Semester ${s.semester}`}
                            >
                              + Assign
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Assignments Table */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-csjmu-800 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading authority mappings...</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Link2 className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No authority assignments found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || roleFilter !== "all" || deptFilter !== "all"
                ? "No authority assignments match your search filter."
                : "No course or department authority assignments have been configured yet. Click 'Assign Authority' to map staff to courses."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                  <th scope="col" className="py-3 px-4">Authorized Faculty</th>
                  <th scope="col" className="py-3 px-3">Jurisdiction Role</th>
                  <th scope="col" className="py-3 px-3">Parent Department</th>
                  <th scope="col" className="py-3 px-3">Target Scope</th>
                  <th scope="col" className="py-3 px-3">Tenure Dates</th>
                  <th scope="col" className="py-3 px-3">Status</th>
                  <th scope="col" className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredAssignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div>
                        <span className="font-bold">{a.user.fullName}</span>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{a.user.email}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[11px] border ${
                          a.role === "DEPARTMENT_HEAD"
                            ? "bg-purple-50 text-purple-900 border-purple-200"
                            : "bg-indigo-50 text-indigo-900 border-indigo-200"
                        }`}
                      >
                        {a.role === "DEPARTMENT_HEAD" ? "Department Head (HoD)" : "Course Coordinator"}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {a.department.name} ({a.department.code})
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      {a.course ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                            {a.course.name} ({a.course.code})
                          </span>
                          <div>
                            {a.semesters && a.semesters.length > 0 ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                Semesters: {a.semesters.join(", ")}
                              </span>
                            ) : a.academicPeriod === "ODD" ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                Odd Semesters (1, 3, 5...)
                              </span>
                            ) : a.academicPeriod === "EVEN" ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-50 text-cyan-700 border border-cyan-200">
                                Even Semesters (2, 4, 6...)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                All Semesters
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-block text-[11px] text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded font-medium">
                          All Departmental Programs
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500">
                      <div>From: {new Date(a.assignedAt).toLocaleDateString()}</div>
                      {a.unassignedAt && <div>To: {new Date(a.unassignedAt).toLocaleDateString()}</div>}
                    </td>
                    <td className="py-3.5 px-3">
                      {a.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {a.isActive ? (
                        <button
                          onClick={() => setDeactivateTarget(a)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100 transition"
                          title="Deactivate authority assignment"
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>Unassign</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Tenure Ended</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* CREATE ASSIGNMENT MODAL */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-csjmu-800" />
                <h3 className="text-base font-bold text-slate-900">Assign Faculty Authority</h3>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
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
                <label className="block font-semibold text-slate-700 mb-1">
                  Jurisdiction Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      role: e.target.value as any,
                      courseId: "",
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-csjmu-600"
                >
                  <option value="COURSE_COORDINATOR">Course Coordinator (Tier 1 Redressal)</option>
                  <option value="DEPARTMENT_HEAD">Department Head / HoD (Tier 2 Redressal)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Faculty Official <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={createForm.userId}
                  onChange={(e) => setCreateForm({ ...createForm, userId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-csjmu-600"
                >
                  <option value="" disabled>Select faculty member...</option>
                  {staffUsers
                    .filter((s) => s.role === createForm.role && s.isActive)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.email})
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Showing active accounts provisioned with role <strong>{createForm.role}</strong>.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Department <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={createForm.departmentId}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      departmentId: e.target.value,
                      courseId: "",
                    })
                  }
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

              {createForm.role === "COURSE_COORDINATOR" && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Course Offering <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={createForm.courseId}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          courseId: e.target.value,
                          selectedSemesters: [],
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-csjmu-600"
                    >
                      <option value="" disabled>Select course...</option>
                      {activeCoursesForSelectedDept.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code}) — {c.totalSemesters || 6} Sems
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Semester Group / Scope <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={createForm.semesterMode}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          semesterMode: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-csjmu-600"
                    >
                      <option value="ALL">All Semesters (Comprehensive Coverage)</option>
                      <option value="ODD">Odd Semesters (1, 3, 5...)</option>
                      <option value="EVEN">Even Semesters (2, 4, 6...)</option>
                      <option value="PAIR_1_2">Semesters 1 &amp; 2</option>
                      <option value="PAIR_3_4">Semesters 3 &amp; 4</option>
                      <option value="PAIR_5_6">Semesters 5 &amp; 6</option>
                      <option value="CUSTOM">Custom Semester Selection</option>
                    </select>
                  </div>

                  {createForm.semesterMode === "CUSTOM" && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                      <span className="block font-semibold text-slate-700 text-[11px]">
                        Select Specific Semesters:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(
                          {
                            length:
                              activeCoursesForSelectedDept.find((c) => c.id === createForm.courseId)
                                ?.totalSemesters || 6,
                          },
                          (_, i) => i + 1
                        ).map((s) => (
                          <label
                            key={s}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs cursor-pointer font-medium transition ${
                              createForm.selectedSemesters.includes(s)
                                ? "bg-csjmu-800 text-white border-csjmu-800"
                                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={createForm.selectedSemesters.includes(s)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setCreateForm((prev) => ({
                                  ...prev,
                                  selectedSemesters: checked
                                    ? [...prev.selectedSemesters, s]
                                    : prev.selectedSemesters.filter((x) => x !== s),
                                }));
                              }}
                              className="sr-only"
                            />
                            <span>Sem {s}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                <strong>Historical Preservation Invariant:</strong> If this department or course already has an active official assigned, the previous assignment will automatically be marked archived (with an unassigned timestamp), preserving past grievance audit integrity.
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
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <span>Save Authority Assignment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEACTIVATE ASSIGNMENT MODAL */}
      {deactivateTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">Deactivate Authority Assignment?</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Unassigning <strong>{deactivateTarget.user.fullName}</strong> from{" "}
                <strong>
                  {deactivateTarget.course ? deactivateTarget.course.name : deactivateTarget.department.name}
                </strong>{" "}
                will remove them from active grievance review workflows for this scope. Past records remain preserved.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeactivateTarget(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={deactivateSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition shadow"
              >
                {deactivateSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm Unassignment</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
