"use client";

import React, { useState } from "react";
import {
  StickyNote, MessageSquare, Mic, FolderOpen, List,
  Palette, UserCircle2,
  Heading1, Heading2, AlignLeft, Image, Building2, Table2,
  Minus, MoveHorizontal, MoveVertical, Scissors, Variable,
  Upload, Square, Circle, ChevronRight, X
} from "lucide-react";
import type { ElementType, DocumentElement } from "./types";
import { DEFAULT_TEXT_STYLE, DEFAULT_IMAGE_STYLE } from "./types";
import { VariablesPanel } from "./VariablesPanel";

interface LeftToolbarProps {
  onInsert: (element: Omit<DocumentElement, "id" | "x" | "y" | "zIndex">) => void;
}

const ELEMENT_TOOLS: {
  type: ElementType | "upload";
  label: string;
  icon: React.ReactNode;
  description: string;
  create?: () => Omit<DocumentElement, "id" | "x" | "y" | "zIndex">;
}[] = [
  {
    type: "heading", label: "Heading", description: "Large title text",
    icon: <Heading1 size={17} />,
    create: () => ({
      type: "heading", width: 500, height: 44, content: "Your Heading Here",
      textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 22, fontWeight: "bold", color: "#1E3A5F", textAlign: "center" },
    }),
  },
  {
    type: "subheading", label: "Subheading", description: "Medium subtitle text",
    icon: <Heading2 size={17} />,
    create: () => ({
      type: "subheading", width: 500, height: 32, content: "Sub Heading",
      textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 15, fontWeight: "bold", color: "#5C5D5D", textAlign: "center" },
    }),
  },
  {
    type: "paragraph", label: "Paragraph", description: "Body paragraph text",
    icon: <AlignLeft size={17} />,
    create: () => ({
      type: "paragraph", width: 600, height: 80,
      content: "Start typing your paragraph here. Double-click to edit.",
      textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 13, lineHeight: 1.7, textAlign: "justify" },
    }),
  },
  {
    type: "image", label: "Image", description: "Insert an image",
    icon: <Image size={17} />,
    create: () => ({ type: "image", width: 200, height: 150, content: "", imageStyle: { ...DEFAULT_IMAGE_STYLE } }),
  },
  {
    type: "logo", label: "Logo", description: "School logo",
    icon: <Building2 size={17} />,
    create: () => ({ type: "logo", width: 80, height: 80, content: "/logo.png", imageStyle: { ...DEFAULT_IMAGE_STYLE } }),
  },
  {
    type: "table", label: "Table", description: "Insert a data table",
    icon: <Table2 size={17} />,
    create: () => ({
      type: "table", width: 600, height: 180,
      tableData: {
        rows: 3, cols: 3, headerRow: true, cellPadding: 8, borderWidth: 1, borderColor: "#E0E0E0",
        cells: [["Header 1", "Header 2", "Header 3"], ["Cell", "Cell", "Cell"], ["Cell", "Cell", "Cell"]],
      },
    }),
  },
  {
    type: "divider", label: "Divider", description: "Decorative divider",
    icon: <Minus size={17} />,
    create: () => ({ type: "divider", width: 500, height: 3, textStyle: { ...DEFAULT_TEXT_STYLE, backgroundColor: "#1E3A5F" } }),
  },
  {
    type: "horizontalLine", label: "H. Line", description: "Horizontal separator",
    icon: <MoveHorizontal size={17} />,
    create: () => ({ type: "horizontalLine", width: 600, height: 1, textStyle: { ...DEFAULT_TEXT_STYLE, backgroundColor: "#E0E0E0" } }),
  },
  {
    type: "verticalLine", label: "V. Line", description: "Vertical separator",
    icon: <MoveVertical size={17} />,
    create: () => ({ type: "verticalLine", width: 2, height: 100, textStyle: { ...DEFAULT_TEXT_STYLE, backgroundColor: "#E0E0E0" } }),
  },
  {
    type: "pageBreak", label: "Page Break", description: "Force a new page",
    icon: <Scissors size={17} />,
    create: () => ({ type: "pageBreak", width: 600, height: 32, content: "" }),
  },
  {
    type: "shape" as ElementType, label: "Rectangle", description: "Insert a rectangle shape",
    icon: <Square size={17} />,
    create: () => ({
      type: "shape" as ElementType, width: 200, height: 120, shapeVariant: "rectangle",
      textStyle: { ...DEFAULT_TEXT_STYLE, backgroundColor: "#1E3A5F", color: "#1E3A5F" },
    }),
  },
  {
    type: "shape" as ElementType, label: "Circle", description: "Insert a circle shape",
    icon: <Circle size={17} />,
    create: () => ({
      type: "shape" as ElementType, width: 120, height: 120, shapeVariant: "circle",
      textStyle: { ...DEFAULT_TEXT_STYLE, backgroundColor: "#1E3A5F", color: "#1E3A5F" },
    }),
  },
];

// ── Turbo AI style left nav icons ─────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "elements", icon: <StickyNote size={18} />, label: "Elements", tooltip: "Insert Elements" },
  { id: "variables", icon: <Variable size={18} />, label: "Variables", tooltip: "Template Variables" },
  { id: "assistant", icon: <MessageSquare size={18} />, label: "AI", tooltip: "AI Assistant" },
  { id: "voice", icon: <Mic size={18} />, label: "Voice", tooltip: "Voice Notes" },
  { id: "files", icon: <FolderOpen size={18} />, label: "Files", tooltip: "Files & Media" },
  { id: "outline", icon: <List size={18} />, label: "Outline", tooltip: "Document Outline" },
  { id: "theme", icon: <Palette size={18} />, label: "Theme", tooltip: "Theme & Style" },
];

export function LeftToolbar({ onInsert }: LeftToolbarProps) {
  const [activePanel, setActivePanel] = useState<string | null>("elements");
  const [showVars, setShowVars] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  const handleNavClick = (id: string) => {
    if (id === "variables") {
      setShowVars(p => !p);
      setActivePanel(id === activePanel ? null : id);
      return;
    }
    if (id === "files") {
      // Trigger file upload
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          onInsert({ type: "image", width: 250, height: 180, content: evt.target?.result as string, imageStyle: { ...DEFAULT_IMAGE_STYLE } });
        };
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }
    setActivePanel(prev => prev === id ? null : id);
  };

  const isPanelOpen = activePanel === "elements";

  return (
    <>
      <style>{`
        .lt-nav-btn:hover .lt-tooltip {
          opacity: 1 !important;
          transform: translateX(0) !important;
        }
        .lt-el-btn:hover {
          background: rgba(124,58,237,0.08) !important;
          color: #7C3AED !important;
        }
      `}</style>

      <div style={{ display: "flex", height: "100%", flexShrink: 0, position: "relative" }}>

        {/* ── Turbo AI Floating Sidebar ──────────────────────────────────── */}
        <div style={{
          width: 56, height: "100%",
          background: "#0F2336",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          display: "flex", flexDirection: "column", alignItems: "center",
          paddingTop: 14, paddingBottom: 14, gap: 2,
          overflowY: "auto", flexShrink: 0, position: "relative", zIndex: 25,
        }}>
          {NAV_ITEMS.map(item => {
            const isActive = activePanel === item.id;
            return (
              <div key={item.id} className="lt-nav-btn" style={{ position: "relative", width: "100%" }}>
                <button
                  onClick={() => handleNavClick(item.id)}
                  onMouseEnter={() => setHoveredNav(item.id)}
                  onMouseLeave={() => setHoveredNav(null)}
                  title={item.tooltip}
                  style={{
                    width: "100%", display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", gap: 3, padding: "9px 4px", border: "none",
                    borderRadius: 0, cursor: "pointer", transition: "all 0.15s",
                    background: isActive ? "rgba(124,58,237,0.25)" : "transparent",
                    color: isActive ? "#A78BFA" : hoveredNav === item.id ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)",
                    borderLeft: isActive ? "2px solid #7C3AED" : "2px solid transparent",
                    fontSize: 9, fontWeight: 700, letterSpacing: 0.3,
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
                {/* Tooltip */}
                <div className="lt-tooltip" style={{
                  position: "absolute", left: "calc(100% + 8px)", top: "50%", transform: "translateX(-4px) translateY(-50%)",
                  background: "#0F2336", color: "white", borderRadius: 6, padding: "5px 10px",
                  fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.1)",
                  pointerEvents: "none", zIndex: 1000, opacity: 0, transition: "opacity 0.15s, transform 0.15s",
                }}>
                  {item.tooltip}
                  <div style={{ position: "absolute", left: -5, top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderRight: "5px solid #0F2336" }} />
                </div>
              </div>
            );
          })}

          {/* User avatar at bottom */}
          <div style={{ flex: 1 }} />
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #7C3AED, #4F46E5)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }} title="User Profile">
            <UserCircle2 size={20} style={{ color: "white" }} />
          </div>
        </div>

        {/* ── Elements Panel (slide-out) ──────────────────────────────────── */}
        {isPanelOpen && (
          <div style={{
            width: 200, height: "100%", background: "white",
            borderRight: "1px solid #E8EDF4",
            display: "flex", flexDirection: "column",
            overflowY: "auto", flexShrink: 0, zIndex: 20,
            boxShadow: "4px 0 16px rgba(0,0,0,0.05)",
          }}>
            {/* Panel header */}
            <div style={{
              padding: "14px 14px 10px",
              borderBottom: "1px solid #F1F5F9",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#0F172A", letterSpacing: -0.2 }}>Insert Elements</div>
                <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>Click to add to canvas</div>
              </div>
              <button
                onClick={() => setActivePanel(null)}
                style={{ width: 24, height: 24, border: "none", background: "#F1F5F9", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", flexShrink: 0 }}
              >
                <X size={12} />
              </button>
            </div>

            {/* Element list */}
            <div style={{ padding: "8px 8px", display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
              {ELEMENT_TOOLS.map((tool, i) => {
                if (!tool.create) return null;
                const key = `${tool.type}-${i}`;
                return (
                  <button
                    key={key}
                    className="lt-el-btn"
                    onClick={() => tool.create && onInsert(tool.create())}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 10px", border: "none", borderRadius: 8,
                      background: "transparent", cursor: "pointer", textAlign: "left",
                      color: "#374151", transition: "all 0.12s",
                    }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 7, background: "#F5F3FF",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#7C3AED", flexShrink: 0, transition: "background 0.12s",
                    }}>
                      {tool.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "inherit", lineHeight: 1.2 }}>{tool.label}</div>
                      <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>{tool.description}</div>
                    </div>
                    <ChevronRight size={12} style={{ marginLeft: "auto", opacity: 0.3, flexShrink: 0 }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Variables Panel ─────────────────────────────────────────────── */}
        {showVars && activePanel === "variables" && (
          <VariablesPanel onInsert={el => onInsert(el)} onClose={() => { setShowVars(false); setActivePanel(null); }} />
        )}

        {/* ── AI Assistant placeholder panel ──────────────────────────────── */}
        {activePanel === "assistant" && (
          <div style={{
            width: 260, height: "100%", background: "white",
            borderRight: "1px solid #E8EDF4",
            display: "flex", flexDirection: "column", zIndex: 20,
            boxShadow: "4px 0 16px rgba(0,0,0,0.05)",
          }}>
            <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#0F172A" }}>AI Assistant</div>
                <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>Ask anything about this document</div>
              </div>
              <button onClick={() => setActivePanel(null)} style={{ width: 24, height: 24, border: "none", background: "#F1F5F9", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8" }}><X size={12} /></button>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #7C3AED, #4F46E5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MessageSquare size={24} style={{ color: "white" }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>AI Assistant</div>
                <div style={{ fontSize: 11, color: "#64748B", marginTop: 4, lineHeight: 1.5 }}>
                  AI writing assistance is available in the Premium plan.
                </div>
              </div>
              <button style={{
                padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, #7C3AED, #6D28D9)", color: "white",
                fontSize: 12, fontWeight: 700, marginTop: 4,
              }}>
                Upgrade to Premium
              </button>
            </div>
          </div>
        )}

        {/* ── Outline panel ────────────────────────────────────────────────── */}
        {activePanel === "outline" && (
          <div style={{
            width: 220, height: "100%", background: "white",
            borderRight: "1px solid #E8EDF4", zIndex: 20,
            boxShadow: "4px 0 16px rgba(0,0,0,0.05)",
          }}>
            <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#0F172A" }}>Document Outline</div>
                <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>Headings & sections</div>
              </div>
              <button onClick={() => setActivePanel(null)} style={{ width: 24, height: 24, border: "none", background: "#F1F5F9", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8" }}><X size={12} /></button>
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "center", marginTop: 24 }}>
                Outline will appear as you add headings to your document.
              </div>
            </div>
          </div>
        )}

        {/* ── Theme panel ──────────────────────────────────────────────────── */}
        {activePanel === "theme" && (
          <div style={{
            width: 220, height: "100%", background: "white",
            borderRight: "1px solid #E8EDF4", zIndex: 20,
            boxShadow: "4px 0 16px rgba(0,0,0,0.05)",
          }}>
            <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#0F172A" }}>Theme & Style</div>
                <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 1 }}>Page colors & accents</div>
              </div>
              <button onClick={() => setActivePanel(null)} style={{ width: 24, height: 24, border: "none", background: "#F1F5F9", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8" }}><X size={12} /></button>
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#64748B", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>Accent Colors</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["#7C3AED", "#2563EB", "#059669", "#DC2626", "#D97706", "#0891B2", "#0F172A", "#64748B"].map(c => (
                  <div key={c} title={c} style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer", border: "2px solid white", boxShadow: "0 0 0 1.5px #E2E8F0", transition: "transform 0.1s" }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform = "scale(1.15)")}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.transform = "scale(1)")}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
