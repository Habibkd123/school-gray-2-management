"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Globe,
  ShieldCheck,
  Sparkles,
  Monitor,
  Palette,
  FileCheck2,
  Zap,
  CheckCircle2,
  Check,
  Layers,
  Users,
  CreditCard,
  GraduationCap,
  Calendar,
  FileText,
  Star,
  Activity,
  Award,
} from "lucide-react";

interface SaaSHeroProps {
  onOpenDemo: () => void;
}

export function SaaSHero({ onOpenDemo }: SaaSHeroProps) {
  const [activeHeroTab, setActiveHeroTab] = useState<"devices" | "suite">("devices");

  return (
    <section className="relative pt-12 pb-16 md:pt-16 md:pb-20 bg-[#080B12] text-slate-100 overflow-hidden border-b border-slate-800/80">
      {/* Architectural Dot Grid & Ambient Glows */}
      <div className="absolute inset-0 saas-dot-grid opacity-35 pointer-events-none" />
      <div className="absolute -top-32 left-1/4 w-[600px] h-[400px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-[500px] h-[350px] bg-amber-500/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ─────────────────────────────────────────────────────────────
            MAIN 2-COLUMN HERO (TEXT & BULLETS ON LEFT, VISUAL ON RIGHT)
            Directly inspired by high-converting modern SaaS hero patterns
            ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* LEFT COLUMN: Strategic SaaS Value Proposition & Feature Bullets */}
          <div className="lg:col-span-6 xl:col-span-6 text-left space-y-6">
            {/* Top Status Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-sm text-xs text-slate-300 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-white">MySchoolLife OS</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-300 font-normal">Campus Cloud ERP</span>
              <span className="text-amber-400 font-medium pl-1 hidden sm:inline">
                2026-27 Active Rollout
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-bold text-white tracking-[-0.025em] leading-[1.15]">
              The Operating System for{" "}
              <span className="text-amber-400 underline decoration-amber-500/40 decoration-wavy underline-offset-4">
                Modern School Campuses.
              </span>
            </h1>

            {/* High-Impact Description */}
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal max-w-xl">
              Replace physical registers and fragmented paperwork. Centralize student admissions, fee reconciliation, daily attendance, CBSE marksheets, and parent WhatsApp updates on your dedicated school subdomain.
            </p>

            {/* 4 Feature Bullets with Glowing Round Icons (Image 3 Style) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
                  <Monitor className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Dedicated Subdomain</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    your-school.myschoollife.in with zero cross-tenant leakage.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0 shadow-sm">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Modern &amp; Clean UI</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Intuitive, zero-training interface for teachers, staff &amp; admins.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">CBSE Marksheets Engine</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    1-click automated report cards with custom grading scales.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0 shadow-sm">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Zero-Touch UPI Fees</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Instant bank settlement with automated PDF &amp; SMS receipts.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons & Micro-Trust Badges */}
            <div className="pt-2 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={onOpenDemo}
                  className="px-6 py-3 rounded-xl font-bold text-sm text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-400/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Book a 1:1 Live Demo</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </button>

                <a
                  href="#preview"
                  className="px-5 py-3 rounded-xl font-medium text-sm text-slate-200 bg-slate-900/90 hover:bg-slate-800 hover:text-white border border-slate-700/80 hover:border-slate-500 transition-all flex items-center justify-center gap-2"
                >
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <span>Explore Live Portal</span>
                </a>
              </div>

              {/* Guarantees Strip */}
              <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 font-medium flex-wrap">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  No Credit Card Required
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  14-Day Free School Trial
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Multi-Campus Ready
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Rich SaaS Visual Showcase Collage (Matching Freshservice + Zoom + 3D Devices) */}
          <div className="lg:col-span-6 xl:col-span-6 relative mt-6 lg:mt-0">
            
            {/* View Switcher Bar at Top Right Corner */}
            <div className="flex items-center justify-between gap-2 mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-slate-300">
                  Live Demonstration Showcase
                </span>
              </div>
              <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setActiveHeroTab("devices")}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    activeHeroTab === "devices"
                      ? "bg-amber-400 text-slate-950 font-bold shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  3D Multi-Device
                </button>
                <button
                  onClick={() => setActiveHeroTab("suite")}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    activeHeroTab === "suite"
                      ? "bg-amber-400 text-slate-950 font-bold shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Campus Suite &amp; Team
                </button>
              </div>
            </div>

            {/* Showcase Container with Moving Gradient Glow */}
            <div className="moving-border-card shadow-2xl relative rounded-2xl overflow-visible">
              <div className="moving-border-inner rounded-[calc(1rem-1.5px)] bg-[#0A0E17] border border-slate-800/80 p-3 sm:p-4 overflow-hidden relative">

                {/* ── TAB 1: 3D Multi-Device ERP Mockup (Image 3 Style) ── */}
                {activeHeroTab === "devices" && (
                  <div className="relative animate-in fade-in duration-300">
                    {/* The 3D Render Image (Desktop + Tablet + Phone) */}
                    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden shadow-2xl border border-slate-800">
                      <Image
                        src="/images/saas/school_erp_devices.jpg"
                        alt="MySchoolLife 3D Multi-Device School ERP Dashboard"
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-700"
                        priority
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#080B12]/80 via-transparent to-transparent pointer-events-none" />
                    </div>

                    {/* Floating 3D Card 1: Live Attendance (Zoom/Freshservice Style) */}
                    <div className="absolute -top-3 -left-3 sm:-top-4 sm:-left-4 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-2xl z-20 max-w-[210px] hidden sm:block animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Live Register
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">09:15 AM</span>
                      </div>
                      <div className="text-xs font-bold text-white">Daily Attendance: 96.4%</div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div className="bg-emerald-400 h-full rounded-full" style={{ width: "96.4%" }} />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex justify-between font-mono">
                        <span>Present: 1,240</span>
                        <span>Absent: 46</span>
                      </div>
                    </div>

                    {/* Floating 3D Card 2: UPI Instant Fee Reconciliation */}
                    <div className="absolute -bottom-3 -right-3 sm:-bottom-4 sm:-right-4 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-2xl z-20 max-w-[220px] hidden sm:block animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                          ✓
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">UPI Auto-Settled</div>
                          <div className="text-xs font-extrabold text-amber-300">₹4,85,000 Today</div>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                        Zero manual entry. Direct bank settlement with instant WhatsApp receipt.
                      </p>
                    </div>

                    {/* Top Right Floating Badge: Rating & Verified Campuses */}
                    <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-full px-3 py-1 text-[11px] text-slate-300 flex items-center gap-1.5 shadow-lg">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-white">4.9/5</span>
                      <span className="text-slate-400 hidden xs:inline">• 50+ Campuses</span>
                    </div>
                  </div>
                )}

                {/* ── TAB 2: Campus Suite & Real Educators (Freshservice Image 2 Style) ── */}
                {activeHeroTab === "suite" && (
                  <div className="space-y-3 animate-in fade-in duration-300 text-left">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      
                      {/* Top-Left Card: 4 Core Modules with Colorful 3D Icons (Freshservice Style) */}
                      <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-3 space-y-2">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400 mb-1">
                          Campus ERP Catalog
                        </div>

                        <div className="space-y-1.5">
                          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                              <GraduationCap className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate">Student Admission KYC</div>
                              <div className="text-[10px] text-slate-400">Paperless digital enrollment</div>
                            </div>
                          </div>

                          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                              <Calendar className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate">Biometric Attendance</div>
                              <div className="text-[10px] text-slate-400">RFID &amp; App sync with SMS</div>
                            </div>
                          </div>

                          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                              <CreditCard className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate">Smart UPI Fee Counter</div>
                              <div className="text-[10px] text-slate-400">QR code &amp; NetBanking ledger</div>
                            </div>
                          </div>

                          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs shrink-0">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate">CBSE Marksheet Engine</div>
                              <div className="text-[10px] text-slate-400">Instant printable report cards</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Top-Right Card: School Leaders & Teachers Collaborating Photo */}
                      <div className="relative rounded-xl overflow-hidden border border-slate-800 shadow-md min-h-[190px]">
                        <Image
                          src="/images/saas/school_leaders_office.jpg"
                          alt="School Principals and Staff Reviewing Student Analytics"
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent pointer-events-none" />
                        <div className="absolute bottom-2.5 left-2.5 right-2.5">
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Empowering School Leaders
                          </span>
                          <div className="text-xs font-bold text-white mt-1">
                            100% Cloud-Managed Administration
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Card: Live Records Data Preview Table (Freshservice Image 2 Style) */}
                    <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3">
                      <div className="flex items-center justify-between text-[11px] mb-2 font-mono">
                        <span className="text-slate-400 font-semibold uppercase tracking-wider">
                          Live Active Records Preview
                        </span>
                        <span className="text-emerald-400 font-bold">● System Health 100%</span>
                      </div>

                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase font-mono">
                            <th className="pb-1.5 font-medium">Record Title</th>
                            <th className="pb-1.5 font-medium">Class / Module</th>
                            <th className="pb-1.5 font-medium">Status</th>
                            <th className="pb-1.5 font-medium text-right">Sync Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-[11px]">
                          <tr>
                            <td className="py-1.5 font-semibold text-slate-200">Term-1 Examination Report</td>
                            <td className="py-1.5 text-slate-400">Class 10th-A</td>
                            <td className="py-1.5">
                              <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                                Published
                              </span>
                            </td>
                            <td className="py-1.5 text-right font-mono text-slate-400 text-[10px]">Just now</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 font-semibold text-slate-200">Morning Roll Call Register</td>
                            <td className="py-1.5 text-slate-400">All 32 Sections</td>
                            <td className="py-1.5">
                              <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                                96.4% Present
                              </span>
                            </td>
                            <td className="py-1.5 text-right font-mono text-slate-400 text-[10px]">2m ago</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 font-semibold text-slate-200">Q3 Tuition Fees Reconciliation</td>
                            <td className="py-1.5 text-slate-400">UPI Autopay</td>
                            <td className="py-1.5">
                              <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                                ₹4.85L Settled
                              </span>
                            </td>
                            <td className="py-1.5 text-right font-mono text-slate-400 text-[10px]">5m ago</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

        </div>

        {/* ─────────────────────────────────────────────────────────────
            BOTTOM PLATFORM CAPABILITIES STRIP (GENERIC & MULTI-TENANT)
            ───────────────────────────────────────────────────────────── */}
        <div className="mt-14 pt-8 border-t border-slate-800/80 max-w-5xl mx-auto">
          <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-500 mb-5 text-center">
            Enterprise Multi-Tenant Infrastructure Built for Every Modern Campus
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3 text-left">
              <div className="w-8 h-8 rounded-lg bg-amber-400/10 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                <Globe className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  Instant Subdomain
                </div>
                <div className="text-[10px] text-slate-400 truncate font-mono">
                  your-school.myschoollife.in
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3 text-left">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  White-Label Domain
                </div>
                <div className="text-[10px] text-slate-400 truncate font-mono">
                  portal.yourschool.edu
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3 text-left">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                10k+
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">10,000+ Records</div>
                <div className="text-[10px] text-slate-400 truncate">High Capacity DB</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3 text-left">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">
                99.9%
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">99.9% Cloud Uptime</div>
                <div className="text-[10px] text-slate-400 truncate">Encrypted Backups</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
