"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { GraduationCap, Menu, X, ArrowRight, Sparkles } from "lucide-react";

interface SaaSHeaderProps {
  onOpenDemo: () => void;
}

export function SaaSHeader({ onOpenDemo }: SaaSHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      if (window.scrollY > 15) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="bg-[#080B12] border-b border-slate-800/80 text-xs py-2 px-4 text-center text-slate-400 relative z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            2026-27 Enrollment
          </span>
          <span className="text-slate-300 text-xs">
            Multi-Tenant Campus Portals &amp; Mobile App suite ready for school onboarding.
          </span>
          <button
            onClick={onOpenDemo}
            className="text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1 ml-1 cursor-pointer transition-colors"
          >
            <span>Book 15-Min Live Demo</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Sticky Header */}
      <header
        className={`sticky top-0 left-0 right-0 z-40 transition-all duration-200 ${
          scrolled
            ? "bg-[#090D16]/90 backdrop-blur-xl border-b border-slate-800 shadow-xl shadow-black/40"
            : "bg-[#090D16]/75 backdrop-blur-md border-b border-slate-800/60"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/80 text-amber-400 flex items-center justify-center font-bold text-lg shadow-inner group-hover:border-amber-400/50 group-hover:text-amber-300 transition-all">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-extrabold tracking-tight text-white group-hover:text-slate-100 transition-colors">
                    MySchoolLife
                  </span>
                  <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                    OS
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 tracking-wider font-medium uppercase -mt-0.5">
                  Campus Cloud Platform
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-7 text-[13px] font-medium text-slate-300">
              <a href="#features" className="hover:text-white transition-colors">
                Capabilities
              </a>
              <a href="#preview" className="hover:text-white transition-colors">
                Portal Mockup
              </a>
              <a href="#schools" className="hover:text-white transition-colors">
                Partner Schools
              </a>
              <a href="#calculator" className="hover:text-white transition-colors">
                ROI Calculator
              </a>
              <a href="#pricing" className="hover:text-white transition-colors">
                Subscription
              </a>
              <a href="#about" className="hover:text-white transition-colors">
                Mobile Suite
              </a>
            </nav>

            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-3">
              <button
                onClick={onOpenDemo}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-md shadow-amber-400/10 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Schedule Walkthrough</span>
              </button>
            </div>

            {/* Mobile Hamburger Button */}
            <div className="lg:hidden flex items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white focus:outline-none"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#090D16]/98 border-b border-slate-800 px-5 pt-3 pb-6 space-y-4 backdrop-blur-2xl">
            <nav className="flex flex-col space-y-2 text-sm font-medium text-slate-300">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-900 hover:text-amber-400 transition-colors"
              >
                Capabilities
              </a>
              <a
                href="#preview"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-900 hover:text-amber-400 transition-colors"
              >
                Portal Mockup
              </a>
              <a
                href="#schools"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-900 hover:text-amber-400 transition-colors"
              >
                Partner Schools
              </a>
              <a
                href="#calculator"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-900 hover:text-amber-400 transition-colors"
              >
                ROI Calculator
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-900 hover:text-amber-400 transition-colors"
              >
                Subscription
              </a>
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-900 hover:text-amber-400 transition-colors"
              >
                Mobile Suite
              </a>
            </nav>

            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenDemo();
                }}
                className="w-full py-2.5 px-4 text-center text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer"
              >
                Schedule Walkthrough
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
