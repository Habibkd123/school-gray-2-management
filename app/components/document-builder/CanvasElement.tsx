"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import type { DocumentElement, TextStyle, ImageStyle } from "./types";
import { findVariable } from "./variable-definitions";

// ── TableInsertHandles ───────────────────────────────────────────────────────
function TableInsertHandles({
  element,
  onUpdate,
  zoom,
}: {
  element: DocumentElement;
  onUpdate: (id: string, updates: Partial<DocumentElement>) => void;
  zoom: number;
}) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [popover, setPopover] = useState<{ type: "row" | "col"; index: number } | null>(null);

  if (!element.tableData) return null;
  const { rows, cols, cells } = element.tableData;
  const colWidths = element.tableData.colWidths || Array(cols).fill(element.width / cols);
  const rowHeights = element.tableData.rowHeights || Array(rows).fill(element.height / rows);
  const spans = element.tableData.spans || Array.from({ length: rows }, () => Array(cols).fill({}));

  const runTableCmd = (cmd: string, index: number) => {
    const tData = element.tableData!;
    const cWidths = tData.colWidths || Array(tData.cols).fill(element.width / tData.cols);
    const rHeights = tData.rowHeights || Array(tData.rows).fill(element.height / tData.rows);
    const sp = tData.spans || Array.from({ length: tData.rows }, () => Array(tData.cols).fill({}));

    if (cmd === "addRowAbove" || cmd === "addRowBelow") {
      const insertIdx = cmd === "addRowAbove" ? index : index + 1;
      const newCells = [...tData.cells];
      newCells.splice(insertIdx, 0, Array(tData.cols).fill(""));
      const newOrig = tData.originalCells ? [...tData.originalCells] : [...tData.cells];
      newOrig.splice(insertIdx, 0, Array(tData.cols).fill(""));
      const newHeights = [...rHeights]; newHeights.splice(insertIdx, 0, 32);
      const newSpans = [...sp]; newSpans.splice(insertIdx, 0, Array(tData.cols).fill({}));
      onUpdate(element.id, {
        height: newHeights.reduce((s, h) => s + h, 0),
        tableData: { ...tData, rows: tData.rows + 1, cells: newCells, originalCells: newOrig, rowHeights: newHeights, spans: newSpans },
      });
      if ((window as any).__shiftElementsBelow) (window as any).__shiftElementsBelow(element.id, 32);
    } else if (cmd === "deleteRow") {
      if (tData.rows <= 1) return;
      const newCells = [...tData.cells]; newCells.splice(index, 1);
      const newOrig = tData.originalCells ? [...tData.originalCells] : [...tData.cells]; newOrig.splice(index, 1);
      const deletedH = rHeights[index] || 32;
      const newHeights = [...rHeights]; newHeights.splice(index, 1);
      const newSpans = [...sp]; newSpans.splice(index, 1);
      onUpdate(element.id, {
        height: newHeights.reduce((s, h) => s + h, 0),
        tableData: { ...tData, rows: tData.rows - 1, cells: newCells, originalCells: newOrig, rowHeights: newHeights, spans: newSpans },
      });
      if ((window as any).__shiftElementsBelow) (window as any).__shiftElementsBelow(element.id, -deletedH);
    } else if (cmd === "duplicateRow") {
      const newCells = [...tData.cells]; newCells.splice(index + 1, 0, [...tData.cells[index]]);
      const newOrig = tData.originalCells ? [...tData.originalCells] : [...tData.cells]; newOrig.splice(index + 1, 0, [...(tData.originalCells || tData.cells)[index]]);
      const dupH = rHeights[index] || 32;
      const newHeights = [...rHeights]; newHeights.splice(index + 1, 0, dupH);
      const newSpans = [...sp]; newSpans.splice(index + 1, 0, sp[index].map((s: any) => ({ ...s })));
      onUpdate(element.id, {
        height: newHeights.reduce((s, h) => s + h, 0),
        tableData: { ...tData, rows: tData.rows + 1, cells: newCells, originalCells: newOrig, rowHeights: newHeights, spans: newSpans },
      });
      if ((window as any).__shiftElementsBelow) (window as any).__shiftElementsBelow(element.id, dupH);
    } else if (cmd === "addColLeft" || cmd === "addColRight") {
      const insertIdx = cmd === "addColLeft" ? index : index + 1;
      const newCells = tData.cells.map(row => { const r = [...row]; r.splice(insertIdx, 0, ""); return r; });
      const newOrig = (tData.originalCells || tData.cells).map(row => { const r = [...row]; r.splice(insertIdx, 0, ""); return r; });
      const newWidths = [...cWidths]; newWidths.splice(insertIdx, 0, 80);
      const newSpans = sp.map((row: any[]) => { const r = [...row]; r.splice(insertIdx, 0, {}); return r; });
      onUpdate(element.id, {
        width: newWidths.reduce((s, w) => s + w, 0),
        tableData: { ...tData, cols: tData.cols + 1, cells: newCells, originalCells: newOrig, colWidths: newWidths, spans: newSpans },
      });
    } else if (cmd === "deleteCol") {
      if (tData.cols <= 1) return;
      const newCells = tData.cells.map(row => { const r = [...row]; r.splice(index, 1); return r; });
      const newOrig = (tData.originalCells || tData.cells).map(row => { const r = [...row]; r.splice(index, 1); return r; });
      const newWidths = [...cWidths]; newWidths.splice(index, 1);
      const newSpans = sp.map((row: any[]) => { const r = [...row]; r.splice(index, 1); return r; });
      onUpdate(element.id, {
        width: newWidths.reduce((s, w) => s + w, 0),
        tableData: { ...tData, cols: tData.cols - 1, cells: newCells, originalCells: newOrig, colWidths: newWidths, spans: newSpans },
      });
    } else if (cmd === "duplicateCol") {
      const newCells = tData.cells.map(row => { const r = [...row]; r.splice(index + 1, 0, row[index]); return r; });
      const newOrig = (tData.originalCells || tData.cells).map(row => { const r = [...row]; r.splice(index + 1, 0, row[index]); return r; });
      const dupW = cWidths[index] || 80;
      const newWidths = [...cWidths]; newWidths.splice(index + 1, 0, dupW);
      const newSpans = sp.map((row: any[]) => { const r = [...row]; r.splice(index + 1, 0, { ...row[index] }); return r; });
      onUpdate(element.id, {
        width: newWidths.reduce((s, w) => s + w, 0),
        tableData: { ...tData, cols: tData.cols + 1, cells: newCells, originalCells: newOrig, colWidths: newWidths, spans: newSpans },
      });
    }
    setPopover(null);
  };

  // Build cumulative positions for row/col handle placement
  let cumulativeY = 0;
  const rowYPositions: number[] = [];
  for (let r = 0; r <= rows; r++) {
    rowYPositions.push(cumulativeY);
    if (r < rows) cumulativeY += rowHeights[r] || 32;
  }

  let cumulativeX = 0;
  const colXPositions: number[] = [];
  for (let c = 0; c <= cols; c++) {
    colXPositions.push(cumulativeX);
    if (c < cols) cumulativeX += colWidths[c] || 80;
  }

  const HANDLE_SZ = 16;
  const ROW_ACTIONS = [
    { action: "addRowAbove",  label: "Insert Above" },
    { action: "addRowBelow",  label: "Insert Below" },
    { action: "duplicateRow", label: "Duplicate" },
    { action: "deleteRow",    label: "Delete",    danger: true },
  ];
  const COL_ACTIONS = [
    { action: "addColLeft",   label: "Insert Left" },
    { action: "addColRight",  label: "Insert Right" },
    { action: "duplicateCol", label: "Duplicate" },
    { action: "deleteCol",    label: "Delete",   danger: true },
  ];

  return (
    <>
      <style>{`
        @keyframes handle-in { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }
        .tbl-handle { animation: handle-in 0.12s ease-out; }
        .tbl-handle:hover { background: #2563EB !important; color: white !important; transform: scale(1.15) !important; }
        .tbl-popover-item:hover { background: #F1F5F9 !important; }
        .tbl-popover-item-danger:hover { background: #FEF2F2 !important; color: #DC2626 !important; }
      `}</style>

      {/* Row handles — left side, between each row */}
      {rowYPositions.slice(0, rows + 1).map((yPos, idx) => {
        // idx=0 is above row 0, idx=r is between row r-1 and r, idx=rows is below last row
        const isVisible = hoveredRow === idx;
        const midY = idx === 0 ? yPos : idx === rows ? yPos : (rowYPositions[idx - 1] + rowHeights[idx - 1] / 2 + rowYPositions[idx] - rowHeights[idx - 1] / 2) / 2;
        // Always show handle between existing rows; determine which row this inserts near
        const nearRow = idx > 0 ? idx - 1 : 0;
        return (
          <div
            key={`row-handle-${idx}`}
            className="tbl-handle"
            onMouseEnter={() => setHoveredRow(idx)}
            onMouseLeave={() => { if (popover?.type !== "row" || popover.index !== nearRow) setHoveredRow(null); }}
            onClick={(e) => {
              e.stopPropagation();
              setPopover(popover?.type === "row" && popover.index === nearRow ? null : { type: "row", index: nearRow });
            }}
            title={idx === 0 ? "Insert row above" : idx === rows ? "Insert row below" : "Row options"}
            style={{
              position: "absolute",
              left: -HANDLE_SZ - 6,
              top: yPos - HANDLE_SZ / 2,
              width: HANDLE_SZ,
              height: HANDLE_SZ,
              borderRadius: "50%",
              background: "#E0EAFB",
              border: "1.5px solid #93C5FD",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "#2563EB",
              cursor: "pointer",
              zIndex: 30,
              transition: "all 0.1s",
              userSelect: "none",
              boxShadow: "0 1px 4px rgba(37,99,235,0.18)",
            }}
          >
            +
            {/* Popover for row actions */}
            {popover?.type === "row" && popover.index === nearRow && (
              <div
                onMouseLeave={() => { setPopover(null); setHoveredRow(null); }}
                style={{
                  position: "absolute",
                  left: HANDLE_SZ + 4,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "white",
                  borderRadius: 8,
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12)",
                  padding: "4px 0",
                  zIndex: 9999,
                  minWidth: 155,
                  animation: "handle-in 0.12s ease-out",
                  whiteSpace: "nowrap",
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {ROW_ACTIONS.map((a) => (
                  <button
                    key={a.action}
                    className={`tbl-popover-item${(a as any).danger ? " tbl-popover-item-danger" : ""}`}
                    onMouseDown={(e) => { e.stopPropagation(); runTableCmd(a.action, nearRow); }}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "6px 14px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 500,
                      color: (a as any).danger ? "#EF4444" : "#1E293B",
                      textAlign: "left",
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Col handles — above each column */}
      {colXPositions.slice(0, cols + 1).map((xPos, idx) => {
        const nearCol = idx > 0 ? idx - 1 : 0;
        return (
          <div
            key={`col-handle-${idx}`}
            className="tbl-handle"
            onMouseEnter={() => setHoveredCol(idx)}
            onMouseLeave={() => { if (popover?.type !== "col" || popover.index !== nearCol) setHoveredCol(null); }}
            onClick={(e) => {
              e.stopPropagation();
              setPopover(popover?.type === "col" && popover.index === nearCol ? null : { type: "col", index: nearCol });
            }}
            title={idx === 0 ? "Insert column left" : idx === cols ? "Insert column right" : "Column options"}
            style={{
              position: "absolute",
              top: -HANDLE_SZ - 6,
              left: xPos - HANDLE_SZ / 2,
              width: HANDLE_SZ,
              height: HANDLE_SZ,
              borderRadius: "50%",
              background: "#E0EAFB",
              border: "1.5px solid #93C5FD",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "#2563EB",
              cursor: "pointer",
              zIndex: 30,
              transition: "all 0.1s",
              userSelect: "none",
              boxShadow: "0 1px 4px rgba(37,99,235,0.18)",
            }}
          >
            +
            {/* Popover for col actions */}
            {popover?.type === "col" && popover.index === nearCol && (
              <div
                onMouseLeave={() => { setPopover(null); setHoveredCol(null); }}
                style={{
                  position: "absolute",
                  top: HANDLE_SZ + 4,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "white",
                  borderRadius: 8,
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 8px 24px -4px rgba(0,0,0,0.12)",
                  padding: "4px 0",
                  zIndex: 9999,
                  minWidth: 155,
                  animation: "handle-in 0.12s ease-out",
                  whiteSpace: "nowrap",
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {COL_ACTIONS.map((a) => (
                  <button
                    key={a.action}
                    className={`tbl-popover-item${(a as any).danger ? " tbl-popover-item-danger" : ""}`}
                    onMouseDown={(e) => { e.stopPropagation(); runTableCmd(a.action, nearCol); }}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "6px 14px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 500,
                      color: (a as any).danger ? "#EF4444" : "#1E293B",
                      textAlign: "left",
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// ── ElementInsertHandle — "+" below any selected element ─────────────────────
function ElementInsertHandle({
  elementHeight,
  onAdd,
}: {
  elementHeight: number;
  onAdd: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: elementHeight + 8,
        transform: "translateX(-50%)",
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        gap: 4,
        cursor: "pointer",
        userSelect: "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); onAdd(); }}
      title="Add element below"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: hovered ? "#2563EB" : "white",
          border: `1.5px solid ${hovered ? "#2563EB" : "#CBD5E1"}`,
          borderRadius: 20,
          padding: "3px 10px 3px 7px",
          boxShadow: hovered ? "0 4px 12px rgba(37,99,235,0.25)" : "0 1px 4px rgba(0,0,0,0.08)",
          transition: "all 0.15s",
          fontSize: 11,
          fontWeight: 700,
          color: hovered ? "white" : "#64748B",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: 15, lineHeight: 1, marginTop: -1 }}>+</span>
        Add element
      </div>
    </div>
  );
}


interface SnapLines {
  vLines: number[]; // x positions (canvas-relative)
  hLines: number[]; // y positions (canvas-relative)
}

interface CanvasElementProps {
  element: DocumentElement;
  isSelected: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onUpdate: (id: string, updates: Partial<DocumentElement>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onNudge?: (id: string, dx: number, dy: number) => void;
  zoom: number;
  pageWidth: number;
  pageHeight: number;
  // Snap line emission
  onSnapLines?: (lines: SnapLines | null) => void;
  allElements?: DocumentElement[];
  /** When true, variable badges show their previewValue instead of the key */
  previewMode?: boolean;
}

const HANDLE_SIZE = 8;
const ROTATE_HANDLE_OFFSET = 24;
const SNAP_THRESHOLD = 6;

function getSnapLines(
  movingEl: DocumentElement,
  allEls: DocumentElement[],
  pageWidth: number,
  pageHeight: number
): SnapLines {
  const vLines: number[] = [];
  const hLines: number[] = [];

  const mLeft = movingEl.x;
  const mRight = movingEl.x + movingEl.width;
  const mCX = movingEl.x + movingEl.width / 2;
  const mTop = movingEl.y;
  const mBottom = movingEl.y + movingEl.height;
  const mCY = movingEl.y + movingEl.height / 2;

  // Page snap points
  const pageSnaps = {
    v: [0, pageWidth / 2, pageWidth],
    h: [0, pageHeight / 2, pageHeight],
  };

  pageSnaps.v.forEach((px) => {
    if (Math.abs(mLeft - px) < SNAP_THRESHOLD) vLines.push(px);
    if (Math.abs(mRight - px) < SNAP_THRESHOLD) vLines.push(px);
    if (Math.abs(mCX - px) < SNAP_THRESHOLD) vLines.push(px);
  });
  pageSnaps.h.forEach((py) => {
    if (Math.abs(mTop - py) < SNAP_THRESHOLD) hLines.push(py);
    if (Math.abs(mBottom - py) < SNAP_THRESHOLD) hLines.push(py);
    if (Math.abs(mCY - py) < SNAP_THRESHOLD) hLines.push(py);
  });

  // Element snap points
  allEls.forEach((el) => {
    if (el.id === movingEl.id) return;
    const eLeft = el.x, eRight = el.x + el.width, eCX = el.x + el.width / 2;
    const eTop = el.y, eBottom = el.y + el.height, eCY = el.y + el.height / 2;

    [eLeft, eRight, eCX].forEach((px) => {
      if (Math.abs(mLeft - px) < SNAP_THRESHOLD) vLines.push(px);
      if (Math.abs(mRight - px) < SNAP_THRESHOLD) vLines.push(px);
      if (Math.abs(mCX - px) < SNAP_THRESHOLD) vLines.push(px);
    });
    [eTop, eBottom, eCY].forEach((py) => {
      if (Math.abs(mTop - py) < SNAP_THRESHOLD) hLines.push(py);
      if (Math.abs(mBottom - py) < SNAP_THRESHOLD) hLines.push(py);
      if (Math.abs(mCY - py) < SNAP_THRESHOLD) hLines.push(py);
    });
  });

  return {
    vLines: [...new Set(vLines)],
    hLines: [...new Set(hLines)],
  };
}

function applySnap(
  x: number,
  y: number,
  w: number,
  h: number,
  allEls: DocumentElement[],
  selfId: string,
  pageWidth: number,
  pageHeight: number
): { x: number; y: number } {
  let nx = x, ny = y;

  const pageVSnaps = [0, pageWidth / 2, pageWidth];
  const pageHSnaps = [0, pageHeight / 2, pageHeight];

  const vCandidates = [
    ...pageVSnaps.map((px) => ({ px, diff: Math.abs(x - px), offset: 0 })),
    ...pageVSnaps.map((px) => ({ px, diff: Math.abs(x + w - px), offset: -w })),
    ...pageVSnaps.map((px) => ({ px, diff: Math.abs(x + w / 2 - px), offset: -w / 2 })),
  ];
  const hCandidates = [
    ...pageHSnaps.map((py) => ({ py, diff: Math.abs(y - py), offset: 0 })),
    ...pageHSnaps.map((py) => ({ py, diff: Math.abs(y + h - py), offset: -h })),
    ...pageHSnaps.map((py) => ({ py, diff: Math.abs(y + h / 2 - py), offset: -h / 2 })),
  ];

  allEls.forEach((el) => {
    if (el.id === selfId) return;
    [el.x, el.x + el.width, el.x + el.width / 2].forEach((px) => {
      vCandidates.push({ px, diff: Math.abs(x - px), offset: 0 });
      vCandidates.push({ px, diff: Math.abs(x + w - px), offset: -w });
      vCandidates.push({ px, diff: Math.abs(x + w / 2 - px), offset: -w / 2 });
    });
    [el.y, el.y + el.height, el.y + el.height / 2].forEach((py) => {
      hCandidates.push({ py, diff: Math.abs(y - py), offset: 0 });
      hCandidates.push({ py, diff: Math.abs(y + h - py), offset: -h });
      hCandidates.push({ py, diff: Math.abs(y + h / 2 - py), offset: -h / 2 });
    });
  });

  const bestV = vCandidates.reduce((a, b) => (a.diff < b.diff ? a : b));
  if (bestV.diff < SNAP_THRESHOLD) nx = bestV.px + bestV.offset;

  const bestH = hCandidates.reduce((a, b) => (a.diff < b.diff ? a : b));
  if (bestH.diff < SNAP_THRESHOLD) ny = bestH.py + bestH.offset;

  return { x: nx, y: ny };
}

export function CanvasElement({
  element,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onNudge,
  zoom,
  pageWidth,
  pageHeight,
  onSnapLines,
  allElements = [],
  previewMode = false,
}: CanvasElementProps) {
  const ref = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [resizeDir, setResizeDir] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [showVarInfo, setShowVarInfo] = useState(false);

  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, elX: 0, elY: 0 });
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, elX: 0, elY: 0, elW: 0, elH: 0 });
  const rotateStartRef = useRef({ cx: 0, cy: 0, angle: 0 });

  // Variables are NOT text-editable
  const isVariable   = element.type === "variable";
  const isTextElement = ["heading", "subheading", "paragraph"].includes(element.type);
  const isLocked = element.locked === true;
  const isHidden = element.visible === false;

  // Selected cell coordinates for merge/split (only applicable for tables)
  const [selectedCellCoords, setSelectedCellCoords] = useState<[number, number][]>([]);

  useEffect(() => {
    if (isSelected && isEditing) {
      (window as any).__selectedTableSelection = { elementId: element.id, coords: selectedCellCoords };
    } else if (!isSelected) {
      setSelectedCellCoords([]);
      if ((window as any).__selectedTableSelection?.elementId === element.id) {
        delete (window as any).__selectedTableSelection;
      }
    }
  }, [selectedCellCoords, isSelected, isEditing, element.id]);

  const handleCellClick = (e: React.MouseEvent, r: number, c: number) => {
    if (!isEditing) return;
    e.stopPropagation();
    if (e.shiftKey) {
      const exists = selectedCellCoords.some(([cr, cc]) => cr === r && cc === c);
      if (exists) {
        setSelectedCellCoords(selectedCellCoords.filter(([cr, cc]) => !(cr === r && cc === c)));
      } else {
        setSelectedCellCoords([...selectedCellCoords, [r, c]]);
      }
    } else {
      setSelectedCellCoords([[r, c]]);
    }
  };

  // ── Drag ────────────────────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isEditing) return;
      if ((e.target as HTMLElement).dataset.ignoreDrag) return;
      if (isLocked) {
        onSelect(element.id, e.shiftKey);
        return;
      }
      e.stopPropagation();
      onSelect(element.id, e.shiftKey);
      setIsDragging(true);
      dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, elX: element.x, elY: element.y };
    },
    [element.id, element.x, element.y, isEditing, isLocked, onSelect]
  );

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStartRef.current.mouseX) / zoom;
      const dy = (e.clientY - dragStartRef.current.mouseY) / zoom;
      let rawX = dragStartRef.current.elX + dx;
      let rawY = dragStartRef.current.elY + dy;

      // Snap
      const snapped = applySnap(rawX, rawY, element.width, element.height, allElements, element.id, pageWidth, pageHeight);
      const newX = Math.round(snapped.x);
      const newY = Math.round(snapped.y);

      onUpdate(element.id, { x: newX, y: newY });

      // Emit snap lines
      if (onSnapLines) {
        const tempEl = { ...element, x: newX, y: newY };
        const lines = getSnapLines(tempEl, allElements, pageWidth, pageHeight);
        onSnapLines(lines.vLines.length > 0 || lines.hLines.length > 0 ? lines : null);
      }
    };
    const onUp = () => {
      setIsDragging(false);
      onSnapLines?.(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, zoom, element, allElements, pageWidth, pageHeight, onUpdate, onSnapLines]);

  // ── Resize ──────────────────────────────────────────────────────────────
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, dir: string) => {
      if (isLocked) return;
      e.stopPropagation();
      e.preventDefault();
      setIsResizing(true);
      setResizeDir(dir);
      resizeStartRef.current = {
        mouseX: e.clientX, mouseY: e.clientY,
        elX: element.x, elY: element.y,
        elW: element.width, elH: element.height,
      };
    },
    [element.x, element.y, element.width, element.height, isLocked]
  );

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizeStartRef.current.mouseX) / zoom;
      const dy = (e.clientY - resizeStartRef.current.mouseY) / zoom;
      const { elX, elY, elW, elH } = resizeStartRef.current;
      let newX = elX, newY = elY, newW = elW, newH = elH;

      if (resizeDir.includes("e")) newW = Math.max(30, elW + dx);
      if (resizeDir.includes("s")) newH = Math.max(20, elH + dy);
      if (resizeDir.includes("w")) { newW = Math.max(30, elW - dx); newX = elX + (elW - newW); }
      if (resizeDir.includes("n")) { newH = Math.max(20, elH - dy); newY = elY + (elH - newH); }

      onUpdate(element.id, {
        x: Math.round(newX / 2) * 2,
        y: Math.round(newY / 2) * 2,
        width: Math.round(newW / 2) * 2,
        height: Math.round(newH / 2) * 2,
      });
    };
    const onUp = () => { setIsResizing(false); setResizeDir(""); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [isResizing, resizeDir, zoom, element.id, onUpdate]);

  // ── Rotate ──────────────────────────────────────────────────────────────
  const handleRotateMouseDown = useCallback((e: React.MouseEvent) => {
    if (isLocked) return;
    e.stopPropagation();
    e.preventDefault();
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setIsRotating(true);
    rotateStartRef.current = {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      angle: element.imageStyle?.rotation || 0,
    };
  }, [element.imageStyle?.rotation, isLocked]);

  useEffect(() => {
    if (!isRotating) return;
    const onMove = (e: MouseEvent) => {
      const { cx, cy } = rotateStartRef.current;
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 90;
      const snapped = Math.round(angle / 5) * 5; // 5° snap if shift held — simplified
      onUpdate(element.id, {
        imageStyle: {
          opacity: 1, borderRadius: 0, borderWidth: 0, borderColor: "#E0E0E0",
          boxShadow: "none", objectFit: "contain",
          ...element.imageStyle,
          rotation: Math.round(angle),
        },
      });
    };
    const onUp = () => setIsRotating(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [isRotating, element.id, element.imageStyle, onUpdate]);

  // ── Inline Editing ───────────────────────────────────────────────────────
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Variables: show info popup instead of text editing
    if (isVariable) {
      setShowVarInfo((p) => !p);
      return;
    }

    if ((!isTextElement && element.type !== "table") || isLocked) return;
    setIsEditing(true);

    if (element.type !== "table") {
      requestAnimationFrame(() => {
        const el = editableRef.current;
        if (!el) return;
        if (el.innerHTML !== (element.content || "")) {
          el.innerHTML = element.content || "";
        }
        el.focus();
        // Place cursor at the click point using caretRangeFromPoint / caretPositionFromPoint
        const range = document.caretRangeFromPoint
          ? document.caretRangeFromPoint(e.clientX, e.clientY)
          : null;
        if (range) {
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        } else {
          // Fallback: cursor at end
          const r = document.createRange();
          r.selectNodeContents(el);
          r.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(r);
        }
      });
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    setIsEditing(false);
    onUpdate(element.id, { content: e.currentTarget.innerHTML });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Triple-click select all is native, but Ctrl+A inside box
    if ((e.ctrlKey || e.metaKey) && e.key === "a") {
      e.stopPropagation();
      // Select all text inside this box
      const r = document.createRange();
      r.selectNodeContents(e.currentTarget);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);
      return;
    }
    if (e.key === "Escape") {
      if (editableRef.current) {
        onUpdate(element.id, { content: editableRef.current.innerHTML });
      }
      setIsEditing(false);
      e.currentTarget.blur();
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
  };

  // Exit edit mode when deselected
  useEffect(() => {
    if (!isSelected && isEditing) {
      if (editableRef.current) {
        onUpdate(element.id, { content: editableRef.current.innerHTML });
      }
      setIsEditing(false);
    }
  }, [isSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render content ───────────────────────────────────────────────────────
  const ts = element.textStyle;
  const is = element.imageStyle;
  const rotation = is?.rotation || 0;

  const colWidths = element.tableData?.colWidths || Array(element.tableData?.cols || 1).fill(element.width / (element.tableData?.cols || 1));
  const rowHeights = element.tableData?.rowHeights || Array(element.tableData?.rows || 1).fill(element.height / (element.tableData?.rows || 1));

  const handleColResizeStart = (e: React.MouseEvent, colIndex: number) => {
    e.stopPropagation();
    e.preventDefault();
    const startMouseX = e.clientX;
    const startWidths = [...colWidths];
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startMouseX) / zoom;
      const newWidths = [...startWidths];
      newWidths[colIndex] = Math.max(30, startWidths[colIndex] + dx);
      
      const newTotalWidth = newWidths.reduce((sum, w) => sum + w, 0);
      onUpdate(element.id, {
        width: newTotalWidth,
        tableData: {
          ...element.tableData!,
          colWidths: newWidths,
        }
      });
    };
    
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleRowResizeStart = (e: React.MouseEvent, rowIndex: number) => {
    e.stopPropagation();
    e.preventDefault();
    const startMouseY = e.clientY;
    const startHeights = [...rowHeights];
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const dy = (moveEvent.clientY - startMouseY) / zoom;
      const newHeights = [...startHeights];
      newHeights[rowIndex] = Math.max(20, startHeights[rowIndex] + dy);
      
      const newTotalHeight = newHeights.reduce((sum, h) => sum + h, 0);
      const heightDelta = newTotalHeight - element.height;
      
      onUpdate(element.id, {
        height: newTotalHeight,
        tableData: {
          ...element.tableData!,
          rowHeights: newHeights,
        }
      });
      
      if (heightDelta !== 0 && (window as any).__shiftElementsBelow) {
        (window as any).__shiftElementsBelow(element.id, heightDelta);
      }
    };
    
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const textCSS: React.CSSProperties = ts
    ? {
        fontFamily: ts.fontFamily,
        fontSize: ts.fontSize,
        fontWeight: ts.fontWeight,
        fontStyle: ts.fontStyle,
        textDecoration: ts.textDecoration,
        textAlign: ts.textAlign as React.CSSProperties["textAlign"],
        color: ts.color,
        backgroundColor: ts.backgroundColor === "transparent" ? undefined : ts.backgroundColor,
        letterSpacing: ts.letterSpacing,
        lineHeight: ts.lineHeight,
        padding: `${ts.paddingTop}px ${ts.paddingRight}px ${ts.paddingBottom}px ${ts.paddingLeft}px`,
        borderRadius: ts.borderRadius,
        border: ts.borderWidth ? `${ts.borderWidth}px solid ${ts.borderColor}` : undefined,
        boxShadow: ts.boxShadow === "none" ? undefined : ts.boxShadow,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        boxSizing: "border-box",
        wordBreak: "break-word",
        whiteSpace: "pre-wrap",
        outline: "none",
      }
    : {};

  const imgCSS: React.CSSProperties = is
    ? {
        opacity: is.opacity,
        borderRadius: is.borderRadius,
        border: is.borderWidth ? `${is.borderWidth}px solid ${is.borderColor}` : undefined,
        boxShadow: is.boxShadow === "none" ? undefined : is.boxShadow,
        width: "100%",
        height: "100%",
        objectFit: is.objectFit,
        pointerEvents: "none",
      }
    : {};

  const renderContent = () => {
    switch (element.type) {
      case "heading":
      case "subheading":
      case "paragraph":
        return (
          <div
            ref={editableRef}
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
              ...textCSS,
              cursor: isEditing ? "text" : "default",
              userSelect: isEditing ? "text" : "none",
            }}
            {...(!isEditing ? { dangerouslySetInnerHTML: { __html: element.content || "" } } : {})}
          />
        );

      case "variable": {
        // Resolve variable metadata
        const meta = element.variableMeta;
        const varKey   = meta?.key  || (element.content?.replace(/[{}]/g, "").trim() ?? "");
        const varLabel = meta?.label || varKey;
        const varCat   = meta?.categoryId || "custom";
        const preview  = meta?.previewValue || findVariable(varKey)?.previewValue || varKey;

        // Category colour map
        const catColors: Record<string, { bg: string; border: string; text: string }> = {
          student:    { bg: "#DBEAFE", border: "#93C5FD", text: "#1D4ED8" },
          parent:     { bg: "#CFFAFE", border: "#67E8F9", text: "#0E7490" },
          teacher:    { bg: "#D1FAE5", border: "#6EE7B7", text: "#065F46" },
          school:     { bg: "#EDE9FE", border: "#C4B5FD", text: "#5B21B6" },
          academic:   { bg: "#FEF3C7", border: "#FCD34D", text: "#92400E" },
          exam:       { bg: "#FEE2E2", border: "#FCA5A5", text: "#991B1B" },
          attendance: { bg: "#E0F2FE", border: "#7DD3FC", text: "#075985" },
          fees:       { bg: "#F3E8FF", border: "#D8B4FE", text: "#6D28D9" },
          salary:     { bg: "#D1FAE5", border: "#6EE7B7", text: "#064E3B" },
          system:     { bg: "#F1F5F9", border: "#CBD5E1", text: "#334155" },
          custom:     { bg: "#FFF7ED", border: "#FED7AA", text: "#9A3412" },
        };
        const col = catColors[varCat] ?? catColors.custom;

        if (previewMode) {
          // In preview mode: render as plain text with preview value
          return (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center",
              fontSize: ts?.fontSize || 13,
              fontFamily: ts?.fontFamily || "Roboto, sans-serif",
              color: ts?.color || "#1D4ED8",
              fontWeight: "bold",
              padding: "0 8px",
              overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
            }}>
              {preview}
            </div>
          );
        }

        // Edit mode: render as blue badge
        return (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center",
            padding: "0 2px",
          }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: col.bg,
              border: `1.5px solid ${col.border}`,
              borderRadius: 20,
              padding: "3px 10px 3px 6px",
              maxWidth: "100%",
              cursor: "grab",
            }}>
              {/* Dot */}
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: col.text, flexShrink: 0,
              }} />
              {/* Label */}
              <span style={{
                fontSize: 11.5, fontWeight: 800, color: col.text,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                letterSpacing: 0.2,
              }}>
                {varLabel}
              </span>
              {/* Key */}
              <span style={{
                fontSize: 9.5, fontWeight: 600, color: col.text + "99",
                fontFamily: "monospace", letterSpacing: 0.2,
              }}>
                {`{{${varKey}}}`}
              </span>
            </div>

            {/* Variable Info Popup */}
            {showVarInfo && isSelected && (
              <div
                style={{
                  position: "absolute", left: "100%", top: 0, marginLeft: 8,
                  background: "white", borderRadius: 10,
                  border: "1.5px solid #E2E8F0",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
                  padding: 12, zIndex: 9999, minWidth: 200, maxWidth: 260,
                  animation: "vars-in 0.12s ease-out",
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <style>{`@keyframes vars-in { from { opacity:0; transform:scale(0.95) translateX(-4px); } to { opacity:1; transform:none; } }`}</style>
                <div style={{ fontSize: 10, fontWeight: 800, color: col.text, letterSpacing: 0.5, marginBottom: 8, textTransform: "uppercase" }}>
                  {meta?.category || "Variable"} Variable
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", marginBottom: 4 }}>{varLabel}</div>
                <div style={{ fontSize: 10.5, color: "#475569", lineHeight: 1.5, marginBottom: 8 }}>
                  {meta?.description || findVariable(varKey)?.description || "Dynamic variable"}
                </div>
                <div style={{ background: col.bg, borderRadius: 6, padding: "6px 10px", marginBottom: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: col.text, letterSpacing: 0.5, marginBottom: 2 }}>KEY</div>
                  <code style={{ fontSize: 11, color: col.text, fontWeight: 700 }}>{`{{${varKey}}}`}</code>
                </div>
                <div style={{ background: "#F8FAFC", borderRadius: 6, padding: "6px 10px" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#64748B", letterSpacing: 0.5, marginBottom: 2 }}>PREVIEW VALUE</div>
                  <div style={{ fontSize: 11.5, color: "#1E293B", fontWeight: 600 }}>{preview}</div>
                </div>
                <button
                  onClick={() => setShowVarInfo(false)}
                  style={{
                    marginTop: 8, width: "100%", padding: "5px", borderRadius: 6,
                    border: "1.5px solid #E2E8F0", background: "white", fontSize: 11,
                    fontWeight: 700, color: "#64748B", cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        );
      }
      case "image":
      case "logo":
        return element.content ? (
          <img src={element.content} alt="element" style={imgCSS} />
        ) : (
          <div
            style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "#F1F5F9", border: "1.5px dashed #CBD5E1",
              borderRadius: 4, color: "#94A3B8", fontSize: 12, flexDirection: "column", gap: 4,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <span style={{ fontSize: 11, color: "#94A3B8" }}>{element.type === "logo" ? "Logo" : "Image"}</span>
          </div>
        );
      case "divider":
      case "horizontalLine":
        return (
          <div style={{ width: "100%", height: "100%", backgroundColor: ts?.color || "#1E3A5F", borderRadius: 2 }} />
        );
      case "verticalLine":
        return (
          <div style={{ width: "100%", height: "100%", backgroundColor: ts?.color || "#1E3A5F", borderRadius: 2 }} />
        );
      case "pageBreak":
        return (
          <div
            style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px dashed #CBD5E1", borderRadius: 4, color: "#94A3B8", fontSize: 11, gap: 6,
            }}
          >
            <span>— Page Break —</span>
          </div>
        );
      case "shape": {
        const shapeVariant = (element as any).shapeVariant || "rectangle";
        const fillColor = ts?.backgroundColor && ts.backgroundColor !== "transparent" ? ts.backgroundColor : "#1E3A5F";
        const strokeColor = ts?.borderColor || "transparent";
        const strokeWidth = ts?.borderWidth || 0;
        if (shapeVariant === "circle") {
          return (
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <ellipse cx="50" cy="50" rx={50 - strokeWidth} ry={50 - strokeWidth}
                fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
            </svg>
          );
        }
        // rectangle (default)
        return (
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <rect x={strokeWidth / 2} y={strokeWidth / 2}
              width={100 - strokeWidth} height={100 - strokeWidth}
              rx={ts?.borderRadius || 0} ry={ts?.borderRadius || 0}
              fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
          </svg>
        );
      }
      case "table":
        if (!element.tableData) return null;
        const { rows, cols, cells, cellPadding, borderWidth, borderColor, headerRow } = element.tableData;
        const spans = element.tableData.spans || Array.from({ length: rows }, () => Array(cols).fill({}));
        return (
          <table style={{ width: "100%", height: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 12 }}>
            <colgroup>
              {Array.from({ length: cols }, (_, c) => (
                <col key={c} style={{ width: colWidths[c] ? `${colWidths[c]}px` : undefined }} />
              ))}
            </colgroup>
            <tbody>
              {Array.from({ length: rows }, (_, r) => (
                <tr key={r} style={{ height: rowHeights[r] ? `${rowHeights[r]}px` : undefined }}>
                  {Array.from({ length: cols }, (_, c) => {
                    const cellSpan = spans[r]?.[c] || {};
                    if (cellSpan.merged) return null;

                    const isHeader = headerRow && r === 0;
                    const isCellSelected = selectedCellCoords.some(([cr, cc]) => cr === r && cc === c);
                    
                    const cellStyles = element.tableData!.cellStyles || [];
                    const customStyle = cellStyles[r]?.[c] || {};

                    const alternateBg = element.tableData!.alternateRows && (r % 2 === (headerRow ? 0 : 1)) ? "#F8FAFC" : undefined;

                    return (
                      <td
                        key={c}
                        colSpan={cellSpan.colspan || 1}
                        rowSpan={cellSpan.rowspan || 1}
                        contentEditable={isEditing}
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const newText = e.currentTarget.innerText;
                          const newCells = cells.map((rowArr, ri) => 
                            rowArr.map((cellStr, ci) => (ri === r && ci === c ? newText : cellStr))
                          );
                          const origCells = (element.tableData!.originalCells || cells).map((rowArr, ri) => 
                            rowArr.map((cellStr, ci) => (ri === r && ci === c ? newText : cellStr))
                          );
                          onUpdate(element.id, {
                            tableData: {
                              ...element.tableData!,
                              cells: newCells,
                              originalCells: origCells,
                            }
                          });
                        }}
                        onClick={(e) => handleCellClick(e, r, c)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if ((window as any).__showTableCellContextMenu) {
                            (window as any).__showTableCellContextMenu(e.clientX, e.clientY, element.id, r, c);
                          }
                        }}
                        style={{
                          position: "relative",
                          border: isCellSelected ? "2px solid #2563EB" : (borderWidth ? `${borderWidth}px solid ${borderColor}` : undefined),
                          padding: cellPadding,
                          fontWeight: customStyle.fontWeight || (isHeader ? "bold" : "normal"),
                          fontStyle: customStyle.fontStyle || "normal",
                          textDecoration: customStyle.textDecoration || "none",
                          color: customStyle.color || undefined,
                          textAlign: (customStyle.textAlign || (isHeader ? "center" : "left")) as React.CSSProperties["textAlign"],
                          backgroundColor: isCellSelected ? "#DBEAFE" : (customStyle.background || customStyle.backgroundColor || (isHeader ? "#F1F5F9" : alternateBg)),
                          verticalAlign: "middle",
                          wordBreak: "break-word",
                          outline: "none",
                        }}
                      >

                        {cells[r]?.[c] ?? ""}
                        
                        {/* Column and Row Resizers */}
                        {isSelected && !isLocked && (
                          <>
                            <div
                              style={{
                                position: "absolute",
                                right: -3,
                                top: 0,
                                bottom: 0,
                                width: 6,
                                cursor: "col-resize",
                                zIndex: 10,
                                background: "transparent",
                              }}
                              onMouseDown={(e) => handleColResizeStart(e, c)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div
                              style={{
                                position: "absolute",
                                bottom: -3,
                                left: 0,
                                right: 0,
                                height: 6,
                                cursor: "row-resize",
                                zIndex: 10,
                                background: "transparent",
                              }}
                              onMouseDown={(e) => handleRowResizeStart(e, r)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        );
      default:
        return null;
    }
  };

  // ── Resize handle positions ──────────────────────────────────────────────
  const handles = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
  const handlePos: Record<string, React.CSSProperties> = {
    n:  { top: -HANDLE_SIZE / 2, left: "50%", transform: "translateX(-50%)", cursor: "n-resize" },
    ne: { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, cursor: "ne-resize" },
    e:  { top: "50%", right: -HANDLE_SIZE / 2, transform: "translateY(-50%)", cursor: "e-resize" },
    se: { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, cursor: "se-resize" },
    s:  { bottom: -HANDLE_SIZE / 2, left: "50%", transform: "translateX(-50%)", cursor: "s-resize" },
    sw: { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, cursor: "sw-resize" },
    w:  { top: "50%", left: -HANDLE_SIZE / 2, transform: "translateY(-50%)", cursor: "w-resize" },
    nw: { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, cursor: "nw-resize" },
  };

  if (isHidden && !isSelected) return null;

  const selectionColor = isLocked ? "#F59E0B" : "#1E3A5F";

  return (
    <div
      ref={ref}
      data-element-id={element.id}
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: element.zIndex,
        transform: `rotate(${rotation}deg)`,
        cursor: isLocked ? "default" : (isDragging ? "grabbing" : (isEditing ? "text" : "grab")),
        userSelect: isEditing ? "text" : "none",
        boxSizing: "border-box",
        opacity: isHidden ? 0.3 : 1,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => { e.stopPropagation(); onSelect(element.id, e.shiftKey); }}
    >
      {/* Selection outline */}
      {isSelected && !isEditing && (
        <div
          style={{
            position: "absolute",
            inset: -2,
            border: `2px solid ${selectionColor}`,
            pointerEvents: "none",
            zIndex: 1,
            borderRadius: 1,
          }}
        />
      )}
      {/* Edit mode outline */}
      {isEditing && (
        <div
          style={{
            position: "absolute",
            inset: -2,
            border: "2px solid #3B82F6",
            pointerEvents: "none",
            zIndex: 1,
            borderRadius: 1,
            boxShadow: "0 0 0 3px rgba(59,130,246,0.2)",
          }}
        />
      )}

      {/* Content */}
      <div style={{ width: "100%", height: "100%", position: "relative", zIndex: 0 }}>
        {renderContent()}
      </div>

      {/* Table insertion handles — row/col + buttons */}
      {isSelected && element.type === "table" && !isLocked && (
        <TableInsertHandles
          element={element}
          onUpdate={onUpdate}
          zoom={zoom}
        />
      )}

      {/* Universal element insert handle */}
      {isSelected && !isEditing && !isLocked && element.type !== "pageBreak" && (
        <ElementInsertHandle
          elementHeight={element.height}
          onAdd={() => {
            if ((window as any).__insertElementBelow) {
              (window as any).__insertElementBelow(element);
            }
          }}
        />
      )}

      {/* Resize & Rotate handles */}
      {isSelected && !isEditing && !isLocked && (
        <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}>
          {handles.map((dir) => (
            <div
              key={dir}
              data-ignore-drag="true"
              style={{
                position: "absolute",
                width: HANDLE_SIZE,
                height: HANDLE_SIZE,
                backgroundColor: "white",
                border: `2px solid ${selectionColor}`,
                borderRadius: 2,
                pointerEvents: "all",
                ...handlePos[dir],
              }}
              onMouseDown={(e) => handleResizeMouseDown(e, dir)}
            />
          ))}
          {/* Rotate Handle */}
          <div
            data-ignore-drag="true"
            style={{
              position: "absolute",
              top: -ROTATE_HANDLE_OFFSET,
              left: "50%",
              transform: "translateX(-50%)",
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              backgroundColor: "white",
              border: `2px solid ${selectionColor}`,
              borderRadius: "50%",
              cursor: "grab",
              pointerEvents: "all",
            }}
            onMouseDown={handleRotateMouseDown}
          />
          {/* Connector line */}
          <div
            style={{
              position: "absolute",
              top: -ROTATE_HANDLE_OFFSET + HANDLE_SIZE,
              left: "50%",
              width: 1,
              height: ROTATE_HANDLE_OFFSET - HANDLE_SIZE,
              backgroundColor: selectionColor,
              transform: "translateX(-50%)",
              pointerEvents: "none",
              opacity: 0.5,
            }}
          />
        </div>
      )}

      {/* Lock indicator */}
      {isSelected && isLocked && (
        <div
          style={{
            position: "absolute",
            top: -20,
            right: 0,
            background: "#F59E0B",
            color: "white",
            fontSize: 9,
            fontWeight: 700,
            padding: "1px 5px",
            borderRadius: 4,
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          LOCKED
        </div>
      )}
    </div>
  );
}
