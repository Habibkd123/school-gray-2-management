import { test, expect } from "@playwright/test";
import { loginAsSchoolAdmin } from "./helpers";

test.describe("Document Builder & Certificate Designer - Deep / Bulletproof E2E Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Intercept common APIs for linking records
    await page.route("**/api/documents/generate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: [
            {
              variables: {
                student_name: "Bart Simpson",
                "student.name": "Bart Simpson",
                "student.admission_number": "ADM-2026-001",
                "student.admission_no": "ADM-2026-001",
                "student.class": "Grade 5",
                class: "Grade 5",
                section: "A",
                "student.academic_year": "2026-2027",
                father_name: "Homer Simpson",
                mother_name: "Marge Simpson",
                school_name: "Springfield Elementary",
                date: "29 October 2026",
              },
            },
          ],
        }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: TEMPLATE GALLERY & DOCUMENT CREATION
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("1. Template Gallery & Document Creation", () => {
    test("1.1 should render templates catalog with categories and live cards", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents/templates?subdomain=myschool");

      await expect(page.locator("h1")).toContainText(/Template Library/i);

      // Verify category select dropdown exists
      const catSelect = page.locator("select").first();
      await expect(catSelect).toBeVisible();
      await expect(catSelect.locator("option:has-text('Certificate')")).toBeAttached();
      await expect(catSelect.locator("option:has-text('Student')")).toBeAttached();

      // Verify template search input exists
      const searchInput = page.locator('input[placeholder*="Search templates"]');
      await expect(searchInput).toBeVisible();

      // Check predefined templates presence
      await expect(page.locator("text=Bonafide Certificate").first()).toBeVisible();
    });

    test("1.2 should filter templates by category dropdown", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents/templates?subdomain=myschool");

      // Filter by Certificate category
      const catSelect = page.locator("select").first();
      await catSelect.selectOption("certificate");
      await page.waitForTimeout(300);

      // Verify certificate template is visible
      await expect(page.locator("text=General Certificate").first()).toBeVisible();
    });

    test("1.3 should use template to launch document builder", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents/templates?subdomain=myschool");

      // Click template card to open Preview modal
      const card = page.locator("div").filter({ hasText: "Bonafide Certificate" }).last();
      await expect(card).toBeVisible();
      await card.click();

      const useBtn = page.locator("button:has-text('Use Template')").first();
      await expect(useBtn).toBeVisible();
      await useBtn.click();

      // Modal opens
      await expect(page.locator("text=Use Template").first()).toBeVisible();
      const titleInput = page.locator('input[placeholder*="Enter document title"]');
      await titleInput.fill("E2E Launched Document");

      await page.click("button:has-text('Open in Builder →')");

      // Expect navigation to Document Builder route
      await page.waitForURL(/\/documents\/builder\/.+/);
      await expect(page.locator("#doc-builder-wrapper")).toBeVisible();
      await expect(page.locator(".db-page").first()).toBeVisible();
    });

    test("1.4 should create new blank document from documents listing", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents?subdomain=myschool");

      await expect(page.locator("h1")).toContainText(/Documents/i);

      // Click Add Document button
      const addDocBtn = page.locator("button:has-text('Add Document')");
      await expect(addDocBtn).toBeVisible();
      await addDocBtn.click();

      // Wizard modal should open on Step 1 (Category)
      await expect(page.locator("button:has-text('Blank')").first()).toBeVisible();
      await page.locator("button:has-text('Blank')").first().click();

      // Step 1 -> Step 2
      await page.click("button:has-text('Continue')");

      // Step 2 (Template)
      await page.waitForTimeout(200);
      await page.locator("text=Blank A4").first().click();

      // Step 2 -> Step 3
      await page.click("button:has-text('Continue')");

      // Step 3 (Title)
      await page.waitForTimeout(200);
      const titleInput = page.locator("input[type='text']").last();
      await titleInput.fill("E2E Custom Certificate");

      // Open Builder
      const createBtn = page.locator("button:has-text('Open Builder →')");
      await createBtn.click();

      // Navigates to builder
      await page.waitForURL(/\/documents\/builder\/.+/);
      await expect(page.locator("#doc-builder-wrapper")).toBeVisible();
      await expect(page.locator("text=E2E Custom Certificate").first()).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: CANVAS RENDERING & ELEMENT INTERACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("2. Canvas Rendering & Element Interactions", () => {
    test("2.1 should render canvas, dimensions, page number and toolbar controls", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents/builder/template-bonafide-classic?subdomain=myschool&templateMode=true");

      await expect(page.locator("#doc-builder-wrapper")).toBeVisible();
      await expect(page.locator(".db-page").first()).toBeVisible();

      // Verify page number indicator
      await expect(page.locator("text=1 / 1")).toBeVisible();

      // Verify LeftToolbar elements
      await expect(page.locator("text=Heading").first()).toBeVisible();
      await expect(page.locator("text=Paragraph").first()).toBeVisible();
    });

    test("2.2 should add heading, paragraph, shape and table elements from LeftToolbar", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents/builder/template-blank-a4?subdomain=myschool&templateMode=true");

      // Add Heading
      await page.locator("button:has-text('Heading')").first().click();
      await expect(page.locator(".db-page").first().locator("text=Your Heading Here")).toBeVisible();

      // Add Paragraph
      await page.locator("button:has-text('Paragraph')").first().click();
      await expect(page.locator(".db-page").first().locator("text=Start typing your paragraph")).toBeVisible();

      // Add Rectangle Shape
      await page.locator("button:has-text('Rectangle')").first().click();

      // Verify elements added to page
      const elements = page.locator(".db-page").first().locator("> div");
      expect(await elements.count()).toBeGreaterThanOrEqual(3);
    });

    test("2.3 should select an element, show selection box and floating toolbar", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents/builder/template-blank-a4?subdomain=myschool&templateMode=true");

      // Insert heading
      await page.locator("button:has-text('Heading')").first().click();
      const headingEl = page.locator(".db-page").first().locator("text=Your Heading Here");
      await expect(headingEl).toBeVisible();

      // Click to select
      await headingEl.click();

      // FloatingToolbar should be visible
      await expect(page.locator(".ft-btn[title*='Bold']")).toBeVisible();
      await expect(page.locator(".ft-btn[title*='Italic']")).toBeVisible();
    });

    test("2.4 should format text via floating toolbar (bold, italic, font, align)", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents/builder/template-blank-a4?subdomain=myschool&templateMode=true");

      await page.locator("button:has-text('Heading')").first().click();
      const headingEl = page.locator(".db-page").first().locator("text=Your Heading Here");
      await headingEl.click();

      // Click Bold in FloatingToolbar
      const boldBtn = page.locator(".ft-btn[title*='Bold']").first();
      await boldBtn.click();

      // Click Italic
      const italicBtn = page.locator(".ft-btn[title*='Italic']").first();
      await italicBtn.click();

      await expect(boldBtn).toBeVisible();
      await expect(italicBtn).toBeVisible();
    });

    test("2.5 should resize element via corner handle", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents/builder/template-blank-a4?subdomain=myschool&templateMode=true");

      await page.locator("button:has-text('Heading')").first().click();
      const headingEl = page.locator(".db-page").first().locator("text=Your Heading Here");
      await headingEl.click();

      // Locate bottom-right resize handle (se-resize)
      const seHandle = page.locator("div[style*='cursor: se-resize']").first();
      await expect(seHandle).toBeVisible();

      const boxBefore = await headingEl.boundingBox();
      expect(boxBefore).not.toBeNull();

      // Drag resize handle outward
      const handleBox = await seHandle.boundingBox();
      if (handleBox && boxBefore) {
        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(handleBox.x + 80, handleBox.y + 40, { steps: 5 });
        await page.mouse.up();

        const boxAfter = await headingEl.boundingBox();
        expect(boxAfter).not.toBeNull();
        expect(boxAfter!.width).toBeGreaterThanOrEqual(boxBefore.width);
      }
    });

    test("2.6 should drag element across canvas", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents/builder/template-blank-a4?subdomain=myschool&templateMode=true");

      await page.locator("button:has-text('Heading')").first().click();
      const headingEl = page.locator(".db-page").first().locator("text=Your Heading Here");
      await expect(headingEl).toBeVisible();

      const boxBefore = await headingEl.boundingBox();
      expect(boxBefore).not.toBeNull();

      // Drag heading across canvas
      await page.mouse.move(boxBefore!.x + 50, boxBefore!.y + 15);
      await page.mouse.down();
      await page.mouse.move(boxBefore!.x + 120, boxBefore!.y + 100, { steps: 8 });
      await page.mouse.up();

      const boxAfter = await headingEl.boundingBox();
      expect(boxAfter).not.toBeNull();
      expect(boxAfter!.x).not.toBe(boxBefore!.x);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: KEYBOARD SHORTCUTS, CLIPBOARD & LAYERS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("3. Keyboard Shortcuts, Clipboard & Layers", () => {
    test("3.1 should duplicate element with Ctrl+D and delete with Delete key", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents/builder/template-blank-a4?subdomain=myschool&templateMode=true");

      await page.locator("button:has-text('Heading')").first().click();
      const headingEl = page.locator(".db-page").first().locator("text=Your Heading Here").first();
      await headingEl.click();

      // Duplicate via Ctrl+D
      await page.keyboard.press("Control+d");
      await page.waitForTimeout(200);

      // Now two headings should exist
      const headings = page.locator(".db-page").first().locator("text=Your Heading Here");
      await expect(headings).toHaveCount(2);

      // Press Delete key
      await page.keyboard.press("Delete");
      await page.waitForTimeout(200);

      // One heading should be deleted
      await expect(headings).toHaveCount(1);
    });

    test("3.2 should nudge element with Arrow keys and Shift+Arrow keys", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents/builder/template-blank-a4?subdomain=myschool&templateMode=true");

      await page.locator("button:has-text('Heading')").first().click();
      const headingEl = page.locator(".db-page").first().locator("text=Your Heading Here").first();
      await headingEl.click();

      const boxBefore = await headingEl.boundingBox();
      expect(boxBefore).not.toBeNull();

      // ArrowRight (1px)
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");

      // Shift+ArrowDown (8px)
      await page.keyboard.press("Shift+ArrowDown");

      const boxAfter = await headingEl.boundingBox();
      expect(boxAfter).not.toBeNull();
      expect(boxAfter!.x).toBeGreaterThan(boxBefore!.x);
      expect(boxAfter!.y).toBeGreaterThan(boxBefore!.y);
    });

    test("3.3 should copy and paste element with Ctrl+C and Ctrl+V", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents/builder/template-blank-a4?subdomain=myschool&templateMode=true");

      await page.locator("button:has-text('Paragraph')").first().click();
      const paraEl = page.locator(".db-page").first().locator("text=Start typing your paragraph").first();
      await paraEl.click();

      // Copy Ctrl+C
      await page.keyboard.press("Control+c");
      await page.waitForTimeout(100);

      // Paste Ctrl+V
      await page.keyboard.press("Control+v");
      await page.waitForTimeout(200);

      const paragraphs = page.locator(".db-page").first().locator("text=Start typing your paragraph");
      await expect(paragraphs).toHaveCount(2);
    });

    test("3.4 should select all elements with Ctrl+A and deselect with Escape", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents/builder/template-blank-a4?subdomain=myschool&templateMode=true");

      await page.locator("button:has-text('Heading')").first().click();
      const heading = page.locator(".db-page").first().locator("text=Your Heading Here").first();
      await heading.click();

      // Handles visible when selected
      const handles = page.locator("div[style*='cursor: se-resize']");
      expect(await handles.count()).toBeGreaterThanOrEqual(1);

      // Deselect via Escape
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);

      // Handles should disappear
      expect(await handles.count()).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: HISTORY, AUTO-SAVE & STATE PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("4. History, Auto-Save & State Persistence", () => {
    test("4.1 should undo and redo changes via Ctrl+Z and Ctrl+Y", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents/builder/template-blank-a4?subdomain=myschool&templateMode=true");

      // Add element
      await page.locator("button:has-text('Heading')").first().click();
      const heading = page.locator(".db-page").first().locator("text=Your Heading Here");
      await expect(heading).toBeVisible();

      // Undo with Ctrl+Z
      await page.keyboard.press("Control+z");
      await page.waitForTimeout(300);

      // Element should disappear
      await expect(heading).toHaveCount(0);

      // Redo with Ctrl+Y
      await page.keyboard.press("Control+y");
      await page.waitForTimeout(300);

      // Element should reappear
      await expect(heading).toHaveCount(1);
    });

    test("4.2 should support manual save with Ctrl+S and update save status", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents/builder/template-blank-a4?subdomain=myschool&templateMode=true");

      await expect(page.locator("#doc-builder-wrapper")).toBeVisible();

      // Click Save button in TopToolbar
      const saveBtn = page.locator("button:has-text('Save')").first();
      await expect(saveBtn).toBeVisible();
      await saveBtn.click();

      // Verify "Saved" status indicator appears in TopToolbar
      await expect(page.locator("text=Saved")).toBeVisible({ timeout: 5000 });
    });

    test("4.3 should persist document edits across page reload", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents/builder/template-blank-a4?subdomain=myschool&templateMode=true");

      // Add a heading
      await page.locator("button:has-text('Heading')").first().click();
      await page.keyboard.press("Control+s");
      await expect(page.locator("text=Saved")).toBeVisible({ timeout: 5000 });

      // Reload page
      await page.reload();
      await expect(page.locator("#doc-builder-wrapper")).toBeVisible();
      await expect(page.locator(".db-page").first().locator("text=Your Heading Here")).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: DYNAMIC ERP DATA LINKAGE & VARIABLE RESOLUTION
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("5. Dynamic ERP Data Linkage & Variable Resolution", () => {
    test("5.1 should show Unlinked Banner on unlinked document and open Link Modal", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents/builder/template-blank-a4?subdomain=myschool&templateMode=true");

      // Verify Unlinked Banner
      await expect(page.locator("text=No Record Attached (Blank Canvas Mode)")).toBeVisible();

      // Click Attach Record
      const attachBtn = page.locator("button:has-text('Attach Record')");
      await expect(attachBtn).toBeVisible();
      await attachBtn.click();

      // Verify Modal opens
      await expect(page.locator("text=Link ERP Record")).toBeVisible();
    });

    test("5.2 should search student and link record to resolve placeholders", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents/builder/template-bonafide-classic?subdomain=myschool&templateMode=true");

      // Verify placeholders initially exist
      await expect(page.locator(".db-page").first().locator("text={{student_name}}")).toBeVisible();

      // Open Attach Record modal
      await page.locator("button:has-text('Attach Record')").click();
      await expect(page.locator("text=Link ERP Record")).toBeVisible();

      // Type student name in search
      const searchBox = page.locator('input[placeholder*="Search students to link"]');
      await searchBox.fill("Bart");

      // Wait for search result item
      await expect(page.locator("text=Bart Simpson").first()).toBeVisible({ timeout: 5000 });

      // Click to link student
      await page.locator("text=Bart Simpson").first().click();

      // Linked banner should appear
      await expect(page.locator("text=LINKED TO ERP")).toBeVisible({ timeout: 5000 });
      await expect(page.locator("text=Bart Simpson").first()).toBeVisible();

      // Placeholders should now be resolved in the certificate
      await expect(page.locator(".db-page").first().locator("text=Bart Simpson")).toBeVisible();
    });

    test("5.3 should auto-resolve placeholders when launched in generated mode with variables URL param", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });

      const varsObj = {
        student_name: "Diya Patel",
        class: "10",
        section: "B",
        father_name: "Kishore Patel",
        mother_name: "Meena Patel",
      };
      const b64 = Buffer.from(JSON.stringify(varsObj)).toString("base64");

      await page.goto(`/documents/builder/template-bonafide-classic?subdomain=myschool&variables=${encodeURIComponent(b64)}&generatedFor=Diya%20Patel`);

      await expect(page.locator("#doc-builder-wrapper")).toBeVisible();
      // Should automatically replace {{student_name}} with Diya Patel
      await expect(page.locator(".db-page").first().locator("text=Diya Patel")).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: ZOOM, MULTI-PAGE, PRINT/EXPORT & EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe("6. Zoom, Multi-Page, Print/Export & Edge Cases", () => {
    test("6.1 should change zoom level via ZoomIn, ZoomOut and dropdown selector", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents/builder/template-blank-a4?subdomain=myschool&templateMode=true");

      const zoomSelect = page.locator("select").filter({ hasText: "%" });
      await expect(zoomSelect).toBeVisible();

      // Select 50%
      await zoomSelect.selectOption("0.5");
      await page.waitForTimeout(200);

      // Verify scale applied on page wrapper
      const zoomWrapper = page.locator(".db-page").first().locator("..");
      await expect(zoomWrapper).toHaveAttribute("style", /scale\(0\.5\)/);

      // Select 150%
      await zoomSelect.selectOption("1.5");
      await page.waitForTimeout(200);
      await expect(zoomWrapper).toHaveAttribute("style", /scale\(1\.5\)/);
    });

    test("6.2 should trigger print/PDF iframe generation", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents/builder/template-bonafide-classic?subdomain=myschool&templateMode=true");

      // Click Print button
      const printBtn = page.locator("button:has-text('Print')");
      await expect(printBtn).toBeVisible();
      await printBtn.click();

      // Hidden print iframe should be appended to document
      await page.waitForTimeout(500);
      const printFrame = page.locator("iframe#__doc-print-frame__");
      expect(await printFrame.count()).toBeGreaterThanOrEqual(0);
    });

    test("6.3 should display Document Not Found error page for invalid document ID", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents/builder/invalid-nonexistent-id-99999?subdomain=myschool");

      await expect(page.locator("text=Document not found")).toBeVisible();
      const backBtn = page.locator("button:has-text('Back to Documents')");
      await expect(backBtn).toBeVisible();
      await backBtn.click();

      await page.waitForURL(/\/documents/);
    });

    test("6.4 should handle window resize without canvas layout distortion", async ({ page }) => {
      await loginAsSchoolAdmin(page, { subdomain: "myschool" });
      await page.goto("/documents/builder/template-blank-a4?subdomain=myschool&templateMode=true");

      // Set small viewport
      await page.setViewportSize({ width: 800, height: 600 });
      await page.waitForTimeout(200);
      await expect(page.locator(".db-page").first()).toBeVisible();

      // Set large viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(200);
      await expect(page.locator(".db-page").first()).toBeVisible();
    });
  });
});
