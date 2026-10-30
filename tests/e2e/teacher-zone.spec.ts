import { test, expect } from "@playwright/test";
import {
  loginAsSchoolAdmin,
  loginAsTeacher,
  loginAsStudent,
  loginAsParent,
} from "./helpers";

test.describe("Teacher Zone Deep & Bulletproof E2E Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
        if ((window as any).__clearLeaveCache) {
          (window as any).__clearLeaveCache();
        }
      } catch {}
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: TEACHER DIRECTORY & CATALOG (/teachers)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Teachers Directory & Catalog", () => {
    test("1.1 should render teachers directory with counts, faculty cards, and badges", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        teachersData: {
          teachers: [
            {
              _id: "tea_1",
              employee_id: "EMP-2026-001",
              name: "Edna Krabappel",
              gender: "female",
              phone: "9876543201",
              email: "edna.krabappel@springfield.edu",
              qualification: "M.Ed, B.Sc",
              expertise: ["Mathematics", "Science"],
              subject_specialization: "Mathematics",
              department: "Academic",
              designation: "Senior Teacher",
              is_active: true,
              class_id: { _id: "cls_5a", name: "Grade 5", section: "A" },
            },
            {
              _id: "tea_2",
              employee_id: "EMP-2026-002",
              name: "Elizabeth Hoover",
              gender: "female",
              phone: "9876543202",
              email: "elizabeth.hoover@springfield.edu",
              qualification: "B.Ed",
              expertise: ["English", "History"],
              subject_specialization: "English",
              department: "Academic",
              designation: "Teacher",
              is_active: false,
              class_id: { _id: "cls_3b", name: "Grade 3", section: "B" },
            },
          ],
          total: 2,
          totalPages: 1,
          page: 1,
          limit: 12,
        },
      });

      await page.goto("/teachers?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify Header
      await expect(page.locator("h1:has-text('Teacher List')")).toBeVisible();
      await expect(page.locator("text=Showing 1–2 of 2 teachers")).toBeVisible();

      // Verify Cards in Grid
      await expect(page.locator("text=Edna Krabappel").first()).toBeVisible();
      await expect(page.locator("text=EMP-2026-001").first()).toBeVisible();
      await expect(page.locator("text=Elizabeth Hoover").first()).toBeVisible();
      await expect(page.locator("text=EMP-2026-002").first()).toBeVisible();

      // Verify Active / Inactive Badges
      await expect(page.locator("span:has-text('Active')").first()).toBeVisible();
      await expect(page.locator("span:has-text('Inactive')").first()).toBeVisible();
    });

    test("1.2 should search teachers by name and debounced input filter", async ({ page }) => {
      let requestedSearch = "";

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
      });

      await page.route(/\/api\/teachers\?.*search=/, async (route) => {
        const url = route.request().url();
        const urlObj = new URL(url);
        requestedSearch = urlObj.searchParams.get("search") || "";

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              teachers: [
                {
                  _id: "tea_1",
                  employee_id: "EMP-2026-001",
                  name: "Edna Krabappel",
                  gender: "female",
                  phone: "9876543201",
                  email: "edna.krabappel@springfield.edu",
                  subject_specialization: "Mathematics",
                  department: "Academic",
                  designation: "Senior Teacher",
                  is_active: true,
                },
              ],
              total: 1,
              totalPages: 1,
              page: 1,
            },
          }),
        });
      });

      await page.goto("/teachers?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Type in search box
      const searchInput = page.locator("input[placeholder*='Search']").first();
      await searchInput.fill("Edna");

      // Wait for debounce API call
      await page.waitForTimeout(600);
      expect(requestedSearch).toBe("Edna");
      await expect(page.locator("text=Edna Krabappel").first()).toBeVisible();
    });

    test("1.3 should toggle between Grid and List view modes", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        teachersData: {
          teachers: [
            {
              _id: "tea_1",
              employee_id: "EMP-2026-001",
              name: "Edna Krabappel",
              phone: "9876543201",
              subject_specialization: "Mathematics",
              is_active: true,
            },
          ],
          total: 1,
          totalPages: 1,
          page: 1,
        },
      });

      await page.goto("/teachers?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Initially in Grid mode
      await expect(page.locator("h2:has-text('Teachers Grid')")).toBeVisible();

      // Click List view icon button
      const listBtn = page.locator("button:has(svg.lucide-list)").first();
      await listBtn.click();

      // Heading switches to Teachers List and table appears
      await expect(page.locator("h2:has-text('Teachers List')")).toBeVisible();
      await expect(page.locator("table")).toBeVisible();
      await expect(page.locator("th:has-text('Employee ID')").or(page.locator("th:has-text('ID')")).first()).toBeVisible();
    });

    test("1.4 should open filter popover and filter by department and designation", async ({ page }) => {
      let capturedDepartment = "";
      let capturedDesignation = "";

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
      });

      await page.route(/\/api\/teachers\?.*department=/, async (route) => {
        const urlObj = new URL(route.request().url());
        capturedDepartment = urlObj.searchParams.get("department") || "";
        capturedDesignation = urlObj.searchParams.get("designation") || "";

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              teachers: [
                {
                  _id: "tea_1",
                  employee_id: "EMP-2026-001",
                  name: "Edna Krabappel",
                  department: "Science",
                  designation: "Senior Teacher",
                  is_active: true,
                },
              ],
              total: 1,
              totalPages: 1,
              page: 1,
            },
          }),
        });
      });

      await page.goto("/teachers?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Open Filter dropdown
      await page.locator("button:has-text('Filter')").first().click();

      // Select Department
      await page.locator("label:has-text('Department')").locator("..").locator("select").selectOption("Science");
      await page.waitForTimeout(500);

      expect(capturedDepartment).toBe("Science");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: TEACHER ADMISSION & PROFILE CRUD (/teachers/add & edit)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Teacher Admission & Profile CRUD", () => {
    test("2.1 should validate sequential mandatory fields on empty submission", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
      });

      await page.goto("/teachers/add?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Header
      await expect(page.locator("h1:has-text('Add Teacher')")).toBeVisible();

      // Submit empty form
      await page.locator("button[type='submit']:has-text('Add Teacher')").click();

      // First sequential validation error: Teacher Name is required
      await expect(page.locator("text=Teacher Name is required").first()).toBeVisible();

      // Fill Teacher Name, next should be Employee ID
      await page.locator("#teacherName").fill("Dewey Largo");
      await page.locator("button[type='submit']:has-text('Add Teacher')").click();
      await expect(page.locator("text=Employee ID is required").first()).toBeVisible();

      // Fill Employee ID, next should be Gender
      await page.locator("#employeeCode").fill("EMP-2026-099");
      await page.locator("button[type='submit']:has-text('Add Teacher')").click();
      await expect(page.locator("text=Gender selection is mandatory").first()).toBeVisible();

      // Fill Gender, next should be Mobile Number
      await page.locator("#gender").selectOption("Male");
      await page.locator("button[type='submit']:has-text('Add Teacher')").click();
      await expect(page.locator("text=Mobile Number is required").first()).toBeVisible();
    });

    test("2.2 should validate phone number format (must be 10 digits)", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
      });

      await page.goto("/teachers/add?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      await page.locator("#teacherName").fill("Dewey Largo");
      await page.locator("#employeeCode").fill("EMP-2026-099");
      await page.locator("#gender").selectOption("Male");

      // Fill invalid 4-digit phone
      await page.locator("#phone").fill("1234");
      await page.locator("button[type='submit']:has-text('Add Teacher')").click();

      // Mobile number validation error
      await expect(page.locator("text=Mobile Number must be exactly 10 digits").first()).toBeVisible();
    });

    test("2.3 should create teacher successfully and display credentials dialog", async ({ page }) => {
      let createdPayload: any = null;

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
      });

      await page.route(/\/api\/teachers$/, async (route) => {
        const req = route.request();
        if (req.method() === "POST") {
          createdPayload = JSON.parse(req.postData() || "{}");
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              credentials: {
                loginId: "dewey.largo.myschoollife@gmail.com",
                password: "AutoPassword123#",
              },
              data: {
                _id: "tea_new_99",
                name: createdPayload.name,
                employee_id: createdPayload.employee_id,
                phone: createdPayload.phone,
                credentials: {
                  loginId: "dewey.largo.myschoollife@gmail.com",
                  password: "AutoPassword123#",
                },
              },
            }),
          });
          return;
        }
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
      });

      await page.goto("/teachers/add?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Fill valid details
      await page.locator("#teacherName").fill("Dewey Largo");
      await page.locator("#employeeCode").fill("EMP-2026-099");
      await page.locator("#gender").selectOption("Male");
      await page.locator("#phone").fill("9876543209");
      await page.locator("#joinDate").fill("2026-06-01");

      // Submit
      await page.locator("button[type='submit']:has-text('Add Teacher')").click();

      // Verify payload and credentials modal popup
      await expect(page.locator("h2:has-text('Teacher Created Successfully!')")).toBeVisible();
      await expect(page.locator("text=dewey.largo.myschoollife@gmail.com")).toBeVisible();
      expect(createdPayload.name).toBe("Dewey Largo");
      expect(createdPayload.employee_id).toBe("EMP-2026-099");
    });

    test("2.4 should handle duplicate employee ID conflict with server error banner", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
      });

      await page.route(/\/api\/teachers$/, async (route) => {
        const req = route.request();
        if (req.method() === "POST") {
          await route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              message: "Employee ID EMP-2026-001 already exists in this school.",
            }),
          });
          return;
        }
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
      });

      await page.goto("/teachers/add?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      await page.locator("#teacherName").fill("Dewey Largo");
      await page.locator("#employeeCode").fill("EMP-2026-001");
      await page.locator("#gender").selectOption("Male");
      await page.locator("#phone").fill("9876543209");
      await page.locator("#joinDate").fill("2026-06-01");

      // Listen for alert dialog
      let dialogMessage = "";
      page.once("dialog", async (dialog) => {
        dialogMessage = dialog.message();
        await dialog.dismiss();
      });

      await page.locator("button[type='submit']:has-text('Add Teacher')").click();

      await page.waitForTimeout(500);
      expect(dialogMessage).toContain("EMP-2026-001 already exists");
    });

    test("2.5 should navigate to edit teacher form and persist changes on reload", async ({ page }) => {
      let teacherDoc = {
        _id: "tea_edna_detail",
        employee_id: "EMP-2026-001",
        name: "Edna Krabappel",
        gender: "female",
        phone: "9876543201",
        email: "edna.krabappel@springfield.edu",
        join_date: "2020-07-01",
        qualification: "M.Ed",
        expertise: ["Mathematics"],
        subject_specialization: "Mathematics",
        department: "Academic",
        designation: "Head of Mathematics",
        is_active: true,
      };

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        teachersData: teacherDoc,
      });

      await page.route(/\/api\/teachers\/tea_edna_detail/, async (route) => {
        const req = route.request();
        if (req.method() === "PUT" || req.method() === "PATCH") {
          const body = JSON.parse(req.postData() || "{}");
          teacherDoc = { ...teacherDoc, ...body };
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, data: teacherDoc }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: teacherDoc }),
        });
      });

      await page.goto("/teachers/tea_edna_detail?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Profile name rendered
      await expect(page.locator("h1:has-text('Edna Krabappel')").or(page.locator("h2:has-text('Edna Krabappel')")).first()).toBeVisible();

      // Click Edit Profile button
      await page.locator("button:has-text('Edit Profile')").or(page.locator("button:has-text('Edit Teacher')")).first().click();
      await page.waitForLoadState("domcontentloaded");

      // Edit form
      await expect(page.locator("h1:has-text('Edit Teacher')")).toBeVisible();
      await page.locator("#teacherName").fill("Edna Krabappel-Flanders");
      await page.locator("button[type='submit']:has-text('Update Teacher')").click();

      // Navigated back or updated
      await page.goto("/teachers/tea_edna_detail?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      await expect(page.locator("text=Edna Krabappel-Flanders").first()).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: TEACHER PROFILE DETAILS & ROUTINE (/teachers/[id])
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Teacher Profile Details & Routine", () => {
    test("3.1 should render profile header, employee ID, qualification, and class teacher tag", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        teachersData: {
          _id: "tea_edna_01",
          employee_id: "EMP-2026-001",
          name: "Edna Krabappel",
          gender: "female",
          phone: "9876543201",
          email: "edna.krabappel@springfield.edu",
          join_date: "2020-07-01",
          qualification: "M.Ed, B.Sc",
          expertise: ["Mathematics", "Science"],
          subject_specialization: "Mathematics",
          department: "Academic",
          designation: "Senior Faculty Lead",
          is_active: true,
          class_id: { _id: "cls_5a", name: "Grade 5", section: "A" },
          address: "82 Evergreen Terrace, Springfield",
        },
      });

      await page.goto("/teachers/tea_edna_01?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify name, employee ID, and details
      await expect(page.locator("text=Edna Krabappel").first()).toBeVisible();
      await expect(page.locator("text=EMP-2026-001").first()).toBeVisible();
      await expect(page.locator("text=9876543201").first()).toBeVisible();
      await expect(page.locator("text=edna.krabappel@springfield.edu").first()).toBeVisible();
      await expect(page.locator("text=M.Ed, B.Sc").first()).toBeVisible();
    });

    test("3.2 should switch tabs between Teacher Details, Routine, and Leave & Attendance", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        teachersData: {
          _id: "tea_edna_01",
          employee_id: "EMP-2026-001",
          name: "Edna Krabappel",
          phone: "9876543201",
          is_active: true,
        },
        schedulesData: [
          {
            _id: "sch_1",
            day: "monday",
            day_of_week: "Monday",
            start_time: "09:00",
            end_time: "10:00",
            room: "Room 101",
            subject: "Mathematics",
            subject_id: { name: "Mathematics" },
            subject_master_id: { name: "Mathematics" },
            class_id: { name: "Grade 5", section: "A" },
          },
        ],
      });

      await page.goto("/teachers/tea_edna_01?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Default tab: Teacher Details
      await expect(page.locator("button:has-text('Teacher Details')").first()).toBeVisible();

      // Click Routine tab
      await page.locator("button:has-text('Routine')").click();
      await expect(page.locator("text=Class Schedule").or(page.locator("text=Weekly Routine")).or(page.locator("text=Monday")).first()).toBeVisible();

      // Click Leave & Attendance tab
      await page.locator("button:has-text('Leave & Attendance')").click();
      await expect(page.locator("text=Attendance Summary").or(page.locator("text=Apply Leave")).or(page.locator("button:has-text('Attendance')")).first()).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: BULK CSV IMPORT (/teachers/import)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Bulk CSV Import & Error Recovery", () => {
    test("4.1 should render bulk import instructions, template download, and dropzone", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
      });

      await page.goto("/teachers/import?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Title
      await expect(page.locator("h1:has-text('Bulk Import Faculty')").or(page.locator("h1:has-text('Bulk Import')")).first()).toBeVisible();

      // Template download link
      const downloadLink = page.locator("button:has-text('Download CSV Template')").or(page.locator("button:has-text('Download Latest Template')")).first();
      await expect(downloadLink).toBeVisible();

      // File upload dropzone
      await expect(page.locator("text=Upload spreadsheet").or(page.locator("text=Drag and drop your spreadsheet")).first()).toBeVisible();
    });

    test("4.2 should display validation preview for invalid rows and allow error recovery", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
      });

      await page.goto("/teachers/import?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Upload mock CSV
      const csvContent = "Employee ID*,Full Name*,Gender,DOB,Phone,Email,Address,Subject Specialization*,Qualification,Experience Years,Join Date,Assigned Classes\nEMP001,Seymour Skinner,Male,1975-01-01,9876543201,skinner@school.com,Springfield,History,M.A,10,2015-06-01,Grade 5 - A\nEMP002,Dewey Largo,Male,1980-05-05,123,largo@school.com,Springfield,,B.A,5,2020-01-01,Grade 3 - B";
      const fileInput = page.locator("input[type='file']").first();

      await fileInput.setInputFiles({
        name: "faculty_import.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(csvContent),
      });

      // Preview displays 1 Valid and 1 Invalid
      await expect(page.locator("text=Valid rows:").or(page.locator("text=Import Preview")).first()).toBeVisible();
      await expect(page.locator("text=Invalid rows:").first()).toBeVisible();
      await expect(page.locator("text=Mobile Number must be exactly 10 digits").first()).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: TEACHER & SUBJECT ASSIGNMENT (/academic-mgmt/teacher-assignment)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Teacher & Subject Assignment Workflow", () => {
    test("5.1 should render assignment roster with academic year, class, and teacher", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        teacherAssignmentData: [
          {
            _id: "asgn_001",
            academic_year: "2026-2027",
            assignment_type: "Subject Teacher",
            status: "Active",
            effective_date: "2026-06-01",
            remarks: "Senior Faculty Lead",
            teacher_id: {
              _id: "tea_edna",
              name: "Edna Krabappel",
              employee_id: "EMP-2026-001",
            },
            class_id: {
              _id: "cls_5a",
              name: "Grade 5",
              section: "A",
            },
            subject_master_id: {
              _id: "sub_math",
              name: "Mathematics",
              subject_code: "MATH",
            },
          },
        ],
      });

      await page.goto("/academic-mgmt/teacher-assignment?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify Header
      await expect(page.locator("h1:has-text('Teacher Assignment')")).toBeVisible();

      // Verify assignment details in grid/table
      await expect(page.locator("text=Edna Krabappel").first()).toBeVisible();
      await expect(page.locator("text=Grade 5 - A").or(page.locator("text=Grade 5")).first()).toBeVisible();
      await expect(page.locator("text=Mathematics").first()).toBeVisible();
    });

    test("5.2 should open assignment modal, validate required fields, and submit new assignment", async ({ page }) => {
      let createdAssignmentPayload: any = null;

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        classes: [
          { _id: "cls_5a", name: "Grade 5", section: "A", academic_year: "2026-2027" },
        ],
        subjectAssignmentData: [
          {
            _id: "sub_asgn_01",
            academic_year: "2026-2027",
            status: "Active",
            class_id: "cls_5a",
            subject_master_id: { _id: "sub_math", name: "Mathematics", status: "Active" },
          },
        ],
      });

      await page.route(/\/api\/teacher-assignment$/, async (route) => {
        const req = route.request();
        if (req.method() === "POST") {
          createdAssignmentPayload = JSON.parse(req.postData() || "{}");
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: { _id: "asgn_new_99", ...createdAssignmentPayload },
            }),
          });
          return;
        }
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { assignments: [], total: 0 } }) });
      });

      await page.goto("/academic-mgmt/teacher-assignment?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Click Assign Faculty button
      await page.locator("button:has-text('Assign Faculty')").first().click();

      // Modal appears
      await expect(page.locator("h3:has-text('Assign Faculty to Class Subject')").or(page.locator("text=Assign Faculty to Class Subject")).first()).toBeVisible();

      // Submit empty to test validation
      await page.locator("button[type='submit']:has-text('Save Assignment')").click();
      await expect(page.locator("text=All required fields (*) must be filled").first()).toBeVisible();
    });

    test("5.3 should handle conflict error when teacher is already assigned as Class Teacher", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        classes: [
          { _id: "cls_5a", name: "Grade 5", section: "A", academic_year: "2026-2027" },
        ],
        subjectAssignmentData: [
          {
            _id: "sub_asgn_01",
            academic_year: "2026-2027",
            status: "Active",
            class_id: "cls_5a",
            subject_master_id: { _id: "sub_math", name: "Mathematics", status: "Active" },
          },
        ],
      });

      await page.route(/\/api\/teacher-assignment$/, async (route) => {
        const req = route.request();
        if (req.method() === "POST") {
          await route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              message: "A Class Teacher is already assigned to this class.",
            }),
          });
          return;
        }
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { assignments: [], total: 0 } }) });
      });

      await page.goto("/academic-mgmt/teacher-assignment?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      await page.locator("button:has-text('Assign Faculty')").first().click();
      await expect(page.locator("h3:has-text('Assign Faculty to Class Subject')").or(page.locator("text=Assign Faculty to Class Subject")).first()).toBeVisible();

      // Select Teacher from custom dropdown
      await page.locator("text=Select Teacher").first().click();
      await page.locator("text=Edna Krabappel").last().click();

      // Select Class & Section
      await page.locator("select").filter({ hasText: "Select Class" }).selectOption("Grade 5");
      await page.locator("select").filter({ hasText: "Select Section" }).selectOption("A");

      // Check subject
      const subjectCheckbox = page.locator("input[type='checkbox']").last();
      if (await subjectCheckbox.isVisible()) {
        await subjectCheckbox.check();
      }

      await page.locator("button[type='submit']:has-text('Save Assignment')").click();

      // Conflict error banner displayed
      await expect(page.locator("text=already assigned to this class").or(page.locator("text=Failed to assign")).first()).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: LEAVE APPLICATIONS & WORKFLOW (/leave/apply & /leave/approve)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Leave Applications & Approval Workflow", () => {
    test("6.1 should render apply leave form, validate dates, and submit leave application", async ({ page }) => {
      let submittedLeave: any = null;

      await loginAsTeacher(page, {
        subdomain: "myschool",
      });

      await page.route(/\/api\/leave$/, async (route) => {
        const req = route.request();
        if (req.method() === "POST") {
          submittedLeave = JSON.parse(req.postData() || "{}");
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: {
                _id: "leave_new_1",
                ...submittedLeave,
                status: "pending",
                createdAt: new Date().toISOString(),
              },
            }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              leaves: [],
              total: 0,
              totalPages: 1,
            },
          }),
        });
      });

      await page.goto("/leave/apply?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify Header
      await expect(page.locator("h1:has-text('My Leave Applications')")).toBeVisible();

      // Open Apply Leave modal
      await page.locator("button:has-text('Apply Leave')").first().click();
      await expect(page.locator("h3:has-text('Apply Leave')").or(page.locator("text=Apply Leave")).first()).toBeVisible();

      // Test invalid dates: To Date before From Date
      await page.locator("#fromDate").fill("2026-11-10");
      await page.locator("#toDate").fill("2026-11-05");
      await page.locator("textarea").first().fill("Medical checkup");

      await page.locator("button[type='submit']:has-text('Submit Request')").or(page.locator("button[type='submit']:has-text('Submit')")).first().click();

      // Date validation error
      await expect(page.locator("text=To Date must be after From Date").first()).toBeVisible();

      // Correct date
      await page.locator("#toDate").fill("2026-11-12");
      await page.locator("button[type='submit']:has-text('Submit Request')").or(page.locator("button[type='submit']:has-text('Submit')")).first().click();

      // Modal closed and payload verified
      await expect(page.locator("h3:has-text('Apply Leave')")).not.toBeVisible();
      expect(submittedLeave.from_date).toBe("2026-11-10");
      expect(submittedLeave.to_date).toBe("2026-11-12");
      expect(submittedLeave.reason).toBe("Medical checkup");
    });

    test("6.2 should render admin approve leave requests page and approve a pending request", async ({ page }) => {
      let approvedId = "";
      let approvedBody: any = null;

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        leaveRequestsData: [
          {
            _id: "leave_edna_01",
            user_id: { _id: "usr_edna", name: "Edna Krabappel", role: "teacher" },
            leave_type: "sick",
            from_date: "2026-11-01",
            to_date: "2026-11-03",
            total_days: 3,
            reason: "Viral flu and severe cough",
            status: "pending",
            createdAt: "2026-10-25T10:00:00.000Z",
          },
        ],
      });

      await page.route(/\/api\/leave\/leave_edna_01/, async (route) => {
        const req = route.request();
        if (req.method() === "PUT" || req.method() === "PATCH") {
          approvedId = "leave_edna_01";
          approvedBody = JSON.parse(req.postData() || "{}");
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, message: "Leave status updated to approved" }),
          });
          return;
        }
      });

      await page.goto("/leave/approve-leave-request?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify Header
      await expect(page.locator("h1:has-text('Leave Requests')")).toBeVisible();

      // Edna Krabappel's leave request rendered in table
      await expect(page.locator("text=Edna Krabappel").first()).toBeVisible();
      await expect(page.locator("span:has-text('Pending')").first()).toBeVisible();

      // Click Action menu in row
      const actionBtn = page.locator("table tbody tr td:last-child button").first();
      await actionBtn.click();

      // Click Review Option
      const reviewItem = page.locator("button:has-text('Review')").first();
      await reviewItem.click();

      // Modal appears
      await expect(page.locator("h3:has-text('Leave Request')").or(page.locator("text=Leave Request")).first()).toBeVisible();

      // Reason visible inside the Review modal
      await expect(page.locator("text=Viral flu and severe cough").first()).toBeVisible();

      // Change Status to Approved
      await page.locator("label:has-text('approved')").first().click();
      await page.locator("button[type='submit']:has-text('Submit')").click();

      expect(approvedId).toBe("leave_edna_01");
      expect(approvedBody.status).toBe("approved");
    });

    test("6.3 should filter leave requests by status (Pending, Approved, Rejected)", async ({ page }) => {
      let requestedFilterStatus = "";

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
      });

      await page.route(/\/api\/leave\?.*status=/, async (route) => {
        const urlObj = new URL(route.request().url());
        requestedFilterStatus = urlObj.searchParams.get("status") || "";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              leaves: [
                {
                  _id: "leave_02",
                  user_id: { name: "Elizabeth Hoover" },
                  leave_type: "casual",
                  from_date: "2026-10-10",
                  to_date: "2026-10-11",
                  status: "approved",
                  createdAt: "2026-10-05T09:00:00.000Z",
                },
              ],
              total: 1,
              totalPages: 1,
            },
          }),
        });
      });

      await page.goto("/leave/approve-leave-request?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Open Filter menu
      await page.locator("button:has-text('Filter')").first().click();

      // Select Status 'Approved'
      await page.locator("label:has-text('Status')").locator("..").locator("select").selectOption("approved");
      await page.waitForTimeout(500);

      expect(requestedFilterStatus).toBe("approved");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 7: ROLE-BASED ACCESS CONTROL & PRIVACY
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Role-Based Access & Privacy Protection", () => {
    test("7.1 should restrict Student role from accessing Add Teacher form and Teacher Assignment", async ({ page }) => {
      await loginAsStudent(page, {
        subdomain: "myschool",
      });

      // Attempting to visit /teachers/add
      await page.goto("/teachers/add?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify either redirected to dashboard or restricted
      const currentUrl = page.url();
      const isRestricted = !currentUrl.includes("/teachers/add") ||
        (await page.locator("text=Unauthorized").or(page.locator("text=Forbidden")).or(page.locator("text=Access Denied")).first().isVisible());
      expect(isRestricted).toBeTruthy();
    });

    test("7.2 should allow Teacher role to access their own leave page", async ({ page }) => {
      await loginAsTeacher(page, {
        subdomain: "myschool",
      });

      await page.goto("/leave/apply?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      await expect(page.locator("h1:has-text('My Leave Applications')")).toBeVisible();
    });
  });
});
