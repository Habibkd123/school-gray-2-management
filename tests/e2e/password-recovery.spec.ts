import { test, expect } from "@playwright/test";

test.describe("Password Recovery & Reset Flow Deep E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/forget-password");
    await page.evaluate(() => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch {}
    });
  });

  // ─────────────────────────────────────────────────────────────
  // PART 1: FORGOT PASSWORD PAGE (/forget-password)
  // ─────────────────────────────────────────────────────────────

  test("1. should render forgot password page elements correctly", async ({ page }) => {
    await page.goto("/forget-password");

    await expect(page.getByRole("heading", { name: "Forgot Password?" })).toBeVisible();
    await expect(
      page.locator("text=Enter your email address and we'll send you a link to reset your password.")
    ).toBeVisible();

    await expect(page.locator("#forgot-password-email")).toBeVisible();
    await expect(page.locator("#forgot-password-submit")).toBeVisible();
    await expect(page.locator("#forgot-password-submit")).toContainText("Send Reset Link");

    // Remember your password? Sign In link
    await expect(page.locator("text=Remember your password?")).toBeVisible();
    await expect(page.locator("a", { hasText: "Sign In" })).toBeVisible();
  });

  test("2. should validate empty email on forgot password form", async ({ page }) => {
    await page.goto("/forget-password");

    await page.locator("#forgot-password-submit").click();
    await expect(page.locator("text=Email address is required")).toBeVisible();
  });

  test("3. should validate malformed email format on forgot password form", async ({ page }) => {
    await page.goto("/forget-password");

    await page.locator("#forgot-password-email").fill("invalid-email-format");
    await page.locator("#forgot-password-submit").click();

    await expect(page.locator("text=Please enter a valid email address")).toBeVisible();
  });

  test("4. should display error alert when forgot-password API returns an error", async ({ page }) => {
    await page.route("**/api/auth/forgot-password", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "No user found with this email address.",
        }),
      });
    });

    await page.goto("/forget-password");

    await page.locator("#forgot-password-email").fill("nonexistent@school.com");
    await page.locator("#forgot-password-submit").click();

    await expect(page.locator("text=No user found with this email address.")).toBeVisible();
    await expect(page.locator("#forgot-password-submit")).toBeEnabled();
  });

  test("5. should show success screen and dev token link on successful forgot password request", async ({ page }) => {
    await page.route("**/api/auth/forgot-password", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Password reset link sent",
          dev_token: "mock-dev-token-987654321",
        }),
      });
    });

    await page.goto("/forget-password");

    await page.locator("#forgot-password-email").fill("admin@myschool.com");
    await page.locator("#forgot-password-submit").click();

    // Success screen
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    await expect(page.locator("text=admin@myschool.com")).toBeVisible();

    // Dev mode token display
    await expect(page.locator("text=🛠 Dev Mode — Reset Token")).toBeVisible();
    await expect(page.locator("text=mock-dev-token-987654321")).toBeVisible();

    // Reset password link
    const resetLink = page.locator("a", { hasText: "→ Click to reset password" });
    await expect(resetLink).toBeVisible();
    await expect(resetLink).toHaveAttribute("href", "/reset-password?token=mock-dev-token-987654321");

    // Click link and verify navigation to reset password page with token
    await resetLink.click();
    await page.waitForURL(/\/reset-password\?token=mock-dev-token-987654321/);
    await expect(page).toHaveURL(/\/reset-password\?token=mock-dev-token-987654321/);
  });

  test("6. should navigate to /login when clicking Back to Login on success screen", async ({ page }) => {
    await page.route("**/api/auth/forgot-password", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Sent",
        }),
      });
    });

    await page.goto("/forget-password");
    await page.locator("#forgot-password-email").fill("admin@myschool.com");
    await page.locator("#forgot-password-submit").click();

    const backButton = page.locator("a", { hasText: "Back to Login" });
    await expect(backButton).toBeVisible();
    await backButton.click();

    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  // ─────────────────────────────────────────────────────────────
  // PART 2: RESET PASSWORD PAGE (/reset-password)
  // ─────────────────────────────────────────────────────────────

  test("7. should show invalid reset link warning when visiting /reset-password without a token", async ({ page }) => {
    await page.goto("/reset-password");

    // Warning alert
    await expect(page.locator("text=Invalid reset link")).toBeVisible();
    const requestLink = page.locator("a", { hasText: "Request a new reset link →" });
    await expect(requestLink).toBeVisible();

    // Inputs must be disabled when token is missing
    await expect(page.locator("#reset-new-password")).toBeDisabled();
    await expect(page.locator("#reset-confirm-password")).toBeDisabled();
    await expect(page.locator("#reset-password-submit")).toBeDisabled();
  });

  test("8. should enable inputs and render form when valid token is present in URL", async ({ page }) => {
    await page.goto("/reset-password?token=valid-test-token-12345");

    await expect(page.getByRole("heading", { name: "Reset Password" })).toBeVisible();
    await expect(page.locator("text=Enter your new password below.")).toBeVisible();

    await expect(page.locator("#reset-new-password")).toBeEnabled();
    await expect(page.locator("#reset-confirm-password")).toBeEnabled();
    await expect(page.locator("#reset-password-submit")).toBeEnabled();
  });

  test("9. should validate password length minimum of 8 characters on reset form", async ({ page }) => {
    await page.goto("/reset-password?token=valid-test-token-12345");

    await page.locator("#reset-new-password").fill("Short1");
    await page.locator("#reset-password-submit").click();

    await expect(page.locator("text=Password must be at least 8 characters")).toBeVisible();
  });

  test("10. should validate password complexity (upper, lower, number) on reset form", async ({ page }) => {
    await page.goto("/reset-password?token=valid-test-token-12345");

    // Lowercase + numbers only
    await page.locator("#reset-new-password").fill("weakpassword123");
    await page.locator("#reset-password-submit").click();
    await expect(page.locator("text=Password must contain uppercase, lowercase, and a number")).toBeVisible();

    // Uppercase + numbers only
    await page.locator("#reset-new-password").fill("WEAKPASSWORD123");
    await page.locator("#reset-password-submit").click();
    await expect(page.locator("text=Password must contain uppercase, lowercase, and a number")).toBeVisible();
  });

  test("11. should validate that new password and confirm password match on reset form", async ({ page }) => {
    await page.goto("/reset-password?token=valid-test-token-12345");

    await page.locator("#reset-new-password").fill("ValidPassword123");
    await page.locator("#reset-confirm-password").fill("DifferentPassword123");
    await page.locator("#reset-password-submit").click();

    await expect(page.locator("text=Passwords do not match").first()).toBeVisible();
  });

  test("12. should toggle password visibility for both new and confirm password fields", async ({ page }) => {
    await page.goto("/reset-password?token=valid-test-token-12345");

    const newPwd = page.locator("#reset-new-password");
    const confirmPwd = page.locator("#reset-confirm-password");
    const newToggle = page.locator("#reset-new-password + button");
    const confirmToggle = page.locator("#reset-confirm-password + button");

    await newPwd.fill("SecretPassword1");
    await confirmPwd.fill("SecretPassword1");

    await expect(newPwd).toHaveAttribute("type", "password");
    await expect(confirmPwd).toHaveAttribute("type", "password");

    await newToggle.click();
    await expect(newPwd).toHaveAttribute("type", "text");
    await newToggle.click();
    await expect(newPwd).toHaveAttribute("type", "password");

    await confirmToggle.click();
    await expect(confirmPwd).toHaveAttribute("type", "text");
    await confirmToggle.click();
    await expect(confirmPwd).toHaveAttribute("type", "password");
  });

  test("13. should display error alert when reset password API returns invalid/expired token", async ({ page }) => {
    await page.route("**/api/auth/reset-password", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "Reset token has expired or is invalid.",
        }),
      });
    });

    await page.goto("/reset-password?token=expired-token-xyz");

    await page.locator("#reset-new-password").fill("NewSecurePassword123");
    await page.locator("#reset-confirm-password").fill("NewSecurePassword123");
    await page.locator("#reset-password-submit").click();

    await expect(page.locator("text=Reset token has expired or is invalid.")).toBeVisible();
    await expect(page.locator("#reset-password-submit")).toBeEnabled();
  });

  test("14. should successfully reset password and show confirmation screen with redirect option", async ({ page }) => {
    await page.route("**/api/auth/reset-password", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Password has been successfully reset",
        }),
      });
    });

    await page.goto("/reset-password?token=valid-active-token");

    await page.locator("#reset-new-password").fill("BrandNewPassword123");
    await page.locator("#reset-confirm-password").fill("BrandNewPassword123");
    await page.locator("#reset-password-submit").click();

    // Success view
    await expect(page.getByRole("heading", { name: "Password Reset!" })).toBeVisible();
    await expect(page.locator("text=Your password has been successfully reset. Redirecting you to login...")).toBeVisible();

    const loginButton = page.locator("a", { hasText: "Go to Login" });
    await expect(loginButton).toBeVisible();
    await loginButton.click();

    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });
});
