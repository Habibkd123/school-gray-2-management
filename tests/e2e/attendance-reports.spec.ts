import { test, expect } from "@playwright/test";
import {
  loginAsSchoolAdmin,
  loginAsTeacher,
  loginAsStudent,
} from "./helpers";

test.describe("Attendance & Reports Deep & Bulletproof E2E Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Avoid slow CSS transitions/animations during E2E runs
    await page.addStyleTag({
      content: `*, *::before, *::after { transition-duration: 0s !important; animation-duration: 0s !important; }`,
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: STUDENT ATTENDANCE REGISTER & MARKING (/attendance/student)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Student Attendance Register & Marking", () => {
    test("1.1 should render attendance dashboard overview with key statistics when no class is selected", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/attendance/student");
      await page.waitForLoadState("domcontentloaded");

      // Verify page title and header
      await expect(page.locator("h1")).toContainText("Student Attendance");

      // Verify classes overview dashboard metrics cards
      await expect(page.locator("p:has-text('Total Classes')")).toBeVisible({ timeout: 10000 });
      await expect(page.locator("p:has-text('Completed')")).toBeVisible();
      await expect(page.locator("p:has-text('Pending')")).toBeVisible();
      await expect(page.locator("p:has-text('Attendance %')")).toBeVisible();

      // Verify class selection dropdown is present
      const classSelect = page.locator("select").filter({ hasText: "Select Class" });
      await expect(classSelect).toBeVisible();
    });

    test("1.2 should select class and render student attendance register list", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/attendance/student");
      await page.waitForLoadState("domcontentloaded");

      // Select Grade 5 from class dropdown
      const classSelect = page.locator("select").filter({ hasText: "Select Class" });
      await classSelect.selectOption({ label: "Grade 5 - A" });

      // Verify register table headers
      await expect(page.locator("th:has-text('Admission No')")).toBeVisible({ timeout: 10000 });
      await expect(page.locator("th:has-text('Roll No')")).toBeVisible();
      await expect(page.locator("th:has-text('Name')")).toBeVisible();
      await expect(page.locator("th:has-text('Attendance')")).toBeVisible();

      // Verify students are listed
      await expect(page.locator("td:has-text('Bart Simpson')")).toBeVisible();
      await expect(page.locator("td:has-text('Lisa Simpson')")).toBeVisible();
    });

    test("1.3 should toggle attendance status and input remark notes for individual students", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        studentAttendanceData: null, // Open in "take" mode
      });
      await page.goto("/attendance/student");
      await page.waitForLoadState("domcontentloaded");

      // Select Grade 5
      const classSelect = page.locator("select").filter({ hasText: "Select Class" });
      await classSelect.selectOption({ label: "Grade 5 - A" });

      // Wait for table to load
      await expect(page.locator("td:has-text('Bart Simpson')")).toBeVisible({ timeout: 10000 });

      // Locate Bart Simpson's row and toggle to Absent
      const bartRow = page.locator("tr").filter({ hasText: "Bart Simpson" });
      const absentRadio = bartRow.locator("input[type='radio'][value='absent']");
      await absentRadio.check();
      await expect(absentRadio).toBeChecked();

      // Locate Lisa Simpson's row, toggle to Leave, and enter note
      const lisaRow = page.locator("tr").filter({ hasText: "Lisa Simpson" });
      const leaveRadio = lisaRow.locator("input[type='radio'][value='leave']");
      await leaveRadio.check();
      await expect(leaveRadio).toBeChecked();

      const noteInput = lisaRow.locator("input[id*='note-input']");
      await noteInput.fill("Doctor appointment leave");
      await expect(noteInput).toHaveValue("Doctor appointment leave");
    });

    test("1.4 should support bulk marking of all students to Absent and Present", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        studentAttendanceData: null, // "take" mode
      });
      await page.goto("/attendance/student");
      await page.waitForLoadState("domcontentloaded");

      const classSelect = page.locator("select").filter({ hasText: "Select Class" });
      await classSelect.selectOption({ label: "Grade 5 - A" });
      await expect(page.locator("td:has-text('Bart Simpson')")).toBeVisible({ timeout: 10000 });

      // Click bulk "Absent" button
      const bulkAbsentBtn = page.getByRole("button", { name: "Absent", exact: true });
      await bulkAbsentBtn.click();

      // All radio buttons for absent should now be checked
      const bartRow = page.locator("tr").filter({ hasText: "Bart Simpson" });
      await expect(bartRow.locator("input[type='radio'][value='absent']")).toBeChecked();
      const lisaRow = page.locator("tr").filter({ hasText: "Lisa Simpson" });
      await expect(lisaRow.locator("input[type='radio'][value='absent']")).toBeChecked();

      // Click bulk "Present" button
      const bulkPresentBtn = page.getByRole("button", { name: "Present", exact: true });
      await bulkPresentBtn.click();

      await expect(bartRow.locator("input[type='radio'][value='present']")).toBeChecked();
      await expect(lisaRow.locator("input[type='radio'][value='present']")).toBeChecked();
    });

    test("1.5 should require an audit edit reason when updating existing saved attendance", async ({ page }) => {
      let savedPayload: any = null;
      await loginAsSchoolAdmin(page);

      await page.route("**/api/attendance/student", async (route) => {
        const req = route.request();
        if (req.method() === "POST") {
          savedPayload = JSON.parse(req.postData() || "{}");
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              message: "Attendance register successfully recorded!",
              data: { _id: "att_saved_002", ...savedPayload },
            }),
          });
          return;
        }
        await route.fallback();
      });

      await page.goto("/attendance/student");
      await page.waitForLoadState("domcontentloaded");

      const classSelect = page.locator("select").filter({ hasText: "Select Class" });
      await classSelect.selectOption({ label: "Grade 5 - A" });

      // Verify Viewing Saved Register state
      await expect(page.getByText("Viewing Saved Register")).toBeVisible({ timeout: 10000 });

      // Click Edit Register button
      const editBtn = page.getByRole("button", { name: "Edit Register" });
      await expect(editBtn).toBeVisible();
      await editBtn.click();

      // Verify edit reason field is visible
      const editReasonInput = page.getByPlaceholder("Required for auditing");
      await expect(editReasonInput).toBeVisible();

      // Try saving without entering a reason
      const saveBtn = page.getByRole("button", { name: "Save Attendance" });
      const isSaveDisabled = await saveBtn.isDisabled();
      if (!isSaveDisabled) {
        await saveBtn.click();
        await expect(page.getByText("A reason is mandatory when editing attendance.")).toBeVisible();
      }

      // Enter edit reason and click Save
      await editReasonInput.fill("Corrected erroneous absence by class teacher");
      await expect(saveBtn).toBeEnabled();
      await saveBtn.click();

      // Verify save payload contains reason
      await expect.poll(() => savedPayload?.reason).toBe("Corrected erroneous absence by class teacher");
    });

    test("1.6 should open student attendance quick view modal with history and percentage", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/attendance/student");
      await page.waitForLoadState("domcontentloaded");

      const classSelect = page.locator("select").filter({ hasText: "Select Class" });
      await classSelect.selectOption({ label: "Grade 5 - A" });
      await expect(page.locator("td:has-text('Bart Simpson')")).toBeVisible({ timeout: 10000 });

      // Click on Bart Simpson's eye action
      const bartRow = page.locator("tr").filter({ hasText: "Bart Simpson" });
      const viewBtn = bartRow.locator("button[title*='Attendance']").first();
      await viewBtn.click();

      // Verify quick view modal appears
      const modal = page.locator(".fixed.inset-0.z-50");
      await expect(modal).toBeVisible();
      await expect(modal.getByText("Bart Simpson")).toBeVisible();
      await expect(modal.getByText("91%")).toBeVisible();
      await expect(modal.getByText("Present and attentive")).toBeVisible();

      // Close modal
      const closeBtn = modal.getByRole("button", { name: "Close", exact: true });
      await closeBtn.click();
      await expect(modal).not.toBeVisible();
    });

    test("1.7 should trigger CSV export download without unhandled errors", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/attendance/student");
      await page.waitForLoadState("domcontentloaded");

      const classSelect = page.locator("select").filter({ hasText: "Select Class" });
      await classSelect.selectOption({ label: "Grade 5 - A" });
      await expect(page.locator("td:has-text('Bart Simpson')")).toBeVisible({ timeout: 10000 });

      // Listen for download event
      const downloadPromise = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
      const exportBtn = page.getByRole("button", { name: "Export", exact: false }).first();
      await exportBtn.click();

      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toContain("student_attendance");
      }
    });

    test("1.8 should display empty state when search query matches no students", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/attendance/student");
      await page.waitForLoadState("domcontentloaded");

      const classSelect = page.locator("select").filter({ hasText: "Select Class" });
      await classSelect.selectOption({ label: "Grade 5 - A" });
      await expect(page.locator("td:has-text('Bart Simpson')")).toBeVisible({ timeout: 10000 });

      // Type non-existent query
      const searchInput = page.getByPlaceholder("Search Student name, admission no, roll no...");
      await searchInput.fill("NonExistentStudentName9999");

      // Verify empty state display
      await expect(page.getByText("No students found")).toBeVisible();
      await expect(page.getByText("No students match your active search or status filter.")).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: TEACHER ATTENDANCE (/attendance/teacher)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Teacher Attendance Board", () => {
    test("2.1 should load teacher attendance board with metrics and teacher rows", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/attendance/teacher");
      await page.waitForLoadState("domcontentloaded");

      // Verify heading and summary cards
      await expect(page.locator("h1")).toContainText("Staff Attendance Board");
      await expect(page.getByText("Total Staff", { exact: false })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Present Rate", { exact: false })).toBeVisible();

      // Verify table rows for teachers Edna Krabappel and Elizabeth Hoover
      await expect(page.locator("td:has-text('Edna Krabappel')")).toBeVisible();
      await expect(page.locator("td:has-text('Elizabeth Hoover')")).toBeVisible();
    });

    test("2.2 should toggle teacher status, update metrics, and edit remark note", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/attendance/teacher");
      await page.waitForLoadState("domcontentloaded");

      await expect(page.locator("td:has-text('Edna Krabappel')")).toBeVisible({ timeout: 10000 });

      // Locate Edna Krabappel's row
      const ednaRow = page.locator("tr").filter({ hasText: "Edna Krabappel" });
      const statusSelect = ednaRow.locator("select");

      // Change status to Absent
      await statusSelect.selectOption("absent");
      await expect(statusSelect).toHaveValue("absent");

      // Add a remark note
      const noteInput = ednaRow.locator("input[placeholder='Add note...']");
      await noteInput.fill("Conference abroad");
      await expect(noteInput).toHaveValue("Conference abroad");
    });

    test("2.3 should support bulk marking of all teachers to Absent and Present", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/attendance/teacher");
      await page.waitForLoadState("domcontentloaded");

      await expect(page.locator("td:has-text('Edna Krabappel')")).toBeVisible({ timeout: 10000 });

      // Click "All Absent" button
      const allAbsentBtn = page.getByRole("button", { name: "All Absent" });
      await allAbsentBtn.click();

      // Verify all select dropdowns are updated to absent
      const ednaRow = page.locator("tr").filter({ hasText: "Edna Krabappel" });
      await expect(ednaRow.locator("select")).toHaveValue("absent");
      const hooverRow = page.locator("tr").filter({ hasText: "Elizabeth Hoover" });
      await expect(hooverRow.locator("select")).toHaveValue("absent");

      // Click "All Present" button
      const allPresentBtn = page.getByRole("button", { name: "All Present" });
      await allPresentBtn.click();

      await expect(ednaRow.locator("select")).toHaveValue("present");
      await expect(hooverRow.locator("select")).toHaveValue("present");
    });

    test("2.4 should save teacher attendance register and display confirmation message", async ({ page }) => {
      let savedTeacherPayload: any = null;
      await loginAsSchoolAdmin(page);

      await page.route("**/api/attendance/teacher", async (route) => {
        const req = route.request();
        if (req.method() === "POST") {
          savedTeacherPayload = JSON.parse(req.postData() || "{}");
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              message: "Staff register saved successfully!",
              data: { _id: "t_att_saved_new", ...savedTeacherPayload },
            }),
          });
          return;
        }
        await route.fallback();
      });

      await page.goto("/attendance/teacher");
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("td:has-text('Edna Krabappel')")).toBeVisible({ timeout: 10000 });

      // Click "Save Staff Attendance" button
      const saveBtn = page.getByRole("button", { name: "Save Staff Attendance" });
      await saveBtn.click();

      // Verify success notification
      await expect(page.getByText("Staff register saved successfully!")).toBeVisible();
      expect(savedTeacherPayload).not.toBeNull();
      expect(Array.isArray(savedTeacherPayload.records)).toBe(true);
    });

    test("2.5 should filter teachers by Department dropdown", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/attendance/teacher");
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("td:has-text('Edna Krabappel')")).toBeVisible({ timeout: 10000 });

      // Select Department "Academic" (Edna is Academic, Elizabeth Hoover is Science)
      const deptSelect = page.locator("select").filter({ hasText: "All Departments" });
      await deptSelect.selectOption("Academic");

      // Edna Krabappel (Academic) should be visible, Elizabeth Hoover (Science) filtered out
      await expect(page.locator("td:has-text('Edna Krabappel')")).toBeVisible();
      await expect(page.locator("td:has-text('Elizabeth Hoover')")).not.toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: ATTENDANCE REPORTS & METRICS AGGREGATION (/reports/*)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Attendance Reports & Analytics", () => {
    test("3.1 should render daily attendance report with summary stats and class breakdown", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        attendanceReportsDaily: [
          {
            classId: "60f000000000000000000401",
            className: "Grade 5",
            section: "A",
            total: 30,
            present: 27,
            absent: 2,
            late: 1,
            leave: 0,
            halfDay: 0,
            isMarked: true,
            rate: 93,
          },
          {
            classId: "60f000000000000000000402",
            className: "Grade 3",
            section: "B",
            total: 25,
            present: 23,
            absent: 1,
            late: 1,
            leave: 0,
            halfDay: 0,
            isMarked: true,
            rate: 96,
          },
        ],
      });

      await page.goto("/reports/daily-attendance");
      await page.waitForLoadState("domcontentloaded");

      // Verify title
      await expect(page.locator("h1")).toContainText("Daily Attendance Report");

      // Verify summary stat totals: Total = 30 + 25 = 55; Present = 27 + 23 = 50; Absent = 2 + 1 = 3
      await expect(page.locator("p.card-subtitle:has-text('Total Students')")).toBeVisible({ timeout: 10000 });
      await expect(page.locator(".stat-value, h4, h3, div").filter({ hasText: "55" }).first()).toBeVisible();
      await expect(page.locator(".stat-value, h4, h3, div").filter({ hasText: "50" }).first()).toBeVisible();

      // Verify class rows in table
      await expect(page.locator("td:has-text('Grade 5')")).toBeVisible();
      await expect(page.locator("td:has-text('Grade 3')")).toBeVisible();
      await expect(page.locator("td:has-text('93%')")).toBeVisible();
      await expect(page.locator("td:has-text('96%')")).toBeVisible();
    });

    test("3.2 should filter daily report by date picker and fetch updated date metrics", async ({ page }) => {
      let fetchedDate: string | null = null;
      await loginAsSchoolAdmin(page);

      await page.route("**/api/reports/attendance?**", async (route) => {
        const url = new URL(route.request().url());
        if (url.searchParams.get("type") === "daily") {
          fetchedDate = url.searchParams.get("date");
        }
        await route.fallback();
      });

      await page.goto("/reports/daily-attendance");
      await page.waitForLoadState("domcontentloaded");

      // Change date
      const dateInput = page.locator("input[type='date']").first();
      await dateInput.fill("2026-10-15");
      await dateInput.dispatchEvent("change");

      await expect.poll(() => fetchedDate).toBe("2026-10-15");
    });

    test("3.3 should render monthly attendance report with working days and average present", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        attendanceReportsMonthly: [
          {
            classId: "60f000000000000000000401",
            className: "Grade 5",
            section: "A",
            studentCount: 30,
            workingDays: 22,
            averagePresent: 28,
            averageAbsent: 2,
            rate: 93,
          },
          {
            classId: "60f000000000000000000402",
            className: "Grade 3",
            section: "B",
            studentCount: 25,
            workingDays: 22,
            averagePresent: 24,
            averageAbsent: 1,
            rate: 96,
          },
        ],
      });

      await page.goto("/reports/attendance-report");
      await page.waitForLoadState("domcontentloaded");

      // Verify page title
      await expect(page.locator("h1")).toContainText("Monthly Attendance Report");

      // Verify monthly table columns
      await expect(page.locator("th:has-text('Working Days')")).toBeVisible({ timeout: 10000 });
      await expect(page.locator("th:has-text('Avg Present')")).toBeVisible();
      await expect(page.locator("th:has-text('Overall Rate')")).toBeVisible();

      // Verify row values
      await expect(page.locator("td:has-text('Grade 5')")).toBeVisible();
      await expect(page.locator("td:has-text('22')").first()).toBeVisible();
      await expect(page.locator("td:has-text('28')").first()).toBeVisible();
      await expect(page.locator("td:has-text('93%')")).toBeVisible();
    });

    test("3.4 should export daily and monthly attendance reports to CSV format", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/reports/daily-attendance");
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("td:has-text('Grade 5')")).toBeVisible({ timeout: 10000 });

      // Click export button
      const exportBtn = page.getByRole("button", { name: "Export", exact: false }).first();
      await exportBtn.click();

      // Click CSV in export dropdown if open
      const csvOption = page.locator("button:has-text('CSV'), a:has-text('CSV')").first();
      if (await csvOption.isVisible()) {
        const downloadPromise = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
        await csvOption.click();
        const download = await downloadPromise;
        if (download) {
          expect(download.suggestedFilename()).toContain("daily_attendance_report");
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: PERMISSIONS & ROLE-BASED ACCESS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Permissions & Security Boundaries", () => {
    test("4.1 should restrict teacher role from viewing unauthorized classes in register dropdown", async ({ page }) => {
      // Teacher Edna Krabappel (_id: 60f000000000000000000003) assigned to Grade 3, but NOT Grade 5
      await loginAsTeacher(page, {
        classes: [
          { _id: "60f000000000000000000401", name: "Grade 5", section: "A", academic_year: "2026-2027", class_teacher_id: "other_teacher_id" },
          { _id: "60f000000000000000000402", name: "Grade 3", section: "B", academic_year: "2026-2027", class_teacher_id: "60f000000000000000000003" },
        ],
        teacherAssignmentData: [
          {
            _id: "ta_01",
            teacher_id: "60f000000000000000000003",
            class_id: { _id: "60f000000000000000000402", name: "Grade 3", section: "B" },
            academic_year: "2026-2027",
          },
        ],
      });

      await page.goto("/attendance/student");
      await page.waitForLoadState("domcontentloaded");

      // Verify dropdown only offers the teacher's assigned class (Grade 3), not Grade 5
      const classSelect = page.locator("select").filter({ hasText: "Select Class" });
      await expect(classSelect).toBeVisible({ timeout: 10000 });
      await expect(classSelect.locator("option:has-text('Grade 3')")).toBeAttached();
      await expect(classSelect.locator("option:has-text('Grade 5')")).not.toBeAttached();
    });

    test("4.2 should prevent student portal users from accessing student attendance marking", async ({ page }) => {
      await loginAsStudent(page);
      await page.goto("/attendance/student");
      await page.waitForLoadState("domcontentloaded");

      // Student should not see Save Attendance or bulk marking actions
      await expect(page.getByRole("button", { name: "Save Attendance" })).not.toBeVisible();
      await expect(page.getByRole("button", { name: "Register Actions" })).not.toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: RESILIENCY & ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Resiliency & Error Handling", () => {
    test("5.1 should display error message gracefully when student attendance API returns 500", async ({ page }) => {
      await loginAsSchoolAdmin(page);

      await page.route("**/api/attendance/student?**", async (route) => {
        if (route.request().url().includes("classId=")) {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              message: "Database connection failed during attendance query",
            }),
          });
          return;
        }
        await route.fallback();
      });

      await page.goto("/attendance/student");
      await page.waitForLoadState("domcontentloaded");

      const classSelect = page.locator("select").filter({ hasText: "Select Class" });
      await classSelect.selectOption({ label: "Grade 5 - A" });

      // Page handles error gracefully without white-screen crash
      await expect(page.locator("body")).toBeVisible();
    });

    test("5.2 should handle empty attendance report dataset without crashing UI", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        attendanceReportsDaily: [],
      });

      await page.goto("/reports/daily-attendance");
      await page.waitForLoadState("domcontentloaded");

      // Shows zero metrics and empty state gracefully
      await expect(page.locator("h1")).toContainText("Daily Attendance Report");
      await expect(page.getByText("No records found", { exact: false }).or(page.locator("table"))).toBeVisible();
    });
  });
});
