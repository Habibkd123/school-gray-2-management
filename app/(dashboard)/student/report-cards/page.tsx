"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, FileText, Printer, Eye, Download, Calendar, ChevronRight } from "lucide-react";
import { getReportCardBatches, getDocument } from "@/app/components/document-builder/store";
import { useAuth } from "@/app/context/auth";
import type { ReportCardBatch } from "@/app/components/document-builder/store";

// ─── Print a document ─────────────────────────────────────────────────────────

function printDocumentById(docId: string) {
  const doc = getDocument(docId);
  if (!doc) return;
  const { PAGE_DIMENSIONS } = require("@/app/components/document-builder/types");
  const dims = PAGE_DIMENSIONS[doc.pageSize][doc.orientation];
  const pagesHtml = doc.pages.map((pg: any) => {
    const elementsHtml = pg.elements.map((el: any) => {
      const ts = el.textStyle;
      const wrapperStyle = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;z-index:${el.zIndex};box-sizing:border-box;overflow:hidden;`;
      if (el.type === "image" || el.type === "logo") {
        if (!el.content) return "";
        return `<div style="${wrapperStyle}"><img src="${el.content}" style="width:100%;height:100%;object-fit:contain;" /></div>`;
      }
      if (el.type === "table" && el.tableData) {
        const { rows, cols, cells, cellPadding, borderWidth, borderColor, headerRow } = el.tableData;
        let t = `<table style="width:100%;height:100%;border-collapse:collapse;table-layout:fixed;font-size:11px;">`;
        for (let r = 0; r < rows; r++) {
          t += "<tr>";
          for (let c = 0; c < cols; c++) {
            const isH = headerRow && r === 0;
            t += `<td style="border:${borderWidth}px solid ${borderColor};padding:${cellPadding}px;font-weight:${isH ? "bold" : "normal"};background:${isH ? "#F1F5F9" : "transparent"};word-break:break-word;">${cells[r]?.[c] ?? ""}</td>`;
          }
          t += "</tr>";
        }
        t += "</table>";
        return `<div style="${wrapperStyle}">${t}</div>`;
      }
      const textStyle = ts ? `font-family:${ts.fontFamily};font-size:${ts.fontSize}px;font-weight:${ts.fontWeight};color:${ts.color};text-align:${ts.textAlign};line-height:${ts.lineHeight};padding:${ts.paddingTop}px ${ts.paddingRight}px ${ts.paddingBottom}px ${ts.paddingLeft}px;word-break:break-word;white-space:pre-wrap;width:100%;` : "";
      return `<div style="${wrapperStyle}"><div style="${textStyle}">${el.content || ""}</div></div>`;
    }).join("");
    return `<div style="width:${dims.width}px;height:${dims.height}px;background:white;position:relative;overflow:hidden;page-break-after:always;">${elementsHtml}</div>`;
  }).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${doc.title}</title><style>*{margin:0;padding:0;box-sizing:border-box;}@media print{@page{margin:0;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head><body>${pagesHtml}</body></html>`;
  const existing = document.getElementById("__rc-student-print__");
  if (existing) existing.remove();
  const iframe = document.createElement("iframe");
  iframe.id = "__rc-student-print__";
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

interface StudentReportCard {
  batchId: string;
  docId: string;
  examName: string;
  className: string;
  section: string;
  academicYear: string;
  templateName: string;
  publishedAt: string;
}

export default function StudentReportCardsPage() {
  const { user } = useAuth();
  const [reportCards, setReportCards] = useState<StudentReportCard[]>([]);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);

  useEffect(() => {
    // Load all published batches and find entries that belong to this student
    // In a real system this would be filtered server-side by student_id
    // Here we search by matching name in doc titles since studentIds are stored in batch
    const batches = getReportCardBatches().filter((b) => b.status === "published");
    const cards: StudentReportCard[] = [];
    for (const batch of batches) {
      batch.documentIds.forEach((docId, idx) => {
        const doc = getDocument(docId);
        if (!doc) return;
        // Match by user name in doc title (format: "Report Card — Student Name — Exam")
        const studentNameInTitle = doc.title?.split("—")[1]?.trim() || "";
        if (user?.name && studentNameInTitle.toLowerCase().includes(user.name.toLowerCase())) {
          cards.push({
            batchId: batch.id,
            docId,
            examName: batch.examName,
            className: batch.className,
            section: batch.section,
            academicYear: batch.academicYear,
            templateName: batch.templateName,
            publishedAt: batch.publishedAt || batch.createdAt,
          });
        }
      });
    }
    setReportCards(cards);
  }, [user?.name]);

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </span>
          My Report Cards
        </h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 ml-12">
          View and download your academic report cards
        </p>
      </div>

      {/* Report Card List */}
      {reportCards.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl py-16 flex flex-col items-center gap-3 text-slate-400 shadow-sm">
          <BookOpen className="w-10 h-10 opacity-40" />
          <p className="text-[14px] font-medium">No report cards available yet</p>
          <p className="text-[12px] text-slate-300 dark:text-slate-600">Report cards will appear here once published by your school</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reportCards.map((rc) => (
            <div
              key={`${rc.batchId}-${rc.docId}`}
              className="bg-white dark:bg-slate-900 border border-border rounded-xl p-4 shadow-sm flex items-center justify-between gap-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-slate-800 dark:text-slate-100">
                    {rc.examName}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {rc.academicYear}
                    </span>
                    <span className="text-[11px] text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-[11px] text-slate-400">{rc.className} – {rc.section}</span>
                    <span className="text-[11px] text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-[11px] text-slate-400">
                      Published {new Date(rc.publishedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setPreviewDocId(rc.docId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 font-semibold text-[12px] rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
                <button
                  onClick={() => printDocumentById(rc.docId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[12px] rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewDocId && (() => {
        const doc = getDocument(previewDocId);
        if (!doc) return null;
        const { PAGE_DIMENSIONS } = require("@/app/components/document-builder/types");
        const dims = PAGE_DIMENSIONS[doc.pageSize][doc.orientation];
        const scale = Math.min(0.9, (window.innerWidth * 0.85) / dims.width);
        return (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-6 overflow-auto bg-black/70 backdrop-blur-sm">
            <div className="relative">
              <button
                onClick={() => setPreviewDocId(null)}
                className="fixed top-4 right-4 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center text-slate-700 hover:text-slate-900 cursor-pointer z-[60]"
              >
                ✕
              </button>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: 12, letterSpacing: 1, fontWeight: 700 }}>
                {doc.title}
              </div>
              {doc.pages.map((pg, i) => (
                <div key={pg.id} style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      width: dims.width, height: dims.height,
                      background: "white", position: "relative", overflow: "hidden",
                      boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
                      transform: `scale(${scale})`, transformOrigin: "top center",
                      marginBottom: `calc(${dims.height * scale}px - ${dims.height}px)`,
                    }}
                  >
                    {pg.elements.map((el) => {
                      const ts = el.textStyle;
                      return (
                        <div
                          key={el.id}
                          style={{
                            position: "absolute", left: el.x, top: el.y,
                            width: el.width, height: el.height, zIndex: el.zIndex,
                            fontFamily: ts?.fontFamily, fontSize: ts?.fontSize,
                            fontWeight: ts?.fontWeight, color: ts?.color,
                            textAlign: ts?.textAlign as any,
                            backgroundColor: ts?.backgroundColor !== "transparent" ? ts?.backgroundColor : undefined,
                            overflow: "hidden", wordBreak: "break-word", whiteSpace: "pre-wrap",
                          }}
                          dangerouslySetInnerHTML={el.content ? { __html: el.content } : undefined}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

    </div>
  );
}
