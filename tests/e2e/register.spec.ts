import { test, expect } from "@playwright/test";

test.describe("Registration Flow Deep E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test("1. should render registration page elements and input fields correctly", async ({ page }) => {
    await page.goto("/register");

    // Title & subtitle
    await expect(page.getByRole("heading", { name: "Create Account" })).toBeVisible();
    await expect(page.locator("text=Register as school administrator")).toBeVisible();

    // Form inputs
    await expect(page.locator("#register-name")).toBeVisible();
    await expect(page.locator("#register-email")).toBeVisible();
    await expect(page.locator("#register-password")).toBeVisible();
    await expect(page.locator("#register-confirm-password")).toBeVisible();

    // Checkbox & Submit button
    await expect(page.locator("input[type='checkbox']")).toBeVisible();
    await expect(page.locator("text=Terms & Privacy Policy")).toBeVisible();
    await expect(page.locator("#register-submit")).toBeVisible();
    await expect(page.locator("#register-submit")).toContainText("Create Account");

    // Sign in navigation link
    await expect(page.locator("text=Already have an account?")).toBeVisible();
    await expect(page.locator("text=Sign In")).toBeVisible();
  });

  test("2. should validate full name required and minimum length of 2 characters", async ({ page }) => {
    await page.goto("/register");

    // 1. Submit empty name
    await page.locator("#register-submit").click();
    await expect(page.locator("text=Full name must be at least 2 characters")).toBeVisible();

    // 2. Submit 1-character name
    await page.locator("#register-name").fill("J");
    await page.locator("#register-submit").click();
    await expect(page.locator("text=Full name must be at least 2 characters")).toBeVisible();
  });

  test("3. should validate email required and valid email format", async ({ page }) => {
    await page.goto("/register");

    await page.locator("#register-name").fill("John Doe");

    // 1. Submit empty email
    await page.locator("#register-submit").click();
    await expect(page.locator("text=Email is required")).toBeVisible();

    // 2. Submit malformed email
    await page.locator("#register-email").fill("not-an-email");
    await page.locator("#register-submit").click();
    await expect(page.locator("text=Please enter a valid email address")).toBeVisible();
  });

  test("4. should validate password length minimum of 8 characters", async ({ page }) => {
    await page.goto("/register");

    await page.locator("#register-name").fill("John Doe");
    await page.locator("#register-email").fill("john.doe@school.com");
    await page.locator("#register-password").fill("Pass1");
    await page.locator("#register-submit").click();

    await expect(page.locator("text=Password must be at least 8 characters")).toBeVisible();
  });

  test("5. should validate password complexity (uppercase, lowercase, number)", async ({ page }) => {
    await page.goto("/register");

    await page.locator("#register-name").fill("John Doe");
    await page.locator("#register-email").fill("john.doe@school.com");

    // All lowercase & numbers (no uppercase)
    await page.locator("#register-password").fill("password12345");
    await page.locator("#register-submit").click();
    await expect(page.locator("text=Password must contain uppercase, lowercase, and a number")).toBeVisible();

    // All uppercase & numbers (no lowercase)
    await page.locator("#register-password").fill("PASSWORD12345");
    await page.locator("#register-submit").click();
    await expect(page.locator("text=Password must contain uppercase, lowercase, and a number")).toBeVisible();

    // All letters (no numbers)
    await page.locator("#register-password").fill("PasswordWithoutNumber");
    await page.locator("#register-submit").click();
    await expect(page.locator("text=Password must contain uppercase, lowercase, and a number")).toBeVisible();
  });

  test("6. should validate that password and confirm password match", async ({ page }) => {
    await page.goto("/register");

    await page.locator("#register-name").fill("John Doe");
    await page.locator("#register-email").fill("john.doe@school.com");
    await page.locator("#register-password").fill("StrongPass123");
    await page.locator("#register-confirm-password").fill("DifferentPass123");
    await page.locator("#register-submit").click();

    await expect(page.locator("text=Passwords do not match").first()).toBeVisible();
  });

  test("7. should validate that user must agree to Terms & Privacy Policy", async ({ page }) => {
    await page.goto("/register");

    await page.locator("#register-name").fill("John Doe");
    await page.locator("#register-email").fill("john.doe@school.com");
    await page.locator("#register-password").fill("StrongPass123");
    await page.locator("#register-confirm-password").fill("StrongPass123");

    // Terms unchecked
    await page.locator("#register-submit").click();
    await expect(page.locator("text=You must agree to the Terms & Privacy Policy")).toBeVisible();
  });

  test("8. should dynamically compute and display password strength meter", async ({ page }) => {
    await page.goto("/register");

    const passwordInput = page.locator("#register-password");

    // 1. Weak password
    await passwordInput.fill("abc");
    await expect(page.locator("text=Weak password")).toBeVisible();

    // 2. Fair password
    await passwordInput.fill("Abcdef12");
    await expect(page.locator("text=Fair password")).toBeVisible();

    // 3. Strong password (uppercase, lowercase, number, special char, length >= 10)
    await passwordInput.fill("StrongP@ss1234");
    await expect(page.locator("text=Strong password")).toBeVisible();
  });

  test("9. should display realtime password match indicator", async ({ page }) => {
    await page.goto("/register");

    await page.locator("#register-password").fill("ValidPass123");

    // Non-matching
    await page.locator("#register-confirm-password").fill("ValidPass999");
    await expect(page.locator("text=Passwords do not match")).toBeVisible();

    // Matching
    await page.locator("#register-confirm-password").fill("ValidPass123");
    await expect(page.locator("text=Passwords match")).toBeVisible();
  });

  test("10. should toggle password and confirm password visibility", async ({ page }) => {
    await page.goto("/register");

    const pwdInput = page.locator("#register-password");
    const confirmInput = page.locator("#register-confirm-password");
    const pwdToggle = page.locator("#register-password + button");
    const confirmToggle = page.locator("#register-confirm-password + button");

    await pwdInput.fill("Pass12345");
    await confirmInput.fill("Pass12345");

    await expect(pwdInput).toHaveAttribute("type", "password");
    await expect(confirmInput).toHaveAttribute("type", "password");

    // Toggle password
    await pwdToggle.click();
    await expect(pwdInput).toHaveAttribute("type", "text");
    await pwdToggle.click();
    await expect(pwdInput).toHaveAttribute("type", "password");

    // Toggle confirm password
    await confirmToggle.click();
    await expect(confirmInput).toHaveAttribute("type", "text");
    await confirmToggle.click();
    await expect(confirmInput).toHaveAttribute("type", "password");
  });

  test("11. should show school not found error when registering on invalid subdomain", async ({ page }) => {
    await page.route("**/api/public/school-info?subdomain=invalid-school", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "School not found" }),
      });
    });

    await page.goto("/register?subdomain=invalid-school");

    await page.locator("#register-name").fill("John Admin");
    await page.locator("#register-email").fill("admin@newdomain.com");
    await page.locator("#register-password").fill("SecurePass123");
    await page.locator("#register-confirm-password").fill("SecurePass123");
    await page.locator("input[type='checkbox']").check();

    await page.locator("#register-submit").click();

    await expect(page.locator("text=School not found. Please open this page from your school's URL.")).toBeVisible();
  });

  test("12. should successfully register new administrator and redirect to /dashboard", async ({ page }) => {
    // Mock school resolution
    await page.route("**/api/public/school-info?subdomain=demo-school", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { id: "60f000000000000000000100", name: "Demo School" },
        }),
      });
    });

    // Mock register API
    await page.route("**/api/auth/register", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Account created successfully",
          data: {
            access_token: "mock_jwt_access_new_user",
            refresh_token: "mock_jwt_refresh_new_user",
            user: {
              id: "60f000000000000000000200",
              name: "New Admin",
              email: "newadmin@demoschool.com",
              role: "school_admin",
              school_id: "60f000000000000000000100",
              must_change_password: false,
            },
          },
        }),
      });
    });

    await page.route("**/api/settings/permissions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: {} }),
      });
    });

    await page.goto("/register?subdomain=demo-school");

    await page.locator("#register-name").fill("New Admin");
    await page.locator("#register-email").fill("newadmin@demoschool.com");
    await page.locator("#register-password").fill("SecurePass123");
    await page.locator("#register-confirm-password").fill("SecurePass123");
    await page.locator("input[type='checkbox']").check();

    await page.locator("#register-submit").click();

    // Verify redirect to /dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("13. should display error banner when registration API returns email conflict (409)", async ({ page }) => {
    await page.route("**/api/public/school-info?subdomain=demo-school", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { id: "60f000000000000000000100", name: "Demo School" },
        }),
      });
    });

    await page.route("**/api/auth/register", async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Email is already registered. Please sign in instead.",
        }),
      });
    });

    await page.goto("/register?subdomain=demo-school");

    await page.locator("#register-name").fill("Existing User");
    await page.locator("#register-email").fill("existing@demoschool.com");
    await page.locator("#register-password").fill("SecurePass123");
    await page.locator("#register-confirm-password").fill("SecurePass123");
    await page.locator("input[type='checkbox']").check();

    await page.locator("#register-submit").click();

    await expect(page.locator("text=Email is already registered. Please sign in instead.")).toBeVisible();
    await expect(page.locator("#register-submit")).toBeEnabled();
  });

  test("14. should navigate to /login when clicking Sign In link", async ({ page }) => {
    await page.goto("/register");

    const signInLink = page.locator("a", { hasText: "Sign In" });
    await expect(signInLink).toBeVisible();
    await signInLink.click();

    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });
});
