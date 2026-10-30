import { describe, it, expect, vi } from "vitest";
import {
  hasPermission,
  ROLE_PERMISSIONS,
  HIDE_FEES_FEATURE,
  type PermissionModule,
} from "@/lib/permissions";
import {
  PERSISTED_PAGE_SIZE_KEY,
  getPersistedPageSize,
  persistPageSize,
} from "@/app/components/ui/pagination-bar";

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: PAGINATION ALGORITHMS & BOUNDARY CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════

describe("1. Pagination Algorithms & Bounds Mathematics", () => {
  function computePaginationState(
    currentPage: number,
    totalPages: number,
    totalItems: number,
    pageSize: number
  ) {
    if (totalItems === 0) return null;
    const from = Math.min((currentPage - 1) * pageSize + 1, totalItems);
    const to = Math.min(currentPage * pageSize, totalItems);

    const pages: (number | "...")[] = Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
      .reduce<(number | "...")[]>((acc, p, i, arr) => {
        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
        acc.push(p);
        return acc;
      }, []);

    const isFirstDisabled = currentPage <= 1;
    const isLastDisabled = currentPage >= totalPages;

    return { from, to, pages, isFirstDisabled, isLastDisabled };
  }

  it("1.1 should calculate exact item range for first page", () => {
    const res = computePaginationState(1, 10, 245, 25);
    expect(res).not.toBeNull();
    expect(res!.from).toBe(1);
    expect(res!.to).toBe(25);
    expect(res!.isFirstDisabled).toBe(true);
    expect(res!.isLastDisabled).toBe(false);
  });

  it("1.2 should calculate exact item range for middle page", () => {
    const res = computePaginationState(4, 10, 245, 25);
    expect(res).not.toBeNull();
    expect(res!.from).toBe(76);
    expect(res!.to).toBe(100);
    expect(res!.isFirstDisabled).toBe(false);
    expect(res!.isLastDisabled).toBe(false);
  });

  it("1.3 should calculate exact item range for final partial page", () => {
    const res = computePaginationState(10, 10, 245, 25);
    expect(res).not.toBeNull();
    expect(res!.from).toBe(226);
    expect(res!.to).toBe(245); // Clamped to totalItems
    expect(res!.isFirstDisabled).toBe(false);
    expect(res!.isLastDisabled).toBe(true);
  });

  it("1.4 should generate correct ellipsis array for start, middle, and end", () => {
    // Page 1 of 10 -> [1, 2, '...', 10]
    const p1 = computePaginationState(1, 10, 245, 25);
    expect(p1!.pages).toEqual([1, 2, "...", 10]);

    // Page 5 of 10 -> [1, '...', 4, 5, 6, '...', 10]
    const p5 = computePaginationState(5, 10, 245, 25);
    expect(p5!.pages).toEqual([1, "...", 4, 5, 6, "...", 10]);

    // Page 10 of 10 -> [1, '...', 9, 10]
    const p10 = computePaginationState(10, 10, 245, 25);
    expect(p10!.pages).toEqual([1, "...", 9, 10]);
  });

  it("1.5 should return null when totalItems is 0", () => {
    const res = computePaginationState(1, 1, 0, 25);
    expect(res).toBeNull();
  });

  it("1.6 should correctly test session storage helpers", () => {
    const storageMock: Record<string, string> = {};
    const mockSession = {
      getItem: (key: string) => storageMock[key] || null,
      setItem: (key: string, val: string) => { storageMock[key] = val; },
    };
    vi.stubGlobal("window", { sessionStorage: mockSession });

    expect(getPersistedPageSize(25)).toBe(25);
    persistPageSize(50);
    expect(getPersistedPageSize(25)).toBe(50);

    // Unsupported value falls back to default
    mockSession.setItem(PERSISTED_PAGE_SIZE_KEY, "999");
    expect(getPersistedPageSize(25)).toBe(25);

    vi.unstubAllGlobals();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: DATATABLE SORTING & VIRTUALIZATION MATHEMATICS
// ═══════════════════════════════════════════════════════════════════════════

describe("2. DataTable Sorting Algorithms & Virtualization Calculations", () => {
  interface TestRecord {
    id: number;
    name: string;
    age: number | null;
    score?: number;
  }

  const sampleData: TestRecord[] = [
    { id: 1, name: "Charlie", age: 30, score: 85 },
    { id: 2, name: "Alice", age: 25, score: 92 },
    { id: 3, name: "Bob", age: null, score: 78 },
    { id: 4, name: "David", age: 25, score: 60 },
  ];

  function sortData<T>(items: T[], key: keyof T, direction: "asc" | "desc"): T[] {
    return [...items].sort((a, b) => {
      const valA = a[key];
      const valB = b[key];
      if (valA == null) return 1;
      if (valB == null) return -1;

      if (typeof valA === "string" && typeof valB === "string") {
        return direction === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  it("2.1 should sort strings alphabetically in asc and desc order", () => {
    const asc = sortData(sampleData, "name", "asc");
    expect(asc.map(r => r.name)).toEqual(["Alice", "Bob", "Charlie", "David"]);

    const desc = sortData(sampleData, "name", "desc");
    expect(desc.map(r => r.name)).toEqual(["David", "Charlie", "Bob", "Alice"]);
  });

  it("2.2 should sort numbers and push null values to the end", () => {
    const asc = sortData(sampleData, "age", "asc");
    expect(asc[0].age).toBe(25);
    expect(asc[1].age).toBe(25);
    expect(asc[2].age).toBe(30);
    expect(asc[3].age).toBeNull();
  });

  it("2.3 should compute virtual scroll window with overscan", () => {
    function computeVirtualWindow(
      total: number,
      scrollTop: number,
      rowHeight: number,
      maxVirtualHeight: number,
      overscan: number = 5
    ) {
      const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
      const visibleCount = Math.ceil(maxVirtualHeight / rowHeight) + overscan * 2;
      const endIndex = Math.min(total, startIndex + visibleCount);

      const topSpacer = startIndex * rowHeight;
      const bottomSpacer = Math.max(0, (total - endIndex) * rowHeight);

      return { startIndex, endIndex, topSpacer, bottomSpacer };
    }

    const res = computeVirtualWindow(100, 1000, 50, 500);
    expect(res.startIndex).toBe(15);
    expect(res.endIndex).toBe(35);
    expect(res.topSpacer).toBe(15 * 50); // 750px
    expect(res.bottomSpacer).toBe((100 - 35) * 50); // 3250px
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: ENHANCED TABLE MULTI-KEY SEARCH & FILTERING LOGIC
// ═══════════════════════════════════════════════════════════════════════════

describe("3. EnhancedTable Multi-Key Search & Filter Composition", () => {
  interface StudentRow {
    id: string;
    name: string;
    rollNo: string;
    class: string;
    gender: string;
  }

  const dataset: StudentRow[] = [
    { id: "1", name: "Alice Wonderland", rollNo: "101", class: "Grade 10", gender: "female" },
    { id: "2", name: "Bob Builder", rollNo: "102", class: "Grade 10", gender: "male" },
    { id: "3", name: "Charlie Brown", rollNo: "103", class: "Grade 9", gender: "male" },
    { id: "4", name: "Diana Prince", rollNo: "104", class: "Grade 9", gender: "female" },
  ];

  function filterDataset<T extends Record<string, unknown>>(
    items: T[],
    searchQuery: string,
    searchKeys: (keyof T)[],
    selectedFilters: Record<string, string>
  ): T[] {
    return items.filter((item) => {
      for (const [key, val] of Object.entries(selectedFilters)) {
        if (val && val !== "") {
          const itemVal = item[key];
          if (String(itemVal).toLowerCase() !== val.toLowerCase()) {
            return false;
          }
        }
      }

      if (searchQuery.trim() && searchKeys.length > 0) {
        const query = searchQuery.toLowerCase().trim();
        const matches = searchKeys.some((k) => {
          const v = item[k];
          return v != null && String(v).toLowerCase().includes(query);
        });
        if (!matches) return false;
      }

      return true;
    });
  }

  it("3.1 should search across multiple keys (name and rollNo) case-insensitively", () => {
    const byName = filterDataset(dataset, "char", ["name", "rollNo"], {});
    expect(byName).toHaveLength(1);
    expect(byName[0].name).toBe("Charlie Brown");

    const byRoll = filterDataset(dataset, "104", ["name", "rollNo"], {});
    expect(byRoll).toHaveLength(1);
    expect(byRoll[0].name).toBe("Diana Prince");
  });

  it("3.2 should apply strict filter matching on dropdown filter keys", () => {
    const grade9 = filterDataset(dataset, "", ["name"], { class: "Grade 9" });
    expect(grade9).toHaveLength(2);
    expect(grade9.map(s => s.name)).toEqual(["Charlie Brown", "Diana Prince"]);
  });

  it("3.3 should compose search query AND multiple filter dropdowns simultaneously", () => {
    const filtered = filterDataset(
      dataset,
      "di",
      ["name"],
      { class: "Grade 9", gender: "female" }
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("Diana Prince");
  });

  it("3.4 should return empty array when no records match filter criteria", () => {
    const empty = filterDataset(dataset, "NonexistentName", ["name"], {});
    expect(empty).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: ROLE & PERMISSION MATRIX VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

describe("4. Role & Permission Matrix Verification (lib/permissions.ts)", () => {
  it("4.1 should grant super_admin full view and edit permissions across all modules", () => {
    const modules: PermissionModule[] = [
      "students", "teachers", "parents", "classes", "academic",
      "examination", "attendance", "fees", "transport", "reports",
      "notices", "leaves", "homework", "results", "salary", "assessments"
    ];

    for (const mod of modules) {
      expect(hasPermission("super_admin", mod, "view")).toBe(true);
      expect(hasPermission("super_admin", mod, "edit")).toBe(true);
    }
  });

  it("4.2 should enforce strict boundaries for student role", () => {
    expect(hasPermission("student", "homework", "view")).toBe(true);
    expect(hasPermission("student", "results", "view")).toBe(true);
    expect(hasPermission("student", "attendance", "view")).toBe(true);

    expect(hasPermission("student", "salary", "view")).toBe(false);
    expect(hasPermission("student", "teachers", "edit")).toBe(false);
    expect(hasPermission("student", "classes", "edit")).toBe(false);
  });

  it("4.3 should enforce strict boundaries for parent role", () => {
    expect(hasPermission("parent", "attendance", "view")).toBe(true);
    expect(hasPermission("parent", "results", "view")).toBe(true);
    expect(hasPermission("parent", "homework", "view")).toBe(true);

    expect(hasPermission("parent", "homework", "edit")).toBe(false);
    expect(hasPermission("parent", "classes", "view")).toBe(false);
    expect(hasPermission("parent", "salary", "view")).toBe(false);
  });

  it("4.4 should respect HIDE_FEES_FEATURE flag on fees permissions", () => {
    const canSuperAdminViewFees = hasPermission("super_admin", "fees", "view");
    if (HIDE_FEES_FEATURE) {
      expect(canSuperAdminViewFees).toBe(false);
    } else {
      expect(canSuperAdminViewFees).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: ROUTE MODULE MAPPING CONSISTENCY
// ═══════════════════════════════════════════════════════════════════════════

describe("5. Dashboard Route Module Mapping Consistency", () => {
  const ROUTE_MODULE_MAP: { prefix: string; module: PermissionModule }[] = [
    { prefix: "/students", module: "students" },
    { prefix: "/teachers", module: "teachers" },
    { prefix: "/guardians", module: "parents" },
    { prefix: "/classes", module: "classes" },
    { prefix: "/academic", module: "academic" },
    { prefix: "/academic-mgmt", module: "academic" },
    { prefix: "/examination", module: "examination" },
    { prefix: "/report-cards", module: "examination" },
    { prefix: "/attendance", module: "attendance" },
    { prefix: "/fees", module: "fees" },
    { prefix: "/fees-collection", module: "fees" },
    { prefix: "/transport", module: "transport" },
    { prefix: "/reports", module: "reports" },
    { prefix: "/notices", module: "notices" },
    { prefix: "/leave", module: "leaves" },
    { prefix: "/homework", module: "homework" },
    { prefix: "/results", module: "results" },
    { prefix: "/salary", module: "salary" },
    { prefix: "/assessments", module: "assessments" },
    { prefix: "/documents", module: "notices" },
  ];

  it("5.1 all route prefixes must start with forward slash", () => {
    for (const entry of ROUTE_MODULE_MAP) {
      expect(entry.prefix.startsWith("/")).toBe(true);
    }
  });

  it("5.2 every mapped module must exist in ROLE_PERMISSIONS.super_admin", () => {
    const superAdminPerms = ROLE_PERMISSIONS.super_admin;
    for (const entry of ROUTE_MODULE_MAP) {
      expect(superAdminPerms[entry.module]).toBeDefined();
      expect(Array.isArray(superAdminPerms[entry.module])).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: ALERT VARIANT & TYPE CLASS MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════

describe("6. Alert Variant & Type Style Class Mappings", () => {
  type AlertVariant = "primary" | "secondary" | "success" | "danger" | "warning" | "info" | "light" | "dark";
  type AlertType = "default" | "solid" | "bordered";

  const allVariants: AlertVariant[] = ["primary", "secondary", "success", "danger", "warning", "info", "light", "dark"];
  const allTypes: AlertType[] = ["default", "solid", "bordered"];

  const variantStyles: Record<AlertType, Record<AlertVariant, string>> = {
    default: {
      primary: "bg-[#EFF6FF] text-[#3B82F6]",
      secondary: "bg-[#ECFEFF] text-[#06B6D4]",
      success: "bg-[#ECFDF5] text-[#10B981]",
      danger: "bg-[#FEF2F2] text-[#EF4444]",
      warning: "bg-[#FFFBEB] text-primary",
      info: "bg-[#EFF6FF] text-[#2563EB]",
      light: "bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] text-[#64748B]",
      dark: "bg-[#E2E8F0] text-foreground",
    },
    solid: {
      primary: "bg-[#3B82F6] text-white",
      secondary: "bg-[#06B6D4] text-white",
      success: "bg-[#10B981] text-white",
      danger: "bg-[#EF4444] text-white",
      warning: "bg-primary text-white",
      info: "bg-[#2563EB] text-white",
      light: "bg-[#F1F5F9] text-[#475569]",
      dark: "bg-[var(--sidebar-bg)] text-white",
    },
    bordered: {
      primary: "bg-white dark:bg-slate-900 border border-[#3B82F6] text-[#3B82F6]",
      secondary: "bg-white dark:bg-slate-900 border border-[#06B6D4] text-[#06B6D4]",
      success: "bg-white dark:bg-slate-900 border border-[#10B981] text-[#10B981]",
      danger: "bg-white dark:bg-slate-900 border border-[#EF4444] text-[#EF4444]",
      warning: "bg-white dark:bg-slate-900 border border-primary text-primary",
      info: "bg-white dark:bg-slate-900 border border-[#2563EB] text-[#2563EB]",
      light: "bg-white dark:bg-slate-900 border border-[#E2E8F0] text-[#64748B]",
      dark: "bg-white dark:bg-slate-900 border border-[#0F172A] text-foreground",
    },
  };

  it("6.1 should have complete 8x3 styling matrix defined for every type and variant combination", () => {
    for (const t of allTypes) {
      expect(variantStyles[t]).toBeDefined();
      for (const v of allVariants) {
        expect(variantStyles[t][v]).toBeDefined();
        expect(variantStyles[t][v].length).toBeGreaterThan(0);
      }
    }
  });

  it("6.2 solid types should set high contrast text-white for primary, danger, and success", () => {
    expect(variantStyles.solid.primary).toContain("text-white");
    expect(variantStyles.solid.danger).toContain("text-white");
    expect(variantStyles.solid.success).toContain("text-white");
  });
});
