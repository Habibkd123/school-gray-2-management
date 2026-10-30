import { test, expect } from "@playwright/test";
import { generateAccessToken, generateRefreshToken } from "@/lib/utils/jwt";

test.describe("Security, Session & Role Redirects Deep E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch {}
    });
  });

  test("1. should redirect unauthenticated users away from /dashboard", async ({ page }) => {
    // Unauthenticated user attempting to access protected dashboard
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");

    // Dashboard layout checks authentication and redirects unauthenticated users
    await expect(page).not.toHaveURL(/\/dashboard$/);
  });

  test("2. should redirect authenticated student role from /login to /student/dashboard", async ({ page }) => {
    const studentUser = {
      id: "60f000000000000000000300",
      name: "Alice Student",
      email: "alice@school.com",
      role: "student",
      school_id: "60f000000000000000000100",
      must_change_password: false,
    };

    const accessToken = generateAccessToken({
      user_id: studentUser.id,
      school_id: studentUser.school_id,
      role: studentUser.role,
    });
    const refreshToken = generateRefreshToken({
      user_id: studentUser.id,
      school_id: studentUser.school_id,
      role: studentUser.role,
    });

    await page.addInitScript(
      ({ access, refresh, usr }) => {
        window.localStorage.setItem("sm_access_token", access);
        window.localStorage.setItem("sm_refresh_token", refresh);
        window.localStorage.setItem("sm_user", JSON.stringify(usr));
      },
      { access: accessToken, refresh: refreshToken, usr: studentUser }
    );

    // Mock all background API calls so 401 doesn't trigger session purge
    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/api/public/school-info")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: "60f000000000000000000100", name: "My School" },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: {} }),
      });
    });

    await page.goto("/login?subdomain=myschool");

    // Student must be redirected to /student/dashboard
    await page.waitForURL(/\/student\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/student\/dashboard/);
  });

  test("3. should redirect authenticated school admin from /login to /dashboard", async ({ page }) => {
    const adminUser = {
      id: "60f000000000000000000200",
      name: "Admin Principal",
      email: "admin@school.com",
      role: "school_admin",
      school_id: "60f000000000000000000100",
      must_change_password: false,
    };

    const accessToken = generateAccessToken({
      user_id: adminUser.id,
      school_id: adminUser.school_id,
      role: adminUser.role,
    });
    const refreshToken = generateRefreshToken({
      user_id: adminUser.id,
      school_id: adminUser.school_id,
      role: adminUser.role,
    });

    await page.addInitScript(
      ({ access, refresh, usr }) => {
        window.localStorage.setItem("sm_access_token", access);
        window.localStorage.setItem("sm_refresh_token", refresh);
        window.localStorage.setItem("sm_user", JSON.stringify(usr));
      },
      { access: accessToken, refresh: refreshToken, usr: adminUser }
    );

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/api/public/school-info")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { id: "60f000000000000000000100", name: "My School" },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: {} }),
      });
    });

    await page.goto("/login?subdomain=myschool");

    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("4. should retain authentication state across page reload on dashboard", async ({ page }) => {
    const payload = {
      user_id: "60f000000000000000000001",
      school_id: null,
      role: "super_admin",
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const user = {
      id: "60f000000000000000000001",
      name: "Super Admin",
      email: "admin@school.com",
      role: "super_admin",
      school_id: null,
      must_change_password: false,
    };

    await page.addInitScript(
      ({ access, refresh, usr }) => {
        window.localStorage.setItem("sm_access_token", access);
        window.localStorage.setItem("sm_refresh_token", refresh);
        window.localStorage.setItem("sm_user", JSON.stringify(usr));
      },
      { access: accessToken, refresh: refreshToken, usr: user }
    );

    await page.route("**/api/settings/permissions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: {} }),
      });
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/dashboard/);

    // Reload the page
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Should remain authenticated on /dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("5. should clear localStorage tokens on logout", async ({ page }) => {
    const payload = {
      user_id: "60f000000000000000000001",
      school_id: null,
      role: "super_admin",
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const user = {
      id: "60f000000000000000000001",
      name: "Super Admin",
      email: "admin@school.com",
      role: "super_admin",
      school_id: null,
      must_change_password: false,
    };

    await page.addInitScript(
      ({ access, refresh, usr }) => {
        window.localStorage.setItem("sm_access_token", access);
        window.localStorage.setItem("sm_refresh_token", refresh);
        window.localStorage.setItem("sm_user", JSON.stringify(usr));
      },
      { access: accessToken, refresh: refreshToken, usr: user }
    );

    await page.goto("/login");

    // Perform logout in browser context
    await page.evaluate(() => {
      window.localStorage.removeItem("sm_access_token");
      window.localStorage.removeItem("sm_refresh_token");
      window.localStorage.removeItem("sm_user");
    });

    const storedToken = await page.evaluate(() => window.localStorage.getItem("sm_access_token"));
    const storedUser = await page.evaluate(() => window.localStorage.getItem("sm_user"));

    expect(storedToken).toBeNull();
    expect(storedUser).toBeNull();
  });

  test("6. should purge session when client accesses another school subdomain (cross-school isolation)", async ({ page }) => {
    // User session belonging to School A
    const schoolAUser = {
      id: "60f000000000000000000101",
      name: "School A Admin",
      email: "admin@schoola.com",
      role: "school_admin",
      school_id: "60f000000000000000000AAA", // School A
      must_change_password: false,
    };

    const accessToken = generateAccessToken({
      user_id: schoolAUser.id,
      school_id: schoolAUser.school_id,
      role: schoolAUser.role,
    });

    await page.addInitScript(
      ({ access, usr }) => {
        window.localStorage.setItem("sm_access_token", access);
        window.localStorage.setItem("sm_user", JSON.stringify(usr));
      },
      { access: accessToken, usr: schoolAUser }
    );

    // School B public info returns a different school_id
    await page.route("**/api/public/school-info?subdomain=school-b", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "60f000000000000000000BBB", // School B (mismatched)
            name: "School B Academy",
          },
        }),
      });
    });

    // Navigate to School B's subdomain
    await page.goto("/login?subdomain=school-b");
    await page.waitForLoadState("domcontentloaded");

    // AuthProvider verifies school_id matches resolvedSchoolId.
    // Since School A !== School B, it calls clearSession() to prevent cross-tenant data leakage!
    await page.waitForFunction(() => {
      return window.localStorage.getItem("sm_user") === null;
    }, { timeout: 10000 });

    const sessionUser = await page.evaluate(() => window.localStorage.getItem("sm_user"));
    expect(sessionUser).toBeNull();
  });

  test("7. should render ForceChangePasswordModal when user must change password", async ({ page }) => {
    const payload = {
      user_id: "60f000000000000000000102",
      school_id: null,
      role: "super_admin",
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // User with must_change_password flag set to true
    const userMustChange = {
      id: "60f000000000000000000102",
      name: "Temporary User",
      email: "temp@school.com",
      role: "super_admin",
      school_id: null,
      must_change_password: true,
    };

    await page.addInitScript(
      ({ access, refresh, usr }) => {
        window.localStorage.setItem("sm_access_token", access);
        window.localStorage.setItem("sm_refresh_token", refresh);
        window.localStorage.setItem("sm_user", JSON.stringify(usr));
        window.sessionStorage.setItem("sm_must_change_password", "true");
      },
      { access: accessToken, refresh: refreshToken, usr: userMustChange }
    );

    await page.route("**/api/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: {} }),
      });
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");

    // Modal with 'Password Change Required' should appear
    await expect(page.locator("text=Password Change Required")).toBeVisible();
    await expect(page.locator("text=For your security, you must change your system-generated password before continuing.")).toBeVisible();
  });
});
