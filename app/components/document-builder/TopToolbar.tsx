"use client";

import React, { useState, useRef } from "react";
import {
  Undo2, Redo2, Save, Eye, EyeOff, Printer, Download, Globe,
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Check, Loader2,
  ArrowLeft, FileText, Variable, Bold, Italic, Underline,
  Eraser, Sigma, Image, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, List, ListOrdered, Share2, ChevronDown,
  Minus, Plus, Table2
} from "lucide-react";
import type { DocumentMeta, DocumentStatus } from "./types";
import Link from "next/link";

interface TopToolbarProps {
  document: DocumentMeta;
  onDocumentChange: (updates: Partial<DocumentMeta>) => void;
  onSave: () => void;
  onPublish: () => void;
  onPreview: () => void;
  onPrint: () => void;
  onDownloadPdf: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  saveStatus: "idle" | "saving" | "saved";
  previewMode?: boolean;
  onPreviewModeChange?: (active: boolean) => void;
}

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

const FONTS = [
  { label: "Clarika", value: "Clarika, 'DM Sans', sans-serif" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Roboto", value: "Roboto, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
];

const STATUS_COLORS: Record<DocumentStatus, { bg: string; text: string; label: string }> = {
  draft:     { bg: "#FFF7ED", text: "#92400E", label: "Draft" },
  published: { bg: "#F0FDF4", text: "#14532D", label: "Published" },
  archived:  { bg: "#F8FAFC", text: "#475569", label: "Archived" },
};

// ── Table grid selector (hover) ───────────────────────────────────────────────
function TableGridSelector({ onSelect }: { onSelect: (rows: number, cols: number) => void }) {
  const [hovered, setHovered] = useState<[number, number]>([0, 0]);
  const ROWS = 6, COLS = 6;

  return (
    <div
      onMouseLeave={() => setHovered([0, 0])}
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        left: "50%",
        transform: "translateX(-50%)",
        background: "white",
        border: "1px solid #E8EDF4",
        borderRadius: 12,
        padding: 12,
        boxShadow: "0 12px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
        zIndex: 20000,
        minWidth: 160,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", marginBottom: 8, textAlign: "center", letterSpacing: 0.5, textTransform: "uppercase" }}>
        {hovered[0] > 0 && hovered[1] > 0 ? `${hovered[0]} × ${hovered[1]} Table` : "Insert Table"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)`, gap: 3 }}>
        {Array.from({ length: ROWS }).map((_, r) =>
          Array.from({ length: COLS }).map((_, c) => {
            const active = r < hovered[0] && c < hovered[1];
            return (
              <div
                key={`${r}-${c}`}
                onMouseEnter={() => setHovered([r + 1, c + 1])}
                onClick={() => onSelect(r + 1, c + 1)}
                style={{
                  width: 18, height: 18, borderRadius: 3,
                  border: `1.5px solid ${active ? "#7C3AED" : "#E2E8F0"}`,
                  background: active ? "rgba(124,58,237,0.12)" : "#F8FAFC",
                  cursor: "pointer", transition: "all 0.08s",
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Font dropdown ─────────────────────────────────────────────────────────────
function FontDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const current = FONTS.find(f => f.value === value) || FONTS[0];

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "4px 8px", borderRadius: 7, border: "1px solid #E2E8F0",
          background: "white", cursor: "pointer", fontSize: 12, fontWeight: 600,
          color: "#374151", minWidth: 90, justifyContent: "space-between",
          transition: "border-color 0.15s",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 70 }}>
          {current.label}
        </span>
        <ChevronDown size={11} style={{ opacity: 0.5, flexShrink: 0 }} />
      </button>
      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9998 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0,
            background: "white", border: "1px solid #E2E8F0", borderRadius: 10,
            boxShadow: "0 12px 32px rgba(0,0,0,0.12)", zIndex: 9999, minWidth: 160,
            overflow: "hidden",
          }}>
            {FONTS.map(f => (
              <button
                key={f.value}
                onClick={() => { onChange(f.value); setOpen(false); }}
                style={{
                  width: "100%", textAlign: "left", padding: "8px 14px",
                  background: value === f.value ? "#F5F3FF" : "transparent",
                  color: value === f.value ? "#7C3AED" : "#374151",
                  border: "none", cursor: "pointer", fontSize: 12.5,
                  fontFamily: f.value, fontWeight: value === f.value ? 700 : 500,
                  transition: "background 0.1s",
                  display: "block",
                }}
                onMouseEnter={e => { if (value !== f.value) (e.currentTarget as HTMLElement).style.background = "#F8FAFC"; }}
                onMouseLeave={e => { if (value !== f.value) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function TopToolbar({
  document: doc,
  onDocumentChange,
  onSave,
  onPublish,
  onPreview,
  onPrint,
  onDownloadPdf,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  zoom,
  onZoomChange,
  currentPage,
  totalPages,
  onPageChange,
  saveStatus,
  previewMode = false,
  onPreviewModeChange,
}: TopToolbarProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(doc.title);
  const [showTableGrid, setShowTableGrid] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const [showListMenu, setShowListMenu] = useState(false);
  const [fontSize, setFontSize] = useState(12);
  const [fontFamily, setFontFamily] = useState(FONTS[0].value);
  const tableGridRef = useRef<HTMLDivElement>(null);

  const statusStyle = STATUS_COLORS[doc.status];

  // ── Exec formatting commands ────────────────────────────────────────────────
  const exec = (cmd: string, val?: string) => {
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(cmd, false, val);
  };

  const handleFontSizeStep = (delta: number) => {
    const next = Math.max(6, Math.min(144, fontSize + delta));
    setFontSize(next);
    exec("fontSize", "7"); // hack: size 7 = 48px, we override immediately
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      // Wrap with span for precise px size
      const range = sel.getRangeAt(0);
      const span = window.document.createElement("span");
      span.style.fontSize = `${next}px`;
      try { range.surroundContents(span); } catch {}
    }
  };

  const handleInsertTable = (rows: number, cols: number) => {
    setShowTableGrid(false);
    // Dispatch custom event that Canvas.tsx can listen to for table insertion
    window.dispatchEvent(new CustomEvent("db:insert-table", { detail: { rows, cols } }));
  };

  const handleClearFormatting = () => {
    exec("removeFormat");
  };

  // ── Divider ─────────────────────────────────────────────────────────────────
  const Divider = () => (
    <div style={{ width: 1, height: 20, background: "#E5E7EB", margin: "0 3px", flexShrink: 0 }} />
  );

  // ── Icon button style ────────────────────────────────────────────────────────
  const iconBtn = (active = false, danger = false): React.CSSProperties => ({
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 28, height: 28, border: "none", borderRadius: 6,
    cursor: "pointer", fontSize: 12, fontWeight: 600,
    background: active ? "#EDE9FE" : "transparent",
    color: active ? "#7C3AED" : danger ? "#EF4444" : "#4B5563",
    transition: "all 0.12s", flexShrink: 0,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", background: "#FAFBFC", borderBottom: "1px solid #E8EDF4", flexShrink: 0 }}>

      {/* ── Top header row ──────────────────────────────────────────────────── */}
      <div style={{
        height: 48, background: "#0F2336",
        display: "flex", alignItems: "center",
        paddingLeft: 12, paddingRight: 16, gap: 6, zIndex: 30,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        {/* Back */}
        <Link
          href="/documents"
          style={{
            display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7,
            color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 600, textDecoration: "none",
            transition: "color 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "white")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
        >
          <ArrowLeft size={14} /> <span>Documents</span>
        </Link>

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />

        {/* Document title */}
        {editingTitle ? (
          <input
            autoFocus
            value={titleVal}
            onChange={e => setTitleVal(e.target.value)}
            onBlur={() => { onDocumentChange({ title: titleVal }); setEditingTitle(false); }}
            onKeyDown={e => {
              if (e.key === "Enter") { onDocumentChange({ title: titleVal }); setEditingTitle(false); }
              if (e.key === "Escape") { setTitleVal(doc.title); setEditingTitle(false); }
            }}
            style={{
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 6, padding: "4px 10px", color: "white", fontSize: 13, fontWeight: 700,
              outline: "none", width: 220,
            }}
          />
        ) : (
          <button
            onClick={() => { setTitleVal(doc.title); setEditingTitle(true); }}
            style={{
              background: "none", border: "none", color: "white", fontSize: 13, fontWeight: 700,
              cursor: "pointer", padding: "4px 8px", borderRadius: 6,
              display: "flex", alignItems: "center", gap: 5, maxWidth: 240,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
            title="Click to rename"
          >
            <FileText size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{doc.title}</span>
          </button>
        )}

        {/* Status badge */}
        <div style={{ background: statusStyle.bg, color: statusStyle.text, borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
          {statusStyle.label}
        </div>

        <div style={{ flex: 1 }} />

        {/* Undo / Redo */}
        <button disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl+Z)"
          style={{ ...iconBtn(), color: canUndo ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)", background: "transparent" }}
          onMouseEnter={e => canUndo && ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
        >
          <Undo2 size={15} />
        </button>
        <button disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl+Y)"
          style={{ ...iconBtn(), color: canRedo ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)", background: "transparent" }}
          onMouseEnter={e => canRedo && ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
        >
          <Redo2 size={15} />
        </button>

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />

        {/* Auto save indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 600, minWidth: 64 }}>
          {saveStatus === "saving" && <><Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /><span>Saving…</span></>}
          {saveStatus === "saved" && <><Check size={11} style={{ color: "#4ADE80" }} /><span style={{ color: "#4ADE80" }}>Saved</span></>}
        </div>

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />

        {/* Page navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <button disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}
            style={{ ...iconBtn(), color: currentPage > 1 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)", background: "transparent" }}
            onMouseEnter={e => currentPage > 1 && ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: 600, whiteSpace: "nowrap" }}>
            {currentPage} / {totalPages}
          </span>
          <button disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}
            style={{ ...iconBtn(), color: currentPage < totalPages ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)", background: "transparent" }}
            onMouseEnter={e => currentPage < totalPages && ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />

        {/* Zoom */}
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <button disabled={zoom <= 0.25} onClick={() => { const idx = ZOOM_LEVELS.indexOf(zoom); if (idx > 0) onZoomChange(ZOOM_LEVELS[idx - 1]); }}
            style={{ ...iconBtn(), color: zoom > 0.25 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)", background: "transparent" }}
            onMouseEnter={e => zoom > 0.25 && ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            <ZoomOut size={14} />
          </button>
          <select value={zoom} onChange={e => onZoomChange(Number(e.target.value))} style={{
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 5, color: "white", fontSize: 11, fontWeight: 700, padding: "3px 5px",
            cursor: "pointer", outline: "none", width: 58,
          }}>
            {ZOOM_LEVELS.map(z => <option key={z} value={z} style={{ background: "#0F2336", color: "white" }}>{Math.round(z * 100)}%</option>)}
          </select>
          <button disabled={zoom >= 2} onClick={() => { const idx = ZOOM_LEVELS.indexOf(zoom); if (idx < ZOOM_LEVELS.length - 1) onZoomChange(ZOOM_LEVELS[idx + 1]); }}
            style={{ ...iconBtn(), color: zoom < 2 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)", background: "transparent" }}
            onMouseEnter={e => zoom < 2 && ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            <ZoomIn size={14} />
          </button>
        </div>

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />

        {/* Preview / Print / PDF / Save / Publish */}
        <button onClick={onPreview} title="Preview"
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.8)", transition: "all 0.15s" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.14)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)")}
        >
          <Eye size={14} /> <span>Preview</span>
        </button>

        <button onClick={onPrint} title="Print"
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: "transparent", color: "rgba(255,255,255,0.7)", transition: "all 0.15s" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
        >
          <Printer size={14} /> <span>Print</span>
        </button>

        <button onClick={onDownloadPdf} title="Download PDF"
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: "transparent", color: "rgba(255,255,255,0.7)", transition: "all 0.15s" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
        >
          <Download size={14} /> <span>PDF</span>
        </button>

        <button onClick={onSave}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.8)", transition: "all 0.15s" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)")}
        >
          <Save size={14} /> <span>Save</span>
        </button>

        {/* Share / Publish */}
        <button onClick={onPublish}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
            borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700,
            background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
            color: "white", boxShadow: "0 2px 8px rgba(124,58,237,0.35)", transition: "opacity 0.15s",
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = "0.88")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = "1")}
        >
          <Share2 size={13} /> <span>Share</span>
        </button>
      </div>

      {/* ── Turbo AI style formatting bar ─────────────────────────────────── */}
      <div style={{
        height: 46, background: "white",
        borderBottom: "1px solid #E8EDF4",
        display: "flex", alignItems: "center",
        paddingLeft: 14, paddingRight: 14, gap: 4,
        overflowX: "auto", flexShrink: 0, zIndex: 20,
      }}>
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .tb-btn:hover { background: #F3F4F6 !important; color: #111827 !important; }
          .tb-btn:active { transform: scale(0.95); }
        `}</style>

        {/* Font family */}
        <FontDropdown value={fontFamily} onChange={v => { setFontFamily(v); exec("fontName", v); }} />

        <Divider />

        {/* Font size stepper */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, background: "#F8FAFC", borderRadius: 7, border: "1px solid #E2E8F0", overflow: "hidden" }}>
          <button
            className="tb-btn"
            onClick={() => handleFontSizeStep(-1)}
            style={{ ...iconBtn(), background: "transparent", width: 24, height: 26, borderRadius: 0 }}
            title="Decrease font size"
          >
            <Minus size={10} />
          </button>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", minWidth: 24, textAlign: "center", userSelect: "none", padding: "0 2px" }}>
            {fontSize}
          </span>
          <button
            className="tb-btn"
            onClick={() => handleFontSizeStep(1)}
            style={{ ...iconBtn(), background: "transparent", width: 24, height: 26, borderRadius: 0 }}
            title="Increase font size"
          >
            <Plus size={10} />
          </button>
        </div>

        <Divider />

        {/* Bold */}
        <button className="tb-btn" onClick={() => exec("bold")} title="Bold (Ctrl+B)" style={iconBtn()}>
          <Bold size={14} />
        </button>
        {/* Italic */}
        <button className="tb-btn" onClick={() => exec("italic")} title="Italic (Ctrl+I)" style={iconBtn()}>
          <Italic size={14} />
        </button>
        {/* Underline */}
        <button className="tb-btn" onClick={() => exec("underline")} title="Underline (Ctrl+U)" style={iconBtn()}>
          <Underline size={14} />
        </button>

        <Divider />

        {/* Text Color */}
        <label style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer", padding: "4px 6px", borderRadius: 6, transition: "background 0.12s" }} title="Text Color"
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#F3F4F6")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
        >
          <div style={{ position: "relative" }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#374151", fontFamily: "serif", lineHeight: 1 }}>A</span>
            <div style={{ height: 2.5, background: "#7C3AED", borderRadius: 1, marginTop: 1 }} />
          </div>
          <input type="color" defaultValue="#000000"
            onChange={e => exec("foreColor", e.target.value)}
            style={{ width: 0, height: 0, opacity: 0, position: "absolute" }}
          />
        </label>

        {/* Highlight Color */}
        <label style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer", padding: "4px 6px", borderRadius: 6, transition: "background 0.12s" }} title="Highlight Color"
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#F3F4F6")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
        >
          <div style={{
            width: 16, height: 16, borderRadius: 3, border: "1.5px solid #D1D5DB",
            background: "linear-gradient(135deg, #FDE047, #A78BFA)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "transparent",
          }}>
          </div>
          <input type="color" defaultValue="#fde047"
            onChange={e => exec("hiliteColor", e.target.value)}
            style={{ width: 0, height: 0, opacity: 0, position: "absolute" }}
          />
        </label>

        {/* Clear formatting */}
        <button className="tb-btn" onClick={handleClearFormatting} title="Clear Formatting" style={iconBtn()}>
          <Eraser size={14} />
        </button>

        {/* Math / Sigma — decorative placeholder (future formula support) */}
        <button className="tb-btn" onClick={() => {}} title="Insert Formula (Σ)" style={iconBtn()}>
          <Sigma size={14} />
        </button>

        <Divider />

        {/* Image insert */}
        <button
          className="tb-btn"
          onClick={() => { const input = window.document.createElement("input"); input.type = "file"; input.accept = "image/*"; input.onchange = (ev: any) => { const file = ev.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { window.dispatchEvent(new CustomEvent("db:insert-image", { detail: { src: e.target?.result } })); }; reader.readAsDataURL(file); }; input.click(); }}
          title="Insert Image"
          style={iconBtn()}
        >
          <Image size={14} />
        </button>

        {/* Table grid selector */}
        <div style={{ position: "relative" }} ref={tableGridRef}>
          <button
            className="tb-btn"
            onClick={() => setShowTableGrid(p => !p)}
            title="Insert Table"
            style={{ ...iconBtn(showTableGrid), display: "flex", alignItems: "center", gap: 3, padding: "0 6px", width: "auto" }}
          >
            <Table2 size={14} />
            <ChevronDown size={10} style={{ opacity: 0.6 }} />
          </button>
          {showTableGrid && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 19999 }} onClick={() => setShowTableGrid(false)} />
              <TableGridSelector onSelect={handleInsertTable} />
            </>
          )}
        </div>

        <Divider />

        {/* Text Alignment */}
        <div style={{ position: "relative" }}>
          <button
            className="tb-btn"
            onClick={() => setShowAlignMenu(p => !p)}
            title="Text Alignment"
            style={{ ...iconBtn(showAlignMenu), display: "flex", alignItems: "center", gap: 3, padding: "0 6px", width: "auto" }}
          >
            <AlignLeft size={14} />
            <ChevronDown size={10} style={{ opacity: 0.6 }} />
          </button>
          {showAlignMenu && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setShowAlignMenu(false)} />
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
                background: "white", border: "1px solid #E8EDF4", borderRadius: 10,
                boxShadow: "0 10px 28px rgba(0,0,0,0.1)", zIndex: 9999, padding: 6, display: "flex", gap: 4,
              }}>
                {[
                  { icon: <AlignLeft size={14} />, cmd: "justifyLeft", title: "Align Left" },
                  { icon: <AlignCenter size={14} />, cmd: "justifyCenter", title: "Align Center" },
                  { icon: <AlignRight size={14} />, cmd: "justifyRight", title: "Align Right" },
                  { icon: <AlignJustify size={14} />, cmd: "justifyFull", title: "Justify" },
                ].map(({ icon, cmd, title: t }) => (
                  <button key={cmd} className="tb-btn" onClick={() => { exec(cmd); setShowAlignMenu(false); }} title={t} style={iconBtn()}>
                    {icon}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Lists */}
        <div style={{ position: "relative" }}>
          <button
            className="tb-btn"
            onClick={() => setShowListMenu(p => !p)}
            title="Lists & Spacing"
            style={{ ...iconBtn(showListMenu), display: "flex", alignItems: "center", gap: 3, padding: "0 6px", width: "auto" }}
          >
            <List size={14} />
            <ChevronDown size={10} style={{ opacity: 0.6 }} />
          </button>
          {showListMenu && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setShowListMenu(false)} />
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
                background: "white", border: "1px solid #E8EDF4", borderRadius: 10,
                boxShadow: "0 10px 28px rgba(0,0,0,0.1)", zIndex: 9999, padding: 6, display: "flex", gap: 4,
              }}>
                <button className="tb-btn" onClick={() => { exec("insertUnorderedList"); setShowListMenu(false); }} title="Bullet List" style={iconBtn()}>
                  <List size={14} />
                </button>
                <button className="tb-btn" onClick={() => { exec("insertOrderedList"); setShowListMenu(false); }} title="Numbered List" style={iconBtn()}>
                  <ListOrdered size={14} />
                </button>
              </div>
            </>
          )}
        </div>

        <Divider />

        {/* Variable Preview Mode */}
        {onPreviewModeChange && (
          <button
            className="tb-btn"
            onClick={() => onPreviewModeChange(!previewMode)}
            title={previewMode ? "Exit Preview Mode" : "Preview Variables"}
            style={{
              ...iconBtn(previewMode),
              display: "flex", alignItems: "center", gap: 5, padding: "0 8px", width: "auto",
              border: previewMode ? "1px solid #DDD6FE" : "none",
            }}
          >
            {previewMode ? <EyeOff size={14} /> : <Eye size={14} />}
            <span style={{ fontSize: 11, fontWeight: 600 }}>{previewMode ? "Exit Preview" : "Var Preview"}</span>
          </button>
        )}

        {/* Upgrade pill */}
        <div style={{ flex: 1 }} />
        <button
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "5px 14px",
            borderRadius: 20, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 700,
            background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
            color: "white", boxShadow: "0 2px 8px rgba(124,58,237,0.30)", flexShrink: 0,
            transition: "opacity 0.15s",
          }}
          onClick={onPublish}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = "0.88")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = "1")}
        >
          Upgrade to Premium
        </button>
      </div>
    </div>
  );
}
