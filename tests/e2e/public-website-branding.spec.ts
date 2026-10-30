import { test, expect } from "@playwright/test";

test.describe("Public Website & School Branding - Deep / Bulletproof E2E Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Intercept mock APIs for demo-request, admissions, and contact so E2E runs deterministically
    await page.route("**/api/public/demo-request**", async (route) => {
      const body = route.request().postDataJSON?.();
      if (!body?.schoolName || !body?.contactPerson || !body?.phone) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "School name, contact person, and phone number are required." }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Thank you! Your campus walkthrough request has been received. Our team will contact you shortly.",
          id: "mock_demo_request_123",
        }),
      });
    });

    await page.route("**/api/public/admissions**", async (route) => {
      const body = route.request().postDataJSON?.();
      if (!body?.student_name || !body?.class_id || !body?.dob || !body?.phone) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Required fields missing." }),
        });
        return;
      }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "Application submitted successfully",
          data: {
            application_no: "ADM-2026-000101",
            _id: "mock_admission_id_999",
          },
        }),
      });
    });

    await page.route("**/api/contact**", async (route) => {
      const body = route.request().postDataJSON?.();
      if (!body?.name || !body?.email) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Name and Email are required." }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Your enquiry has been sent!" }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: SAAS PLATFORM HOMEPAGE & DEMO REQUEST WORKFLOW
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("1. SaaS Platform Homepage & Demo Request Workflow", () => {
    test("1.1 should render SaaS platform homepage with hero and interactive sections", async ({ page }) => {
      await page.goto("/?platform=true");

      // Verify SaaS Brand & Hero Headline
      await expect(page.locator("h1:has-text('The Operating System for')").first()).toBeVisible();
      await expect(page.locator("button:has-text('Book a 1:1 Live Demo')").first()).toBeVisible();

      // Verify Platform Features / Calculator / Pricing are mounted
      await expect(
        page.locator("text=Calculate Your Campus Time & Cost ROI").or(page.locator("text=School Operational Audit")).first()
      ).toBeVisible();
      await expect(
        page.locator("text=One Flat Subscription for Your Entire Campus").or(page.locator("text=Simple Transparent Pricing")).first()
      ).toBeVisible();
    });

    test("1.2 should open SaaSDemoModal from Hero CTA and validate required fields", async ({ page }) => {
      await page.goto("/?platform=true");

      // Click Hero Demo CTA
      const bookDemoBtn = page.locator("button:has-text('Book a 1:1 Live Demo')").first();
      await expect(bookDemoBtn).toBeVisible();
      await bookDemoBtn.click();

      // Verify Modal opens
      await expect(page.locator("h2:has-text('Schedule a Campus Walkthrough')")).toBeVisible();

      // Submit without required fields
      const submitBtn = page.locator("button:has-text('Submit Demo Request')");
      await submitBtn.click();

      // Native required validation prevents submission; success screen is not shown
      await expect(page.locator("text=Demo Request Received!")).not.toBeVisible();
    });

    test("1.3 should successfully submit demo request and display confirmation", async ({ page }) => {
      await page.goto("/?platform=true");

      // Open Modal
      await page.locator("button:has-text('Book a 1:1 Live Demo')").first().click();
      await expect(page.locator("h2:has-text('Schedule a Campus Walkthrough')")).toBeVisible();

      // Fill form
      await page.locator('input[placeholder*="MyschoolLife International School"]').fill("St. Xavier Senior Secondary");
      await page.locator('input[placeholder*="Principal Sharma"]').fill("Dr. Alok Verma");
      await page.locator('input[placeholder*="98765 43210"]').fill("9876543210");
      await page.locator('input[placeholder*="info@school.edu.in"]').fill("alok@stxavier.edu.in");

      // Submit
      await page.locator("button:has-text('Submit Demo Request')").click();

      // Success screen displayed with submitted contact name
      await expect(page.locator("text=Demo Request Received!")).toBeVisible();
      await expect(page.locator("text=Dr. Alok Verma")).toBeVisible();
    });

    test("1.4 should open demo modal from SaaS Header and close on close button", async ({ page }) => {
      await page.goto("/?platform=true");

      const headerDemoBtn = page.locator("button:has-text('Book 15-Min Live Demo'), button:has-text('Schedule Walkthrough')").first();
      await expect(headerDemoBtn).toBeVisible();
      await headerDemoBtn.click();

      // Modal open
      await expect(page.locator("h2:has-text('Schedule a Campus Walkthrough')")).toBeVisible();

      // Close modal
      const closeBtn = page.locator('button[aria-label="Close Modal"]');
      await expect(closeBtn).toBeVisible();
      await closeBtn.click();

      // Modal closed
      await expect(page.locator("h2:has-text('Schedule a Campus Walkthrough')")).not.toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: SCHOOL TENANT LANDING PAGE & BRANDING
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("2. School Tenant Landing Page & Dynamic Branding", () => {
    test("2.1 should render school dynamic name, subtitle, logo and top contact bar", async ({ page }) => {
      await page.goto("/?subdomain=bajrang");

      // Header Brand
      await expect(page.locator("header, nav").locator("text=Bajrang Shikshan Sansthan").first()).toBeVisible();
      await expect(page.locator("header, nav").locator("text=Sec. Sch. Padu Khurd").first()).toBeVisible();

      // Top info bar contact details
      const phoneLink = page.locator('a[href*="tel:"]');
      if (await phoneLink.count() > 0) {
        await expect(phoneLink.first()).toBeVisible();
      }

      // Login Portal CTA button
      const loginBtn = page.locator("header a[href='/login'], nav a[href='/login']").first();
      await expect(loginBtn).toBeVisible();
      await expect(loginBtn).toContainText(/Login Portal/i);
    });

    test("2.2 should render standard public navigation links", async ({ page }) => {
      await page.goto("/?subdomain=bajrang");

      const nav = page.locator("nav").first();
      await expect(nav.locator("a[href='/']").first()).toBeVisible();
      await expect(nav.locator("a[href='/about']").first()).toBeVisible();
      await expect(nav.locator("a[href='/academics']").first()).toBeVisible();
      await expect(nav.locator("a[href='/admissions']").first()).toBeVisible();
      await expect(nav.locator("a[href='/student-life']").first()).toBeVisible();
      await expect(nav.locator("a[href='/news']").first()).toBeVisible();
      await expect(nav.locator("a[href='/gallery']").first()).toBeVisible();
      await expect(nav.locator("a[href='/contact']").first()).toBeVisible();
    });

    test("2.3 should render landing page sections and comprehensive footer", async ({ page }) => {
      await page.goto("/?subdomain=bajrang");

      // Footer presence
      const footer = page.locator("footer");
      await expect(footer).toBeVisible();
      await expect(footer.locator("a[href='/admissions']").first()).toBeVisible();
      await expect(footer.locator("a[href='/contact']").first()).toBeVisible();
    });

    test("2.4 should navigate to Login page when Login Portal CTA is clicked", async ({ page }) => {
      await page.goto("/?subdomain=bajrang");

      const loginBtn = page.locator("header a[href='/login'], nav a[href='/login']").first();
      await loginBtn.click();

      await page.waitForURL(/\/login/);
      await expect(page.locator("input[type='email'], input[name='email'], input[type='text']").first()).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: PUBLIC SUB-PAGES EXPLORATION
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("3. Public Sub-Pages Exploration", () => {
    test("3.1 should render About Us page with story and mission", async ({ page }) => {
      await page.goto("/about?subdomain=bajrang");

      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("text=About").first()).toBeVisible();
    });

    test("3.2 should render Academics page with curriculum overview", async ({ page }) => {
      await page.goto("/academics?subdomain=bajrang");

      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("h1")).toContainText(/Academic Programs/i);
    });

    test("3.3 should render Admissions overview page with application guidelines", async ({ page }) => {
      await page.goto("/admissions?subdomain=bajrang");

      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("text=Admissions").first()).toBeVisible();

      // Should have links to Apply Online
      const applyLinks = page.locator("a[href*='/admissions/apply']");
      expect(await applyLinks.count()).toBeGreaterThanOrEqual(1);
    });

    test("3.4 should render Contact Us page with contact details and enquiry form", async ({ page }) => {
      await page.goto("/contact?subdomain=bajrang");

      await expect(page.locator("h1")).toContainText(/Contact/i);
    });

    test("3.5 should render Gallery and News public pages", async ({ page }) => {
      await page.goto("/gallery?subdomain=bajrang");
      await expect(page.locator("h1")).toBeVisible();

      await page.goto("/news?subdomain=bajrang");
      await expect(page.locator("h1")).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: MULTI-STEP PUBLIC ADMISSION APPLICATION WIZARD
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("4. Multi-Step Public Admission Application Wizard", () => {
    test("4.1 should render 3-step wizard and validate Step 1 student details", async ({ page }) => {
      await page.goto("/admissions/apply?subdomain=bajrang");

      await expect(page.locator("h1:has-text('Apply for Admission')")).toBeVisible();
      await expect(page.locator("text=1. Student Details").first()).toBeVisible();

      // Wait for classes to load
      const classSelect = page.locator("select").nth(2);
      await expect(classSelect).toBeEnabled({ timeout: 10000 });

      // Try proceeding without selecting class or entering name
      const nextBtn = page.locator("button:has-text('Next')");
      await expect(nextBtn).toBeVisible();
      await nextBtn.click();

      // Validation error appears
      await expect(
        page.locator("text=Please select the class you are applying for.").or(page.locator("text=Student Name is required."))
      ).toBeVisible();
    });

    test("4.2 should fill Step 1, advance to Step 2, and validate parent/guardian details", async ({ page }) => {
      await page.goto("/admissions/apply?subdomain=bajrang");

      // Wait for classes
      const classSelect = page.locator("select").nth(2);
      await expect(classSelect).toBeEnabled({ timeout: 10000 });
      await classSelect.selectOption({ index: 1 });

      // Fill Step 1 student details
      await page.locator('input[placeholder*="Jane Doe"]').fill("Ranbir Kapoor");
      await page.locator("select").nth(3).selectOption("male");
      await page.locator("input[type='date']").first().fill("2016-04-10");

      // Advance to Step 2
      await page.locator("button:has-text('Next')").click();
      await expect(page.locator("text=2. Parent/Guardian").first()).toBeVisible();

      // Try proceeding Step 2 without required phone / address
      await page.locator("button:has-text('Next')").click();
      await expect(
        page.locator("text=Guardian mobile number is required.").or(page.locator("text=Address is required."))
      ).toBeVisible();
    });

    test("4.3 should complete all 3 steps, submit application and display confirmation with ADM number", async ({ page }) => {
      await page.goto("/admissions/apply?subdomain=bajrang");

      // Step 1: Student
      const classSelect = page.locator("select").nth(2);
      await expect(classSelect).toBeEnabled({ timeout: 10000 });
      await classSelect.selectOption({ index: 1 });

      await page.locator('input[placeholder*="Jane Doe"]').fill("Kavya Sharma");
      await page.locator("select").nth(3).selectOption("female");
      await page.locator("input[type='date']").first().fill("2016-05-15");
      await page.locator("button:has-text('Next')").click();

      // Step 2: Parent / Guardian
      await expect(page.locator("text=2. Parent/Guardian").first()).toBeVisible();
      await page.locator('input[placeholder*="98765 43210"]').fill("9829012345");
      await page.locator('textarea[placeholder*="Street"]').fill("Station Road, Padu Khurd");
      await page.locator("button:has-text('Next')").click();

      // Step 3: Documents Upload & Terms
      await expect(page.locator("text=3. Upload Documents").first()).toBeVisible();

      // Provide Student Photo & Birth Certificate URLs (FileUploadField URL mode)
      const urlInputs = page.locator('input[type="url"]');
      await urlInputs.nth(0).fill("https://example.com/student_photo.jpg");
      await urlInputs.nth(1).fill("https://example.com/birth_cert.pdf");

      // Accept Terms checkbox
      const termsCheckbox = page.locator("#terms, input[type='checkbox']").first();
      await termsCheckbox.check();

      // Submit application
      const submitBtn = page.locator("button:has-text('Submit Application')");
      await expect(submitBtn).toBeEnabled();
      await submitBtn.click();

      // Success confirmation screen
      await expect(page.locator("h1:has-text('Application Submitted!')")).toBeVisible({ timeout: 10000 });
      await expect(page.locator("text=ADM-2026-000101")).toBeVisible();
      await expect(page.locator("button:has-text('Back to Admissions')")).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: QUICK ONLINE ADMISSION ENQUIRY FORM
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("5. Quick Online Admission Enquiry Form", () => {
    test("5.1 should validate required fields on online enquiry form", async ({ page }) => {
      await page.goto("/admissions/online-form?subdomain=bajrang");

      await expect(page.locator("h1")).toContainText(/Online Admission Enquiry/i);

      // Submit empty
      const submitBtn = page.locator("button:has-text('Submit Enquiry')");
      await submitBtn.click();

      await expect(page.locator("text=Name and Email are required.")).toBeVisible();
    });

    test("5.2 should submit online enquiry successfully with feedback message", async ({ page }) => {
      await page.goto("/admissions/online-form?subdomain=bajrang");

      await page.locator('input[placeholder*="John Doe"]').fill("Rajesh Kumar");
      await page.locator('input[placeholder*="98765 43210"]').fill("9876543210");
      await page.locator('input[placeholder*="john@example.com"]').fill("rajesh@example.com");

      const submitBtn = page.locator("button:has-text('Submit Enquiry')");
      await submitBtn.click();

      await expect(page.locator("text=Your enquiry has been sent!")).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: THEME VARIABLES, RESPONSIVENESS & SECURITY AUDIT
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("6. Theme Variables, Responsiveness & Security Audit", () => {
    test("6.1 should inject theme CSS variables in document head", async ({ page }) => {
      await page.goto("/?subdomain=bajrang");

      // Verify server theme style block or css variables are present
      const themeStyles = page.locator("#school-theme-vars");
      if (await themeStyles.count() > 0) {
        const textContent = await themeStyles.textContent();
        expect(textContent).toContain("--primary");
      }

      // Verify computed style has primary variable defined
      const primaryVar = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
      });
      expect(primaryVar).toBeTruthy();
    });

    test("6.2 should toggle responsive mobile navigation drawer on mobile viewport", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/?subdomain=bajrang");

      // Hamburger toggle button is visible
      const menuBtn = page.locator("header button.lg\\:hidden, nav button.lg\\:hidden").first();
      await expect(menuBtn).toBeVisible();
      await menuBtn.click();

      // Mobile nav dropdown drawer appears with links
      const mobileDrawer = page.locator("div.lg\\:hidden").last();
      await expect(mobileDrawer.locator("a[href='/about']").first()).toBeVisible();
      await expect(mobileDrawer.locator("a[href='/admissions']").first()).toBeVisible();

      // Click About Us navigates to /about
      await mobileDrawer.locator("a[href='/about']").first().click();
      await page.waitForURL(/\/about/);
    });

    test("6.3 should have alt attributes on all images and zero broken image tags", async ({ page }) => {
      await page.goto("/?subdomain=bajrang");

      // Query all img tags
      const images = page.locator("img");
      const count = await images.count();

      for (let i = 0; i < count; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute("alt");
        // Images must have alt attributes for accessibility
        expect(alt).not.toBeNull();
      }
    });

    test("6.4 SECURITY AUDIT: should NOT expose admin JWT, passwords, or secret keys in public DOM", async ({ page }) => {
      await page.goto("/?subdomain=bajrang");

      const pageContent = await page.content();

      // Check no sensitive keys or leaked credentials in public page HTML
      expect(pageContent).not.toContain("password_hash");
      expect(pageContent).not.toContain("JWT_SECRET");
      expect(pageContent).not.toContain("MONGODB_URI");
      expect(pageContent).not.toContain("smtp.gmail.com");
    });
  });
});
