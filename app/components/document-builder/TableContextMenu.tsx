"use client";

import React, { useEffect, useRef } from "react";

export interface TableContextMenuState {
  x: number;
  y: number;
  elementId: string;
  row: number;
  col: number;
}

interface TableContextMenuProps {
  menu: TableContextMenuState | null;
  onClose: () => void;
  onAction: (elementId: string, action: string, row: number, col: number) => void;
}

const MENU_ITEMS = [
  { group: "cell", items: [
    { action: "copyCell",  label: "Copy Cell", icon: "⎘" },
    { action: "pasteCell", label: "Paste Cell", icon: "⎘" },
    { action: "clearCell", label: "Clear Content", icon: "✕" },
  ]},
  { group: "merge", items: [
    { action: "merge",  label: "Merge Cells",  icon: "⊞" },
    { action: "split",  label: "Split Cell",   icon: "⊟" },
  ]},
  { group: "row", items: [
    { action: "addRowAbove",  label: "Insert Row Above", icon: "↑" },
    { action: "addRowBelow",  label: "Insert Row Below", icon: "↓" },
    { action: "duplicateRow", label: "Duplicate Row",    icon: "❑" },
    { action: "deleteRow",    label: "Delete Row",       icon: "—", danger: true },
  ]},
  { group: "col", items: [
    { action: "addColLeft",    label: "Insert Column Left",    icon: "←" },
    { action: "addColRight",   label: "Insert Column Right",   icon: "→" },
    { action: "duplicateCol",  label: "Duplicate Column",      icon: "❑" },
    { action: "deleteCol",     label: "Delete Column",         icon: "—", danger: true },
  ]},
];

export function TableContextMenu({ menu, onClose, onAction }: TableContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  // Clamp to viewport
  const menuW = 200;
  const menuH = 280;
  const clampedX = Math.min(menu.x, window.innerWidth - menuW - 8);
  const clampedY = Math.min(menu.y, window.innerHeight - menuH - 8);

  return (
    <>
      <style>{`
        @keyframes ctx-in {
          from { opacity: 0; transform: scale(0.96) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .ctx-item:hover {
          background: #F1F5F9 !important;
        }
        .ctx-item-danger:hover {
          background: #FEF2F2 !important;
          color: #DC2626 !important;
        }
      `}</style>
      <div
        ref={ref}
        style={{
          position: "fixed",
          left: clampedX,
          top: clampedY,
          zIndex: 99999,
          background: "white",
          borderRadius: 10,
          border: "1px solid #E2E8F0",
          boxShadow: "0 10px 30px -5px rgba(0,0,0,0.12), 0 4px 12px -4px rgba(0,0,0,0.08)",
          padding: "4px 0",
          minWidth: menuW,
          animation: "ctx-in 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
          userSelect: "none",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {MENU_ITEMS.map((group, gi) => (
          <React.Fragment key={group.group}>
            {gi > 0 && (
              <div style={{ height: 1, background: "#F1F5F9", margin: "3px 0" }} />
            )}
            {group.items.map((item) => (
              <button
                key={item.action}
                className={`ctx-item${(item as any).danger ? " ctx-item-danger" : ""}`}
                onClick={() => {
                  onAction(menu.elementId, item.action, menu.row, menu.col);
                  onClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "7px 14px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: (item as any).danger ? "#EF4444" : "#1E293B",
                  textAlign: "left",
                  transition: "background 0.1s",
                }}
              >
                <span style={{ fontSize: 13, width: 18, textAlign: "center", flexShrink: 0 }}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </React.Fragment>
        ))}
      </div>
    </>
  );
}
