import React from "react";
import Link from "next/link";
import { FileQuestion, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto my-20 p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mb-5">
        <FileQuestion className="w-8 h-8 text-csjmu-800" aria-hidden="true" />
      </div>

      <span className="text-xs font-mono font-bold uppercase tracking-wider text-csjmu-700 bg-csjmu-50 px-2.5 py-1 rounded border border-csjmu-100">
        404 &bull; Page Not Found
      </span>

      <h1 className="text-2xl font-bold text-slate-900 mt-4 tracking-tight">
        Resource Not Found
      </h1>

      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
        The grievance record, document, or portal page you requested does not exist or may have been relocated under university access policies.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-csjmu-900 hover:bg-csjmu-800 transition shadow-sm focus-visible:ring-csjmu-600"
        >
          <Home className="w-4 h-4" aria-hidden="true" />
          Back to Portal Home
        </Link>
        <Link
          href="/track"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition focus-visible:ring-slate-400"
        >
          <Search className="w-4 h-4" aria-hidden="true" />
          Track a Grievance
        </Link>
      </div>
    </div>
  );
}
