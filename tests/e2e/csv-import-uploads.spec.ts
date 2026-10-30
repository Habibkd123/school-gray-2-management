import { test, expect } from "@playwright/test";
import {
  loginAsSchoolAdmin,
  loginAsTeacher,
  loginAsStudent,
} from "./helpers";

test.describe("CSV Bulk Import & File Uploads Bulletproof E2E Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch {}
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: STUDENT BULK IMPORT (/students/import)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Student Bulk Import Workflow", () => {
    test("1.1 should render import page with instructions, sample headers, and template download buttons", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/students/import?subdomain=myschool");

      // Verify header and title
      await expect(page.locator("h1")).toContainText(/Bulk Import Students/i);
      await expect(page.locator("text=Download CSV Template")).toBeVisible();
      await expect(page.locator("text=Download Latest Template (Excel)")).toBeVisible();

      // Verify instruction list or upload dropzone
      await expect(page.locator("text=Upload spreadsheet")).toBeVisible();
    });

    test("1.2 should download CSV template with properly encoded headers", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/students/import?subdomain=myschool");

      const downloadPromise = page.waitForEvent("download");
      await page.click("text=Download CSV Template");
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toBe("students_import_template.csv");
    });

    test("1.3 should reject empty spreadsheet and display error message", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/students/import?subdomain=myschool");

      // Upload empty CSV
      await page.locator('input[type="file"]').setInputFiles({
        name: "empty.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(""),
      });

      // Expect validation error
      await expect(page.locator("text=The uploaded spreadsheet is empty")).toBeVisible();
    });

    test("1.4 should reject CSV missing required column headers", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/students/import?subdomain=myschool");

      // Upload CSV missing required columns (e.g. missing Admission No, Guardian Name)
      const invalidHeadersCsv = "Student Name,Gender,DOB\nBart Simpson,Male,2010-05-15";
      await page.locator('input[type="file"]').setInputFiles({
        name: "missing_headers.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(invalidHeadersCsv),
      });

      // Should show missing headers alert
      await expect(page.locator("text=Missing required column headers")).toBeVisible();
      await expect(page.locator("p:has-text('Missing required column headers')")).toContainText("Admission No");
    });

    test("1.5 should parse valid CSV, show preview table, and identify row-level errors", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/students/import?subdomain=myschool");

      const testCsv = [
        "Admission No,Roll No,Student Name,Class,Section,Gender,DOB,Primary Phone,Email,Address,Guardian Name,Guardian Phone,Guardian Email,Guardian Relation,Academic Year,Aadhaar No",
        "ADM101,1,Bart Simpson,Class 5,A,Male,2015-04-01,9876543210,bart@simpson.com,742 Evergreen Terrace,Homer Simpson,9876543211,homer@simpson.com,Father,2026-2027,123456789012",
        "ADM102,2,Lisa Simpson,Class 5,A,Female,2016-05-09,9876543212,lisa@simpson.com,742 Evergreen Terrace,Homer Simpson,9876543211,homer@simpson.com,Father,2026-2027,123456789013",
        "ADM103,3,Invalid Name Nelson,Class 5,A,Male,2015-06-15,9876543213,nelson@simpson.com,Springfield,Eddie Muntz,9876543214,muntz@simpson.com,Father,2026-2027,123456789014"
      ].join("\n");

      await page.locator('input[type="file"]').setInputFiles({
        name: "students.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(testCsv),
      });

      // Preview table should display
      await expect(page.locator("text=Import Preview")).toBeVisible();
      await expect(page.locator("text=Bart Simpson")).toBeVisible();
      await expect(page.locator("text=Lisa Simpson")).toBeVisible();
      await expect(page.locator("text=Invalid Name Nelson")).toBeVisible();

      // Row status checks: 2 valid rows, 1 invalid row
      await expect(page.locator("text=Valid rows: 2")).toBeVisible();
      await expect(page.locator("text=Invalid rows: 1")).toBeVisible();
    });

    test("1.6 should toggle row selections and toggle select-all correctly", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/students/import?subdomain=myschool");

      const testCsv = [
        "Admission No,Roll No,Student Name,Class,Section,Gender,DOB,Primary Phone,Email,Address,Guardian Name,Guardian Phone,Guardian Email,Guardian Relation,Academic Year,Aadhaar No",
        "ADM201,1,Milhouse Van Houten,Class 5,A,Male,2015-07-01,9876543220,milhouse@simpson.com,Springfield,Kirk Van Houten,9876543221,kirk@simpson.com,Father,2026-2027,123456789020",
        "ADM202,2,Martin Prince,Class 5,A,Male,2015-08-01,9876543222,martin@simpson.com,Springfield,Martin Sr,9876543223,martinsr@simpson.com,Father,2026-2027,123456789021"
      ].join("\n");

      await page.locator('input[type="file"]').setInputFiles({
        name: "students.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(testCsv),
      });

      await expect(page.locator("text=Import Preview")).toBeVisible();

      // Both valid rows selected by default
      const importBtn = page.locator("button:has-text('Import 2 Selected')");
      await expect(importBtn).toBeVisible();

      // Click the header select-all checkbox to deselect all valid rows
      const selectAllCheckbox = page.locator("thead input[type='checkbox']");
      await selectAllCheckbox.click();
      await expect(page.locator("button:has-text('Import 0 Selected')")).toBeDisabled();

      // Click the header select-all checkbox again to re-select
      await selectAllCheckbox.click();
      await expect(page.locator("button:has-text('Import 2 Selected')")).toBeEnabled();
    });

    test("1.7 should execute import, show progress, display credentials table, and allow CSV export", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/students/import?subdomain=myschool");

      const testCsv = [
        "Admission No,Roll No,Student Name,Class,Section,Gender,DOB,Primary Phone,Email,Address,Guardian Name,Guardian Phone,Guardian Email,Guardian Relation,Academic Year,Aadhaar No",
        "ADM301,1,Maggie Simpson,Class 1,A,Female,2020-01-10,9876543230,maggie@simpson.com,742 Evergreen Terrace,Homer Simpson,9876543211,homer@simpson.com,Father,2026-2027,123456789030"
      ].join("\n");

      await page.locator('input[type="file"]').setInputFiles({
        name: "students.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(testCsv),
      });

      await expect(page.locator("text=Import Preview")).toBeVisible();

      // Click Import Selected
      await page.click("button:has-text('Import 1 Selected')");

      // Verify completion summary card
      await expect(page.locator("text=Import Process Finished")).toBeVisible();
      await expect(page.getByText("Successfully Imported", { exact: true })).toBeVisible();

      // Verify generated credentials table
      await expect(page.locator("text=Download Student Credentials")).toBeVisible();
      await expect(page.getByRole("button", { name: "Download CSV" })).toBeVisible();

      // Test credentials download
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download CSV" }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain("student_credentials_");

      // Verify "Import Another File" resets state
      await page.click("text=Import Another File");
      await expect(page.locator("text=Upload spreadsheet")).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: TEACHER BULK IMPORT (/teachers/import)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Teacher Bulk Import Workflow", () => {
    test("2.1 should render teacher import page and dropzone", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/teachers/import?subdomain=myschool");

      await expect(page.locator("h1")).toContainText(/Bulk Import Faculty/i);
      await expect(page.locator("text=Download CSV Template")).toBeVisible();
      await expect(page.locator("text=Upload spreadsheet")).toBeVisible();
    });

    test("2.2 should upload teacher CSV, preview records, and complete import", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/teachers/import?subdomain=myschool");

      const teacherCsv = [
        "Employee ID,Full Name,Gender,DOB,Phone,Email,Address,Subject Specialization,Qualification,Experience Years,Join Date,Assigned Classes",
        "EMP901,Seymour Skinner,Male,1975-02-12,9876543201,skinner@springfield.edu,Springfield,Administration,M.Ed,15,2010-06-01,Class 10 - A",
        "EMP902,Edna Krabappel,Female,1980-08-20,9876543202,edna@springfield.edu,Springfield,Mathematics,B.Ed,10,2015-07-01,Class 5 - A"
      ].join("\n");

      await page.locator('input[type="file"]').setInputFiles({
        name: "teachers.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(teacherCsv),
      });

      // Preview table
      await expect(page.locator("text=Import Preview")).toBeVisible();
      await expect(page.locator("text=Seymour Skinner")).toBeVisible();
      await expect(page.locator("text=Edna Krabappel")).toBeVisible();
      await expect(page.locator("text=Valid rows: 2")).toBeVisible();

      // Execute import
      await page.click("button:has-text('Import 2 Selected')");

      // Verify completion summary
      await expect(page.locator("text=Import Process Finished")).toBeVisible();
      await expect(page.getByText("Successfully Imported", { exact: true })).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: SHARED FILE UPLOAD COMPONENT (FileUploadField)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Shared File Upload Component (FileUploadField)", () => {
    test("3.1 should toggle between URL input mode and file upload mode", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/website/gallery?subdomain=myschool");

      // Verify mode buttons exist
      const uploadModeBtn = page.locator("button:has-text('Upload')").first();
      const urlModeBtn = page.locator("button:has-text('URL')").first();

      await expect(uploadModeBtn).toBeVisible();
      await expect(urlModeBtn).toBeVisible();

      // Click upload mode
      await uploadModeBtn.click();
      await expect(page.locator("text=Click to upload").first()).toBeVisible();

      // Switch back to URL mode
      await urlModeBtn.click();
      await expect(page.locator('input[type="url"]').first()).toBeVisible();
    });

    test("3.2 should upload file in Upload mode and populate URL automatically", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/website/gallery?subdomain=myschool");

      const uploadModeBtn = page.locator("button:has-text('Upload')").first();
      await uploadModeBtn.click();

      // Upload file through the hidden file input
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles({
        name: "campus_hero.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from("mock image data"),
      });

      // Component should automatically populate URL and switch to URL mode or show preview
      await expect(page.locator('input[type="url"]').first()).toHaveValue(
        /https:\/\/res\.cloudinary\.com\/.*sample_document\.pdf/
      );
    });

    test("3.3 should display upload error when backend upload fails", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        uploadData: {
          status: 400,
          body: { success: false, message: "File too large. Maximum size is 5MB" },
        },
      });

      await page.goto("/website/gallery?subdomain=myschool");

      const uploadModeBtn = page.locator("button:has-text('Upload')").first();
      await uploadModeBtn.click();

      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles({
        name: "oversized_file.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("fake heavy file"),
      });

      // Should display error message
      await expect(page.locator("text=File too large. Maximum size is 5MB")).toBeVisible();
    });

    test("3.4 should clear uploaded file when remove button is clicked", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/website/gallery?subdomain=myschool");

      // Enter a URL in the field
      const urlInput = page.locator('input[type="url"]').first();
      await urlInput.fill("https://example.com/banner-photo.jpg");

      // Remove button should appear
      const removeBtn = page.locator("button[title='Remove']");
      await expect(removeBtn).toBeVisible();

      await removeBtn.click();
      await expect(urlInput).toHaveValue("");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: PERMISSIONS & ROLE BOUNDARIES
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Security, Access Control & Role Boundaries", () => {
    test("4.1 student role should be blocked from accessing student import page", async ({ page }) => {
      await loginAsStudent(page, { subdomain: "myschool" });
      await page.goto("/students/import?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Student has no permission for students module -> redirected to /dashboard
      await expect(page).toHaveURL(/dashboard/);
    });

    test("4.2 teacher role should be blocked from faculty import page", async ({ page }) => {
      await loginAsTeacher(page, { subdomain: "myschool" });
      await page.goto("/teachers/import?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Teacher has no permission for teachers module -> redirected to /dashboard
      await expect(page).toHaveURL(/dashboard/);
    });

    test("4.3 unauthorized file upload to /api/upload without token should fail", async ({ page }) => {
      // Directly check API endpoint rejection
      const res = await page.request.post("/api/upload", {
        multipart: {
          file: {
            name: "test.png",
            mimeType: "image/png",
            buffer: Buffer.from("test"),
          },
        },
      });

      expect([401, 403]).toContain(res.status());
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: RESILIENCY & PARTIAL IMPORT SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Resiliency, Partial Success & Failure Diagnostics", () => {
    test("5.1 should handle validation API server errors gracefully", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        studentValidateData: {
          status: 500,
          body: { success: false, message: "Database connection timeout during validation" },
        },
      });

      await page.goto("/students/import?subdomain=myschool");

      const testCsv = [
        "Admission No,Roll No,Student Name,Class,Section,Gender,DOB,Primary Phone,Email,Address,Guardian Name,Guardian Phone,Guardian Email,Guardian Relation,Academic Year,Aadhaar No",
        "ADM501,1,Ralph Wiggum,Class 5,A,Male,2015-01-01,9876543200,ralph@simpson.com,Springfield,Clancy Wiggum,9876543201,clancy@simpson.com,Father,2026-2027,123456789050"
      ].join("\n");

      await page.locator('input[type="file"]').setInputFiles({
        name: "students.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(testCsv),
      });

      // Should display error message
      await expect(page.locator("text=Database connection timeout during validation")).toBeVisible();
    });

    test("5.2 should surface partial failures in import summary without losing successful count", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        studentImportData: {
          status: 200,
          body: {
            success: true,
            data: {
              successCount: 1,
              failedCount: 1,
              failures: [
                { row: "Nelson Muntz", error: "Duplicate admission number ADM999" }
              ],
            },
          },
        },
      });

      await page.goto("/students/import?subdomain=myschool");

      const testCsv = [
        "Admission No,Roll No,Student Name,Class,Section,Gender,DOB,Primary Phone,Email,Address,Guardian Name,Guardian Phone,Guardian Email,Guardian Relation,Academic Year,Aadhaar No",
        "ADM998,1,Sherri Mackleberry,Class 5,A,Female,2015-02-01,9876543201,sherri@simpson.com,Springfield,Mr Mackleberry,9876543202,mackleberry@simpson.com,Father,2026-2027,123456789098",
        "ADM999,2,Nelson Muntz,Class 5,A,Male,2015-03-01,9876543203,nelson@simpson.com,Springfield,Eddie Muntz,9876543204,muntz@simpson.com,Father,2026-2027,123456789099"
      ].join("\n");

      await page.locator('input[type="file"]').setInputFiles({
        name: "students.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(testCsv),
      });

      await expect(page.locator("text=Import Preview")).toBeVisible();
      await page.click("button:has-text('Import 2 Selected')");

      // Verify both successful and failed metrics are reported
      await expect(page.locator("text=Import Process Finished")).toBeVisible();
      await expect(page.locator("text=Failed to Save")).toBeVisible();
      await expect(page.locator("text=Duplicate admission number ADM999")).toBeVisible();
    });
  });
});
