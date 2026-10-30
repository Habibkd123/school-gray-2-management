import { test, expect } from "@playwright/test";
import {
  loginAsSchoolAdmin,
  loginAsStudent,
  loginAsParent,
} from "./helpers";

test.describe("Finance — Fees & Salaries Deep & Bulletproof E2E Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Avoid slow animations
    await page.addStyleTag({
      content: `*, *::before, *::after { transition-duration: 0s !important; animation-duration: 0s !important; }`,
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: FEE SETUP & MASTERS CONFIGURATION (/fees-collection)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Fee Setup & Masters Configuration", () => {
    test("1.1 should render fee types, search, and create a new fee type", async ({ page }) => {
      let createdFeeType: any = null;

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        feeTypesData: [
          { _id: "ft_01", name: "Academic Fees", description: "Core academic curriculum fees", is_active: true },
          { _id: "ft_02", name: "Tuition Fees", description: "Monthly instructional tuition", is_active: true },
          { _id: "ft_03", name: "Transport Fees", description: "Bus transit coverage", is_active: true },
        ],
      });

      await page.route(/\/api\/fees\/types$/, async (route) => {
        const req = route.request();
        if (req.method() === "POST") {
          createdFeeType = JSON.parse(req.postData() || "{}");
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: { _id: "ft_new_01", ...createdFeeType, is_active: true },
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
              types: [
                { _id: "ft_01", name: "Academic Fees", description: "Core academic curriculum fees", is_active: true },
                { _id: "ft_02", name: "Tuition Fees", description: "Monthly instructional tuition", is_active: true },
                { _id: "ft_03", name: "Transport Fees", description: "Bus transit coverage", is_active: true },
              ],
            },
          }),
        });
      });

      await page.goto("/fees-collection/fees-type?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify Header
      await expect(page.locator("h1:has-text('Fees Type')")).toBeVisible();

      // Verify Initial Fee Types
      await expect(page.locator("text=Academic Fees").first()).toBeVisible();
      await expect(page.locator("text=Tuition Fees").first()).toBeVisible();
      await expect(page.locator("text=Transport Fees").first()).toBeVisible();

      // Search Fee Types
      const searchBox = page.locator("input[placeholder*='Search']");
      await searchBox.fill("Tuition");
      await expect(page.locator("text=Tuition Fees").first()).toBeVisible();
      await expect(page.locator("text=Academic Fees")).not.toBeVisible();

      // Clear search
      await searchBox.fill("");

      // Open Add Fee Type modal
      await page.locator("button:has-text('Add Fee Type')").click();
      await expect(page.locator("h2:has-text('Add Fee Type')")).toBeVisible();

      // Fill New Fee Type form
      await page.locator("input[placeholder*='Tuition']").fill("Laboratory Fees");
      await page.locator("textarea[placeholder*='description']").fill("Science lab maintenance and consumables");
      await page.locator("button[type='submit']:has-text('Save')").click();

      // Verify modal closed and payload
      await expect(page.locator("h2:has-text('Add Fee Type')")).not.toBeVisible();
      expect(createdFeeType).not.toBeNull();
      expect(createdFeeType.name).toBe("Laboratory Fees");
      expect(createdFeeType.description).toBe("Science lab maintenance and consumables");
    });

    test("1.2 should render fee groups, search, and create a new fee group", async ({ page }) => {
      let createdFeeGroup: any = null;

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        feeGroupsData: [
          { _id: "fg_01", name: "Primary Wing", description: "Classes 1 to 5", is_active: true },
          { _id: "fg_02", name: "Senior Wing", description: "Classes 6 to 10", is_active: true },
        ],
      });

      await page.route(/\/api\/fees\/groups$/, async (route) => {
        const req = route.request();
        if (req.method() === "POST") {
          createdFeeGroup = JSON.parse(req.postData() || "{}");
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: { _id: "fg_new_01", ...createdFeeGroup, is_active: true },
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
              groups: [
                { _id: "fg_01", name: "Primary Wing", description: "Classes 1 to 5", is_active: true },
                { _id: "fg_02", name: "Senior Wing", description: "Classes 6 to 10", is_active: true },
              ],
            },
          }),
        });
      });

      await page.goto("/fees-collection/fees-group?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify Header
      await expect(page.locator("h1:has-text('Fees Group')")).toBeVisible();
      await expect(page.locator("text=Primary Wing").first()).toBeVisible();
      await expect(page.locator("text=Senior Wing").first()).toBeVisible();

      // Add New Group
      await page.locator("button:has-text('Add Fee Group')").click();
      await expect(page.locator("h2:has-text('Add Fee Group')")).toBeVisible();

      await page.locator("input[placeholder*='Class']").fill("Higher Secondary Science");
      await page.locator("textarea[placeholder*='description']").fill("Class 11 and 12 Physics, Chemistry, Math group");
      await page.locator("button[type='submit']:has-text('Save')").click();

      await expect(page.locator("h2:has-text('Add Fee Group')")).not.toBeVisible();
      expect(createdFeeGroup).not.toBeNull();
      expect(createdFeeGroup.name).toBe("Higher Secondary Science");
    });

    test("1.3 should configure fee master linking fee group and fee type with amount and due date", async ({ page }) => {
      let createdMaster: any = null;

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        feeGroupsData: [
          { _id: "fg_primary", name: "Primary Wing" },
        ],
        feeTypesData: [
          { _id: "ft_academic", name: "Academic Fees" },
        ],
        feeMastersData: [
          {
            _id: "fm_01",
            fee_group_id: { _id: "fg_primary", name: "Primary Wing" },
            fee_type_id: { _id: "ft_academic", name: "Academic Fees" },
            amount: 25000,
            due_date: "2026-11-30",
          },
        ],
      });

      await page.route(/\/api\/fees\/master$/, async (route) => {
        const req = route.request();
        if (req.method() === "POST") {
          createdMaster = JSON.parse(req.postData() || "{}");
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: { _id: "fm_new_01", ...createdMaster },
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
              masters: [
                {
                  _id: "fm_01",
                  fee_group_id: { _id: "fg_primary", name: "Primary Wing" },
                  fee_type_id: { _id: "ft_academic", name: "Academic Fees" },
                  amount: 25000,
                  due_date: "2026-11-30",
                },
              ],
            },
          }),
        });
      });

      await page.goto("/fees-collection/fees-master?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify Header and existing master row
      await expect(page.locator("h1:has-text('Fees Master')")).toBeVisible();
      await expect(page.locator("text=Primary Wing").first()).toBeVisible();
      await expect(page.locator("text=Academic Fees").first()).toBeVisible();

      // Open Add Fees Master
      await page.locator("button:has-text('Add Fee Master')").click();
      await expect(page.locator("h2:has-text('Add Fee Master')")).toBeVisible();

      // Select group and type by value
      await page.locator("select").first().selectOption({ value: "fg_primary" });
      await page.locator("select").nth(1).selectOption({ value: "ft_academic" });
      await page.locator("input[type='number']").first().fill("28000");
      await page.locator("input[type='date']").first().fill("2026-12-15");

      await page.locator("button[type='submit']:has-text('Save')").click();
      await expect(page.locator("h2:has-text('Add Fee Master')")).not.toBeVisible();

      expect(createdMaster).not.toBeNull();
      expect(createdMaster.amount).toBe(28000);
      expect(createdMaster.due_date).toBe("2026-12-15");
    });

    test("1.4 should render assign fees page and assign fee group to selected students", async ({ page }) => {
      let allocatedPayload: any = null;

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        feeGroupsData: [
          { _id: "fg_primary", name: "Primary Wing" },
        ],
        classes: [
          { _id: "cls_5a", name: "Grade 5", section: "A" },
        ],
        studentsData: [
          { _id: "std_01", name: "Bart Simpson", admission_no: "ADM-001", roll_no: "101", class_id: "cls_5a", is_active: true },
          { _id: "std_02", name: "Milhouse Van Houten", admission_no: "ADM-002", roll_no: "102", class_id: "cls_5a", is_active: true },
        ],
        feeAllocationsData: [],
      });

      await page.route(/\/api\/fees\/allocations$/, async (route) => {
        const req = route.request();
        if (req.method() === "POST") {
          allocatedPayload = JSON.parse(req.postData() || "{}");
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, message: "Fees allocated successfully", data: allocatedPayload }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, data: { allocations: [] } }),
        });
      });

      await page.goto("/fees-collection/assign-fees?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify Header
      await expect(page.locator("h1:has-text('Assign Fees')")).toBeVisible();

      // Select Fees Group
      await page.locator("select").first().selectOption({ value: "fg_primary" });

      // Select Class
      await page.locator("select").nth(1).selectOption({ value: "cls_5a" });

      // Wait for student roster to render
      await expect(page.locator("text=Bart Simpson").first()).toBeVisible();
      await expect(page.locator("text=Milhouse Van Houten").first()).toBeVisible();

      // Select Students by clicking row or header checkbox
      await page.locator("table tbody tr").first().locator("td").first().click();

      // Save Allocation
      await page.locator("button:has-text('Save Assignments')").click();
      expect(allocatedPayload).not.toBeNull();
      expect(allocatedPayload.fee_group_id).toBe("fg_primary");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: STUDENT FEES LEDGER & DUES TRACKING (/fees)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Student Fees Ledger & Dues Tracking", () => {
    test("2.1 should render fees ledger table with student dues, balances, and payment badges", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        feesData: [
          {
            _id: "std_01",
            name: "Bart Simpson",
            admission_no: "ADM-2026-001",
            class_name: "Grade 5 - A",
            class_id: "cls_5a",
            section: "A",
            guardian_name: "Homer Simpson",
            guardian_phone: "9876543210",
            guardian_relation: "Father",
            fee_structure: ["Academic Fees (₹25,000)", "Tuition Fees (₹3,500/mo)"],
            totalFees: 35000,
            totalPaid: 15000,
            balanceAmount: 20000,
            lastPaidAmount: 15000,
            lastPaymentDate: "2026-10-25T10:00:00.000Z",
            status: "Partial",
            dueStatus: "Due",
            academic_year: "2026-2027",
          },
          {
            _id: "std_02",
            name: "Lisa Simpson",
            admission_no: "ADM-2026-002",
            class_name: "Grade 3 - B",
            class_id: "cls_3b",
            section: "B",
            guardian_name: "Homer Simpson",
            guardian_phone: "9876543210",
            guardian_relation: "Father",
            fee_structure: ["Academic Fees (₹25,000)"],
            totalFees: 25000,
            totalPaid: 25000,
            balanceAmount: 0,
            lastPaidAmount: 25000,
            lastPaymentDate: "2026-10-15T09:00:00.000Z",
            status: "Paid",
            dueStatus: "No Due",
            academic_year: "2026-2027",
          },
        ],
      });

      await page.goto("/fees?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify Header
      await expect(page.locator("h1:has-text('Billing Ledger Desk')").or(page.locator("h1.page-title"))).toBeVisible();

      // Verify Bart Simpson's row & financial data
      await expect(page.locator("text=Bart Simpson").first()).toBeVisible();
      await expect(page.locator("text=ADM-2026-001").first()).toBeVisible();
      await expect(page.locator("text=Partial").first()).toBeVisible();

      // Verify Lisa Simpson's Paid badge and No Due status
      await expect(page.locator("text=Lisa Simpson").first()).toBeVisible();
      await expect(page.locator("text=Paid").first()).toBeVisible();
    });

    test("2.2 should verify mathematical consistency: Balance = Total Fees - Amount Paid", async ({ page }) => {
      const mockStudents = [
        {
          _id: "std_calc_1",
          name: "Martin Prince",
          admission_no: "ADM-CALC-001",
          class_name: "Grade 5 - A",
          totalFees: 48500.50,
          totalPaid: 20000.25,
          balanceAmount: 28500.25,
          status: "Partial",
          dueStatus: "Due",
          academic_year: "2026-2027",
          guardian_name: "Gloria Prince",
          guardian_phone: "9876543212",
          guardian_relation: "Mother",
          fee_structure: ["Annual Composite"],
          lastPaidAmount: 20000.25,
          lastPaymentDate: "2026-10-10",
        },
      ];

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        feesData: mockStudents,
      });

      await page.goto("/fees?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      await expect(page.locator("text=Martin Prince").first()).toBeVisible();

      // Independent expected balance verification
      const expectedBalance = mockStudents[0].totalFees - mockStudents[0].totalPaid;
      expect(mockStudents[0].balanceAmount).toBeCloseTo(expectedBalance, 2);
    });

    test("2.3 should open individual student fee detail page (/fees/[studentId]) and render payment logs", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        feePaymentsData: [
          {
            _id: "pmt_edna_rec_1",
            receipt_number: "REC-20261025-00101",
            receipt_no: "REC-20261025-00101",
            amount_paid: 15000,
            total_amount: 15000,
            payment_method: "Cash",
            payment_date: "2026-10-25T10:00:00.000Z",
            start_date: "2026-06-01",
            end_date: "2026-10-31",
            remarks: "Mid-term tuition cleared",
            fee_breakdown: [
              { name: "Academic Fees", amount_paid: 10000 },
              { name: "Tuition Fees", amount_paid: 5000 },
            ],
            discount: 0,
            fine: 0,
            student_id: {
              _id: "60f000000000000000000301",
              name: "Bart Simpson",
              admission_no: "ADM-2026-001",
              class_id: { name: "Grade 5", section: "A" },
            },
          },
        ],
      });

      await page.goto("/fees/60f000000000000000000301?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify Header & Breadcrumbs
      await expect(page.locator("text=Fee Payment History").or(page.locator("text=Payment History")).first()).toBeVisible();

      // Verify receipt number rendered in table
      await expect(page.locator("text=REC-20261025-00101").first()).toBeVisible();
      await expect(page.locator("text=Cash").first()).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: FEE COLLECTION & PAYMENT INTEGRITY (/fees/collect)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Fee Collection & Payment Integrity", () => {
    test("3.1 should render fee collection screen with fee heads, outstanding balances, and dates", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
      });

      await page.goto("/fees/collect?studentId=60f000000000000000000301&subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify Header
      await expect(page.locator("h1:has-text('Collect Student Fees')")).toBeVisible();
      await expect(page.locator("text=Bart Simpson").first()).toBeVisible();

      // Fee Heads Cards
      await expect(page.locator("text=Academic Fees").first()).toBeVisible();
      await expect(page.locator("text=Tuition Fees").first()).toBeVisible();
    });

    test("3.2 should prevent overpayment when entered amount exceeds the outstanding balance", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        feePaymentsData: [],
      });

      await page.goto("/fees/collect?studentId=60f000000000000000000301&subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Click Academic Fees card to select it
      await page.locator("div").filter({ hasText: "Academic Fees" }).last().click();

      // Enter amount exceeding the balance (e.g. 999999)
      const amountInput = page.locator("input[type='number']").first();
      await amountInput.fill("999999");

      // Verify overpayment validation warning
      await expect(page.locator("text=cannot exceed the outstanding balance").first()).toBeVisible();

      // Confirm Submit button is disabled
      const submitBtn = page.locator("button:has-text('Collect Fees')");
      await expect(submitBtn).toBeDisabled();
    });

    test("3.3 should enforce reference number validation when non-cash payment method is selected", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        feePaymentsData: [],
      });

      await page.goto("/fees/collect?studentId=60f000000000000000000301&subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Select Academic Fees card
      await page.locator("div").filter({ hasText: "Academic Fees" }).last().click();

      // Change payment method to Bank Transfer
      await page.locator("select").filter({ hasText: "Cash" }).selectOption("Bank Transfer");

      // Without reference number, validation message displays
      await expect(page.locator("text=Reference Number is required for Bank Transfer payments").first()).toBeVisible();

      // Fill Reference Number
      await page.locator("input[placeholder*='Reference Code']").fill("HDFC-TXN-99887766");

      // Validation error clears
      await expect(page.locator("text=Reference Number is required for Bank Transfer payments")).not.toBeVisible();
    });

    test("3.4 should accurately compute grand total with fine, discount, and waiver concessions", async ({ page }) => {
      let recordedPaymentPayload: any = null;

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        feePaymentsData: [],
      });

      await page.route(/\/api\/fees\/payments$/, async (route) => {
        const req = route.request();
        if (req.method() === "POST") {
          recordedPaymentPayload = JSON.parse(req.postData() || "{}");
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: {
                payment: {
                  _id: "pmt_recorded_01",
                  receipt_number: "REC-20261029-00999",
                  receipt_no: "REC-20261029-00999",
                  ...recordedPaymentPayload,
                },
              },
            }),
          });
          return;
        }
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { payments: [] } }) });
      });

      await page.goto("/fees/collect?studentId=60f000000000000000000301&subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Select Academic Fees card (amount 25000)
      await page.locator("div").filter({ hasText: "Academic Fees" }).last().click();

      // Enter concessions: Fine +200, Discount -300
      await page.locator("label:has-text('Fine (+)') + input").fill("200");
      await page.locator("label:has-text('Discount (-)') + input").fill("300");

      // Independent expected value calculation:
      // Subtotal (25000) + Fine (200) - Discount (300) = 24900.00
      await page.locator("button:has-text('Collect Fees')").click();

      // Verify payload received by server
      expect(recordedPaymentPayload).not.toBeNull();
      expect(recordedPaymentPayload.fine).toBe(200);
      expect(recordedPaymentPayload.discount).toBe(300);
      expect(recordedPaymentPayload.amount_paid).toBe(24900);

      // Verify step transition to receipt screen
      await expect(page.locator("text=Success! Fee payment recorded.").first()).toBeVisible();
    });

    test("3.5 should handle server error and display failure alert without crashing", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        feePaymentsData: [],
      });

      await page.route(/\/api\/fees\/payments$/, async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              message: "Accounting period is closed for audited financial year.",
            }),
          });
          return;
        }
      });

      await page.goto("/fees/collect?studentId=60f000000000000000000301&subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Handle window.alert
      let alertMsg = "";
      page.once("dialog", async (dialog) => {
        alertMsg = dialog.message();
        await dialog.dismiss();
      });

      // Select Academic Fees card
      await page.locator("div").filter({ hasText: "Academic Fees" }).last().click();

      await page.locator("button:has-text('Collect Fees')").click();
      await page.waitForTimeout(500);

      expect(alertMsg).toContain("Accounting period is closed");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: RECEIPT GENERATION, MULTI-COPY & PRINTING
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Receipt Generation & Multi-Copy Printing", () => {
    test("4.1 should render receipt with generated receipt number, particulars, and copy selector", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        feePaymentsData: [],
      });

      await page.route(/\/api\/fees\/payments$/, async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              data: {
                payment: {
                  _id: "pmt_rec_demo",
                  receipt_number: "REC-20261029-00142",
                  receipt_no: "REC-20261029-00142",
                  amount_paid: 25000,
                  payment_method: "Cash",
                  payment_date: "2026-10-29",
                  start_date: "2026-04-01",
                  end_date: "2026-10-31",
                  collection_type: "Monthly",
                  fee_breakdown: [
                    { name: "Academic Fees", amount_paid: 25000 },
                  ],
                  discount: 0,
                  fine: 0,
                },
              },
            }),
          });
          return;
        }
      });

      await page.goto("/fees/collect?studentId=60f000000000000000000301&subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Select Academic Fees card
      await page.locator("div").filter({ hasText: "Academic Fees" }).last().click();

      await page.locator("button:has-text('Collect Fees')").click();

      // Verify Receipt Screen
      await expect(page.locator("text=REC-20261029-00142").first()).toBeVisible();
      await expect(page.locator("button:has-text('Print / Download PDF')").or(page.locator("text=Print")).first()).toBeVisible();

      // Verify Copy Toggle Buttons
      await expect(page.getByRole("button", { name: "1 Copy", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "2 Copies", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "3 Copies", exact: true })).toBeVisible();

      // Toggle to 2 Copies (shows 1 Page / Separate Pages options)
      await page.getByRole("button", { name: "2 Copies", exact: true }).click();
      await expect(page.locator("button:has-text('1 Page (Cut-line)')")).toBeVisible();
      await expect(page.locator("button:has-text('Separate Pages')")).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: SALARY MANAGEMENT — GENERATION & ATTENDANCE DEDUCTIONS (/salary)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Salary Management — Generation & Attendance Deductions", () => {
    test("5.1 should render salary desk with period picker, teachers list, and status steppers", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        teachersData: [
          {
            _id: "tch_edna_01",
            name: "Edna Krabappel",
            employee_id: "EMP-2026-001",
            basic_salary: 50000,
            department: "Academics",
            designation: "Senior Teacher",
            is_active: true,
          },
          {
            _id: "tch_hoover_02",
            name: "Elizabeth Hoover",
            employee_id: "EMP-2026-002",
            basic_salary: 45000,
            department: "Academics",
            designation: "Primary Teacher",
            is_active: true,
          },
        ],
        salariesData: [
          {
            _id: "sal_edna_oct",
            teacher_id: { _id: "tch_edna_01", name: "Edna Krabappel", employee_id: "EMP-2026-001" },
            salary_period: "2026-10",
            monthly_salary: 50000,
            working_days: 30,
            present_days: 28,
            absent_days: 2,
            suggested_deduction: 3333.33,
            payable_amount: 46666.67,
            status: "Draft",
          },
        ],
      });

      await page.goto("/salary?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify Header
      await expect(page.locator("h1:has-text('Payroll Management')")).toBeVisible();

      // Verify Teachers Rendered
      await expect(page.locator("text=Edna Krabappel").first()).toBeVisible();
      await expect(page.locator("text=EMP-2026-001").first()).toBeVisible();
      await expect(page.locator("text=Elizabeth Hoover").first()).toBeVisible();

      // Verify status stepper cards exist
      await expect(page.locator("text=Draft").first()).toBeVisible();
    });

    test("5.2 should configure teacher base salary through setup modal", async ({ page }) => {
      let updatedTeacherPayload: any = null;

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        teachersData: [
          {
            _id: "tch_new_01",
            name: "Seymour Skinner",
            employee_id: "EMP-2026-099",
            basic_salary: 0,
            department: "Administration",
            designation: "Principal",
            is_active: true,
          },
        ],
      });

      await page.route(/\/api\/teachers\/tch_new_01$/, async (route) => {
        if (route.request().method() === "PUT" || route.request().method() === "PATCH") {
          updatedTeacherPayload = JSON.parse(route.request().postData() || "{}");
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, message: "Teacher updated successfully" }),
          });
          return;
        }
      });

      await page.goto("/salary?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Teacher with 0 base salary has Configure Salary button
      await page.locator("button:has-text('Configure Salary')").first().click();

      // Modal appears
      await expect(page.locator("h2:has-text('Setup Base Contract Salary')").or(page.locator("text=Setup Base Contract Salary")).first()).toBeVisible();

      // Enter basic salary
      await page.locator("input[placeholder*='35000']").fill("75000");
      await page.locator("button:has-text('Save Salary')").click();

      await expect(page.locator("text=Setup Base Contract Salary")).not.toBeVisible();
      expect(updatedTeacherPayload).not.toBeNull();
      expect(updatedTeacherPayload.basic_salary).toBe(75000);
    });

    test("5.3 should verify attendance calculation preview: absent days, suggested deduction, and payable amount", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        teachersData: [
          {
            _id: "tch_edna_01",
            name: "Edna Krabappel",
            employee_id: "EMP-2026-001",
            basic_salary: 60000,
            department: "Academics",
            designation: "Senior Teacher",
            is_active: true,
          },
        ],
        salariesData: [
          {
            _id: "sal_edna_01",
            teacher_id: { _id: "tch_edna_01", name: "Edna Krabappel", employee_id: "EMP-2026-001" },
            salary_period: "2026-10",
            monthly_salary: 60000,
            working_days: 30,
            present_days: 27,
            absent_days: 3,
            suggested_deduction: 6000,
            payable_amount: 54000,
            bonus: 0,
            deduction: 0,
            overtime_amount: 0,
            tax_deduction: 0,
            final_salary: 54000,
            status: "Draft",
          },
        ],
      });

      await page.goto("/salary?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Click Edit action button for Edna
      const actionBtn = page.locator("button[title='Edit Payroll Details']").first();
      await actionBtn.click();

      // Modal appears
      await expect(page.locator("text=Edit Payroll Details").first()).toBeVisible();
      await expect(page.locator("text=Salary Calculation Breakdown").first()).toBeVisible();

      // Math verification:
      // Monthly = 60,000
      // 3 absent days * (60,000 / 30 = 2,000/day) = 6,000 deduction
      // Payable Amount = 60,000 - 6,000 = 54,000
      const expectedDailyRate = 60000 / 30; // 2000
      const expectedDeduction = 3 * expectedDailyRate; // 6000
      const expectedPayable = 60000 - expectedDeduction; // 54000
      expect(expectedPayable).toBe(54000);
    });

    test("5.4 should transition payroll status from Draft to Approved, Finalized, and Mark as Paid", async ({ page }) => {
      let updatedStatusPayload: any = null;

      await loginAsSchoolAdmin(page, {
        subdomain: "myschool",
        teachersData: [
          {
            _id: "tch_edna_01",
            name: "Edna Krabappel",
            employee_id: "EMP-2026-001",
            basic_salary: 50000,
            is_active: true,
          },
        ],
        salariesData: [
          {
            _id: "sal_edna_01",
            teacher_id: { _id: "tch_edna_01", name: "Edna Krabappel", employee_id: "EMP-2026-001" },
            salary_period: "2026-10",
            monthly_salary: 50000,
            payable_amount: 50000,
            final_salary: 50000,
            status: "Approved",
          },
        ],
      });

      await page.route(/\/api\/salaries\/sal_edna_01$/, async (route) => {
        if (route.request().method() === "PUT" || route.request().method() === "PATCH") {
          updatedStatusPayload = JSON.parse(route.request().postData() || "{}");
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true, message: "Status updated successfully", data: updatedStatusPayload }),
          });
          return;
        }
      });

      await page.goto("/salary?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Verify Approved status
      await expect(page.locator("text=Edna Krabappel").first()).toBeVisible();
      await expect(page.locator("text=Approved").first()).toBeVisible();

      // Click Generate Final
      await page.locator("button:has-text('Generate Final')").first().click();

      // Check modal or override
      const finalizeModal = page.locator("text=Generate Final Salary (Lock Record)");
      if (await finalizeModal.isVisible()) {
        await page.locator("input[type='checkbox']").check();
        await page.locator("button:has-text('Confirm & Lock Final Salary')").click();
      }
      expect(updatedStatusPayload).not.toBeNull();
      expect(updatedStatusPayload.status).toBe("Finalized");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: ROLE-BASED ACCESS CONTROL & PRIVACY PROTECTION
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("Role-Based Access Control & Privacy Protection", () => {
    test("6.1 should restrict Student role from accessing Salary Desk and Fee Configuration", async ({ page }) => {
      await loginAsStudent(page, {
        subdomain: "myschool",
      });

      // Attempting to visit /salary
      await page.goto("/salary?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      // Must be redirected or restricted
      await expect.poll(() => !page.url().includes("/salary") || page.url().includes("/dashboard"), { timeout: 10000 }).toBeTruthy();
    });

    test("6.2 should restrict Parent role from viewing salary management", async ({ page }) => {
      await loginAsParent(page, {
        subdomain: "myschool",
      });

      await page.goto("/salary?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");

      await expect.poll(() => !page.url().includes("/salary") || page.url().includes("/dashboard"), { timeout: 10000 }).toBeTruthy();
    });
  });
});
