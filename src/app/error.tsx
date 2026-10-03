"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected runtime error
    console.error("SAMVAD Portal Error:", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="max-w-2xl mx-auto my-16 p-8 bg-white rounded-xl border border-rose-200 shadow-sm text-center"
    >
      <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-5">
        <AlertTriangle className="w-7 h-7" aria-hidden="true" />
      </div>

      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
        An Unexpected Error Occurred
      </h1>

      <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
        The SAMVAD portal encountered an issue processing this view. No changes were made to your grievance records.
      </p>

      {error?.message && (
        <div className="mt-4 p-3 bg-slate-50 rounded text-xs font-mono text-slate-700 text-left overflow-x-auto border border-slate-200">
          {error.message}
        </div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-csjmu-900 hover:bg-csjmu-800 transition shadow-sm focus-visible:ring-csjmu-600"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          Try Again
        </button>

        <Link
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition focus-visible:ring-slate-400"
        >
          <Home className="w-4 h-4" aria-hidden="true" />
          Return to Portal Home
        </Link>
      </div>
    </div>
  );
}
