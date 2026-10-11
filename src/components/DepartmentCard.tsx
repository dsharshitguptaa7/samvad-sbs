import React from "react";
import { BookOpen, GraduationCap, ArrowUpRight } from "lucide-react";

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
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-lg hover:border-csjmu-300 transition-all duration-300 p-6 flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-csjmu-50 border border-csjmu-100 text-csjmu-800 flex items-center justify-center group-hover:bg-csjmu-900 group-hover:text-gold-400 group-hover:scale-105 transition-all shadow-sm">
            {icon || <GraduationCap className="w-6 h-6" aria-hidden="true" />}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-bold tracking-wider px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
              {code}
            </span>
          </div>
        </div>

        <h3 className="text-lg font-bold text-slate-900 group-hover:text-csjmu-900 transition-colors">
          {name}
        </h3>

        <p className="mt-2 text-xs text-slate-600 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-csjmu-600" aria-hidden="true" />
            <span>Academic Programs</span>
          </div>
          <span className="text-[10px] bg-csjmu-50 text-csjmu-800 px-2 py-0.5 rounded-full font-semibold">
            {programs.length} {programs.length === 1 ? "Course" : "Courses"}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {programs.map((prog) => (
            <span
              key={prog}
              className="text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium border border-slate-200/80 transition-colors"
            >
              {prog}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
