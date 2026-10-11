"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit2,
  Power,
  RotateCcw,
  Search,
  Building,
  BookOpen,
  X,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";

interface AssignmentDetail {
  id: string;
  role: string;
  isActive: boolean;
  assignedAt: string;
  unassignedAt: string | null;
  department: { id: string; name: string; code: string };
  course: { id: string; name: string; code: string } | null;
}

interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  role: "COURSE_COORDINATOR" | "DEPARTMENT_HEAD" | "DIRECTOR";
  phoneNumber: string | null;
  isActive: boolean;
  mustResetPassword: boolean;
  createdAt: string;
  staffAssignments: AssignmentDetail[];
}

export function StaffManager() {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Provision Modal
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [provisionForm, setProvisionForm] = useState({
    fullName: "",
    email: "",
    role: "COURSE_COORDINATOR" as "COURSE_COORDINATOR" | "DEPARTMENT_HEAD" | "DIRECTOR",
    phoneNumber: "",
  });
  const [provisionSubmitting, setProvisionSubmitting] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  // Issued Token Modal
  const [issuedSetup, setIssuedSetup] = useState<{
    staffName: string;
    email: string;
    setupUrl: string;
    expiresAt: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit Profile Modal
  const [editUser, setEditUser] = useState<StaffUser | null>(null);
  const [editForm, setEditForm] = useState({ fullName: "", phoneNumber: "", isActive: true });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Password Reset Confirmation Modal
  const [resetTarget, setResetTarget] = useState<StaffUser | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Deactivate Confirmation Modal
  const [toggleTarget, setToggleTarget] = useState<StaffUser | null>(null);
  const [toggleSubmitting, setToggleSubmitting] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load staff accounts.");
      }
      setStaffList(data.staff);
    } catch (err: any) {
      setError(err.message || "Failed to load staff accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchesSearch =
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.phoneNumber && s.phoneNumber.includes(searchQuery));

      const matchesRole = roleFilter === "all" || s.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && s.isActive) ||
        (statusFilter === "inactive" && !s.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [staffList, searchQuery, roleFilter, statusFilter]);

  // Handle Provision Submit
  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionSubmitting(true);
    setProvisionError(null);

    try {
      const payload = {
        fullName: provisionForm.fullName.trim(),
        email: provisionForm.email.trim(),
        role: provisionForm.role,
        phoneNumber: provisionForm.phoneNumber.trim() || undefined,
      };

      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        let msg = data.error || "Failed to provision staff account.";
        if (data.details) {
          const detailMsgs = Object.entries(data.details)
            .map(([field, msgs]: [string, any]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
            .join("; ");
          if (detailMsgs && !msg.includes(detailMsgs)) {
            msg = `${msg} (${detailMsgs})`;
          }
        }
        throw new Error(msg);
      }

      setIsProvisionOpen(false);
      setIssuedSetup({
        staffName: data.user.fullName,
        email: data.user.email,
        setupUrl: `${window.location.origin}${data.setupToken.setupUrl}`,
        expiresAt: data.setupToken.expiresAt,
      });

      setProvisionForm({
        fullName: "",
        email: "",
        role: "COURSE_COORDINATOR",
        phoneNumber: "",
      });

      fetchStaff();
    } catch (err: any) {
      setProvisionError(err.message || "Failed to provision staff member.");
    } finally {
      setProvisionSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;

    setEditSubmitting(true);
    setEditError(null);

    try {
      const payload = {
        fullName: editForm.fullName.trim(),
        phoneNumber: editForm.phoneNumber.trim() || undefined,
        isActive: editForm.isActive,
      };

      const res = await fetch(`/api/admin/staff/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        let msg = data.error || "Failed to update profile.";
        if (data.details) {
          const detailMsgs = Object.entries(data.details)
            .map(([field, msgs]: [string, any]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
            .join("; ");
          if (detailMsgs && !msg.includes(detailMsgs)) {
            msg = `${msg} (${detailMsgs})`;
          }
        }
        throw new Error(msg);
      }

      setSuccessNotice(`Updated details for ${data.user.fullName}.`);
      setEditUser(null);
      fetchStaff();
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      setEditError(err.message || "Failed to update profile.");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle Reset Password Submit
  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setResetSubmitting(true);

    try {
      const res = await fetch(`/api/admin/staff/${resetTarget.id}`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to initiate password reset.");
      }

      const staffObj = resetTarget;
      setResetTarget(null);
      setIssuedSetup({
        staffName: staffObj.fullName,
        email: staffObj.email,
        setupUrl: `${window.location.origin}${data.setupToken.setupUrl}`,
        expiresAt: data.setupToken.expiresAt,
      });

      fetchStaff();
    } catch (err: any) {
      setError(err.message || "Failed to issue reset link.");
    } finally {
      setResetSubmitting(false);
    }
  };

  // Handle Status Toggle Submit
  const handleToggleStatus = async () => {
    if (!toggleTarget) return;
    setToggleSubmitting(true);

    try {
      const newStatus = !toggleTarget.isActive;
      const res = await fetch(`/api/admin/staff/${toggleTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update status.");
      }

      setSuccessNotice(
        `Staff account '${toggleTarget.fullName}' ${newStatus ? "activated" : "deactivated"} successfully.`
      );
      setToggleTarget(null);
      fetchStaff();
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to update account status.");
    } finally {
      setToggleSubmitting(false);
    }
  };

  const copySetupLink = () => {
    if (!issuedSetup) return;
    navigator.clipboard.writeText(issuedSetup.setupUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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
            onClick={fetchStaff}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-rose-300 rounded text-xs font-semibold text-rose-700 hover:bg-rose-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Staff</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{staffList.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-csjmu-50 border border-csjmu-100 flex items-center justify-center text-csjmu-800">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Coordinators</p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {staffList.filter((s) => s.role === "COURSE_COORDINATOR").length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department Heads</p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {staffList.filter((s) => s.role === "DEPARTMENT_HEAD").length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
            <Building className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">School Director</p>
            <p className="text-2xl font-black text-gold-600 mt-1">
              {staffList.filter((s) => s.role === "DIRECTOR" && s.isActive).length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-700">
            <Shield className="w-5 h-5" />
          </div>
        </div>
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
              placeholder="Search staff by name, email, or phone..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="py-2 px-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
          >
            <option value="all">All Roles</option>
            <option value="COURSE_COORDINATOR">Course Coordinator</option>
            <option value="DEPARTMENT_HEAD">Department Head</option>
            <option value="DIRECTOR">Director</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        <button
          onClick={() => {
            setProvisionError(null);
            setIsProvisionOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 rounded-lg transition shadow-sm shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision Staff Account</span>
        </button>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-csjmu-800 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading staff accounts...</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No staff accounts found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || roleFilter !== "all" || statusFilter !== "all"
                ? "No staff match your current filter criteria."
                : "No staff authority accounts have been provisioned yet. Click 'Provision Staff Account' to add a faculty member."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                  <th scope="col" className="py-3 px-4">Staff Member</th>
                  <th scope="col" className="py-3 px-3">Role</th>
                  <th scope="col" className="py-3 px-3">Current Active Assignments</th>
                  <th scope="col" className="py-3 px-3">Status</th>
                  <th scope="col" className="py-3 px-3">Setup State</th>
                  <th scope="col" className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredStaff.map((staff) => {
                  const activeAssignments = (staff.staffAssignments || []).filter((a) => a.isActive);

                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div>
                          <span className="font-bold">{staff.fullName}</span>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">{staff.email}</p>
                          {staff.phoneNumber && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{staff.phoneNumber}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[11px] border ${
                            staff.role === "DIRECTOR"
                              ? "bg-gold-50 text-gold-900 border-gold-300"
                              : staff.role === "DEPARTMENT_HEAD"
                              ? "bg-purple-50 text-purple-900 border-purple-200"
                              : "bg-indigo-50 text-indigo-900 border-indigo-200"
                          }`}
                        >
                          {staff.role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        {activeAssignments.length > 0 ? (
                          <div className="space-y-1">
                            {activeAssignments.map((a) => (
                              <div
                                key={a.id}
                                className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 mr-1"
                              >
                                {a.course ? (
                                  <>
                                    <BookOpen className="w-3 h-3 text-slate-500" />
                                    <span>
                                      {a.course.name} ({a.department.code})
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Building className="w-3 h-3 text-slate-500" />
                                    <span>{a.department.name} (HoD)</span>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : staff.role === "DIRECTOR" ? (
                          <span className="text-[11px] text-slate-500 italic">
                            Executive Directorate (School-Wide)
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        {staff.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        {staff.mustResetPassword ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                            <KeyRound className="w-3 h-3 text-amber-600" />
                            <span>Setup Required</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Configured</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => {
                            setEditUser(staff);
                            setEditForm({
                              fullName: staff.fullName,
                              phoneNumber: staff.phoneNumber || "",
                              isActive: staff.isActive,
                            });
                            setEditError(null);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                          title="Edit profile"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => setResetTarget(staff)}
                          disabled={!staff.isActive}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded border border-slate-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition disabled:opacity-40"
                          title="Generate fresh password setup link"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Reset Link</span>
                        </button>

                        <button
                          onClick={() => setToggleTarget(staff)}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded border transition ${
                            staff.isActive
                              ? "border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100"
                              : "border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
                          }`}
                          title={staff.isActive ? "Deactivate account" : "Activate account"}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{staff.isActive ? "Deactivate" : "Activate"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PROVISION MODAL */}
      {isProvisionOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-csjmu-800" />
                <h3 className="text-base font-bold text-slate-900">Provision Staff Authority Account</h3>
              </div>
              <button onClick={() => setIsProvisionOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {provisionError && (
              <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{provisionError}</span>
              </div>
            )}

            <form onSubmit={handleProvisionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name (Faculty / Official) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={provisionForm.fullName}
                  onChange={(e) => setProvisionForm({ ...provisionForm, fullName: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Kumar"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-csjmu-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Official Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={provisionForm.email}
                  onChange={(e) => setProvisionForm({ ...provisionForm, email: e.target.value })}
                  placeholder="e.g. rkumar@csjmu.ac.in"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-csjmu-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Authority Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={provisionForm.role}
                  onChange={(e) => setProvisionForm({ ...provisionForm, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-csjmu-600"
                >
                  <option value="COURSE_COORDINATOR">Course Coordinator (Tier 1 Redressal)</option>
                  <option value="DEPARTMENT_HEAD">Department Head / HOD (Tier 2 Redressal)</option>
                  <option value="DIRECTOR">Director, School of Basic Sciences (Tier 3 Redressal)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Contact Number</label>
                <input
                  type="tel"
                  value={provisionForm.phoneNumber}
                  onChange={(e) => setProvisionForm({ ...provisionForm, phoneNumber: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-csjmu-600"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                <strong>First-Login Credential Flow:</strong> The new staff account will be created with forced initial password configuration. A high-entropy one-time setup link will be generated for administrative issuance.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProvisionOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={provisionSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-csjmu-900 hover:bg-csjmu-800 text-white rounded-lg font-bold transition shadow"
                >
                  {provisionSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <span>Provision Account</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ISSUED SETUP TOKEN MODAL */}
      {issuedSetup && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-800">
                <KeyRound className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">One-Time Password Setup Link</h3>
              </div>
              <button onClick={() => setIssuedSetup(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-700">
                Security setup token issued for <strong>{issuedSetup.staffName}</strong> (
                <span className="font-mono">{issuedSetup.email}</span>).
              </p>

              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700">Setup URL (Single-Use, Valid 24h):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={issuedSetup.setupUrl}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-[11px] text-slate-800 select-all"
                  />
                  <button
                    onClick={copySetupLink}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-csjmu-900 hover:bg-csjmu-800 text-white rounded-lg font-bold shrink-0 shadow"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-1">
                <p>
                  <strong>Administrative Delivery Protocol:</strong> Deliver this link securely to the faculty member via university communications. When opened, the user configures their personal password and the link immediately burns.
                </p>
                <p className="text-slate-500">
                  Expires: <span className="font-mono">{new Date(issuedSetup.expiresAt).toLocaleString()}</span>
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <a
                href={issuedSetup.setupUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 text-xs"
              >
                <span>Test Link in Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setIssuedSetup(null)}
                className="px-4 py-2 bg-csjmu-900 text-white font-bold rounded-lg text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {editUser && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-csjmu-800" />
                <h3 className="text-base font-bold text-slate-900">Edit Profile: {editUser.fullName}</h3>
              </div>
              <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-slate-600">
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
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-csjmu-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Contact</label>
                <input
                  type="tel"
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-csjmu-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
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

      {/* RESET PASSWORD CONFIRMATION MODAL */}
      {resetTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">Issue Password Reset Link?</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generate a fresh, single-use credential setup link for <strong>{resetTarget.fullName}</strong>.
                All existing active sessions for this account will be immediately invalidated across all devices.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow"
              >
                {resetSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Issuing...</span>
                  </>
                ) : (
                  <span>Confirm Issue Reset Link</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS TOGGLE CONFIRMATION MODAL */}
      {toggleTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <Power className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                {toggleTarget.isActive ? "Deactivate Staff Account?" : "Reactivate Staff Account?"}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {toggleTarget.isActive ? (
                  <>
                    Deactivating <strong>{toggleTarget.fullName}</strong> will immediately revoke all active browser sessions and block grievance adjudication access. Past historical actions remain permanently preserved.
                  </>
                ) : (
                  <>
                    Reactivating <strong>{toggleTarget.fullName}</strong> will restore portal sign-in capability.
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
