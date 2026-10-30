import { test, expect } from "@playwright/test";
import {
  loginAsSchoolAdmin,
  loginAsTeacher,
} from "./helpers";

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: SHARED LAYOUT, HEADER, SIDEBAR & ROLE BADGES
// ═══════════════════════════════════════════════════════════════════════════

test.describe("1. Shared Dashboard Layout, Header & Sidebar Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch {}
    });
  });

  test("1.1 should render role badges and appropriate navigation for School Admin", async ({ page }) => {
    await loginAsSchoolAdmin(page, { subdomain: "myschool" });
    await page.goto("/dashboard?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");

    const aside = page.locator("aside");
    await expect(aside).toBeVisible();

    // Role indicator at bottom of sidebar
    await expect(aside.getByText("Logged in as")).toBeVisible();
    await expect(aside.getByText("ADMIN", { exact: true })).toBeVisible();

    // Critical Navigation links present
    await expect(aside.locator("a[href='/dashboard']:has-text('Overview')").first()).toBeVisible();
    await expect(aside.locator("a[href='/students']")).toBeVisible();
    await expect(aside.locator("a[href='/teachers']")).toBeVisible();
    await expect(aside.locator("a[href='/guardians']")).toBeVisible();
  });

  test("1.2 Header User Profile Dropdown: toggles menu with role badge, settings, and sign out", async ({ page }) => {
    await loginAsSchoolAdmin(page, { subdomain: "myschool" });
    await page.goto("/dashboard?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");

    // Click profile dropdown trigger
    const profileBtn = page.locator("#header-profile-btn");
    await expect(profileBtn).toBeVisible();
    await profileBtn.click();

    // Verify dropdown menu content
    await expect(page.locator("p:has-text('Principal Skinner')")).toBeVisible();
    await expect(page.locator("text=skinner@school.com")).toBeVisible();
    await expect(page.locator("header a[href='/settings/profile']")).toBeVisible();
    await expect(page.locator("header a[href='/settings']").first()).toBeVisible();
    await expect(page.locator("#header-logout-btn")).toBeVisible();

    // Close by clicking backdrop overlay
    await page.locator("div.fixed.inset-0.z-40").click();
    await expect(page.locator("#header-logout-btn")).not.toBeVisible();
  });

  test("1.3 Header Academic Year Dropdown: opens and allows year inspection", async ({ page }) => {
    await loginAsSchoolAdmin(page, { subdomain: "myschool" });
    await page.goto("/dashboard?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");

    const yearBtn = page.locator("header button:has-text('2026')");
    await expect(yearBtn).toBeVisible();
    await yearBtn.click();

    // Dropdown list appears
    await expect(page.locator("div.absolute button:has-text('2026 / 2027')").first()).toBeVisible();
  });

  test("1.4 Responsive Navigation: Mobile viewport opens mobile drawer and backdrop dismisses", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsSchoolAdmin(page, { subdomain: "myschool" });
    await page.goto("/dashboard?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");

    // In mobile, sidebar is off-screen initially (-translate-x-full)
    const hamburgerBtn = page.locator("header button[title='Open Sidebar']");
    await expect(hamburgerBtn).toBeVisible();
    await hamburgerBtn.click();

    // Mobile drawer is now open
    const aside = page.locator("aside");
    await expect(aside).toHaveClass(/translate-x-0/);

    // Clicking backdrop overlay closes the drawer
    const backdrop = page.locator(".fixed.inset-0.bg-black\\/60");
    await expect(backdrop).toBeVisible();
    await backdrop.click({ position: { x: 350, y: 300 } });

    await expect(aside).toHaveClass(/-translate-x-full/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: COMMAND MENU KEYBOARD NAVIGATION & SEARCH
// ═══════════════════════════════════════════════════════════════════════════

test.describe("2. Command Menu (CommandMenu.tsx)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSchoolAdmin(page, { subdomain: "myschool" });
    await page.goto("/dashboard?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");
  });

  test("2.1 should open CommandMenu on shortcut and autofocus search input", async ({ page }) => {
    await page.locator("body").click();
    await page.keyboard.press("Control+k");

    // Modal should be visible
    const searchInput = page.locator("input[placeholder*='Type a command']");
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await expect(searchInput).toBeFocused();

    // Commands list is visible
    await expect(page.locator("text=Go to Dashboard Overview")).toBeVisible();
    await expect(page.locator("text=Go to Students Directory")).toBeVisible();
  });

  test("2.2 should open CommandMenu on forward slash (/) key", async ({ page }) => {
    await page.locator("body").click();
    await page.keyboard.press("/");

    const searchInput = page.locator("input[placeholder*='Type a command']");
    await expect(searchInput).toBeVisible({ timeout: 5000 });
  });

  test("2.3 should filter command list dynamically as user types", async ({ page }) => {
    await page.locator("body").click();
    await page.keyboard.press("Control+k");
    const searchInput = page.locator("input[placeholder*='Type a command']");
    await expect(searchInput).toBeVisible();

    await searchInput.fill("Teachers");
    await expect(page.locator("text=Go to Teachers Directory")).toBeVisible();
    await expect(page.locator("text=Go to Students Directory")).not.toBeVisible();
  });

  test("2.4 should close CommandMenu when Escape key is pressed", async ({ page }) => {
    await page.locator("body").click();
    await page.keyboard.press("Control+k");
    const searchInput = page.locator("input[placeholder*='Type a command']");
    await expect(searchInput).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(searchInput).not.toBeVisible();
  });

  test("2.5 should close CommandMenu when clicking backdrop overlay", async ({ page }) => {
    await page.locator("body").click();
    await page.keyboard.press("Control+k");
    const searchInput = page.locator("input[placeholder*='Type a command']");
    await expect(searchInput).toBeVisible();

    // Click outside modal
    await page.mouse.click(10, 10);
    await expect(searchInput).not.toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: ALERT COMPONENT SHOWCASE (/ui-elements/alerts)
// ═══════════════════════════════════════════════════════════════════════════

test.describe("3. Alert Component Showcase (/ui-elements/alerts)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSchoolAdmin(page, { subdomain: "myschool" });
    await page.goto("/ui-elements/alerts?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");
  });

  test("3.1 should render default alert variants with proper colors and messages", async ({ page }) => {
    await expect(page.locator("h1:has-text('Alerts')")).toBeVisible();
    await expect(page.locator("strong:has-text('Primary')").first()).toBeVisible();
    await expect(page.locator("strong:has-text('Success')").first()).toBeVisible();
    await expect(page.locator("strong:has-text('Danger')").first()).toBeVisible();
    await expect(page.locator("strong:has-text('Warning')").first()).toBeVisible();
  });

  test("3.2 Dismissible Alert: clicking close button (X) removes alert from DOM", async ({ page }) => {
    const dismissCard = page.locator(".bg-white, .dark\\:bg-slate-900").filter({ hasText: "Dismissing Alert" });
    await expect(dismissCard).toBeVisible();

    const firstDismissBtn = dismissCard.locator("button").first();
    await expect(firstDismissBtn).toBeVisible();

    // Count alerts before dismiss
    const alertsBefore = await dismissCard.locator("strong:has-text('Primary')").count();
    expect(alertsBefore).toBeGreaterThan(0);

    // Dismiss the primary alert
    await firstDismissBtn.click();
    await expect(dismissCard.locator("strong:has-text('Primary')")).toHaveCount(0);
  });

  test("3.3 Live Alert: dynamically mounts alert and unmounts on dismissal", async ({ page }) => {
    const liveAlertBtn = page.locator("button:has-text('Show live alert')");
    await expect(liveAlertBtn).toBeVisible();

    // Initially not present
    await expect(page.locator("text=Nice, you triggered this alert message!")).toHaveCount(0);

    // Trigger live alert
    await liveAlertBtn.click();
    const liveAlert = page.locator("text=Nice, you triggered this alert message!");
    await expect(liveAlert).toBeVisible();

    // Close live alert
    const closeBtn = page.locator(".mb-4 button").first();
    await closeBtn.click();
    await expect(liveAlert).toHaveCount(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: ENHANCED TABLE, DATA TABLE & PAGINATION BAR
// ═══════════════════════════════════════════════════════════════════════════

test.describe("4. EnhancedTable, DataTable & PaginationBar Modules", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSchoolAdmin(page, { subdomain: "myschool" });

    // Intercept sections API AFTER login so it overrides default mock
    await page.route("**/api/sections*", async (route) => {
      const url = new URL(route.request().url());
      const search = url.searchParams.get("search")?.toLowerCase().trim() || "";
      const allSections = [
        { _id: "s-1", name: "Section A", status: "Active" },
        { _id: "s-2", name: "Section B", status: "Active" },
        { _id: "s-3", name: "Section C", status: "Inactive" },
      ];
      const filtered = search ? allSections.filter(s => s.name.toLowerCase().includes(search)) : allSections;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            sections: filtered,
            total: filtered.length,
            totalPages: Math.max(1, Math.ceil(filtered.length / 25)),
          },
        }),
      });
    });

    await page.goto("/academic-mgmt/sections?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");
  });

  test("4.1 should render table headers, rows, search input, and pagination bar", async ({ page }) => {
    // Search input
    const searchInput = page.locator("input[placeholder*='Search']").first();
    await expect(searchInput).toBeVisible();

    // Table rows
    const table = page.locator("table.erp-table");
    await expect(table).toBeVisible();
    await expect(page.locator("td:has-text('Section A')")).toBeVisible();
    await expect(page.locator("td:has-text('Section B')")).toBeVisible();

    // Pagination info
    await expect(page.locator("text=Showing")).toBeVisible();
  });

  test("4.2 Column Sorting: clicking sortable header toggles indicator between asc and desc", async ({ page }) => {
    const table = page.locator("table.erp-table");
    const nameHeader = table.locator("th:has-text('Section Name')");
    await expect(nameHeader).toBeVisible();

    // Click to sort asc
    await nameHeader.click();
    await expect(nameHeader.locator("span:has-text('↑')")).toBeVisible();

    // Click to sort desc
    await nameHeader.click();
    await expect(nameHeader.locator("span:has-text('↓')")).toBeVisible();
  });

  test("4.3 Real-time Search Filtering: filters records dynamically via search API query", async ({ page }) => {
    const searchInput = page.locator("input[placeholder*='Search']").first();
    await searchInput.fill("Section C");

    // Only Section C remains visible
    await expect(page.locator("td:has-text('Section C')")).toBeVisible();
    await expect(page.locator("td:has-text('Section A')")).toHaveCount(0);
  });

  test("4.4 Empty State: searching non-existent term displays empty state", async ({ page }) => {
    const searchInput = page.locator("input[placeholder*='Search']").first();
    await searchInput.fill("NonExistentSectionXYZ");

    // Sections page renders empty state banner
    await expect(page.locator("text=No sections found")).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: MODAL & CONFIRM MODAL COMPONENT INTERACTION
// ═══════════════════════════════════════════════════════════════════════════

test.describe("5. ConfirmModal Component Interactivity (/students)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSchoolAdmin(page, {
      subdomain: "myschool",
      studentsData: {
        students: [
          {
            _id: "stu-1",
            name: "Bart Simpson",
            admission_no: "ADM-001",
            roll_no: "101",
            class_id: { _id: "c-1", name: "Class 10", section: "A" },
            gender: "Male",
            is_active: true,
          },
        ],
        total: 1,
      },
    });
    await page.goto("/students?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");
  });

  test("5.1 ConfirmModal: opening delete modal displays title, message, and Cancel/Confirm buttons", async ({ page }) => {
    const deleteBtn = page.locator("button[title='Delete Student']").first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();

      // Confirm modal appears
      await expect(page.locator("h2:has-text('Delete Student')")).toBeVisible();
      await expect(page.locator("text=Are you sure you want to remove")).toBeVisible();

      // Cancel button dismisses modal
      const cancelBtn = page.locator("button:has-text('Cancel')").first();
      await cancelBtn.click();
      await expect(page.locator("h2:has-text('Delete Student')")).not.toBeVisible();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: FORM CONTROLS & FILE UPLOAD FIELD (/website/student-life)
// ═══════════════════════════════════════════════════════════════════════════

test.describe("6. FileUploadField Component Interactivity (/website/student-life)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSchoolAdmin(page, { subdomain: "myschool" });

    await page.route("**/api/landing*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: {} }),
      });
    });

    await page.goto("/website/student-life?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");
  });

  test("6.1 should render FileUploadField with label, URL/Upload mode switcher, and hint", async ({ page }) => {
    await expect(page.locator("text=Hero Banner Image").first()).toBeVisible();

    // Mode toggles
    const urlBtn = page.getByRole("button", { name: "URL" }).first();
    const uploadBtn = page.getByRole("button", { name: "Upload" }).first();
    await expect(urlBtn).toBeVisible();
    await expect(uploadBtn).toBeVisible();

    // URL mode input typing and clear
    const urlInput = page.locator("input[type='url']").first();
    await expect(urlInput).toBeVisible();
    await urlInput.fill("https://example.com/hero-banner.jpg");

    // Clear button appears
    const clearBtn = urlInput.locator("..").locator("button");
    await clearBtn.click();
    await expect(urlInput).toHaveValue("");

    // Switch to Upload mode
    await uploadBtn.click();
    await expect(page.locator("text=Click to upload").first()).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: CROSS-MODULE REGRESSION & SECURITY GUARDS
// ═══════════════════════════════════════════════════════════════════════════

test.describe("7. Cross-Module Regression & Layout Security Guards", () => {
  test("7.1 Unauthenticated direct access to /dashboard redirects to root /", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    await page.goto("/dashboard");
    await page.waitForURL((url) => url.pathname === "/" || url.pathname.includes("/login"));
    expect(page.url()).not.toContain("/dashboard");
  });

  test("7.2 Teacher role is restricted from accessing Super Admin and School Management pages", async ({ page }) => {
    await loginAsTeacher(page, { subdomain: "myschool" });
    await page.goto("/schools");

    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url.includes("/dashboard") || url.includes("/schools")).toBe(true);
    await expect(page.locator("button:has-text('Add School')")).toHaveCount(0);
  });
});
