import React from "react";
import Link from "next/link";
import { Shield, Mail, Phone, MapPin, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-csjmu-950 text-slate-300 border-t border-csjmu-800 mt-auto" role="contentinfo">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Column 1: Institutional Authority */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-csjmu-800 border border-csjmu-700 flex items-center justify-center text-gold-400">
                <Shield className="w-6 h-6" aria-hidden="true" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-wider text-white">SAMVAD</span>
                <p className="text-xs text-slate-400">Grievance Redressal Portal</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Official manual grievance submission and appellate redressal mechanism for students and faculty of the School of Basic Sciences, Chhatrapati Shahu Ji Maharaj University, Kanpur.
            </p>
            <div className="inline-block bg-csjmu-900 border border-csjmu-800 rounded px-3 py-1.5 text-[11px] text-gold-400 font-medium">
              100% Deterministic & Human-in-the-Loop Redressal
            </div>
          </div>

          {/* Column 2: Departments */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 border-b border-csjmu-800 pb-2">
              SBS Departments
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="hover:text-gold-400 transition cursor-default">Department of Mathematics</span>
              </li>
              <li>
                <span className="hover:text-gold-400 transition cursor-default">Department of Physics</span>
              </li>
              <li>
                <span className="hover:text-gold-400 transition cursor-default">Department of Chemistry</span>
              </li>
              <li>
                <span className="hover:text-gold-400 transition cursor-default">Department of Geography</span>
              </li>
              <li>
                <span className="hover:text-gold-400 transition cursor-default">Department of Environmental Sciences</span>
              </li>
            </ul>
          </div>

          {/* Column 3: Redressal Levels */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 border-b border-csjmu-800 pb-2">
              Redressal Hierarchy
            </h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-csjmu-800 text-gold-400 flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Tier 1: Course Coordinator</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-csjmu-800 text-gold-400 flex items-center justify-center text-[10px] font-bold">2</span>
                <span>Tier 2: Department Head (HoD)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-csjmu-800 text-gold-400 flex items-center justify-center text-[10px] font-bold">3</span>
                <span>Tier 3: Director, School of Basic Sciences</span>
              </li>
            </ul>
            <div className="mt-4 pt-3 border-t border-csjmu-800/60 text-[11px] text-slate-400">
              Administered strictly under CSJMU Student Redressal Guidelines.
            </div>
          </div>

          {/* Column 4: Contact & Office Location */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 border-b border-csjmu-800 pb-2">
              Office of the Director
            </h3>
            <div className="space-y-3 text-xs text-slate-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  School of Basic Sciences, CSJMU Campus, Kalyanpur, Kanpur, Uttar Pradesh 208024
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-gold-400 shrink-0" aria-hidden="true" />
                <span>director.sbs@csjmu.ac.in</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-gold-400 shrink-0" aria-hidden="true" />
                <span>+91 (0512) 2570301 (SBS Office)</span>
              </div>
              <div className="pt-2">
                <a
                  href="https://csjmu.ac.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-gold-400 hover:text-gold-300 transition"
                >
                  Visit Official CSJMU Portal <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright & Accessibility Notice */}
      <div className="bg-black/40 border-t border-csjmu-900/60 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>&copy; {new Date().getFullYear()} Chhatrapati Shahu Ji Maharaj University, Kanpur. All rights reserved.</p>
          <p className="text-[11px]">Designed to comply with WCAG 2.1 AA accessibility guidelines.</p>
        </div>
      </div>
    </footer>
  );
}
