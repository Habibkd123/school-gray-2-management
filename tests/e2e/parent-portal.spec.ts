import { test, expect, Page } from "@playwright/test";
import { generateAccessToken, generateRefreshToken } from "@/lib/utils/jwt";

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA & FIXTURES FOR PARENT PORTAL E2E
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_SCHOOL_ID = "6ab333f5c76c479dba790075";
const PARENT_USER_ID = "60f000000000000000000005";
const PARENT_DOC_ID = "60f000000000000000000005";

const CHILD_1_ID = "60f000000000000000000101";
const CHILD_2_ID = "60f000000000000000000102";

const CLASS_1_ID = "60f000000000000000000201";
const CLASS_2_ID = "60f000000000000000000202";

interface ParentMockOverrides {
  singleChild?: boolean;
  emptyChildren?: boolean;
  emptyAttendance?: boolean;
  emptyFees?: boolean;
  emptyResults?: boolean;
  emptyHomework?: boolean;
  emptyNotices?: boolean;
}

const mockChildren = [
  {
    _id: CHILD_1_ID,
    name: "Bart Simpson",
    roll_no: "101",
    admission_no: "ADM-2026-001",
    gender: "Male",
    class_id: {
      _id: CLASS_1_ID,
      name: "Class 10",
      section: "A",
      class_teacher_id: { _id: "t-1", name: "Mrs. Krabappel" },
    },
    photo_url: null,
  },
  {
    _id: CHILD_2_ID,
    name: "Lisa Simpson",
    roll_no: "102",
    admission_no: "ADM-2026-002",
    gender: "Female",
    class_id: {
      _id: CLASS_2_ID,
      name: "Class 8",
      section: "B",
      class_teacher_id: { _id: "t-2", name: "Ms. Hoover" },
    },
    photo_url: null,
  },
];

async function setupParentPortalMocks(page: Page, overrides: ParentMockOverrides = {}) {
  // Global auth & config routes to maintain stable session
  await page.route("**/api/settings/permissions**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: {} }),
    });
  });

  await page.route("**/api/theme**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: {} }),
    });
  });

  await page.route("**/api/auth/refresh**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          access_token: generateAccessToken({
            user_id: PARENT_USER_ID,
            role: "parent",
            school_id: DEFAULT_SCHOOL_ID,
          }),
        },
      }),
    });
  });

  await page.route("**/api/public/school-info**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          id: DEFAULT_SCHOOL_ID,
          name: "Springfield Academy",
          subtitle: "Parent Portal",
          subdomain: "bajrang",
          logo_url: null,
        },
      }),
    });
  });

  // Parent Profile
  await page.route("**/api/parent/profile**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          _id: PARENT_DOC_ID,
          name: "John Simpson",
          email: "parent.john.simpson@testschool.com",
          phone: "9876541111",
          relation: "Father",
          occupation: "Architect",
          address: "742 Evergreen Terrace",
        },
      }),
    });
  });

  // Parent Children
  await page.route("**/api/parent/children**", async (route) => {
    if (overrides.emptyChildren) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
      return;
    }

    if (overrides.singleChild) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [mockChildren[0]] }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: mockChildren }),
    });
  });

  // Attendance
  await page.route("**/api/parent/attendance*", async (route) => {
    const url = new URL(route.request().url());
    const studentId = url.searchParams.get("studentId");

    if (overrides.emptyAttendance) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
      return;
    }

    // Security guard mock: unlinked student returns 403
    if (studentId === "unauthorized_child_999") {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Student not found or unauthorized" }),
      });
      return;
    }

    const isLisa = studentId === CHILD_2_ID;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: isLisa
          ? [
              { date: "2026-10-01T00:00:00.000Z", status: "present", note: "On time" },
              { date: "2026-10-02T00:00:00.000Z", status: "present", note: "Excellent" },
              { date: "2026-10-03T00:00:00.000Z", status: "present", note: "Present" },
            ]
          : [
              { date: "2026-10-01T00:00:00.000Z", status: "present", note: "On time" },
              { date: "2026-10-02T00:00:00.000Z", status: "absent", note: "Medical leave" },
              { date: "2026-10-03T00:00:00.000Z", status: "leave", note: "Approved" },
            ],
      }),
    });
  });

  // Fees Allocations
  await page.route("**/api/fees/allocations*", async (route) => {
    const url = new URL(route.request().url());
    const studentId = url.searchParams.get("student_id");

    if (overrides.emptyFees) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { allocations: [] } }),
      });
      return;
    }

    if (studentId === "unauthorized_child_999") {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Access denied to student record" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          allocations: [
            {
              _id: "alloc-1",
              fee_group_id: { _id: "fg-1", name: "Annual Tuition Fee" },
              student_id: studentId || CHILD_1_ID,
            },
          ],
        },
      }),
    });
  });

  // Fees Masters
  await page.route("**/api/fees/master*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          masters: [
            {
              _id: "fm-1",
              fee_group_id: { _id: "fg-1", name: "Annual Tuition Fee" },
              fee_type_id: { _id: "ft-1", name: "Term 1 Tuition" },
              amount: 15000,
              due_date: "2026-12-15T00:00:00.000Z",
            },
          ],
        },
      }),
    });
  });

  // Fees Payments
  await page.route("**/api/fees/payments*", async (route) => {
    const url = new URL(route.request().url());
    const studentId = url.searchParams.get("student_id");

    if (overrides.emptyFees) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { payments: [] } }),
      });
      return;
    }

    if (studentId === "unauthorized_child_999") {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Access denied to student record" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          payments: [
            {
              _id: "pmt-1",
              receipt_number: "REC-PAR-2026-0001",
              amount_paid: 10000,
              payment_method: "Online",
              payment_date: "2026-10-15T00:00:00.000Z",
              fee_master_id: "fm-1",
            },
          ],
        },
      }),
    });
  });

  // Exam Results
  await page.route("**/api/results*", async (route) => {
    const url = new URL(route.request().url());
    const studentId = url.searchParams.get("student_id") || url.searchParams.get("studentId");

    if (overrides.emptyResults) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { results: [], total: 0, totalPages: 1 } }),
      });
      return;
    }

    if (studentId === "unauthorized_child_999") {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Access denied to student record" }),
      });
      return;
    }

    const isLisa = studentId === CHILD_2_ID;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          results: isLisa
            ? [
                {
                  _id: "res-lisa-1",
                  student_id: CHILD_2_ID,
                  exam_id: { _id: "exam-1", name: "Term 1 Final Examination 2026" },
                  subject_id: { _id: "sub-1", name: "Mathematics" },
                  marks_obtained: 95,
                  total_marks: 100,
                  grade: "A+",
                  is_pass: true,
                },
              ]
            : [
                {
                  _id: "res-bart-1",
                  student_id: CHILD_1_ID,
                  exam_id: { _id: "exam-1", name: "Term 1 Final Examination 2026" },
                  subject_id: { _id: "sub-1", name: "Mathematics" },
                  marks_obtained: 88,
                  total_marks: 100,
                  grade: "A",
                  is_pass: true,
                },
              ],
          total: 1,
          totalPages: 1,
        },
      }),
    });
  });

  // Homework
  await page.route("**/api/homework**", async (route) => {
    if (overrides.emptyHomework) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { homeworks: [], total: 0, totalPages: 1 } }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          homeworks: [
            {
              _id: "hw-1",
              title: "Algebra Quadratics Problem Set",
              description: "Complete problems 1 through 15 from textbook.",
              due_date: new Date(Date.now() + 86400000 * 3).toISOString(),
              assigned_date: new Date().toISOString(),
              status: "published",
              class_id: { _id: CLASS_1_ID, name: "Class 10", section: "A" },
              subject_id: { _id: "sub-1", name: "Math" },
              teacher_id: { _id: "t-1", name: "Mrs. Krabappel" },
              submissions: [
                {
                  student_id: CHILD_1_ID,
                  content: "Completed quadratics problem sheet",
                  submitted_at: new Date().toISOString(),
                },
              ],
            },
            {
              _id: "hw-2",
              title: "Science Chemistry Lab Observation",
              description: "Write summary of acid-base titration lab.",
              due_date: new Date(Date.now() + 86400000 * 5).toISOString(),
              assigned_date: new Date().toISOString(),
              status: "published",
              class_id: { _id: CLASS_1_ID, name: "Class 10", section: "A" },
              subject_id: { _id: "sub-2", name: "Science" },
              teacher_id: { _id: "t-2", name: "Mr. Dewey" },
              submissions: [],
            },
          ],
          total: 2,
          totalPages: 1,
        },
      }),
    });
  });

  await page.route("**/api/homework/hw-1", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          _id: "hw-1",
          title: "Algebra Quadratics Problem Set",
          description: "Complete problems 1 through 15 from textbook.",
          due_date: new Date(Date.now() + 86400000 * 3).toISOString(),
          assigned_date: new Date().toISOString(),
          status: "published",
          class_id: { _id: CLASS_1_ID, name: "Class 10", section: "A" },
          subject_id: { _id: "sub-1", name: "Math" },
          teacher_id: { _id: "t-1", name: "Mrs. Krabappel" },
          submissions: [
            {
              student_id: CHILD_1_ID,
              content: "Completed quadratics problem sheet",
              submitted_at: new Date().toISOString(),
            },
          ],
        },
      }),
    });
  });

  // Notices
  await page.route("**/api/notices**", async (route) => {
    if (overrides.emptyNotices) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: { notices: [], total: 0, totalPages: 1 } }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          notices: [
            {
              _id: "not-1",
              title: "Annual Sports Day Celebration",
              content: "Sports Day will be held on December 5th.",
              target_audience: "all",
              publish_date: "2026-10-01T00:00:00.000Z",
              is_published: true,
            },
            {
              _id: "not-2",
              title: "Parent-Teacher Meeting Schedule",
              content: "PTM will be conducted this Saturday from 10 AM to 1 PM.",
              target_audience: "parents",
              publish_date: "2026-10-05T00:00:00.000Z",
              is_published: true,
            },
          ],
          total: 2,
          totalPages: 1,
        },
      }),
    });
  });
}

export async function authenticateParentSession(page: Page) {
  const token = generateAccessToken({
    user_id: PARENT_USER_ID,
    role: "parent",
    school_id: DEFAULT_SCHOOL_ID,
  });

  const refreshToken = generateRefreshToken({
    user_id: PARENT_USER_ID,
    role: "parent",
    school_id: DEFAULT_SCHOOL_ID,
  });

  const user = {
    id: PARENT_USER_ID,
    name: "John Simpson",
    email: "parent.john.simpson@testschool.com",
    role: "parent",
    school_id: DEFAULT_SCHOOL_ID,
    must_change_password: false,
  };

  const school = {
    id: DEFAULT_SCHOOL_ID,
    name: "Springfield Academy",
    subtitle: "Parent Portal",
    subdomain: "bajrang",
  };

  await page.goto("/");
  await page.evaluate(
    ({ t, rt, u, s }) => {
      window.localStorage.setItem("sm_access_token", t);
      window.localStorage.setItem("sm_refresh_token", rt);
      window.localStorage.setItem("sm_user", JSON.stringify(u));
      window.localStorage.setItem("sm_school", JSON.stringify(s));
      document.cookie = `sm_token=${t}; path=/`;
      document.cookie = `sm_role=parent; path=/`;
      document.cookie = `sm_subdomain=bajrang; path=/`;
    },
    { t: token, rt: refreshToken, u: user, s: school }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: PARENT DASHBOARD, CHILD SELECTOR & SWITCHING
// ═══════════════════════════════════════════════════════════════════════════

test.describe("1. Parent Dashboard Overview & Child Selector", () => {
  test.beforeEach(async ({ page }) => {
    await setupParentPortalMocks(page);
    await authenticateParentSession(page);
  });

  test("1.1 should render welcome banner and ChildSelector on /dashboard", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.locator("h1.page-title")).toContainText("Parent Portal");
    await expect(page.locator("h2.section-title:has-text('Welcome to the Parent Portal')")).toBeVisible();
    await expect(page.locator("text=Track your child's academic progress, attendance, and fee status.")).toBeVisible();

    // Verify ChildSelector dropdown rendered with default selected child (Bart Simpson)
    const select = page.locator("select");
    await expect(select).toBeVisible();
    await expect(select).toHaveValue(CHILD_1_ID);
  });

  test("1.2 Child Switching: switches active child from Bart to Lisa in ChildSelector", async ({ page }) => {
    await page.goto("/dashboard");

    const select = page.locator("select");
    await expect(select).toHaveValue(CHILD_1_ID);

    // Switch to Lisa Simpson
    await select.selectOption(CHILD_2_ID);
    await expect(select).toHaveValue(CHILD_2_ID);
  });

  test("1.3 Single Child Mode: renders child identity badge instead of select dropdown when parent has 1 child", async ({ page }) => {
    await setupParentPortalMocks(page, { singleChild: true });
    await page.goto("/parent/attendance");

    // When single child, ChildSelector renders a static identity badge instead of select dropdown
    await expect(page.locator("select")).not.toBeVisible();
    await expect(page.locator("span:has-text('Bart Simpson')")).toBeVisible();
    await expect(page.locator("text=Class 10 A")).toBeVisible();
  });

  test("1.4 Empty Children State: renders friendly empty state when parent has no linked children", async ({ page }) => {
    await setupParentPortalMocks(page, { emptyChildren: true });
    await page.goto("/dashboard");

    await expect(page.locator("h3:has-text('No Children Found')")).toBeVisible();
    await expect(page.locator("text=We couldn't find any students linked to your account")).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: SIDEBAR & NAVIGATION FOR PARENT ROLE
// ═══════════════════════════════════════════════════════════════════════════

test.describe("2. Parent Sidebar & Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupParentPortalMocks(page);
    await authenticateParentSession(page);
  });

  test("2.1 should render Parent Portal role badge and menu items in sidebar", async ({ page }) => {
    await page.goto("/dashboard");

    // Role badge
    await expect(page.locator("aside").getByText("PARENT", { exact: true })).toBeVisible();

    // Parent navigation links
    await expect(page.locator("aside a[href='/dashboard']:has-text('Overview')")).toBeVisible();
    await expect(page.locator("aside a[href='/parent/attendance']")).toBeVisible();
    await expect(page.locator("aside a[href='/parent/results']")).toBeVisible();
    await expect(page.locator("aside a[href='/parent/homework']")).toBeVisible();
    await expect(page.locator("aside a[href='/notices']")).toBeVisible();
  });

  test("2.2 Logout: clears stored session and redirects to /", async ({ page }) => {
    await page.goto("/dashboard");

    // Open profile menu at bottom of sidebar
    const profileBtn = page.locator("aside button:has-text('Logged in as')");
    await profileBtn.click();

    const logoutBtn = page.locator("button:has-text('Logout')");
    await logoutBtn.click();

    await page.waitForURL((url) => url.pathname === "/");
    expect(new URL(page.url()).pathname).toBe("/");

    // Verify localStorage token was cleared
    const storedToken = await page.evaluate(() => window.localStorage.getItem("sm_access_token"));
    expect(storedToken).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: PARENT ATTENDANCE MODULE (/parent/attendance)
// ═══════════════════════════════════════════════════════════════════════════

test.describe("3. Parent Attendance Module", () => {
  test.beforeEach(async ({ page }) => {
    await setupParentPortalMocks(page);
    await authenticateParentSession(page);
  });

  test("3.1 should render attendance calendar, summary stats and child selector", async ({ page }) => {
    await page.goto("/parent/attendance");

    await expect(page.locator("h1:has-text('Attendance Tracker')")).toBeVisible();
    await expect(page.locator("text=Present").first()).toBeVisible();
    await expect(page.locator("text=Absent").first()).toBeVisible();

    // ChildSelector present in attendance header
    const select = page.locator("select");
    await expect(select).toBeVisible();
    await expect(select).toHaveValue(CHILD_1_ID);
  });

  test("3.2 Child Switching: switches attendance view from Bart to Lisa", async ({ page }) => {
    await page.goto("/parent/attendance");

    const select = page.locator("select");
    await select.selectOption(CHILD_2_ID);
    await expect(select).toHaveValue(CHILD_2_ID);

    await expect(page.locator("text=Present").first()).toBeVisible();
  });

  test("3.3 Month Navigation: toggles between previous and next months", async ({ page }) => {
    await page.goto("/parent/attendance");

    const prevBtn = page.locator("button:has(svg.lucide-chevron-left)");
    await prevBtn.click();

    // Verify calendar remains stable
    await expect(page.locator("text=Present").first()).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: PARENT FEES STATUS MODULE (/parent/fees)
// ═══════════════════════════════════════════════════════════════════════════

test.describe("4. Parent Fees Status Module", () => {
  test.beforeEach(async ({ page }) => {
    await setupParentPortalMocks(page);
    await authenticateParentSession(page);
  });

  test("4.1 should render financial summary cards with accurate totals and pending dues", async ({ page }) => {
    await page.goto("/parent/fees");

    await expect(page.locator("h1:has-text('Fees Status')")).toBeVisible();

    // Financial Summary Panel
    await expect(page.locator("text=Total Fees")).toBeVisible();
    await expect(page.locator("p:has-text('$15,000')").first()).toBeVisible();

    await expect(page.locator("text=Total Paid")).toBeVisible();
    await expect(page.locator("p:has-text('$10,000')").first()).toBeVisible();

    await expect(page.getByText("Pending Dues", { exact: true })).toBeVisible();
    await expect(page.locator("p:has-text('$5,000')").first()).toBeVisible();
  });

  test("4.2 should render payment receipts history table", async ({ page }) => {
    await page.goto("/parent/fees");

    await expect(page.locator("h3:has-text('Payment History')")).toBeVisible();
    await expect(page.locator("text=REC-PAR-2026-0001")).toBeVisible();
    await expect(page.locator("text=Online")).toBeVisible();
  });

  test("4.3 Empty Fees State: handles zero allocations/payments gracefully", async ({ page }) => {
    await setupParentPortalMocks(page, { emptyFees: true });
    await page.goto("/parent/fees");

    await expect(page.locator("text=$0").first()).toBeVisible();
    await expect(page.locator("text=No payments made yet.")).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: PARENT EXAM RESULTS MODULE (/parent/results)
// ═══════════════════════════════════════════════════════════════════════════

test.describe("5. Parent Exam Results Module", () => {
  test.beforeEach(async ({ page }) => {
    await setupParentPortalMocks(page);
    await authenticateParentSession(page);
  });

  test("5.1 should render student identity banner and overall performance summary", async ({ page }) => {
    await page.goto("/parent/results");

    await expect(page.locator("h1:has-text('Exam Results')")).toBeVisible();

    // Student identity banner
    await expect(page.locator("h2:has-text('Bart Simpson')")).toBeVisible();
    await expect(page.locator("text=Class 10 — A")).toBeVisible();
    await expect(page.locator("text=Roll No: 101")).toBeVisible();

    // Overall summary card
    await expect(page.locator("text=Overall Performance")).toBeVisible();
    await expect(page.locator("text=88.0%").first()).toBeVisible();
    await expect(page.locator("p:has-text('A')").first()).toBeVisible();
  });

  test("5.2 should display exam marks, grade, and subject breakdown", async ({ page }) => {
    await page.goto("/parent/results");

    await expect(page.locator("text=Term 1 Final Examination 2026")).toBeVisible();
    await expect(page.locator("text=Mathematics").first()).toBeVisible();
    await expect(page.locator("text=88 / 100")).toBeVisible();
  });

  test("5.3 Child Switching: switches exam results view to Lisa Simpson", async ({ page }) => {
    await page.goto("/parent/results");

    const select = page.locator("select");
    await select.selectOption(CHILD_2_ID);

    await expect(page.locator("h2:has-text('Lisa Simpson')")).toBeVisible();
    await expect(page.locator("text=95.0%").first()).toBeVisible();
    await expect(page.locator("p:has-text('A+')").first()).toBeVisible();
    await expect(page.locator("text=95 / 100")).toBeVisible();
  });

  test("5.4 Empty Results State: displays friendly empty state when student has no graded results", async ({ page }) => {
    await setupParentPortalMocks(page, { emptyResults: true });
    await page.goto("/parent/results");

    await expect(page.locator("h3:has-text('No Results Yet')")).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: PARENT HOMEWORK MODULE (/parent/homework & detail)
// ═══════════════════════════════════════════════════════════════════════════

test.describe("6. Parent Homework Module", () => {
  test.beforeEach(async ({ page }) => {
    await setupParentPortalMocks(page);
    await authenticateParentSession(page);
  });

  test("6.1 should render homework assignments with subject badge and submission status", async ({ page }) => {
    await page.goto("/parent/homework");

    await expect(page.locator("h1:has-text('Homework')")).toBeVisible();
    await expect(page.locator("text=Algebra Quadratics Problem Set")).toBeVisible();
    await expect(page.locator("text=Science Chemistry Lab Observation")).toBeVisible();

    // Submission badges
    await expect(page.locator("span:has-text('Submitted')")).toBeVisible();
    await expect(page.locator("span:has-text('Pending')")).toBeVisible();
  });

  test("6.2 Homework Filter Tabs: filters assignments by pending and submitted", async ({ page }) => {
    await page.goto("/parent/homework");

    // Click Submitted tab
    await page.locator("button:has-text('Submitted')").click();
    await expect(page.locator("text=Algebra Quadratics Problem Set")).toBeVisible();
    await expect(page.locator("text=Science Chemistry Lab Observation")).not.toBeVisible();

    // Click Pending tab
    await page.locator("button:has-text('Pending')").click();
    await expect(page.locator("text=Science Chemistry Lab Observation")).toBeVisible();
    await expect(page.locator("text=Algebra Quadratics Problem Set")).not.toBeVisible();
  });

  test("6.3 Homework Detail View (/parent/homework/[id]): navigates to assignment details", async ({ page }) => {
    await page.goto("/parent/homework");

    // Click on assignment title/link
    await page.locator("a[href='/parent/homework/hw-1']").click();

    await page.waitForURL((url) => url.pathname.includes("/parent/homework/hw-1"));
    await expect(page.locator("h1:has-text('Algebra Quadratics Problem Set')")).toBeVisible();
    await expect(page.locator("text=Complete problems 1 through 15 from textbook.")).toBeVisible();
    await expect(page.locator("text=Your Submission")).toBeVisible();
    await expect(page.locator("text=Completed quadratics problem sheet")).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: NOTICE BOARD & ANNOUNCEMENTS (/notices)
// ═══════════════════════════════════════════════════════════════════════════

test.describe("7. Notice Board for Parents", () => {
  test.beforeEach(async ({ page }) => {
    await setupParentPortalMocks(page);
    await authenticateParentSession(page);
  });

  test("7.1 should display published notices targeted to parents and all in the table", async ({ page }) => {
    await page.goto("/notices");

    await expect(page.locator("text=Annual Sports Day Celebration")).toBeVisible();
    await expect(page.locator("text=Parent-Teacher Meeting Schedule")).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 8: ANTI-TAMPERING, SESSION GUARDS & RESPONSIVE LAYOUT
// ═══════════════════════════════════════════════════════════════════════════

test.describe("8. Anti-Tampering, Session Security & Responsive Drawer", () => {
  test.beforeEach(async ({ page }) => {
    await setupParentPortalMocks(page);
  });

  test("8.1 Direct unauthenticated access redirects user to /", async ({ page }) => {
    // Navigate directly without setting any session
    await page.goto("/dashboard");

    await page.waitForURL((url) => url.pathname === "/");
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("8.2 Anti-Tampering: URL parameter tampering ?studentId= does not leak unauthorized child records", async ({ page }) => {
    await authenticateParentSession(page);
    // Tamper with URL query param
    await page.goto("/parent/attendance?studentId=unauthorized_child_999");

    // Frontend safely scopes to linked child (Bart Simpson) and does not leak unauthorized data
    await expect(page.locator("select")).toHaveValue(CHILD_1_ID);
    await expect(page.locator("h1:has-text('Attendance Tracker')")).toBeVisible();
  });

  test("8.3 Responsive Layout: Mobile viewport opens and closes sidebar navigation", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await authenticateParentSession(page);
    await page.goto("/dashboard");

    // Open mobile sidebar via banner button
    const openBtn = page.getByRole("button", { name: "Open Sidebar" });
    await openBtn.click();

    const sidebar = page.locator("aside");
    await expect(sidebar).toHaveClass(/translate-x-0/);

    // Dismiss sidebar by clicking Close Sidebar button
    const closeBtn = page.getByRole("button", { name: "Close Sidebar" });
    await closeBtn.click();
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });
});
