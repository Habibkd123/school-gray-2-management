"use client";

import React from "react";
import { Smartphone, Sparkles, ArrowRight, Bell, CheckCircle2, ShieldCheck } from "lucide-react";

interface SaaSMobileAppBannerProps {
  onOpenDemo: () => void;
}

export function SaaSMobileAppBanner({ onOpenDemo }: SaaSMobileAppBannerProps) {
  return (
    <section id="about" className="py-24 bg-[#080B12] border-t border-slate-800/80 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-8 sm:p-12 lg:p-14 flex flex-col lg:flex-row items-center justify-between gap-12 backdrop-blur-md relative overflow-hidden shadow-2xl">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

          {/* Left Text Information */}
          <div className="max-w-xl space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 rounded-full border border-amber-500/25 tracking-wide">
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span>Mobile Ecosystem in Active Rollout</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
              MySchoolLife Mobile Suite for Android &amp; iOS
            </h2>

            <p className="text-slate-400 text-sm sm:text-base font-normal leading-relaxed">
              Equip parents with real-time push alerts the moment attendance is marked. Give teachers a high-speed roll call interface right in the palm of their hand.
            </p>

            <div className="space-y-3 pt-2 text-xs sm:text-sm text-slate-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero-Latency Push Notifications for Absent / Late arrivals</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>One-Tap UPI Fee Payment via PhonePe, GPay, Paytm</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Instant Exam Marksheet &amp; Digital Report Card PDF access</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>School Circulars, Holiday Notices &amp; Homework Diary</span>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <button
                onClick={onOpenDemo}
                className="py-3 px-6 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-md shadow-amber-400/10 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <span>Request Early Access APK</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-slate-400">
                Staff training included with all school subscriptions
              </span>
            </div>
          </div>

          {/* Right Tactile Phone Screen Simulation with Moving Border */}
          <div className="w-full lg:w-80 shrink-0 moving-border-card-subtle shadow-2xl">
            <div className="moving-border-inner rounded-[32px] bg-slate-950 p-4 relative">
              {/* Speaker / Camera Notch */}
              <div className="w-24 h-4 bg-slate-900 rounded-full mx-auto mb-4" />

              <div className="space-y-3 font-sans">
                {/* School Name & Child Profile Header */}
                <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 font-bold text-xs flex items-center justify-center">
                      VR
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Vikram Rathore</div>
                      <div className="text-[10px] text-slate-400">Class 10th-A • Campus Portal</div>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>

                {/* Notification Item 1: Attendance */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/90 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <Bell className="w-3 h-3" />
                      Attendance Confirmed
                    </span>
                    <span className="text-[10px] text-slate-400">08:15 AM</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Vikram was marked <strong className="text-emerald-400">Present</strong> in Morning Roll Call.
                  </div>
                </div>

                {/* Notification Item 2: Fee Payment */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/90 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                      <Sparkles className="w-3 h-3" />
                      Fee Receipt Generated
                    </span>
                    <span className="text-[10px] text-slate-400">Yesterday</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    ₹ 14,500 Term 2 Fee received. Receipt #842 is ready to download.
                  </div>
                </div>

                {/* Bottom One-Tap UPI Action */}
                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-center">
                  <div className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider mb-1">
                    Upcoming Exam
                  </div>
                  <div className="text-xs font-bold text-white">
                    CBSE Pre-Board Exam Schedule
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Starts Monday • 9:00 AM
                  </div>
                </div>
              </div>

              {/* Bottom Home Indicator */}
              <div className="w-28 h-1 bg-slate-800 rounded-full mx-auto mt-4" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
