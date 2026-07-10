"use client";

import React, { useState, useEffect } from "react";
import {
  Layers, FileText, Eye, EyeOff, Lock, Unlock, Trash2,
  ChevronUp, ChevronDown, GripVertical, Plus,
  AlignLeft, Heading1, Type, Image, Table2, Minus,
  MoveHorizontal, MoveVertical, Square, Circle as CircleIcon,
  Scissors, Variable, Building2, Sparkles, Info,
  Bold, Italic, Underline, Strikethrough, AlignCenter, AlignRight, AlignJustify,
  Baseline, WrapText, Sliders
} from "lucide-react";
import type { DocumentElement, CanvasPage, DocumentMeta, TextStyle, TableData } from "./types";
import { findVariable } from "./variable-definitions";

// ── Element type → icon mapping ─────────────────────────────────────────────
function ElementIcon({ type }: { type: string }) {
  const props = { size: 12 };
  switch (type) {
    case "heading":    return <Heading1 {...props} />;
    case "subheading": return <Type {...props} />;
    case "paragraph":  return <AlignLeft {...props} />;
    case "image":      return <Image {...props} />;
    case "logo":       return <Building2 {...props} />;
    case "table":      return <Table2 {...props} />;
    case "divider":    return <Minus {...props} />;
    case "horizontalLine": return <MoveHorizontal {...props} />;
    case "verticalLine":   return <MoveVertical {...props} />;
    case "pageBreak":      return <Scissors {...props} />;
    case "variable":       return <Variable {...props} />;
    case "shape":          return <Square {...props} />;
    default:               return <FileText {...props} />;
  }
}

function elementLabel(el: DocumentElement): string {
  switch (el.type) {
    case "heading":        return el.content?.replace(/<[^>]*>/g, "").slice(0, 22) || "Heading";
    case "subheading":     return el.content?.replace(/<[^>]*>/g, "").slice(0, 22) || "Sub Heading";
    case "paragraph":      return el.content?.replace(/<[^>]*>/g, "").slice(0, 22) || "Paragraph";
    case "image":          return "Image";
    case "logo":           return "Logo";
    case "table":          return `Table (${el.tableData?.rows ?? 0}×${el.tableData?.cols ?? 0})`;
    case "divider":        return "Divider";
    case "horizontalLine": return "H. Line";
    case "verticalLine":   return "V. Line";
    case "pageBreak":      return "Page Break";
    case "variable":       return el.content || "Variable";
    case "shape":          return "Shape";
    default:               return el.type;
  }
}

// ── Mini page thumbnail ──────────────────────────────────────────────────────
function PageThumb({
  page, index, isCurrent, onClick, onDelete, canDelete,
}: {
  page: CanvasPage;
  index: number;
  isCurrent: boolean;
  onClick: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onClick}
        style={{
          width: "100%",
          padding: "8px",
          border: `2px solid ${isCurrent ? "#1E3A5F" : "#E2E8F0"}`,
          borderRadius: 8,
          background: isCurrent ? "#EFF6FF" : "white",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          transition: "all 0.15s",
        }}
      >
        {/* Tiny page preview */}
        <div
          style={{
            width: "100%",
            aspectRatio: "210 / 297",
            background: "white",
            border: "1px solid #E2E8F0",
            borderRadius: 4,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative lines representing elements */}
          <div style={{ position: "absolute", inset: 6, display: "flex", flexDirection: "column", gap: 4 }}>
            {page.elements.slice(0, 6).map((el) => (
              <div
                key={el.id}
                style={{
                  height: 3,
                  background: "#CBD5E1",
                  borderRadius: 2,
                  width: `${Math.min(90, Math.round((el.width / 794) * 100))}%`,
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
          {page.elements.length === 0 && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#CBD5E1", fontSize: 10 }}>
              Empty
            </div>
          )}
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: isCurrent ? "#1E3A5F" : "#64748B" }}>
          Page {index + 1}
        </span>
      </button>
      {/* Delete button on hover */}
      {canDelete && hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            width: 18,
            height: 18,
            borderRadius: 4,
            background: "#FEE2E2",
            border: "1px solid #FCA5A5",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
        >
          <Trash2 size={9} color="#DC2626" />
        </button>
      )}
    </div>
  );
}

// ── Layer row ─────────────────────────────────────────────────────────────────
function LayerRow({
  el,
  isSelected,
  onSelect,
  onDelete,
  onToggleVisibility,
  onToggleLock,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  el: DocumentElement;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const isHidden = el.visible === false;
  const isLocked = el.locked === true;

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 8px",
        borderRadius: 6,
        background: isSelected ? "#EFF6FF" : hovered ? "#F8FAFC" : "transparent",
        border: `1px solid ${isSelected ? "#BFDBFE" : "transparent"}`,
        cursor: "pointer",
        transition: "all 0.12s",
        opacity: isHidden ? 0.45 : 1,
      }}
    >
      {/* Drag grip */}
      <GripVertical size={11} color="#CBD5E1" style={{ flexShrink: 0, cursor: "grab" }} />

      {/* Icon */}
      <div style={{ color: isSelected ? "#1E3A5F" : "#94A3B8", flexShrink: 0 }}>
        <ElementIcon type={el.type} />
      </div>

      {/* Label */}
      <span
        style={{
          flex: 1,
          fontSize: 11,
          fontWeight: isSelected ? 700 : 500,
          color: isSelected ? "#1E3A5F" : "#475569",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textDecoration: isHidden ? "line-through" : "none",
        }}
      >
        {elementLabel(el)}
      </span>

      {/* Action buttons — shown on hover or when selected */}
      {(hovered || isSelected) && (
        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={!canMoveUp}
            title="Move up (higher z-index)"
            style={{
              width: 18, height: 18, border: "none", borderRadius: 3,
              background: canMoveUp ? "#F1F5F9" : "transparent",
              cursor: canMoveUp ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: canMoveUp ? 1 : 0.3,
            }}
          >
            <ChevronUp size={10} color="#64748B" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={!canMoveDown}
            title="Move down (lower z-index)"
            style={{
              width: 18, height: 18, border: "none", borderRadius: 3,
              background: canMoveDown ? "#F1F5F9" : "transparent",
              cursor: canMoveDown ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: canMoveDown ? 1 : 0.3,
            }}
          >
            <ChevronDown size={10} color="#64748B" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
            title={isHidden ? "Show element" : "Hide element"}
            style={{
              width: 18, height: 18, border: "none", borderRadius: 3,
              background: "#F1F5F9", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {isHidden ? <EyeOff size={10} color="#94A3B8" /> : <Eye size={10} color="#64748B" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
            title={isLocked ? "Unlock element" : "Lock element"}
            style={{
              width: 18, height: 18, border: "none", borderRadius: 3,
              background: isLocked ? "#FEF3C7" : "#F1F5F9", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {isLocked ? <Lock size={10} color="#D97706" /> : <Unlock size={10} color="#64748B" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete element"
            style={{
              width: 18, height: 18, border: "none", borderRadius: 3,
              background: "#FEE2E2", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Trash2 size={10} color="#DC2626" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── RightPanel ────────────────────────────────────────────────────────────────

interface RightPanelProps {
  document: DocumentMeta;
  currentPage: number;
  selectedElementIds: string[];
  onSelectElement: (id: string) => void;
  onUpdatePages: (pages: CanvasPage[]) => void;
  onPageChange: (page: number) => void;
  onAddPage: () => void;
  onDeletePage: (idx: number) => void;
}

type PanelTab = "layers" | "pages" | "variable" | "properties";

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

export function RightPanel({
  document,
  currentPage,
  selectedElementIds,
  onSelectElement,
  onUpdatePages,
  onPageChange,
  onAddPage,
  onDeletePage,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("layers");

  const pages = document.pages;
  const currentPageIdx = currentPage - 1;
  const page = pages[currentPageIdx];
  // Show layers in reverse order (top of stack = top of list)
  const elements = page ? [...page.elements].sort((a, b) => b.zIndex - a.zIndex) : [];

  const selectedElement = page?.elements.find((el) => selectedElementIds.includes(el.id)) ?? null;

  // Auto-switch tabs when selected elements change
  useEffect(() => {
    if (selectedElementIds.length === 1) {
      if (selectedElement?.type === "variable") {
        setActiveTab("variable");
      } else {
        setActiveTab("properties");
      }
    } else if (selectedElementIds.length === 0 && (activeTab === "properties" || activeTab === "variable")) {
      setActiveTab("layers");
    }
  }, [selectedElementIds.length, selectedElement?.id, selectedElement?.type]);

  // ── Element mutations ─────────────────────────────────────────────────────
  const updateElements = (updater: (els: DocumentElement[]) => DocumentElement[]) => {
    const newPages = pages.map((p, i) =>
      i === currentPageIdx ? { ...p, elements: updater(p.elements) } : p
    );
    onUpdatePages(newPages);
  };

  const handleDelete = (id: string) => {
    updateElements((els) => els.filter((e) => e.id !== id));
  };

  const handleToggleVisibility = (id: string) => {
    updateElements((els) => els.map((e) => e.id === id ? { ...e, visible: e.visible === false ? true : false } : e));
  };

  const handleToggleLock = (id: string) => {
    updateElements((els) => els.map((e) => e.id === id ? { ...e, locked: !e.locked } : e));
  };

  const handleMoveUp = (id: string) => {
    updateElements((els) => {
      const el = els.find((e) => e.id === id);
      if (!el) return els;
      const newZ = el.zIndex + 1;
      return els.map((e) => e.id === id ? { ...e, zIndex: newZ } : e);
    });
  };

  const handleMoveDown = (id: string) => {
    updateElements((els) => {
      const el = els.find((e) => e.id === id);
      if (!el) return els;
      const newZ = Math.max(0, el.zIndex - 1);
      return els.map((e) => e.id === id ? { ...e, zIndex: newZ } : e);
    });
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "8px 4px",
    border: "none",
    borderBottom: `2px solid ${active ? "#1E3A5F" : "transparent"}`,
    background: "transparent",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 700,
    color: active ? "#1E3A5F" : "#94A3B8",
    transition: "all 0.15s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    letterSpacing: 0.3,
  });

  return (
    <div
      style={{
        width: 240,
        height: "100%",
        background: "white",
        borderLeft: "1px solid #F1F5F9",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #F1F5F9",
          flexShrink: 0,
        }}
      >
        <button style={tabStyle(activeTab === "layers")} onClick={() => setActiveTab("layers")}>
          <Layers size={12} />
          LAYERS
        </button>
        <button style={tabStyle(activeTab === "pages")} onClick={() => setActiveTab("pages")}>
          <FileText size={12} />
          PAGES
        </button>
        {selectedElement && selectedElement.type === "variable" && (
          <button style={tabStyle(activeTab === "variable")} onClick={() => setActiveTab("variable")}>
            <Variable size={12} />
            VAR
          </button>
        )}
        {selectedElement && (
          <button style={tabStyle(activeTab === "properties")} onClick={() => setActiveTab("properties")}>
            <Sliders size={12} />
            PROPS
          </button>
        )}
      </div>

      {/* ── Layers tab ────────────────────────────────────────────────────── */}
      {activeTab === "layers" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
          {selectedElementIds.length > 0 && (
            <div style={{ padding: "8px", background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0", marginBottom: 12 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: "#64748B", letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" }}>
                Align Selection ({selectedElementIds.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                <button
                  onClick={() => (window as any).__handleAlignSelectedElements?.("left")}
                  style={{ padding: "4px 8px", background: "white", border: "1px solid #D1D5DB", borderRadius: 4, fontSize: 10, fontWeight: 700, color: "#374151", cursor: "pointer" }}
                  title="Align Left"
                >
                  Left
                </button>
                <button
                  onClick={() => (window as any).__handleAlignSelectedElements?.("center")}
                  style={{ padding: "4px 8px", background: "white", border: "1px solid #D1D5DB", borderRadius: 4, fontSize: 10, fontWeight: 700, color: "#374151", cursor: "pointer" }}
                  title="Align Center"
                >
                  Center
                </button>
                <button
                  onClick={() => (window as any).__handleAlignSelectedElements?.("right")}
                  style={{ padding: "4px 8px", background: "white", border: "1px solid #D1D5DB", borderRadius: 4, fontSize: 10, fontWeight: 700, color: "#374151", cursor: "pointer" }}
                  title="Align Right"
                >
                  Right
                </button>
                <button
                  onClick={() => (window as any).__handleAlignSelectedElements?.("top")}
                  style={{ padding: "4px 8px", background: "white", border: "1px solid #D1D5DB", borderRadius: 4, fontSize: 10, fontWeight: 700, color: "#374151", cursor: "pointer" }}
                  title="Align Top"
                >
                  Top
                </button>
                <button
                  onClick={() => (window as any).__handleAlignSelectedElements?.("bottom")}
                  style={{ padding: "4px 8px", background: "white", border: "1px solid #D1D5DB", borderRadius: 4, fontSize: 10, fontWeight: 700, color: "#374151", cursor: "pointer" }}
                  title="Align Bottom"
                >
                  Bottom
                </button>
                {selectedElementIds.length > 2 && (
                  <>
                    <button
                      onClick={() => (window as any).__handleAlignSelectedElements?.("distribute-h")}
                      style={{ padding: "4px 8px", background: "white", border: "1px solid #D1D5DB", borderRadius: 4, fontSize: 10, fontWeight: 700, color: "#374151", cursor: "pointer" }}
                      title="Distribute Horizontally"
                    >
                      Distribute ↔
                    </button>
                    <button
                      onClick={() => (window as any).__handleAlignSelectedElements?.("distribute-v")}
                      style={{ padding: "4px 8px", background: "white", border: "1px solid #D1D5DB", borderRadius: 4, fontSize: 10, fontWeight: 700, color: "#374151", cursor: "pointer" }}
                      title="Distribute Vertically"
                    >
                      Distribute ↕
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
          {elements.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px", textAlign: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Layers size={18} color="#CBD5E1" />
              </div>
              <p style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500, lineHeight: 1.5 }}>
                No elements on this page yet. Add elements from the left panel.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Page label */}
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: 0.5, padding: "4px 8px 6px", textTransform: "uppercase" }}>
                Page {currentPage} — {elements.length} element{elements.length !== 1 ? "s" : ""}
              </div>
              {elements.map((el, idx) => {
                const maxZ = Math.max(...elements.map((e) => e.zIndex));
                const minZ = Math.min(...elements.map((e) => e.zIndex));
                return (
                  <LayerRow
                    key={el.id}
                    el={el}
                    isSelected={selectedElementIds.includes(el.id)}
                    onSelect={() => onSelectElement(el.id)}
                    onDelete={() => handleDelete(el.id)}
                    onToggleVisibility={() => handleToggleVisibility(el.id)}
                    onToggleLock={() => handleToggleLock(el.id)}
                    onMoveUp={() => handleMoveUp(el.id)}
                    onMoveDown={() => handleMoveDown(el.id)}
                    canMoveUp={el.zIndex < maxZ}
                    canMoveDown={el.zIndex > minZ}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Variable Inspector tab ───────────────────────────────────── */}
      {activeTab === "variable" && selectedElement && (() => {
        const meta    = selectedElement.variableMeta;
        const varKey  = meta?.key || (selectedElement.content?.replace(/[{}]/g, "").trim() ?? "");
        const builtin = findVariable(varKey);
        const label   = meta?.label   || builtin?.label   || varKey;
        const cat     = meta?.category || builtin?.category || "Unknown";
        const catId   = meta?.categoryId || builtin?.categoryId || "custom";
        const desc    = meta?.description || builtin?.description || "A dynamic variable";
        const preview = meta?.previewValue || builtin?.previewValue || "—";
        const dataType = builtin?.dataType || "text";

        const catColors: Record<string, { bg: string; text: string }> = {
          student:    { bg: "#DBEAFE", text: "#1D4ED8" },
          parent:     { bg: "#CFFAFE", text: "#0E7490" },
          teacher:    { bg: "#D1FAE5", text: "#065F46" },
          school:     { bg: "#EDE9FE", text: "#5B21B6" },
          academic:   { bg: "#FEF3C7", text: "#92400E" },
          exam:       { bg: "#FEE2E2", text: "#991B1B" },
          attendance: { bg: "#E0F2FE", text: "#075985" },
          fees:       { bg: "#F3E8FF", text: "#6D28D9" },
          salary:     { bg: "#D1FAE5", text: "#064E3B" },
          system:     { bg: "#F1F5F9", text: "#334155" },
          custom:     { bg: "#FFF7ED", text: "#9A3412" },
        };
        const col = catColors[catId] ?? catColors.custom;

        return (
          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            {/* Category badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <div style={{
                padding: "3px 10px", borderRadius: 20,
                background: col.bg, fontSize: 10.5, fontWeight: 800,
                color: col.text, letterSpacing: 0.3,
              }}>
                {cat}
              </div>
              <div style={{
                padding: "2px 8px", borderRadius: 20,
                background: "#F1F5F9", fontSize: 10, fontWeight: 700,
                color: "#475569",
              }}>
                {dataType}
              </div>
            </div>

            {/* Label */}
            <div style={{ fontSize: 15, fontWeight: 900, color: "#0F172A", marginBottom: 4 }}>
              {label}
            </div>

            {/* Description */}
            <div style={{ fontSize: 11.5, color: "#475569", lineHeight: 1.6, marginBottom: 12 }}>
              {desc}
            </div>

            {/* Key card */}
            <div style={{ background: col.bg, borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: col.text, letterSpacing: 0.5, marginBottom: 4 }}>VARIABLE KEY</div>
              <code style={{ fontSize: 12, color: col.text, fontWeight: 800, wordBreak: "break-all" }}>
                {`{{${varKey}}}`}
              </code>
            </div>

            {/* Preview value */}
            <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: "#64748B", letterSpacing: 0.5, marginBottom: 4 }}>PREVIEW VALUE</div>
              <div style={{ fontSize: 12.5, color: "#1E293B", fontWeight: 700 }}>{preview}</div>
            </div>

            {/* Source */}
            <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: "#64748B", letterSpacing: 0.5, marginBottom: 4 }}>SOURCE</div>
              <div style={{ fontSize: 11.5, color: "#475569", fontWeight: 600 }}>
                {builtin ? "Built-in Variable" : "Custom Variable"}
              </div>
            </div>

            {/* Info note */}
            <div style={{
              marginTop: 12, padding: "8px 10px", borderRadius: 8,
              background: "#EFF6FF", border: "1px solid #BFDBFE",
              fontSize: 10.5, color: "#1D4ED8", lineHeight: 1.5,
            }}>
              <Info size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
              Variables are replaced with real data at document generation time. Double-click to inspect.
            </div>
          </div>
        );
      })()}

      {/* ── Properties Inspector tab ────────────────────────────────────── */}
      {activeTab === "properties" && selectedElement && (() => {
        const el = selectedElement;
        const ts = el.textStyle || {} as TextStyle;
        const is = (el.imageStyle || {}) as any;
        const td = el.tableData || {} as TableData;
        const isTextType = ["heading", "subheading", "paragraph", "variable"].includes(el.type);

        const updateTextStyle = (updates: Partial<TextStyle>) => {
          updateElements((els) =>
            els.map((e) => (e.id === el.id ? { ...e, textStyle: { ...(e.textStyle || {}), ...updates } as TextStyle } : e))
          );
        };

        const updateImageStyle = (updates: Partial<any>) => {
          updateElements((els) =>
            els.map((e) => (e.id === el.id ? { ...e, imageStyle: { ...(e.imageStyle || {}), ...updates } as any } : e))
          );
        };

        const updateTableData = (updates: Partial<TableData>) => {
          updateElements((els) =>
            els.map((e) => (e.id === el.id ? { ...e, tableData: { ...(e.tableData || {}), ...updates } as TableData } : e))
          );
        };

        const updatePosition = (field: "x" | "y" | "width" | "height", val: number) => {
          const clamped = Math.max(0, val);
          updateElements((els) =>
            els.map((e) => (e.id === el.id ? { ...e, [field]: clamped } : e))
          );
        };

        const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "#64748B", marginBottom: 3, textTransform: "uppercase" };
        const inputStyle: React.CSSProperties = {
          width: "100%", padding: "5px 8px", borderRadius: 6, border: "1px solid #E2E8F0",
          fontSize: 12, fontWeight: 600, outline: "none", color: "#1E293B", boxSizing: "border-box"
        };
        const rowStyle: React.CSSProperties = { display: "flex", gap: 8, marginBottom: 10 };
        const colStyle: React.CSSProperties = { flex: 1 };
        
        const btnFmt: React.CSSProperties = {
          padding: "4px 8px", background: "white", border: "1px solid #D1D5DB", borderRadius: 4,
          fontSize: 10, fontWeight: 700, color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
        };
        const btnFmtActive: React.CSSProperties = {
          ...btnFmt, background: "#EEF2FF", border: "1px solid #6366F1", color: "#4F46E5"
        };

        return (
          <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Header */}
            <div style={{ borderBottom: "1px solid #F1F5F9", paddingBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ color: "#4F46E5" }}><ElementIcon type={el.type} /></span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#1E293B", textTransform: "uppercase" }}>{el.type} Properties</span>
              </div>
              <span style={{ fontSize: 10, color: "#94A3B8" }}>ID: {el.id.slice(0, 8)}...</span>
            </div>

            {/* Position & Size */}
            <div>
              <div style={{ ...labelStyle, fontSize: 10.5, color: "#475569", borderBottom: "1px solid #F8FAFC", paddingBottom: 3, marginBottom: 6 }}>Dimensions</div>
              <div style={rowStyle}>
                <div style={colStyle}>
                  <div style={labelStyle}>X (Left)</div>
                  <input
                    type="number"
                    value={Math.round(el.x)}
                    onChange={(e) => updatePosition("x", Number(e.target.value))}
                    style={inputStyle}
                  />
                </div>
                <div style={colStyle}>
                  <div style={labelStyle}>Y (Top)</div>
                  <input
                    type="number"
                    value={Math.round(el.y)}
                    onChange={(e) => updatePosition("y", Number(e.target.value))}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={rowStyle}>
                <div style={colStyle}>
                  <div style={labelStyle}>Width (W)</div>
                  <input
                    type="number"
                    value={Math.round(el.width)}
                    onChange={(e) => updatePosition("width", Number(e.target.value))}
                    style={inputStyle}
                  />
                </div>
                <div style={colStyle}>
                  <div style={labelStyle}>Height (H)</div>
                  <input
                    type="number"
                    value={Math.round(el.height)}
                    onChange={(e) => updatePosition("height", Number(e.target.value))}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Typography */}
            {isTextType && (
              <div>
                <div style={{ ...labelStyle, fontSize: 10.5, color: "#475569", borderBottom: "1px solid #F8FAFC", paddingBottom: 3, marginBottom: 6 }}>Typography</div>
                
                <div style={{ marginBottom: 8 }}>
                  <div style={labelStyle}>Font Family</div>
                  <select
                    value={ts.fontFamily || FONTS[0].value}
                    onChange={(e) => updateTextStyle({ fontFamily: e.target.value })}
                    style={{ ...inputStyle, padding: "4px 6px", cursor: "pointer" }}
                  >
                    {FONTS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>

                <div style={rowStyle}>
                  <div style={colStyle}>
                    <div style={labelStyle}>Font Size</div>
                    <input
                      type="number"
                      min={6}
                      max={144}
                      value={ts.fontSize || 13}
                      onChange={(e) => updateTextStyle({ fontSize: Math.max(6, Number(e.target.value)) })}
                      style={inputStyle}
                    />
                  </div>
                  <div style={colStyle}>
                    <div style={labelStyle}>Line Height</div>
                    <input
                      type="number"
                      min={0.5}
                      max={4.0}
                      step={0.1}
                      value={ts.lineHeight || 1.2}
                      onChange={(e) => updateTextStyle({ lineHeight: Math.max(0.5, Number(e.target.value)) })}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={rowStyle}>
                  <div style={colStyle}>
                    <div style={labelStyle}>Letter Spacing</div>
                    <input
                      type="number"
                      min={-5}
                      max={20}
                      step={0.5}
                      value={ts.letterSpacing || 0}
                      onChange={(e) => updateTextStyle({ letterSpacing: Number(e.target.value) })}
                      style={inputStyle}
                    />
                  </div>
                  <div style={colStyle}>
                    <div style={labelStyle}>Text Color</div>
                    <input
                      type="color"
                      value={ts.color || "#000000"}
                      onChange={(e) => updateTextStyle({ color: e.target.value })}
                      style={{ ...inputStyle, padding: 0, height: 28, cursor: "pointer", background: "transparent", border: "none" }}
                    />
                  </div>
                </div>

                <div style={rowStyle}>
                  <div style={colStyle}>
                    <div style={labelStyle}>Background (Hilite)</div>
                    <input
                      type="color"
                      value={ts.backgroundColor === "transparent" ? "#ffffff" : (ts.backgroundColor || "#ffffff")}
                      onChange={(e) => updateTextStyle({ backgroundColor: e.target.value })}
                      style={{ ...inputStyle, padding: 0, height: 28, cursor: "pointer", background: "transparent", border: "none" }}
                    />
                  </div>
                </div>

                {/* Typography styles */}
                <div style={{ ...rowStyle, flexWrap: "wrap", marginTop: 4 }}>
                  <button
                    onClick={() => updateTextStyle({ fontWeight: ts.fontWeight === "bold" ? "normal" : "bold" })}
                    style={ts.fontWeight === "bold" ? btnFmtActive : btnFmt}
                    title="Bold"
                  >
                    <Bold size={11} />
                  </button>
                  <button
                    onClick={() => updateTextStyle({ fontStyle: ts.fontStyle === "italic" ? "normal" : "italic" })}
                    style={ts.fontStyle === "italic" ? btnFmtActive : btnFmt}
                    title="Italic"
                  >
                    <Italic size={11} />
                  </button>
                  <button
                    onClick={() => updateTextStyle({ textDecoration: ts.textDecoration === "underline" ? "none" : "underline" })}
                    style={ts.textDecoration === "underline" ? btnFmtActive : btnFmt}
                    title="Underline"
                  >
                    <Underline size={11} />
                  </button>
                  <button
                    onClick={() => updateTextStyle({ textDecoration: ts.textDecoration === "line-through" ? "none" : "line-through" })}
                    style={ts.textDecoration === "line-through" ? btnFmtActive : btnFmt}
                    title="Strikethrough"
                  >
                    <Strikethrough size={11} />
                  </button>
                </div>

                {/* Alignments */}
                <div style={{ ...labelStyle, marginTop: 10 }}>Alignments</div>
                <div style={{ ...rowStyle, flexWrap: "wrap" }}>
                  {[
                    { val: "left" as const, label: "Left" },
                    { val: "center" as const, label: "Center" },
                    { val: "right" as const, label: "Right" },
                    { val: "justify" as const, label: "Justify" },
                  ].map((align) => {
                    const isSel = ts.textAlign === align.val;
                    return (
                      <button
                        key={align.val}
                        onClick={() => updateTextStyle({ textAlign: align.val })}
                        style={isSel ? btnFmtActive : btnFmt}
                        title={`Align ${align.label}`}
                      >
                        {align.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Table Specific Settings */}
            {el.type === "table" && (
              <div>
                <div style={{ ...labelStyle, fontSize: 10.5, color: "#475569", borderBottom: "1px solid #F8FAFC", paddingBottom: 3, marginBottom: 6 }}>Table Properties</div>
                
                <div style={rowStyle}>
                  <div style={colStyle}>
                    <div style={labelStyle}>Cell Padding</div>
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={td.cellPadding || 8}
                      onChange={(e) => updateTableData({ cellPadding: Math.max(0, Number(e.target.value)) })}
                      style={inputStyle}
                    />
                  </div>
                  <div style={colStyle}>
                    <div style={labelStyle}>Border Size</div>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={td.borderWidth === undefined ? 1 : td.borderWidth}
                      onChange={(e) => updateTableData({ borderWidth: Math.max(0, Number(e.target.value)) })}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={rowStyle}>
                  <div style={colStyle}>
                    <div style={labelStyle}>Border Color</div>
                    <input
                      type="color"
                      value={td.borderColor || "#E2E8F0"}
                      onChange={(e) => updateTableData({ borderColor: e.target.value })}
                      style={{ ...inputStyle, padding: 0, height: 28, cursor: "pointer", background: "transparent", border: "none" }}
                    />
                  </div>
                  <div style={colStyle}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 4, cursor: "pointer", userSelect: "none" }}>
                      <span style={labelStyle}>Header Row</span>
                      <input
                        type="checkbox"
                        checked={!!td.headerRow}
                        onChange={(e) => updateTableData({ headerRow: e.target.checked })}
                        style={{ width: 16, height: 16, cursor: "pointer", marginTop: 4 }}
                      />
                    </label>
                  </div>
                </div>

                <div style={rowStyle}>
                  <div style={colStyle}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 4, cursor: "pointer", userSelect: "none" }}>
                      <span style={labelStyle}>Alternate Rows</span>
                      <input
                        type="checkbox"
                        checked={!!td.alternateRows}
                        onChange={(e) => updateTableData({ alternateRows: e.target.checked })}
                        style={{ width: 16, height: 16, cursor: "pointer", marginTop: 4 }}
                      />
                    </label>
                  </div>
                  <div style={colStyle}>
                    <div style={labelStyle}>ERP Loop Binding</div>
                    <select
                      value={td.erpBinding || ""}
                      onChange={(e) => updateTableData({ erpBinding: e.target.value || undefined })}
                      style={{ ...inputStyle, padding: "4px 6px" }}
                    >
                      <option value="">None (Static Table)</option>
                      <option value="student.marks">Student Marks</option>
                      <option value="student.fees">Student Fees</option>
                      <option value="student.attendance">Student Attendance</option>
                      <option value="student.siblings">Student Siblings</option>
                      <option value="school.exams">School Exams</option>
                      <option value="custom">Custom Bind...</option>
                    </select>
                  </div>
                </div>

                {/* Table Actions */}
                <div style={{ marginTop: 12 }}>
                  <div style={labelStyle}>Grid Actions</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                    <button
                      onClick={() => {
                        const newColWidths = Array(td.cols).fill(el.width / td.cols);
                        updateTableData({ colWidths: newColWidths });
                      }}
                      style={btnFmt}
                      title="Distribute columns equally"
                    >
                      Distribute ↔
                    </button>
                    <button
                      onClick={() => {
                        const newRowHeights = Array(td.rows).fill(el.height / td.rows);
                        updateTableData({ rowHeights: newRowHeights });
                      }}
                      style={btnFmt}
                      title="Distribute rows equally"
                    >
                      Distribute ↕
                    </button>
                    <button
                      onClick={() => {
                        updateTableData({ colWidths: undefined, rowHeights: undefined });
                      }}
                      style={btnFmt}
                      title="Reset custom row/column sizes to autofit content"
                    >
                      Autofit
                    </button>
                  </div>
                </div>

                {/* Merge / Split */}
                {(() => {
                  const selection = (window as any).__selectedTableSelection;
                  const isMultiSelected = (selection?.coords?.length || 0) > 1;
                  const activeR = selection?.coords?.[0]?.[0];
                  const activeC = selection?.coords?.[0]?.[1];
                  const spans = td.spans || Array.from({ length: td.rows }, () => Array(td.cols).fill({}));
                  const cellSpan = activeR !== undefined && activeC !== undefined ? spans[activeR]?.[activeC] : null;
                  const canSplit = cellSpan && (cellSpan.colspan > 1 || cellSpan.rowspan > 1);

                  return (
                    <div style={{ marginTop: 10 }}>
                      <div style={labelStyle}>Cell Operations</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                        <button
                          disabled={!isMultiSelected}
                          onClick={() => {
                            const coords = (selection?.coords || []) as [number, number][];
                            if (coords.length < 2) return;
                            const rowsList = coords.map(([r, c]) => r);
                            const colsList = coords.map(([r, c]) => c);
                            const minR = Math.min(...rowsList);
                            const maxR = Math.max(...rowsList);
                            const minC = Math.min(...colsList);
                            const maxC = Math.max(...colsList);
                            const colspan = maxC - minC + 1;
                            const rowspan = maxR - minR + 1;
                            const newSpans = JSON.parse(JSON.stringify(spans));

                            let mergedText = "";
                            for (let ri = minR; ri <= maxR; ri++) {
                              for (let ci = minC; ci <= maxC; ci++) {
                                const text = td.cells[ri]?.[ci] || "";
                                if (text) mergedText += (mergedText ? " " : "") + text;
                                if (ri === minR && ci === minC) {
                                  newSpans[ri][ci] = { colspan, rowspan };
                                } else {
                                  newSpans[ri][ci] = { merged: true, mergedInto: [minR, minC] };
                                }
                              }
                            }

                            const newCells = td.cells.map((row, ri) => 
                              row.map((cell, ci) => {
                                if (ri === minR && ci === minC) return mergedText;
                                if (ri >= minR && ri <= maxR && ci >= minC && ci <= maxC) return "";
                                return cell;
                              })
                            );
                            const newOrig = (td.originalCells || td.cells).map((row, ri) => 
                              row.map((cell, ci) => {
                                if (ri === minR && ci === minC) return mergedText;
                                if (ri >= minR && ri <= maxR && ci >= minC && ci <= maxC) return "";
                                return cell;
                              })
                            );

                            updateTableData({
                              cells: newCells,
                              originalCells: newOrig,
                              spans: newSpans,
                            });
                          }}
                          style={{ ...btnFmt, opacity: isMultiSelected ? 1 : 0.5, cursor: isMultiSelected ? "pointer" : "not-allowed" }}
                          title="Select multiple cells inside table using Shift+Click to merge them"
                        >
                          Merge Cells
                        </button>
                        <button
                          disabled={!canSplit}
                          onClick={() => {
                            if (activeR === undefined || activeC === undefined) return;
                            const newSpans = JSON.parse(JSON.stringify(spans));
                            const cs = cellSpan.colspan || 1;
                            const rs = cellSpan.rowspan || 1;
                            newSpans[activeR][activeC] = {};
                            for (let ri = activeR; ri < activeR + rs; ri++) {
                              for (let ci = activeC; ci < activeC + cs; ci++) {
                                if (ri === activeR && ci === activeC) continue;
                                newSpans[ri][ci] = {};
                              }
                            }
                            updateTableData({ spans: newSpans });
                          }}
                          style={{ ...btnFmt, opacity: canSplit ? 1 : 0.5, cursor: canSplit ? "pointer" : "not-allowed" }}
                          title="Split currently selected merged cell"
                        >
                          Split Cell
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}


            {/* Image & Logo Settings */}
            {(el.type === "image" || el.type === "logo") && (
              <div>
                <div style={{ ...labelStyle, fontSize: 10.5, color: "#475569", borderBottom: "1px solid #F8FAFC", paddingBottom: 3, marginBottom: 6 }}>Image Properties</div>
                
                <div style={{ marginBottom: 8 }}>
                  <div style={labelStyle}>Object Fit</div>
                  <select
                    value={is.objectFit || "contain"}
                    onChange={(e) => updateImageStyle({ objectFit: e.target.value })}
                    style={{ ...inputStyle, padding: "4px 6px", cursor: "pointer" }}
                  >
                    {["contain", "cover", "fill"].map((fit) => (
                      <option key={fit} value={fit}>{fit}</option>
                    ))}
                  </select>
                </div>

                <div style={rowStyle}>
                  <div style={colStyle}>
                    <div style={labelStyle}>Opacity (0-100)</div>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round((is.opacity ?? 1) * 100)}
                      onChange={(e) => updateImageStyle({ opacity: Math.max(0, Math.min(100, Number(e.target.value))) / 100 })}
                      style={inputStyle}
                    />
                  </div>
                  <div style={colStyle}>
                    <div style={labelStyle}>Border Radius</div>
                    <input
                      type="number"
                      min={0}
                      max={200}
                      value={is.borderRadius || 0}
                      onChange={(e) => updateImageStyle({ borderRadius: Math.max(0, Number(e.target.value)) })}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={labelStyle}>Rotation (Degrees)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={is.rotation || 0}
                      onChange={(e) => updateImageStyle({ rotation: Number(e.target.value) })}
                      style={{ flex: 1, cursor: "pointer" }}
                    />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#475569" }}>{is.rotation || 0}°</span>
                  </div>
                </div>
              </div>
            )}

            {/* Shape Settings */}
            {el.type === "shape" && (
              <div>
                <div style={{ ...labelStyle, fontSize: 10.5, color: "#475569", borderBottom: "1px solid #F8FAFC", paddingBottom: 3, marginBottom: 6 }}>Shape Properties</div>
                
                <div style={rowStyle}>
                  <div style={colStyle}>
                    <div style={labelStyle}>Fill Color</div>
                    <input
                      type="color"
                      value={ts.backgroundColor || "#1E3A5F"}
                      onChange={(e) => updateTextStyle({ backgroundColor: e.target.value })}
                      style={{ ...inputStyle, padding: 0, height: 28, cursor: "pointer", background: "transparent", border: "none" }}
                    />
                  </div>
                  <div style={colStyle}>
                    <div style={labelStyle}>Stroke Color</div>
                    <input
                      type="color"
                      value={ts.borderColor || "#1E3A5F"}
                      onChange={(e) => updateTextStyle({ borderColor: e.target.value })}
                      style={{ ...inputStyle, padding: 0, height: 28, cursor: "pointer", background: "transparent", border: "none" }}
                    />
                  </div>
                </div>

                <div style={rowStyle}>
                  <div style={colStyle}>
                    <div style={labelStyle}>Stroke Width</div>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={ts.borderWidth || 0}
                      onChange={(e) => updateTextStyle({ borderWidth: Math.max(0, Number(e.target.value)) })}
                      style={inputStyle}
                    />
                  </div>
                  <div style={colStyle}>
                    <div style={labelStyle}>Corner Radius</div>
                    <input
                      type="number"
                      min={0}
                      max={200}
                      value={ts.borderRadius || 0}
                      onChange={(e) => updateTextStyle({ borderRadius: Math.max(0, Number(e.target.value)) })}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Divider / Line Settings */}
            {["divider", "horizontalLine", "verticalLine"].includes(el.type) && (
              <div>
                <div style={{ ...labelStyle, fontSize: 10.5, color: "#475569", borderBottom: "1px solid #F8FAFC", paddingBottom: 3, marginBottom: 6 }}>Line Properties</div>
                <div style={rowStyle}>
                  <div style={colStyle}>
                    <div style={labelStyle}>Line Color</div>
                    <input
                      type="color"
                      value={ts.backgroundColor || "#1E3A5F"}
                      onChange={(e) => updateTextStyle({ backgroundColor: e.target.value })}
                      style={{ ...inputStyle, padding: 0, height: 28, cursor: "pointer", background: "transparent", border: "none" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Pages tab ─────────────────────────────────────────────────────── */}
      {activeTab === "pages" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pages.map((pg, idx) => (
              <PageThumb
                key={pg.id}
                page={pg}
                index={idx}
                isCurrent={idx === currentPageIdx}
                onClick={() => onPageChange(idx + 1)}
                onDelete={() => onDeletePage(idx)}
                canDelete={pages.length > 1}
              />
            ))}

            {/* Add Page button */}
            <button
              onClick={onAddPage}
              style={{
                width: "100%",
                padding: "8px",
                border: "2px dashed #CBD5E1",
                borderRadius: 8,
                background: "transparent",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 700,
                color: "#94A3B8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1E3A5F"; e.currentTarget.style.color = "#1E3A5F"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.color = "#94A3B8"; }}
            >
              <Plus size={12} />
              Add Page
            </button>
          </div>
        </div>
      )}

      {/* ── Footer: element count / page count ────────────────────────────── */}
      <div
        style={{
          padding: "8px 12px",
          borderTop: "1px solid #F1F5F9",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 10, color: "#CBD5E1", fontWeight: 600 }}>
          {pages.length} page{pages.length !== 1 ? "s" : ""}
        </span>
        <span style={{ fontSize: 10, color: "#CBD5E1", fontWeight: 600 }}>
          {page?.elements.length ?? 0} element{(page?.elements.length ?? 0) !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
