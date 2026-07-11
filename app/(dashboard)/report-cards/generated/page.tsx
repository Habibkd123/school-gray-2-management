"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, Download, Eye, Printer, Send, Trash2, ChevronDown, Search,
  FileText, Loader2, Check, Users, RefreshCw
} from "lucide-react";
import {
  getReportCardBatches, getDocument, deleteReportCardBatch,
  publishReportCardBatch, saveDocument
} from "@/app/components/document-builder/store";
import type { ReportCardBatch } from "@/app/components/document-builder/store";
import { PAGE_DIMENSIONS } from "@/app/components/document-builder/types";

// ─── Print a single document ──────────────────────────────────────────────────

function printDocumentById(docId: string) {
  const doc = getDocument(docId);
  if (!doc) return;
  const dims = PAGE_DIMENSIONS[doc.pageSize][doc.orientation];

  const pagesHtml = doc.pages.map((pg) => {
    const elementsHtml = pg.elements.map((el) => {
      const ts = el.textStyle;
      const is = el.imageStyle;
      const wrapperStyle = [
        `position:absolute`, `left:${el.x}px`, `top:${el.y}px`,
        `width:${el.width}px`, `height:${el.height}px`, `z-index:${el.zIndex}`,
        `box-sizing:border-box`, `overflow:hidden`,
      ].join(";");
      if (el.type === "image" || el.type === "logo") {
        if (!el.content) return "";
        return `<div style="${wrapperStyle}"><img src="${el.content}" style="width:100%;height:100%;object-fit:${is?.objectFit || "contain"};" /></div>`;
      }
      if (el.type === "table" && el.tableData) {
        const { rows, cols, cells, cellPadding, borderWidth, borderColor, headerRow } = el.tableData;
        let t = `<table style="width:100%;height:100%;border-collapse:collapse;table-layout:fixed;font-size:11px;">`;
        for (let r = 0; r < rows; r++) {
          t += "<tr>";
          for (let c = 0; c < cols; c++) {
            const isH = headerRow && r === 0;
            t += `<td style="border:${borderWidth}px solid ${borderColor};padding:${cellPadding}px;font-weight:${isH ? "bold" : "normal"};background:${isH ? "#F1F5F9" : "transparent"};vertical-align:middle;word-break:break-word;">${cells[r]?.[c] ?? ""}</td>`;
          }
          t += "</tr>";
        }
        t += "</table>";
        return `<div style="${wrapperStyle}">${t}</div>`;
      }
      if (el.type === "divider" || el.type === "horizontalLine" || el.type === "shape") {
        return `<div style="${wrapperStyle};background-color:${ts?.backgroundColor || ts?.color || "#1E3A5F"};"></div>`;
      }
      const textStyle = ts ? [
        `font-family:${ts.fontFamily}`, `font-size:${ts.fontSize}px`,
        `font-weight:${ts.fontWeight}`, `color:${ts.color}`,
        `text-align:${ts.textAlign}`, `line-height:${ts.lineHeight}`,
        `padding:${ts.paddingTop}px ${ts.paddingRight}px ${ts.paddingBottom}px ${ts.paddingLeft}px`,
        `word-break:break-word`, `white-space:pre-wrap`, `width:100%`,
      ].join(";") : "";
      return `<div style="${wrapperStyle}"><div style="${textStyle}">${el.content || ""}</div></div>`;
    }).join("");
    return `<div style="width:${dims.width}px;height:${dims.height}px;background:white;position:relative;overflow:hidden;page-break-after:always;">${elementsHtml}</div>`;
  }).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${doc.title}</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{background:white;}@media print{@page{margin:0;size:${doc.orientation === "landscape" ? "landscape" : "portrait"};}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head><body>${pagesHtml}</body></html>`;

  const existing = document.getElementById("__rc-print-frame__");
  if (existing) existing.remove();
  const iframe = document.createElement("iframe");
  iframe.id = "__rc-print-frame__";
  iframe.setAttribute("style", "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;visibility:hidden;");
  document.body.appendChild(iframe);
  const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iDoc) { iframe.remove(); return; }
  iDoc.open(); iDoc.write(html); iDoc.close();
  setTimeout(() => {
    try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); }
    finally { setTimeout(() => iframe.remove(), 3000); }
  }, 400);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GeneratedReportCardsPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<ReportCardBatch[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refresh = () => setBatches(getReportCardBatches());

  useEffect(() => { refresh(); }, []);

  const filtered = batches.filter((b) => {
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    const matchSearch = !search ||
      b.className.toLowerCase().includes(search.toLowerCase()) ||
      b.examName.toLowerCase().includes(search.toLowerCase()) ||
      b.section.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handlePublish = (id: string) => {
    publishReportCardBatch(id);
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteReportCardBatch(id);
    setConfirmDelete(null);
    refresh();
  };

  const handlePrintAll = (batch: ReportCardBatch) => {
    for (const docId of batch.documentIds) {
      printDocumentById(docId);
    }
  };

  const handleOpenBuilder = (docId: string) => {
    router.push(`/documents/builder/${docId}?reportCardMode=true`);
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </span>
            Generated Report Cards
          </h1>
          <p className="card-subtitle text-[13px] mt-1 ml-12">{batches.length} batch{batches.length !== 1 ? "es" : ""} · {batches.reduce((a, b) => a + b.studentIds.length, 0)} report cards total</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-border flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer shadow-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by class, exam, section…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-full bg-white dark:bg-slate-800 border border-border rounded-lg text-[13px] outline-none focus:border-primary/50"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "draft", "published"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors capitalize cursor-pointer ${
                statusFilter === s
                  ? "bg-primary text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Batch List */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl py-16 flex flex-col items-center gap-3 text-slate-400 shadow-sm">
          <FileText className="w-10 h-10 opacity-40" />
          <p className="text-[13px] font-medium">No report card batches found</p>
          <button
            onClick={() => router.push("/report-cards/generate")}
            className="text-[13px] text-primary font-semibold hover:underline cursor-pointer"
          >
            Generate report cards →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((batch) => (
            <div key={batch.id} className="bg-white dark:bg-slate-900 border border-border rounded-xl shadow-sm overflow-hidden">

              {/* Batch Header */}
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-slate-800 dark:text-slate-100 truncate">
                      {batch.className} – {batch.section} · {batch.examName}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-slate-400">{batch.studentIds.length} students</span>
                      <span className="text-[11px] text-slate-300 dark:text-slate-600">·</span>
                      <span className="text-[11px] text-slate-400">{batch.academicYear}</span>
                      <span className="text-[11px] text-slate-300 dark:text-slate-600">·</span>
                      <span className="text-[11px] text-slate-400">{batch.templateName}</span>
                      <span className="text-[11px] text-slate-300 dark:text-slate-600">·</span>
                      <span className="text-[11px] text-slate-400">{new Date(batch.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Status badge */}
                  <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    batch.status === "published"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${batch.status === "published" ? "bg-emerald-500" : "bg-amber-500"}`} />
                    {batch.status === "published" ? "Published" : "Draft"}
                  </span>

                  {/* Actions */}
                  {batch.status === "draft" && (
                    <button
                      onClick={() => handlePublish(batch.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Publish to Student Portal"
                    >
                      <Send className="w-3.5 h-3.5" /> Publish
                    </button>
                  )}

                  <button
                    onClick={() => handlePrintAll(batch)}
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors cursor-pointer"
                    title="Print All"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setExpandedBatch(expandedBatch === batch.id ? null : batch.id)}
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedBatch === batch.id ? "rotate-180" : ""}`} />
                  </button>

                  <button
                    onClick={() => setConfirmDelete(batch.id)}
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors cursor-pointer"
                    title="Delete Batch"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded: individual students */}
              {expandedBatch === batch.id && (
                <div className="border-t border-border divide-y divide-border">
                  {batch.documentIds.map((docId, idx) => {
                    const doc = getDocument(docId);
                    const studentId = batch.studentIds[idx];
                    const studentName = doc?.title?.split("—")[1]?.trim() || `Student ${idx + 1}`;
                    return (
                      <div key={docId} className="px-4 py-3 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-[11px] font-bold text-primary">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{studentName}</p>
                            {doc && <p className="text-[11px] text-slate-400">{doc.title}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {doc ? (
                            <>
                              <button
                                onClick={() => handleOpenBuilder(docId)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-border text-[12px] font-semibold text-slate-700 dark:text-slate-200 rounded-lg hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> View / Edit
                              </button>
                              <button
                                onClick={() => printDocumentById(docId)}
                                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                                title="Print PDF"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-rose-400">Document missing</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 max-w-md w-full border border-border">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Batch?</h3>
            <p className="card-subtitle text-[13px] mb-5">
              This will permanently delete the batch and all {batches.find((b) => b.id === confirmDelete)?.studentIds.length} generated report cards. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-[13px] rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[13px] rounded-xl transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
