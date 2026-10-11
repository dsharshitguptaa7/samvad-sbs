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
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 sm:p-7 text-slate-900 shadow-2xl border border-white/20 ring-1 ring-slate-900/5 relative overflow-hidden">
      {/* Decorative top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gold-400 via-csjmu-500 to-csjmu-800" />

      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-csjmu-900 text-gold-400 flex items-center justify-center shadow-sm">
            <Search className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">Direct Status Check</h2>
            <p className="text-xs text-slate-500">Query grievance lifecycle in real-time</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          LIVE DESK
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="hero-tracking" className="block text-xs font-bold text-slate-700 mb-1.5">
            Grievance Tracking Number
          </label>
          <div className="relative">
            <input
              id="hero-tracking"
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. CSJMU-SBS-2026-MATH-0142"
              className="w-full px-4 py-2.5 text-xs font-mono uppercase rounded-lg border border-slate-300 focus:border-csjmu-600 focus:ring-2 focus:ring-csjmu-600/20 outline-none transition placeholder:normal-case placeholder:text-slate-400"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Format: CSJMU-SBS-YYYY-[DEPT]-[SEQ]</span>
            {trackingNumber && (
              <button
                type="button"
                onClick={() => setTrackingNumber("")}
                className="text-[10px] text-slate-400 hover:text-slate-600 underline"
              >
                Clear
              </button>
            )}
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !trackingNumber.trim()}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-xs font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 active:bg-gold-600 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-csjmu-800"
        >
          {isSubmitting ? (
            <span>Querying Live Ledger...</span>
          ) : (
            <>
              <span>Track Grievance Status</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </>
          )}
        </button>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-csjmu-700" />
            <span>Public Status Verification</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Real-time public transparency for review tiers and hearings. Student identity and private evidence are strictly protected.
          </p>
        </div>
      </form>
    </div>
  );
}
