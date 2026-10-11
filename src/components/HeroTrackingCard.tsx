"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";

export function HeroTrackingCard() {
  const router = useRouter();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;

    setIsSubmitting(true);
    const cleanToken = trackingNumber.trim().toUpperCase();
    router.push(`/track?trackingNumber=${encodeURIComponent(cleanToken)}`);
  };

  return (
    <div className="bg-white rounded-xl p-6 sm:p-7 text-slate-900 shadow-sm border border-slate-200 relative overflow-hidden">
      {/* Top Academic Gold Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gold-500" />

      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-csjmu-900 text-gold-400 flex items-center justify-center shadow-sm">
            <Search className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">Direct Status Check</h2>
            <p className="text-xs text-slate-500">Query grievance lifecycle in real-time</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          ACTIVE DESK
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="hero-tracking" className="block text-xs font-bold text-slate-700 mb-1.5">
            Official Tracking Number
          </label>
          <div className="relative">
            <input
              id="hero-tracking"
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. CSJMU-SBS-2026-MATH-0142"
              className="w-full px-3.5 py-2.5 text-xs font-mono uppercase rounded-md border border-slate-300 focus:border-csjmu-700 focus:ring-1 focus:ring-csjmu-700 outline-none transition placeholder:normal-case placeholder:text-slate-400"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Format: CSJMU-SBS-YYYY-[DEPT]-[SEQ]</span>
            {trackingNumber && (
              <button
                type="button"
                onClick={() => setTrackingNumber("")}
                className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold uppercase tracking-wider"
              >
                Clear
              </button>
            )}
          </p>
        </div>

        <button
          type="submit"
          disabled={!trackingNumber.trim() || isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider text-csjmu-950 bg-gold-400 hover:bg-gold-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm focus:outline-none focus:ring-2 focus:ring-csjmu-900"
        >
          <span>Track Grievance</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </form>

      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-csjmu-700 shrink-0" aria-hidden="true" />
          <span>Public Token Lookup</span>
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
          <span>Statutory Redressal</span>
        </span>
      </div>
    </div>
  );
}
