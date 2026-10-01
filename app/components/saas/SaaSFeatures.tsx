"use client";

import React, { useState } from "react";
import {
  Globe,
  CreditCard,
  CalendarCheck,
  Award,
  UserCheck,
  Layout,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Receipt,
  FileSpreadsheet,
  QrCode,
  Smartphone,
  Sparkles,
} from "lucide-react";

export function SaaSFeatures() {
  const [activeTab, setActiveTab] = useState<"all" | "admin" | "academic" | "finance">("all");

  return (
    <section id="features" className="py-24 bg-[#090D16] border-t border-slate-800/80 relative overflow-hidden">
      {/* Subtle architectural background grid */}
      <div className="absolute inset-0 saas-dot-grid opacity-30 pointer-events-none" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-3.5 text-xs font-semibold text-amber-300 bg-amber-500/10 rounded-full border border-amber-500/25 tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Enterprise Campus Capabilities</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
            Engineered for Ground-Reality Indian Schools
          </h2>
          <p className="text-slate-400 mt-3 text-sm sm:text-base font-normal leading-relaxed">
            Not just another generic database. MySchoolLife is purpose-built to eliminate paper registers, prevent fee leakage, and automate CBSE/State Board compliance.
          </p>
        </div>

        {/* Bento Grid Architecture */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Spotlight 1: Dedicated School Subdomains & Multi-Tenant (7 Cols) */}
          <div className="lg:col-span-7 moving-border-card-subtle shadow-xl">
            <div className="moving-border-inner p-7 sm:p-9 flex flex-col justify-between group backdrop-blur-sm relative overflow-hidden h-full">
              <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                    <Globe className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-indigo-300">
                    Tenant Isolation
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight group-hover:text-amber-400 transition-colors">
                  Dedicated School Subdomain &amp; Branded Portal
                </h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Your institution gets its own isolated web portal with your logo, color themes, and custom domain routing. Parents and staff access <span className="text-slate-200 font-mono">yourschool.myschoollife.in</span> with zero cross-tenant data leakage.
              </p>

              {/* Realistic Browser URL Bar Mockup */}
              <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4 mb-6 space-y-3 font-sans">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                  </div>
                  <div className="flex-1 bg-slate-900/90 rounded-lg px-3 py-1 text-xs font-mono text-slate-300 border border-slate-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span className="text-slate-400">https://</span>
                      <strong className="text-white">your-school</strong>.myschoollife.in
                    </span>
                    <span className="text-[10px] text-emerald-400 font-sans font-bold bg-emerald-500/15 px-2 py-0.5 rounded">
                      SSL Active
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <div className="text-slate-500 text-[10px]">Portal State</div>
                    <div className="text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live &amp; Online
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <div className="text-slate-500 text-[10px]">Data Privacy</div>
                    <div className="text-slate-200 font-bold mt-0.5">AES-256 Cloud</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <div className="text-slate-500 text-[10px]">Custom Branding</div>
                    <div className="text-amber-400 font-bold mt-0.5">School Crest</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 border-t border-slate-800/60 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                Zero setup coding
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                Instant subdomain setup
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                Role-based routing
              </span>
            </div>
          </div>
          </div>

          {/* Spotlight 2: Zero-Leakage Fee Management & UPI (5 Cols) */}
          <div className="lg:col-span-5 moving-border-card-subtle shadow-xl">
            <div className="moving-border-inner p-7 sm:p-9 flex flex-col justify-between group backdrop-blur-sm relative overflow-hidden h-full">
              <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-amber-400">
                    Zero Leakage
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight group-hover:text-amber-400 transition-colors">
                  Smart Fee ERP &amp; Instant UPI Receipts
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Automated student fee installment schedules, fine policies, and instant digital receipts delivered straight to parents via WhatsApp and SMS.
                </p>

              {/* Realistic Transaction Pill */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Term 2 Fee • Rahul Sharma</div>
                      <div className="text-[10px] text-slate-400">Class 10th-A • Roll #14</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-emerald-400 tabular-nums">₹ 14,500</div>
                    <div className="text-[9px] text-slate-400 font-mono">UPI • Confirmed</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 font-mono text-[10px]">
                    <Receipt className="w-3 h-3 text-amber-400" />
                    RCP-2026-0842
                  </span>
                  <span className="text-emerald-400 font-semibold text-[10px]">
                    Auto-Dispatched on WhatsApp
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/60 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                Defaulter automatic SMS
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                Daily collection ledger
              </span>
            </div>
          </div>
          </div>

          {/* Card 3: 30-Second Classroom Attendance (4 Cols) */}
          <div className="lg:col-span-4 rounded-3xl bg-slate-900/70 border border-slate-800/90 p-6 sm:p-7 flex flex-col justify-between hover:border-slate-700 transition-all group backdrop-blur-sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-400">
                  Classroom Fast
                </span>
              </div>

              <h4 className="text-lg font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Smart 30-Sec Attendance
              </h4>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-4">
                Teachers mark full-class attendance with one-tap batch mode. Absent students trigger instant SMS notification to parents immediately.
              </p>

              {/* Attendance micro visual */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 mb-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Class 9th-B Roll Call</span>
                  <span className="text-emerald-400 font-bold">96% Present</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full w-[96%]" />
                  <div className="bg-rose-500 h-full w-[4%]" />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>38 Present</span>
                  <span className="text-rose-400">2 Absent (SMS Sent)</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Saves 15 mins per period</span>
            </div>
          </div>

          {/* Card 4: CBSE & State Board Marksheets (4 Cols) */}
          <div className="lg:col-span-4 rounded-3xl bg-slate-900/70 border border-slate-800/90 p-6 sm:p-7 flex flex-col justify-between hover:border-slate-700 transition-all group backdrop-blur-sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-400">
                  Auto Grading
                </span>
              </div>

              <h4 className="text-lg font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Automated Marksheet Engine
              </h4>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-4">
                Configurable grading scales, term weighting, GPA calculations, and single-click bulk PDF report card generation ready for printing.
              </p>

              {/* Marksheet micro visual */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 mb-4 text-xs font-mono">
                <div className="flex justify-between text-slate-400 pb-1 border-b border-slate-800 text-[10px]">
                  <span>Subject</span>
                  <span>Marks</span>
                  <span>Grade</span>
                </div>
                <div className="flex justify-between text-slate-200 py-1 border-b border-slate-800/50">
                  <span>Mathematics</span>
                  <span className="text-white font-bold">96/100</span>
                  <span className="text-emerald-400 font-bold">A1</span>
                </div>
                <div className="flex justify-between text-slate-200 py-1">
                  <span>Science</span>
                  <span className="text-white font-bold">92/100</span>
                  <span className="text-emerald-400 font-bold">A1</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>One-click PDF print export</span>
            </div>
          </div>

          {/* Card 5: Public School Website + SEO (4 Cols) */}
          <div className="lg:col-span-4 rounded-3xl bg-slate-900/70 border border-slate-800/90 p-6 sm:p-7 flex flex-col justify-between hover:border-slate-700 transition-all group backdrop-blur-sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <Layout className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-400">
                  Zero Maintenance
                </span>
              </div>

              <h4 className="text-lg font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
                Public School Website
              </h4>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-4">
                Attract new student admissions with a modern, high-converting public landing page featuring your campus gallery, achievements, and contact inquiry form.
              </p>

              {/* Website micro visual */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 mb-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-medium">
                    Admission 2026-27 Open
                  </span>
                  <span className="text-[10px] text-slate-400">Gallery (24 Photos)</span>
                </div>
                <div className="text-[11px] text-slate-300 font-medium">
                  Direct online admission inquiry pipeline straight into Principal desk.
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Mobile responsive &amp; SEO ready</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
