"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  ShieldCheck,
  GraduationCap,
  Mail,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Building2,
  BookOpen,
  Phone,
  User,
  Hash,
  Layers,
  Check,
} from "lucide-react";

interface PublicCourse {
  id: string;
  name: string;
  code: string;
  programType: string | null;
}

interface PublicDepartment {
  id: string;
  name: string;
  code: string;
  description: string | null;
  courses: PublicCourse[];
}

export default function StudentRegisterPage() {
  const router = useRouter();

  // Master data state
  const [departments, setDepartments] = useState<PublicDepartment[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [deptsError, setDeptsError] = useState<string | null>(null);

  // Form selection state
  const [selectedDeptCode, setSelectedDeptCode] = useState<string>("");
  const [selectedCourseName, setSelectedCourseName] = useState<string>("");

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch active departments & courses with normalized response handling
  const loadAcademicData = useCallback(async () => {
    setLoadingDepts(true);
    setDeptsError(null);

    try {
      const res = await fetch("/api/departments");
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: Unable to retrieve academic programs.`);
      }

      const data = await res.json();

      // Normalize both FastAPI (array) and Next.js ({ success: true, departments: [...] }) formats
      let list: PublicDepartment[] = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data && data.success && Array.isArray(data.departments)) {
        list = data.departments;
      } else if (data && Array.isArray(data.departments)) {
        list = data.departments;
      } else {
        throw new Error("Invalid department master data format received from server.");
      }

      setDepartments(list);

      // If user hasn't chosen a department yet, keep default prompt
      // If a department is already selected, verify it's still present in the refreshed list
      if (selectedDeptCode) {
        const found = list.find((d) => d.code === selectedDeptCode);
        if (found) {
          if (found.courses.length > 0 && !found.courses.some((c) => c.name === selectedCourseName)) {
            setSelectedCourseName(found.courses[0].name);
          } else if (found.courses.length === 0) {
            setSelectedCourseName("");
          }
        } else {
          setSelectedDeptCode("");
          setSelectedCourseName("");
        }
      }
    } catch (err: any) {
      console.error("Failed to load departments:", err);
      setDeptsError(
        err.message || "Failed to connect to the academic master database. Please check your connection and retry."
      );
    } finally {
      setLoadingDepts(false);
    }
  }, [selectedDeptCode, selectedCourseName]);

  useEffect(() => {
    loadAcademicData();
  }, [loadAcademicData]);

  // Handle department change cleanly
  const handleDeptChange = (deptCode: string) => {
    setSelectedDeptCode(deptCode);
    if (!deptCode) {
      setSelectedCourseName("");
      return;
    }

    const dept = departments.find((d) => d.code === deptCode);
    if (dept && dept.courses && dept.courses.length > 0) {
      setSelectedCourseName(dept.courses[0].name);
    } else {
      setSelectedCourseName("");
    }
  };

  const currentDepartment = departments.find((d) => d.code === selectedDeptCode);
  const currentCourses = currentDepartment?.courses || [];

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const fullName = (formData.get("fullName") as string)?.trim();
    const rollNumber = (formData.get("rollNumber") as string)?.trim().toUpperCase();
    const enrollmentNo = (formData.get("enrollmentNo") as string)?.trim().toUpperCase();
    const semester = (formData.get("semester") as string)?.trim();
    const email = (formData.get("email") as string)?.trim().toLowerCase();
    const phoneNumber = (formData.get("phoneNumber") as string)?.trim();
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // Client-side validations
    if (!selectedDeptCode) {
      setErrorMessage("Please select your academic department.");
      return;
    }

    if (!selectedCourseName) {
      if (currentCourses.length === 0) {
        setErrorMessage("The selected department currently has no active courses available for registration.");
      } else {
        setErrorMessage("Please select your enrolled course / program.");
      }
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter both passwords.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      setErrorMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number or special character.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      setErrorMessage("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
      return;
    }

    setSubmitting(true);

    const payload = {
      fullName,
      rollNumber,
      enrollmentNo,
      departmentCode: selectedDeptCode,
      courseName: selectedCourseName,
      semester,
      email,
      phoneNumber,
      password,
    };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || data.detail || "Registration failed. Please verify your submitted details.");
        setSubmitting(false);
        return;
      }

      setSuccessMessage("Account registered successfully! Redirecting to student portal...");
      setTimeout(() => {
        router.push("/student");
        router.refresh();
      }, 1400);
    } catch {
      setErrorMessage("Network error occurred during registration. Please verify connectivity and try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Official University Branded Header */}
      <div className="bg-gradient-to-r from-csjmu-950 via-csjmu-900 to-csjmu-950 text-white rounded-2xl p-6 sm:p-8 shadow-md border-b-4 border-gold-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-csjmu-800/80 border border-gold-500/40 text-gold-300 text-xs font-semibold tracking-wide">
              <GraduationCap className="w-4 h-4 text-gold-400" aria-hidden="true" />
              <span>School of Basic Sciences &bull; Student Onboarding Desk</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-serif text-white">
              Student Portal Registration
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Create your verified student account to lodge grievances, upload documentation, and track multi-tier redressal across Course Coordinators, HOD, and the School Director.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
            {/* CSJMU Seal */}
            <div className="w-14 h-14 bg-white rounded-full p-1.5 border-2 border-gold-500/70 shadow-md shrink-0 flex items-center justify-center">
              <Image
                src="/assets/csjmu-emblem.png"
                alt="CSJMU Emblem"
                width={52}
                height={52}
                priority
                className="w-full h-full object-contain"
              />
            </div>
            {/* SAMVAD Emblem */}
            <div className="w-14 h-14 rounded-full p-1 shrink-0 flex items-center justify-center">
              <Image
                src="/assets/samvad-emblem.png"
                alt="SAMVAD Portal Emblem"
                width={52}
                height={52}
                priority
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Global Form Status Alerts */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-900 flex items-start gap-3 shadow-sm"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <strong className="font-semibold">Registration Issue:</strong>
            <p className="mt-0.5 text-rose-800 text-xs sm:text-sm">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-900 flex items-start gap-3 shadow-sm"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <strong className="font-semibold">Account Verified:</strong>
            <p className="mt-0.5 text-emerald-800 text-xs sm:text-sm">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Academic Master Data Error Alert with Retry Action */}
      {deptsError && (
        <div
          role="alert"
          aria-live="polite"
          className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs sm:text-sm text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <strong className="font-semibold text-amber-900">Academic Catalog Synchronization Alert:</strong>
              <p className="mt-0.5 text-amber-800 text-xs">{deptsError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadAcademicData}
            disabled={loadingDepts}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 rounded-lg shadow-sm transition shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDepts ? "animate-spin" : ""}`} aria-hidden="true" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Main Registration Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* SECTION 1: Academic & Enrollment Information */}
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-csjmu-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-csjmu-900 text-gold-400 inline-flex items-center justify-center text-xs font-mono font-bold">
                  1
                </span>
                Academic &amp; Enrollment Details
              </h2>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                Verified against CSJMU Examination Database
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Full Name (as per University Records) <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    placeholder="e.g. Aditi Sharma"
                    className="w-full h-11 pl-10 pr-3.5 text-sm rounded-lg border border-slate-300 focus:border-csjmu-800 focus:ring-2 focus:ring-csjmu-800/20 focus:outline-none transition bg-white"
                  />
                </div>
              </div>

              {/* Roll Number */}
              <div>
                <label htmlFor="rollNumber" className="block text-xs font-bold text-slate-700 mb-1.5">
                  CSJMU Roll Number <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Hash className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <input
                    id="rollNumber"
                    name="rollNumber"
                    type="text"
                    required
                    placeholder="e.g. 240103001"
                    className="w-full h-11 pl-10 pr-3.5 text-sm font-mono rounded-lg border border-slate-300 focus:border-csjmu-800 focus:ring-2 focus:ring-csjmu-800/20 focus:outline-none transition bg-white uppercase"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">As printed on your official admit card / semester mark sheet.</p>
              </div>

              {/* Enrollment Number */}
              <div>
                <label htmlFor="enrollmentNo" className="block text-xs font-bold text-slate-700 mb-1.5">
                  University Enrollment Number <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Hash className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <input
                    id="enrollmentNo"
                    name="enrollmentNo"
                    type="text"
                    required
                    placeholder="e.g. CSJM2024S1024"
                    className="w-full h-11 pl-10 pr-3.5 text-sm font-mono rounded-lg border border-slate-300 focus:border-csjmu-800 focus:ring-2 focus:ring-csjmu-800/20 focus:outline-none transition bg-white uppercase"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Permanent university registration ID issued at admission.</p>
              </div>

              {/* Semester / Year */}
              <div>
                <label htmlFor="semester" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Current Semester <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Layers className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <select
                    id="semester"
                    name="semester"
                    defaultValue="1"
                    required
                    className="w-full h-11 pl-10 pr-3.5 text-sm rounded-lg border border-slate-300 focus:border-csjmu-800 focus:ring-2 focus:ring-csjmu-800/20 focus:outline-none transition bg-white"
                  >
                    <option value="1">Semester 1 (Year 1)</option>
                    <option value="2">Semester 2 (Year 1)</option>
                    <option value="3">Semester 3 (Year 2)</option>
                    <option value="4">Semester 4 (Year 2)</option>
                    <option value="5">Semester 5 (Year 3)</option>
                    <option value="6">Semester 6 (Year 3)</option>
                    <option value="7">Semester 7 (Year 4)</option>
                    <option value="8">Semester 8 (Year 4)</option>
                  </select>
                </div>
              </div>

              {/* School Department */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="department" className="block text-xs font-bold text-slate-700">
                    School Department <span className="text-rose-500 font-bold">*</span>
                  </label>
                  {departments.length > 0 && (
                    <span className="text-[11px] text-slate-500">
                      {departments.length} department{departments.length > 1 ? "s" : ""} active
                    </span>
                  )}
                </div>

                {loadingDepts ? (
                  <div className="flex items-center gap-2 h-11 px-3.5 text-xs text-csjmu-900 bg-csjmu-50/50 border border-csjmu-200 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-csjmu-700 shrink-0" aria-hidden="true" />
                    <span>Loading academic departments...</span>
                  </div>
                ) : deptsError && departments.length === 0 ? (
                  <div className="flex items-center justify-between h-11 px-3.5 text-xs text-rose-800 bg-rose-50 border border-rose-300 rounded-lg">
                    <span>Unable to load departments</span>
                    <button
                      type="button"
                      onClick={loadAcademicData}
                      className="font-bold underline text-rose-900 hover:text-rose-950 cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Building2 className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <select
                      id="department"
                      value={selectedDeptCode}
                      onChange={(e) => handleDeptChange(e.target.value)}
                      required
                      className="w-full h-11 pl-10 pr-3.5 text-sm rounded-lg border border-slate-300 focus:border-csjmu-800 focus:ring-2 focus:ring-csjmu-800/20 focus:outline-none transition bg-white"
                    >
                      <option value="">-- Select Academic Department --</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.code}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <p className="mt-1 text-[11px] text-slate-500">Departments under School of Basic Sciences (SBS).</p>
              </div>

              {/* Enrolled Course / Program */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="course" className="block text-xs font-bold text-slate-700">
                    Enrolled Course / Program <span className="text-rose-500 font-bold">*</span>
                  </label>
                  {selectedDeptCode && currentCourses.length > 0 && (
                    <span className="text-[11px] text-emerald-700 font-medium">
                      {currentCourses.length} active program{currentCourses.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {loadingDepts ? (
                  <div className="flex items-center gap-2 h-11 px-3.5 text-xs text-csjmu-900 bg-csjmu-50/50 border border-csjmu-200 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-csjmu-700 shrink-0" aria-hidden="true" />
                    <span>Loading available courses...</span>
                  </div>
                ) : !selectedDeptCode ? (
                  <div className="flex items-center gap-2 h-11 px-3.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
                    <BookOpen className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                    <span>Select an academic department above first</span>
                  </div>
                ) : currentCourses.length === 0 ? (
                  <div className="flex items-start gap-2.5 p-3 text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <span className="font-bold">No active programs available</span>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        No courses are currently open for registration in {currentDepartment?.name || selectedDeptCode}. Please select another department or contact SBS administration.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <BookOpen className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <select
                      id="course"
                      value={selectedCourseName}
                      onChange={(e) => setSelectedCourseName(e.target.value)}
                      required
                      className="w-full h-11 pl-10 pr-3.5 text-sm rounded-lg border border-slate-300 focus:border-csjmu-800 focus:ring-2 focus:ring-csjmu-800/20 focus:outline-none transition bg-white"
                    >
                      {currentCourses.map((crs) => (
                        <option key={crs.id} value={crs.name}>
                          {crs.name} {crs.programType ? `(${crs.programType})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <p className="mt-1 text-[11px] text-slate-500">Degree program for semester assignment and grievance routing.</p>
              </div>
            </div>
          </div>

          {/* SECTION 2: Contact Information & Security Credentials */}
          <div className="space-y-5 pt-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-csjmu-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-csjmu-900 text-gold-400 inline-flex items-center justify-center text-xs font-mono font-bold">
                  2
                </span>
                Contact &amp; Security Credentials
              </h2>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                End-to-End Encrypted Session Authentication
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Institutional / Personal Email <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="student@csjmu.ac.in"
                    className="w-full h-11 pl-10 pr-3.5 text-sm rounded-lg border border-slate-300 focus:border-csjmu-800 focus:ring-2 focus:ring-csjmu-800/20 focus:outline-none transition bg-white"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Used for grievance redressal notices and document submission alerts.
                </p>
              </div>

              {/* Mobile Number */}
              <div>
                <label htmlFor="phoneNumber" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mobile Number (10 Digits) <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    required
                    pattern="[6-9][0-9]{9}"
                    placeholder="e.g. 9876543210"
                    className="w-full h-11 pl-10 pr-3.5 text-sm font-mono rounded-lg border border-slate-300 focus:border-csjmu-800 focus:ring-2 focus:ring-csjmu-800/20 focus:outline-none transition bg-white"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">For urgent SMS alerts regarding hearings and resolution.</p>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Create Account Password <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="Min 8 chars (Uppercase, lowercase, digit/symbol)"
                    className="w-full h-11 pl-3.5 pr-11 text-sm rounded-lg border border-slate-300 focus:border-csjmu-800 focus:ring-2 focus:ring-csjmu-800/20 focus:outline-none transition bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Minimum 8 characters with at least one uppercase letter and one number or symbol.
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm Password <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="Re-enter password"
                    className="w-full h-11 pl-3.5 pr-11 text-sm rounded-lg border border-slate-300 focus:border-csjmu-800 focus:ring-2 focus:ring-csjmu-800/20 focus:outline-none transition bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Must match the password entered above exactly.</p>
              </div>
            </div>
          </div>

          {/* Student Statutory Declaration */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-csjmu-900 focus:ring-csjmu-800"
              />
              <span className="leading-relaxed">
                I solemnly declare that I am an actively enrolled student of the <strong>School of Basic Sciences, Chhatrapati Shahu Ji Maharaj University, Kanpur</strong>. All details entered above are accurate and verifiable from university examination registers. I understand that fraudulent submissions are subject to university disciplinary procedures.
              </span>
            </label>
          </div>

          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-600 order-2 sm:order-1 text-center sm:text-left">
              Already have an account?{" "}
              <Link href="/login" className="text-csjmu-900 font-bold hover:underline">
                Sign in to Student Portal
              </Link>
            </p>

            <button
              type="submit"
              disabled={submitting || loadingDepts || !selectedDeptCode || currentCourses.length === 0}
              className="w-full sm:w-auto order-1 sm:order-2 inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg text-sm font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-csjmu-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-csjmu-950" aria-hidden="true" />
                  <span>Registering Student Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 text-csjmu-950" aria-hidden="true" />
                  <span>Submit Registration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Institutional Security Notice */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-500 text-center">
        <ShieldCheck className="w-4 h-4 text-csjmu-700" aria-hidden="true" />
        <span>Chhatrapati Shahu Ji Maharaj University, Kanpur &bull; Secure Institutional Identity Access</span>
      </div>
    </div>
  );
}
