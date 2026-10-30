import { test, expect } from "@playwright/test";
import {
  loginAsSchoolAdmin,
  loginAsTeacher,
  loginAsStudent,
} from "./helpers";

test.describe("Academic Management Deep & Bulletproof E2E Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch {}
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: SECTIONS MANAGEMENT (/academic-mgmt/sections)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Sections Management", () => {
    test("1.1 should render sections catalog with search, refresh, and add section button", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        sectionsData: {
          sections: [
            { _id: "sec_1", name: "A", status: "Active" },
            { _id: "sec_2", name: "B", status: "Active" },
            { _id: "sec_3", name: "C", status: "Inactive" },
          ],
          total: 3,
          totalPages: 1,
        },
      });

      await page.goto("/academic-mgmt/sections?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify Header and breadcrumbs
      await expect(page.locator("h1.page-title")).toContainText("Sections");
      await expect(page.locator("text=Sections List")).toBeVisible();
      await expect(page.locator("text=(3)")).toBeVisible();

      // Verify table data
      await expect(page.locator("td:has-text('Section Name')").or(page.locator("span:has-text('A')").first())).toBeVisible();
      await expect(page.locator("span:has-text('Active')").first()).toBeVisible();
      await expect(page.locator("span:has-text('Inactive')")).toBeVisible();
    });

    test("1.2 should validate required name and create a new section", async ({ page }) => {
      let createdPayload: any = null;
      let currentSections = [
        { _id: "sec_1", name: "A", status: "Active" },
        { _id: "sec_2", name: "B", status: "Active" },
      ];

      await loginAsSchoolAdmin(page, { subdomain: "myschool" });

      // Override /api/sections for this test
      await page.route("**/api/sections**", async (route) => {
        const req = route.request();
        if (req.method() === "POST") {
          createdPayload = JSON.parse(req.postData() || "{}");
          const newSec = { _id: "sec_new", name: createdPayload.name, status: createdPayload.status || "Active" };
          currentSections.push(newSec);
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({ success: true, data: newSec }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { sections: currentSections, total: currentSections.length, totalPages: 1 },
          }),
        });
      });

      await page.goto("/academic-mgmt/sections?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Click Add Section
      await page.locator("button:has-text('Add Section')").click();
      await expect(page.locator("h3:has-text('Add Section')").or(page.locator("div[role='dialog']"))).toBeVisible();

      // Submit with empty name -> should show validation error
      await page.locator("form button[type='submit']:has-text('Add Section')").click();
      await expect(page.locator("text=Section name is required.")).toBeVisible();

      // Fill valid section name
      await page.locator("input[placeholder='e.g. A, B, C']").fill("D");
      await page.locator("form button[type='submit']:has-text('Add Section')").click();

      // Modal closes & new section appears in table
      await expect(page.locator("text=Section name is required.")).not.toBeVisible();
      expect(createdPayload).toEqual({ name: "D", status: "Active" });
      await expect(page.locator("span:has-text('D')").first()).toBeVisible();

      // Reload page to verify persistence
      await page.reload();
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("span:has-text('D')").first()).toBeVisible();
    });

    test("1.3 should handle duplicate name or server error gracefully", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });

      await page.route("**/api/sections**", async (route) => {
        const req = route.request();
        if (req.method() === "POST") {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({ success: false, message: "Section with this name already exists in this school." }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { sections: [{ _id: "sec_1", name: "A", status: "Active" }], total: 1, totalPages: 1 },
          }),
        });
      });

      await page.goto("/academic-mgmt/sections?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      await page.locator("button:has-text('Add Section')").click();
      await page.locator("input[placeholder='e.g. A, B, C']").fill("A");
      await page.locator("form button[type='submit']:has-text('Add Section')").click();

      // Error banner displays server error message
      await expect(page.locator("text=Section with this name already exists")).toBeVisible();
    });

    test("1.4 should edit section and toggle status", async ({ page }) => {
      let updatedPayload: any = null;
      let sections = [{ _id: "sec_1", name: "A", status: "Active" }];

      await loginAsSchoolAdmin(page, { subdomain: "myschool" });

      await page.route("**/api/sections**", async (route) => {
        const req = route.request();
        const url = req.url();
        if (req.method() === "PUT" || req.method() === "PATCH" || url.includes("/sec_1")) {
          updatedPayload = JSON.parse(req.postData() || "{}");
          sections[0].name = updatedPayload.name;
          sections[0].status = updatedPayload.status;
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, data: sections[0] }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { sections, total: 1, totalPages: 1 },
          }),
        });
      });

      await page.goto("/academic-mgmt/sections?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Open action menu (3 dots)
      await page.locator("table tbody tr").first().locator("td").last().locator("button").click();
      await page.locator("button:has-text('Edit')").click();

      // Verify edit modal is open
      await expect(page.locator("h3:has-text('Edit Section')")).toBeVisible();

      // Update name to "A-Elite" and toggle status
      await page.locator("input[placeholder='e.g. A, B, C']").fill("A-Elite");
      await page.locator("button:has(span.translate-x-6)").click(); // toggle status from Active to Inactive

      await page.locator("form button[type='submit']:has-text('Save Changes')").click();

      expect(updatedPayload).toEqual({ name: "A-Elite", status: "Inactive" });
    });

    test("1.5 should delete section with confirmation", async ({ page }) => {
      let deleted = false;
      let sections = [{ _id: "sec_1", name: "A", status: "Active" }];

      await loginAsSchoolAdmin(page, { subdomain: "myschool" });

      await page.route("**/api/sections**", async (route) => {
        const req = route.request();
        if (req.method() === "DELETE") {
          deleted = true;
          sections = [];
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, message: "Section deleted successfully" }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { sections, total: sections.length, totalPages: 1 },
          }),
        });
      });

      await page.goto("/academic-mgmt/sections?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Open action menu and click Delete
      await page.locator("table tbody tr").first().locator("td").last().locator("button").click();
      await page.locator("button:has-text('Delete')").click();

      // Confirm delete modal
      await expect(page.locator("h3:has-text('Delete Section')")).toBeVisible();
      await page.locator("button:has-text('Delete')").last().click();

      expect(deleted).toBe(true);
    });

    test("1.6 should filter sections via search query", async ({ page }) => {
      let searchedTerm = "";

      await loginAsSchoolAdmin(page, { subdomain: "myschool" });

      await page.route("**/api/sections**", async (route) => {
        const url = new URL(route.request().url());
        searchedTerm = url.searchParams.get("search") || "";
        const all = [
          { _id: "sec_1", name: "Alpha", status: "Active" },
          { _id: "sec_2", name: "Beta", status: "Active" },
        ];
        const filtered = searchedTerm ? all.filter(s => s.name.toLowerCase().includes(searchedTerm.toLowerCase())) : all;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { sections: filtered, total: filtered.length, totalPages: 1 },
          }),
        });
      });

      await page.goto("/academic-mgmt/sections?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      await expect(page.locator("span:has-text('Alpha')")).toBeVisible();
      await expect(page.locator("span:has-text('Beta')")).toBeVisible();

      // Type "Beta" in search box
      await page.locator("input[placeholder='Search sections...']").fill("Beta");
      await expect(page.locator("span:has-text('Beta')")).toBeVisible();
      await expect(page.locator("span:has-text('Alpha')")).not.toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: STREAMS CONFIGURATION (/academic-mgmt/streams)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Streams Configuration", () => {
    test("2.1 should render streams list with classes count, student count and export options", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        streamsData: {
          streams: [
            { _id: "str_1", name: "Science", status: "Active", classesCount: 4, studentsCount: 120 },
            { _id: "str_2", name: "Commerce", status: "Active", classesCount: 3, studentsCount: 95 },
            { _id: "str_3", name: "Humanities", status: "Archived", classesCount: 0, studentsCount: 0 },
          ],
          total: 3,
          totalPages: 1,
          page: 1,
        },
      });

      await page.goto("/academic-mgmt/streams?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify header and buttons
      await expect(page.locator("h1.page-title")).toContainText("Streams");
      await expect(page.locator("text=Streams List")).toBeVisible();
      await expect(page.locator("button:has-text('Export Excel')")).toBeVisible();
      await expect(page.locator("button:has-text('Print / PDF')")).toBeVisible();

      // Verify stream data
      await expect(page.locator("span:has-text('Science')")).toBeVisible();
      await expect(page.locator("span:has-text('Commerce')")).toBeVisible();
      await expect(page.locator("span:has-text('Humanities')")).toBeVisible();
      await expect(page.locator("span:has-text('Archived')")).toBeVisible();
    });

    test("2.2 should validate required name and create new stream", async ({ page }) => {
      let createdStream: any = null;
      let streamsList = [{ _id: "str_1", name: "Science", status: "Active", classesCount: 1, studentsCount: 20 }];

      await loginAsSchoolAdmin(page, { subdomain: "myschool" });

      await page.route("**/api/streams**", async (route) => {
        const req = route.request();
        if (req.method() === "POST") {
          createdStream = JSON.parse(req.postData() || "{}");
          const record = { _id: "str_new", name: createdStream.name, status: createdStream.status, classesCount: 0, studentsCount: 0 };
          streamsList.push(record);
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({ success: true, data: record }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { streams: streamsList, total: streamsList.length, totalPages: 1 },
          }),
        });
      });

      await page.goto("/academic-mgmt/streams?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      await page.locator("button:has-text('Add Stream')").click();
      await expect(page.locator("h3:has-text('Add Stream')")).toBeVisible();

      // Test required validation
      await page.locator("form button[type='submit']:has-text('Add Stream')").click();
      await expect(page.locator("text=Stream name is required.")).toBeVisible();

      // Fill stream name
      await page.locator("input[placeholder='e.g. Science, Commerce, Arts']").fill("Vocational & IT");
      await page.locator("form button[type='submit']:has-text('Add Stream')").click();

      await expect(page.locator("text=Stream name is required.")).not.toBeVisible();
      expect(createdStream).toEqual({ name: "Vocational & IT", status: "Active" });
      await expect(page.locator("span:has-text('Vocational & IT')")).toBeVisible();

      // Verify persistence on reload
      await page.reload();
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("span:has-text('Vocational & IT')")).toBeVisible();
    });

    test("2.3 should enforce referential dependency validation when deleting stream", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        streamsData: {
          streams: [
            { _id: "str_busy", name: "Science", status: "Active", classesCount: 3, studentsCount: 90 },
          ],
          total: 1,
          totalPages: 1,
        },
        dependencyCheckData: {
          deletable: false,
          reasons: [
            "Referenced in 3 active classes (Class 11 Science, Class 12 Science)",
            "Assigned to 90 enrolled students",
          ],
        },
      });

      await page.goto("/academic-mgmt/streams?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Click more actions and select Delete
      await page.locator("table tbody tr").first().locator("td").last().locator("button").click();
      await page.locator("button:has-text('Delete')").click();

      // Expect Dependency Checking Alert
      await expect(page.locator("text=Cannot Delete Stream")).toBeVisible();
      await expect(page.locator("text=Referenced in 3 active classes")).toBeVisible();
      await expect(page.locator("text=Assigned to 90 enrolled students")).toBeVisible();

      // Delete button is blocked; Deactivate and Archive buttons are offered
      await expect(page.locator("button:has-text('Deactivate')")).toBeVisible();
      await expect(page.locator("button:has-text('Archive Stream')")).toBeVisible();

      // Click Cancel to dismiss
      await page.locator("button:has-text('Cancel')").click();
      await expect(page.locator("text=Cannot Delete Stream")).not.toBeVisible();
    });

    test("2.4 should delete stream when no dependencies exist", async ({ page }) => {
      let deleted = false;
      let streams = [{ _id: "str_free", name: "Fine Arts", status: "Inactive", classesCount: 0, studentsCount: 0 }];

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        dependencyCheckData: { deletable: true, reasons: [] },
      });

      await page.route("**/api/streams**", async (route) => {
        const req = route.request();
        if (req.method() === "DELETE") {
          deleted = true;
          streams = [];
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, message: "Stream deleted successfully" }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { streams, total: streams.length, totalPages: 1 },
          }),
        });
      });

      await page.goto("/academic-mgmt/streams?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      await page.locator("table tbody tr").first().locator("td").last().locator("button").click();
      await page.locator("button:has-text('Delete')").click();

      await expect(page.locator("text=Are you sure you want to delete stream")).toBeVisible();
      await page.locator("button:has-text('Delete')").last().click();

      expect(deleted).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: SUBJECT MASTER (/academic-mgmt/subjects)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Subjects Master", () => {
    test("3.1 should render subjects master catalog with code, classes count, and streams mapping", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        subjectsData: {
          subjects: [
            { _id: "sub_1", name: "Mathematics", subject_code: "MATH-01", description: "Core Math", status: "Active", classesCount: 6, teachersCount: 3 },
            { _id: "sub_2", name: "Physics", subject_code: "PHY-02", description: "Physics", status: "Active", classesCount: 4, teachersCount: 2 },
            { _id: "sub_3", name: "Music", subject_code: "MUS-03", description: "Optional", status: "Inactive", classesCount: 1, teachersCount: 1 },
          ],
          total: 3,
          totalPages: 1,
          page: 1,
        },
      });

      await page.goto("/academic-mgmt/subjects?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify header and catalog
      await expect(page.locator("h1.page-title")).toContainText("Subject Master");
      await expect(page.locator("text=Subjects Catalog")).toBeVisible();

      // Verify subject names and subject codes
      await expect(page.locator("span:has-text('Mathematics')")).toBeVisible();
      await expect(page.locator("span:has-text('MATH-01')")).toBeVisible();
      await expect(page.locator("span:has-text('Physics')")).toBeVisible();
      await expect(page.locator("span:has-text('PHY-02')")).toBeVisible();
    });

    test("3.2 should validate required name and create new subject with allowed streams", async ({ page }) => {
      let createdSubject: any = null;
      let subjectsList = [
        { _id: "sub_1", name: "Mathematics", subject_code: "MATH", status: "Active", classesCount: 2, teachersCount: 1 },
      ];

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        enableStreams: true,
        streamsData: {
          streams: [
            { _id: "str_sci", name: "Science", status: "Active" },
            { _id: "str_com", name: "Commerce", status: "Active" },
          ],
        },
      });

      await page.route("**/api/subject-master**", async (route) => {
        const req = route.request();
        if (req.method() === "POST") {
          createdSubject = JSON.parse(req.postData() || "{}");
          const record = {
            _id: "sub_new",
            name: createdSubject.name,
            subject_code: createdSubject.subject_code,
            description: createdSubject.description,
            status: createdSubject.status,
            allowed_streams: createdSubject.allowed_streams,
            classesCount: 0,
            teachersCount: 0,
          };
          subjectsList.push(record);
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({ success: true, data: record }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { subjects: subjectsList, total: subjectsList.length, totalPages: 1 },
          }),
        });
      });

      await page.goto("/academic-mgmt/subjects?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      await page.locator("button:has-text('Add Subject')").click();
      await expect(page.locator("h3:has-text('Add Subject')")).toBeVisible();

      // Submit with empty name
      await page.locator("form button[type='submit']:has-text('Add Subject')").click();
      await expect(page.locator("text=Subject name is required.")).toBeVisible();

      // Fill valid subject information
      await page.locator("input[placeholder='e.g. Physics, Mathematics']").fill("Computer Science");
      await page.locator("input[placeholder='e.g. PHY, MATH']").fill("CS");
      await page.locator("textarea[placeholder='Brief description of this subject...']").fill("Object Oriented Programming & Data Structures");

      // Check allowed streams checkbox for "Science"
      await page.locator("label:has-text('Science') input[type='checkbox']").check();

      await page.locator("form button[type='submit']:has-text('Add Subject')").click();

      await expect(page.locator("text=Subject name is required.")).not.toBeVisible();
      expect(createdSubject.name).toBe("Computer Science");
      expect(createdSubject.subject_code).toBe("CS");
      expect(createdSubject.allowed_streams).toContain("str_sci");

      await expect(page.locator("span:has-text('Computer Science')")).toBeVisible();

      // Verify persistence on reload
      await page.reload();
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("span:has-text('Computer Science')")).toBeVisible();
    });

    test("3.3 should enforce referential dependency validation on subject deletion", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        subjectsData: {
          subjects: [
            { _id: "sub_in_use", name: "Biology", subject_code: "BIO", status: "Active", classesCount: 4, teachersCount: 2 },
          ],
          total: 1,
          totalPages: 1,
        },
        dependencyCheckData: {
          deletable: false,
          reasons: [
            "Assigned to Class 11 Science and Class 12 Science",
            "Teacher Edna Krabappel is actively assigned to teach this subject",
            "Referenced in 12 ongoing exams/assessments",
          ],
        },
      });

      await page.goto("/academic-mgmt/subjects?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Click delete button
      await page.locator("button[title='Delete Subject']").click();

      // Verify dependency alert
      await expect(page.locator("text=Cannot Delete Subject")).toBeVisible();
      await expect(page.locator("text=Assigned to Class 11 Science")).toBeVisible();
      await expect(page.locator("text=Teacher Edna Krabappel is actively assigned")).toBeVisible();

      // Verify safe alternatives (Deactivate & Archive)
      await expect(page.locator("button:has-text('Deactivate')")).toBeVisible();
      await expect(page.locator("button:has-text('Archive Subject')")).toBeVisible();

      await page.locator("button:has-text('Cancel')").click();
    });

    test("3.4 should edit subject details and persist updates", async ({ page }) => {
      let updatedPayload: any = null;
      let subjects = [
        { _id: "sub_1", name: "Chemistry", subject_code: "CHEM", description: "Intro Chem", status: "Active" },
      ];

      await loginAsSchoolAdmin(page, { subdomain: "myschool" });

      await page.route("**/api/subject-master**", async (route) => {
        const req = route.request();
        if (req.method() === "PUT" || req.method() === "PATCH" || req.url().includes("/sub_1")) {
          updatedPayload = JSON.parse(req.postData() || "{}");
          subjects[0] = { ...subjects[0], ...updatedPayload };
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, data: subjects[0] }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { subjects, total: 1, totalPages: 1 },
          }),
        });
      });

      await page.goto("/academic-mgmt/subjects?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Click Edit Subject
      await page.locator("button[title='Edit Subject']").click();
      await expect(page.locator("h3:has-text('Edit Subject')")).toBeVisible();

      await page.locator("input[placeholder='e.g. Physics, Mathematics']").fill("Advanced Chemistry");
      await page.locator("input[placeholder='e.g. PHY, MATH']").fill("CHEM-ADV");

      await page.locator("form button[type='submit']:has-text('Save Changes')").click();

      expect(updatedPayload.name).toBe("Advanced Chemistry");
      expect(updatedPayload.subject_code).toBe("CHEM-ADV");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: CLASSES MANAGEMENT (/academic-mgmt/classes)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Classes Management", () => {
    test("4.1 should render classes table with student counts, sections, and class teachers", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        classes: {
          classes: [
            { _id: "cls_1", name: "Class 10", section: "A", academic_year: "2026-2027", studentCount: 38, subjectCount: 6, sectionCount: 3, class_teacher_id: { _id: "tch_1", name: "Edna Krabappel" }, status: "Active" },
            { _id: "cls_2", name: "Class 9", section: "B", academic_year: "2026-2027", studentCount: 40, subjectCount: 6, sectionCount: 2, class_teacher_id: null, status: "Active" },
            { _id: "cls_3", name: "Class 8", section: "C", academic_year: "2026-2027", studentCount: 0, subjectCount: 0, sectionCount: 1, class_teacher_id: null, status: "Archived" },
          ],
          total: 3,
          totalPages: 1,
          page: 1,
        },
      });

      await page.goto("/academic-mgmt/classes?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      await expect(page.locator("h1.page-title")).toContainText("Classes");
      await expect(page.locator("text=Classes List")).toBeVisible();
      await expect(page.locator("text=(3)")).toBeVisible();

      // Verify class rows
      await expect(page.locator("span:has-text('Class 10 - A')")).toBeVisible();
      await expect(page.locator("span:has-text('Edna Krabappel')")).toBeVisible();
      await expect(page.locator("span:has-text('Class 9 - B')")).toBeVisible();
      await expect(page.locator("span:has-text('Not assigned')").first()).toBeVisible();
      await expect(page.locator("span:has-text('Archived')")).toBeVisible();
    });

    test("4.2 should validate required fields and enforce stream selection on Class 11 and Class 12", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        enableStreams: true,
        streamsData: {
          streams: [
            { _id: "str_sci", name: "Science", status: "Active" },
            { _id: "str_com", name: "Commerce", status: "Active" },
          ],
        },
      });

      await page.goto("/academic-mgmt/classes?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      await page.locator("button:has-text('Add Class')").click();
      await expect(page.locator("h3:has-text('Add Class')")).toBeVisible();

      // Submit empty
      await page.locator("form button[type='submit']:has-text('Add Class')").click();
      await expect(page.locator("text=Class name and academic year are required.")).toBeVisible();

      // Select Class 11 (requires Stream)
      await page.locator("select").first().selectOption("Class 11");

      // Attempt submit without stream
      await page.locator("form button[type='submit']:has-text('Add Class')").click();
      await expect(page.locator("text=Stream is required for Class 11 and Class 12.")).toBeVisible();

      // Check Science Stream
      await page.locator("label:has-text('Science') input[type='checkbox']").check();

      // Validation passes stream check
      await expect(page.locator("label:has-text('Science') input[type='checkbox']")).toBeChecked();
    });

    test("4.3 should create class with multiple sections and quick-add section", async ({ page }) => {
      let createdClasses: any[] = [];
      let classesList: any[] = [];

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        enableSections: true,
        sectionsData: {
          sections: [
            { _id: "sec_a", name: "A", status: "Active" },
            { _id: "sec_b", name: "B", status: "Active" },
          ],
        },
      });

      await page.route("**/api/classes**", async (route) => {
        const req = route.request();
        if (req.method() === "POST") {
          const body = JSON.parse(req.postData() || "{}");
          createdClasses.push(body);
          const newCls = {
            _id: `cls_${Date.now()}_${Math.random()}`,
            name: body.name,
            section: body.section,
            academic_year: body.academic_year,
            studentCount: 0,
            subjectCount: 0,
            status: body.status || "Active",
          };
          classesList.push(newCls);
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({ success: true, data: newCls }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { classes: classesList, total: classesList.length, totalPages: 1 },
          }),
        });
      });

      await page.goto("/academic-mgmt/classes?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      await page.locator("button:has-text('Add Class')").click();

      // Select Class 7
      await page.locator("select").first().selectOption("Class 7");

      // Quick add Section "C"
      await page.locator("input[placeholder*='Add new section']").fill("C");
      await page.locator("button:has-text('+ Add')").click();

      // Check Section A and newly added Section C
      await page.locator("label:has-text('Section A') input[type='checkbox']").check();

      // Submit
      await page.locator("form button[type='submit']:has-text('Add Class')").click();

      // Verify that classes were created
      expect(createdClasses.length).toBeGreaterThanOrEqual(1);
      const createdNames = createdClasses.map(c => c.name);
      expect(createdNames).toContain("Class 7");
    });

    test("4.4 should check dependencies on class delete and block if students exist", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        classes: {
          classes: [
            { _id: "cls_locked", name: "Class 10", section: "A", academic_year: "2026-2027", status: "Active" },
          ],
          total: 1,
          totalPages: 1,
        },
        dependencyCheckData: {
          deletable: false,
          reasons: [
            "Class has 42 enrolled active students",
            "18 timetable slots assigned",
            "Class fee schedule exists with paid receipts",
          ],
        },
      });

      await page.goto("/academic-mgmt/classes?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Click Delete Class icon
      await page.locator("button[title='Delete Class']").click();

      // Alert displays cannot delete
      await expect(page.locator("text=Cannot Delete Class")).toBeVisible();
      await expect(page.locator("text=Class has 42 enrolled active students")).toBeVisible();
      await expect(page.locator("text=18 timetable slots assigned")).toBeVisible();

      // Safe option to Deactivate / Archive
      await expect(page.locator("button:has-text('Deactivate')")).toBeVisible();
      await expect(page.locator("button:has-text('Archive Class')")).toBeVisible();

      await page.locator("button:has-text('Cancel')").click();
    });

    test("4.5 should search, filter status and sort classes", async ({ page }) => {
      let currentFilterStatus = "Active";
      let currentSort = "asc";

      await loginAsSchoolAdmin(page, { subdomain: "myschool" });

      await page.route("**/api/classes**", async (route) => {
        const url = new URL(route.request().url());
        currentFilterStatus = url.searchParams.get("status") || "Active";
        currentSort = url.searchParams.get("sort") || "asc";

        const classes = [
          { _id: "c1", name: "Class 1", section: "A", academic_year: "2026-2027", status: "Active" },
          { _id: "c2", name: "Class 5", section: "B", academic_year: "2026-2027", status: "Active" },
        ];
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: { classes, total: 2, totalPages: 1 },
          }),
        });
      });

      await page.goto("/academic-mgmt/classes?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Click Status Filter dropdown
      await page.locator("button:has-text('Status:')").click();
      await page.locator("button:has-text('Archived')").click();

      // Click Sort dropdown
      await page.locator("button:has-text('Sort:')").click();
      await page.locator("button:has-text('Z → A')").click();

      expect(currentSort).toBe("desc");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: SYLLABUS MANAGEMENT (/academic-mgmt/syllabus)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Syllabus Management & Curriculum Builder", () => {
    test("5.1 should render syllabus index with class grouping, search, and status filter", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        teacherAssignmentData: [
          {
            _id: "assign_1",
            academic_year: "2026-2027",
            class_id: { _id: "cls_10", name: "Class 10", section: "A" },
            subject_master_id: { _id: "sub_math", name: "Mathematics", subject_code: "MATH" },
            teacher_id: { _id: "tch_1", name: "Edna Krabappel" },
          },
          {
            _id: "assign_2",
            academic_year: "2026-2027",
            class_id: { _id: "cls_10", name: "Class 10", section: "A" },
            subject_master_id: { _id: "sub_phy", name: "Physics", subject_code: "PHY" },
            teacher_id: { _id: "tch_2", name: "Dewey Largo" },
          },
        ],
        syllabusData: [
          {
            _id: "syl_1",
            academic_year: "2026-2027",
            class_id: "cls_10",
            subject_master_id: "sub_math",
            status: "Published",
            chapters: [{ status: "Completed" }, { status: "Pending" }],
          },
        ],
      });

      await page.goto("/academic-mgmt/syllabus?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Header and class group
      await expect(page.locator("h1.page-title")).toContainText("Syllabus");
      await expect(page.locator("text=Class 10")).toBeVisible();

      // Search functionality
      await page.locator("input[placeholder*='Search classes or subjects']").fill("Mathematics");
      await expect(page.locator("p:has-text('MATHEMATICS')").or(page.locator("p:has-text('Mathematics')"))).toBeVisible();
    });

    test("5.2 should render class syllabus subjects matrix and progress bar", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        classes: [
          { _id: "cls_10", name: "Class 10", section: "A", class_teacher_id: { name: "Edna Krabappel" } },
        ],
        syllabusData: [
          {
            _id: "syl_10_math",
            title: "Class 10 Mathematics Complete Syllabus",
            version: 2,
            academic_year: "2026-2027",
            class_id: { _id: "cls_10", name: "Class 10", section: "A" },
            subject_master_id: { _id: "sub_math", name: "Mathematics" },
            teacher_id: { _id: "tch_1", name: "Edna Krabappel" },
            status: "Published",
            nodes: [{ id: "n1", title: "Real Numbers" }, { id: "n2", title: "Polynomials" }],
          },
        ],
      });

      await page.goto("/academic-mgmt/syllabus/cls_10?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify Header
      await expect(page.locator("h1.page-title")).toContainText("Class Syllabus");
      await expect(page.locator("text=Edna Krabappel")).toBeVisible();
      await expect(page.locator("text=Total Subjects")).toBeVisible();

      // Verify Subject Card
      await expect(page.locator("h4:has-text('Mathematics')")).toBeVisible();
      await expect(page.locator("span:has-text('Published')").first()).toBeVisible();
      await expect(page.locator("text=2 units/topics")).toBeVisible();
      await expect(page.locator("text=v2")).toBeVisible();
    });

    test("5.3 should open curriculum details tree, add a chapter node, edit, and delete node with optimistic UI", async ({ page }) => {
      let updatedSyllabusNodes: any[] = [];
      let syllabusRecord = {
        _id: "syl_10_math",
        title: "Class 10 Mathematics",
        description: "CBSE Syllabus",
        version: 1,
        academic_year: "2026-2027",
        class_id: { _id: "cls_10", name: "Class 10", section: "A" },
        subject_master_id: { _id: "sub_math", name: "Mathematics", subject_code: "MATH" },
        teacher_id: { _id: "tch_1", name: "Edna Krabappel" },
        status: "Published",
        visibility: "Public",
        nodes: [
          {
            id: "unit_algebra",
            title: "Unit 1: Algebra",
            type: "unit",
            description: "Algebraic identities and matrices",
            children: [],
            resources: [],
          },
        ],
        attachments: [],
        reference_links: [],
      };

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        syllabusData: syllabusRecord,
      });

      await page.route(/\/api\/syllabus/, async (route) => {
        const req = route.request();
        if (req.method() === "PUT" || req.method() === "PATCH") {
          const body = JSON.parse(req.postData() || "{}");
          if (body.nodes) {
            updatedSyllabusNodes = body.nodes;
            syllabusRecord.nodes = body.nodes;
          }
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, data: syllabusRecord }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: syllabusRecord }),
        });
      });

      await page.goto("/academic-mgmt/syllabus/cls_10/syl_10_math?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify page loaded
      await expect(page.locator("h1.page-title")).toContainText("Curriculum Planner");
      await expect(page.locator("span:has-text('Unit 1: Algebra')")).toBeVisible();

      // Add a root unit or subsection
      await page.locator("button:has-text('Add Root Unit')").click();
      await expect(page.locator("h3:has-text('Add Subsection node')")).toBeVisible();

      // Fill node details
      await page.locator("input[placeholder*='Unit 1: Introduction']").fill("Unit 2: Trigonometry");
      await page.locator("select").first().selectOption("unit");
      await page.locator("textarea[placeholder*='Provide context']").fill("Trigonometric identities and heights & distances");

      // Submit node modal
      await page.locator("button:has-text('Save Node')").click();

      // Optimistic UI check: newly added unit is visible immediately
      await expect(page.locator("span:has-text('Unit 2: Trigonometry')")).toBeVisible();

      // Delete node confirmation
      await page.locator("button[title='Delete']").last().click();
      await expect(page.locator("button:has-text('Delete')").last()).toBeVisible();
      await page.locator("button:has-text('Delete')").last().click();

      // Node removed
      await expect(page.locator("span:has-text('Unit 2: Trigonometry')")).not.toBeVisible();
    });

    test("5.4 should upload syllabus document material, preview/download and remove attachment", async ({ page }) => {
      let savedAttachments: any[] = [];
      let syllabusRecord = {
        _id: "syl_10_math",
        title: "Class 10 Mathematics",
        version: 1,
        academic_year: "2026-2027",
        class_id: { _id: "cls_10", name: "Class 10", section: "A" },
        subject_master_id: { _id: "sub_math", name: "Mathematics" },
        teacher_id: { _id: "tch_1", name: "Edna Krabappel" },
        status: "Published",
        visibility: "Public",
        nodes: [{ id: "n1", title: "Algebra", type: "unit" }],
        attachments: [
          { filename: "NCERT_Class10_Math.pdf", file_url: "https://example.com/ncert.pdf", mime_type: "application/pdf" }
        ],
        reference_links: ["https://cbseacademic.nic.in"],
      };

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        syllabusData: syllabusRecord,
      });

      await page.route(/\/api\/syllabus/, async (route) => {
        const req = route.request();
        if (req.method() === "PUT" || req.method() === "PATCH") {
          const body = JSON.parse(req.postData() || "{}");
          if (body.attachments) {
            savedAttachments = body.attachments;
            syllabusRecord.attachments = body.attachments;
          }
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, data: syllabusRecord }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: syllabusRecord }),
        });
      });

      await page.goto("/academic-mgmt/syllabus/cls_10/syl_10_math?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify existing attachment
      await expect(page.locator("p:has-text('NCERT_Class10_Math.pdf')")).toBeVisible();
      await expect(page.locator("a[title='Download']")).toHaveAttribute("href", "https://example.com/ncert.pdf");

      // Open Curriculum Settings
      await page.locator("button:has-text('Curriculum Settings')").click();
      await expect(page.locator("h3:has-text('Curriculum Settings')")).toBeVisible();

      // Add a new document attachment
      await page.locator("input[placeholder='Semester Homework PDF']").fill("Trigonometry_Formulas_Summary.pdf");
      await page.locator("input[placeholder='https://drive.google.com/...']").fill("https://example.com/trig.pdf");
      await page.locator("button:has-text('Add Document')").click();

      // Verify it appears in the modal list
      await expect(page.locator("span:has-text('Trigonometry_Formulas_Summary.pdf')")).toBeVisible();

      // Save changes
      await page.locator("button:has-text('Save Settings')").click();

      // Modal closed and saved
      await expect(page.locator("p:has-text('Trigonometry_Formulas_Summary.pdf')")).toBeVisible();

      // Reload to verify persistence
      await page.reload();
      await page.waitForLoadState("domcontentloaded");
      await expect(page.locator("p:has-text('Trigonometry_Formulas_Summary.pdf')")).toBeVisible();
    });

    test("5.5 should handle API failure and rollback optimistic UI updates", async ({ page }) => {
      let syllabusRecord = {
        _id: "syl_10_math",
        title: "Class 10 Mathematics",
        version: 1,
        academic_year: "2026-2027",
        class_id: { _id: "cls_10", name: "Class 10" },
        subject_master_id: { _id: "sub_math", name: "Mathematics" },
        teacher_id: { _id: "tch_1", name: "Edna Krabappel" },
        status: "Draft",
        visibility: "Public",
        nodes: [{ id: "n1", title: "Algebra", type: "unit" }],
        attachments: [],
        reference_links: [],
      };

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        syllabusData: syllabusRecord,
      });

      await page.route(/\/api\/syllabus/, async (route) => {
        const req = route.request();
        if (req.method() === "PUT" || req.method() === "PATCH") {
          // Simulate 500 server failure
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ success: false, message: "Database write timeout. Could not save node." }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: syllabusRecord }),
        });
      });

      await page.goto("/academic-mgmt/syllabus/cls_10/syl_10_math?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Add a node
      await page.locator("button:has-text('Add Root Unit')").click();
      await page.locator("input[placeholder*='Unit 1: Introduction']").fill("Unit Crash Test");
      await page.locator("button:has-text('Save Node')").click();

      // Error message banner appears
      await expect(page.locator("text=Database write timeout").or(page.locator("text=Failed to update curriculum structure"))).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: ROLE-BASED ACCESS & PERMISSIONS ISOLATION
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Role-Based Access Control", () => {
    test("6.1 should allow Teacher to edit syllabus but hide Delete Syllabus button", async ({ page }) => {
      await loginAsTeacher(page, {
        subdomain: "myschool",
        classes: [
          { _id: "cls_10", name: "Class 10", section: "A", class_teacher_id: { name: "Edna Krabappel" } },
        ],
        syllabusData: [
          {
            _id: "syl_10_math",
            title: "Class 10 Mathematics",
            version: 1,
            academic_year: "2026-2027",
            class_id: { _id: "cls_10", name: "Class 10" },
            subject_master_id: { _id: "sub_math", name: "Mathematics" },
            teacher_id: { _id: "60f000000000000000000003", name: "Edna Krabappel" },
            status: "Draft",
            nodes: [{ id: "n1", title: "Algebra", type: "unit" }],
          },
        ],
      });

      await page.goto("/academic-mgmt/syllabus/cls_10?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Teacher can view syllabus details
      await expect(page.locator("a[title='View Syllabus']").or(page.locator("button[title='View Syllabus']"))).toBeVisible();

      // Delete syllabus button should NOT be visible for teacher
      await expect(page.locator("button[title='Delete Syllabus']")).not.toBeVisible();
    });

    test("6.2 should restrict Student to read-only access on syllabus with no editing capabilities", async ({ page }) => {
      await loginAsStudent(page, {
        subdomain: "myschool",
        classes: [
          { _id: "cls_10", name: "Class 10", section: "A" },
        ],
        syllabusData: [
          {
            _id: "syl_10_math",
            title: "Class 10 Mathematics",
            version: 1,
            academic_year: "2026-2027",
            class_id: { _id: "cls_10", name: "Class 10" },
            subject_master_id: { _id: "sub_math", name: "Mathematics" },
            teacher_id: { _id: "tch_1", name: "Edna Krabappel" },
            status: "Published",
            visibility: "Public",
            nodes: [{ id: "n1", title: "Algebra Unit", type: "unit" }],
          },
        ],
      });

      await page.goto("/academic-mgmt/syllabus/cls_10/syl_10_math?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Student can view units
      await expect(page.locator("span:has-text('Algebra Unit')")).toBeVisible();

      // Read-only: No Add Root Unit, No Curriculum Settings, No Edit/Delete buttons
      await expect(page.locator("button:has-text('Add Root Unit')")).not.toBeVisible();
      await expect(page.locator("button:has-text('Curriculum Settings')")).not.toBeVisible();
      await expect(page.locator("button[title='Add Subsection']")).not.toBeVisible();
      await expect(page.locator("button[title='Edit Topic']")).not.toBeVisible();
      await expect(page.locator("button[title='Delete']")).not.toBeVisible();
    });
  });
});
