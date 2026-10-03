import React from "react";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center"
    >
      <div className="relative">
        <Loader2 className="w-10 h-10 text-csjmu-800 animate-spin" aria-hidden="true" />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-700">
        Loading SAMVAD portal resources...
      </p>
      <span className="sr-only">Please wait, loading content</span>
    </div>
  );
}
