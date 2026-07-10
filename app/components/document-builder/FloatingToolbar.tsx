"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Trash2, Copy, Type
} from "lucide-react";
import type { DocumentElement, TextStyle } from "./types";

// ── Font options ─────────────────────────────────────────────────────────────
const FONTS = [
  { label: "Roboto",       value: "Roboto, sans-serif" },
  { label: "Inter",        value: "Inter, sans-serif" },
  { label: "Georgia",      value: "Georgia, serif" },
  { label: "Playfair",     value: "'Playfair Display', serif" },
  { label: "Arial",        value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier New",  value: "'Courier New', monospace" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
];

const FONT_SIZES = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48, 60, 72];

// execCommand → px size map (for reading back)
const CMD_SIZE_TO_PX: Record<string, number> = {
  "1": 10, "2": 13, "3": 16, "4": 18, "5": 24, "6": 32, "7": 48,
};
function pxToCmdSize(px: number): string {
  const entries = Object.entries(CMD_SIZE_TO_PX);
  return entries.reduce((best, [k, v]) =>
    Math.abs(v - px) < Math.abs(CMD_SIZE_TO_PX[best] - px) ? k : best, "3");
}

// ── Shared button styles ─────────────────────────────────────────────────────
const BTN: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 28, height: 26, border: "none", borderRadius: 5,
  cursor: "pointer", background: "transparent", color: "#475569",
  flexShrink: 0, transition: "background 0.12s, color 0.12s, transform 0.1s",
  fontSize: 12, fontWeight: 600,
};
const BTN_ACTIVE: React.CSSProperties = { background: "#EFF6FF", color: "#2563EB" };
const DIVIDER = <div style={{ width: 1, height: 18, background: "rgba(0, 0, 0, 0.08)", margin: "0 4px", flexShrink: 0 }} />;

// ── Props ────────────────────────────────────────────────────────────────────
interface FloatingToolbarProps {
  element: DocumentElement;
  onUpdate: (id: string, updates: Partial<DocumentElement>) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  anchorRect: DOMRect | null;
  zoom: number;
}

export function FloatingToolbar({
  element,
  onUpdate,
  onDuplicate,
  onDelete,
  anchorRect,
  zoom,
}: FloatingToolbarProps) {
  const ts = element.textStyle || {} as TextStyle;
  const toolbarRef = useRef<HTMLDivElement>(null);

  // ── Active format state ──────────────────────────────────────────────────
  const [fmt, setFmt] = useState({
    bold: false, italic: false, underline: false, strikethrough: false,
    justify: "left", fontFamily: ts?.fontFamily || FONTS[0].value,
    fontSize: ts?.fontSize || 13, color: ts?.color || "#000000",
    highlight: "#ffffff",
  });
  const [hasTextSel, setHasTextSel] = useState(false);
  // Element-level opacity (0-100)
  const [elemOpacity, setElemOpacity] = useState(Math.round((element.imageStyle?.opacity ?? 1) * 100));

  // Track selection changes
  useEffect(() => {
    if (element.type === "table") return;
    const onSel = () => {
      const sel = window.getSelection();
      const hasSel = !!(sel && !sel.isCollapsed && sel.rangeCount > 0);
      setHasTextSel(hasSel);
      if (hasSel) {
        try {
          setFmt({
            bold: document.queryCommandState("bold"),
            italic: document.queryCommandState("italic"),
            underline: document.queryCommandState("underline"),
            strikethrough: document.queryCommandState("strikeThrough"),
            justify: document.queryCommandState("justifyCenter") ? "center"
              : document.queryCommandState("justifyRight") ? "right"
              : document.queryCommandState("justifyFull") ? "justify" : "left",
            fontFamily: document.queryCommandValue("fontName")?.replace(/['"]/g, "") || ts?.fontFamily || FONTS[0].value,
            fontSize: CMD_SIZE_TO_PX[document.queryCommandValue("fontSize")] || ts?.fontSize || 13,
            color: ts?.color || "#000000",
            highlight: "#ffffff",
          });
        } catch (_) { /* queryCommand can throw in some browsers */ }
      } else {
        // Reset to base element style when no selection
        setFmt((prev) => ({
          ...prev,
          bold: ts?.fontWeight === "bold",
          italic: ts?.fontStyle === "italic",
          underline: ts?.textDecoration === "underline",
          strikethrough: false,
          justify: ts?.textAlign as string || "left",
          fontFamily: ts?.fontFamily || FONTS[0].value,
          fontSize: ts?.fontSize || 13,
          color: ts?.color || "#000000",
        }));
      }
    };
    document.addEventListener("selectionchange", onSel);
    onSel();
    return () => document.removeEventListener("selectionchange", onSel);
  }, [ts]);

  // ── Command execution ────────────────────────────────────────────────────
  const exec = useCallback((cmd: string, val?: string) => {
    if (hasTextSel) {
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand(cmd, false, val);
    } else {
      // Apply to base element style
      const updates: Partial<TextStyle> = {};
      if (cmd === "bold")        updates.fontWeight = ts?.fontWeight === "bold" ? "normal" : "bold";
      if (cmd === "italic")      updates.fontStyle = ts?.fontStyle === "italic" ? "normal" : "italic";
      if (cmd === "underline")   updates.textDecoration = ts?.textDecoration === "underline" ? "none" : "underline";
      if (cmd === "strikeThrough") {
        // We store strikethrough as part of textDecoration
        updates.textDecoration = ts?.textDecoration === "line-through" ? "none" : "line-through";
      }
      if (cmd === "justifyLeft")   updates.textAlign = "left";
      if (cmd === "justifyCenter") updates.textAlign = "center";
      if (cmd === "justifyRight")  updates.textAlign = "right";
      if (cmd === "justifyFull")   updates.textAlign = "justify";
      if (cmd === "fontName")      updates.fontFamily = val;
      if (cmd === "foreColor")     updates.color = val;
      if (cmd === "hiliteColor")   updates.backgroundColor = val;
      if (cmd === "fontSize" && val) updates.fontSize = parseInt(val, 10);
      if (Object.keys(updates).length > 0) {
        onUpdate(element.id, { textStyle: { ...ts!, ...updates } });
      }
    }
  }, [hasTextSel, ts, element.id, onUpdate]);

  const setFontSize = (size: number) => {
    const clamped = Math.max(6, Math.min(144, size));
    if (hasTextSel) {
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("fontSize", false, pxToCmdSize(clamped));
    } else {
      onUpdate(element.id, { textStyle: { ...ts!, fontSize: clamped } });
    }
    setFmt((p) => ({ ...p, fontSize: clamped }));
  };

  const applyTextTransform = (transform: string) => {
    if (!hasTextSel) {
      // Apply to entire element via a wrapper style  
      const el = document.querySelector(`[data-element-id="${element.id}"] [contenteditable]`) as HTMLElement;
      if (el) {
        const text = el.innerText;
        let transformed = text;
        if (transform === "uppercase") transformed = text.toUpperCase();
        if (transform === "lowercase") transformed = text.toLowerCase();
        if (transform === "titlecase") transformed = text.replace(/\b\w/g, (c) => c.toUpperCase());
        el.innerHTML = transformed;
        onUpdate(element.id, { content: transformed });
      }
    } else {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const selectedText = range.toString();
      let transformed = selectedText;
      if (transform === "uppercase") transformed = selectedText.toUpperCase();
      if (transform === "lowercase") transformed = selectedText.toLowerCase();
      if (transform === "titlecase") transformed = selectedText.replace(/\b\w/g, (c) => c.toUpperCase());
      document.execCommand("insertText", false, transformed);
    }
  };

  const applyLineHeight = (lh: number) => {
    onUpdate(element.id, { textStyle: { ...ts!, lineHeight: lh } });
  };

  const applyLetterSpacing = (ls: number) => {
    onUpdate(element.id, { textStyle: { ...ts!, letterSpacing: ls } });
  };

  // ── Positioning ──────────────────────────────────────────────────────────
  if (!anchorRect) return null;

  const TOOLBAR_H = 38;
  const spaceAbove = anchorRect.top - 8;
  const topPos = spaceAbove >= TOOLBAR_H + 4
    ? anchorRect.top - TOOLBAR_H - 12
    : anchorRect.bottom + 12;

  const getWidth = () => {
    switch (element.type) {
      case "table": return 540;
      case "image":
      case "logo": return 260;
      case "shape": return 220;
      case "divider":
      case "horizontalLine":
      case "verticalLine": return 200;
      default: return 380;
    }
  };

  const toolbarWidth = getWidth();
  const leftPos = Math.max(8, Math.min(anchorRect.left + (anchorRect.width - toolbarWidth) / 2, window.innerWidth - toolbarWidth - 16));

  const containerStyle: React.CSSProperties = {
    position: "fixed",
    top: topPos,
    left: leftPos,
    zIndex: 10000,
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "rgba(255, 255, 255, 0.9)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderRadius: 14,
    padding: "6px 10px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 16px -6px rgba(0, 0, 0, 0.03), 0 0 1px 1px rgba(0, 0, 0, 0.05)",
    border: "1px solid rgba(0, 0, 0, 0.08)",
    flexWrap: "nowrap",
    maxWidth: 650,
    overflowX: "auto",
    animation: "ftbar-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
  };

  const animStyles = (
    <style>{`
      @keyframes ftbar-in {
        from { opacity: 0; transform: translateY(4px) scale(0.98); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      .ft-btn:hover {
        background-color: #F1F5F9 !important;
        color: #0F172A !important;
      }
      .ft-btn:active {
        transform: scale(0.96);
      }
    `}</style>
  );

  // ── Table: show minimal status only (row/col editing is via insertion handles) ──
  if (element.type === "table" && element.tableData) {
    const tData = element.tableData;
    return (
      <div ref={toolbarRef} onMouseDown={(e) => e.preventDefault()} style={{ ...containerStyle, maxWidth: 260 }}>
        {animStyles}
        <span style={{ fontSize: 10, fontWeight: 800, color: "#94A3B8", marginRight: 4, textTransform: "uppercase" }}>
          Table
        </span>
        <span style={{ fontSize: 10, color: "#64748B", marginRight: 4 }}>
          {tData.rows}×{tData.cols}
        </span>
        <span style={{ fontSize: 10, color: "#94A3B8", marginRight: 8, fontStyle: "italic" }}>
          Right-click cells to edit
        </span>
        {DIVIDER}
        <button className="ft-btn" style={BTN} onClick={() => onDuplicate(element.id)} title="Duplicate Table (Ctrl+D)"><Copy size={12} /></button>
        <button className="ft-btn" style={{ ...BTN, color: "#EF4444" }} onClick={() => onDelete(element.id)} title="Delete Table (Del)"><Trash2 size={12} /></button>
      </div>
    );
  }

  // ── Image / Logo Context ───────────────────────────────────────────────────
  if (element.type === "image" || element.type === "logo") {
    const isLogo = element.type === "logo";
    const objectFit = element.imageStyle?.objectFit || "contain";
    return (
      <div ref={toolbarRef} onMouseDown={(e) => e.preventDefault()} style={containerStyle}>
        {animStyles}
        <span style={{ fontSize: 10, fontWeight: 800, color: "#94A3B8", marginRight: 4, textTransform: "uppercase" }}>
          {isLogo ? "Logo" : "Image"}:
        </span>
        {[
          { mode: "contain" as const, label: "Fit" },
          { mode: "cover" as const, label: "Fill" },
          { mode: "fill" as const, label: "Stretch" }
        ].map(({ mode, label }) => {
          const isActive = objectFit === mode;
          return (
            <button
              key={mode}
              className="ft-btn"
              style={{ ...BTN, width: "auto", padding: "0 8px", fontSize: 11, ...(isActive ? BTN_ACTIVE : {}) }}
              onClick={() => onUpdate(element.id, { imageStyle: { ...element.imageStyle, objectFit: mode } as any })}
              title={`Set object-fit to ${mode}`}
            >
              {label}
            </button>
          );
        })}
        {DIVIDER}
        <button className="ft-btn" style={BTN} onClick={() => onDuplicate(element.id)} title="Duplicate Element (Ctrl+D)"><Copy size={13} /></button>
        <button className="ft-btn" style={{ ...BTN, color: "#EF4444" }} onClick={() => onDelete(element.id)} title="Delete Element (Del)"><Trash2 size={13} /></button>
      </div>
    );
  }

  // ── Shape Context ──────────────────────────────────────────────────────────
  if (element.type === "shape") {
    const fillColor = element.textStyle?.backgroundColor || "#1E3A5F";
    const strokeColor = element.textStyle?.borderColor || "#1E3A5F";
    return (
      <div ref={toolbarRef} onMouseDown={(e) => e.preventDefault()} style={containerStyle}>
        {animStyles}
        <span style={{ fontSize: 10, fontWeight: 800, color: "#94A3B8", marginRight: 4, textTransform: "uppercase" }}>
          Shape:
        </span>
        <label style={{ display: "flex", alignItems: "center", cursor: "pointer", flexShrink: 0, padding: "0 4px" }} title="Fill Color">
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#475569", marginRight: 3 }}>Fill</span>
          <input
            type="color"
            value={fillColor}
            onChange={(e) => onUpdate(element.id, { textStyle: { ...ts, backgroundColor: e.target.value } })}
            style={{ width: 16, height: 16, border: "none", borderRadius: 4, cursor: "pointer", background: "transparent", padding: 0 }}
          />
        </label>
        {DIVIDER}
        <label style={{ display: "flex", alignItems: "center", cursor: "pointer", flexShrink: 0, padding: "0 4px" }} title="Stroke Color">
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#475569", marginRight: 3 }}>Stroke</span>
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => onUpdate(element.id, { textStyle: { ...ts, borderColor: e.target.value } })}
            style={{ width: 16, height: 16, border: "none", borderRadius: 4, cursor: "pointer", background: "transparent", padding: 0 }}
          />
        </label>
        {DIVIDER}
        <button className="ft-btn" style={BTN} onClick={() => onDuplicate(element.id)} title="Duplicate Element (Ctrl+D)"><Copy size={13} /></button>
        <button className="ft-btn" style={{ ...BTN, color: "#EF4444" }} onClick={() => onDelete(element.id)} title="Delete Element (Del)"><Trash2 size={13} /></button>
      </div>
    );
  }

  // ── Divider / Lines Context ────────────────────────────────────────────────
  if (["divider", "horizontalLine", "verticalLine"].includes(element.type)) {
    const lineColor = element.textStyle?.backgroundColor || "#1E3A5F";
    return (
      <div ref={toolbarRef} onMouseDown={(e) => e.preventDefault()} style={containerStyle}>
        {animStyles}
        <span style={{ fontSize: 10, fontWeight: 800, color: "#94A3B8", marginRight: 4, textTransform: "uppercase" }}>
          Line:
        </span>
        <label style={{ display: "flex", alignItems: "center", cursor: "pointer", flexShrink: 0, padding: "0 4px" }} title="Line Color">
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#475569", marginRight: 3 }}>Color</span>
          <input
            type="color"
            value={lineColor}
            onChange={(e) => onUpdate(element.id, { textStyle: { ...ts, backgroundColor: e.target.value } })}
            style={{ width: 16, height: 16, border: "none", borderRadius: 4, cursor: "pointer", background: "transparent", padding: 0 }}
          />
        </label>
        {DIVIDER}
        <button className="ft-btn" style={BTN} onClick={() => onDuplicate(element.id)} title="Duplicate Element (Ctrl+D)"><Copy size={13} /></button>
        <button className="ft-btn" style={{ ...BTN, color: "#EF4444" }} onClick={() => onDelete(element.id)} title="Delete Element (Del)"><Trash2 size={13} /></button>
      </div>
    );
  }

  // ── Text / Variable Context (Default fallback) ─────────────────────────────
  const isVar = element.type === "variable";
  return (
    <div ref={toolbarRef} onMouseDown={(e) => e.preventDefault()} style={containerStyle}>
      {animStyles}
      <span style={{ fontSize: 10, fontWeight: 800, color: "#94A3B8", marginRight: 4, textTransform: "uppercase" }}>
        {isVar ? "Variable" : "Text"}:
      </span>
      <button className="ft-btn" style={{ ...BTN, ...(fmt.bold ? BTN_ACTIVE : {}) }} onClick={() => exec("bold")} title="Bold (Ctrl+B)">
        <Bold size={13} />
      </button>
      <button className="ft-btn" style={{ ...BTN, ...(fmt.italic ? BTN_ACTIVE : {}) }} onClick={() => exec("italic")} title="Italic (Ctrl+I)">
        <Italic size={13} />
      </button>
      <button className="ft-btn" style={{ ...BTN, ...(fmt.underline ? BTN_ACTIVE : {}) }} onClick={() => exec("underline")} title="Underline (Ctrl+U)">
        <Underline size={13} />
      </button>
      <button className="ft-btn" style={{ ...BTN, ...(fmt.strikethrough ? BTN_ACTIVE : {}) }} onClick={() => exec("strikeThrough")} title="Strikethrough">
        <Strikethrough size={13} />
      </button>
      {DIVIDER}
      {[
        { dir: "left",    icon: <AlignLeft    size={13} />, cmd: "justifyLeft"   },
        { dir: "center",  icon: <AlignCenter  size={13} />, cmd: "justifyCenter" },
        { dir: "right",   icon: <AlignRight   size={13} />, cmd: "justifyRight"  },
        { dir: "justify", icon: <AlignJustify size={13} />, cmd: "justifyFull"   },
      ].map(({ dir, icon, cmd }) => (
        <button
          key={dir}
          className="ft-btn"
          style={{ ...BTN, ...(fmt.justify === dir ? BTN_ACTIVE : {}) }}
          onClick={() => exec(cmd)}
          title={`Align ${dir}`}
        >
          {icon}
        </button>
      ))}
      {DIVIDER}
      <label style={{ display: "flex", alignItems: "center", cursor: "pointer", flexShrink: 0, padding: "0 4px" }} title="Text color">
        <Type size={13} style={{ color: "#475569" }} />
        <input
          type="color"
          value={fmt.color}
          onChange={(e) => {
            setFmt((p) => ({ ...p, color: e.target.value }));
            exec("foreColor", e.target.value);
          }}
          style={{ width: 14, height: 14, border: "none", borderRadius: 2, cursor: "pointer", background: "transparent", marginLeft: 2, padding: 0 }}
        />
      </label>
      {DIVIDER}
      <button className="ft-btn" style={BTN} onClick={() => onDuplicate(element.id)} title="Duplicate Element (Ctrl+D)"><Copy size={13} /></button>
      <button className="ft-btn" style={{ ...BTN, color: "#EF4444" }} onClick={() => onDelete(element.id)} title="Delete Element (Del)"><Trash2 size={13} /></button>
    </div>
  );
}
