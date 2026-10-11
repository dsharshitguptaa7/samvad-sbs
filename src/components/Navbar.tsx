"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  User,
  LogIn,
  Search,
  LogOut,
  LayoutDashboard,
  Award,
  BookOpen,
} from "lucide-react";
import { getRoleDashboardPath } from "@/lib/auth/role-routing";

interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const syncUserSession = useCallback(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    syncUserSession();
  }, [pathname, syncUserSession]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Proceed to clear state regardless of network failure
    } finally {
      setCurrentUser(null);
      window.location.href = "/login";
    }
  };

  return (
    <>
      {/* Skip to Main Content Link for Accessibility (WCAG 2.1 AA) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-csjmu-900 focus:font-semibold focus:shadow-md focus:rounded-md focus:ring-2 focus:ring-gold-500"
      >
        Skip to main content
      </a>

      {/* Top University Identity Bar */}
      <div className="bg-csjmu-950 text-slate-300 text-xs py-1.5 px-4 sm:px-8 border-b border-csjmu-800/80">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-1.5">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="font-hindi text-[11px] text-slate-300 hidden md:inline">
              छत्रपति शाहू जी महाराज विश्वविद्यालय, कानपुर
            </span>
            <span className="hidden md:inline text-slate-500">|</span>
            <span className="font-semibold text-white tracking-wide">
              Chhatrapati Shahu Ji Maharaj University, Kanpur
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Award className="w-3 h-3 text-gold-400 shrink-0" aria-hidden="true" />
              <span>NAAC A++ Accredited</span>
            </span>
            <span className="text-slate-600">•</span>
            <span>UGC Recognized State University</span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="hidden sm:inline">Estd. 1966</span>
          </div>
        </div>
      </div>

      {/* Primary Institutional Header */}
      <header className="bg-csjmu-900 text-white shadow-sm border-b-2 border-gold-500 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20 sm:h-22">
            
            {/* Dual University & Portal Branding */}
            <Link
              href="/"
              className="flex items-center gap-2.5 sm:gap-3.5 group rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
              aria-label="SAMVAD Portal - School of Basic Sciences, CSJMU Kanpur Home"
            >
              {/* CSJMU Official Seal */}
              <div className="w-11 h-11 sm:w-13 sm:h-13 bg-white rounded-full p-0.5 sm:p-1 border border-gold-500/50 shadow-sm shrink-0 flex items-center justify-center transition-transform group-hover:scale-102">
                <Image
                  src="/assets/csjmu-emblem.png"
                  alt="CSJMU Kanpur University Official Seal"
                  width={52}
                  height={52}
                  priority
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Subtle Institutional Separator */}
              <div className="h-8 sm:h-10 w-px bg-white/20 shrink-0" aria-hidden="true" />

              {/* SAMVAD Official Portal Emblem */}
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full p-0.5 shrink-0 flex items-center justify-center transition-transform group-hover:scale-102">
                <Image
                  src="/assets/samvad-emblem.png"
                  alt="SAMVAD - School of Basic Sciences Portal Emblem"
                  width={52}
                  height={52}
                  priority
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Text Hierarchy */}
              <div className="flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-1.5 leading-tight">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gold-400">
                    School of Basic Sciences
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-black tracking-wide text-white font-serif">
                    SAMVAD
                  </span>
                  <span className="hidden lg:inline text-xs sm:text-sm font-medium text-slate-200 border-l border-white/25 pl-2 leading-tight">
                    Grievance Redressal Portal
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-300 font-normal leading-tight truncate max-w-[210px] sm:max-w-sm md:max-w-none">
                  Chhatrapati Shahu Ji Maharaj University, Kanpur
                </p>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition ${
                  pathname === "/"
                    ? "text-gold-300 bg-csjmu-800/90 font-semibold"
                    : "text-slate-200 hover:text-white hover:bg-csjmu-800/60"
                }`}
              >
                Home
              </Link>
              <Link
                href="/#workflow"
                className="px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-slate-200 hover:text-white hover:bg-csjmu-800/60 transition"
              >
                Workflow
              </Link>
              <Link
                href="/#departments"
                className="px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-slate-200 hover:text-white hover:bg-csjmu-800/60 transition"
              >
                Departments
              </Link>
              <Link
                href="/track"
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium flex items-center gap-1.5 transition ${
                  pathname === "/track"
                    ? "text-gold-300 bg-csjmu-800/90 font-semibold"
                    : "text-slate-200 hover:text-white hover:bg-csjmu-800/60"
                }`}
              >
                <Search className="w-3.5 h-3.5 text-gold-400" aria-hidden="true" />
                <span>Track Grievance</span>
              </Link>
              <Link
                href="/#credits-heading"
                className="px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-slate-200 hover:text-white hover:bg-csjmu-800/60 transition"
              >
                Credits
              </Link>

              {currentUser && (
                <Link
                  href={getRoleDashboardPath(currentUser.role)}
                  className="px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold text-gold-300 hover:text-gold-200 hover:bg-csjmu-800 transition flex items-center gap-1.5 ml-1"
                >
                  <LayoutDashboard className="w-4 h-4 text-gold-400" aria-hidden="true" />
                  <span>Dashboard</span>
                </Link>
              )}

              <div className="h-6 w-px bg-white/20 mx-2" aria-hidden="true" />

              {currentUser ? (
                <div className="flex items-center gap-2">
                  <Link
                    href={getRoleDashboardPath(currentUser.role)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-csjmu-800 border border-csjmu-700/80 text-xs font-semibold text-white hover:bg-csjmu-750 transition"
                  >
                    <User className="w-3.5 h-3.5 text-gold-400" />
                    <span className="max-w-[120px] truncate">{currentUser.fullName}</span>
                    <span className="text-[10px] bg-gold-400/20 text-gold-300 px-1.5 py-0.5 rounded border border-gold-400/30 uppercase">
                      {currentUser.role.replace(/_/g, " ")}
                    </span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-950/60 border border-rose-900/60 transition cursor-pointer"
                    title="Sign Out of Portal"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/register"
                    className="px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-white bg-csjmu-800 hover:bg-csjmu-750 transition border border-csjmu-700 focus-visible:ring-2 focus-visible:ring-gold-400"
                  >
                    Student Sign Up
                  </Link>
                  <Link
                    href="/login"
                    className="px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 transition flex items-center gap-1.5 shadow-sm focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Portal Login</span>
                  </Link>
                </div>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-slate-200 hover:text-white hover:bg-csjmu-800 focus:outline-none focus:ring-2 focus:ring-gold-400"
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" aria-hidden="true" />
                ) : (
                  <Menu className="w-6 h-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-csjmu-800 bg-csjmu-950 px-4 pt-4 pb-6 space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-csjmu-800">
              <div className="w-9 h-9 bg-white rounded-full p-0.5 border border-gold-500/50 shrink-0 flex items-center justify-center">
                <Image
                  src="/assets/csjmu-emblem.png"
                  alt="CSJMU Emblem"
                  width={36}
                  height={36}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="w-9 h-9 rounded-full p-0.5 shrink-0 flex items-center justify-center">
                <Image
                  src="/assets/samvad-emblem.png"
                  alt="SAMVAD Emblem"
                  width={36}
                  height={36}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">SAMVAD Portal</p>
                <p className="text-[10px] text-slate-400 leading-tight">School of Basic Sciences &bull; CSJMU</p>
              </div>
            </div>

            <div className="space-y-1">
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:bg-csjmu-800"
              >
                Home
              </Link>
              <Link
                href="/#workflow"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:bg-csjmu-800"
              >
                Redressal Workflow
              </Link>
              <Link
                href="/#departments"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:bg-csjmu-800"
              >
                SBS Departments
              </Link>
              <Link
                href="/track"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-gold-300 hover:bg-csjmu-800 flex items-center gap-2"
              >
                <Search className="w-4 h-4 text-gold-400" />
                <span>Track Grievance Status</span>
              </Link>
              <Link
                href="/#credits-heading"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:bg-csjmu-800"
              >
                Credits &amp; Authorship
              </Link>

              {currentUser && (
                <Link
                  href={getRoleDashboardPath(currentUser.role)}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-sm font-bold text-gold-300 hover:bg-csjmu-800"
                >
                  My Dashboard ({currentUser.role})
                </Link>
              )}
            </div>

            <div className="pt-3 border-t border-csjmu-800 space-y-2">
              {currentUser ? (
                <>
                  <div className="px-3 py-2 rounded-md bg-csjmu-900 text-xs text-slate-300 border border-csjmu-800">
                    <p className="font-semibold text-white">{currentUser.fullName}</p>
                    <p className="text-[11px] text-gold-400">{currentUser.role.replace(/_/g, " ")} &bull; {currentUser.email}</p>
                  </div>
                  <Link
                    href={getRoleDashboardPath(currentUser.role)}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full text-center block px-4 py-2.5 rounded-md text-sm font-semibold text-white bg-csjmu-800"
                  >
                    Go to Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-center block px-4 py-2 rounded-md text-sm font-semibold text-rose-300 bg-rose-950/40 border border-rose-900/60"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full text-center block px-4 py-2 rounded-md text-sm font-semibold text-white bg-csjmu-800 hover:bg-csjmu-700 border border-csjmu-700"
                  >
                    Student Registration
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full text-center block px-4 py-2 rounded-md text-sm font-bold text-csjmu-950 bg-gold-400 hover:bg-gold-500 shadow-sm"
                  >
                    Portal Login (Student / Staff)
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
