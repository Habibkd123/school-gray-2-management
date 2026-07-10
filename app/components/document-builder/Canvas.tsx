"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Plus, Copy, Trash2 } from "lucide-react";
import type { DocumentElement, CanvasPage, DocumentMeta, VariableMeta, TableData } from "./types";
import { PAGE_DIMENSIONS, DEFAULT_TEXT_STYLE } from "./types";
import { CanvasElement } from "./CanvasElement";
import { FloatingToolbar } from "./FloatingToolbar";
import { RightPanel } from "./RightPanel";
import { TableContextMenu } from "./TableContextMenu";
import type { VariableDefinition } from "./variable-definitions";
import { recordRecentVariable } from "./variable-store";

// ── Types ────────────────────────────────────────────────────────────────────

interface SnapLines {
  vLines: number[];
  hLines: number[];
}

interface MarqueeRect {
  startX: number; startY: number;
  x: number; y: number; w: number; h: number;
}

interface CanvasProps {
  document: DocumentMeta;
  onDocumentChange: (updates: Partial<DocumentMeta>) => void;
  zoom: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  selectedElementIds: string[];
  onSelectElements: (ids: string[]) => void;
  pushHistory: (pages: CanvasPage[]) => void;
  /** When true variable elements render their preview values */
  previewMode?: boolean;
}

// ── Context menu item ────────────────────────────────────────────────────────

interface CtxItem {
  label: string;
  shortcut?: string;
  action: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

function ContextMenu({
  pos, items, onClose,
}: {
  pos: { x: number; y: number };
  items: CtxItem[];
  onClose: () => void;
}) {
  // Smart positioning: flip left if not enough space to the right
  const menuW = 200;
  const leftPos = Math.min(pos.x, window.innerWidth - menuW - 8);

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        style={{
          position: "fixed",
          top: pos.y,
          left: leftPos,
          zIndex: 9999,
          background: "white",
          border: "1px solid #E2E8F0",
          borderRadius: 10,
          padding: "5px 0",
          boxShadow: "0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)",
          minWidth: menuW,
          animation: "ctx-in 0.12s ease-out",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes ctx-in {
            from { opacity: 0; transform: scale(0.95) translateY(-4px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>
        {items.map((item, i) =>
          item.separator ? (
            <div key={i} style={{ height: 1, background: "#F1F5F9", margin: "4px 0" }} />
          ) : (
            <button
              key={i}
              disabled={item.disabled}
              onClick={() => { item.action(); onClose(); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "7px 14px",
                fontSize: 12.5, fontWeight: 500,
                color: item.danger ? "#DC2626" : (item.disabled ? "#CBD5E1" : "#1E293B"),
                background: "transparent", border: "none",
                borderRadius: 0, cursor: item.disabled ? "not-allowed" : "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) => { if (!item.disabled) e.currentTarget.style.background = item.danger ? "#FEE2E2" : "#F8FAFC"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <span>{item.label}</span>
              {item.shortcut && (
                <span style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600 }}>{item.shortcut}</span>
              )}
            </button>
          )
        )}
      </div>
    </>
  );
}

// ── Canvas ───────────────────────────────────────────────────────────────────

export function Canvas({
  document,
  onDocumentChange,
  zoom,
  currentPage,
  onPageChange,
  selectedElementIds,
  onSelectElements,
  pushHistory,
  previewMode = false,
}: CanvasProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [snapLines, setSnapLines] = useState<SnapLines | null>(null);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const marqueeRef = useRef<MarqueeRect | null>(null);

  // Clipboard (internal to canvas)
  const clipboard = useRef<DocumentElement[]>([]);

  const [tableContextMenu, setTableContextMenu] = useState<{
    x: number;
    y: number;
    elementId: string;
    r: number;
    c: number;
  } | null>(null);

  const styleClipboard = useRef<{
    type: "cell" | "row" | "column" | "table" | "element";
    data: any;
  } | null>(null);

  const pages = document.pages;
  const currentPageIdx = currentPage - 1;
  const page = pages[currentPageIdx];

  const { width: pageWidth, height: pageHeight } = PAGE_DIMENSIONS[document.pageSize][document.orientation];

  const selectedElement = page?.elements.find((el) => el.id === selectedElementIds[0]) ?? null;

  // ── Anchor rect for floating toolbar ─────────────────────────────────────
  useEffect(() => {
    if (selectedElementIds.length !== 1) { setAnchorRect(null); return; }
    const el = stageRef.current?.querySelector(`[data-element-id="${selectedElementIds[0]}"]`);
    if (el) setAnchorRect(el.getBoundingClientRect());
  }, [selectedElementIds, pages, zoom]);

  // ── Update pages ─────────────────────────────────────────────────────────
  const updatePages = useCallback((newPages: CanvasPage[]) => {
    pushHistory(newPages);
    onDocumentChange({ pages: newPages });
  }, [onDocumentChange, pushHistory]);

  const updateCurrentPageElements = useCallback((elements: DocumentElement[]) => {
    const newPages = pages.map((p, i) => i === currentPageIdx ? { ...p, elements } : p);
    updatePages(newPages);
  }, [pages, currentPageIdx, updatePages]);

  // ── Element insertion ────────────────────────────────────────────────────
  const handleInsert = useCallback((partial: Omit<DocumentElement, "id" | "x" | "y" | "zIndex">, dropX?: number, dropY?: number) => {
    const maxZ = page && page.elements.length > 0
      ? Math.max(...page.elements.map((e) => e.zIndex))
      : 0;
    const w = (partial as any).width ?? 200;
    const h = (partial as any).height ?? 60;
    const newEl: DocumentElement = {
      ...partial as any,
      id: crypto.randomUUID(),
      x: dropX !== undefined ? Math.round(dropX - w / 2) : Math.round(pageWidth / 2 - w / 2),
      y: dropY !== undefined ? Math.round(dropY - h / 2) : Math.round(pageHeight / 4),
      zIndex: maxZ + 1,
    };
    updateCurrentPageElements([...(page?.elements ?? []), newEl]);
    onSelectElements([newEl.id]);
  }, [page, pageWidth, pageHeight, updateCurrentPageElements, onSelectElements]);

  // ── Drag-drop variable from panel ─────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent, pageIdx: number) => {
    if (!window.__draggedVariable) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, pageIdx: number) => {
    const v: VariableDefinition | undefined = window.__draggedVariable;
    if (!v) return;
    e.preventDefault();
    window.__draggedVariable = undefined;

    const pageEl = pageRefs.current.get(pageIdx);
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const dropX = (e.clientX - rect.left) / zoom;
    const dropY = (e.clientY - rect.top) / zoom;

    const meta: VariableMeta = {
      key:          v.key,
      label:        v.label,
      category:     v.category,
      categoryId:   v.categoryId,
      previewValue: v.previewValue,
      description:  v.description,
    };

    // Switch to the dropped page
    onPageChange(pageIdx + 1);

    handleInsert({
      type: "variable",
      width: Math.max(160, v.label.length * 9 + 32),
      height: 34,
      content: `{{${v.key}}}`,
      variableMeta: meta,
      textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 13, color: "#1D4ED8" },
    }, dropX, dropY);

    recordRecentVariable(v.key);
  }, [zoom, handleInsert, onPageChange]);


  // Expose insert to left toolbar via ref
  useEffect(() => {
    if (stageRef.current) (stageRef.current as any).__insert = handleInsert;
  }, [handleInsert]);

  // ── Layout shift handler (prevents element overlaps on auto-expand/resize) ──
  useEffect(() => {
    (window as any).__shiftElementsBelow = (triggerId: string, dy: number) => {
      if (dy === 0) return;
      const trigger = page?.elements.find(e => e.id === triggerId);
      if (!trigger) return;
      
      const newPages = pages.map((p, i) => {
        if (i !== currentPageIdx) return p;
        return {
          ...p,
          elements: p.elements.map((el) => {
            if (el.id === triggerId) return el;
            // Shift elements whose top is below the trigger element's original top
            if (el.y >= trigger.y) {
              return { ...el, y: el.y + dy };
            }
            return el;
          })
        };
      });
      onDocumentChange({ pages: newPages });
    };

    (window as any).__showTableCellContextMenu = (x: number, y: number, elementId: string, r: number, c: number) => {
      setTableContextMenu({ x, y, elementId, r, c });
    };

    (window as any).__insertElementBelow = (triggerEl: DocumentElement) => {
      const maxZ = page && page.elements.length > 0
        ? Math.max(...page.elements.map((e) => e.zIndex))
        : 0;
      const newEl: DocumentElement = {
        id: crypto.randomUUID(),
        type: "paragraph",
        x: triggerEl.x,
        y: triggerEl.y + triggerEl.height + 20,
        width: triggerEl.width,
        height: 50,
        zIndex: maxZ + 1,
        content: "New paragraph. Double-click to edit...",
        textStyle: {
          ...DEFAULT_TEXT_STYLE,
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
          fontWeight: "normal",
          fontStyle: "normal",
          textDecoration: "none",
          textAlign: "left",
          color: "#000000",
          backgroundColor: "transparent",
          letterSpacing: 0,
          lineHeight: 1.2,
          paddingTop: 4,
          paddingRight: 8,
          paddingBottom: 4,
          paddingLeft: 8,
          borderRadius: 4
        }
      };

      if ((window as any).__shiftElementsBelow) {
        (window as any).__shiftElementsBelow(triggerEl.id, 70);
      }

      updateCurrentPageElements([...(page?.elements ?? []), newEl]);
      onSelectElements([newEl.id]);
    };

    return () => {
      delete (window as any).__shiftElementsBelow;
      delete (window as any).__showTableCellContextMenu;
      delete (window as any).__insertElementBelow;
    };
  }, [page, pages, currentPageIdx, onDocumentChange]);

  // ── Table Context Menu Actions Handler ──────────────────────────────────────
  const handleTableContextAction = useCallback((elementId: string, action: string, r: number, c: number) => {
    const el = page?.elements.find(e => e.id === elementId);
    if (!el || !el.tableData) return;
    const tData = el.tableData;
    const colWidths = tData.colWidths || Array(tData.cols).fill(el.width / tData.cols);
    const rowHeights = tData.rowHeights || Array(tData.rows).fill(el.height / tData.rows);
    const spans = tData.spans || Array.from({ length: tData.rows }, () => Array(tData.cols).fill({}));

    const updateTable = (newTableData: Partial<TableData>, widthHeight?: { width?: number; height?: number }) => {
      const newPages = pages.map((p, i) => {
        if (i !== currentPageIdx) return p;
        return {
          ...p,
          elements: p.elements.map((e) =>
            e.id === elementId
              ? {
                  ...e,
                  ...widthHeight,
                  tableData: { ...e.tableData!, ...newTableData },
                }
              : e
          ),
        };
      });
      updatePages(newPages);
    };

    if (action === "copyCell") {
      styleClipboard.current = { type: "cell", data: tData.cells[r]?.[c] || "" };
    } else if (action === "pasteCell") {
      if (styleClipboard.current?.type === "cell") {
        const newCells = tData.cells.map((rowArr, ri) =>
          rowArr.map((cellStr, ci) => (ri === r && ci === c ? styleClipboard.current!.data : cellStr))
        );
        const origCells = (tData.originalCells || tData.cells).map((rowArr, ri) =>
          rowArr.map((cellStr, ci) => (ri === r && ci === c ? styleClipboard.current!.data : cellStr))
        );
        updateTable({ cells: newCells, originalCells: origCells });
      }
    } else if (action === "clearCell") {
      const newCells = tData.cells.map((rowArr, ri) =>
        rowArr.map((cellStr, ci) => (ri === r && ci === c ? "" : cellStr))
      );
      const origCells = (tData.originalCells || tData.cells).map((rowArr, ri) =>
        rowArr.map((cellStr, ci) => (ri === r && ci === c ? "" : cellStr))
      );
      updateTable({ cells: newCells, originalCells: origCells });
    } else if (action === "addRowAbove" || action === "addRowBelow") {
      const insertIdx = action === "addRowAbove" ? r : r + 1;
      const newCells = [...tData.cells];
      newCells.splice(insertIdx, 0, Array(tData.cols).fill(""));
      const newOrig = tData.originalCells ? [...tData.originalCells] : [...tData.cells];
      newOrig.splice(insertIdx, 0, Array(tData.cols).fill(""));
      const newHeights = [...rowHeights];
      newHeights.splice(insertIdx, 0, 32);
      const newSpans = [...spans];
      newSpans.splice(insertIdx, 0, Array(tData.cols).fill({}));
      
      const newHeight = newHeights.reduce((sum, h) => sum + h, 0);
      updateTable(
        { rows: tData.rows + 1, cells: newCells, originalCells: newOrig, rowHeights: newHeights, spans: newSpans },
        { height: newHeight }
      );
      if ((window as any).__shiftElementsBelow) {
        (window as any).__shiftElementsBelow(elementId, 32);
      }
    } else if (action === "deleteRow") {
      if (tData.rows <= 1) return;
      const newCells = [...tData.cells];
      newCells.splice(r, 1);
      const newOrig = tData.originalCells ? [...tData.originalCells] : [...tData.cells];
      newOrig.splice(r, 1);
      const deletedHeight = rowHeights[r] || 32;
      const newHeights = [...rowHeights];
      newHeights.splice(r, 1);
      const newSpans = [...spans];
      newSpans.splice(r, 1);

      const newHeight = newHeights.reduce((sum, h) => sum + h, 0);
      updateTable(
        { rows: tData.rows - 1, cells: newCells, originalCells: newOrig, rowHeights: newHeights, spans: newSpans },
        { height: newHeight }
      );
      if ((window as any).__shiftElementsBelow) {
        (window as any).__shiftElementsBelow(elementId, -deletedHeight);
      }
    } else if (action === "duplicateRow") {
      const newCells = [...tData.cells];
      newCells.splice(r + 1, 0, [...tData.cells[r]]);
      const newOrig = tData.originalCells ? [...tData.originalCells] : [...tData.cells];
      newOrig.splice(r + 1, 0, [...(tData.originalCells || tData.cells)[r]]);
      const dupHeight = rowHeights[r] || 32;
      const newHeights = [...rowHeights];
      newHeights.splice(r + 1, 0, dupHeight);
      const newSpans = [...spans];
      const dupSpans = spans[r].map(s => ({ ...s }));
      newSpans.splice(r + 1, 0, dupSpans);

      const newHeight = newHeights.reduce((sum, h) => sum + h, 0);
      updateTable(
        { rows: tData.rows + 1, cells: newCells, originalCells: newOrig, rowHeights: newHeights, spans: newSpans },
        { height: newHeight }
      );
      if ((window as any).__shiftElementsBelow) {
        (window as any).__shiftElementsBelow(elementId, dupHeight);
      }
    } else if (action === "addColLeft" || action === "addColRight") {
      const insertIdx = action === "addColLeft" ? c : c + 1;
      const newCells = tData.cells.map(row => {
        const rCopy = [...row];
        rCopy.splice(insertIdx, 0, "");
        return rCopy;
      });
      const newOrig = (tData.originalCells || tData.cells).map(row => {
        const rCopy = [...row];
        rCopy.splice(insertIdx, 0, "");
        return rCopy;
      });
      const newWidths = [...colWidths];
      newWidths.splice(insertIdx, 0, 80);
      const newSpans = spans.map(row => {
        const rCopy = [...row];
        rCopy.splice(insertIdx, 0, {});
        return rCopy;
      });

      const newWidth = newWidths.reduce((sum, w) => sum + w, 0);
      updateTable(
        { cols: tData.cols + 1, cells: newCells, originalCells: newOrig, colWidths: newWidths, spans: newSpans },
        { width: newWidth }
      );
    } else if (action === "deleteCol") {
      if (tData.cols <= 1) return;
      const newCells = tData.cells.map(row => {
        const rCopy = [...row];
        rCopy.splice(c, 1);
        return rCopy;
      });
      const newOrig = (tData.originalCells || tData.cells).map(row => {
        const rCopy = [...row];
        rCopy.splice(c, 1);
        return rCopy;
      });
      const newWidths = [...colWidths];
      newWidths.splice(c, 1);
      const newSpans = spans.map(row => {
        const rCopy = [...row];
        rCopy.splice(c, 1);
        return rCopy;
      });

      const newWidth = newWidths.reduce((sum, w) => sum + w, 0);
      updateTable(
        { cols: tData.cols - 1, cells: newCells, originalCells: newOrig, colWidths: newWidths, spans: newSpans },
        { width: newWidth }
      );
    } else if (action === "duplicateCol") {
      const newCells = tData.cells.map(row => {
        const rCopy = [...row];
        rCopy.splice(c + 1, 0, row[c]);
        return rCopy;
      });
      const newOrig = (tData.originalCells || tData.cells).map(row => {
        const rCopy = [...row];
        rCopy.splice(c + 1, 0, row[c]);
        return rCopy;
      });
      const dupWidth = colWidths[c] || 80;
      const newWidths = [...colWidths];
      newWidths.splice(c + 1, 0, dupWidth);
      const newSpans = spans.map(row => {
        const rCopy = [...row];
        rCopy.splice(c + 1, 0, { ...row[c] });
        return rCopy;
      });

      const newWidth = newWidths.reduce((sum, w) => sum + w, 0);
      updateTable(
        { cols: tData.cols + 1, cells: newCells, originalCells: newOrig, colWidths: newWidths, spans: newSpans },
        { width: newWidth }
      );
    } else if (action === "merge") {
      const selection = (window as any).__selectedTableSelection;
      const coords = (selection?.coords || []) as [number, number][];
      if (coords.length < 2) return;
      const rowsList = coords.map(([ri, ci]) => ri);
      const colsList = coords.map(([ri, ci]) => ci);
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
          const text = tData.cells[ri]?.[ci] || "";
          if (text) mergedText += (mergedText ? " " : "") + text;
          if (ri === minR && ci === minC) {
            newSpans[ri][ci] = { colspan, rowspan };
          } else {
            newSpans[ri][ci] = { merged: true, mergedInto: [minR, minC] };
          }
        }
      }

      const newCells = tData.cells.map((row, ri) => 
        row.map((cell, ci) => {
          if (ri === minR && ci === minC) return mergedText;
          if (ri >= minR && ri <= maxR && ci >= minC && ci <= maxC) return "";
          return cell;
        })
      );
      const newOrig = (tData.originalCells || tData.cells).map((row, ri) => 
        row.map((cell, ci) => {
          if (ri === minR && ci === minC) return mergedText;
          if (ri >= minR && ri <= maxR && ci >= minC && ci <= maxC) return "";
          return cell;
        })
      );

      updateTable({ cells: newCells, originalCells: newOrig, spans: newSpans });
    } else if (action === "split") {
      const cellSpan = spans[r]?.[c];
      if (cellSpan && (cellSpan.colspan > 1 || cellSpan.rowspan > 1)) {
        const cs = cellSpan.colspan || 1;
        const rs = cellSpan.rowspan || 1;
        const newSpans = JSON.parse(JSON.stringify(spans));
        newSpans[r][c] = {};
        for (let ri = r; ri < r + rs; ri++) {
          for (let ci = c; ci < c + cs; ci++) {
            if (ri === r && ci === c) continue;
            newSpans[ri][ci] = {};
          }
        }
        updateTable({ spans: newSpans });
      }
    }
  }, [page, pages, currentPageIdx, updatePages]);

  // ── Multiple element alignment ─────────────────────────────────────────────
  const handleAlign = useCallback((alignment: "left" | "center" | "right" | "top" | "bottom" | "distribute-v" | "distribute-h") => {
    if (!page || selectedElementIds.length <= 1) return;
    
    const selectedEls = selectedElementIds
      .map(id => page.elements.find(e => e.id === id))
      .filter(Boolean) as DocumentElement[];
      
    if (selectedEls.length <= 1) return;

    // Get bounding box of selection
    const xs = selectedEls.map(e => e.x);
    const ys = selectedEls.map(e => e.y);
    const rights = selectedEls.map(e => e.x + e.width);
    const bottoms = selectedEls.map(e => e.y + e.height);
    
    const minX = Math.min(...xs);
    const rightsMax = Math.max(...rights);
    const minY = Math.min(...ys);
    const bottomsMax = Math.max(...bottoms);

    const boxWidth = rightsMax - minX;
    const boxHeight = bottomsMax - minY;

    const newPages = pages.map((p, i) => {
      if (i !== currentPageIdx) return p;
      return {
        ...p,
        elements: p.elements.map(el => {
          if (!selectedElementIds.includes(el.id)) return el;
          
          if (alignment === "left") {
            return { ...el, x: minX };
          }
          if (alignment === "right") {
            return { ...el, x: rightsMax - el.width };
          }
          if (alignment === "center") {
            return { ...el, x: minX + (boxWidth - el.width) / 2 };
          }
          if (alignment === "top") {
            return { ...el, y: minY };
          }
          if (alignment === "bottom") {
            return { ...el, y: bottomsMax - el.height };
          }
          return el;
        })
      };
    });

    if (alignment === "distribute-v" || alignment === "distribute-h") {
      const sorted = [...selectedEls].sort((a, b) => alignment === "distribute-v" ? a.y - b.y : a.x - b.x);
      const totalWidthEls = sorted.reduce((sum, e) => sum + e.width, 0);
      const totalHeightEls = sorted.reduce((sum, e) => sum + e.height, 0);
      
      const gap = sorted.length > 1
        ? (alignment === "distribute-v"
            ? (boxHeight - totalHeightEls) / (sorted.length - 1)
            : (boxWidth - totalWidthEls) / (sorted.length - 1))
        : 0;

      const newPagesDist = pages.map((p, i) => {
        if (i !== currentPageIdx) return p;
        return {
          ...p,
          elements: p.elements.map(el => {
            if (!selectedElementIds.includes(el.id)) return el;
            const sortIdx = sorted.findIndex(se => se.id === el.id);
            if (sortIdx === -1) return el;
            
            let targetPos = alignment === "distribute-v" ? minY : minX;
            for (let s = 0; s < sortIdx; s++) {
              targetPos += (alignment === "distribute-v" ? sorted[s].height : sorted[s].width) + gap;
            }
            
            return alignment === "distribute-v"
              ? { ...el, y: targetPos }
              : { ...el, x: targetPos };
          })
        };
      });
      updatePages(newPagesDist);
    } else {
      updatePages(newPages);
    }
  }, [page, pages, currentPageIdx, selectedElementIds, updatePages]);

  useEffect(() => {
    (window as any).__handleAlignSelectedElements = handleAlign;
    return () => {
      delete (window as any).__handleAlignSelectedElements;
    };
  }, [handleAlign]);

  // ── Page management ──────────────────────────────────────────────────────
  const addPage = useCallback(() => {
    const newPages = [...pages, { id: crypto.randomUUID(), elements: [] }];
    updatePages(newPages);
    onPageChange(newPages.length);
  }, [pages, updatePages, onPageChange]);

  const deletePage = useCallback((idx: number) => {
    if (pages.length <= 1) return;
    const newPages = pages.filter((_, i) => i !== idx);
    updatePages(newPages);
    onPageChange(Math.min(currentPage, newPages.length));
  }, [pages, currentPage, updatePages, onPageChange]);

  const duplicatePage = useCallback((idx: number) => {
    const copy = { ...JSON.parse(JSON.stringify(pages[idx])), id: crypto.randomUUID() };
    const newPages = [...pages.slice(0, idx + 1), copy, ...pages.slice(idx + 1)];
    updatePages(newPages);
    onPageChange(idx + 2);
  }, [pages, updatePages, onPageChange]);

  // ── Clipboard operations ──────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    if (!page || selectedElementIds.length === 0) return;
    clipboard.current = selectedElementIds
      .map((id) => page.elements.find((e) => e.id === id))
      .filter(Boolean)
      .map((el) => JSON.parse(JSON.stringify(el))) as DocumentElement[];
  }, [page, selectedElementIds]);

  const handleCut = useCallback(() => {
    handleCopy();
    const newPages = pages.map((p, i) =>
      i === currentPageIdx
        ? { ...p, elements: p.elements.filter((e) => !selectedElementIds.includes(e.id)) }
        : p
    );
    updatePages(newPages);
    onSelectElements([]);
  }, [handleCopy, pages, currentPageIdx, selectedElementIds, updatePages, onSelectElements]);

  const handlePaste = useCallback(() => {
    if (clipboard.current.length === 0) return;
    const maxZ = page && page.elements.length > 0
      ? Math.max(...page.elements.map((e) => e.zIndex)) : 0;
    const pasted = clipboard.current.map((el, i) => ({
      ...JSON.parse(JSON.stringify(el)),
      id: crypto.randomUUID(),
      x: el.x + 20,
      y: el.y + 20,
      zIndex: maxZ + i + 1,
    }));
    const newPages = pages.map((p, i) =>
      i === currentPageIdx ? { ...p, elements: [...p.elements, ...pasted] } : p
    );
    updatePages(newPages);
    onSelectElements(pasted.map((e) => e.id));
  }, [page, pages, currentPageIdx, updatePages, onSelectElements]);

  const handleDuplicate = useCallback(() => {
    if (!page || selectedElementIds.length === 0) return;
    const maxZ = page.elements.length > 0 ? Math.max(...page.elements.map((e) => e.zIndex)) : 0;
    const copies = selectedElementIds
      .map((id) => page.elements.find((e) => e.id === id))
      .filter(Boolean)
      .map((el, i) => ({
        ...JSON.parse(JSON.stringify(el!)),
        id: crypto.randomUUID(),
        x: el!.x + 16,
        y: el!.y + 16,
        zIndex: maxZ + i + 1,
      }));
    const newPages = pages.map((p, i) =>
      i === currentPageIdx ? { ...p, elements: [...p.elements, ...copies] } : p
    );
    updatePages(newPages);
    onSelectElements(copies.map((c) => c.id));
  }, [page, pages, currentPageIdx, selectedElementIds, updatePages, onSelectElements]);

  const handleSelectAll = useCallback(() => {
    if (!page) return;
    onSelectElements(page.elements.map((e) => e.id));
  }, [page, onSelectElements]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedElementIds.length === 0) return;
    const newPages = pages.map((p, i) =>
      i === currentPageIdx
        ? { ...p, elements: p.elements.filter((e) => !selectedElementIds.includes(e.id)) }
        : p
    );
    updatePages(newPages);
    onSelectElements([]);
  }, [selectedElementIds, pages, currentPageIdx, updatePages, onSelectElements]);

  const handleBringForward = useCallback(() => {
    const newPages = pages.map((p, i) =>
      i === currentPageIdx
        ? { ...p, elements: p.elements.map((e) => selectedElementIds.includes(e.id) ? { ...e, zIndex: e.zIndex + 1 } : e) }
        : p
    );
    updatePages(newPages);
  }, [pages, currentPageIdx, selectedElementIds, updatePages]);

  const handleSendBackward = useCallback(() => {
    const newPages = pages.map((p, i) =>
      i === currentPageIdx
        ? { ...p, elements: p.elements.map((e) => selectedElementIds.includes(e.id) ? { ...e, zIndex: Math.max(0, e.zIndex - 1) } : e) }
        : p
    );
    updatePages(newPages);
  }, [pages, currentPageIdx, selectedElementIds, updatePages]);

  const handleBringToFront = useCallback(() => {
    if (!page) return;
    const maxZ = Math.max(...page.elements.map((e) => e.zIndex)) + 1;
    const newPages = pages.map((p, i) =>
      i === currentPageIdx
        ? { ...p, elements: p.elements.map((e) => selectedElementIds.includes(e.id) ? { ...e, zIndex: maxZ } : e) }
        : p
    );
    updatePages(newPages);
  }, [page, pages, currentPageIdx, selectedElementIds, updatePages]);

  const handleSendToBack = useCallback(() => {
    const newPages = pages.map((p, i) =>
      i === currentPageIdx
        ? { ...p, elements: p.elements.map((e) => selectedElementIds.includes(e.id) ? { ...e, zIndex: 0 } : e) }
        : p
    );
    updatePages(newPages);
  }, [pages, currentPageIdx, selectedElementIds, updatePages]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement;
      const isEditable = target.isContentEditable;

      // When typing in element, only handle Escape and Stop propagation
      if (isEditable) return;

      // Allow toolbar inputs
      if (isInput) return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === "a") { e.preventDefault(); handleSelectAll(); return; }
      if (ctrl && e.key === "c") { e.preventDefault(); handleCopy(); return; }
      if (ctrl && e.key === "x") { e.preventDefault(); handleCut(); return; }
      if (ctrl && e.key === "v") { e.preventDefault(); handlePaste(); return; }
      if (ctrl && e.key === "d") { e.preventDefault(); handleDuplicate(); return; }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedElementIds.length > 0) {
        e.preventDefault();
        handleDeleteSelected();
        return;
      }

      if (e.key === "Escape") {
        onSelectElements([]);
        return;
      }

      // Arrow key nudge
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) && selectedElementIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 8 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        const newPages = pages.map((p, i) =>
          i === currentPageIdx
            ? {
                ...p,
                elements: p.elements.map((el) =>
                  selectedElementIds.includes(el.id)
                    ? { ...el, x: el.x + dx, y: el.y + dy }
                    : el
                ),
              }
            : p
        );
        updatePages(newPages);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    selectedElementIds, pages, currentPageIdx,
    handleSelectAll, handleCopy, handleCut, handlePaste,
    handleDuplicate, handleDeleteSelected, onSelectElements, updatePages,
  ]);

  // ── Marquee selection ─────────────────────────────────────────────────────
  const handleStageMouseDown = useCallback((e: React.MouseEvent, pageIdx: number) => {
    if (e.target !== e.currentTarget) return; // clicked on element, not background
    if (e.button !== 0) return;

    const pageEl = pageRefs.current.get(pageIdx);
    if (!pageEl) return;
    const pageRect = pageEl.getBoundingClientRect();

    const startX = (e.clientX - pageRect.left) / zoom;
    const startY = (e.clientY - pageRect.top) / zoom;

    const rect: MarqueeRect = { startX, startY, x: startX, y: startY, w: 0, h: 0 };
    marqueeRef.current = rect;
    setMarquee({ ...rect });

    const onMove = (me: MouseEvent) => {
      if (!marqueeRef.current) return;
      const curX = (me.clientX - pageRect.left) / zoom;
      const curY = (me.clientY - pageRect.top) / zoom;
      const { startX: sx, startY: sy } = marqueeRef.current;
      const updated: MarqueeRect = {
        startX: sx, startY: sy,
        x: Math.min(curX, sx),
        y: Math.min(curY, sy),
        w: Math.abs(curX - sx),
        h: Math.abs(curY - sy),
      };
      marqueeRef.current = updated;
      setMarquee({ ...updated });
    };

    const onUp = () => {
      if (!marqueeRef.current) return;
      const { x, y, w, h } = marqueeRef.current;
      if (w > 5 && h > 5 && pages[pageIdx]) {
        // Select elements that overlap with the marquee rect
        const overlapping = pages[pageIdx].elements
          .filter((el) => {
            const overlapX = el.x < x + w && el.x + el.width > x;
            const overlapY = el.y < y + h && el.y + el.height > y;
            return overlapX && overlapY;
          })
          .map((el) => el.id);
        if (overlapping.length > 0) {
          onPageChange(pageIdx + 1);
          onSelectElements(overlapping);
        } else {
          onSelectElements([]);
        }
      } else {
        onSelectElements([]);
      }
      marqueeRef.current = null;
      setMarquee(null);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pages, zoom, onPageChange, onSelectElements]);

  // ── Context menu items ────────────────────────────────────────────────────
  // ── Context menu items ────────────────────────────────────────────────────
  const buildContextItems = (): CtxItem[] => {
    const hasSelection = selectedElementIds.length > 0;
    const hasClipboard = clipboard.current.length > 0;
    return [
      { label: "Copy",      shortcut: "Ctrl+C", action: handleCopy,      disabled: !hasSelection },
      { label: "Cut",       shortcut: "Ctrl+X", action: handleCut,       disabled: !hasSelection },
      { label: "Paste",     shortcut: "Ctrl+V", action: handlePaste,     disabled: !hasClipboard },
      { label: "Duplicate", shortcut: "Ctrl+D", action: handleDuplicate, disabled: !hasSelection },
      { separator: true, label: "", action: () => {} },
      { label: "Bring to Front", action: handleBringToFront, disabled: !hasSelection },
      { label: "Bring Forward",  action: handleBringForward,  disabled: !hasSelection },
      { label: "Send Backward",  action: handleSendBackward,  disabled: !hasSelection },
      { label: "Send to Back",   action: handleSendToBack,    disabled: !hasSelection },
      { separator: true, label: "", action: () => {} },
      { label: "Select All", shortcut: "Ctrl+A", action: handleSelectAll },
      { separator: true, label: "", action: () => {} },
      { label: "Delete", shortcut: "Del", action: handleDeleteSelected, disabled: !hasSelection, danger: true },
    ];
  };

  const onUpdateElement = useCallback((id: string, updates: Partial<DocumentElement>) => {
    const newPages = pages.map((p, i) =>
      i === currentPageIdx
        ? { ...p, elements: p.elements.map((e) => e.id === id ? { ...e, ...updates } : e) }
        : p
    );
    updatePages(newPages);
  }, [pages, currentPageIdx, updatePages]);

  const onUpdateTableData = useCallback((id: string, tableUpdates: Partial<TableData>) => {
    const el = page?.elements.find((e) => e.id === id);
    if (!el || !el.tableData) return;
    onUpdateElement(id, {
      tableData: {
        ...el.tableData,
        ...tableUpdates,
      }
    });
  }, [page, onUpdateElement]);

  const buildTableCellContextItems = (elementId: string, r: number, c: number): CtxItem[] => {
    const el = page?.elements.find((e) => e.id === elementId);
    if (!el || !el.tableData) return [];
    
    const tData = el.tableData;
    const cells = tData.cells;
    const spans = tData.spans || Array.from({ length: tData.rows }, () => Array(tData.cols).fill({}));
    const selection = (window as any).__selectedTableSelection;
    const isMultiSelected = (selection?.coords?.length || 0) > 1;

    const copyCellContent = () => {
      clipboard.current = [{
        id: crypto.randomUUID(),
        type: "paragraph",
        width: 150,
        height: 40,
        x: 0, y: 0, zIndex: 1,
        content: cells[r]?.[c] || "",
      }];
    };

    const copyCellStyle = () => {
      const cellStyles = tData.cellStyles || [];
      const cellStyle = cellStyles[r]?.[c] || {};
      
      styleClipboard.current = {
        type: "cell",
        data: {
          style: cellStyle,
          cellPadding: tData.cellPadding,
          borderWidth: tData.borderWidth,
          borderColor: tData.borderColor,
        }
      };
    };

    const pasteCellStyle = () => {
      if (!styleClipboard.current) return;
      const s = styleClipboard.current;
      const cellStyles = JSON.parse(JSON.stringify(tData.cellStyles || Array.from({ length: tData.rows }, () => Array(tData.cols).fill({}))));
      
      if (s.type === "cell") {
        cellStyles[r][c] = { ...cellStyles[r][c], ...s.data.style };
        onUpdateTableData(elementId, {
          cellStyles,
          cellPadding: s.data.cellPadding,
          borderWidth: s.data.borderWidth,
          borderColor: s.data.borderColor,
        });
      }
    };

    const pasteCellContent = () => {
      const clipText = clipboard.current?.[0]?.content || "";
      const newCells = cells.map((rowArr, ri) => 
        rowArr.map((cellStr, ci) => (ri === r && ci === c ? clipText : cellStr))
      );
      const origCells = (tData.originalCells || cells).map((rowArr, ri) => 
        rowArr.map((cellStr, ci) => (ri === r && ci === c ? clipText : cellStr))
      );
      onUpdateTableData(elementId, {
        cells: newCells,
        originalCells: origCells,
      });
    };

    const clearCellContent = () => {
      const newCells = cells.map((rowArr, ri) => 
        rowArr.map((cellStr, ci) => (ri === r && ci === c ? "" : cellStr))
      );
      const origCells = (tData.originalCells || cells).map((rowArr, ri) => 
        rowArr.map((cellStr, ci) => (ri === r && ci === c ? "" : cellStr))
      );
      onUpdateTableData(elementId, {
        cells: newCells,
        originalCells: origCells,
      });
    };

    const clearCellStyle = () => {
      const cellStyles = JSON.parse(JSON.stringify(tData.cellStyles || Array.from({ length: tData.rows }, () => Array(tData.cols).fill({}))));
      cellStyles[r][c] = {};
      onUpdateTableData(elementId, { cellStyles });
    };

    const insertRow = (below: boolean) => {
      const insertIdx = below ? r + 1 : r;
      const newCells = [...cells];
      newCells.splice(insertIdx, 0, Array(tData.cols).fill(""));
      const newOrig = tData.originalCells ? [...tData.originalCells] : [...cells];
      newOrig.splice(insertIdx, 0, Array(tData.cols).fill(""));
      
      const rowHeights = tData.rowHeights || Array(tData.rows).fill(el.height / tData.rows);
      const newHeights = [...rowHeights];
      newHeights.splice(insertIdx, 0, 30);
      
      const newSpans = [...spans];
      newSpans.splice(insertIdx, 0, Array(tData.cols).fill({}));

      const newTotalHeight = newHeights.reduce((sum, h) => sum + h, 0);
      onUpdateElement(elementId, {
        height: newTotalHeight,
        tableData: {
          ...tData,
          rows: tData.rows + 1,
          cells: newCells,
          originalCells: newOrig,
          rowHeights: newHeights,
          spans: newSpans,
        }
      });
      if ((window as any).__shiftElementsBelow) {
        (window as any).__shiftElementsBelow(elementId, 30);
      }
    };

    const insertCol = (right: boolean) => {
      const insertIdx = right ? c + 1 : c;
      const newCells = cells.map(row => {
        const rCopy = [...row];
        rCopy.splice(insertIdx, 0, "");
        return rCopy;
      });
      const newOrig = (tData.originalCells || cells).map(row => {
        const rCopy = [...row];
        rCopy.splice(insertIdx, 0, "");
        return rCopy;
      });
      
      const colWidths = tData.colWidths || Array(tData.cols).fill(el.width / tData.cols);
      const newWidths = [...colWidths];
      newWidths.splice(insertIdx, 0, 80);
      
      const newSpans = spans.map(row => {
        const rCopy = [...row];
        rCopy.splice(insertIdx, 0, {});
        return rCopy;
      });

      const newTotalWidth = newWidths.reduce((sum, w) => sum + w, 0);
      onUpdateElement(elementId, {
        width: newTotalWidth,
        tableData: {
          ...tData,
          cols: tData.cols + 1,
          cells: newCells,
          originalCells: newOrig,
          colWidths: newWidths,
          spans: newSpans,
        }
      });
    };

    const deleteRow = () => {
      if (tData.rows <= 1) return;
      const newCells = [...cells];
      newCells.splice(r, 1);
      const newOrig = tData.originalCells ? [...tData.originalCells] : [...cells];
      newOrig.splice(r, 1);
      
      const rowHeights = tData.rowHeights || Array(tData.rows).fill(el.height / tData.rows);
      const deletedHeight = rowHeights[r] || 30;
      const newHeights = [...rowHeights];
      newHeights.splice(r, 1);
      
      const newSpans = [...spans];
      newSpans.splice(r, 1);

      const newTotalHeight = newHeights.reduce((sum, h) => sum + h, 0);
      onUpdateElement(elementId, {
        height: newTotalHeight,
        tableData: {
          ...tData,
          rows: tData.rows - 1,
          cells: newCells,
          originalCells: newOrig,
          rowHeights: newHeights,
          spans: newSpans,
        }
      });
      if ((window as any).__shiftElementsBelow) {
        (window as any).__shiftElementsBelow(elementId, -deletedHeight);
      }
    };

    const deleteCol = () => {
      if (tData.cols <= 1) return;
      const newCells = cells.map(row => {
        const rCopy = [...row];
        rCopy.splice(c, 1);
        return rCopy;
      });
      const newOrig = (tData.originalCells || cells).map(row => {
        const rCopy = [...row];
        rCopy.splice(c, 1);
        return rCopy;
      });
      
      const colWidths = tData.colWidths || Array(tData.cols).fill(el.width / tData.cols);
      const newWidths = [...colWidths];
      newWidths.splice(c, 1);
      
      const newSpans = spans.map(row => {
        const rCopy = [...row];
        rCopy.splice(c, 1);
        return rCopy;
      });

      const newTotalWidth = newWidths.reduce((sum, w) => sum + w, 0);
      onUpdateElement(elementId, {
        width: newTotalWidth,
        tableData: {
          ...tData,
          cols: tData.cols - 1,
          cells: newCells,
          originalCells: newOrig,
          colWidths: newWidths,
          spans: newSpans,
        }
      });
    };

    const mergeCells = () => {
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
          const text = cells[ri]?.[ci] || "";
          if (text) mergedText += (mergedText ? " " : "") + text;
          if (ri === minR && ci === minC) {
            newSpans[ri][ci] = { colspan, rowspan };
          } else {
            newSpans[ri][ci] = { merged: true, mergedInto: [minR, minC] };
          }
        }
      }

      const newCells = cells.map((row, ri) => 
        row.map((cellStr, ci) => {
          if (ri === minR && ci === minC) return mergedText;
          if (ri >= minR && ri <= maxR && ci >= minC && ci <= maxC) return "";
          return cellStr;
        })
      );
      const newOrig = (tData.originalCells || cells).map((row, ri) => 
        row.map((cellStr, ci) => {
          if (ri === minR && ci === minC) return mergedText;
          if (ri >= minR && ri <= maxR && ci >= minC && ci <= maxC) return "";
          return cellStr;
        })
      );

      onUpdateElement(elementId, {
        tableData: {
          ...tData,
          cells: newCells,
          originalCells: newOrig,
          spans: newSpans,
        }
      });
    };

    const splitCell = () => {
      const cellSpan = spans[r]?.[c];
      if (cellSpan && (cellSpan.colspan > 1 || cellSpan.rowspan > 1)) {
        const cs = cellSpan.colspan || 1;
        const rs = cellSpan.rowspan || 1;
        const newSpans = JSON.parse(JSON.stringify(spans));
        newSpans[r][c] = {};
        for (let ri = r; ri < r + rs; ri++) {
          for (let ci = c; ci < c + cs; ci++) {
            if (ri === r && ci === c) continue;
            newSpans[ri][ci] = {};
          }
        }
        onUpdateTableData(elementId, { spans: newSpans });
      }
    };

    return [
      { label: "Copy Content", action: copyCellContent },
      { label: "Paste Content", action: pasteCellContent, disabled: clipboard.current.length === 0 },
      { label: "Clear Content", action: clearCellContent },
      { separator: true, label: "", action: () => {} },
      { label: "Copy Style", action: copyCellStyle },
      { label: "Paste Style", action: pasteCellStyle, disabled: !styleClipboard.current || styleClipboard.current.type !== "cell" },
      { label: "Clear Style", action: clearCellStyle },
      { separator: true, label: "", action: () => {} },
      { label: "Insert Row Above", action: () => insertRow(false) },
      { label: "Insert Row Below", action: () => insertRow(true) },
      { label: "Insert Column Left", action: () => insertCol(false) },
      { label: "Insert Column Right", action: () => insertCol(true) },
      { separator: true, label: "", action: () => {} },
      { label: "Merge Cells", action: mergeCells, disabled: !isMultiSelected },
      { label: "Split Cell", action: splitCell, disabled: !(spans[r]?.[c]?.colspan > 1 || spans[r]?.[c]?.rowspan > 1) },
      { separator: true, label: "", action: () => {} },
      { label: "Delete Row", action: deleteRow, danger: true },
      { label: "Delete Column", action: deleteCol, danger: true },
    ];
  };

  return (
    <div
      style={{ display: "flex", flex: 1, overflow: "hidden", background: "#E8EDF3" }}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      {/* ── Canvas Stage ─────────────────────────────────────────────────── */}
      <div
        ref={stageRef}
        style={{
          flex: 1, overflow: "auto",
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "48px 40px", gap: 40,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onSelectElements([]);
        }}
      >
        {pages.map((pg, pgIdx) => {
          const isCurrentPage = pgIdx === currentPageIdx;
          const allEls = pg.elements;

          return (
            <div key={pg.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
              {/* Page label */}
              <div
                style={{
                  fontSize: 11, fontWeight: 700, color: isCurrentPage ? "#1E3A5F" : "#94A3B8",
                  marginBottom: 10, letterSpacing: 0.5, userSelect: "none",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <span>PAGE {pgIdx + 1}</span>
                {isCurrentPage && (
                  <span
                    style={{
                      fontSize: 9, background: "#1E3A5F", color: "white",
                      padding: "1px 6px", borderRadius: 10, letterSpacing: 0.3,
                    }}
                  >
                    ACTIVE
                  </span>
                )}
              </div>

              {/* Zoom wrapper */}
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top center",
                  marginBottom: `calc(${pageHeight * zoom}px - ${pageHeight}px)`,
                }}
              >
                {/* Page surface */}
                <div
                  className="db-page"
                  ref={(el) => { if (el) pageRefs.current.set(pgIdx, el); else pageRefs.current.delete(pgIdx); }}
                  onClick={() => onPageChange(pgIdx + 1)}
                  onMouseDown={(e) => handleStageMouseDown(e, pgIdx)}
                  onDragOver={(e) => handleDragOver(e, pgIdx)}
                  onDrop={(e) => handleDrop(e, pgIdx)}
                  style={{
                    width: pageWidth,
                    height: pageHeight,
                    background: "white",
                    boxShadow: isCurrentPage
                      ? "0 0 0 2.5px #1E3A5F, 0 12px 48px rgba(0,0,0,0.22)"
                      : "0 4px 24px rgba(0,0,0,0.12)",
                    position: "relative",
                    overflow: "hidden",
                    cursor: "default",
                    flexShrink: 0,
                    transition: "box-shadow 0.2s",
                  }}
                >
                  {/* Elements */}
                  {pg.elements.map((el) => (
                    <CanvasElement
                      key={el.id}
                      element={el}
                      isSelected={selectedElementIds.includes(el.id) && isCurrentPage}
                      allElements={allEls}
                      onSelect={(id, multi) => {
                        onPageChange(pgIdx + 1);
                        if (multi) {
                          onSelectElements(
                            selectedElementIds.includes(id)
                              ? selectedElementIds.filter((x) => x !== id)
                              : [...selectedElementIds, id]
                          );
                        } else {
                          onSelectElements([id]);
                        }
                      }}
                      onUpdate={(id, updates) => {
                        const newPages = pages.map((p, i) =>
                          i === pgIdx
                            ? { ...p, elements: p.elements.map((e) => e.id === id ? { ...e, ...updates } : e) }
                            : p
                        );
                        updatePages(newPages);
                      }}
                      onDelete={(id) => {
                        const newPages = pages.map((p, i) =>
                          i === pgIdx ? { ...p, elements: p.elements.filter((e) => e.id !== id) } : p
                        );
                        updatePages(newPages);
                        onSelectElements(selectedElementIds.filter((x) => x !== id));
                      }}
                      onDuplicate={(id) => {
                        const original = pg.elements.find((e) => e.id === id);
                        if (!original) return;
                        const copy: DocumentElement = {
                          ...JSON.parse(JSON.stringify(original)),
                          id: crypto.randomUUID(),
                          x: original.x + 16,
                          y: original.y + 16,
                          zIndex: original.zIndex + 1,
                        };
                        const newPages = pages.map((p, i) =>
                          i === pgIdx ? { ...p, elements: [...p.elements, copy] } : p
                        );
                        updatePages(newPages);
                        onSelectElements([copy.id]);
                      }}
                      zoom={zoom}
                      pageWidth={pageWidth}
                      pageHeight={pageHeight}
                      onSnapLines={(lines) => setSnapLines(lines)}
                      previewMode={previewMode}
                    />
                  ))}

                  {/* ── Snap guide lines ────────────────────────────────── */}
                  {snapLines && isCurrentPage && (
                    <>
                      {snapLines.vLines.map((x, i) => (
                        <div
                          key={`v-${i}`}
                          style={{
                            position: "absolute",
                            left: x,
                            top: 0,
                            width: 1,
                            height: "100%",
                            background: "#E040FB",
                            opacity: 0.75,
                            pointerEvents: "none",
                            zIndex: 9999,
                          }}
                        />
                      ))}
                      {snapLines.hLines.map((y, i) => (
                        <div
                          key={`h-${i}`}
                          style={{
                            position: "absolute",
                            top: y,
                            left: 0,
                            height: 1,
                            width: "100%",
                            background: "#00BCD4",
                            opacity: 0.75,
                            pointerEvents: "none",
                            zIndex: 9999,
                          }}
                        />
                      ))}
                    </>
                  )}

                  {/* ── Marquee selection rect ───────────────────────────── */}
                  {marquee && isCurrentPage && (
                    <div
                      style={{
                        position: "absolute",
                        left: marquee.x,
                        top: marquee.y,
                        width: marquee.w,
                        height: marquee.h,
                        border: "1.5px solid #3B82F6",
                        background: "rgba(59,130,246,0.08)",
                        pointerEvents: "none",
                        zIndex: 9998,
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Page controls */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
                <button
                  onClick={() => duplicatePage(pgIdx)}
                  style={{
                    padding: "4px 12px", border: "1px solid #CBD5E1", borderRadius: 6,
                    background: "white", cursor: "pointer", fontSize: 11, fontWeight: 600,
                    color: "#475569", display: "flex", alignItems: "center", gap: 4,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1E3A5F"; e.currentTarget.style.color = "#1E3A5F"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.color = "#475569"; }}
                >
                  <Copy size={11} /> Duplicate Page
                </button>
                {pages.length > 1 && (
                  <button
                    onClick={() => deletePage(pgIdx)}
                    style={{
                      padding: "4px 12px", border: "1px solid #FCA5A5", borderRadius: 6,
                      background: "white", cursor: "pointer", fontSize: 11, fontWeight: 600,
                      color: "#DC2626", display: "flex", alignItems: "center", gap: 4,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
                  >
                    <Trash2 size={11} /> Delete Page
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Page */}
        <button
          onClick={addPage}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "14px 32px", border: "2px dashed #CBD5E1",
            borderRadius: 12, background: "white", cursor: "pointer",
            fontSize: 13, fontWeight: 700, color: "#64748B",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1E3A5F"; e.currentTarget.style.color = "#1E3A5F"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.color = "#64748B"; }}
        >
          <Plus size={16} /> Add Page
        </button>

        <div style={{ height: 48 }} />
      </div>

      {/* ── Right Panel (Layers + Pages) ─────────────────────────────────── */}
      <RightPanel
        document={document}
        currentPage={currentPage}
        selectedElementIds={selectedElementIds}
        onSelectElement={(id) => onSelectElements([id])}
        onUpdatePages={updatePages}
        onPageChange={onPageChange}
        onAddPage={addPage}
        onDeletePage={deletePage}
      />

      {/* ── Floating Text Toolbar ────────────────────────────────────────── */}
      {selectedElement
        && selectedElementIds.length === 1
        && ["heading", "subheading", "paragraph", "variable", "table"].includes(selectedElement.type)
        && (
          <FloatingToolbar
            element={selectedElement}
            onUpdate={(id, updates) => {
              const newPages = pages.map((p, i) =>
                i === currentPageIdx
                  ? { ...p, elements: p.elements.map((e) => e.id === id ? { ...e, ...updates } : e) }
                  : p
              );
              updatePages(newPages);
            }}
            onDuplicate={handleDuplicate}
            onDelete={(id) => {
              const newPages = pages.map((p, i) =>
                i === currentPageIdx ? { ...p, elements: p.elements.filter((e) => e.id !== id) } : p
              );
              updatePages(newPages);
              onSelectElements(selectedElementIds.filter((x) => x !== id));
            }}
            anchorRect={anchorRect}
            zoom={zoom}
          />
        )}

      {/* ── Context Menu ─────────────────────────────────────────────────── */}
      {contextMenu && (
        <ContextMenu
          pos={contextMenu}
          items={buildContextItems()}
          onClose={() => setContextMenu(null)}
        />
      )}

      {tableContextMenu && (
        <TableContextMenu
          menu={{
            x: tableContextMenu.x,
            y: tableContextMenu.y,
            elementId: tableContextMenu.elementId,
            row: tableContextMenu.r,
            col: tableContextMenu.c,
          }}
          onClose={() => setTableContextMenu(null)}
          onAction={handleTableContextAction}
        />
      )}
    </div>
  );
}
