"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X, Shield, User, LogIn, Search } from "lucide-react";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Skip to Main Content Link for WCAG Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-csjmu-900 focus:font-semibold focus:shadow-lg focus:rounded-md"
      >
        Skip to main content
      </a>

      {/* Top University Brand Bar */}
      <div className="bg-csjmu-950 text-slate-300 text-xs py-1.5 px-4 sm:px-8 border-b border-csjmu-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gold-400">CSJMU</span>
            <span className="hidden sm:inline text-slate-500">|</span>
            <span>Chhatrapati Shahu Ji Maharaj University, Kanpur</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>UGC Recognized State University</span>
            <span>NAAC Accredited A++</span>
          </div>
        </div>
      </div>

      {/* Primary Navigation Header */}
      <header className="bg-csjmu-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Branding & Emblem */}
            <Link
              href="/"
              className="flex items-center gap-3 focus-visible:ring-offset-csjmu-900 rounded-md p-1 group"
              aria-label="SAMVAD - School of Basic Sciences Portal Home"
            >
              <div className="w-12 h-12 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-inner group-hover:bg-white/15 transition">
                <Shield className="w-7 h-7 text-gold-400" aria-hidden="true" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black tracking-wider text-white">SAMVAD</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-gold-400/20 text-gold-400 px-2 py-0.5 rounded border border-gold-400/30">
                    SBS
                  </span>
                </div>
                <span className="text-xs text-slate-300 font-medium tracking-wide">
                  School of Basic Sciences &bull; CSJMU Kanpur
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
              <Link
                href="/"
                className="px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:text-white hover:bg-csjmu-800 transition focus-visible:ring-white"
              >
                Home
              </Link>
              <Link
                href="/#workflow"
                className="px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:text-white hover:bg-csjmu-800 transition focus-visible:ring-white"
              >
                Redressal Workflow
              </Link>
              <Link
                href="/#departments"
                className="px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:text-white hover:bg-csjmu-800 transition focus-visible:ring-white"
              >
                Departments
              </Link>
              <Link
                href="/track"
                className="px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:text-white hover:bg-csjmu-800 transition flex items-center gap-1.5 focus-visible:ring-white"
              >
                <Search className="w-4 h-4 text-gold-400" aria-hidden="true" />
                Track Grievance
              </Link>

              <div className="h-6 w-px bg-csjmu-700 mx-2" aria-hidden="true" />

              <Link
                href="/register"
                className="px-3.5 py-2 rounded-md text-sm font-medium text-white bg-csjmu-800 hover:bg-csjmu-700 transition flex items-center gap-1.5 border border-csjmu-700 focus-visible:ring-white"
              >
                <User className="w-4 h-4 text-slate-300" aria-hidden="true" />
                Student Sign Up
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 rounded-md text-sm font-semibold text-csjmu-950 bg-gold-400 hover:bg-gold-500 transition flex items-center gap-1.5 shadow focus-visible:ring-white"
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                Portal Login
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-slate-200 hover:text-white hover:bg-csjmu-800 focus-visible:ring-white"
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

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-csjmu-800 bg-csjmu-950 px-4 pt-3 pb-6 space-y-2">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-md text-base font-medium text-slate-200 hover:bg-csjmu-800"
            >
              Home
            </Link>
            <Link
              href="/#workflow"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-md text-base font-medium text-slate-200 hover:bg-csjmu-800"
            >
              Redressal Workflow
            </Link>
            <Link
              href="/#departments"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-md text-base font-medium text-slate-200 hover:bg-csjmu-800"
            >
              Departments
            </Link>
            <Link
              href="/track"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-md text-base font-medium text-slate-200 hover:bg-csjmu-800"
            >
              Track Grievance
            </Link>
            <div className="pt-4 border-t border-csjmu-800 space-y-2">
              <Link
                href="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center block px-4 py-2.5 rounded-md text-sm font-semibold text-white bg-csjmu-800 hover:bg-csjmu-700"
              >
                Student Sign Up
              </Link>
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full text-center block px-4 py-2.5 rounded-md text-sm font-semibold text-csjmu-950 bg-gold-400 hover:bg-gold-500"
              >
                Portal Login (Student & Staff)
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
