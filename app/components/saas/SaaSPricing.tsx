"use client";

import React from "react";
import { Check, ArrowRight, ShieldCheck, Zap, Sparkles, Building2, School } from "lucide-react";

interface SaaSPricingProps {
  onOpenDemo: () => void;
}

export function SaaSPricing({ onOpenDemo }: SaaSPricingProps) {
  const inclusions = [
    "Dedicated School Subdomain (e.g. yourschool.myschoollife.in)",
    "Student, Parent, Teacher & Principal Role Portals",
    "Digital Fee Collection with Instant UPI Receipts & Defaulter Alerts",
    "Automated CBSE & State Board Marksheets & PDF Report Cards",
    "Smart 30-Second Classroom Attendance with Instant Absentee SMS",
    "Weekly Class Routine, Timetable & Teacher Subject Allocation",
    "Public School Website with Photo Gallery & Admission Inquiry",
    "Unlimited Student & Staff Records with Lifetime Historical Data",
    "High-Security Cloud Hosting, SSL Certificate & Daily Backups",
    "Dedicated WhatsApp Support & Free Staff Onboarding Training",
  ];

  return (
    <section id="pricing" className="py-24 bg-[#090D16] border-t border-slate-800/80 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-3.5 text-xs font-semibold text-amber-300 bg-amber-500/10 rounded-full border border-amber-500/25 tracking-wide">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Simple Transparent Pricing</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
            One Flat Subscription for Your Entire Campus
          </h2>
          <p className="text-slate-400 mt-3 text-sm sm:text-base font-normal leading-relaxed">
            No hidden per-student charges. No surprise server maintenance bills. Everything your school needs in one package.
          </p>
        </div>

        {/* Hero ₹5,000 Pricing Card with Moving Gradient Border */}
        <div className="max-w-2xl mx-auto moving-border-card shadow-2xl">
          <div className="moving-border-inner p-7 sm:p-10 lg:p-12">
            {/* Top Badge */}
            <div className="flex items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Annual Campus License
                </span>
                <h3 className="text-2xl font-bold text-white tracking-tight mt-0.5">
                  School Standard ERP
                </h3>
              </div>
              <span className="px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider whitespace-nowrap shadow-sm">
                Special Launch Offer
              </span>
            </div>

            {/* Price Display */}
            <div className="py-7 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-bold text-white tracking-tight font-mono">
                    ₹ 5,000
                  </span>
                  <span className="text-sm font-normal text-slate-400">/ academic year</span>
                </div>
                <span className="text-xs text-emerald-400 font-medium block mt-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Full multi-tenant portal + complete module access
                </span>
              </div>

              <div className="text-xs text-slate-400 sm:text-right">
                <span className="block font-medium text-slate-300">Zero Setup Fee</span>
                <span>Includes 14-day assisted preview</span>
              </div>
            </div>

            {/* CTA Button */}
            <div className="py-6">
              <button
                onClick={onOpenDemo}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-400/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <span>Activate School Subscription</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Included Features List */}
            <div className="pt-4 space-y-3">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                Everything Included in Your School License:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {inclusions.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-snug">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Support Note */}
            <div className="mt-8 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Free migration from existing Excel registers</span>
              </div>
              <button
                onClick={onOpenDemo}
                className="text-amber-400 hover:underline font-semibold cursor-pointer"
              >
                Have a multi-branch group? Talk to us →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
