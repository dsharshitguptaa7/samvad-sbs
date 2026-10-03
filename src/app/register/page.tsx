"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Shield,
  GraduationCap,
  Mail,
  Lock,
  Phone,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export default function StudentRegisterPage() {
  const router = useRouter();
  const [selectedDept, setSelectedDept] = useState("MATH");
  const [selectedCourse, setSelectedCourse] = useState("B.Sc. Mathematics");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const coursesByDept: Record<string, string[]> = {
    MATH: ["B.Sc. Mathematics", "M.Sc. Mathematics", "Ph.D. Mathematics"],
    PHYS: ["B.Sc. Physics", "M.Sc. Physics", "Ph.D. Physics"],
    CHEM: ["B.Sc. Chemistry", "M.Sc. Chemistry", "Ph.D. Chemistry"],
    GEOG: ["B.A. / B.Sc. Geography", "M.A. / M.Sc. Geography"],
    ENVS: ["M.Sc. Environmental Science", "Ph.D. Environmental Science"],
  };

  const handleDeptChange = (deptCode: string) => {
    setSelectedDept(deptCode);
    const available = coursesByDept[deptCode];
    if (available && available.length > 0) {
      setSelectedCourse(available[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      fullName: formData.get("fullName"),
      rollNumber: formData.get("rollNumber"),
      enrollmentNo: formData.get("enrollmentNo"),
      departmentCode: selectedDept,
      courseName: selectedCourse,
      semester: formData.get("semester"),
      email: formData.get("email"),
      phoneNumber: formData.get("phoneNumber"),
      password: formData.get("password"),
    };

    const confirmPassword = formData.get("confirmPassword");
    if (payload.password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || "Registration failed. Please check your details.");
        setLoading(false);
        return;
      }

      setSuccessMessage("Account registered successfully! Redirecting to student workspace...");
      setTimeout(() => {
        router.push("/student");
        router.refresh();
      }, 1200);
    } catch {
      setErrorMessage("Network error occurred during registration. Please verify database connectivity.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2.5 text-xs font-semibold text-csjmu-800 uppercase tracking-wider mb-2">
          <GraduationCap className="w-4 h-4 text-csjmu-700" aria-hidden="true" />
          <span>School of Basic Sciences &bull; Student Onboarding</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Student Portal Registration
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Create your verified student account to lodge grievances, upload documents, and track multi-tier redressal.
        </p>
      </div>

      {/* Status Messages */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-900 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <strong>Registration Error:</strong>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-900 flex items-start gap-3"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <strong>Success:</strong>
            <p className="mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Registration Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Academic Enrollment Information */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-csjmu-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Shield className="w-4 h-4 text-gold-500" aria-hidden="true" />
              1. Academic & Enrollment Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name (as per University Records) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  placeholder="e.g. Aditi Sharma"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
                />
              </div>

              <div>
                <label htmlFor="rollNumber" className="block text-xs font-semibold text-slate-700 mb-1">
                  CSJMU Roll Number <span className="text-rose-500">*</span>
                </label>
                <input
                  id="rollNumber"
                  name="rollNumber"
                  type="text"
                  required
                  placeholder="e.g. 240103001"
                  className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
                />
              </div>

              <div>
                <label htmlFor="enrollmentNo" className="block text-xs font-semibold text-slate-700 mb-1">
                  Enrollment Number <span className="text-rose-500">*</span>
                </label>
                <input
                  id="enrollmentNo"
                  name="enrollmentNo"
                  type="text"
                  required
                  placeholder="e.g. CSJM2024S1024"
                  className="w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
                />
              </div>

              <div>
                <label htmlFor="semester" className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Semester / Year <span className="text-rose-500">*</span>
                </label>
                <select
                  id="semester"
                  name="semester"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
                >
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="3">Semester 3</option>
                  <option value="4">Semester 4</option>
                  <option value="5">Semester 5</option>
                  <option value="6">Semester 6</option>
                </select>
              </div>

              <div>
                <label htmlFor="department" className="block text-xs font-semibold text-slate-700 mb-1">
                  School Department <span className="text-rose-500">*</span>
                </label>
                <select
                  id="department"
                  value={selectedDept}
                  onChange={(e) => handleDeptChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
                >
                  <option value="MATH">Department of Mathematics</option>
                  <option value="PHYS">Department of Physics</option>
                  <option value="CHEM">Department of Chemistry</option>
                  <option value="GEOG">Department of Geography</option>
                  <option value="ENVS">Department of Environmental Sciences</option>
                </select>
              </div>

              <div>
                <label htmlFor="course" className="block text-xs font-semibold text-slate-700 mb-1">
                  Enrolled Course / Program <span className="text-rose-500">*</span>
                </label>
                <select
                  id="course"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
                >
                  {coursesByDept[selectedDept]?.map((crs) => (
                    <option key={crs} value={crs}>
                      {crs}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Credentials */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-csjmu-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Mail className="w-4 h-4 text-gold-500" aria-hidden="true" />
              2. Contact & Security Credentials
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional / Personal Email <span className="text-rose-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="student@csjmu.ac.in"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Used for grievance status alerts and document clarification notices.
                </p>
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number (10 digits) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  required
                  pattern="[6-9][0-9]{9}"
                  placeholder="e.g. 9876543210"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1">
                  Create Password <span className="text-rose-500">*</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Min 8 chars, 1 uppercase, 1 symbol"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
                />
              </div>
            </div>
          </div>

          {/* Declaration */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                required
                className="mt-0.5 rounded border-slate-300 text-csjmu-900 focus:ring-csjmu-600"
              />
              <span>
                I hereby declare that I am an actively enrolled student of the School of Basic Sciences, CSJMU Kanpur, and the details provided above are authentic and accurate as per university records.
              </span>
            </label>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Already registered?{" "}
              <Link href="/login" className="text-csjmu-800 font-bold hover:underline">
                Sign in here
              </Link>
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-lg text-sm font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 transition shadow-md focus-visible:ring-csjmu-600 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Registering Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" aria-hidden="true" />
                  <span>Submit Registration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
