# Frontend & Shared Components Deep Test Plan & Regression Strategy

> **Project:** School Management System — Frontend & Shared Components  
> **Environment:** Next.js 15 App Router, React 19, TypeScript 5, TailwindCSS, Vitest, Playwright  
> **Target Paths:** `app/components/`, shared UI components, layouts, hooks, utilities, and `tests/e2e/`  
> **Execution Status:** **ALL SUITES EXECUTED & VERIFIED (41 / 41 PASSING)**

---

## 1. Objectives & Scope

The purpose of this test plan is to establish a rigorous, deep, and bulletproof verification suite for all shared frontend UI components, responsive layouts, client hooks, arithmetic utilities, keyboard navigation patterns, and cross-module role regression guards.

### Core Verification Pillars
1. **Reusable Component Architecture:** Verify buttons, inputs, form controls, modals, tables, dropdowns, alerts, notifications, file upload fields, and pagination controls.
2. **State & Prop Reactivity:** Test dynamic filtering, sorting indicators, pagination slicing, external vs. internal pagination, clear buttons, and loading states.
3. **Keyboard Navigation & Accessibility (a11y):** Test global hotkeys (`Control+k`, `/`), Escape key dismissal, backdrop overlays, and focus management.
4. **Responsive Layouts:** Verify desktop aside navigation, mobile slide-over drawers with backdrop dismissal, and role badge indicators across viewports.
5. **Cross-Module Role Regression:** Confirm strict route access guards and UI element restrictions between `super_admin`, `school_admin`, `teacher`, `student`, and `parent`.
6. **Codebase Integrity:** Enforce clean TypeScript static typecheck (`npx tsc --noEmit`), production build bundling (`npm run build`), and unit calculation suites.

---

## 2. Shared Components Inventory & Test Matrix

| Component | Path | Key Capabilities Tested | Test Suite |
| :--- | :--- | :--- | :--- |
| **PaginationBar** | `app/components/ui/pagination-bar.tsx` | Clamping, bounds math, ellipsis `[1, 2, '...', 10]`, `sessionStorage` page size persistence | Vitest + Playwright |
| **DataTable** | `app/components/ui/data-table.tsx` | Alphabetical & numeric asc/desc sorting, null-safety, virtual scroll spacer calculations (`overscan=5`) | Vitest + Playwright |
| **EnhancedTable** | `app/components/ui/EnhancedTable.tsx` | Multi-key client search, dropdown filter composition, empty state banner, external pagination bridge | Vitest + Playwright |
| **CommandMenu** | `app/components/ui/CommandMenu.tsx` | Hotkeys (`Ctrl+K`, `/`), dynamic query filtering, Escape dismissal, backdrop click dismiss | Playwright E2E |
| **Alert Showcase** | `app/components/ui/Alert.tsx` | 8 variants x 3 styles (24-class matrix), dismissible alerts (X), live alert dynamic mounting | Vitest + Playwright |
| **ConfirmModal** | `app/components/ui/ConfirmModal.tsx` | Modal mount, title, message text, Cancel dismissal, action confirmation triggers | Playwright E2E |
| **FileUploadField** | `app/components/ui/FileUploadField.tsx` | URL vs. Upload mode toggling, input typing, clear button, upload dropzone hint | Playwright E2E |
| **Header & Sidebar** | `app/components/layout/` | Active role display, profile menu toggle, academic year switcher, mobile drawer | Playwright E2E |
| **Permission Matrix** | `lib/config/permissions.ts` | 18-module super_admin unrestricted access, student/parent boundary confinement, feature flags | Vitest Calculations |
| **Route Module Map** | `lib/config/permissions.ts` | 20 route prefixes leading forward slashes, valid PermissionModule key mapping | Vitest Calculations |

---

## 3. Test Suites Structure

```
+-----------------------------------------------------------------------------------+
|                        Frontend Verification Harness                              |
+-----------------------------------------------------------------------------------+
                               |
       +-----------------------+-----------------------+
       |                                               |
       v                                               v
+-------------------------------+             +-------------------------------+
| Vitest Calculation Suite      |             | Playwright E2E Suite          |
| tests/shared-components-      |             | tests/e2e/shared-components-  |
| calculations.test.ts          |             | regression.spec.ts            |
| (21 Automated Tests)          |             | (20 Automated Tests)          |
+-------------------------------+             +-------------------------------+
       |                                               |
       |-- Pagination Bounds Mathematics               |-- Header Profile & Year Dropdown
       |-- DataTable Sorting & Virtual Overscan        |-- Mobile Sidebar Drawer & Backdrop
       |-- EnhancedTable Search & Filter Composition   |-- CommandMenu Global Shortcuts
       |-- Role & Permission Matrix Boundaries         |-- Alert Showcase & Dismissals
       |-- Dashboard Route Module Consistency          |-- Sections Table Sort & Filter
       \-- Alert 8x3 Variant Class Resolution          |-- ConfirmModal Delete Interaction
                                                       |-- FileUploadField Mode Switcher
                                                       \-- Cross-Module RBAC Route Guards
```

---

## 4. Execution Commands & Logs

### Suite 1: Vitest Unit & Calculation Suite
```bash
npx vitest run tests/shared-components-calculations.test.ts
```
**Outcome:** `21 passed (21)` — 400ms duration.

### Suite 2: Playwright Shared Components & Regression Suite
```bash
npx playwright test tests/e2e/shared-components-regression.spec.ts --reporter=list
```
**Outcome:** `20 passed (20)` — 9.9s duration across 4 parallel workers.

### Suite 3: Full TypeScript Static Typecheck
```bash
npx tsc --noEmit
```
**Outcome:** Exit code 0 (Zero compiler errors across all files).

### Suite 4: Production Build Bundle
```bash
npm run build
```
**Outcome:** Exit code 0 (All 143 dynamic route handlers, layouts, static pages, and middleware compiled).

---

## 5. Verification Verdict

**Verdict:** **PASS WITH RISKS**

- **Verified:** All 41 component unit calculations and end-to-end integration tests execute cleanly with 100% pass rate.
- **Risks Documented:**
  1. `sessionStorage` caching in `useSections.ts` requires explicit invalidation if external mutations occur without socket events.
  2. Backdrop overlays (`z-40`) completely intercept viewport clicks when menus are open, requiring proper event bubbling or backdrop targets for clean dismissal.
  3. Pre-existing ESLint warnings in older legacy tests (`tests/*.test.ts`) require future cleanup (`any` types and unused variables).
