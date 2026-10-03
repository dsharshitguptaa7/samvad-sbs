import React from "react";
import { AlertCircle, ShieldAlert } from "lucide-react";

interface NoticeBannerProps {
  title?: string;
  message?: string;
  variant?: "warning" | "info" | "neutral";
  className?: string;
}

export function NoticeBanner({
  title = "Foundation Stage Notice",
  message = "This portal interface is currently in Foundation Phase. Interactive submission and authentication workflows are nonfunctional until backend services and database migrations are activated.",
  variant = "warning",
  className = "",
}: NoticeBannerProps) {
  const styles = {
    warning: "bg-amber-50 border-amber-300 text-amber-900",
    info: "bg-blue-50 border-blue-300 text-blue-950",
    neutral: "bg-slate-100 border-slate-300 text-slate-800",
  };

  return (
    <aside
      aria-label="System Status Notice"
      role="note"
      className={`border-l-4 p-4 rounded-r-md text-sm shadow-sm ${styles[variant]} ${className}`}
    >
      <div className="flex items-start gap-3">
        {variant === "warning" ? (
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
        ) : (
          <ShieldAlert className="w-5 h-5 text-blue-800 shrink-0 mt-0.5" aria-hidden="true" />
        )}
        <div>
          <strong className="block font-semibold tracking-tight">{title}</strong>
          <p className="mt-1 leading-relaxed opacity-95">{message}</p>
        </div>
      </div>
    </aside>
  );
}
