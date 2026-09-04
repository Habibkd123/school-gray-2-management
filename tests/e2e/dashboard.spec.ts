import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test.describe("Dashboard & Application Modules E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should render the main Dashboard shell and navigation", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("should render Academic Management - Classes page", async ({ page }) => {
    await page.goto("/academic-mgmt/classes");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/academic-mgmt\/classes/);
    await expect(page.locator("body")).toContainText("Classes");
  });

  test("should render Academic Management - Sections page", async ({ page }) => {
    await page.goto("/academic-mgmt/sections");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/academic-mgmt\/sections/);
    await expect(page.locator("body")).toContainText("Sections");
  });

  test("should render Academic Management - Syllabus page", async ({ page }) => {
    await page.goto("/academic-mgmt/syllabus");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/academic-mgmt\/syllabus/);
    await expect(page.locator("body")).toContainText("Syllabus");
  });

  test("should render HRM Leave Approval page", async ({ page }) => {
    await page.goto("/leave/approve-leave-request");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/leave\/approve-leave-request/);
    await expect(page.locator("body")).toContainText("Leave Requests");
  });

  test("should render Marks Entry System page", async ({ page }) => {
    await page.goto("/examination/marks-entry");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/examination\/marks-entry/);
    await expect(page.locator("body")).toContainText("Marks Entry System");
  });
});
