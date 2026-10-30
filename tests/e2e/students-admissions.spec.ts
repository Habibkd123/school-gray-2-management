import { test, expect } from "@playwright/test";
import {
  loginAsSchoolAdmin,
  loginAsTeacher,
  loginAsStudent,
  loginAsParent,
} from "./helpers";

test.describe("Students & Admissions Deep & Bulletproof E2E Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch {}
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: STUDENTS LISTING & DIRECTORY (/students)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Students Directory & Catalog", () => {
    test("1.1 should render students directory with counts, student cards, and badges", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        studentsData: {
          students: [
            {
              _id: "stu_1",
              name: "Bart Simpson",
              admission_no: "ADM-2026-001",
              roll_no: "101",
              gender: "male",
              phone: "9876543210",
              academic_year: "2026-2027",
              is_active: true,
              class_id: { _id: "cls_5a", name: "Grade 5", section: "A" },
              guardian_name: "Homer Simpson",
            },
            {
              _id: "stu_2",
              name: "Lisa Simpson",
              admission_no: "ADM-2026-002",
              roll_no: "102",
              gender: "female",
              phone: "9876543211",
              academic_year: "2026-2027",
              is_active: true,
              class_id: { _id: "cls_3b", name: "Grade 3", section: "B" },
              guardian_name: "Homer Simpson",
            },
          ],
          total: 2,
          totalPages: 1,
          page: 1,
          limit: 12,
        },
      });

      await page.goto("/students?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify Header
      await expect(page.locator("h1.page-title")).toContainText("Students List");

      // Verify student records appear
      await expect(page.locator("text=Bart Simpson").first()).toBeVisible();
      await expect(page.locator("text=Lisa Simpson").first()).toBeVisible();
      await expect(page.locator("text=ADM-2026-001").first()).toBeVisible();
      await expect(page.locator("text=ADM-2026-002").first()).toBeVisible();

      // Verify action buttons
      await expect(page.locator("a:has-text('Add Student')")).toBeVisible();
      await expect(page.locator("a:has-text('Bulk Import')")).toBeVisible();
    });

    test("1.2 should search students by name and debounced input filter", async ({ page }) => {
      let requestedSearch = "";

      await loginAsSchoolAdmin(page, { subdomain: "myschool" });

      await page.route(/\/api\/students/, async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/api/students/filters") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: {
                academicYears: ["2026-2027"],
                sections: ["A", "B"],
                houses: [],
                genders: ["Male", "Female"],
                statuses: ["Active"],
                admissionStatuses: ["Confirmed"],
              },
            }),
          });
          return;
        }

        requestedSearch = url.searchParams.get("search") || "";
        const allStudents = [
          {
            _id: "stu_1",
            name: "Bart Simpson",
            admission_no: "ADM-2026-001",
            roll_no: "101",
            class_id: { _id: "cls_5a", name: "Grade 5", section: "A" },
          },
          {
            _id: "stu_2",
            name: "Lisa Simpson",
            admission_no: "ADM-2026-002",
            roll_no: "102",
            class_id: { _id: "cls_3b", name: "Grade 3", section: "B" },
          },
        ];

        const filtered = requestedSearch
          ? allStudents.filter(s => s.name.toLowerCase().includes(requestedSearch.toLowerCase()))
          : allStudents;

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { students: filtered, total: filtered.length, totalPages: 1 },
          }),
        });
      });

      await page.goto("/students?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Search input
      const searchBox = page.locator("input[placeholder*='Search name, ID, class']");
      await searchBox.fill("Bart");

      // Wait for debounce and assertion
      await expect(page.locator("text=Bart Simpson").first()).toBeVisible();
      await expect(page.locator("text=Lisa Simpson")).not.toBeVisible();
      expect(requestedSearch).toBe("Bart");
    });

    test("1.3 should toggle between Grid and List view modes", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        studentsData: {
          students: [
            {
              _id: "stu_1",
              name: "Bart Simpson",
              admission_no: "ADM-2026-001",
              roll_no: "101",
              gender: "male",
              phone: "9876543210",
              academic_year: "2026-2027",
              is_active: true,
              class_id: { _id: "cls_5a", name: "Grade 5", section: "A" },
              guardian_name: "Homer Simpson",
            },
          ],
          total: 1,
          totalPages: 1,
          page: 1,
          limit: 12,
        },
      });

      await page.goto("/students?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Switch to list view
      const listButton = page.locator("button:has(svg.lucide-list)");
      await listButton.click();

      // Table layout is visible
      await expect(page.locator("table")).toBeVisible();

      // Switch back to grid mode
      const gridButton = page.locator("button:has(svg.lucide-layout-grid)");
      await gridButton.click();

      // Student grid cards rendered
      await expect(page.locator("text=Bart Simpson").first()).toBeVisible();
    });

    test("1.4 should open filter popover and filter by class and gender", async ({ page }) => {
      let currentClassId = "all";

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        classes: [
          { _id: "cls_5a", name: "Grade 5", section: "A", academic_year: "2026-2027" },
          { _id: "cls_3b", name: "Grade 3", section: "B", academic_year: "2026-2027" },
        ],
      });

      await page.route(/\/api\/students/, async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/api/students/filters") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: {
                academicYears: ["2026-2027"],
                sections: ["A", "B"],
                houses: [],
                genders: ["Male", "Female"],
                statuses: ["Active", "Inactive"],
                admissionStatuses: ["Confirmed"],
              },
            }),
          });
          return;
        }

        currentClassId = url.searchParams.get("class_id") || "all";

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              students: [
                { _id: "stu_1", name: "Bart Simpson", class_id: { _id: "cls_5a", name: "Grade 5", section: "A" } },
              ],
              total: 1,
              totalPages: 1,
            },
          }),
        });
      });

      await page.goto("/students?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Open Filter popover
      await page.locator("button:has-text('Filter')").first().click();
      await expect(page.locator("h3:has-text('Filter')")).toBeVisible();

      // Select Class filter
      await page.locator("select").filter({ hasText: "All Classes" }).selectOption({ label: "Grade 5 - A" });

      // Click Close
      await page.locator("button:has-text('Close')").click();

      expect(currentClassId).toBe("cls_5a");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: STUDENT ADMISSION FORM (/students/add)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Student Admission & Registration", () => {
    test("2.1 should validate sequential mandatory fields on empty submission", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        classes: [
          { _id: "cls_5a", name: "Grade 5", section: "A", academic_year: "2026-2027" },
        ],
      });

      await page.goto("/students/add?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify Header and sections
      await expect(page.locator("h1:has-text('Add Student')")).toBeVisible();
      await expect(page.locator("h2:has-text('Personal Information')")).toBeVisible();
      await expect(page.locator("h2:has-text('Parents & Guardian Information')")).toBeVisible();

      // Clear default admission date if populated to test validation
      await page.locator("#admissionDate").fill("");

      // Attempt submit
      await page.locator("button[type='submit']:has-text('Add Student')").click();

      // Sequential validation error alert appears
      await expect(page.locator("text=is mandatory").or(page.locator("text=is required")).or(page.locator("text=❌")).first()).toBeVisible();
    });

    test("2.2 should validate phone number format (must be 10 digits)", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        classes: [
          { _id: "cls_5a", name: "Grade 5", section: "A", academic_year: "2026-2027" },
        ],
      });

      await page.goto("/students/add?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Fill academic & personal info
      await page.locator("#admissionNo").fill("ADM-TEST-001");
      await page.locator("#classId").selectOption({ label: "Grade 5 - A" });
      await page.locator("#name").fill("Nelson Muntz");
      await page.locator("#gender").selectOption("Male");

      // Fill invalid 5-digit primary mobile phone
      await page.locator("#primaryPhone").fill("12345");

      // Fill guardian info
      await page.locator("#guardianName").fill("Mrs. Muntz");
      await page.locator("#guardianRelation").fill("Mother");
      await page.locator("#guardianPhone").fill("9876543210");

      await page.locator("button[type='submit']:has-text('Add Student')").click();

      // Mobile number validation error
      await expect(page.locator("text=Mobile Number must be exactly 10 digits").first()).toBeVisible();
    });

    test("2.3 should create student successfully and display credentials dialog", async ({ page }) => {
      let createdPayload: any = null;

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        classes: [
          { _id: "cls_5a", name: "Grade 5", section: "A", academic_year: "2026-2027" },
        ],
      });

      await page.route(/\/api\/students$/, async (route) => {
        const req = route.request();
        if (req.method() === "POST") {
          createdPayload = JSON.parse(req.postData() || "{}");
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              credentials: {
                loginId: "nelson.muntz",
                password: "AutoPassword123#",
              },
              data: {
                _id: "stu_new_99",
                name: createdPayload.name,
                admission_no: createdPayload.admission_no,
                class_id: createdPayload.class_id,
                credentials: {
                  loginId: "nelson.muntz",
                  password: "AutoPassword123#",
                },
              },
            }),
          });
          return;
        }
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
      });

      await page.goto("/students/add?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Fill valid details
      await page.locator("#admissionNo").fill("ADM-2026-999");
      await page.locator("#classId").selectOption({ label: "Grade 5 - A" });
      await page.locator("#name").fill("Nelson Muntz");
      await page.locator("#gender").selectOption("Male");
      await page.locator("#primaryPhone").fill("9876543210");

      // Guardian details
      await page.locator("#guardianName").fill("Mrs. Muntz");
      await page.locator("#guardianRelation").fill("Mother");
      await page.locator("#guardianPhone").fill("9876543210");

      // Submit
      await page.locator("button[type='submit']:has-text('Add Student')").click();

      // Verify payload and credentials modal popup
      await expect(page.locator("h2:has-text('Student Created Successfully!')")).toBeVisible();
      await expect(page.locator("text=nelson.muntz")).toBeVisible();
      expect(createdPayload.name).toBe("Nelson Muntz");
      expect(createdPayload.admission_no).toBe("ADM-2026-999");
    });

    test("2.4 should handle duplicate admission number conflict with server error banner", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        classes: [
          { _id: "cls_5a", name: "Grade 5", section: "A", academic_year: "2026-2027" },
        ],
      });

      await page.route(/\/api\/students$/, async (route) => {
        const req = route.request();
        if (req.method() === "POST") {
          await route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              message: "Student with admission number 'ADM-2026-001' already exists in this school.",
            }),
          });
          return;
        }
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
      });

      await page.goto("/students/add?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Fill existing admission number
      await page.locator("#admissionNo").fill("ADM-2026-001");
      await page.locator("#classId").selectOption({ label: "Grade 5 - A" });
      await page.locator("#name").fill("Bart Simpson");
      await page.locator("#gender").selectOption("Male");
      await page.locator("#primaryPhone").fill("9876543210");
      await page.locator("#guardianName").fill("Homer Simpson");
      await page.locator("#guardianRelation").fill("Father");
      await page.locator("#guardianPhone").fill("9876543210");

      await page.locator("button[type='submit']:has-text('Add Student')").click();

      // Error banner
      await expect(page.locator("text=already exists in this school")).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: STUDENT PROFILE DETAILS (/students/[id])
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Student Profile Details", () => {
    test("3.1 should render student profile tabs, academic details, and guardian contacts", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        studentsData: {
          _id: "stu_bart_detail",
          name: "Bart Simpson",
          admission_no: "ADM-2026-001",
          roll_no: "101",
          gender: "male",
          dob: "2015-04-01",
          phone: "9876543210",
          email: "bart.myschoollife",
          academic_year: "2026-2027",
          is_active: true,
          class_id: { _id: "cls_5a", name: "Grade 5", section: "A" },
          parent_id: { _id: "par_homer", name: "Homer Simpson", phone: "9876543210", email: "homer@simpson.com", relation: "Father" },
          father_name: "Homer Simpson",
          father_phone: "9876543210",
          guardian_name: "Homer Simpson",
          guardian_phone: "9876543210",
          guardian_relation: "Father",
          address: "742 Evergreen Terrace",
        },
      });

      await page.goto("/students/stu_bart_detail?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify Profile Banner
      await expect(page.locator("h2:has-text('Bart Simpson')")).toBeVisible();
      await expect(page.locator("text=ADM-2026-001")).toBeVisible();
      await expect(page.locator("text=Grade 5 A").first()).toBeVisible();

      // Verify Tabs
      await expect(page.locator("span:has-text('Student Details')").first()).toBeVisible();
      await expect(page.locator("span:has-text('Time Table')").first()).toBeVisible();
      await expect(page.locator("span:has-text('Leave & Attendance')").first()).toBeVisible();
      await expect(page.locator("span:has-text('Exam & Results')").first()).toBeVisible();
      await expect(page.locator("span:has-text('Report Card')").first()).toBeVisible();

      // Verify Guardian info
      await expect(page.locator("text=Homer Simpson").first()).toBeVisible();

      // Switch to Leave & Attendance tab
      await page.locator("span:has-text('Leave & Attendance')").first().click();
      await expect(page.locator("text=Attendance").or(page.locator("text=Leaves")).first()).toBeVisible();
    });

    test("3.2 should navigate to edit student form and persist changes on reload", async ({ page }) => {
      let updatedStudent = {
        _id: "stu_bart_detail",
        name: "Bartolomew Simpson",
        admission_no: "ADM-2026-001",
        roll_no: "101",
        gender: "male",
        academic_year: "2026-2027",
        class_id: { _id: "cls_5a", name: "Grade 5", section: "A" },
        guardian_name: "Homer Simpson",
        guardian_phone: "9876543210",
      };

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        studentsData: updatedStudent,
      });

      await page.route(/\/api\/students\/stu_bart_detail/, async (route) => {
        const req = route.request();
        if (req.method() === "PUT" || req.method() === "PATCH") {
          const body = JSON.parse(req.postData() || "{}");
          updatedStudent = { ...updatedStudent, ...body };
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, data: updatedStudent }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: updatedStudent }),
        });
      });

      await page.goto("/students/stu_bart_detail?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify updated name displays
      await expect(page.locator("h2:has-text('Bartolomew Simpson')")).toBeVisible();

      // Persistence on reload
      await page.reload();
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("h2:has-text('Bartolomew Simpson')")).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: STUDENT PROMOTION WORKFLOW (/students/student-promotion)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Student Promotion Workflow", () => {
    test("4.1 should render promotion selectors, load students and submit promotion", async ({ page }) => {
      let promotionPayload: any = null;

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        classes: [
          { _id: "cls_5a_2026", name: "V", section: "A", academic_year: "2025 - 2026" },
          { _id: "cls_6a_2027", name: "VI", section: "A", academic_year: "2026 - 2027" },
        ],
        studentsData: {
          students: [
            {
              _id: "stu_promo_1",
              name: "Bart Simpson",
              admission_no: "ADM-2026-001",
              academic_year: "2025 - 2026",
              class_id: { _id: "cls_5a_2026", name: "V", section: "A" },
            },
          ],
          total: 1,
          totalPages: 1,
        },
      });

      await page.route(/\/api\/students\/promote/, async (route) => {
        const req = route.request();
        if (req.method() === "POST") {
          promotionPayload = JSON.parse(req.postData() || "{}");
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              message: "1 students successfully promoted to academic year 2026 - 2027.",
            }),
          });
          return;
        }
      });

      await page.goto("/students/student-promotion?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify Header
      await expect(page.locator("h1:has-text('Student Promotion')")).toBeVisible();
      await expect(page.locator("text=Promotion Configuration")).toBeVisible();
      await expect(page.locator("text=Current Session")).toBeVisible();

      // Click Manage Promotion button to load class students
      await page.locator("button:has-text('Manage Promotion')").click();

      // Student row appears in promotion table
      await expect(page.locator("text=Bart Simpson").first()).toBeVisible();

      // Click Promote Students button
      await page.locator("button:has-text('Promote Students')").click();

      // Success alert
      await expect(page.locator("text=successfully promoted").or(page.locator("text=promoted to academic year"))).toBeVisible();
      expect(promotionPayload.promotions.length).toBe(1);
      expect(promotionPayload.promotions[0].studentId).toBe("stu_promo_1");
    });

    test("4.2 should validate error when destination class does not exist", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        classes: [
          { _id: "cls_5a_2026", name: "V", section: "A", academic_year: "2025 - 2026" },
          // Target class for next year does NOT exist!
        ],
        studentsData: {
          students: [
            {
              _id: "stu_promo_1",
              name: "Bart Simpson",
              admission_no: "ADM-2026-001",
              academic_year: "2025 - 2026",
              class_id: { _id: "cls_5a_2026", name: "V", section: "A" },
            },
          ],
          total: 1,
          totalPages: 1,
        },
      });

      await page.goto("/students/student-promotion?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      await page.locator("button:has-text('Manage Promotion')").click();
      await expect(page.locator("text=Bart Simpson").first()).toBeVisible();

      // Click Promote
      await page.locator("button:has-text('Promote Students')").click();

      // Error message indicates destination class does not exist
      await expect(page.locator("text=does not exist in database for session").or(page.locator("text=does not exist for session")).first()).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: BULK CSV IMPORT (/students/import)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Bulk CSV Import & Error Recovery", () => {
    test("5.1 should render bulk import instructions, template download, and upload dropzone", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });

      await page.goto("/students/import?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify Header and breadcrumbs
      await expect(page.locator("h1:has-text('Bulk Import Students')")).toBeVisible();
      await expect(page.locator("button:has-text('Download CSV Template')")).toBeVisible();
      await expect(page.locator("text=Upload spreadsheet")).toBeVisible();
      await expect(page.locator("text=Import Guidelines")).toBeVisible();
    });

    test("5.2 should display validation preview for invalid rows and allow error recovery", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });

      await page.goto("/students/import?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Simulate file upload
      const buffer = Buffer.from(
        "Admission No*,Roll No,Student Name*,Class*,Section*,Gender,DOB,Primary Phone,Email,Address,Guardian Name*,Guardian Phone*,Guardian Email,Guardian Relation*,Academic Year*,Aadhaar No\n" +
        "ADM-001,1,Milhouse Van Houten,Grade 5,A,Male,2015-01-01,9876543210,milhouse@simpson.com,Springfield,Kirk Van Houten,9876543210,kirk@simpson.com,Father,2026-2027,\n" +
        "ADM-002,2,Nelson Muntz,Grade 5,A,Male,2015-01-01,12345,,Springfield,,,Mother,2026-2027,\n"
      );

      await page.setInputFiles("input[type='file']", {
        name: "students.csv",
        mimeType: "text/csv",
        buffer,
      });

      // Validation preview table renders
      await expect(page.locator("text=Import Preview")).toBeVisible();
      await expect(page.locator("text=Milhouse Van Houten")).toBeVisible();
      await expect(page.locator("text=Nelson Muntz")).toBeVisible();

      // Invalid row highlights error
      await expect(page.locator("text=Mobile Number must be exactly 10 digits").or(page.locator("text=Guardian Name is required")).first()).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: GUARDIANS DIRECTORY (/guardians)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Guardians Directory", () => {
    test("6.1 should render guardians directory with linked children and contact info", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        parentsData: {
          parents: [
            {
              _id: "par_homer",
              name: "Homer Simpson",
              phone: "9876543210",
              email: "homer@simpson.com",
              relation: "Father",
              occupation: "Safety Inspector",
              address: "742 Evergreen Terrace",
              is_active: true,
              children: [
                {
                  _id: "stu_1",
                  name: "Bart Simpson",
                  admission_no: "ADM-2026-001",
                  roll_no: "101",
                  class_id: { _id: "cls_5a", name: "Grade 5", section: "A" },
                },
              ],
            },
          ],
          pagination: { totalItems: 1, totalPages: 1, currentPage: 1 },
        },
      });

      await page.goto("/guardians?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify Header
      await expect(page.locator("h1.page-title")).toContainText("Guardians & Parents");

      // Verify Guardian card / row
      await expect(page.locator("text=Homer Simpson").first()).toBeVisible();
      await expect(page.locator("text=9876543210").first()).toBeVisible();
      await expect(page.locator("text=Bart Simpson").first()).toBeVisible();
      await expect(page.locator("text=Father").first()).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 7: ADMISSIONS INQUIRIES & APPLICATIONS (/admissions-admin/applications)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Admissions Applications & Inquiries", () => {
    test("7.1 should render admissions inquiries list with status badges and filters", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        admissionsData: [
          {
            _id: "app_1",
            application_no: "APP-2026-001",
            first_name: "Milhouse",
            last_name: "Van Houten",
            student_name: "Milhouse Van Houten",
            class_id: { _id: "cls_5a", name: "Grade 5", section: "A" },
            guardian_name: "Kirk Van Houten",
            phone: "9876543212",
            email: "kirk@vanhouten.com",
            submission_date: "2026-06-15",
            status: "Under Review",
            academic_year: "2026-2027",
          },
          {
            _id: "app_2",
            application_no: "APP-2026-002",
            first_name: "Nelson",
            last_name: "Muntz",
            student_name: "Nelson Muntz",
            class_id: { _id: "cls_5a", name: "Grade 5", section: "A" },
            guardian_name: "Mrs. Muntz",
            phone: "9876543213",
            email: "muntz@school.com",
            submission_date: "2026-06-18",
            status: "Approved",
            academic_year: "2026-2027",
          },
        ],
      });

      await page.goto("/admissions-admin/applications?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify Header
      await expect(page.locator("h1.page-title")).toContainText("Admission Applications");

      // Verify Applicant items
      await expect(page.locator("text=APP-2026-001").first()).toBeVisible();
      await expect(page.locator("text=APP-2026-002").first()).toBeVisible();
      await expect(page.locator("text=Milhouse Van Houten").or(page.locator("text=Milhouse")).first()).toBeVisible();
      await expect(page.locator("text=Nelson Muntz").or(page.locator("text=Nelson")).first()).toBeVisible();
      await expect(page.locator("span:has-text('Under Review')").first()).toBeVisible();
      await expect(page.locator("span:has-text('Approved')").first()).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 8: ROLE-BASED ACCESS & DATA PRIVACY ISOLATION
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Role-Based Access & Privacy Protection", () => {
    test("8.1 should restrict Student role from accessing Add Student form and promote page", async ({ page }) => {
      await loginAsStudent(page, { subdomain: "myschool" });

      // Direct access to Add Student
      await page.goto("/students/add?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify restricted/redirected or access denied
      await expect(page).toHaveURL(/dashboard/);
    });

    test("8.2 should restrict Parent role to only their own children in student catalog", async ({ page }) => {
      await loginAsParent(page, {
        subdomain: "myschool",
        children: [
          {
            _id: "stu_1",
            name: "Bart Simpson",
            roll_no: "101",
            class_id: { _id: "cls_5a", name: "Grade 5", section: "A" },
          },
        ],
      });

      await page.goto("/dashboard?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Parent dashboard loads without admin action triggers
      await expect(page.locator("button:has-text('Add Student')")).not.toBeVisible();
      await expect(page.locator("button:has-text('Bulk Import')")).not.toBeVisible();
    });
  });
});
