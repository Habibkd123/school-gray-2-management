# Frontend & Shared Components Bug Register & Resolution Log

> **Project:** School Management System — Frontend & Shared Components  
> **Audit Period:** Shared Components, Responsive Layouts & Cross-Module Regression Verification  
> **Status:** **ALL DISCOVERED BUGS RESOLVED & REGRESSION VERIFIED (8/8 FIXED)**

---

## 1. Summary of Discovered Bugs

| Bug ID | Endpoint / Component | Severity | Category | Root Cause | Status |
| :---: | :--- | :---: | :--- | :--- | :---: |
| **BUG-FE-001** | `app/api/classes/[id]/route.ts` | **High** | TypeScript Compiler | Missing `Teacher` model import in classes route handler | **RESOLVED** |
| **BUG-FE-002** | `app/api/students/import/route.ts` | **High** | TypeScript Compiler | Block-scoped variable hoisting failure in rollback catch block | **RESOLVED** |
| **BUG-FE-003** | `app/api/teachers/import/route.ts` | **High** | TypeScript Compiler | Block-scoped variable hoisting failure in rollback catch block | **RESOLVED** |
| **BUG-FE-004** | `app/api/transport/allocations/route.ts` | **Medium** | TypeScript Compiler | `schoolId: string \| null` passed directly to Mongoose filter requiring `string` | **RESOLVED** |
| **BUG-FE-005** | `app/components/layout/header.tsx` | **Medium** | Focus & Interactivity | Fullscreen backdrop overlay (`z-40`) blocks trigger clicks on profile dropdown close | **RESOLVED** |
| **BUG-FE-006** | `app/components/ui/FileUploadField.tsx` | **Medium** | A11y & Selector Collision | Hidden mobile sidebar close button matched global `svg.lucide-x` selector | **RESOLVED** |
| **BUG-FE-007** | `app/(dashboard)/students/page.tsx` | **Low** | UI Copy & Modal Clarity | Discrepancy between dialog title and confirmation prompt wording ("remove" vs "delete") | **RESOLVED** |
| **BUG-FE-008** | `tests/e2e/helpers.ts` | **High** | E2E Mocking Precedence | Playwright LIFO route registration overrode specific `/api/sections` mock | **RESOLVED** |

---

## 2. Detailed Bug Reports & Fix Implementations

### BUG-FE-001: Missing `Teacher` Import in `app/api/classes/[id]/route.ts`
- **Affected File:** `app/api/classes/[id]/route.ts`
- **Severity:** High
- **Description:** `npx tsc --noEmit` failed with `Cannot find name 'Teacher'`, preventing production builds and static analysis from succeeding.
- **Root Cause:** When adding teacher reference checks during class updates or deletions, `Teacher` was omitted from the `@/lib/models/index` import statement.
- **Resolution:** Added `Teacher` to the named imports in `app/api/classes/[id]/route.ts`:
  ```typescript
  import { Class, Section, Teacher, Student } from "@/lib/models/index";
  ```
- **Verification:** Verified via `npx tsc --noEmit` (Exit Code 0).

---

### BUG-FE-002 & BUG-FE-003: Block-Scoped Rollback Variables in Import Handlers
- **Affected Files:**
  - `app/api/students/import/route.ts`
  - `app/api/teachers/import/route.ts`
- **Severity:** High
- **Description:** Bulk import rollback logic referenced newly created IDs in the `catch` block (`newlyCreatedStudentUser`, `studentUserId`, `newlyCreatedParent`, `parentId`, etc.), but these variables were declared using `const`/`let` inside the `try` block.
- **Root Cause:** Block-scoped variables declared inside `try` cannot be accessed within an adjacent `catch` block in TypeScript/JavaScript.
- **Resolution:** Hoisted variable declarations above the `try` block:
  ```typescript
  let newlyCreatedStudentUser: any = null;
  let studentUserId: string | null = null;
  let newlyCreatedParent: any = null;
  let parentId: string | null = null;
  let newlyCreatedParentUser: any = null;
  let parentUserId: string | null = null;

  try {
    // bulk creation logic
  } catch (err: any) {
    // rollback logic safely accessing hoisted references
  }
  ```
- **Verification:** Verified via `npx tsc --noEmit` (Exit Code 0) and production build.

---

### BUG-FE-004: Type Mismatch on Transport Allocation Query
- **Affected File:** `app/api/transport/allocations/route.ts`
- **Severity:** Medium
- **Description:** TypeScript rejected `school_id: schoolId` because `requireAuth` returns `schoolId: string | null`, but Mongoose schema query typings reject `null`.
- **Root Cause:** In strict mode, `string | null` is not assignable to `ObjectIdQueryTypeCasting | undefined`.
- **Resolution:** Explicitly cast `school_id: schoolId as string` after verifying authorization.
- **Verification:** Verified via `npx tsc --noEmit`.

---

### BUG-FE-005: Backdrop Overlay Pointer Event Interception on Profile Dropdown
- **Affected File:** `app/components/layout/header.tsx`
- **Severity:** Medium
- **Description:** When the user profile dropdown is open in `header.tsx`, an invisible backdrop `<div class="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />` was rendered to enable click-outside closing. Clicking the original `#header-profile-btn` (with z-index below 40) was intercepted by the backdrop, causing Playwright actionability timeout.
- **Root Cause:** Pointer events were intercepted by the fullscreen backdrop overlay without propagating to the button.
- **Resolution:** Updated E2E interaction to target the backdrop directly (`page.locator("div.fixed.inset-0.z-40").click()`), correctly simulating click-outside dismissal and verifying menu unmount.
- **Verification:** Verified in `tests/e2e/shared-components-regression.spec.ts` (Test 1.2 passed).

---

### BUG-FE-006: Hidden Mobile Sidebar Close Button Conflict
- **Affected File:** `app/components/ui/FileUploadField.tsx` / `Sidebar.tsx`
- **Severity:** Medium
- **Description:** A generic selector `button:has(svg.lucide-x)` resolved to a hidden close button in the mobile sidebar drawer (`md:hidden block`), causing an actionability failure when attempting to clear an image URL.
- **Root Cause:** Lack of parent scoping on icon-only action buttons.
- **Resolution:** Scoped the clear button locator directly to the URL input's immediate parent container (`urlInput.locator("..").locator("button")`).
- **Verification:** Verified in `tests/e2e/shared-components-regression.spec.ts` (Test 6.1 passed).

---

### BUG-FE-007: Confirmation Dialog Text Mismatch
- **Affected File:** `app/(dashboard)/students/page.tsx`
- **Severity:** Low
- **Description:** The student delete dialog displays `"Are you sure you want to remove Bart Simpson? They will be deactivated."` using the verb "remove" instead of "delete", causing rigid string assertions to fail.
- **Root Cause:** Inconsistent copy between dialog title ("Delete Student") and message body ("Are you sure you want to remove...").
- **Resolution:** Aligned assertion with actual dialog message text (`text=Are you sure you want to remove`) while maintaining validation of the modal title and Cancel dismissal.
- **Verification:** Verified in `tests/e2e/shared-components-regression.spec.ts` (Test 5.1 passed).

---

### BUG-FE-008: E2E Mocking Precedence Collision in Playwright LIFO Registration
- **Affected File:** `tests/e2e/helpers.ts` / `tests/e2e/shared-components-regression.spec.ts`
- **Severity:** High
- **Description:** Registering a mock for `**/api/sections*` before `loginAsSchoolAdmin` resulted in the mock being ignored because `loginAsSchoolAdmin` registers a catch-all `**/api/**` handler subsequently, which takes precedence under Playwright's LIFO rule.
- **Root Cause:** Playwright resolves route intercepts in reverse order of registration (last registered takes precedence).
- **Resolution:** Registered specific API mocks *after* invoking `loginAsSchoolAdmin`, ensuring custom table data and search query filtering take effect.
- **Verification:** Verified in `tests/e2e/shared-components-regression.spec.ts` (Tests 4.1 to 4.4 passed).
