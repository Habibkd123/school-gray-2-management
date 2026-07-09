"use client";

import React from "react";
import {
  Undo2, Redo2, Save, Eye, EyeOff, Printer, Download, Globe,
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Check, Loader2,
  ArrowLeft, FileText, Variable
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
  /** Variable preview mode — replaces {{key}} badges with sample values */
  previewMode?: boolean;
  onPreviewModeChange?: (active: boolean) => void;
}

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

const STATUS_COLORS: Record<DocumentStatus, { bg: string; text: string; label: string }> = {
  draft:     { bg: "#FFF7ED", text: "#92400E", label: "Draft" },
  published: { bg: "#F0FDF4", text: "#14532D", label: "Published" },
  archived:  { bg: "#F8FAFC", text: "#475569", label: "Archived" },
};

export function TopToolbar({
  document,
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
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [titleVal, setTitleVal] = React.useState(document.title);

  const statusStyle = STATUS_COLORS[document.status];

  const btnStyle = (disabled = false): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    padding: "6px 10px",
    borderRadius: 7,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 12,
    fontWeight: 600,
    transition: "all 0.15s",
    background: "transparent",
    color: disabled ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.75)",
    opacity: disabled ? 0.5 : 1,
  });

  const iconBtn = (disabled = false): React.CSSProperties => ({
    ...btnStyle(disabled),
    width: 32,
    height: 32,
    padding: 0,
  });

  return (
    <div
      style={{
        height: 52,
        background: "#0F2336",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        paddingLeft: 12,
        paddingRight: 12,
        gap: 4,
        flexShrink: 0,
        zIndex: 30,
      }}
    >
      {/* Back button */}
      <Link
        href="/documents"
        style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 7, color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, textDecoration: "none", transition: "color 0.15s" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
      >
        <ArrowLeft size={14} />
        <span>Documents</span>
      </Link>

      {/* Vertical divider */}
      <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.12)", margin: "0 6px" }} />

      {/* Document title */}
      {editingTitle ? (
        <input
          autoFocus
          value={titleVal}
          onChange={(e) => setTitleVal(e.target.value)}
          onBlur={() => { onDocumentChange({ title: titleVal }); setEditingTitle(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") { onDocumentChange({ title: titleVal }); setEditingTitle(false); } if (e.key === "Escape") { setTitleVal(document.title); setEditingTitle(false); } }}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 6,
            padding: "4px 10px",
            color: "white",
            fontSize: 13,
            fontWeight: 700,
            outline: "none",
            width: 200,
          }}
        />
      ) : (
        <button
          onClick={() => { setTitleVal(document.title); setEditingTitle(true); }}
          style={{
            background: "none",
            border: "none",
            color: "white",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            gap: 5,
            maxWidth: 200,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          title="Click to rename"
        >
          <FileText size={13} style={{ opacity: 0.6, flexShrink: 0 }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{document.title}</span>
        </button>
      )}

      {/* Status badge */}
      <div style={{ background: statusStyle.bg, color: statusStyle.text, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
        {statusStyle.label}
      </div>

      <div style={{ flex: 1 }} />

      {/* Undo / Redo */}
      <button
        style={iconBtn(!canUndo)}
        disabled={!canUndo}
        onClick={onUndo}
        title="Undo (Ctrl+Z)"
        onMouseEnter={(e) => canUndo && (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <Undo2 size={16} />
      </button>
      <button
        style={iconBtn(!canRedo)}
        disabled={!canRedo}
        onClick={onRedo}
        title="Redo (Ctrl+Y)"
        onMouseEnter={(e) => canRedo && (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <Redo2 size={16} />
      </button>

      <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.12)", margin: "0 4px" }} />

      {/* Auto save indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, minWidth: 70 }}>
        {saveStatus === "saving" && <><Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /><span>Saving…</span></>}
        {saveStatus === "saved" && <><Check size={12} style={{ color: "#4ADE80" }} /><span style={{ color: "#4ADE80" }}>Saved</span></>}
      </div>

      <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.12)", margin: "0 4px" }} />

      {/* Page navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          style={iconBtn(currentPage <= 1)}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          onMouseEnter={(e) => currentPage > 1 && (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 600, whiteSpace: "nowrap" }}>
          {currentPage} / {totalPages}
        </span>
        <button
          style={iconBtn(currentPage >= totalPages)}
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          onMouseEnter={(e) => currentPage < totalPages && (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.12)", margin: "0 4px" }} />

      {/* Zoom */}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <button
          style={iconBtn(zoom <= 0.25)}
          disabled={zoom <= 0.25}
          onClick={() => { const idx = ZOOM_LEVELS.indexOf(zoom); if (idx > 0) onZoomChange(ZOOM_LEVELS[idx - 1]); }}
          onMouseEnter={(e) => zoom > 0.25 && (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <ZoomOut size={14} />
        </button>
        <select
          value={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 6,
            color: "white",
            fontSize: 11,
            fontWeight: 700,
            padding: "4px 6px",
            cursor: "pointer",
            outline: "none",
            width: 64,
          }}
        >
          {ZOOM_LEVELS.map((z) => (
            <option key={z} value={z} style={{ background: "#0F2336", color: "white" }}>{Math.round(z * 100)}%</option>
          ))}
        </select>
        <button
          style={iconBtn(zoom >= 2)}
          disabled={zoom >= 2}
          onClick={() => { const idx = ZOOM_LEVELS.indexOf(zoom); if (idx < ZOOM_LEVELS.length - 1) onZoomChange(ZOOM_LEVELS[idx + 1]); }}
          onMouseEnter={(e) => zoom < 2 && (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <ZoomIn size={14} />
        </button>
      </div>

      <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.12)", margin: "0 4px" }} />

      {/* Action buttons */}
      {/* Variable Preview Mode toggle */}
      {onPreviewModeChange && (
        <button
          style={{
            ...btnStyle(),
            background: previewMode ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.08)",
            color:      previewMode ? "#818CF8"               : "rgba(255,255,255,0.75)",
            border:     previewMode ? "1px solid rgba(99,102,241,0.5)" : "none",
          }}
          onClick={() => onPreviewModeChange(!previewMode)}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          title={previewMode ? "Exit Preview Mode" : "Preview Variables"}
        >
          <Variable size={14} />
          <span>{previewMode ? "Exit Preview" : "Var Preview"}</span>
        </button>
      )}

      <button
        style={{ ...btnStyle(), background: "rgba(255,255,255,0.08)" }}
        onClick={onPreview}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
        title="Preview"
      >
        <Eye size={14} />
        <span>Preview</span>
      </button>

      <button
        style={btnStyle()}
        onClick={onPrint}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        title="Print"
      >
        <Printer size={14} />
        <span>Print</span>
      </button>

      <button
        style={btnStyle()}
        onClick={onDownloadPdf}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        title="Download PDF"
      >
        <Download size={14} />
        <span>PDF</span>
      </button>

      <button
        style={{ ...btnStyle(), background: "rgba(255,255,255,0.08)" }}
        onClick={onSave}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
      >
        <Save size={14} />
        <span>Save</span>
      </button>

      <button
        style={{
          ...btnStyle(),
          background: "linear-gradient(135deg, #1E3A5F, #162C47)",
          color: "white",
          padding: "6px 14px",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
        onClick={onPublish}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        <Globe size={14} />
        <span>Publish</span>
      </button>
    </div>
  );
}
