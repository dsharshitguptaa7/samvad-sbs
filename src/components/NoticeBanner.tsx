import React from "react";
import { AlertCircle, ShieldAlert, ShieldCheck } from "lucide-react";

interface NoticeBannerProps {
  title?: string;
  message?: string;
  variant?: "warning" | "info" | "neutral" | "success";
  className?: string;
}

export function NoticeBanner({
  title = "Institutional Notice",
  message = "Official statutory notice for the School of Basic Sciences.",
  variant = "info",
  className = "",
}: NoticeBannerProps) {
  const styles = {
    warning: "bg-amber-50 border-amber-300 text-amber-950",
    info: "bg-slate-50 border-csjmu-300 text-slate-800",
    neutral: "bg-slate-50 border-slate-300 text-slate-800",
    success: "bg-emerald-50 border-emerald-300 text-emerald-950",
  };

  const iconColor = {
    warning: "text-amber-700 bg-amber-100",
    info: "text-csjmu-900 bg-csjmu-100",
    neutral: "text-slate-700 bg-slate-200",
    success: "text-emerald-700 bg-emerald-100",
  };

  return (
    <aside
      aria-label="System Status Notice"
      role="note"
      className={`border rounded-lg p-4 sm:p-5 shadow-sm ${styles[variant]} ${className}`}
    >
      <div className="flex items-start gap-3.5">
        <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${iconColor[variant]}`}>
          {variant === "warning" ? (
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          ) : variant === "success" ? (
            <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
          ) : (
            <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <strong className="block font-bold text-slate-900 text-xs sm:text-sm tracking-tight">{title}</strong>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-700">
              OFFICIAL
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">{message}</p>
        </div>
      </div>
    </aside>
  );
}
