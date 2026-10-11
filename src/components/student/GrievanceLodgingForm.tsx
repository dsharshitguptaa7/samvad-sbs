"use client";

import React, { useState } from "react";
import { GrievanceCategory } from "@prisma/client";
import {
  FilePlus,
  Upload,
  AlertCircle,
  CheckCircle2,
  FileText,
  Trash2,
  Lock,
} from "lucide-react";

interface CourseOption {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  departmentName: string;
  totalSemesters?: number;
}

interface LodgingFormProps {
  courses: CourseOption[];
  onSuccess: (trackingNumber: string) => void;
  onCancel: () => void;
}

const CATEGORIES: { label: string; value: GrievanceCategory }[] = [
  { label: "Academic & Curriculum", value: GrievanceCategory.ACADEMIC },
  { label: "Examination & Evaluation", value: GrievanceCategory.EXAMINATION },
  { label: "Laboratory & Practical Resources", value: GrievanceCategory.LABORATORY },
  { label: "Administrative & Records", value: GrievanceCategory.ADMINISTRATIVE },
  { label: "Faculty Mentorship & Guidance", value: GrievanceCategory.FACULTY_MENTORSHIP },
  { label: "Other SBS Matter", value: GrievanceCategory.OTHER },
];

export function GrievanceLodgingForm({
  courses,
  onSuccess,
  onCancel,
}: LodgingFormProps) {
  const [courseId, setCourseId] = useState(courses[0]?.id || "");
  const selectedCourse = courses.find((c) => c.id === courseId);
  const totalSemesters = selectedCourse?.totalSemesters || 6;
  const [semester, setSemester] = useState<number>(1);
  const [category, setCategory] = useState<GrievanceCategory>(GrievanceCategory.ACADEMIC);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [reliefSought, setReliefSought] = useState("");
  const [declarationConfirmed, setDeclarationConfirmed] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);

    // Validate size and count
    const totalFiles = selectedFiles.length + filesArray.length;
    if (totalFiles > 3) {
      setError("You may attach a maximum of 3 supporting documents.");
      return;
    }

    for (const f of filesArray) {
      if (f.size > 5 * 1024 * 1024) {
        setError(`File "${f.name}" exceeds the 5MB size limit.`);
        return;
      }
    }

    setSelectedFiles((prev) => [...prev, ...filesArray]);
    setError(null);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!courseId) {
      setError("Please select your enrolled course.");
      return;
    }

    if (subject.trim().length < 5) {
      setError("Subject must be at least 5 characters.");
      return;
    }

    if (description.trim().length < 20) {
      setError("Detailed description must be at least 20 characters.");
      return;
    }

    if (!declarationConfirmed) {
      setError("You must confirm the truthfulness declaration before submitting.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("courseId", courseId);
      formData.append("semester", semester.toString());
      formData.append("category", category);
      formData.append("subject", subject.trim());
      formData.append("description", description.trim());
      if (reliefSought.trim()) {
        formData.append("reliefSought", reliefSought.trim());
      }
      formData.append("declarationConfirmed", "true");

      for (const file of selectedFiles) {
        formData.append("files", file);
      }

      const res = await fetch("/api/student/grievances", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit grievance.");
      }

      onSuccess(data.trackingNumber);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6">
      <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-csjmu-800 uppercase tracking-wider mb-1">
            <FilePlus className="w-4 h-4 text-csjmu-700" />
            <span>Formal Redressal Form</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Lodge Academic Grievance</h2>
          <p className="text-xs text-slate-500 mt-1">
            Submit your grievance for Tier-1 review by your assigned Course Coordinator.
          </p>
        </div>
        <button
          onClick={onCancel}
          disabled={loading}
          className="text-xs text-slate-500 hover:text-slate-700 font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="leading-relaxed font-medium">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Course & Department Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="courseId" className="block text-xs font-bold text-slate-700 mb-1.5">
              Enrolled Course / Program <span className="text-rose-500">*</span>
            </label>
            <select
              id="courseId"
              value={courseId}
              onChange={(e) => {
                const newCourseId = e.target.value;
                setCourseId(newCourseId);
                const c = courses.find((x) => x.id === newCourseId);
                const maxSems = c?.totalSemesters || 6;
                if (semester > maxSems) {
                  setSemester(1);
                }
              }}
              required
              className="w-full px-3 py-2.5 text-xs rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code}) — {c.departmentName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="semester" className="block text-xs font-bold text-slate-700 mb-1.5">
              Current Semester <span className="text-rose-500">*</span>
            </label>
            <select
              id="semester"
              value={semester}
              onChange={(e) => setSemester(parseInt(e.target.value, 10))}
              required
              className="w-full px-3 py-2.5 text-xs rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
            >
              {Array.from({ length: totalSemesters }, (_, i) => i + 1).map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="category" className="block text-xs font-bold text-slate-700 mb-1.5">
            Grievance Category <span className="text-rose-500">*</span>
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as GrievanceCategory)}
            required
            className="w-full px-3 py-2.5 text-xs rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Grievance Subject */}
        <div>
          <label htmlFor="subject" className="block text-xs font-bold text-slate-700 mb-1.5">
            Subject / Title <span className="text-rose-500">*</span>
          </label>
          <input
            id="subject"
            type="text"
            required
            maxLength={150}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Discrepancy in Continuous Assessment marks for Analytical Chemistry"
            className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
          />
          <div className="text-[11px] text-slate-400 text-right mt-1">
            {subject.length} / 150 characters
          </div>
        </div>

        {/* Detailed Description */}
        <div>
          <label htmlFor="description" className="block text-xs font-bold text-slate-700 mb-1.5">
            Detailed Statement of Grievance <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="description"
            rows={5}
            required
            maxLength={5000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide a factual, clear chronological account of the grievance, dates of occurrence, faculty or administrative office approached, and prior steps taken..."
            className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
          />
          <div className="text-[11px] text-slate-400 text-right mt-1">
            {description.length} / 5000 characters (minimum 20)
          </div>
        </div>

        {/* Relief Sought */}
        <div>
          <label htmlFor="reliefSought" className="block text-xs font-bold text-slate-700 mb-1.5">
            Specific Relief / Resolution Sought (Optional)
          </label>
          <input
            id="reliefSought"
            type="text"
            maxLength={500}
            value={reliefSought}
            onChange={(e) => setReliefSought(e.target.value)}
            placeholder="e.g. Verification and re-totaling of practical laboratory assignment marks"
            className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-1 focus:ring-csjmu-600"
          />
        </div>

        {/* Document Upload Area */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700">
            Supporting Evidence Documents (Optional, Max 3 files, 5MB each)
          </label>
          <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center space-y-2">
            <Upload className="w-6 h-6 mx-auto text-slate-400" />
            <div className="text-xs text-slate-600">
              <label
                htmlFor="file-upload"
                className="font-bold text-csjmu-700 hover:text-csjmu-800 cursor-pointer underline"
              >
                Choose files to upload
              </label>
              <input
                id="file-upload"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
                className="hidden"
                disabled={selectedFiles.length >= 3 || loading}
              />{" "}
              or drag & drop
            </div>
            <p className="text-[11px] text-slate-400">
              Accepted formats: PDF, JPEG, PNG, WebP &bull; Verified file signature at rest
            </p>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              {selectedFiles.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-100 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-csjmu-800 shrink-0" />
                    <span className="font-medium text-slate-800 truncate">{f.name}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      ({(f.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-rose-600 hover:text-rose-800 p-1"
                    title="Remove file"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Truthfulness Declaration Checkbox */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-start gap-3">
            <input
              id="declaration"
              type="checkbox"
              required
              checked={declarationConfirmed}
              onChange={(e) => setDeclarationConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-csjmu-800 focus:ring-csjmu-700"
            />
            <label htmlFor="declaration" className="text-xs text-slate-700 leading-relaxed">
              <span className="font-bold text-slate-900">Institutional Declaration:</span> I hereby
              certify that the information and documentary evidence submitted in this grievance are
              accurate and truthful to the best of my knowledge. I understand that misrepresentation
              or false allegations are subject to university disciplinary codes.
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2 text-xs font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 rounded-lg transition shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <span>Submitting & Routing...</span>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Submit Grievance</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
