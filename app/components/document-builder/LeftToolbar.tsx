"use client";

import React, { useState } from "react";
import {
  Heading1, Heading2, AlignLeft, Image, Building2, Table2,
  Minus, MoveHorizontal, MoveVertical, Scissors, Variable,
  Upload, Square, Circle
} from "lucide-react";
import type { ElementType, DocumentElement } from "./types";
import { DEFAULT_TEXT_STYLE, DEFAULT_IMAGE_STYLE } from "./types";
import { VariablesPanel } from "./VariablesPanel";

interface LeftToolbarProps {
  onInsert: (element: Omit<DocumentElement, "id" | "x" | "y" | "zIndex">) => void;
}

const TOOLS: {
  type: ElementType;
  label: string;
  icon: React.ReactNode;
  description: string;
  create: () => Omit<DocumentElement, "id" | "x" | "y" | "zIndex">;
}[] = [
  {
    type: "heading",
    label: "Heading",
    icon: <Heading1 size={18} />,
    description: "Large title text",
    create: () => ({
      type: "heading", width: 500, height: 44, content: "Your Heading Here",
      textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 22, fontWeight: "bold", color: "#1E3A5F", textAlign: "center" },
    }),
  },
  {
    type: "subheading",
    label: "Sub Heading",
    icon: <Heading2 size={18} />,
    description: "Medium subtitle text",
    create: () => ({
      type: "subheading", width: 500, height: 32, content: "Sub Heading",
      textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 15, fontWeight: "bold", color: "#5C5D5D", textAlign: "center" },
    }),
  },
  {
    type: "paragraph",
    label: "Paragraph",
    icon: <AlignLeft size={18} />,
    description: "Body paragraph text",
    create: () => ({
      type: "paragraph", width: 600, height: 80,
      content: "Start typing your paragraph here. Double-click to edit.",
      textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 13, lineHeight: 1.7, textAlign: "justify" },
    }),
  },
  {
    type: "image",
    label: "Image",
    icon: <Image size={18} />,
    description: "Insert an image",
    create: () => ({
      type: "image", width: 200, height: 150, content: "",
      imageStyle: { ...DEFAULT_IMAGE_STYLE },
    }),
  },
  {
    type: "logo",
    label: "Logo",
    icon: <Building2 size={18} />,
    description: "School logo",
    create: () => ({
      type: "logo", width: 80, height: 80, content: "/logo.png",
      imageStyle: { ...DEFAULT_IMAGE_STYLE },
    }),
  },
  {
    type: "table",
    label: "Table",
    icon: <Table2 size={18} />,
    description: "Insert a table",
    create: () => ({
      type: "table", width: 600, height: 180,
      tableData: {
        rows: 3, cols: 3, headerRow: true, cellPadding: 8, borderWidth: 1, borderColor: "#E0E0E0",
        cells: [
          ["Header 1", "Header 2", "Header 3"],
          ["Cell", "Cell", "Cell"],
          ["Cell", "Cell", "Cell"],
        ],
      },
    }),
  },
  {
    type: "divider",
    label: "Divider",
    icon: <Minus size={18} />,
    description: "Decorative divider",
    create: () => ({
      type: "divider", width: 500, height: 3,
      textStyle: { ...DEFAULT_TEXT_STYLE, backgroundColor: "#1E3A5F" },
    }),
  },
  {
    type: "horizontalLine",
    label: "H. Line",
    icon: <MoveHorizontal size={18} />,
    description: "Horizontal separator",
    create: () => ({
      type: "horizontalLine", width: 600, height: 1,
      textStyle: { ...DEFAULT_TEXT_STYLE, backgroundColor: "#E0E0E0" },
    }),
  },
  {
    type: "verticalLine",
    label: "V. Line",
    icon: <MoveVertical size={18} />,
    description: "Vertical separator",
    create: () => ({
      type: "verticalLine", width: 2, height: 100,
      textStyle: { ...DEFAULT_TEXT_STYLE, backgroundColor: "#E0E0E0" },
    }),
  },
  {
    type: "pageBreak",
    label: "Page Break",
    icon: <Scissors size={18} />,
    description: "Force a new page",
    create: () => ({
      type: "pageBreak", width: 600, height: 32, content: "",
    }),
  },
  {
    type: "shape" as ElementType,
    label: "Rectangle",
    icon: <Square size={18} />,
    description: "Insert a rectangle shape",
    create: () => ({
      type: "shape" as ElementType, width: 200, height: 120,
      shapeVariant: "rectangle",
      textStyle: { ...DEFAULT_TEXT_STYLE, backgroundColor: "#1E3A5F", color: "#1E3A5F" },
    }),
  },
  {
    type: "shape" as ElementType,
    label: "Circle",
    icon: <Circle size={18} />,
    description: "Insert a circle shape",
    create: () => ({
      type: "shape" as ElementType, width: 120, height: 120,
      shapeVariant: "circle",
      textStyle: { ...DEFAULT_TEXT_STYLE, backgroundColor: "#1E3A5F", color: "#1E3A5F" },
    }),
  },
];

export function LeftToolbar({ onInsert }: LeftToolbarProps) {
  const [showVars, setShowVars] = useState(false);
  const [hovered, setHovered]  = useState<string | null>(null);

  const handleUpload = () => {
    const input   = document.createElement("input");
    input.type    = "file";
    input.accept  = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        onInsert({
          type: "image", width: 250, height: 180,
          content: evt.target?.result as string,
          imageStyle: { ...DEFAULT_IMAGE_STYLE },
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const base: React.CSSProperties = {
    width: "100%", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    gap: 2, padding: "10px 4px", border: "none",
    background: "transparent", cursor: "pointer",
    borderRadius: 8, transition: "all 0.15s",
    fontSize: 10, fontWeight: 600, letterSpacing: 0.3,
    position: "relative",
  };

  return (
    <div style={{
      width: 64, height: "100%", background: "#0F2336",
      borderRight: "1px solid rgba(255,255,255,0.08)",
      display: "flex", flexDirection: "column", alignItems: "center",
      paddingTop: 12, paddingBottom: 12, gap: 2,
      overflowY: "auto", flexShrink: 0, position: "relative", zIndex: 20,
    }}>
      {TOOLS.map((tool, i) => {
        const key = `${tool.type}-${i}`;
        return (
          <div key={key} style={{ position: "relative", width: "100%" }}>
            <button
              title={tool.label}
              onClick={() => onInsert(tool.create())}
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered(null)}
              style={{
                ...base,
                background: hovered === key ? "rgba(255,255,255,0.08)" : "transparent",
                color: hovered === key ? "white" : "rgba(255,255,255,0.6)",
              }}
            >
              {tool.icon}
              <span>{tool.label}</span>
            </button>
            {hovered === key && (
              <div style={{
                position: "absolute", left: "calc(100% + 8px)", top: "50%",
                transform: "translateY(-50%)", background: "#0F2336", color: "white",
                borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 500,
                whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.1)", pointerEvents: "none", zIndex: 1000,
              }}>
                {tool.description}
                <div style={{ position: "absolute", left: -5, top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderRight: "5px solid #0F2336" }} />
              </div>
            )}
          </div>
        );
      })}

      {/* Divider */}
      <div style={{ width: "80%", height: 1, background: "rgba(255,255,255,0.1)", margin: "6px 0" }} />

      {/* Variables */}
      <div style={{ position: "relative", width: "100%" }}>
        <button
          title="Variables"
          onClick={() => setShowVars((p) => !p)}
          onMouseEnter={() => setHovered("variable")}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...base,
            background: showVars ? "rgba(99,102,241,0.25)" : hovered === "variable" ? "rgba(255,255,255,0.08)" : "transparent",
            color:      showVars ? "#818CF8"               : hovered === "variable" ? "white"                  : "rgba(255,255,255,0.6)",
          }}
        >
          <Variable size={18} />
          <span>Variables</span>
          {showVars && (
            <div style={{ position: "absolute", top: 6, right: 6, width: 6, height: 6, borderRadius: "50%", background: "#818CF8" }} />
          )}
        </button>

        {showVars && (
          <VariablesPanel
            onInsert={(el) => onInsert(el)}
            onClose={() => setShowVars(false)}
          />
        )}
      </div>

      {/* Upload */}
      <button
        title="Upload Image"
        onClick={handleUpload}
        onMouseEnter={() => setHovered("upload")}
        onMouseLeave={() => setHovered(null)}
        style={{
          ...base,
          background: hovered === "upload" ? "rgba(255,255,255,0.08)" : "transparent",
          color:      hovered === "upload" ? "white"                  : "rgba(255,255,255,0.6)",
        }}
      >
        <Upload size={18} />
        <span>Upload</span>
      </button>
    </div>
  );
}
