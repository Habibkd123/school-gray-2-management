import { test, expect, Page } from "@playwright/test";
import {
  loginAsSuperAdmin,
  loginAsSchoolAdmin,
  loginAsTeacher,
  loginAsStudent,
  loginAsParent,
} from "./helpers";

// Helper to provide rich multi-school mock data and handle dynamic CRUD in E2E tests
async function setupCustomSchoolsMock(page: Page) {
  const dynamicSchools = [
    {
      _id: "60f000000000000000000101",
      name: "Springfield Academy",
      slug: "springfield",
      subdomain: "springfield",
      custom_domain: "portal.springfieldacademy.edu",
      address: "742 Evergreen Terrace, Springfield",
      phone: "+91 98765 43210",
      email: "principal@springfieldacademy.edu",
      timezone: "Asia/Kolkata",
      is_active: true,
      createdAt: "2026-01-10T08:00:00Z",
      studentsCount: 450,
      teachersCount: 32,
      classesCount: 18,
    },
    {
      _id: "60f000000000000000000102",
      name: "Shelbyville High School",
      slug: "shelbyville",
      subdomain: "shelbyville",
      custom_domain: "",
      address: "100 Lemon Tree Way, Shelbyville",
      phone: "+91 98765 11223",
      email: "admin@shelbyvillehigh.org",
      timezone: "Asia/Kolkata",
      is_active: false,
      createdAt: "2026-02-15T08:00:00Z",
      studentsCount: 180,
      teachersCount: 15,
      classesCount: 8,
    },
  ];

  // Intercept schools APIs in reverse LIFO so this takes precedence
  await page.route("**/api/schools**", async (route) => {
    const req = route.request();
    const method = req.method();

    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: dynamicSchools }),
      });
      return;
    }

    if (method === "POST") {
      const body = req.postDataJSON?.();
      if (!body?.name?.trim() || !body?.slug?.trim()) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "School name and slug are required." }),
        });
        return;
      }

      const newSchool = {
        _id: `60f000000000000000000${Date.now().toString().slice(-3)}`,
        name: body.name.trim(),
        slug: body.slug.trim().toLowerCase(),
        subdomain: body.subdomain ? body.subdomain.trim().toLowerCase() : body.slug.trim().toLowerCase(),
        custom_domain: body.custom_domain || "",
        address: body.address || "",
        phone: body.phone || "",
        email: body.email || "",
        timezone: "Asia/Kolkata",
        is_active: body.is_active !== undefined ? body.is_active : true,
        createdAt: new Date().toISOString(),
        studentsCount: 0,
        teachersCount: 0,
        classesCount: 0,
      };

      dynamicSchools.push(newSchool);

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: newSchool,
          message: "School created successfully",
        }),
      });
      return;
    }

    await route.continue();
  });

  // Intercept single school PUT/GET
  await page.route("**/api/schools/*", async (route) => {
    const req = route.request();
    const method = req.method();
    const url = req.url();
    const schoolId = url.split("/").pop()?.split("?")[0];

    if (method === "PUT") {
      const body = req.postDataJSON?.();
      const found = dynamicSchools.find((s) => s._id === schoolId);
      if (found) {
        if (body.name !== undefined) found.name = body.name;
        if (body.is_active !== undefined) found.is_active = body.is_active;
        if (body.address !== undefined) found.address = body.address;
        if (body.phone !== undefined) found.phone = body.phone;
        if (body.email !== undefined) found.email = body.email;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: found }),
      });
      return;
    }

    await route.continue();
  });

  // Intercept Meta Config API
  await page.route("**/api/school/meta-config**", async (route) => {
    const req = route.request();
    if (req.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            school_id: "60f000000000000000000101",
            meta_title: "Springfield Academy | Official ERP Portal",
            meta_description: "Premier academic management system for Springfield Academy.",
            meta_keywords: "springfield, school erp, students",
            og_image: "https://example.com/og.png",
            favicon_url: "https://example.com/favicon.ico",
            google_site_verification: "goog-verify-12345",
            google_analytics_id: "G-ABC12345",
            custom_head_scripts: "",
          },
        }),
      });
      return;
    }

    if (req.method() === "PUT") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "School metadata configuration updated successfully",
        }),
      });
      return;
    }

    await route.continue();
  });
}

test.describe("Super-Admin Portal & School Management - Deep / Bulletproof E2E Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Reset client-side storage between test runs
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch {}
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: SUPER-ADMIN LOGIN PORTAL (/super-admin)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("1. Super-Admin Dedicated Login Portal (/super-admin)", () => {
    test("1.1 should render dedicated Super Admin portal with dark theme, badge and security notice", async ({ page }) => {
      await page.goto("/super-admin");
      await page.waitForLoadState("domcontentloaded");

      // Verify portal header & title
      await expect(page.locator("h1:has-text('Super Admin Portal')")).toBeVisible();
      await expect(page.locator("text=MySchoolLife ERP — Restricted Access")).toBeVisible();

      // Verify hierarchy pill
      await expect(page.locator("text=Super Admin").first()).toBeVisible();

      // Verify inputs and login submit button
      await expect(page.locator("#sa-username")).toBeVisible();
      await expect(page.locator("#sa-password")).toBeVisible();
      await expect(page.locator("#sa-login-submit")).toBeVisible();
      await expect(page.locator("#sa-login-submit")).toContainText("Sign In as Super Admin");

      // Verify link back to regular login
      await expect(page.locator("a:has-text('Back to Admin Login')")).toHaveAttribute("href", "/login");
      await expect(page.locator("text=Unauthorized access attempts are logged")).toBeVisible();
    });

    test("1.2 should display validation error when submitting with empty credentials", async ({ page }) => {
      await page.goto("/super-admin");

      // Submit with empty username
      await page.locator("#sa-login-submit").click();
      await expect(page.locator("text=Please enter your Super Admin username or email.")).toBeVisible();

      // Fill username only and submit
      await page.locator("#sa-username").fill("superadmin.myschoollife");
      await page.locator("#sa-login-submit").click();
      await expect(page.locator("text=Password is required.")).toBeVisible();
    });

    test("1.3 should reject non-super_admin accounts trying to log in via Super Admin portal", async ({ page }) => {
      // Mock login endpoint returning a school_admin user
      await page.route("**/api/auth/login", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              access_token: "mock-school-admin-token",
              refresh_token: "mock-school-admin-refresh",
              user: {
                id: "60f000000000000000000002",
                name: "Principal Skinner",
                email: "skinner@school.com",
                role: "school_admin",
                school_id: "60f000000000000000000100",
              },
            },
          }),
        });
      });

      await page.goto("/super-admin");
      await page.locator("#sa-username").fill("skinner@school.com");
      await page.locator("#sa-password").fill("Principal#2026");
      await page.locator("#sa-login-submit").click();

      // Portal should guard and display access denied error
      await expect(
        page.locator("text=Access denied. This portal is for Super Admins only.")
      ).toBeVisible();
    });

    test("1.4 should display server error message on invalid credentials", async ({ page }) => {
      await page.route("**/api/auth/login", async (route) => {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            message: "Incorrect password. Please try again.",
          }),
        });
      });

      await page.goto("/super-admin");
      await page.locator("#sa-username").fill("superadmin.myschoollife");
      await page.locator("#sa-password").fill("WrongSecret#999");
      await page.locator("#sa-login-submit").click();

      await expect(page.locator("text=Incorrect password. Please try again.")).toBeVisible();
    });

    test("1.5 should toggle password visibility when clicking eye button", async ({ page }) => {
      await page.goto("/super-admin");
      const passwordInput = page.locator("#sa-password");
      const toggleBtn = page.locator("button[aria-label='Toggle password visibility']");

      await expect(passwordInput).toHaveAttribute("type", "password");
      await toggleBtn.click();
      await expect(passwordInput).toHaveAttribute("type", "text");
      await toggleBtn.click();
      await expect(passwordInput).toHaveAttribute("type", "password");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: SUPER-ADMIN CONSOLE DASHBOARD & SIDEBAR NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("2. Super-Admin Dashboard Overview & Navigation", () => {
    test("2.1 should render Super Admin Console with role badge and specialized navigation", async ({ page }) => {
      await loginAsSuperAdmin(page);
      await page.goto("/dashboard");
      await page.waitForLoadState("domcontentloaded");

      // Verify Console Title and SUPER_ADMIN badge
      await expect(page.locator("h1.page-title")).toContainText("Super Admin Console");
      await expect(page.locator("aside")).toContainText("SUPER_ADMIN");

      // Verify Super Admin exclusive navigation links
      const aside = page.locator("aside");
      await expect(aside.locator("text=Network Directory")).toBeVisible();
      await expect(aside.locator("text=All Schools")).toBeVisible();
      await expect(aside.locator("text=All Students")).toBeVisible();
      await expect(aside.locator("text=All Teachers")).toBeVisible();
    });

    test("2.2 should render multi-campus aggregate analytics cards", async ({ page }) => {
      await loginAsSuperAdmin(page);
      await page.goto("/dashboard");
      await page.waitForLoadState("domcontentloaded");

      // Verify KPI overview cards mounted inside SuperAdminCharts
      await expect(page.locator("text=Fees Awaiting Payment").first()).toBeVisible();
      await expect(page.locator("text=Student Count").first()).toBeVisible();
      await expect(page.locator("text=Fees Overview").first()).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: SCHOOL MANAGEMENT & DIRECTORY (/schools)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("3. Schools Management & Directory (/schools)", () => {
    test("3.1 should render schools directory table with stats overview", async ({ page }) => {
      await loginAsSuperAdmin(page);
      await setupCustomSchoolsMock(page);
      await page.goto("/schools");
      await page.waitForLoadState("domcontentloaded");

      // Header verification
      await expect(page.locator("h1:has-text('Schools Management')")).toBeVisible();
      await expect(page.locator("text=Schools Directory")).toBeVisible();

      // Top metric stats cards
      await expect(page.locator("text=Total Campuses").first()).toBeVisible();
      await expect(page.locator("text=Enrolled Students").first()).toBeVisible();
      await expect(page.locator("text=Active Faculty").first()).toBeVisible();
      await expect(page.locator("text=Network Operations").first()).toBeVisible();

      // Table listing initial schools
      await expect(page.locator("text=Springfield Academy")).toBeVisible();
      await expect(page.locator("text=Shelbyville High School")).toBeVisible();
      await expect(page.locator("text=slug: springfield")).toBeVisible();
      await expect(page.locator("text=slug: shelbyville")).toBeVisible();
    });

    test("3.2 should filter schools in real-time using search input", async ({ page }) => {
      await loginAsSuperAdmin(page);
      await setupCustomSchoolsMock(page);
      await page.goto("/schools");
      await page.waitForLoadState("domcontentloaded");

      const searchInput = page.locator("input[placeholder*='Search by school name']");
      await expect(searchInput).toBeVisible();

      // Filter by "Shelbyville"
      await searchInput.fill("Shelbyville");
      await expect(page.locator("text=Shelbyville High School")).toBeVisible();
      await expect(page.locator("text=Springfield Academy")).not.toBeVisible();

      // Clear search
      await searchInput.fill("");
      await expect(page.locator("text=Springfield Academy")).toBeVisible();
      await expect(page.locator("text=Shelbyville High School")).toBeVisible();
    });

    test("3.3 should filter schools by status tabs (All, Active, Inactive)", async ({ page }) => {
      await loginAsSuperAdmin(page);
      await setupCustomSchoolsMock(page);
      await page.goto("/schools");
      await page.waitForLoadState("domcontentloaded");

      // Click "Active" tab
      await page.locator("button:has-text('Active (')").first().click();
      await expect(page.locator("text=Springfield Academy")).toBeVisible();
      await expect(page.locator("text=Shelbyville High School")).not.toBeVisible();

      // Click "Inactive" tab
      await page.locator("button:has-text('Inactive (')").first().click();
      await expect(page.locator("text=Shelbyville High School")).toBeVisible();
      await expect(page.locator("text=Springfield Academy")).not.toBeVisible();

      // Click "All" tab to restore
      await page.locator("button:has-text('All (')").first().click();
      await expect(page.locator("text=Springfield Academy")).toBeVisible();
      await expect(page.locator("text=Shelbyville High School")).toBeVisible();
    });

    test("3.4 should toggle school status between Active and Inactive", async ({ page }) => {
      await loginAsSuperAdmin(page);
      await setupCustomSchoolsMock(page);
      await page.goto("/schools");
      await page.waitForLoadState("domcontentloaded");

      // Springfield Academy is currently Active. Click its status badge to toggle
      const activeBadge = page.locator("tr:has-text('Springfield Academy') button:has-text('Active')");
      await expect(activeBadge).toBeVisible();
      await activeBadge.click();

      // Should flip to Inactive
      await expect(page.locator("tr:has-text('Springfield Academy') button:has-text('Inactive')")).toBeVisible();

      // Click again to restore back to Active
      await page.locator("tr:has-text('Springfield Academy') button:has-text('Inactive')").click();
      await expect(page.locator("tr:has-text('Springfield Academy') button:has-text('Active')")).toBeVisible();
    });

    test("3.5 should open Add School modal and validate required fields", async ({ page }) => {
      await loginAsSuperAdmin(page);
      await setupCustomSchoolsMock(page);
      await page.goto("/schools");
      await page.waitForLoadState("domcontentloaded");

      // Click "Add School"
      await page.locator("button:has-text('Add School')").click();

      // Verify modal is displayed
      await expect(page.locator("text=Add New School & Subdomain")).toBeVisible();

      // Fill in valid details
      await page.locator("input[placeholder*='Bajrang Public School']").fill("Capital City Grammar");
      await page.locator("input[placeholder*='e.g. bajrang']").first().fill("capital-city");

      // Submit
      const submitBtn = page.locator("button:has-text('Create School')");
      await submitBtn.click();

      // Modal closes and new school appears in table
      await expect(page.locator("text=Capital City Grammar")).toBeVisible();
    });

    test("3.6 should open Edit School modal and update school details", async ({ page }) => {
      await loginAsSuperAdmin(page);
      await setupCustomSchoolsMock(page);
      await page.goto("/schools");
      await page.waitForLoadState("domcontentloaded");

      // Click edit button for Springfield Academy
      const editBtn = page.locator("tr:has-text('Springfield Academy') button[title*='Edit School']");
      await expect(editBtn).toBeVisible();
      await editBtn.click();

      // Modal should appear
      await expect(page.locator("text=Edit School & Subdomain Details")).toBeVisible();

      // Update address
      const addressInput = page.locator("textarea[placeholder*='Full physical address of the campus']");
      await addressInput.fill("742 Evergreen Terrace (Renovated Campus)");

      // Click Save Changes
      await page.locator("button:has-text('Save Changes')").click();

      // Verify updated address appears on table
      await expect(page.locator("text=742 Evergreen Terrace (Renovated Campus)")).toBeVisible();
    });

    test("3.7 should open SEO & Metadata modal and update tags", async ({ page }) => {
      await loginAsSuperAdmin(page);
      await setupCustomSchoolsMock(page);
      await page.goto("/schools");
      await page.waitForLoadState("domcontentloaded");

      // Click Sparkles / SEO button for Springfield Academy
      const seoBtn = page.locator("tr:has-text('Springfield Academy') button[title*='SEO']");
      await expect(seoBtn).toBeVisible();
      await seoBtn.click();

      // Modal opens
      await expect(page.locator("text=SEO & Search Metadata")).toBeVisible();
      await expect(page.locator("text=Page Title (Meta Title)")).toBeVisible();

      // Update meta title
      const metaTitleInput = page.locator("input[placeholder*='Official Portal']");
      await metaTitleInput.fill("Springfield Academy | Excellence in Education 2026");

      // Click Save SEO Metadata
      await page.locator("button:has-text('Save SEO Metadata')").click();

      // Verify success message
      await expect(page.locator("text=SEO & Metadata updated successfully!")).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: STRICT RBAC AUTHORIZATION & DIRECT URL PROTECTION
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("4. Strict RBAC Authorization & Direct URL Protection", () => {
    test("4.1 should redirect School Admin away from /schools to /dashboard", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/schools");

      // Page should intercept and redirect to /dashboard
      await page.waitForURL("**/dashboard");
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test("4.2 should redirect Teacher away from /schools to /dashboard", async ({ page }) => {
      await loginAsTeacher(page);
      await page.goto("/schools");

      await page.waitForURL("**/dashboard");
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test("4.3 should redirect Student away from /schools to /dashboard", async ({ page }) => {
      await loginAsStudent(page);
      await page.goto("/schools");

      await page.waitForURL("**/dashboard");
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test("4.4 should redirect Parent away from /schools to /dashboard", async ({ page }) => {
      await loginAsParent(page);
      await page.goto("/schools");

      await page.waitForURL("**/dashboard");
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test("4.5 should redirect School Admin away from /network-directory to /dashboard", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/network-directory");

      await page.waitForURL("**/dashboard");
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test("4.6 should redirect Teacher away from /network-directory to /dashboard", async ({ page }) => {
      await loginAsTeacher(page);
      await page.goto("/network-directory");

      await page.waitForURL("**/dashboard");
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: MULTI-SCHOOL DATA ISOLATION & GLOBAL BACKUP CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("5. Multi-School Data Isolation & Backup Controls (/settings/backup)", () => {
    test("5.1 should display global school selector dropdown for Super Admin on backup hub", async ({ page }) => {
      await loginAsSuperAdmin(page);
      await setupCustomSchoolsMock(page);
      await page.goto("/settings/backup");
      await page.waitForLoadState("domcontentloaded");

      // Header title
      await expect(page.locator("h1:has-text('Data Backup & PDF Export Hub')")).toBeVisible();

      // Super admin should see the campus select dropdown with "All Schools" option
      const schoolSelect = page.locator("select:has(option:text('All Schools'))");
      await expect(schoolSelect).toBeVisible();

      // Options should include "All Schools", "Springfield Academy", "Shelbyville High School"
      await expect(schoolSelect.locator("option")).toHaveText([
        "All Schools",
        "Springfield Academy",
        "Shelbyville High School",
      ]);

      // Switch context to Springfield Academy
      await schoolSelect.selectOption({ label: "Springfield Academy" });
      await expect(schoolSelect).toHaveValue("60f000000000000000000101");
    });

    test("5.2 should NOT display global school selector for School Admin (strict tenant isolation)", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/settings/backup");
      await page.waitForLoadState("domcontentloaded");

      // Header title
      await expect(page.locator("h1:has-text('Data Backup & PDF Export Hub')")).toBeVisible();

      // School Admin must NOT have the global school dropdown
      const schoolSelect = page.locator("select:has(option:text('All Schools'))");
      await expect(schoolSelect).not.toBeVisible();
    });
  });
});
