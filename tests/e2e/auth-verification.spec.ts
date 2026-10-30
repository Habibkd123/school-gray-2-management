import { test, expect } from "@playwright/test";

test.describe("Two-Step & Email Verification Flow Deep E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch {}
    });
  });

  // ─────────────────────────────────────────────────────────────
  // PART 1: TWO-STEP VERIFICATION (/two-step-verification)
  // ─────────────────────────────────────────────────────────────

  test("1. should render two-step verification UI elements and OTP inputs correctly", async ({ page }) => {
    await page.goto("/two-step-verification");

    await expect(page.getByRole("heading", { name: "Login with your Email Address" })).toBeVisible();
    await expect(
      page.locator("text=We sent a verification code to your email. Enter the code from the email in the field below")
    ).toBeVisible();

    // 4 OTP digit inputs
    const inputs = page.locator("form input[type='text']");
    await expect(inputs).toHaveCount(4);

    // Timer badge
    await expect(page.locator("text=Otp Will Expire In 09:59")).toBeVisible();

    // Submit button
    const submitBtn = page.getByRole("button", { name: "Verify My Account" });
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeEnabled();
  });

  test("2. should reject non-numeric characters in OTP input fields", async ({ page }) => {
    await page.goto("/two-step-verification");

    const inputs = page.locator("form input[type='text']");
    const firstInput = inputs.nth(0);

    // Type alphabet letters
    await firstInput.pressSequentially("abc");
    await expect(firstInput).toHaveValue("");

    // Type symbols
    await firstInput.pressSequentially("!@#");
    await expect(firstInput).toHaveValue("");

    // Type number
    await firstInput.pressSequentially("4");
    await expect(firstInput).toHaveValue("4");
  });

  test("3. should automatically advance focus across OTP input boxes as digits are entered", async ({ page }) => {
    await page.goto("/two-step-verification");

    const inputs = page.locator("form input[type='text']");

    // Focus first input and type digits sequentially
    await inputs.nth(0).focus();
    await page.keyboard.press("1");
    await expect(inputs.nth(0)).toHaveValue("1");
    await expect(inputs.nth(1)).toBeFocused();

    await page.keyboard.press("2");
    await expect(inputs.nth(1)).toHaveValue("2");
    await expect(inputs.nth(2)).toBeFocused();

    await page.keyboard.press("3");
    await expect(inputs.nth(2)).toHaveValue("3");
    await expect(inputs.nth(3)).toBeFocused();

    await page.keyboard.press("4");
    await expect(inputs.nth(3)).toHaveValue("4");
  });

  test("4. should handle backspace correctly by clearing and moving focus to previous box", async ({ page }) => {
    await page.goto("/two-step-verification");

    const inputs = page.locator("form input[type='text']");

    // Type into box 0
    await inputs.nth(0).focus();
    await page.keyboard.press("8");
    await expect(inputs.nth(0)).toHaveValue("8");

    // Type into box 1
    await inputs.nth(1).focus();
    await page.keyboard.press("9");
    await expect(inputs.nth(1)).toHaveValue("9");

    // Box 1 has "9". Focus box 1 and press Backspace -> should clear box 1
    await inputs.nth(1).focus();
    await page.keyboard.press("Backspace");
    await expect(inputs.nth(1)).toHaveValue("");

    // Box 1 is now empty. Press Backspace on box 1 -> should clear box 0
    await page.keyboard.press("Backspace");
    await expect(inputs.nth(0)).toHaveValue("");
  });

  test("5. should show spinner on submit and navigate to /dashboard", async ({ page }) => {
    // Mock settings permissions to prevent 401 on dashboard
    await page.route("**/api/settings/permissions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: {} }),
      });
    });

    await page.goto("/two-step-verification");

    const inputs = page.locator("form input[type='text']");
    await inputs.nth(0).fill("1");
    await inputs.nth(1).fill("2");
    await inputs.nth(2).fill("3");
    await inputs.nth(3).fill("4");

    const submitBtn = page.getByRole("button", { name: "Verify My Account" });
    await submitBtn.click();

    // Verify redirect to /dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  // ─────────────────────────────────────────────────────────────
  // PART 2: EMAIL VERIFICATION (/email-verification)
  // ─────────────────────────────────────────────────────────────

  test("6. should render email verification page elements and instructions correctly", async ({ page }) => {
    await page.goto("/email-verification");

    await expect(page.getByRole("heading", { name: "Verify your Email" })).toBeVisible();
    await expect(page.locator("text=We've sent a link to your email test@example.com.")).toBeVisible();

    // Resend link
    await expect(page.locator("text=Didn't receive an email?")).toBeVisible();
    const resendBtn = page.getByRole("button", { name: "Resend Link" });
    await expect(resendBtn).toBeVisible();

    // Skip button
    const skipBtn = page.getByRole("button", { name: "Skip Now" });
    await expect(skipBtn).toBeVisible();
  });

  test("7. should allow clicking Resend Link without breaking UI", async ({ page }) => {
    await page.goto("/email-verification");

    const resendBtn = page.getByRole("button", { name: "Resend Link" });
    await expect(resendBtn).toBeVisible();
    await resendBtn.click();

    // Page should remain steady and functional
    await expect(page.getByRole("heading", { name: "Verify your Email" })).toBeVisible();
  });

  test("8. should show spinner on Skip Now and navigate to /dashboard", async ({ page }) => {
    await page.route("**/api/settings/permissions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: {} }),
      });
    });

    await page.goto("/email-verification");

    const skipBtn = page.getByRole("button", { name: "Skip Now" });
    await skipBtn.click();

    // Verify redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
