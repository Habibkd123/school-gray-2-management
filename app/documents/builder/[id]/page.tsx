"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, X, Sparkles, Lock, FileCheck, Eye, Database, CheckCircle2, AlertCircle, RefreshCw, Link, ExternalLink, Search, Check } from "lucide-react";
import { getDocument, saveDocument, getTemplate, saveTemplate as saveTemplateStore } from "@/app/components/document-builder/store";
import type { DocumentMeta, TemplateMeta, CanvasPage, DocumentElement } from "@/app/components/document-builder/types";
import { PAGE_DIMENSIONS } from "@/app/components/document-builder/types";
import { TopToolbar } from "@/app/components/document-builder/TopToolbar";
import { LeftToolbar } from "@/app/components/document-builder/LeftToolbar";
import { Canvas } from "@/app/components/document-builder/Canvas";
import { decodeVariablesClient } from "@/lib/utils/variable-resolver";
import { getAuthHeaders } from "@/lib/utils/session";

// ─── Undo / Redo History ──────────────────────────────────────────────────────
// Uses refs to avoid stale closure issues with pointer / stack state.

const MAX_HISTORY = 80;

function useHistory(initialPages: CanvasPage[]) {
  const stackRef = useRef<CanvasPage[][]>([initialPages]);
  const pointerRef = useRef(0);
  const [tick, setTick] = useState(0); // just to trigger re-render for canUndo/canRedo

  const push = useCallback((pages: CanvasPage[]) => {
    const ptr = pointerRef.current;
    const truncated = stackRef.current.slice(0, ptr + 1);
    truncated.push(pages);
    if (truncated.length > MAX_HISTORY) truncated.shift();
    stackRef.current = truncated;
    pointerRef.current = truncated.length - 1;
    // No re-render needed here — toolbar reads canUndo/canRedo reactively on next action
  }, []);

  const undo = useCallback(() => {
    if (pointerRef.current <= 0) return null;
    pointerRef.current -= 1;
    setTick((t) => t + 1);
    return stackRef.current[pointerRef.current];
  }, []);

  const redo = useCallback(() => {
    if (pointerRef.current >= stackRef.current.length - 1) return null;
    pointerRef.current += 1;
    setTick((t) => t + 1);
    return stackRef.current[pointerRef.current];
  }, []);

  return {
    push,
    undo,
    redo,
    get canUndo() { return pointerRef.current > 0; },
    get canRedo() { return pointerRef.current < stackRef.current.length - 1; },
  };
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({ document: doc, onClose }: { document: DocumentMeta; onClose: () => void }) {
  const { width, height } = require("@/app/components/document-builder/types").PAGE_DIMENSIONS[doc.pageSize][doc.orientation];
  const scale = Math.min(1, (window.innerWidth * 0.8) / width, (window.innerHeight * 0.85) / height);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 8000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflow: "auto", padding: "40px 24px" }}>
      <div style={{ position: "relative" }}>
        <button
          onClick={onClose}
          style={{ position: "fixed", top: 16, right: 16, zIndex: 8001, width: 36, height: 36, borderRadius: "50%", background: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}
        >
          <X size={16} />
        </button>
        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", textAlign: "center", marginBottom: 12, letterSpacing: 0.5 }}>
          PREVIEW — {doc.title}
        </div>
        {doc.pages.map((pg, i) => (
          <div key={pg.id} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textAlign: "center", marginBottom: 6 }}>Page {i + 1}</div>
            <div
              className="db-page"
              style={{
                width, height,
                background: "white",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
                transform: `scale(${scale})`,
                transformOrigin: "top center",
                marginBottom: `calc(${height * scale}px - ${height}px)`,
              }}
            >
              {pg.elements.map((el) => {
                const ts = el.textStyle;
                return (
                  <div
                    key={el.id}
                    style={{
                      position: "absolute", left: el.x, top: el.y, width: el.width, height: el.height, zIndex: el.zIndex,
                      fontFamily: ts?.fontFamily, fontSize: ts?.fontSize, fontWeight: ts?.fontWeight, fontStyle: ts?.fontStyle,
                      textDecoration: ts?.textDecoration, textAlign: ts?.textAlign as any,
                      color: ts?.color, backgroundColor: ts?.backgroundColor === "transparent" ? undefined : ts?.backgroundColor,
                      letterSpacing: ts?.letterSpacing, lineHeight: ts?.lineHeight,
                      padding: ts ? `${ts.paddingTop}px ${ts.paddingRight}px ${ts.paddingBottom}px ${ts.paddingLeft}px` : undefined,
                      borderRadius: ts?.borderRadius,
                      border: ts?.borderWidth ? `${ts.borderWidth}px solid ${ts.borderColor}` : undefined,
                      boxSizing: "border-box", overflow: "hidden", wordBreak: "break-word", whiteSpace: "pre-wrap",
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
}

// ─── Main Builder Page ────────────────────────────────────────────────────────

export default function BuilderPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = params.id as string;

  // ── Generated Document Mode ────────────────────────────────────────────────────
  // When ?variables=<base64> is in URL: auto-replace all variable elements on load
  const generatedVars   = searchParams.get("variables");    // base64-encoded JSON map
  const generatedDocId  = searchParams.get("generatedDocId"); // DB record to mark printed
  const generatedFor    = searchParams.get("generatedFor");  // name of the person
  const generatedTitle  = searchParams.get("generatedTitle"); // document title
  const isGeneratedMode = !!generatedVars;

  // ── Template Mode ────────────────────────────────────────────────────────
  // URL pattern: /documents/builder/template-{templateId}?templateMode=true or /documents/builder/{templateSlug}
  const isTemplateModePrefixed = docId.startsWith("template-");
  const templateIdFromPrefix = isTemplateModePrefixed ? docId.slice(9) : docId;

  // Check if this exists as a template in the store
  const matchedTemplate = getTemplate(templateIdFromPrefix);
  const isTemplateMode = (searchParams.get("templateMode") === "true" || isTemplateModePrefixed || !!matchedTemplate) && !generatedVars;
  const templateId = isTemplateMode ? templateIdFromPrefix : null;

  // ── Report Card Mode ──────────────────────────────────────────────────────
  const isReportCardMode = searchParams.get("reportCardMode") === "true";

  const [doc, setDoc] = useState<DocumentMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [variablesApplied, setVariablesApplied] = useState(false);

  const [zoom, setZoom]                  = useState(1);
  const [currentPage, setCurrentPage]    = useState(1);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode]    = useState(false);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // ERP Linkage Search States
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkResults, setLinkResults] = useState<any[]>([]);
  const [linkLoading, setLinkLoading] = useState(false);

  const history = useHistory([]);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Map category to erp module type
  const erpModule = (() => {
    if (!doc) return "student";
    const cid = doc.categoryId;
    if (["student", "certificate", "exam", "report_card"].includes(cid)) return "student";
    if (["teacher", "letter"].includes(cid)) return "teacher";
    if (["fees"].includes(cid)) return "fees";
    return "student";
  })();

  // Helper: Apply Variables and replace placeholders while keeping originals intact
  const applyVariablesToDocument = useCallback((variables: Record<string, string>, currentDoc: DocumentMeta): DocumentMeta => {
    let placeholdersFound   = 0;
    let placeholdersReplaced = 0;
    const unmatchedKeys     = new Set<string>();

    const resolveKey = (key: string): string => {
      if (variables[key] !== undefined)  return variables[key];
      const dotKey = key.replace(/_/g, ".");
      if (variables[dotKey] !== undefined) return variables[dotKey];
      const underKey = key.replace(".", "_");
      if (variables[underKey] !== undefined) return variables[underKey];
      if (key.endsWith("_number") && variables[key.replace(/_number$/, "_no")] !== undefined)
        return variables[key.replace(/_number$/, "_no")];
      if (key.endsWith(".number") && variables[key.replace(/\.number$/, "_no")] !== undefined)
        return variables[key.replace(/\.number$/, "_no")];
      if (key.endsWith("_no") && variables[key.replace(/_no$/, "_number")] !== undefined)
        return variables[key.replace(/_no$/, "_number")];
      return "";
    };

    const replaceInText = (text: string): string =>
      text.replace(/\{\{([^}]+)\}\}/g, (_match, key: string) => {
        placeholdersFound++;
        const trimmed = key.trim();
        const value   = resolveKey(trimmed);
        if (value !== "") {
          placeholdersReplaced++;
          return value;
        }
        unmatchedKeys.add(trimmed);
        return "";
      });

    // Parse subject results list from resolved variables
    const subjectsList: Array<{ name: string; max: string; obtained: string; grade: string; status: string }> = [];
    let subjectIdx = 1;
    while (true) {
      const name = variables[`result.subject_${subjectIdx}_name`] || variables[`result_subject_${subjectIdx}_name`];
      if (!name) break;
      const obtained = variables[`result.subject_${subjectIdx}_obtained`] || variables[`result_subject_${subjectIdx}_obtained`] || "";
      const max = variables[`result.subject_${subjectIdx}_total`] || variables[`result_subject_${subjectIdx}_total`] || "100";
      const grade = variables[`result.subject_${subjectIdx}_grade`] || variables[`result_subject_${subjectIdx}_grade`] || "";
      const status = variables[`result.subject_${subjectIdx}_status`] || variables[`result_subject_${subjectIdx}_status`] || "";
      
      subjectsList.push({ name, max, obtained, grade, status });
      subjectIdx++;
    }

    const updatedPages = currentDoc.pages.map((pg) => ({
      ...pg,
      elements: pg.elements.map((el): DocumentElement => {
        // Capture original content if not set
        const originalContent = el.originalContent ?? el.content ?? "";
        
        // ─ Variable elements
        if (el.type === "variable") {
          const key = (el.variableMeta?.key || originalContent.replace(/[{} ]/g, "") || "").trim();
          placeholdersFound++;
          const value = resolveKey(key);
          if (value) placeholdersReplaced++;
          else unmatchedKeys.add(key);
          return {
            ...el,
            originalContent,
            variableMeta: el.variableMeta
              ? { ...el.variableMeta, previewValue: value }
              : el.variableMeta,
          };
        }

        // ─ Text elements
        if (
          (el.type === "heading" ||
           el.type === "subheading" ||
           el.type === "paragraph") &&
          originalContent.includes("{{")
        ) {
          return {
            ...el,
            originalContent,
            content: replaceInText(originalContent),
          };
        }

        // ─ Table cells
        if (el.type === "table" && el.tableData) {
          const originalCells = el.tableData.originalCells ?? JSON.parse(JSON.stringify(el.tableData.cells));
          const headerRow = originalCells[0] || [];
          
          // Check if this table has a column for "subject" and "marks/obtained" to detect if it's the academic marks list
          const subjectColIndex = headerRow.findIndex((h: string) => h.toLowerCase().includes("subject"));
          const hasMarks = headerRow.some((h: string) => {
            const hl = h.toLowerCase();
            return hl.includes("marks") || hl.includes("obtained") || hl.includes("grade") || hl.includes("result");
          });

          if (subjectColIndex !== -1 && hasMarks && subjectsList.length > 0) {
            // Rebuild subject rows dynamically
            const newCells: string[][] = [headerRow];
            
            subjectsList.forEach((sub) => {
              const row = headerRow.map((colName: string) => {
                const colLower = colName.toLowerCase();
                if (colLower.includes("subject")) return sub.name;
                if (colLower.includes("max")) return sub.max;
                if (colLower.includes("obtained") || colLower.includes("marks") || colLower === "obt") return sub.obtained;
                if (colLower.includes("%") || colLower.includes("percent")) {
                  const m = Number(sub.obtained);
                  const t = Number(sub.max);
                  return !isNaN(m) && t ? `${((m / t) * 100).toFixed(0)}%` : "";
                }
                if (colLower.includes("grade")) return sub.grade;
                if (colLower.includes("status") || colLower.includes("result") || colLower.includes("remarks")) return sub.status;
                return "";
              });
              newCells.push(row);
            });

            // Keep footer total/aggregate row at bottom if it exists in template
            const lastRow = originalCells[originalCells.length - 1];
            if (lastRow && (lastRow[0].toLowerCase().includes("total") || lastRow[0].toLowerCase().includes("aggregate") || lastRow[0].toLowerCase().includes("grand"))) {
              const resolvedFooterRow = lastRow.map((cell: string) => replaceInText(cell));
              newCells.push(resolvedFooterRow);
            }

            return {
              ...el,
              tableData: {
                ...el.tableData,
                rows: newCells.length,
                cells: newCells,
                originalCells,
              },
            };
          } else {
            // General table variable resolution
            const newCells = originalCells.map((row: string[]) =>
              row.map((cell: string) => (cell.includes("{{") ? replaceInText(cell) : cell))
            );
            return {
              ...el,
              tableData: {
                ...el.tableData,
                cells: newCells,
                originalCells,
              },
            };
          }
        }

        return el;
      }),
    }));

    console.log(`[Builder Apply] Found: ${placeholdersFound}, Replaced: ${placeholdersReplaced}, Unmatched:`, [...unmatchedKeys]);

    return {
      ...currentDoc,
      pages: updatedPages,
      resolvedVariables: variables,
    };
  }, []);

  // ── Search linked records ──────────────────────────────────────────────────
  const searchLinkRecords = useCallback(async (q: string) => {
    if (!q.trim()) { setLinkResults([]); return; }
    setLinkLoading(true);
    try {
      let url = "";
      if (erpModule === "student") url = `/api/students?search=${encodeURIComponent(q)}&limit=10`;
      else if (erpModule === "teacher") url = `/api/teachers?search=${encodeURIComponent(q)}&limit=10`;
      else if (erpModule === "fees") url = `/api/fee-payments?search=${encodeURIComponent(q)}&limit=10`;

      if (!url) { setLinkResults([]); setLinkLoading(false); return; }

      const res = await fetch(url, { headers: getAuthHeaders() as any });
      const data = await res.json();
      const items = (data.data?.students || data.data?.teachers || data.data?.payments || data.data || []).slice(0, 10);
      setLinkResults(items.map((r: any) => ({ ...r, _type: erpModule })));
    } catch {
      setLinkResults([]);
    } finally {
      setLinkLoading(false);
    }
  }, [erpModule]);

  useEffect(() => {
    if (!isLinkModalOpen || !linkSearch) return;
    const t = setTimeout(() => searchLinkRecords(linkSearch), 350);
    return () => clearTimeout(t);
  }, [linkSearch, searchLinkRecords, isLinkModalOpen]);

  // ── Handle linking a record ─────────────────────────────────────────────────
  const handleLinkRecord = async (record: any) => {
    if (!doc) return;
    setLinkLoading(true);
    try {
      const body = {
        templateId: doc.templateId || docId,
        documentType: doc.categoryId || "custom",
        referenceModule: erpModule,
        referenceId: record._id,
        generatedFor: erpModule === "student" ? [record._id] : undefined,
      };
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(getAuthHeaders() as any) },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const newVars = data.success && (data.data?.[0]?.variables || data.data?.variables)
        ? (data.data[0].variables || data.data.variables)
        : null;

      const appliedVars = newVars || {
        student_name: record.name || "",
        reference_id: record._id || "",
        date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
      };

      setDoc((d) => {
        if (!d) return null;
        const updated: DocumentMeta = {
          ...d,
          recordId: record._id,
          recordType: erpModule,
          recordName: record.name,
          resolvedVariables: appliedVars,
        };
        const resolvedDoc = applyVariablesToDocument(appliedVars, updated);
        saveDocument(resolvedDoc);
        return resolvedDoc;
      });
      setIsLinkModalOpen(false);
      setLinkSearch("");
      setLinkResults([]);
    } catch (e) {
      console.error("Link record error:", e);
    } finally {
      setLinkLoading(false);
    }
  };

  // ── Handle Refresh Data ─────────────────────────────────────────────────────
  const handleRefreshData = useCallback(async () => {
    if (!doc || !doc.recordId || !doc.recordType) return;
    setSaveStatus("saving");
    try {
      const body = {
        templateId: doc.templateId || docId,
        documentType: doc.categoryId || "custom",
        referenceModule: doc.recordType,
        referenceId: doc.recordId,
        generatedFor: doc.recordType === "student" ? [doc.recordId] : undefined,
      };
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(getAuthHeaders() as any) },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const newVars = data.success && (data.data?.[0]?.variables || data.data?.variables)
        ? (data.data[0].variables || data.data.variables)
        : null;

      if (newVars) {
        setDoc((d) => {
          if (!d) return null;
          const updated = applyVariablesToDocument(newVars, d);
          saveDocument(updated);
          return updated;
        });
      }
    } catch (e) {
      console.error("Refresh variables error:", e);
    } finally {
      setSaveStatus("idle");
    }
  }, [doc, docId, applyVariablesToDocument]);

  // ── Auto-apply variables effect ──────────────────────────────────────────────
  useEffect(() => {
    if (!doc || variablesApplied) return;

    if (generatedVars) {
      const vars = decodeVariablesClient(generatedVars);
      if (Object.keys(vars).length) {
        setDoc((d) => d ? applyVariablesToDocument(vars, d) : d);
      }
      setVariablesApplied(true);
      setPreviewMode(true);
    } else if (doc.resolvedVariables && Object.keys(doc.resolvedVariables).length) {
      setDoc((d) => d ? applyVariablesToDocument(d.resolvedVariables!, d) : d);
      setVariablesApplied(true);
      setPreviewMode(true);
    }
  }, [doc?.id, generatedVars, variablesApplied, applyVariablesToDocument, doc]);

  // ── Load document or template ──────────────────────────────────────────
  useEffect(() => {
    console.log("Document Builder loading initiated:", {
      docId,
      isTemplateMode,
      templateId,
      searchParams: Object.fromEntries(searchParams.entries())
    });

    // 1. Check if it's an existing document in localStorage
    const existingDoc = getDocument(docId);
    if (existingDoc) {
      setDoc(existingDoc);
      setIsLoading(false);
      return;
    }

    // 2. If not found as a document, check if actualTemplateId matches a template
    const actualTemplateId = docId.startsWith("template-") ? docId.slice(9) : docId;
    const tmpl = getTemplate(actualTemplateId);

    if (tmpl) {
      // It matches a template!
      if (isGeneratedMode) {
        // If opened with variables, create a temporary working document from the template
        const now = new Date().toISOString();
        const tempDoc: DocumentMeta = {
          id: crypto.randomUUID(), // new unique ID so it's a separate document
          title: generatedTitle || `Generated ${tmpl.name}`,
          categoryId: tmpl.categoryId,
          templateId: tmpl.id,
          status: "draft",
          pageSize: tmpl.pageSize,
          orientation: tmpl.orientation,
          createdBy: "System",
          createdAt: now,
          updatedAt: now,
          pages: JSON.parse(JSON.stringify(tmpl.pages)),
        };
        // Save it to the document store so it is persistent and editable
        saveDocument(tempDoc);

        // Update the URL with the new document ID to prevent duplicate creations on reload
        const newParams = new URLSearchParams(searchParams);
        router.replace(`/documents/builder/${tempDoc.id}?${newParams.toString()}`);
        return;
      } else {
        // Just represent the template as a DocumentMeta for direct editor loading (Template Mode)
        const asMeta: DocumentMeta = {
          id: `template-${tmpl.id}`,
          title: tmpl.name,
          categoryId: tmpl.categoryId,
          templateId: tmpl.id,
          status: tmpl.status as DocumentMeta["status"],
          pageSize: tmpl.pageSize,
          orientation: tmpl.orientation,
          createdBy: tmpl.createdBy,
          createdAt: tmpl.createdAt,
          updatedAt: tmpl.updatedAt,
          pages: tmpl.pages,
        };
        setDoc(asMeta);
        setIsLoading(false);
      }
    } else {
      // Neither document nor template found
      setNotFound(true);
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, isGeneratedMode, generatedTitle, router, searchParams]);


  // ── Keyboard shortcuts (page-level: undo, redo, save) ──────────────────
  // Note: Ctrl+C/X/V/D/A/Delete/Arrow are handled inside Canvas.tsx
  // Using a ref for handleSave so we never need it in the dependency array.
  const saveRef = useRef<() => void>(() => {});
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement;
      const isTyping = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement;

      // Ctrl+Z — Undo
      if (ctrl && e.key === "z" && !e.shiftKey && !isTyping) {
        e.preventDefault();
        const prev = history.undo();
        if (prev) setDoc((d) => d ? { ...d, pages: prev } : d);
        return;
      }
      // Ctrl+Y or Ctrl+Shift+Z — Redo
      if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey)) && !isTyping) {
        e.preventDefault();
        const next = history.redo();
        if (next) setDoc((d) => d ? { ...d, pages: next } : d);
        return;
      }
      // Ctrl+S — Save
      if (ctrl && e.key === "s") {
        e.preventDefault();
        saveRef.current();
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [history]);

  // ── Auto-save every 30s ─────────────────────────────────────────────────
  const docRef = useRef(doc);
  useEffect(() => { docRef.current = doc; }, [doc]);

  useEffect(() => {
    const interval = setInterval(() => {
      const current = docRef.current;
      if (!current) return;
      setSaveStatus("saving");
      if (isTemplateMode && templateId) {
        const existing = getTemplate(templateId);
        if (existing) saveTemplateStore({ ...existing, name: current.title, pages: current.pages, updatedAt: new Date().toISOString() });
      } else {
        saveDocument(current);
      }
      setTimeout(() => setSaveStatus("saved"), 600);
      setTimeout(() => setSaveStatus("idle"), 2800);
    }, 30000);
    return () => clearInterval(interval);
  }, []); // runs once — reads latest doc via ref

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleDocumentChange = useCallback((updates: Partial<DocumentMeta>) => {
    setDoc((d) => d ? { ...d, ...updates } : d);
  }, []);

  const handleSave = useCallback(() => {
    if (!doc) return;
    setSaveStatus("saving");
    if (isTemplateMode && templateId) {
      // Save back to template store
      const existing = getTemplate(templateId);
      if (existing) {
        const updated: TemplateMeta = {
          ...existing,
          name:      doc.title,
          pages:     doc.pages,
          updatedAt: new Date().toISOString(),
        };
        saveTemplateStore(updated);
      }
    } else {
      saveDocument(doc);
    }
    setTimeout(() => setSaveStatus("saved"), 600);
    setTimeout(() => setSaveStatus("idle"), 2500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, isTemplateMode, templateId]);

  // Keep saveRef current so keyboard handler always calls the latest handleSave
  useEffect(() => { saveRef.current = handleSave; }, [handleSave]);

  const handlePublish = useCallback(() => {
    if (!doc) return;
    const updated = saveDocument({ ...doc, status: "published" });
    setDoc(updated);
  }, [doc]);

  const handlePrint = useCallback(() => {
    if (!doc) return;
    saveDocument(doc);

    const dims = PAGE_DIMENSIONS[doc.pageSize][doc.orientation];

    const pagesHtml = doc.pages.map((pg) => {
      const elementsHtml = pg.elements.map((el) => {
        const ts = el.textStyle;
        const is = el.imageStyle;

        // Base wrapper style — applied to all elements
        const wrapperStyle = [
          `position:absolute`,
          `left:${el.x}px`,
          `top:${el.y}px`,
          `width:${el.width}px`,
          `height:${el.height}px`,
          `z-index:${el.zIndex}`,
          is?.rotation ? `transform:rotate(${is.rotation}deg)` : "",
          `box-sizing:border-box`,
          `overflow:hidden`,
        ].filter(Boolean).join(";");

        // Text style — applied to text content containers
        const textStyle = ts ? [
          `font-family:${ts.fontFamily}`,
          `font-size:${ts.fontSize}px`,
          `font-weight:${ts.fontWeight}`,
          `font-style:${ts.fontStyle}`,
          `text-decoration:${ts.textDecoration}`,
          `text-align:${ts.textAlign}`,
          `color:${ts.color}`,
          ts.backgroundColor !== "transparent" ? `background-color:${ts.backgroundColor}` : "",
          `letter-spacing:${ts.letterSpacing}px`,
          `line-height:${ts.lineHeight}`,
          `padding:${ts.paddingTop}px ${ts.paddingRight}px ${ts.paddingBottom}px ${ts.paddingLeft}px`,
          ts.borderRadius ? `border-radius:${ts.borderRadius}px` : "",
          ts.borderWidth ? `border:${ts.borderWidth}px solid ${ts.borderColor}` : "",
          `word-break:break-word`,
          `white-space:pre-wrap`,
          `box-sizing:border-box`,
          // Do NOT set height on text — let it flow naturally to avoid overlap
          `width:100%`,
        ].filter(Boolean).join(";") : "";

        // Render based on element type
        if (el.type === "image" || el.type === "logo") {
          if (!el.content) return "";
          const imgStyle = [
            `width:100%`, `height:100%`,
            is?.opacity !== undefined ? `opacity:${is.opacity}` : "",
            is?.borderRadius ? `border-radius:${is.borderRadius}px` : "",
            is?.borderWidth ? `border:${is.borderWidth}px solid ${is.borderColor}` : "",
            `object-fit:${is?.objectFit || "contain"}`,
          ].filter(Boolean).join(";");
          return `<div style="${wrapperStyle}"><img src="${el.content}" style="${imgStyle}" /></div>`;
        }

        if (el.type === "divider" || el.type === "horizontalLine") {
          return `<div style="${wrapperStyle};background-color:${ts?.color || "#1E3A5F"};border-radius:2px;"></div>`;
        }

        if (el.type === "verticalLine") {
          return `<div style="${wrapperStyle};background-color:${ts?.color || "#1E3A5F"};border-radius:2px;"></div>`;
        }

        if (el.type === "pageBreak") {
          return ""; // page breaks handled by page-break-after on page wrapper
        }

        if (el.type === "table" && el.tableData) {
          const { rows, cols, cells, cellPadding, borderWidth, borderColor, headerRow } = el.tableData;
          let tableHtml = `<table style="width:100%;height:100%;border-collapse:collapse;table-layout:fixed;font-size:12px;">`;
          for (let r = 0; r < rows; r++) {
            tableHtml += "<tr>";
            for (let c = 0; c < cols; c++) {
              const isH = headerRow && r === 0;
              tableHtml += `<td style="border:${borderWidth}px solid ${borderColor};padding:${cellPadding}px;font-weight:${isH ? "bold" : "normal"};background:${isH ? "#F1F5F9" : "transparent"};vertical-align:middle;word-break:break-word;">${cells[r]?.[c] ?? ""}</td>`;
            }
            tableHtml += "</tr>";
          }
          tableHtml += "</table>";
          return `<div style="${wrapperStyle}">${tableHtml}</div>`;
        }

        // Default: text elements (heading, subheading, paragraph, variable)
        return `<div style="${wrapperStyle}"><div style="${textStyle}">${el.content || ""}</div></div>`;
      }).join("");

      return `<div style="width:${dims.width}px;height:${dims.height}px;background:white;position:relative;overflow:hidden;page-break-after:always;break-after:page;margin:0 auto;">${elementsHtml}</div>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${doc.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: white; }
    @media print {
      @page { margin: 0; size: ${doc.orientation === "landscape" ? "landscape" : "portrait"}; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>${pagesHtml}</body>
</html>`;

    // ── Hidden iframe — no popup permissions needed ──────────────────────
    const existingFrame = document.getElementById("__doc-print-frame__");
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "__doc-print-frame__";
    iframe.setAttribute("style", "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;visibility:hidden;");
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) { iframe.remove(); return; }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Wait briefly for content to render, then print the iframe
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => iframe.remove(), 3000);
      }
    }, 400);
  }, [doc]);

  const handleDownloadPdf = useCallback(() => {
    handlePrint();
  }, [handlePrint]);

  const pushHistory = useCallback((pages: CanvasPage[]) => {
    history.push(pages);
  }, [history]);

  const handleUndo = useCallback(() => {
    const prev = history.undo();
    if (prev && doc) setDoc((d) => d ? { ...d, pages: prev } : d);
  }, [history, doc]);

  const handleRedo = useCallback(() => {
    const next = history.redo();
    if (next && doc) setDoc((d) => d ? { ...d, pages: next } : d);
  }, [history, doc]);

  const handleInsert = useCallback((partial: Omit<DocumentElement, "id" | "x" | "y" | "zIndex">) => {
    if (!doc) return;
    const pageIdx = currentPage - 1;
    const page = doc.pages[pageIdx];
    if (!page) return;
    const maxZ = page.elements.length > 0 ? Math.max(...page.elements.map((e) => e.zIndex)) : 0;
    const { PAGE_DIMENSIONS } = require("@/app/components/document-builder/types");
    const dims = PAGE_DIMENSIONS[doc.pageSize][doc.orientation];
    const w = (partial as any).width ?? 200;
    const h = (partial as any).height ?? 60;
    const newEl: DocumentElement = {
      ...partial as any,
      id: crypto.randomUUID(),
      x: Math.round((dims.width / 2 - w / 2) / 8) * 8,
      y: Math.round((dims.height / 4) / 8) * 8,
      zIndex: maxZ + 1,
    };
    const newPages = doc.pages.map((p, i) =>
      i === pageIdx ? { ...p, elements: [...p.elements, newEl] } : p
    );
    setDoc((d) => d ? { ...d, pages: newPages } : d);
    setSelectedElementIds([newEl.id]);
    pushHistory(newPages);
  }, [doc, currentPage, pushHistory]);

  // ── Loading / Not found ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ width: "100vw", height: "100vh", background: "#0F2336", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <Loader2 style={{ width: 32, height: 32, color: "white", animation: "spin 1s linear infinite" }} />
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600 }}>Loading Document…</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (notFound || !doc) {
    return (
      <div style={{ width: "100vw", height: "100vh", background: "#0F2336", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <p style={{ color: "white", fontSize: 18, fontWeight: 700 }}>Document not found</p>
        <button onClick={() => router.push("/documents")} style={{ padding: "10px 20px", borderRadius: 8, background: "#1E3A5F", color: "white", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          Back to Documents
        </button>
      </div>
    );
  }

  return (
    <div
      id="doc-builder-wrapper"
      style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "Roboto, sans-serif" }}
    >
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.25); }

        /* ── Print Styles ─────────────────────────────────────────── */
        @media print {
          /* Hide everything on the page */
          body > *,
          #doc-builder-wrapper > * {
            display: none !important;
          }

          /* Show only the canvas stage area */
          #doc-builder-wrapper .db-print-area {
            display: block !important;
          }

          /* Each page prints clean: white background, no shadow, no margin */
          .db-print-area .db-page {
            display: block !important;
            position: relative !important;
            left: auto !important;
            top: auto !important;
            transform: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            page-break-after: always;
            break-after: page;
            width: 100% !important;
            height: auto !important;
            min-height: 100vh;
          }

          /* Ensure text elements are visible */
          .db-print-area .db-page * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          @page {
            margin: 0;
            size: auto;
          }
        }
      `}</style>

      {/* Top Toolbar */}
      <TopToolbar
        document={doc}
        onDocumentChange={handleDocumentChange}
        onSave={handleSave}
        onPublish={handlePublish}
        onPreview={() => setIsPreviewOpen(true)}
        onPrint={handlePrint}
        onDownloadPdf={handleDownloadPdf}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        zoom={zoom}
        onZoomChange={setZoom}
        currentPage={currentPage}
        totalPages={doc.pages.length}
        onPageChange={setCurrentPage}
        saveStatus={saveStatus}
        previewMode={previewMode}
        onPreviewModeChange={setPreviewMode}
      />

      {/* ── Report Card Mode Banner ──────────────────────────────────────────
          Shown when opened from the Report Card Generator. Tells the principal
          that all academic data is auto-filled and calculated fields are locked. */}
      {/* ── Report Card Mode Banner ──────────────────────────────────────────
          Shown when opened from the Report Card Generator. Tells the principal
          that all academic data is auto-filled and calculated fields are locked. */}
      {isReportCardMode && (
        <div style={{
          background: "linear-gradient(90deg, #312e81 0%, #4338ca 100%)",
          color: "white",
          padding: "10px 20px",
          fontSize: 13,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0,
        }}>
          <Sparkles style={{ width: 16, height: 16, opacity: 0.9 }} />
          <span style={{ flex: 1 }}>
            <strong>Report Card Mode</strong> — All student &amp; exam data has been auto-filled from the Exam Module.
            You can edit design elements (fonts, colors, layout) but calculated marks and grades are locked.
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: 0.75, fontSize: 11 }}>
            <Lock style={{ width: 12, height: 12 }} /> Data locked
          </div>
        </div>
      )}

      {/* ── Dynamic ERP Linkage Banner ────────────────────────────────────── */}
      {!isReportCardMode && (
        doc.recordId ? (
          /* Linked State Banner */
          <div style={{
            background: "linear-gradient(90deg, #1e1b4b 0%, #312e81 100%)",
            color: "white",
            padding: "10px 24px",
            fontSize: 13,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", background: "rgba(16,185,129,0.2)", border: "1px solid #10b981", color: "#10b981" }}>
                <CheckCircle2 size={13} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.1)", padding: "2px 8px", borderRadius: 4, fontSize: 10, border: "1px solid rgba(16,185,129,0.2)" }}>
                  LINKED TO ERP
                </span>
                <span style={{ fontWeight: 800, color: "#f8fafc" }}>
                  {doc.recordName}
                </span>
                {doc.recordType === "student" && (
                  <>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>|</span>
                    <span style={{ color: "#cbd5e1" }}>Class: <strong>{doc.resolvedVariables?.['student.class'] || doc.resolvedVariables?.['class'] || "—"}</strong></span>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>|</span>
                    <span style={{ color: "#cbd5e1" }}>Adm No: <strong>{doc.resolvedVariables?.['student.admission_number'] || doc.resolvedVariables?.['student.admission_no'] || "—"}</strong></span>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>|</span>
                    <span style={{ color: "#cbd5e1" }}>Acad Year: <strong>{doc.resolvedVariables?.['student.academic_year'] || "—"}</strong></span>
                  </>
                )}
                {doc.recordType === "teacher" && (
                  <>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>|</span>
                    <span style={{ color: "#cbd5e1" }}>Emp ID: <strong>{doc.resolvedVariables?.['teacher.employee_id'] || "—"}</strong></span>
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>|</span>
                    <span style={{ color: "#cbd5e1" }}>Dept: <strong>{doc.resolvedVariables?.['teacher.department'] || "—"}</strong></span>
                  </>
                )}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => window.open(`/${doc.recordType}s/${doc.recordId}`, "_blank")}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "#cbd5e1",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.2s"
                }}
              >
                <ExternalLink size={11} />
                View Details
              </button>
              <button
                onClick={() => setIsLinkModalOpen(true)}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "#cbd5e1",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.2s"
                }}
              >
                <RefreshCw size={11} />
                Change Record
              </button>
              <button
                onClick={handleRefreshData}
                style={{
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.2s"
                }}
              >
                <RefreshCw size={11} />
                Refresh Data
              </button>
            </div>
          </div>
        ) : (
          /* Unlinked State Banner */
          <div style={{
            background: "linear-gradient(90deg, #78350f 0%, #92400e 100%)",
            color: "white",
            padding: "10px 24px",
            fontSize: 13,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <AlertCircle size={16} style={{ color: "#fcd34d" }} />
              <span style={{ fontWeight: 600 }}>No Record Attached (Blank Canvas Mode)</span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>|</span>
              <span style={{ color: "#fde68a", fontSize: 11.5 }}>Placeholders are currently editable manually. Attach an ERP record to resolve fields dynamically.</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setIsLinkModalOpen(true)}
                style={{
                  background: "#f59e0b",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  padding: "4px 14px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.2s"
                }}
              >
                <Database size={11} />
                Attach Record
              </button>
            </div>
          </div>
        )
      )}

      {/* Main area: Left Toolbar + Canvas */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <LeftToolbar onInsert={handleInsert} />

        <Canvas
          document={doc}
          onDocumentChange={handleDocumentChange}
          zoom={zoom}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          selectedElementIds={selectedElementIds}
          onSelectElements={setSelectedElementIds}
          pushHistory={pushHistory}
          previewMode={previewMode}
        />
      </div>

      {/* Preview modal */}
      {isPreviewOpen && (
        <PreviewModal document={doc} onClose={() => setIsPreviewOpen(false)} />
      )}

      {/* ── ERP Record Linkage Search Modal ───────────────────────────────── */}
      {isLinkModalOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9000,
          background: "rgba(15, 35, 54, 0.7)",
          backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24,
        }}>
          <div style={{
            background: "white",
            borderRadius: 16,
            boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
            width: "100%",
            maxWidth: 480,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}>
            {/* Modal Header */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1E3A5F", margin: 0 }}>
                  {doc.recordId ? "Change Linked Record" : "Link ERP Record"}
                </h3>
                <p style={{ fontSize: 11, color: "#94A3B8", margin: "2px 0 0" }}>
                  Search for and connect a {erpModule} record to this document
                </p>
              </div>
              <button
                onClick={() => { setIsLinkModalOpen(false); setLinkSearch(""); setLinkResults([]); }}
                className="w-8 h-8 rounded-lg border border-[#E2E8F0] bg-white cursor-pointer flex items-center justify-center text-[#475569] hover:bg-slate-50 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: 24 }} className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder={`Search ${erpModule}s to link…`}
                  value={linkSearch}
                  onChange={e => setLinkSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-4 py-2 border border-[#E2E8F0] rounded-lg text-[13px] outline-none focus:border-indigo-500 bg-white text-slate-800"
                />
                {linkLoading && <Loader2 className="w-4 h-4 animate-spin text-indigo-600 absolute right-3 top-3" />}
              </div>

              {linkResults.length > 0 && (
                <div style={{ border: "1px solid #E2E8F0" }} className="rounded-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {linkResults.map(r => (
                    <button
                      key={r._id}
                      onClick={() => handleLinkRecord(r)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left border-none bg-transparent cursor-pointer transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-indigo-600">{(r.name || "?")[0].toUpperCase()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-slate-900 truncate">{r.name}</p>
                        {r.admission_no && <p className="text-[10.5px] text-slate-500">Adm No: {r.admission_no}</p>}
                        {r.employee_id && <p className="text-[10.5px] text-slate-500">Emp ID: {r.employee_id}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {linkSearch && !linkLoading && linkResults.length === 0 && (
                <p className="text-[12px] text-slate-400 text-center py-6 bg-slate-50 rounded-lg">
                  No {erpModule} records found for "{linkSearch}"
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "12px 24px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "flex-end", background: "#F8FAFC" }}>
              <button
                onClick={() => { setIsLinkModalOpen(false); setLinkSearch(""); setLinkResults([]); }}
                className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white cursor-pointer text-[12px] font-bold text-[#475569] hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hidden print-only area ──────────────────────────────────────────
          This section is invisible on screen (display:none) but the @media print
          rules above flip it to display:block and hide all other children.
          It renders every page at its true pixel dimensions with no zoom/scroll. */}
      <div className="db-print-area" style={{ display: "none" }}>
        {(() => {
          const dims = PAGE_DIMENSIONS[doc.pageSize][doc.orientation];
          return doc.pages.map((pg, pgIdx) => (
            <div
              key={pg.id}
              className="db-page"
              style={{
                width: dims.width,
                height: dims.height,
                background: "white",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {pg.elements.map((el) => {
                const ts = el.textStyle;
                const is = el.imageStyle;
                return (
                  <div
                    key={el.id}
                    style={{
                      position: "absolute",
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height,
                      zIndex: el.zIndex,
                      transform: is?.rotation ? `rotate(${is.rotation}deg)` : undefined,
                      fontFamily: ts?.fontFamily,
                      fontSize: ts?.fontSize,
                      fontWeight: ts?.fontWeight,
                      fontStyle: ts?.fontStyle,
                      textDecoration: ts?.textDecoration,
                      textAlign: ts?.textAlign as any,
                      color: ts?.color,
                      backgroundColor: ts?.backgroundColor === "transparent" ? undefined : ts?.backgroundColor,
                      letterSpacing: ts?.letterSpacing,
                      lineHeight: ts?.lineHeight,
                      padding: ts ? `${ts.paddingTop}px ${ts.paddingRight}px ${ts.paddingBottom}px ${ts.paddingLeft}px` : undefined,
                      borderRadius: ts?.borderRadius,
                      border: ts?.borderWidth ? `${ts.borderWidth}px solid ${ts.borderColor}` : undefined,
                      boxSizing: "border-box",
                      overflow: "hidden",
                      wordBreak: "break-word",
                      whiteSpace: "pre-wrap",
                    }}
                    dangerouslySetInnerHTML={el.content ? { __html: el.content } : undefined}
                  />
                );
              })}
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
