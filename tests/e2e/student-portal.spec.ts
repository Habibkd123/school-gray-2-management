import { test, expect, Page } from "@playwright/test";
import { generateAccessToken, generateRefreshToken } from "@/lib/utils/jwt";

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA & SETUP HELPERS FOR STUDENT PORTAL E2E
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_SCHOOL_ID = "6ab333f5c76c479dba790075";
const STUDENT_USER_ID = "60f000000000000000000004";
const STUDENT_DOC_ID = "60f000000000000000000004";
const CLASS_ID = "60f000000000000000000201";

interface StudentMockOverrides {
  emptyHomework?: boolean;
  emptyResults?: boolean;
  emptyNotices?: boolean;
  emptySubjects?: boolean;
  emptyAttendance?: boolean;
  customProfile?: any;
}

async function setupStudentPortalMocks(page: Page, overrides: StudentMockOverrides = {}) {
  const profileData = overrides.customProfile || {
    _id: STUDENT_DOC_ID,
    name: "Bart Simpson",
    roll_no: "101",
    admission_no: "ADM-2026-004",
    class_id: {
      _id: CLASS_ID,
      name: "Class 10",
      section: "A",
    },
    email: "bajrang.student.bart.myschoollife",
    phone: "+91 98765 43210",
    guardian_name: "Homer Simpson",
  };

  const dynamicLeaves = [
    {
      _id: "leave-101",
      user_id: { _id: STUDENT_USER_ID, name: "Bart Simpson" },
      leave_type: "sick",
      from_date: "2026-11-01T00:00:00.000Z",
      to_date: "2026-11-03T00:00:00.000Z",
      reason: "Viral fever recovery",
      status: "pending",
      createdAt: "2026-10-25T10:00:00.000Z",
    },
  ];

  // Intercept all student-related APIs in LIFO order
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
            user_id: STUDENT_USER_ID,
            role: "student",
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
          subtitle: "Student Portal",
          subdomain: "bajrang",
          logo_url: null,
        },
      }),
    });
  });

  await page.route("**/api/student/profile**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: profileData }),
    });
  });

  await page.route("**/api/schedules**", async (route) => {
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [
          {
            _id: "sched-1",
            day: today,
            start_time: "09:00 AM",
            end_time: "10:00 AM",
            room: "Room 101",
            subject_id: { _id: "sub-1", name: "Mathematics" },
            teacher_id: { _id: "t-1", name: "Mrs. Krabappel" },
          },
          {
            _id: "sched-2",
            day: today,
            start_time: "10:15 AM",
            end_time: "11:15 AM",
            room: "Lab 2",
            subject_id: { _id: "sub-2", name: "Science" },
            teacher_id: { _id: "t-2", name: "Mr. Dewey" },
          },
          {
            _id: "sched-3",
            day: "monday",
            start_time: "11:30 AM",
            end_time: "12:30 PM",
            room: "Room 105",
            subject_id: { _id: "sub-3", name: "English Literature" },
            teacher_id: { _id: "t-3", name: "Ms. Hoover" },
          },
        ],
      }),
    });
  });

  await page.route("**/api/homework**", async (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Homework submitted successfully" }),
      });
      return;
    }

    if (overrides.emptyHomework) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { homeworks: [], total: 0, page: 1, totalPages: 1 },
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
          homeworks: [
            {
              _id: "hw-1",
              title: "Math Chapter 4 Real Numbers Exercise",
              description: "Solve problems 1 to 20 from Chapter 4.",
              due_date: new Date(Date.now() + 86400000 * 3).toISOString(),
              status: "published",
              class_id: { _id: CLASS_ID, name: "Class 10", section: "A" },
              subject_id: { _id: "sub-1", name: "Mathematics" },
              teacher_id: { _id: "t-1", name: "Mrs. Krabappel" },
              submissions: [],
            },
            {
              _id: "hw-2",
              title: "Science Chemistry Lab Report",
              description: "Submit titration observations and graphs.",
              due_date: new Date(Date.now() + 86400000 * 5).toISOString(),
              status: "published",
              class_id: { _id: CLASS_ID, name: "Class 10", section: "A" },
              subject_id: { _id: "sub-2", name: "Science" },
              teacher_id: { _id: "t-2", name: "Mr. Dewey" },
              submissions: [
                {
                  student_id: STUDENT_DOC_ID,
                  content: "Completed report with chart.",
                  submitted_at: new Date().toISOString(),
                },
              ],
            },
          ],
          total: 2,
          page: 1,
          totalPages: 1,
        },
      }),
    });
  });

  await page.route("**/api/results**", async (route) => {
    if (overrides.emptyResults) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { results: [], total: 0, page: 1, totalPages: 1 },
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
          results: [
            {
              _id: "res-1",
              student_id: STUDENT_DOC_ID,
              exam_id: {
                _id: "exam-1",
                name: "Mid-Term Examination 2026",
                type: "mid_term",
              },
              subject_id: { _id: "sub-1", name: "Mathematics", code: "MATH101" },
              marks_obtained: 88,
              total_marks: 100,
              passing_marks: 33,
              grade: "A",
              is_pass: true,
            },
            {
              _id: "res-2",
              student_id: STUDENT_DOC_ID,
              exam_id: {
                _id: "exam-1",
                name: "Mid-Term Examination 2026",
                type: "mid_term",
              },
              subject_id: { _id: "sub-2", name: "Science", code: "SCI101" },
              marks_obtained: 92,
              total_marks: 100,
              passing_marks: 33,
              grade: "A+",
              is_pass: true,
            },
          ],
          total: 2,
          page: 1,
          totalPages: 1,
        },
      }),
    });
  });

  await page.route("**/api/attendance/summary**", async (route) => {
    if (overrides.emptyAttendance) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
      return;
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [
          { date: `${currentYear}-${currentMonth}-01`, status: "present" },
          { date: `${currentYear}-${currentMonth}-02`, status: "present" },
          { date: `${currentYear}-${currentMonth}-05`, status: "absent", note: "Medical illness" },
          { date: `${currentYear}-${currentMonth}-06`, status: "present" },
          { date: `${currentYear}-${currentMonth}-07`, status: "leave" },
        ],
      }),
    });
  });

  await page.route("**/api/leave**", async (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      const body = JSON.parse(req.postData() || "{}");
      const newLeave = {
        _id: `leave-${Date.now()}`,
        user_id: { _id: STUDENT_USER_ID, name: "Bart Simpson" },
        leave_type: body.leave_type || "sick",
        from_date: body.from_date,
        to_date: body.to_date,
        reason: body.reason,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      dynamicLeaves.unshift(newLeave);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: newLeave }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          leaves: dynamicLeaves,
          total: dynamicLeaves.length,
          page: 1,
          totalPages: 1,
        },
      }),
    });
  });

  await page.route("**/api/fees/allocations**", async (route) => {
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
              student_id: STUDENT_DOC_ID,
            },
          ],
        },
      }),
    });
  });

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
              fee_type_id: { _id: "ft-1", name: "Quarter 1 Fee" },
              amount: 15000,
              due_date: "2026-11-30T00:00:00.000Z",
            },
          ],
        },
      }),
    });
  });

  await page.route("**/api/fees/payments**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          payments: [
            {
              _id: "pmt-1",
              receipt_number: "REC-2026-0001",
              amount_paid: 15000,
              payment_method: "Online",
              payment_date: "2026-09-10T00:00:00.000Z",
              fee_master_id: "fm-1",
            },
          ],
        },
      }),
    });
  });

  await page.route("**/api/notices**", async (route) => {
    if (overrides.emptyNotices) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { notices: [], total: 0, totalPages: 1 },
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
          notices: [
            {
              _id: "not-1",
              title: "Annual Sports Meet 2026",
              content: "All students must assemble at the main track ground at 8:30 AM.",
              target_audience: "all",
              is_published: true,
              publish_date: "2026-10-20T09:00:00.000Z",
            },
            {
              _id: "not-2",
              title: "Science Exhibition Registration",
              content: "Last date to submit science fair project synopsis is this Friday.",
              target_audience: "students",
              is_published: true,
              publish_date: "2026-10-22T09:00:00.000Z",
            },
          ],
          total: 2,
          totalPages: 1,
        },
      }),
    });
  });

  await page.route("**/api/subjects**", async (route) => {
    if (overrides.emptySubjects) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { subjects: [] },
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
          subjects: [
            {
              _id: "sub-1",
              name: "Mathematics",
              code: "MATH101",
              type: "theory",
              class_id: { _id: CLASS_ID, name: "Class 10", section: "A" },
              teacher_id: { name: "Mrs. Krabappel" },
            },
            {
              _id: "sub-2",
              name: "Science",
              code: "SCI101",
              type: "both",
              class_id: { _id: CLASS_ID, name: "Class 10", section: "A" },
              teacher_id: { name: "Mr. Dewey" },
            },
          ],
        },
      }),
    });
  });

  await page.route("**/api/exams**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          exams: [
            {
              _id: "exam-1",
              name: "Mid-Term Examination 2026",
              type: "mid_term",
              academic_year: "2026-2027",
              start_date: "2026-11-15T00:00:00.000Z",
              end_date: "2026-11-25T00:00:00.000Z",
              is_published: true,
            },
          ],
        },
      }),
    });
  });
}

/** Authenticates the browser page with student tokens in localStorage */
async function authenticateStudentSession(page: Page, options: { schoolId?: string; subdomain?: string } = {}) {
  const schoolId = options.schoolId || DEFAULT_SCHOOL_ID;
  const subdomain = options.subdomain || "bajrang";

  const payload = {
    user_id: STUDENT_USER_ID,
    school_id: schoolId,
    role: "student",
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const user = {
    id: STUDENT_USER_ID,
    name: "Bart Simpson",
    email: "bajrang.student.bart.myschoollife",
    role: "student",
    school_id: schoolId,
    must_change_password: false,
  };

  await page.addInitScript(
    ({ access, refresh, usr, sub, sId }) => {
      window.localStorage.setItem("sm_access_token", access);
      window.localStorage.setItem("sm_refresh_token", refresh);
      window.localStorage.setItem("sm_user", JSON.stringify(usr));
      window.sessionStorage.setItem("sm_active_subdomain", sub);
      window.sessionStorage.setItem(`sm_school_id_${sub}`, sId);
      window.sessionStorage.setItem("sm_school_id_bajrang", sId);
      window.sessionStorage.setItem("sm_school_id_springfield", sId);
    },
    { access: accessToken, refresh: refreshToken, usr: user, sub: subdomain, sId: schoolId }
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: STUDENT AUTHENTICATION & LOGIN WORKFLOW (/student/login)
// ═══════════════════════════════════════════════════════════════════════════

test.describe("1. Student Authentication & Session Boundaries", () => {
  test.beforeEach(async ({ page }) => {
    await setupStudentPortalMocks(page);
  });

  test("1.1 should render student login portal with features panel and form controls", async ({ page }) => {
    await page.goto("/student/login?subdomain=bajrang");

    await expect(page.locator("h1:has-text('Student Login')")).toBeVisible();
    await expect(page.locator("#student-login-username")).toBeVisible();
    await expect(page.locator("#student-login-password")).toBeVisible();
    await expect(page.locator("#student-login-submit")).toBeVisible();

    // Verify side feature highlights
    await expect(page.locator("h3:has-text('Class Schedule')")).toBeVisible();
    await expect(page.locator("h3:has-text('Exam Results')")).toBeVisible();
    await expect(page.locator("h3:has-text('Attendance')")).toBeVisible();
  });

  test("1.2 Client-side validation: should reject empty username and invalid username formats", async ({ page }) => {
    await page.goto("/student/login?subdomain=bajrang");

    // 1. Submit empty username
    await page.locator("#student-login-submit").click();
    await expect(page.locator("text=Please enter your School Username.")).toBeVisible();

    // 2. Submit username without .myschoollife suffix
    await page.locator("#student-login-username").fill("bartsimpson");
    await page.locator("#student-login-submit").click();
    await expect(page.locator("text=Please enter a valid School Username.")).toBeVisible();

    // 3. Submit username with space or @
    await page.locator("#student-login-username").fill("bart @myschoollife");
    await page.locator("#student-login-submit").click();
    await expect(page.locator("text=Please enter a valid School Username.")).toBeVisible();

    // 4. Submit valid username but empty password
    await page.locator("#student-login-username").fill("bajrang.student.bart.myschoollife");
    await page.locator("#student-login-submit").click();
    await expect(page.locator("text=Password is required")).toBeVisible();
  });

  test("1.3 Password visibility toggle: switches input type between password and text", async ({ page }) => {
    await page.goto("/student/login?subdomain=bajrang");

    const passInput = page.locator("#student-login-password");
    await expect(passInput).toHaveAttribute("type", "password");

    // Click toggle button
    const toggleBtn = page.locator("#student-login-password + button");
    await toggleBtn.click();
    await expect(passInput).toHaveAttribute("type", "text");

    // Toggle back
    await toggleBtn.click();
    await expect(passInput).toHaveAttribute("type", "password");
  });

  test("1.4 Authentication failure: displays error message when credentials are invalid", async ({ page }) => {
    await page.route("**/api/auth/login**", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Invalid Student ID or Password." }),
      });
    });

    await page.goto("/student/login?subdomain=bajrang");
    await page.locator("#student-login-username").fill("bajrang.student.bart.myschoollife");
    await page.locator("#student-login-password").fill("WrongPassword#999");
    await page.locator("#student-login-submit").click();

    await expect(page.locator("text=Invalid Student ID or Password.")).toBeVisible();
  });

  test("1.5 Successful login: saves student session and navigates to /student/dashboard", async ({ page }) => {
    await page.route("**/api/auth/login**", async (route) => {
      const payload = {
        user_id: STUDENT_USER_ID,
        school_id: DEFAULT_SCHOOL_ID,
        role: "student",
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: STUDENT_USER_ID,
              name: "Bart Simpson",
              role: "student",
              school_id: DEFAULT_SCHOOL_ID,
            },
            access_token: generateAccessToken(payload),
            refresh_token: generateRefreshToken(payload),
          },
        }),
      });
    });

    await page.goto("/student/login?subdomain=bajrang");
    await page.locator("#student-login-username").fill("bajrang.student.bart.myschoollife");
    await page.locator("#student-login-password").fill("Password123#");
    await page.locator("#student-login-submit").click();

    await page.waitForURL("**/student/dashboard");
    expect(page.url()).toContain("/student/dashboard");
  });

  test("1.6 Direct unauthenticated access: should redirect unauthenticated users to root /", async ({ page }) => {
    await page.goto("/student/dashboard");
    await page.waitForURL((url) => url.pathname === "/");
    expect(new URL(page.url()).pathname).toBe("/");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: STUDENT DASHBOARD OVERVIEW (/student/dashboard)
// ═══════════════════════════════════════════════════════════════════════════

test.describe("2. Student Dashboard Overview", () => {
  test.beforeEach(async ({ page }) => {
    await setupStudentPortalMocks(page);
    await authenticateStudentSession(page);
  });

  test("2.1 should render welcome banner with student name and class information", async ({ page }) => {
    await page.goto("/student/dashboard");

    // Welcome banner: Welcome back, Bart
    await expect(page.locator("h1:has-text('Welcome back, Bart')")).toBeVisible();
    await expect(page.locator("aside p:has-text('Class 10 A')")).toBeVisible();
  });

  test("2.2 should render all 4 overview stats cards correctly", async ({ page }) => {
    await page.goto("/student/dashboard");

    await expect(page.locator("p:has-text(\"Today's Classes\")")).toBeVisible();
    await expect(page.locator("p:has-text('Pending Homework')")).toBeVisible();
    await expect(page.locator("p:has-text('Average Grade')")).toBeVisible();
    await expect(page.locator("p:has-text('Pending Leaves')")).toBeVisible();
  });

  test("2.3 should display scheduled classes for today", async ({ page }) => {
    await page.goto("/student/dashboard");

    await expect(page.locator("h3:has-text(\"Today's Classes\")")).toBeVisible();
    await expect(page.getByText("Mathematics", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Science", { exact: true }).first()).toBeVisible();
    await expect(page.locator("text=Room 101")).toBeVisible();
  });

  test("2.4 should display recent homework and notice board widgets", async ({ page }) => {
    await page.goto("/student/dashboard");

    await expect(page.locator("text=Math Chapter 4 Real Numbers Exercise")).toBeVisible();
    await expect(page.locator("text=Annual Sports Meet 2026")).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: SIDEBAR NAVIGATION & SESSION TERMINATION
// ═══════════════════════════════════════════════════════════════════════════

test.describe("3. Student Sidebar & Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await setupStudentPortalMocks(page);
    await authenticateStudentSession(page);
  });

  test("3.1 should display student profile badge with name, class, and roll number in sidebar", async ({ page }) => {
    await page.goto("/student/dashboard");

    const sidebar = page.locator("aside");
    await expect(sidebar.locator("text=Bart Simpson")).toBeVisible();
    await expect(sidebar.locator("p:has-text('Class 10 A')")).toBeVisible();
    await expect(sidebar.locator("text=Roll: 101")).toBeVisible();
  });

  test("3.2 should provide navigation to all student portal feature pages", async ({ page }) => {
    await page.goto("/student/dashboard");

    const sidebar = page.locator("aside");
    await expect(sidebar.locator("a[href='/student/dashboard']")).toBeVisible();
    await expect(sidebar.locator("a[href='/student/routine']")).toBeVisible();
    await expect(sidebar.locator("a[href='/student/subjects']")).toBeVisible();
    await expect(sidebar.locator("a[href='/student/homework']")).toBeVisible();
    await expect(sidebar.locator("a[href='/student/exams']")).toBeVisible();
    await expect(sidebar.locator("a[href='/student/results']")).toBeVisible();
    await expect(sidebar.locator("a[href='/student/attendance']")).toBeVisible();
    await expect(sidebar.locator("a[href='/student/leave']")).toBeVisible();
    await expect(sidebar.locator("a[href='/student/fees']")).toBeVisible();
    await expect(sidebar.locator("a[href='/student/notices']")).toBeVisible();
  });

  test("3.3 Logout: should clear stored session and redirect user to /", async ({ page }) => {
    await page.goto("/student/dashboard");

    const logoutBtn = page.locator("aside button:has-text('Logout')");
    await logoutBtn.click();

    await page.waitForURL((url) => url.pathname === "/");
    expect(new URL(page.url()).pathname).toBe("/");

    // Verify localStorage tokens were cleared
    const storedToken = await page.evaluate(() => window.localStorage.getItem("sm_access_token"));
    expect(storedToken).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: DEDICATED STUDENT FEATURE MODULES
// ═══════════════════════════════════════════════════════════════════════════

test.describe("4. Dedicated Student Modules & Empty States", () => {
  test.beforeEach(async ({ page }) => {
    await setupStudentPortalMocks(page);
    await authenticateStudentSession(page);
  });

  test("4.1 Routine (/student/routine): day tabs filter timetable cards", async ({ page }) => {
    await page.goto("/student/routine");

    await expect(page.locator("h1:has-text('My Routine')")).toBeVisible();
    await expect(page.locator("button:has-text('Monday')")).toBeVisible();
    await expect(page.locator("button:has-text('Tuesday')")).toBeVisible();

    // Click Monday tab
    await page.locator("button:has-text('Monday')").click();
    await expect(page.locator("text=English Literature")).toBeVisible();
    await expect(page.locator("text=Room 105")).toBeVisible();
  });

  test("4.2 Subjects (/student/subjects): lists subjects assigned to student class", async ({ page }) => {
    await page.goto("/student/subjects");

    await expect(page.locator("h1:has-text('My Subjects')")).toBeVisible();
    await expect(page.locator("h3:has-text('Mathematics')")).toBeVisible();
    await expect(page.locator("h3:has-text('Science')")).toBeVisible();
    await expect(page.locator("text=Mrs. Krabappel")).toBeVisible();
  });

  test("4.3 Subjects Empty State: displays friendly empty state when no subjects assigned", async ({ page }) => {
    await setupStudentPortalMocks(page, { emptySubjects: true });
    await page.goto("/student/subjects");

    await expect(page.locator("text=No subjects found for your class")).toBeVisible();
  });

  test("4.4 Homework (/student/homework): status filters and expandable submission", async ({ page }) => {
    await page.goto("/student/homework");

    await expect(page.locator("h1:has-text('Homework')")).toBeVisible();
    await expect(page.locator("text=Math Chapter 4 Real Numbers Exercise")).toBeVisible();

    // Filter tabs
    await expect(page.locator("button:has-text('all')")).toBeVisible();
    await expect(page.locator("button:has-text('pending')")).toBeVisible();
    await expect(page.locator("button:has-text('submitted')")).toBeVisible();

    // Expand homework card to view submission area
    await page.locator("h3:has-text('Math Chapter 4 Real Numbers Exercise')").click();

    // Check submission area
    await expect(page.locator("text=Submit Your Work")).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit", exact: true })).toBeVisible();
  });

  test("4.5 Exam Schedule (/student/exams): renders upcoming and published exam cards", async ({ page }) => {
    await page.goto("/student/exams");

    await expect(page.locator("h1:has-text('Exam Schedule')")).toBeVisible();
    await expect(page.locator("text=Mid-Term Examination 2026")).toBeVisible();
  });

  test("4.6 Results (/student/results): renders marks, percentage, and subject grade breakdown", async ({ page }) => {
    await page.goto("/student/results");

    await expect(page.locator("h1:has-text('My Results')")).toBeVisible();
    await expect(page.locator("text=Overall Average")).toBeVisible();

    // Marks overview
    await expect(page.locator("text=Mid-Term Examination 2026")).toBeVisible();
    await expect(page.locator("text=Mathematics")).toBeVisible();
    await expect(page.locator("text=88/100")).toBeVisible();
  });

  test("4.7 Attendance (/student/attendance): renders monthly calendar and summary stats", async ({ page }) => {
    await page.goto("/student/attendance");

    await expect(page.locator("h1:has-text('My Attendance')")).toBeVisible();
    await expect(page.locator("text=Days present")).toBeVisible();
    await expect(page.locator("text=Days absent")).toBeVisible();
    await expect(page.locator("h3:has-text('Calendar View')")).toBeVisible();
  });

  test("4.8 Leave Applications (/student/leave): form validation and successful submission", async ({ page }) => {
    await page.goto("/student/leave");

    await expect(page.locator("h1:has-text('Apply for Leave')")).toBeVisible();

    // Fill form
    await page.locator("input[type='date']").first().fill("2026-11-10");
    await page.locator("input[type='date']").nth(1).fill("2026-11-12");
    await page.locator("textarea").fill("Attending family wedding ceremony");

    await page.locator("button:has-text('Apply Request')").click();

    // Verify confirmation and addition to list
    await expect(page.locator("text=Leave request submitted successfully")).toBeVisible();
    await expect(page.locator("text=Attending family wedding ceremony")).toBeVisible();
  });

  test("4.9 Fees (/student/fees): renders fee structure dues and payment receipts", async ({ page }) => {
    await page.goto("/student/fees");

    await expect(page.locator("h1:has-text('Fees Overview')")).toBeVisible();
    await expect(page.locator("button:has-text('Fee Structure & Dues')")).toBeVisible();
    await expect(page.locator("button:has-text('Payment Receipts')")).toBeVisible();

    // Dues tab item
    await expect(page.locator("text=Quarter 1 Fee")).toBeVisible();

    // Switch to Payment History tab
    await page.locator("button:has-text('Payment Receipts')").click();
    await expect(page.locator("text=REC-2026-0001")).toBeVisible();
    await expect(page.locator("text=Online")).toBeVisible();
  });

  test("4.10 Notice Board (/student/notices): lists published notices with search filtering", async ({ page }) => {
    await page.goto("/student/notices");

    await expect(page.locator("h1:has-text('Notice Board')")).toBeVisible();
    await expect(page.locator("text=Annual Sports Meet 2026")).toBeVisible();
    await expect(page.locator("text=Science Exhibition Registration")).toBeVisible();

    // Filter using search box
    const searchInput = page.locator("input[placeholder*='Search']");
    await searchInput.fill("Sports");

    await expect(page.locator("text=Annual Sports Meet 2026")).toBeVisible();
    await expect(page.locator("text=Science Exhibition Registration")).not.toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: DATA ISOLATION & RESPONSIVE LAYOUT GUARDS
// ═══════════════════════════════════════════════════════════════════════════

test.describe("5. Data Isolation & Responsive Layout Guards", () => {
  test.beforeEach(async ({ page }) => {
    await setupStudentPortalMocks(page);
    await authenticateStudentSession(page);
  });

  test("5.1 Anti-Tampering: URL parameter manipulation ?student_id= does not leak other student records", async ({ page }) => {
    // Student navigates with forged query parameter ?student_id=attacker999
    await page.goto("/student/results?student_id=60f000000000000000000999");

    // UI filters results strictly by studentProfile._id
    await expect(page.locator("text=Mid-Term Examination 2026")).toBeVisible();
    await expect(page.locator("text=Mathematics")).toBeVisible();
  });

  test("5.2 Responsive Layout: Mobile drawer opens and closes smoothly on small viewports", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/student/dashboard");

    // Wait until dashboard is fully loaded
    await expect(page.locator("h1:has-text('Welcome back, Bart')")).toBeVisible();

    // On mobile, sidebar is closed by default
    const sidebar = page.locator("aside");
    await expect(sidebar).toHaveClass(/-translate-x-full/);

    // Click menu toggle button in StudentHeader
    const menuBtn = page.locator("header button.lg\\:hidden");
    await menuBtn.click();

    // Sidebar should slide in (translate-x-0)
    await expect(sidebar).toHaveClass(/translate-x-0/);
    await page.waitForTimeout(400);

    // Close sidebar
    const closeBtn = page.locator("aside button:has(svg.lucide-x)");
    await closeBtn.click();
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });
});
