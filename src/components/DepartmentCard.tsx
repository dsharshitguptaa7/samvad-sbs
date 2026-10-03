import React from "react";
import { BookOpen, GraduationCap } from "lucide-react";

interface DepartmentCardProps {
  name: string;
  code: string;
  programs: string[];
  description: string;
  icon?: React.ReactNode;
}

export function DepartmentCard({
  name,
  code,
  programs,
  description,
  icon,
}: DepartmentCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="w-11 h-11 rounded-lg bg-csjmu-50 border border-csjmu-100 text-csjmu-800 flex items-center justify-center group-hover:bg-csjmu-900 group-hover:text-gold-400 transition-colors">
            {icon || <GraduationCap className="w-6 h-6" aria-hidden="true" />}
          </div>
          <span className="text-xs font-mono font-bold tracking-wider px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
            {code}
          </span>
        </div>

        <h3 className="text-lg font-bold text-slate-900 group-hover:text-csjmu-800 transition-colors">
          {name}
        </h3>

        <p className="mt-2 text-xs text-slate-600 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
          <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Offered Programs</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {programs.map((prog) => (
            <span
              key={prog}
              className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium"
            >
              {prog}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
