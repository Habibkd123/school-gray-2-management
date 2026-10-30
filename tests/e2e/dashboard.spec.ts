import { test, expect } from "@playwright/test";
import {
  loginAsSuperAdmin,
  loginAsSchoolAdmin,
  loginAsTeacher,
  loginAsStudent,
  loginAsParent,
} from "./helpers";

test.describe("Dashboard & Navigation Deep E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch {}
    });
  });

  // ─── SECTION 1: Role-Based Dashboard Rendering & Metrics ─────────────

  test("1. should render Super Admin Console with network metrics & overview tabs", async ({ page }) => {
    await loginAsSuperAdmin(page);

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");

    // Header Title
    await expect(page.locator("h1.page-title")).toContainText("Super Admin Console");

    // School Branding & Role Badge
    await expect(page.locator("aside")).toContainText("MySchoolLife");
    await expect(page.locator("aside")).toContainText("SUPER_ADMIN");

    // Super Admin navigation items
    await expect(page.locator("aside")).toContainText("Network Directory");
    await expect(page.locator("aside")).toContainText("All Schools");
    await expect(page.locator("aside")).toContainText("All Students");
  });

  test("2. should render School Admin Dashboard with welcome banner and live metric counts", async ({ page }) => {
    await loginAsSchoolAdmin(page, {
      subdomain: "myschool",
      stats: {
        students: { total: 450, active: 420, inactive: 30 },
        teachers: { total: 32, active: 30, inactive: 2 },
        classes: { total: 18, active: 18, inactive: 0 },
        subjects: { total: 42 },
        attendance: {
          total: 420,
          present: 395,
          absent: 15,
          late: 5,
          leave: 5,
          percentage: 94.0,
          marked: true,
        },
      },
    });

    await page.goto("/dashboard?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");

    // Header Title
    await expect(page.locator("h1.page-title")).toContainText("Admin Dashboard");

    // Welcome Banner with Admin name
    await expect(page.locator("text=Welcome Back, Principal")).toBeVisible();

    // Top 3 Metric Cards with exact counts
    await expect(page.locator("text=Total Students")).toBeVisible();
    await expect(page.locator("h3:has-text('450')")).toBeVisible();
    await expect(page.locator("text=Total Teachers")).toBeVisible();
    await expect(page.locator("h3:has-text('32')")).toBeVisible();
    await expect(page.locator("text=Total Classes")).toBeVisible();
    await expect(page.locator("h3:has-text('18')")).toBeVisible();

    // Active / Inactive breakdown
    await expect(page.locator("text=Active : 420")).toBeVisible();
    await expect(page.locator("text=Inactive : 30")).toBeVisible();

    // Schedules Calendar Section
    await expect(page.locator("text=Schedules")).toBeVisible();
    await expect(page.locator("a[href='/classes/schedule']")).toBeVisible();
  });

  test("3. should render Teacher Dashboard with schedule and teacher-specific modules", async ({ page }) => {
    await loginAsTeacher(page, { subdomain: "myschool" });

    await page.goto("/dashboard?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");

    // Header Title
    await expect(page.locator("h1.page-title")).toContainText("Teacher Dashboard");

    // Role Indicator in Sidebar
    await expect(page.locator("aside")).toContainText("TEACHER");
    await expect(page.locator("aside")).toContainText("Edna Krabappel");

    // Allowed Teacher Sidebar Links
    await expect(page.locator("aside")).toContainText("Classes & Schedule");
    await expect(page.locator("aside")).toContainText("Assessments");
    await expect(page.locator("aside")).toContainText("Notice Board");

    // Restricted Admin-only Links must NOT be visible
    await expect(page.locator("aside a:has-text('All Schools')")).toHaveCount(0);
    await expect(page.locator("aside a:has-text('Network Directory')")).toHaveCount(0);
    await expect(page.locator("aside a:has-text('Transport')")).toHaveCount(0);
  });

  test("4. should render Student Dashboard with routine and student profile sections", async ({ page }) => {
    await loginAsStudent(page, { subdomain: "myschool" });

    await page.goto("/dashboard?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");

    // Header Title
    await expect(page.locator("h1.page-title")).toContainText("Student Dashboard");

    // Role Indicator in Sidebar
    await expect(page.locator("aside")).toContainText("STUDENT");
    await expect(page.locator("aside")).toContainText("Bart Simpson");

    // Allowed Student Links
    await expect(page.locator("aside")).toContainText("Academic");
    await expect(page.locator("aside")).toContainText("My Tests");
    await expect(page.locator("aside")).toContainText("Attendance");

    // Restricted Admin Links must NOT be visible
    await expect(page.locator("aside a:has-text('Teachers')")).toHaveCount(0);
    await expect(page.locator("aside a:has-text('HR Management')")).toHaveCount(0);
  });

  test("5. should render Parent Portal with child selector and linked child details", async ({ page }) => {
    await loginAsParent(page, {
      subdomain: "myschool",
      children: [
        {
          _id: "60f000000000000000000301",
          name: "Bart Simpson",
          roll_no: "101",
          class_id: { _id: "60f000000000000000000401", name: "Grade 5", section: "A" },
        },
        {
          _id: "60f000000000000000000302",
          name: "Lisa Simpson",
          roll_no: "102",
          class_id: { _id: "60f000000000000000000402", name: "Grade 3", section: "B" },
        },
      ],
    });

    await page.goto("/dashboard?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");

    // Header Title
    await expect(page.locator("h1.page-title")).toContainText("Parent Portal");

    // Welcome Banner
    await expect(page.locator("text=Welcome to the Parent Portal")).toBeVisible();

    // Child Selector dropdown
    const childSelect = page.locator("select:has-text('Bart Simpson')");
    await expect(childSelect).toBeVisible();
    await expect(childSelect).toContainText("Lisa Simpson");

    // Changing child selection works smoothly
    await childSelect.selectOption({ label: "Lisa Simpson (Grade 3 B)" });
    await expect(childSelect).toHaveValue("60f000000000000000000302");
  });

  test("6. should render empty state on Parent Portal when parent has no linked children", async ({ page }) => {
    await loginAsParent(page, {
      subdomain: "myschool",
      children: [],
    });

    await page.goto("/dashboard?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");

    // Empty state card
    await expect(page.locator("h3:has-text('No Children Found')")).toBeVisible();
    await expect(
      page.locator("text=We couldn't find any students linked to your account.")
    ).toBeVisible();
  });

  // ─── SECTION 2: Sidebar Navigation, Accordions & Highlighting ────────

  test("7. should expand accordion menu and navigate to sub-items with active highlighting", async ({ page }) => {
    await loginAsSchoolAdmin(page, { subdomain: "myschool" });

    await page.goto("/dashboard?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");

    // "Classes" sub-link should not be visible before expanding Academic
    const classesLink = page.locator("aside a[href='/academic-mgmt/classes']");
    await expect(classesLink).toHaveCount(0);

    // Click "Academic" menu in sidebar to expand
    await page.locator("aside button:has-text('Academic')").click();

    // Sub-items become visible
    await expect(classesLink).toBeVisible();
    await expect(page.locator("aside a[href='/academic-mgmt/syllabus']")).toBeVisible();

    // Click "Classes" sub-item
    await classesLink.click();
    await page.waitForURL(/\/academic-mgmt\/classes/);
    await expect(page).toHaveURL(/\/academic-mgmt\/classes/);

    // Sub-item has active class (text-primary font-bold)
    await expect(page.locator("aside a[href='/academic-mgmt/classes']")).toHaveClass(/text-primary/);
  });

  test("8. should dynamically show or hide Streams and Sections in Academic menu based on config", async ({ page }) => {
    // Config with streams disabled, sections enabled
    await loginAsSchoolAdmin(page, {
      subdomain: "myschool",
      enableStreams: false,
      enableSections: true,
    });

    await page.goto("/dashboard?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");

    // Expand Academic menu
    await page.locator("aside button:has-text('Academic')").click();

    // Sections should be visible, Streams should be absent
    await expect(page.locator("aside a[href='/academic-mgmt/sections']")).toBeVisible();
    await expect(page.locator("aside a[href='/academic-mgmt/streams']")).toHaveCount(0);
  });

  test("9. should collapse and expand sidebar on desktop toggle button", async ({ page }) => {
    await loginAsSchoolAdmin(page, { subdomain: "myschool" });

    await page.goto("/dashboard?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");

    const sidebar = page.locator("aside");
    await expect(sidebar).toHaveClass(/md:w-\[240px\]/);

    // Click collapse toggle
    const collapseBtn = page.locator("button[title='Collapse Sidebar']");
    await collapseBtn.click();

    // Sidebar should now have collapsed class
    await expect(sidebar).toHaveClass(/md:w-\[80px\]/);

    // Click expand toggle
    const expandBtn = page.locator("button[title='Expand Sidebar']");
    await expandBtn.click();

    // Sidebar restored to full width
    await expect(sidebar).toHaveClass(/md:w-\[240px\]/);
  });

  // ─── SECTION 3: Header Interactions, Dropdowns & Modals ──────────────

  test("10. should open and toggle academic year selector dropdown", async ({ page }) => {
    await loginAsSchoolAdmin(page, { subdomain: "myschool" });

    await page.goto("/dashboard?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");

    // Academic Year button displays initial year
    const yearBtn = page.locator("header button:has-text('2026 / 2027')");
    await expect(yearBtn).toBeVisible();

    // Click to open dropdown
    await yearBtn.click();

    // Dropdown menu options visible
    const dropdown = page.locator("header button:has-text('2026 / 2027') + div, header div:has-text('2026 / 2027')").last();
    await expect(dropdown).toBeVisible();

    // Click backdrop or option to close
    await page.keyboard.press("Escape");
  });

  test("11. should open notification drawer with items and allow dismiss", async ({ page }) => {
    await loginAsSchoolAdmin(page, { subdomain: "myschool" });

    await page.goto("/dashboard?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");

    // Notification bell button
    const bellBtn = page.locator("header button:has(.lucide-bell)");
    await expect(bellBtn).toBeVisible();

    // Click bell button
    await bellBtn.click();

    // Notification drawer opens
    await expect(page.locator("text=Notifications (2)")).toBeVisible();
    await expect(page.locator("text=Mark all as read")).toBeVisible();
    await expect(page.locator("button:has-text('Cancel')")).toBeVisible();

    // Click Cancel button closes the drawer
    await page.locator("button:has-text('Cancel')").click();
    await expect(page.locator("text=Notifications (2)")).toHaveCount(0);
  });

  test("12. should open header profile dropdown and allow signing out", async ({ page }) => {
    await loginAsSchoolAdmin(page, { subdomain: "myschool" });

    await page.goto("/dashboard?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");

    // Profile button
    const profileBtn = page.locator("#header-profile-btn");
    await expect(profileBtn).toBeVisible();
    await profileBtn.click();

    // Dropdown contains user info and links (scoped to header dropdown)
    await expect(page.locator("header p:has-text('Principal Skinner')")).toBeVisible();
    await expect(page.locator("text=skinner@school.com")).toBeVisible();
    await expect(page.locator("header a:has-text('My Profile')")).toBeVisible();
    await expect(page.locator("header a:has-text('Settings')")).toBeVisible();

    // Logout button triggers session clear
    const logoutBtn = page.locator("#header-logout-btn");
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Check localStorage cleared
    const token = await page.evaluate(() => window.localStorage.getItem("sm_access_token"));
    expect(token).toBeNull();
  });

  test("13. should open and filter Command Menu via keyboard shortcut", async ({ page }) => {
    await loginAsSchoolAdmin(page, { subdomain: "myschool" });

    await page.goto("/dashboard?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");

    // Trigger Command Menu using Ctrl+K event
    await page.evaluate(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true })
      );
    });

    // Command Menu modal opens
    const searchInput = page.locator("input[placeholder*='Type a command']");
    await expect(searchInput).toBeVisible();

    // Search for students
    await searchInput.fill("Students");
    await expect(page.locator("text=Go to Students Directory")).toBeVisible();

    // Escape closes modal
    await page.keyboard.press("Escape");
    await expect(searchInput).toHaveCount(0);
  });

  // ─── SECTION 4: Responsive Mobile Layout & Direct URL Access ─────────

  test("14. should toggle mobile drawer open and closed on small viewport", async ({ page }) => {
    await loginAsSchoolAdmin(page, { subdomain: "myschool" });

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/dashboard?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");

    // Hamburger button should be visible on mobile
    const hamburgerBtn = page.locator("button[title='Open Sidebar']");
    await expect(hamburgerBtn).toBeVisible();

    // Click hamburger button to open mobile drawer
    await hamburgerBtn.click();

    const sidebar = page.locator("aside");
    await expect(sidebar).toHaveClass(/translate-x-0/);

    // Mobile Close button (X) is visible
    const closeBtn = page.locator("button[title='Close Sidebar']");
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Sidebar closes
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });

  test("15. should support direct URL navigation and browser back/forward history", async ({ page }) => {
    await loginAsSchoolAdmin(page, { subdomain: "myschool" });

    // Direct navigation to classes
    await page.goto("/academic-mgmt/classes?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/academic-mgmt\/classes/);

    // Direct navigation to students
    await page.goto("/students?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/students/);

    // Browser Back
    await page.goBack();
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/academic-mgmt\/classes/);

    // Browser Forward
    await page.goForward();
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/students/);
  });

  test("16. should enforce route-level permission guard redirecting unauthorized direct access", async ({ page }) => {
    // Student role attempting to access restricted /salary route
    await loginAsStudent(page, { subdomain: "myschool" });

    await page.goto("/salary?subdomain=myschool");
    await page.waitForLoadState("domcontentloaded");

    // Route-level permission guard redirects restricted routes back to /dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("17. should verify key navigation links respond with valid layout shells without broken errors", async ({ page }) => {
    await loginAsSchoolAdmin(page, { subdomain: "myschool" });

    const keyRoutes = [
      "/dashboard",
      "/students",
      "/teachers",
      "/guardians",
      "/notices",
    ];

    for (const route of keyRoutes) {
      await page.goto(`${route}?subdomain=myschool`);
      await page.waitForLoadState("domcontentloaded");

      // Verify page loaded without critical server crash or broken error container
      await expect(page).toHaveURL(new RegExp(route));
      await expect(page.locator("header")).toBeVisible();
      await expect(page.locator("aside")).toBeVisible();
    }
  });
});
