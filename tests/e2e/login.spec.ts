import { test, expect } from "@playwright/test";

test.describe("Authentication E2E Tests", () => {
  test("should render the login page correctly with all role tabs", async ({ page }) => {
    await page.goto("/login");

    // Check heading
    await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();

    // Check role tabs
    await expect(page.getByRole("button", { name: "admin" })).toBeVisible();
    await expect(page.getByRole("button", { name: "principal" })).toBeVisible();
    await expect(page.getByRole("button", { name: "teacher" })).toBeVisible();
    await expect(page.getByRole("button", { name: "student" })).toBeVisible();
  });

  test("should show validation error when submitting empty admin login form", async ({ page }) => {
    await page.goto("/login");

    // Click Sign In without entering email
    await page.locator("#login-submit").click();

    // Verify error message
    await expect(page.locator("text=Please enter your Email Address.")).toBeVisible();
  });

  test("should show validation error when entering invalid email format", async ({ page }) => {
    await page.goto("/login");

    await page.locator("#login-username").fill("invalidemail");
    await page.locator("#login-password").fill("password123");
    await page.locator("#login-submit").click();

    await expect(page.locator("text=Please enter a valid Email Address.")).toBeVisible();
  });

  test("should update username input label when switching tabs", async ({ page }) => {
    await page.goto("/login");

    // Admin tab default
    await expect(page.locator("text=Email Address")).toBeVisible();

    // Switch to Teacher tab
    await page.getByRole("button", { name: "teacher" }).click();

    // Label should change to School Username
    await expect(page.locator("text=School Username")).toBeVisible();
  });
});
