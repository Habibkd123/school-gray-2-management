import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage and window for Node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

(global as any).window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  localStorage: localStorageMock,
};
(global as any).localStorage = localStorageMock;

import type { DocumentMeta, DocumentElement, CanvasPage, TableData } from "@/app/components/document-builder/types";
import {
  getDocuments,
  getDocument,
  saveDocument,
  deleteDocument,
  duplicateDocument,
  createDocument,
  getTemplates,
  getTemplate,
  saveTemplate,
  duplicateTemplate,
  toggleFavourite,
  getCategories,
  saveCategory,
  deleteCategory,
  getReportCardBatches,
  saveReportCardBatch,
  deleteReportCardBatch,
  publishReportCardBatch,
  BUILT_IN_CATEGORIES,
} from "@/app/components/document-builder/store";



// ─── Snapping Engine Logic (Extracted for pure calculation testing) ───────────
const SNAP_THRESHOLD = 6;

interface SnapLines {
  vLines: number[];
  hLines: number[];
}

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

// ─── Variable Placeholder Replacement Engine (from BuilderPage) ─────────────
function applyVariablesToDocument(
  variables: Record<string, string>,
  currentDoc: DocumentMeta
): DocumentMeta {
  let placeholdersFound = 0;
  let placeholdersReplaced = 0;
  const unmatchedKeys = new Set<string>();

  const resolveKey = (key: string): string => {
    if (variables[key] !== undefined) return variables[key];

    const candidates = new Set<string>();
    candidates.add(key);
    candidates.add(key.replace(/_/g, "."));
    candidates.add(key.replace(/\./g, "_"));

    for (const k of Array.from(candidates)) {
      if (k.endsWith("_number")) {
        candidates.add(k.replace(/_number$/, "_no"));
        candidates.add(k.replace(/_number$/, ".no"));
      } else if (k.endsWith(".number")) {
        candidates.add(k.replace(/\.number$/, "_no"));
        candidates.add(k.replace(/\.number$/, ".no"));
      } else if (k.endsWith("_no")) {
        candidates.add(k.replace(/_no$/, "_number"));
        candidates.add(k.replace(/_no$/, ".number"));
      } else if (k.endsWith(".no")) {
        candidates.add(k.replace(/\.no$/, "_number"));
        candidates.add(k.replace(/\.no$/, "_no"));
      }
    }

    for (const candidate of candidates) {
      if (variables[candidate] !== undefined) return variables[candidate];
      const dot = candidate.replace(/_/g, ".");
      if (variables[dot] !== undefined) return variables[dot];
      const under = candidate.replace(/\./g, "_");
      if (variables[under] !== undefined) return variables[under];
    }

    return "";
  };

  const replaceInText = (text: string): string =>
    text.replace(/\{\{([^}]+)\}\}/g, (_match, key: string) => {
      placeholdersFound++;
      const trimmed = key.trim();
      const value = resolveKey(trimmed);
      if (value !== "") {
        placeholdersReplaced++;
        return value;
      }
      unmatchedKeys.add(trimmed);
      return "";
    });

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
      const originalContent = el.originalContent ?? el.content ?? "";

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

      if (
        (el.type === "heading" || el.type === "subheading" || el.type === "paragraph") &&
        originalContent.includes("{{")
      ) {
        return {
          ...el,
          originalContent,
          content: replaceInText(originalContent),
        };
      }

      if (el.type === "table" && el.tableData) {
        const originalCells = el.tableData.originalCells ?? JSON.parse(JSON.stringify(el.tableData.cells));
        const headerRow = originalCells[0] || [];

        const subjectColIndex = headerRow.findIndex((h: string) => h.toLowerCase().includes("subject"));
        const hasMarks = headerRow.some((h: string) => {
          const hl = h.toLowerCase();
          return hl.includes("marks") || hl.includes("obtained") || hl.includes("grade") || hl.includes("result");
        });

        if (subjectColIndex !== -1 && hasMarks && subjectsList.length > 0) {
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

          const lastRow = originalCells[originalCells.length - 1];
          if (
            lastRow &&
            (lastRow[0].toLowerCase().includes("total") ||
              lastRow[0].toLowerCase().includes("aggregate") ||
              lastRow[0].toLowerCase().includes("grand"))
          ) {
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

  return {
    ...currentDoc,
    pages: updatedPages,
    resolvedVariables: variables,
  };
}

// ─── Alignment Calculation Engine ───────────────────────────────────────────
function calculateAlignment(
  selectedEls: DocumentElement[],
  alignment: "left" | "center" | "right" | "top" | "bottom" | "distribute-v" | "distribute-h"
): DocumentElement[] {
  if (selectedEls.length <= 1) return selectedEls;

  const xs = selectedEls.map((e) => e.x);
  const ys = selectedEls.map((e) => e.y);
  const rights = selectedEls.map((e) => e.x + e.width);
  const bottoms = selectedEls.map((e) => e.y + e.height);

  const minX = Math.min(...xs);
  const rightsMax = Math.max(...rights);
  const minY = Math.min(...ys);
  const bottomsMax = Math.max(...bottoms);

  const boxWidth = rightsMax - minX;
  const boxHeight = bottomsMax - minY;

  if (alignment === "distribute-v" || alignment === "distribute-h") {
    const sorted = [...selectedEls].sort((a, b) =>
      alignment === "distribute-v" ? a.y - b.y : a.x - b.x
    );
    const totalWidthEls = sorted.reduce((sum, e) => sum + e.width, 0);
    const totalHeightEls = sorted.reduce((sum, e) => sum + e.height, 0);

    const gap =
      sorted.length > 1
        ? alignment === "distribute-v"
          ? (boxHeight - totalHeightEls) / (sorted.length - 1)
          : (boxWidth - totalWidthEls) / (sorted.length - 1)
        : 0;

    return selectedEls.map((el) => {
      const sortIdx = sorted.findIndex((se) => se.id === el.id);
      let targetPos = alignment === "distribute-v" ? minY : minX;
      for (let s = 0; s < sortIdx; s++) {
        targetPos += (alignment === "distribute-v" ? sorted[s].height : sorted[s].width) + gap;
      }
      return alignment === "distribute-v"
        ? { ...el, y: targetPos }
        : { ...el, x: targetPos };
    });
  }

  return selectedEls.map((el) => {
    if (alignment === "left") return { ...el, x: minX };
    if (alignment === "right") return { ...el, x: rightsMax - el.width };
    if (alignment === "center") return { ...el, x: minX + (boxWidth - el.width) / 2 };
    if (alignment === "top") return { ...el, y: minY };
    if (alignment === "bottom") return { ...el, y: bottomsMax - el.height };
    return el;
  });
}

// ─── Pure History Stack Simulation ──────────────────────────────────────────
class HistoryManager<T> {
  private stack: T[];
  private pointer: number;
  private maxHistory: number;

  constructor(initialState: T, maxHistory = 80) {
    this.stack = [initialState];
    this.pointer = 0;
    this.maxHistory = maxHistory;
  }

  push(state: T): void {
    const truncated = this.stack.slice(0, this.pointer + 1);
    truncated.push(state);
    if (truncated.length > this.maxHistory) {
      truncated.shift();
    }
    this.stack = truncated;
    this.pointer = truncated.length - 1;
  }

  undo(): T | null {
    if (this.pointer <= 0) return null;
    this.pointer -= 1;
    return this.stack[this.pointer];
  }

  redo(): T | null {
    if (this.pointer >= this.stack.length - 1) return null;
    this.pointer += 1;
    return this.stack[this.pointer];
  }

  get canUndo(): boolean {
    return this.pointer > 0;
  }

  get canRedo(): boolean {
    return this.pointer < this.stack.length - 1;
  }

  get current(): T {
    return this.stack[this.pointer];
  }

  get length(): number {
    return this.stack.length;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITES
// ─────────────────────────────────────────────────────────────────────────────

describe("Document Builder & Certificate Designer - Calculation & Engine Tests", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("1. Snapping Math & Guide Line Calculations", () => {
    const PAGE_W = 794;
    const PAGE_H = 1123;

    it("detects snap lines to page center and edges within SNAP_THRESHOLD", () => {
      // Element positioned 2px away from left edge (x=2)
      const el1: DocumentElement = {
        id: "el1",
        type: "heading",
        x: 2,
        y: 100,
        width: 100,
        height: 40,
        zIndex: 1,
      };

      const lines = getSnapLines(el1, [], PAGE_W, PAGE_H);
      // Math.abs(2 - 0) = 2 < 6 -> snap to 0
      expect(lines.vLines).toContain(0);

      // Element positioned with center near PAGE_W / 2 (397)
      const elCenter: DocumentElement = {
        id: "elC",
        type: "paragraph",
        x: 345, // center is 345 + 50 = 395. PAGE_W/2 = 397. diff = 2 < 6
        y: 200,
        width: 100,
        height: 40,
        zIndex: 1,
      };
      const centerLines = getSnapLines(elCenter, [], PAGE_W, PAGE_H);
      expect(centerLines.vLines).toContain(PAGE_W / 2);
    });

    it("detects snap lines against sibling elements", () => {
      const sibling: DocumentElement = {
        id: "sib1",
        type: "paragraph",
        x: 100,
        y: 200,
        width: 200,
        height: 50,
        zIndex: 1,
      };

      // Moving element whose left is near sibling right (300)
      const moving: DocumentElement = {
        id: "mov1",
        type: "heading",
        x: 302, // diff = 2 < 6
        y: 201, // diff = 1 < 6 from sibling top (200)
        width: 150,
        height: 40,
        zIndex: 2,
      };

      const lines = getSnapLines(moving, [sibling], PAGE_W, PAGE_H);
      expect(lines.vLines).toContain(300); // Sibling right edge
      expect(lines.hLines).toContain(200); // Sibling top edge
    });

    it("applies snap coordinates cleanly when within threshold", () => {
      const sibling: DocumentElement = {
        id: "sib1",
        type: "paragraph",
        x: 150,
        y: 150,
        width: 200,
        height: 80,
        zIndex: 1,
      };

      // Near sibling left (x=150)
      const snapped = applySnap(152, 148, 100, 40, [sibling], "mov1", PAGE_W, PAGE_H);
      expect(snapped.x).toBe(150); // Snapped to 150
      expect(snapped.y).toBe(150); // Snapped to 150
    });

    it("does not snap when distance exceeds SNAP_THRESHOLD", () => {
      const sibling: DocumentElement = {
        id: "sib1",
        type: "paragraph",
        x: 150,
        y: 150,
        width: 200,
        height: 80,
        zIndex: 1,
      };

      // x=170 is 20px away from 150 (threshold is 6)
      const snapped = applySnap(170, 180, 100, 40, [sibling], "mov1", PAGE_W, PAGE_H);
      expect(snapped.x).toBe(170);
      expect(snapped.y).toBe(180);
    });
  });

  describe("2. Alignment Engine Math", () => {
    const elA: DocumentElement = { id: "a", type: "heading", x: 20, y: 50, width: 100, height: 40, zIndex: 1 };
    const elB: DocumentElement = { id: "b", type: "paragraph", x: 60, y: 150, width: 80, height: 60, zIndex: 2 };
    const elC: DocumentElement = { id: "c", type: "table", x: 120, y: 300, width: 140, height: 100, zIndex: 3 };

    it("aligns left edges correctly to minX", () => {
      const result = calculateAlignment([elA, elB, elC], "left");
      expect(result.map((e) => e.x)).toEqual([20, 20, 20]);
    });

    it("aligns right edges correctly to maxX", () => {
      // Rights: 20+100=120, 60+80=140, 120+140=260. Max right is 260.
      const result = calculateAlignment([elA, elB, elC], "right");
      expect(result.find((e) => e.id === "a")?.x).toBe(260 - 100); // 160
      expect(result.find((e) => e.id === "b")?.x).toBe(260 - 80);  // 180
      expect(result.find((e) => e.id === "c")?.x).toBe(260 - 140); // 120
    });

    it("aligns centers correctly within selection bounding box", () => {
      // minX = 20, maxX = 260, boxWidth = 240. Center is 20 + 240/2 = 140.
      const result = calculateAlignment([elA, elB, elC], "center");
      // elA (width 100): 20 + (240 - 100) / 2 = 90
      expect(result.find((e) => e.id === "a")?.x).toBe(90);
      // elB (width 80): 20 + (240 - 80) / 2 = 100
      expect(result.find((e) => e.id === "b")?.x).toBe(100);
    });

    it("aligns tops correctly to minY", () => {
      const result = calculateAlignment([elA, elB, elC], "top");
      expect(result.map((e) => e.y)).toEqual([50, 50, 50]);
    });

    it("aligns bottoms correctly to maxY", () => {
      // Bottoms: 50+40=90, 150+60=210, 300+100=400. Max bottom is 400.
      const result = calculateAlignment([elA, elB, elC], "bottom");
      expect(result.find((e) => e.id === "a")?.y).toBe(400 - 40); // 360
      expect(result.find((e) => e.id === "b")?.y).toBe(400 - 60); // 340
      expect(result.find((e) => e.id === "c")?.y).toBe(400 - 100); // 300
    });

    it("distributes vertically with equal gap spacing", () => {
      // Elements with heights: 40, 60, 100. Total element heights = 200.
      // Top = 50, Bottom = 400. Total box height = 350.
      // Gap = (350 - 200) / (3 - 1) = 150 / 2 = 75px.
      const result = calculateAlignment([elA, elB, elC], "distribute-v");
      const a = result.find((e) => e.id === "a")!;
      const b = result.find((e) => e.id === "b")!;
      const c = result.find((e) => e.id === "c")!;

      expect(a.y).toBe(50);
      expect(b.y).toBe(50 + 40 + 75); // 165
      expect(c.y).toBe(165 + 60 + 75); // 300
    });
  });

  describe("3. Dynamic Variable Placeholder Replacement Engine", () => {
    const mockDoc: DocumentMeta = {
      id: "doc-1",
      title: "Bonafide Certificate",
      categoryId: "certificate",
      templateId: "bonafide",
      status: "draft",
      pageSize: "A4",
      orientation: "portrait",
      createdBy: "Admin",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      pages: [
        {
          id: "pg-1",
          elements: [
            {
              id: "head-1",
              type: "heading",
              x: 40,
              y: 40,
              width: 600,
              height: 40,
              zIndex: 1,
              content: "CERTIFICATE FOR {{student_name}}",
            },
            {
              id: "para-1",
              type: "paragraph",
              x: 40,
              y: 100,
              width: 600,
              height: 100,
              zIndex: 1,
              content: "This is to certify that {{student.name}}, Class {{class}} Sec {{section}}, Adm No {{student_admission_no}} has passed.",
            },
            {
              id: "var-1",
              type: "variable",
              x: 40,
              y: 220,
              width: 200,
              height: 34,
              zIndex: 1,
              content: "{{student_name}}",
              variableMeta: {
                key: "student_name",
                label: "Student Name",
                category: "Student",
                categoryId: "student",
                previewValue: "Jane Doe",
              },
            },
          ],
        },
      ],
    };

    it("replaces single and dotted variable placeholders accurately", () => {
      const vars = {
        student_name: "Aarav Sharma",
        "student.name": "Aarav Sharma",
        class: "10",
        section: "A",
        student_admission_no: "ADM-9942",
      };

      const resolved = applyVariablesToDocument(vars, mockDoc);
      const pg = resolved.pages[0];

      // Check heading replaced
      expect(pg.elements[0].content).toBe("CERTIFICATE FOR Aarav Sharma");
      expect(pg.elements[0].originalContent).toBe("CERTIFICATE FOR {{student_name}}");

      // Check paragraph replaced with multiple keys
      expect(pg.elements[1].content).toBe(
        "This is to certify that Aarav Sharma, Class 10 Sec A, Adm No ADM-9942 has passed."
      );

      // Check variable element preview value set
      expect(pg.elements[2].variableMeta?.previewValue).toBe("Aarav Sharma");
    });

    it("handles key variations: _no vs _number and dot vs underscore", () => {
      const vars = {
        student_admission_number: "ADM-1001",
      };

      const docWithNo: DocumentMeta = {
        ...mockDoc,
        pages: [
          {
            id: "pg-1",
            elements: [
              {
                id: "p1",
                type: "paragraph",
                x: 0,
                y: 0,
                width: 100,
                height: 50,
                zIndex: 1,
                content: "Adm: {{student.admission_no}}",
              },
            ],
          },
        ],
      };

      const resolved = applyVariablesToDocument(vars, docWithNo);
      expect(resolved.pages[0].elements[0].content).toBe("Adm: ADM-1001");
    });

    it("dynamically generates subject results rows in academic table", () => {
      const tableDoc: DocumentMeta = {
        ...mockDoc,
        pages: [
          {
            id: "pg-1",
            elements: [
              {
                id: "tbl-1",
                type: "table",
                x: 40,
                y: 200,
                width: 600,
                height: 120,
                zIndex: 1,
                tableData: {
                  rows: 2,
                  cols: 4,
                  headerRow: true,
                  cellPadding: 8,
                  borderWidth: 1,
                  borderColor: "#ccc",
                  cells: [
                    ["Subject", "Max Marks", "Marks Obtained", "Grade"],
                    ["{{total}}", "", "{{grand_total}}", ""],
                  ],
                },
              },
            ],
          },
        ],
      };

      const examVars: Record<string, string> = {
        "result.subject_1_name": "Mathematics",
        "result.subject_1_total": "100",
        "result.subject_1_obtained": "95",
        "result.subject_1_grade": "A+",
        "result.subject_2_name": "Science",
        "result.subject_2_total": "100",
        "result.subject_2_obtained": "88",
        "result.subject_2_grade": "A",
        total: "Total",
        grand_total: "183/200",
      };

      const resolved = applyVariablesToDocument(examVars, tableDoc);
      const tbl = resolved.pages[0].elements[0].tableData!;

      // Header row + 2 subjects + footer total row = 4 rows
      expect(tbl.rows).toBe(4);
      expect(tbl.cells[0]).toEqual(["Subject", "Max Marks", "Marks Obtained", "Grade"]);
      expect(tbl.cells[1]).toEqual(["Mathematics", "100", "95", "A+"]);
      expect(tbl.cells[2]).toEqual(["Science", "100", "88", "A"]);
      // Footer row resolved
      expect(tbl.cells[3][0]).toBe("Total");
      expect(tbl.cells[3][2]).toBe("183/200");
    });
  });

  describe("4. Undo / Redo History Stack Logic", () => {
    it("pushes, undoes, and redoes states with correct bounds", () => {
      const history = new HistoryManager<number>(10);
      expect(history.current).toBe(10);
      expect(history.canUndo).toBe(false);
      expect(history.canRedo).toBe(false);

      history.push(20);
      history.push(30);
      expect(history.current).toBe(30);
      expect(history.canUndo).toBe(true);
      expect(history.canRedo).toBe(false);

      const u1 = history.undo();
      expect(u1).toBe(20);
      expect(history.current).toBe(20);
      expect(history.canRedo).toBe(true);

      const u2 = history.undo();
      expect(u2).toBe(10);
      expect(history.canUndo).toBe(false);

      // Cannot undo beyond start
      expect(history.undo()).toBeNull();

      // Redo back up
      const r1 = history.redo();
      expect(r1).toBe(20);
      const r2 = history.redo();
      expect(r2).toBe(30);
      expect(history.redo()).toBeNull();
    });

    it("truncates future redo states when a new push occurs after undo", () => {
      const history = new HistoryManager<string>("A");
      history.push("B");
      history.push("C");
      history.undo(); // back to B

      history.push("D"); // Truncates "C"
      expect(history.current).toBe("D");
      expect(history.canRedo).toBe(false);
      history.undo();
      expect(history.current).toBe("B");
      history.undo();
      expect(history.current).toBe("A");
    });

    it("enforces MAX_HISTORY cap without crashing", () => {
      const history = new HistoryManager<number>(0, 5); // cap at 5
      for (let i = 1; i <= 10; i++) {
        history.push(i);
      }
      expect(history.length).toBe(5);
      expect(history.current).toBe(10);

      // Undoing 4 times reaches the oldest available (6)
      history.undo();
      history.undo();
      history.undo();
      history.undo();
      expect(history.current).toBe(6);
      expect(history.canUndo).toBe(false);
    });
  });

  describe("5. Store State Persistence & Document CRUD", () => {
    it("creates, saves, retrieves, and deletes documents", () => {
      const doc = createDocument(
        "Leaving Certificate",
        "certificate",
        "leaving-cert",
        "Principal",
        [{ id: "p1", elements: [] }]
      );

      expect(doc.id).toBeDefined();
      expect(doc.title).toBe("Leaving Certificate");

      // Verify retrieval
      const fetched = getDocument(doc.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.title).toBe("Leaving Certificate");

      // Verify update
      const updated = saveDocument({ ...doc, title: "School Leaving Certificate (Updated)" });
      expect(getDocument(doc.id)?.title).toBe("School Leaving Certificate (Updated)");

      // Verify deletion
      deleteDocument(doc.id);
      expect(getDocument(doc.id)).toBeNull();
    });

    it("duplicates document with deep copy and distinct ID", () => {
      const doc = createDocument(
        "Character Cert",
        "certificate",
        "char-cert",
        "Admin",
        [{ id: "p1", elements: [{ id: "e1", type: "heading", x: 10, y: 10, width: 100, height: 40, zIndex: 1 }] }]
      );

      const copy = duplicateDocument(doc.id);
      expect(copy).not.toBeNull();
      expect(copy?.id).not.toBe(doc.id);
      expect(copy?.title).toBe("Character Cert (Copy)");
      expect(copy?.pages[0].elements.length).toBe(1);

      // Mutating copy does not mutate original
      copy!.pages[0].elements[0].x = 500;
      saveDocument(copy!);
      expect(getDocument(doc.id)?.pages[0].elements[0].x).toBe(10);
    });

    it("loads built-in templates and allows duplicating and toggling favourite", () => {
      const templates = getTemplates();
      expect(templates.length).toBeGreaterThan(0);

      const bonafide = getTemplate("bonafide-classic");
      expect(bonafide).not.toBeNull();
      expect(bonafide?.name).toBe("Bonafide Certificate");

      // Toggle favourite
      const fav = toggleFavourite(bonafide!.id);
      expect(fav?.favourite).toBe(true);

      // Duplicate template
      const tmplCopy = duplicateTemplate(bonafide!.id);
      expect(tmplCopy).not.toBeNull();
      expect(tmplCopy?.name).toBe("Bonafide Certificate (Copy)");
      expect(tmplCopy?.isBuiltIn).toBe(false);
    });

    it("handles categories and custom categories persistence", () => {
      const cats = getCategories();
      expect(cats.length).toBeGreaterThanOrEqual(BUILT_IN_CATEGORIES.length);

      // Save custom category
      saveCategory({
        id: "custom-sports",
        name: "Sports Awards",
        icon: "Trophy",
        color: "bg-emerald-500",
        description: "Sports certificates",
      });

      const updatedCats = getCategories();
      expect(updatedCats.find((c) => c.id === "custom-sports")).toBeDefined();

      deleteCategory("custom-sports");
      expect(getCategories().find((c) => c.id === "custom-sports")).toBeUndefined();
    });

    it("handles report card batches lifecycle", () => {
      const batch = saveReportCardBatch({
        id: "batch-1",
        examId: "exam-midterm",
        examName: "Mid Term 2026",
        classId: "cls-10",
        className: "Class 10",
        section: "A",
        academicYear: "2025-2026",
        templateId: "report-card-default",
        templateName: "CBSE Report Card",
        studentIds: ["s1", "s2"],
        documentIds: ["doc-s1", "doc-s2"],
        status: "draft",
        createdAt: new Date().toISOString(),
        createdBy: "Teacher",
      });

      expect(getReportCardBatches().length).toBe(1);
      const published = publishReportCardBatch("batch-1");
      expect(published?.status).toBe("published");
      expect(published?.publishedAt).toBeDefined();

      deleteReportCardBatch("batch-1");
      expect(getReportCardBatches().length).toBe(0);
    });
  });
});
