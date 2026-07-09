"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, Check, Sparkles, LayoutTemplate, Eye } from "lucide-react";
import { TEMPLATE_DEFINITIONS } from "@/app/components/document-builder/templates-data";

const RC_TEMPLATES = TEMPLATE_DEFINITIONS.filter((t) => t.categoryId === "report_card");

const ORIENTATION_LABELS: Record<string, string> = {
  portrait: "Portrait",
  landscape: "Landscape",
};

export default function ReportCardTemplatesPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = RC_TEMPLATES.find((t) => t.id === selectedId);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <LayoutTemplate className="w-5 h-5 text-white" />
            </span>
            Report Card Templates
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 ml-12">
            {RC_TEMPLATES.length} templates available — select one to start generating report cards
          </p>
        </div>
        <Link
          href="/report-cards/generate"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" /> Use a Template
        </Link>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {RC_TEMPLATES.map((t) => (
          <div
            key={t.id}
            onClick={() => setSelectedId(selectedId === t.id ? null : t.id)}
            className={`rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
              selectedId === t.id
                ? "border-indigo-500 shadow-xl shadow-indigo-100 dark:shadow-indigo-900/30 -translate-y-1"
                : "border-border bg-white dark:bg-slate-900 hover:border-indigo-300 hover:-translate-y-0.5 shadow-sm"
            }`}
          >
            {/* Thumbnail */}
            <div className="h-48 relative flex flex-col items-center justify-center gap-2" style={{ background: t.thumbnailBg }}>
              {/* Simulated page preview */}
              <div className="w-24 h-32 bg-white/10 rounded border border-white/20 flex flex-col items-center justify-center gap-1.5 shadow-lg">
                <div className="w-16 h-1.5 rounded-full bg-white/40" />
                <div className="w-12 h-1 rounded-full bg-white/25" />
                <div className="w-16 h-4 mt-1 rounded bg-white/10 border border-white/15" />
                <div className="w-16 h-4 rounded bg-white/10 border border-white/15" />
                <div className="w-16 h-4 rounded bg-white/10 border border-white/15" />
                <div className="w-10 h-1 mt-1 rounded-full bg-white/25" style={{ backgroundColor: t.thumbnailAccent + "80" }} />
              </div>
              {selectedId === t.id && (
                <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
              <div className="absolute bottom-2 right-3 flex gap-2 text-[10px] text-white/60 font-medium">
                <span className="px-2 py-0.5 rounded bg-black/20">{ORIENTATION_LABELS[t.orientation]}</span>
                <span className="px-2 py-0.5 rounded bg-black/20">{t.pageSize}</span>
              </div>
            </div>

            {/* Info */}
            <div className="p-4 bg-white dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-[15px] text-slate-800 dark:text-slate-100">{t.name}</p>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{t.description}</p>
                </div>
                {selectedId === t.id && (
                  <span className="shrink-0 text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    Selected
                  </span>
                )}
              </div>

              {/* Features */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.id === "rc-cbse" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 font-semibold border border-teal-100 dark:border-teal-800">CBSE Format</span>}
                {t.id === "rc-premium" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-semibold border border-amber-100 dark:border-amber-800">⭐ Premium</span>}
                {t.id !== "rc-blank" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-semibold border border-indigo-100 dark:border-indigo-800">Auto-Fill</span>}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-semibold border border-slate-200 dark:border-slate-700">Signature Rows</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-semibold border border-slate-200 dark:border-slate-700">PDF Ready</span>
              </div>

              {/* Actions */}
              {selectedId === t.id && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push("/report-cards/generate"); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" /> Use This Template
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Info Banner */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5 flex items-start gap-4">
        <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-bold text-[14px] text-indigo-900 dark:text-indigo-100">Templates are auto-filled with exam data</h3>
          <p className="text-[13px] text-indigo-700 dark:text-indigo-300 mt-1 leading-relaxed">
            When you generate report cards, all student information — name, class, marks, grade, percentage, rank, attendance — 
            is automatically pulled from the Exam Module and filled into the selected template. 
            No manual data entry required. The principal can optionally edit design elements afterward.
          </p>
        </div>
      </div>

    </div>
  );
}
