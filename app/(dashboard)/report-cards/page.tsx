"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText, Plus, BookOpen, CheckCircle, Clock, Users,
  Download, Eye, ChevronRight, Star, LayoutTemplate, TrendingUp
} from "lucide-react";
import { getReportCardBatches } from "@/app/components/document-builder/store";
import type { ReportCardBatch } from "@/app/components/document-builder/store";
import { TEMPLATE_DEFINITIONS } from "@/app/components/document-builder/templates-data";

export default function ReportCardsDashboard() {
  const [batches, setBatches] = useState<ReportCardBatch[]>([]);

  useEffect(() => {
    setBatches(getReportCardBatches());
  }, []);

  const total = batches.reduce((acc, b) => acc + b.studentIds.length, 0);
  const published = batches.filter((b) => b.status === "published").reduce((acc, b) => acc + b.studentIds.length, 0);
  const draft = total - published;
  const rcTemplates = TEMPLATE_DEFINITIONS.filter((t) => t.categoryId === "report_card");

  const stats = [
    { label: "Total Generated", value: total, icon: FileText, color: "from-blue-500 to-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-600" },
    { label: "Published", value: published, icon: CheckCircle, color: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600" },
    { label: "Drafts", value: draft, icon: Clock, color: "from-amber-500 to-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-600" },
    { label: "Templates", value: rcTemplates.length, icon: LayoutTemplate, color: "from-primary/80 to-primary", bg: "bg-primary/10 dark:bg-slate-800", text: "text-primary dark:text-blue-400" },
  ];

  const recentBatches = batches.slice(0, 5);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </span>
            Report Cards
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 ml-12">
            Auto-generate report cards from exam data • No manual entry required
          </p>
        </div>
        <Link
          href="/report-cards/generate"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-white text-[14px] font-semibold rounded-xl shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          Generate Report Cards
        </Link>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.text}`} />
              </div>
              <TrendingUp className="w-4 h-4 text-slate-300 dark:text-slate-600" />
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white">{s.value}</div>
            <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: "/report-cards/generate", icon: Plus, label: "Generate Report Cards", desc: "7-step wizard with auto-fill", color: "bg-primary hover:bg-[var(--primary-hover)] shadow-primary/20" },
          { href: "/report-cards/generated", icon: FileText, label: "Generated Report Cards", desc: "View, download & publish", color: "bg-slate-800 hover:bg-slate-900 dark:bg-slate-800/80 dark:hover:bg-slate-800" },
          { href: "/report-cards/templates", icon: LayoutTemplate, label: "Templates", desc: "Browse all report card templates", color: "bg-emerald-600 hover:bg-emerald-700" },
        ].map((a) => (
          <Link key={a.href} href={a.href} className={`${a.color} text-white rounded-xl p-5 flex items-center gap-4 transition-all hover:-translate-y-0.5 shadow-sm group`}>
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <a.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-[14px]">{a.label}</div>
              <div className="text-[12px] text-white/70 mt-0.5">{a.desc}</div>
            </div>
            <ChevronRight className="w-4 h-4 ml-auto opacity-60 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>

      {/* ── How it Works ───────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" /> How it Works
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            "Select Academic Year",
            "Select Exam",
            "Select Class",
            "Select Section",
            "Choose Students",
            "Pick Template",
            "Generate PDF",
          ].map((step, i) => (
            <div key={step} className="flex flex-col items-center text-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-slate-800 text-primary dark:text-blue-400 font-bold text-[13px] flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-tight">{step}</p>
              {i < 6 && <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600 hidden lg:block rotate-0 mt-auto" />}
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Batches ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Recent Batches</h2>
          <Link href="/report-cards/generated" className="text-[13px] font-semibold text-primary dark:text-blue-400 hover:text-[var(--primary-hover)] flex items-center gap-1">
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {recentBatches.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
            <BookOpen className="w-10 h-10 opacity-40" />
            <p className="text-[13px] font-medium">No report cards generated yet</p>
            <Link href="/report-cards/generate" className="text-[13px] text-primary dark:text-blue-400 font-semibold hover:underline">
              Generate your first batch →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentBatches.map((b) => (
              <div key={b.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                      {b.className} – {b.section} · {b.examName}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {b.studentIds.length} students · {b.academicYear} · {b.templateName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${b.status === "published"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${b.status === "published" ? "bg-emerald-500" : "bg-amber-500"}`} />
                    {b.status === "published" ? "Published" : "Draft"}
                  </span>
                  <Link
                    href="/report-cards/generated"
                    className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Templates Preview ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Available Templates</h2>
          <Link href="/report-cards/templates" className="text-[13px] font-semibold text-primary dark:text-blue-400 hover:text-[var(--primary-hover)] flex items-center gap-1">
            Browse All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {rcTemplates.map((t) => (
            <Link
              key={t.id}
              href="/report-cards/generate"
              className="group flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
            >
              <div
                className="w-full h-20 rounded-lg flex items-center justify-center shadow-inner"
                style={{ background: t.thumbnailBg }}
              >
                <div className="w-10 h-12 bg-white/10 rounded-sm border border-white/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white/70" />
                </div>
              </div>
              <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 text-center group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">
                {t.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
