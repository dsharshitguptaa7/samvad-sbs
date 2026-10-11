import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, MapPin, ExternalLink, Code2, GraduationCap, Award, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-csjmu-950 text-slate-300 border-t-2 border-gold-500 mt-auto" role="contentinfo">
      {/* Top Banner / University & Portal Scope */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* Column 1: Institutional Authority & Official Seals */}
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center gap-3">
              {/* CSJMU University Emblem */}
              <div className="w-12 h-12 bg-white rounded-full p-1 border border-gold-500/50 shadow-sm shrink-0 flex items-center justify-center">
                <Image
                  src="/assets/csjmu-emblem.png"
                  alt="CSJMU Kanpur Official Emblem"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* SAMVAD Portal Emblem */}
              <div className="w-12 h-12 rounded-full p-0.5 shrink-0 flex items-center justify-center">
                <Image
                  src="/assets/samvad-emblem.png"
                  alt="SAMVAD Portal Emblem"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black tracking-wider text-white font-serif">SAMVAD</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-gold-400/20 text-gold-400 px-2 py-0.5 rounded border border-gold-400/30">
                    SBS &bull; CSJMU
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">Grievance Redressal Portal</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              Official statutory grievance redressal mechanism for students, researchers, and faculty of the School of Basic Sciences, Chhatrapati Shahu Ji Maharaj University, Kanpur.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="inline-flex items-center gap-1.5 bg-csjmu-900 border border-csjmu-800 rounded-md px-2.5 py-1 text-[11px] text-gold-300 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-gold-400 shrink-0" aria-hidden="true" />
                <span>UGC Regulation Compliant</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-csjmu-900 border border-csjmu-800 rounded-md px-2.5 py-1 text-[11px] text-slate-300">
                <Award className="w-3.5 h-3.5 text-gold-400 shrink-0" aria-hidden="true" />
                <span>NAAC A++ Accredited</span>
              </div>
            </div>

            {/* Portal Engineering & Developers Credit Box */}
            <div id="credits-heading" className="mt-4 p-3.5 rounded-lg bg-csjmu-900/80 border border-csjmu-800 text-xs text-slate-300 space-y-1.5 max-w-md shadow-sm">
              <div className="flex items-center gap-2 text-gold-400 font-semibold text-[11px] uppercase tracking-wider">
                <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Portal Engineering &amp; System Architecture</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                Designed and Developed by <strong className="text-white font-semibold">Harshit Gupta</strong> and <strong className="text-white font-semibold">Anshika Soni</strong>
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <GraduationCap className="w-3.5 h-3.5 text-gold-400 shrink-0" aria-hidden="true" />
                <span>M.Sc Mathematics with AI and DS &bull; Department of Mathematics</span>
              </div>
            </div>
          </div>

          {/* Column 2: Departments */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-b border-csjmu-800 pb-2">
              SBS Departments
            </h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/#departments" className="hover:text-gold-400 transition block">
                  Department of Mathematics
                </Link>
              </li>
              <li>
                <Link href="/#departments" className="hover:text-gold-400 transition block">
                  Department of Physics
                </Link>
              </li>
              <li>
                <Link href="/#departments" className="hover:text-gold-400 transition block">
                  Department of Chemistry
                </Link>
              </li>
              <li>
                <Link href="/#departments" className="hover:text-gold-400 transition block">
                  Department of Geography
                </Link>
              </li>
              <li>
                <Link href="/#departments" className="hover:text-gold-400 transition block">
                  Department of Environmental Sciences
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Redressal Levels */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-b border-csjmu-800 pb-2">
              Redressal Hierarchy
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded bg-csjmu-900 border border-csjmu-800 text-gold-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <span className="font-medium text-white block">Tier 1: Course Coordinator</span>
                  <span className="text-[11px] text-slate-400">Course-level evaluation</span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded bg-csjmu-900 border border-csjmu-800 text-gold-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <span className="font-medium text-white block">Tier 2: Head of Department</span>
                  <span className="text-[11px] text-slate-400">Departmental adjudication</span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded bg-csjmu-900 border border-csjmu-800 text-gold-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <span className="font-medium text-white block">Tier 3: Director SBS</span>
                  <span className="text-[11px] text-slate-400">School appellate authority</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Office Location */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-b border-csjmu-800 pb-2">
              Directorate Office
            </h3>
            <div className="space-y-3 text-xs text-slate-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="leading-relaxed">
                  School of Basic Sciences, CSJMU Campus, Kalyanpur, Kanpur, Uttar Pradesh 208024
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-gold-400 shrink-0" aria-hidden="true" />
                <a href="mailto:director.sbs@csjmu.ac.in" className="hover:text-gold-300 transition">
                  director.sbs@csjmu.ac.in
                </a>
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
                  className="inline-flex items-center gap-1.5 text-xs text-gold-400 hover:text-gold-300 transition font-medium"
                >
                  Visit Official CSJMU Portal <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Note & Institutional Copyright Bar */}
      <div className="bg-black/60 border-t border-csjmu-900 py-4 px-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-3">
          <div className="text-center lg:text-left">
            <p className="text-slate-300">
              &copy; {new Date().getFullYear()} School of Basic Sciences, Chhatrapati Shahu Ji Maharaj University, Kanpur.
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Administered in compliance with UGC Grievance Redressal Regulations &bull; WCAG 2.1 AA Accessible.
            </p>
          </div>

          {/* Prominent Credit Badge requested by user */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 bg-csjmu-900 border border-csjmu-800 px-4 py-2 rounded-lg shadow-sm text-center">
            <span className="text-[11px] text-slate-300">
              Designed and Developed by{" "}
              <strong className="text-white font-semibold">Harshit Gupta</strong> and{" "}
              <strong className="text-white font-semibold">Anshika Soni</strong>{" "}
              <span className="text-gold-400 font-medium">(M.Sc Mathematics with AI and DS)</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
