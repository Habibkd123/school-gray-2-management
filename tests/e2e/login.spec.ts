import { test, expect } from "@playwright/test";
import { generateAccessToken, generateRefreshToken } from "@/lib/utils/jwt";

test.describe("Authentication & Login Flow Deep E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.goto("/login");
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test("1. should render login page layout, branding, and role tabs correctly", async ({ page }) => {
    await page.goto("/login");

    // Welcome title & subtitle
    await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
    await expect(page.locator("text=Sign in to your school account")).toBeVisible();

    // 4 Role tabs
    await expect(page.getByRole("button", { name: "admin" })).toBeVisible();
    await expect(page.getByRole("button", { name: "principal" })).toBeVisible();
    await expect(page.getByRole("button", { name: "teacher" })).toBeVisible();
    await expect(page.getByRole("button", { name: "student" })).toBeVisible();

    // Form inputs and submit button
    await expect(page.locator("#login-username")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    await expect(page.locator("#login-submit")).toBeVisible();
    await expect(page.locator("#login-submit")).toContainText("Sign In");

    // News carousel panel (on desktop viewport)
    await expect(page.locator("text=What's New on School ERP !!!")).toBeVisible();
  });

  test("2. should update input labels and clear values when switching tabs", async ({ page }) => {
    await page.goto("/login");

    // Admin tab default
    await expect(page.locator("text=Email Address")).toBeVisible();
    await page.locator("#login-username").fill("admin@school.com");
    await page.locator("#login-password").fill("mypassword");

    // Switch to Teacher tab
    await page.getByRole("button", { name: "teacher" }).click();

    // Label should change to School Username
    await expect(page.locator("text=School Username")).toBeVisible();
    // Inputs should be cleared
    await expect(page.locator("#login-username")).toHaveValue("");
    await expect(page.locator("#login-password")).toHaveValue("");

    // Switch to Student tab
    await page.getByRole("button", { name: "student" }).click();
    await expect(page.locator("text=School Username")).toBeVisible();
  });

  test("3. should show validation errors on admin tab for empty and invalid email", async ({ page }) => {
    await page.goto("/login");

    // 1. Submit completely empty form
    await page.locator("#login-submit").click();
    await expect(page.locator("text=Please enter your Email Address.")).toBeVisible();

    // 2. Submit invalid email format
    await page.locator("#login-username").fill("invalid-email-address");
    await page.locator("#login-password").fill("ValidPass123");
    await page.locator("#login-submit").click();
    await expect(page.locator("text=Please enter a valid Email Address.")).toBeVisible();

    // 3. Valid email but empty password
    await page.locator("#login-username").fill("admin@school.com");
    await page.locator("#login-password").fill("");
    await page.locator("#login-submit").click();
    await expect(page.locator("text=Password is required")).toBeVisible();
  });

  test("4. should show validation errors on teacher/student tabs for invalid username", async ({ page }) => {
    await page.goto("/login");

    // Switch to teacher tab
    await page.getByRole("button", { name: "teacher" }).click();

    // 1. Submit empty username
    await page.locator("#login-submit").click();
    await expect(page.locator("text=Please enter your School Username.")).toBeVisible();

    // 2. Username without .myschoollife
    await page.locator("#login-username").fill("teacher_john");
    await page.locator("#login-password").fill("Secret123");
    await page.locator("#login-submit").click();
    await expect(page.locator("text=Please enter a valid School Username.")).toBeVisible();

    // 3. Username with spaces
    await page.locator("#login-username").fill("teacher john.myschoollife");
    await page.locator("#login-submit").click();
    await expect(page.locator("text=Please enter a valid School Username.")).toBeVisible();

    // 4. Username with @ symbol
    await page.locator("#login-username").fill("teacher@myschoollife");
    await page.locator("#login-submit").click();
    await expect(page.locator("text=Please enter a valid School Username.")).toBeVisible();
  });

  test("5. should toggle password visibility between password and text types", async ({ page }) => {
    await page.goto("/login");

    const passwordInput = page.locator("#login-password");
    const toggleButton = page.locator("#login-password + button");

    await passwordInput.fill("MySecretPassword99");
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Click toggle to reveal password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    // Click toggle again to hide password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("6. should show school not found error when accessing invalid school subdomain", async ({ page }) => {
    await page.route("**/api/public/school-info?subdomain=invalid-school", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "School not found",
        }),
      });
    });

    await page.goto("/login?subdomain=invalid-school");

    await page.locator("#login-username").fill("admin@school.com");
    await page.locator("#login-password").fill("Password123");
    await page.locator("#login-submit").click();

    await expect(page.locator("text=School not found for this subdomain.")).toBeVisible();
  });

  test("7. should render school branding banner when valid subdomain is present in URL", async ({ page }) => {
    // Mock the public school-info API response
    await page.route("**/api/public/school-info?subdomain=greenwood", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "60f000000000000000000100",
            name: "Greenwood International Academy",
            subtitle: "Empowering Minds, Shaping Futures",
          },
        }),
      });
    });

    await page.goto("/login?subdomain=greenwood");

    // Verify school info is displayed on login card
    await expect(page.locator("text=Greenwood International Academy")).toBeVisible();
    await expect(page.locator("text=Empowering Minds, Shaping Futures")).toBeVisible();
  });

  test("8. should successfully sign in Super Admin and redirect to /dashboard", async ({ page }) => {
    // Mock settings permissions to prevent 401 on dashboard
    await page.route("**/api/settings/permissions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: {} }),
      });
    });

    // Mock successful login response
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Login successful",
          data: {
            access_token: "mock_jwt_access_super_admin",
            refresh_token: "mock_jwt_refresh_super_admin",
            user: {
              id: "60f000000000000000000001",
              name: "Super Admin",
              email: "superadmin@myschoollife.com",
              role: "super_admin",
              school_id: null,
              must_change_password: false,
            },
          },
        }),
      });
    });

    await page.goto("/login");

    await page.locator("#login-username").fill("superadmin@myschoollife.com");
    await page.locator("#login-password").fill("SuperSecret123!");
    await page.locator("#login-submit").click();

    // Verify redirection to /dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("9. should display error banner when login API returns 401 invalid credentials", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Invalid email or password. Please try again.",
        }),
      });
    });

    await page.goto("/login");

    await page.locator("#login-username").fill("superadmin@myschoollife.com");
    await page.locator("#login-password").fill("WrongPassword!");
    await page.locator("#login-submit").click();

    // Verify error banner displays the exact API message
    await expect(page.locator("text=Invalid email or password. Please try again.")).toBeVisible();
    // Submit button should be re-enabled
    await expect(page.locator("#login-submit")).toBeEnabled();
  });

  test("10. should display rate-limiting error banner when API returns 429 Too Many Requests", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Too many failed attempts. Try again in 15 minutes.",
        }),
      });
    });

    await page.goto("/login");

    await page.locator("#login-username").fill("superadmin@myschoollife.com");
    await page.locator("#login-password").fill("WrongPassword!");
    await page.locator("#login-submit").click();

    await expect(page.locator("text=Too many failed attempts. Try again in 15 minutes.")).toBeVisible();
  });

  test("11. should navigate to /forget-password when clicking Forgot Password link", async ({ page }) => {
    await page.goto("/login");

    const forgotLink = page.locator("text=Forgot Password?");
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();

    await page.waitForURL(/\/forget-password/);
    await expect(page).toHaveURL(/\/forget-password/);
  });

  test("12. should automatically redirect to /dashboard if user is already authenticated", async ({ page }) => {
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

    // Inject session before navigating
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

    await page.goto("/login");

    // Should automatically redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
