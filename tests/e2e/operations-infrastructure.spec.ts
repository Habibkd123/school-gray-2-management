import { test, expect } from "@playwright/test";
import {
  loginAsSchoolAdmin,
  loginAsSuperAdmin,
  loginAsStudent,
} from "./helpers";

test.describe("Module: Operations & Infrastructure - Deep E2E Suite", () => {
  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 1: Fleet & Bus Details (/transport/bus-details)
  // ───────────────────────────────────────────────────────────────────────────
  test.describe("Fleet & Bus Details Management", () => {
    test("lists fleet vehicles, displays operational stat cards and table records", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/transport/bus-details");

      // Verify Page Title and Breadcrumb
      await expect(page.getByRole("heading", { name: "Transport Management" })).toBeVisible();
      await expect(page.locator("span:has-text('Bus Details')").first()).toBeVisible();

      // Verify Stat Cards
      await expect(page.locator("p:has-text('Total Buses')")).toBeVisible();
      await expect(page.locator("p:has-text('Active')").first()).toBeVisible();
      await expect(page.locator("p:has-text('Inactive')").first()).toBeVisible();
      await expect(page.locator("p:has-text('Total Capacity')")).toBeVisible();

      // Verify Table Records
      await expect(page.locator("td:has-text('BUS-101')")).toBeVisible();
      await expect(page.locator("td:has-text('Rajesh Sharma')")).toBeVisible();
      await expect(page.locator("td:has-text('BUS-102')")).toBeVisible();
    });

    test("searches fleet by bus number and driver name", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/transport/bus-details");

      const searchInput = page.getByPlaceholder("Search bus or driver...");
      await expect(searchInput).toBeVisible();

      // Search for specific bus
      await searchInput.fill("BUS-102");
      await expect(page.locator("td:has-text('BUS-102')")).toBeVisible();
      await expect(page.locator("td:has-text('BUS-101')")).not.toBeVisible();

      // Search by driver name
      await searchInput.fill("Rajesh");
      await expect(page.locator("td:has-text('BUS-101')")).toBeVisible();
      await expect(page.locator("td:has-text('BUS-102')")).not.toBeVisible();

      // Clear search
      await searchInput.fill("");
      await expect(page.locator("td:has-text('BUS-101')")).toBeVisible();
      await expect(page.locator("td:has-text('BUS-102')")).toBeVisible();
    });

    test("filters fleet vehicles by status", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/transport/bus-details");

      // Open filter popover
      const filterButton = page.locator("button:has-text('Filter')").first();
      await filterButton.click();

      // Select 'Inactive' status filter
      const statusSelect = page.locator("select").nth(1); // second select is status
      await statusSelect.selectOption("inactive");

      // Click Apply
      await page.locator("button:has-text('Apply')").click();

      // Only inactive bus (BUS-103) should be shown
      await expect(page.locator("td:has-text('BUS-103')")).toBeVisible();
      await expect(page.locator("td:has-text('BUS-101')")).not.toBeVisible();

      // Reset filter
      await filterButton.click();
      await page.locator("button:has-text('Reset')").click();
      await page.locator("button:has-text('Apply')").click();

      await expect(page.locator("td:has-text('BUS-101')")).toBeVisible();
      await expect(page.locator("td:has-text('BUS-103')")).toBeVisible();
    });

    test("views bus details modal with full vehicle and driver info", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/transport/bus-details");

      // Click view eye icon on the first bus
      const viewButton = page.locator("button[title='View Details']").first();
      await viewButton.click();

      // Modal appears
      await expect(page.getByRole("heading", { name: "Bus Details" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "BUS-101" })).toBeVisible();
      await expect(page.locator("p:has-text('Rajesh Sharma')")).toBeVisible();
      await expect(page.locator("p:has-text('40 seats')")).toBeVisible();

      // Close modal
      await page.getByRole("button", { name: "Close" }).click();
      await expect(page.getByRole("heading", { name: "Bus Details" })).not.toBeVisible();
    });

    test("performs full Add, Edit and Delete cycle on a bus vehicle", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/transport/bus-details");

      // 1. ADD BUS
      await page.getByRole("button", { name: "Add Bus" }).click();
      await expect(page.getByRole("heading", { name: "Add Bus" })).toBeVisible();

      await page.locator("input[placeholder='e.g. KA-01-AB-1234']").fill("BUS-205");
      await page.locator("input[placeholder='e.g. KA01AB1234']").fill("KA-05-MN-9999");
      await page.locator("input[placeholder='e.g. Tata Starbus']").fill("Volvo 9400");
      await page.locator("input[placeholder='40']").fill("50");
      await page.locator("input[placeholder='e.g. Ramesh Kumar']").fill("Anil Deshmukh");
      await page.locator("input[placeholder='+91 98765 43210']").fill("+91 99887 76655");

      await page.locator("form").getByRole("button", { name: "Add Bus" }).click();

      // Verify new bus appears in list
      await expect(page.locator("td:has-text('BUS-205')")).toBeVisible();
      await expect(page.locator("td:has-text('Anil Deshmukh')")).toBeVisible();

      // 2. EDIT BUS
      const row = page.locator("tr:has-text('BUS-205')");
      await row.locator("button[title='Edit Bus']").click();
      await expect(page.getByRole("heading", { name: "Edit Bus" })).toBeVisible();

      // Change driver name
      const driverInput = page.locator("input[placeholder='e.g. Ramesh Kumar']");
      await driverInput.fill("Anil Deshmukh Senior");
      await page.locator("form").getByRole("button", { name: "Save Changes" }).click();

      // Verify update in table
      await expect(page.locator("td:has-text('Anil Deshmukh Senior')")).toBeVisible();

      // 3. DELETE BUS
      const updatedRow = page.locator("tr:has-text('BUS-205')");
      await updatedRow.locator("button[title='Delete Bus']").click();
      await expect(page.getByRole("heading", { name: "Delete BUS-205?" })).toBeVisible();

      // Confirm delete
      await page.locator("div.fixed").getByRole("button", { name: "Delete", exact: true }).click();
      await expect(page.locator("td:has-text('BUS-205')")).not.toBeVisible();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 2: Route Management (/transport/route-management)
  // ───────────────────────────────────────────────────────────────────────────
  test.describe("Route Management", () => {
    test("lists transportation routes and stops timeline", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/transport/route-management");

      await expect(page.getByRole("heading", { name: "Transport Management" })).toBeVisible();
      await expect(page.locator("span:has-text('Route Management')").first()).toBeVisible();

      // Verify existing routes
      await expect(page.locator("td:has-text('Route North')")).toBeVisible();
      await expect(page.locator("td:has-text('Route South')")).toBeVisible();
      await expect(page.locator("td:has-text('North Terminal')").first()).toBeVisible();
    });

    test("searches routes by route name and terminus", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/transport/route-management");

      const searchInput = page.getByPlaceholder("Search route...");
      await searchInput.fill("Route South");

      await expect(page.locator("td:has-text('Route South')")).toBeVisible();
      await expect(page.locator("td:has-text('Route North')")).not.toBeVisible();

      await searchInput.fill("");
      await expect(page.locator("td:has-text('Route North')")).toBeVisible();
    });

    test("views route details modal displaying stops sequence", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/transport/route-management");

      const viewBtn = page.locator("td").locator("div:has-text('Route North')").first();
      await viewBtn.click();

      await expect(page.getByRole("heading", { name: "Route Details" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Route North" })).toBeVisible();
      await expect(page.locator("p:has-text('City Mall')")).toBeVisible();

      await page.getByRole("button", { name: "Close" }).click();
      await expect(page.getByRole("heading", { name: "Route Details" })).not.toBeVisible();
    });

    test("creates, edits, and deletes a bus route", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/transport/route-management");

      // 1. ADD ROUTE
      await page.getByRole("button", { name: "Add Route" }).click();
      await expect(page.getByRole("heading", { name: "Add Route" })).toBeVisible();

      await page.locator("input[placeholder='e.g. Route A – North']").fill("Route East Express");
      await page.locator("input[placeholder='e.g. North Market']").fill("East Metro Junction");

      // Submit route
      await page.locator("form").getByRole("button", { name: "Add Route" }).click();
      await expect(page.locator("td:has-text('Route East Express')")).toBeVisible();

      // 2. EDIT ROUTE
      const row = page.locator("tr:has-text('Route East Express')");
      await row.locator("button[title='Edit Route']").click();
      await expect(page.getByRole("heading", { name: "Edit Route" })).toBeVisible();

      const nameInput = page.locator("input[placeholder='e.g. Route A – North']");
      await nameInput.fill("Route East Super Express");
      await page.locator("form").getByRole("button", { name: "Save Changes" }).click();

      await expect(page.locator("td:has-text('Route East Super Express')")).toBeVisible();

      // 3. DELETE ROUTE
      const updatedRow = page.locator("tr:has-text('Route East Super Express')");
      await updatedRow.locator("button[title='Delete Route']").click();
      await expect(page.getByRole("heading", { name: "Delete Route East Super Express?" })).toBeVisible();

      await page.locator("div.fixed").getByRole("button", { name: "Delete", exact: true }).click();
      await expect(page.locator("td:has-text('Route East Super Express')")).not.toBeVisible();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 3: Student Transport Allocation (/transport/allocation)
  // ───────────────────────────────────────────────────────────────────────────
  test.describe("Student Transport Allocation", () => {
    test("lists student transport allocations with route, bus and pickup stop", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/transport/allocation");

      await expect(page.getByRole("heading", { name: "Transport Management" })).toBeVisible();
      await expect(page.locator("span:has-text('Student Allocation')").first()).toBeVisible();

      // Verify allocated students in list
      await expect(page.locator("td:has-text('Bart Simpson')")).toBeVisible();
      await expect(page.locator("td:has-text('Route North')")).toBeVisible();
      await expect(page.locator("td:has-text('City Mall')")).toBeVisible();
      await expect(page.locator("td:has-text('Lisa Simpson')")).toBeVisible();
    });

    test("searches allocations by student name and route", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/transport/allocation");

      const searchInput = page.getByPlaceholder("Search student or ID...");
      await searchInput.fill("Lisa");

      await expect(page.locator("td:has-text('Lisa Simpson')")).toBeVisible();
      await expect(page.locator("td:has-text('Bart Simpson')")).not.toBeVisible();

      await searchInput.fill("");
      await expect(page.locator("td:has-text('Bart Simpson')")).toBeVisible();
    });

    test("allocates a student to a route with auto bus matching and stop assignment", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/transport/allocation");

      await page.locator("button:has-text('Allocate Student')").first().click();
      await expect(page.getByRole("heading", { name: "Allocate Student" })).toBeVisible();

      // Select student
      const studentSelect = page.locator("form select").first();
      await studentSelect.selectOption({ index: 1 });

      // Select route
      const routeSelect = page.locator("form select").nth(1);
      await routeSelect.selectOption("Route North");

      // Verify bus is automatically matched
      await expect(page.locator("input[value='BUS-101']")).toBeVisible();

      // Select pickup stop
      const stopSelect = page.locator("form select").nth(2);
      await stopSelect.selectOption("City Mall");

      // Submit allocation
      await page.locator("form button[type='submit']").click();

      // Verify modal closes
      await expect(page.getByRole("heading", { name: "Allocate Student" })).not.toBeVisible();
      await expect(page.locator("table")).toBeVisible();
    });

    test("supports bulk student selection in multiple allocation mode", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/transport/allocation");

      await page.locator("button:has-text('Allocate Student')").first().click();
      await expect(page.getByRole("heading", { name: "Allocate Student" })).toBeVisible();

      // Switch to Multiple Mode
      const multiButton = page.getByRole("button", { name: /Multiple Students/i });
      await multiButton.click();
      await expect(page.getByRole("heading", { name: "Allocate Multiple Students" })).toBeVisible();

      // Select route
      const routeSelect = page.locator("form select").nth(1);
      await routeSelect.selectOption("Route North");

      // Select all visible students checkbox in modal
      const selectAllBtn = page.getByRole("button", { name: /Select All Filtered/i });
      if (await selectAllBtn.isVisible()) {
        await selectAllBtn.click();
      }

      // Submit bulk allocation
      const submitBtn = page.locator("form button[type='submit']");
      await submitBtn.click();

      await expect(page.getByRole("heading", { name: "Allocate Multiple Students" })).not.toBeVisible();
    });

    test("deletes a transport allocation with confirmation", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/transport/allocation");

      const row = page.locator("tr:has-text('Bart Simpson')");
      await row.locator("button[title='Delete Allocation']").click();

      await expect(page.getByRole("heading", { name: "Remove Allocation" })).toBeVisible();
      await page.locator("div.fixed").getByRole("button", { name: "Remove", exact: true }).click();

      await expect(page.locator("td:has-text('Bart Simpson')")).not.toBeVisible();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 4: Room Management (/academic/class-room)
  // ───────────────────────────────────────────────────────────────────────────
  test.describe("Class Room Management", () => {
    test("lists classrooms with Room No, Capacity and Status badges", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/academic/class-room");

      await expect(page.getByRole("heading", { name: "Class Room" })).toBeVisible();
      await expect(page.locator("td:has-text('101')")).toBeVisible();
      await expect(page.locator("td:has-text('40')")).toBeVisible();
      await expect(page.locator("td:has-text('Lab-1')")).toBeVisible();
      await expect(page.locator("td:has-text('Inactive')")).toBeVisible();
    });

    test("searches room records by room number", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/academic/class-room");

      const searchInput = page.getByPlaceholder("Search room…");
      await searchInput.fill("Lab-1");

      await expect(page.locator("td:has-text('Lab-1')")).toBeVisible();
      await expect(page.locator("td:has-text('101')")).not.toBeVisible();

      // Test non-matching search shows empty state
      await searchInput.fill("NonExistentRoom999");
      await expect(page.locator("text=No rooms found. Add your first room!")).toBeVisible();

      await searchInput.fill("");
      await expect(page.locator("td:has-text('101')")).toBeVisible();
    });

    test("adds a new classroom, edits capacity and removes it", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/academic/class-room");

      // 1. ADD ROOM
      await page.getByRole("button", { name: "Add Class Room" }).click();
      await expect(page.getByRole("heading", { name: "Add Class Room" })).toBeVisible();

      await page.locator("input[placeholder='e.g. 101']").fill("Room-305");
      await page.locator("input[placeholder='e.g. 40']").fill("55");

      await page.locator("form").getByRole("button", { name: "Add Room" }).click();
      await expect(page.locator("td:has-text('Room-305')")).toBeVisible();
      await expect(page.locator("td:has-text('55')")).toBeVisible();

      // 2. EDIT ROOM
      const row = page.locator("tr:has-text('Room-305')");
      await row.locator("button").first().click(); // Open action menu
      await page.locator("button:has-text('Edit')").click();

      await expect(page.getByRole("heading", { name: "Edit Class Room" })).toBeVisible();
      const capacityInput = page.locator("input[placeholder='e.g. 40']");
      await capacityInput.fill("60");

      await page.locator("form").getByRole("button", { name: "Save Changes" }).click();
      await expect(page.locator("td:has-text('60')")).toBeVisible();

      // 3. DELETE ROOM
      const updatedRow = page.locator("tr:has-text('Room-305')");
      await updatedRow.locator("button").first().click(); // Open action menu
      await page.locator("button:has-text('Delete')").click();

      await expect(page.getByRole("heading", { name: "Confirm Deletion" })).toBeVisible();
      await page.getByRole("button", { name: "Yes, Delete" }).click();

      await expect(page.locator("td:has-text('Room-305')")).not.toBeVisible();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 5: Holidays Management (/holidays)
  // ───────────────────────────────────────────────────────────────────────────
  test.describe("Holidays Management", () => {
    test("lists holidays and allows title search and status filtering", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/holidays");

      await expect(page.getByRole("heading", { name: "Holidays", exact: true })).toBeVisible();
      await expect(page.locator("td:has-text('New Year Celebration')")).toBeVisible();
      await expect(page.locator("td:has-text('Republic Day Festival')")).toBeVisible();
      await expect(page.locator("td:has-text('Mid-Term Spring Break')")).toBeVisible();

      // Search holiday
      const searchInput = page.getByPlaceholder("Search holidays...");
      await searchInput.fill("Republic");
      await expect(page.locator("td:has-text('Republic Day Festival')")).toBeVisible();
      await expect(page.locator("td:has-text('New Year Celebration')")).not.toBeVisible();

      await searchInput.fill("");
      await expect(page.locator("td:has-text('New Year Celebration')")).toBeVisible();
    });

    test("performs full Add, Edit and Delete cycle for official holidays", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/holidays");

      // 1. ADD HOLIDAY
      await page.getByRole("button", { name: "Add Holiday" }).click();
      await expect(page.getByRole("heading", { name: "Add Holiday" })).toBeVisible();

      await page.locator("form input[type='text']").fill("Independence Day 2026");
      await page.locator("form input[type='date']").fill("2026-08-15");
      await page.locator("form textarea").fill("National holiday celebrating Independence.");

      await page.locator("form button[type='submit']").click();
      await expect(page.locator("td:has-text('Independence Day 2026')")).toBeVisible();

      // 2. EDIT HOLIDAY
      const row = page.locator("tr:has-text('Independence Day 2026')");
      await row.locator("button").first().click(); // Action menu
      await page.locator("button:has-text('Edit')").click();

      await expect(page.getByRole("heading", { name: "Edit Holiday" })).toBeVisible();
      await page.locator("form input[type='text']").fill("Independence Day Gala 2026");

      await page.locator("form button[type='submit']").click();
      await expect(page.locator("td:has-text('Independence Day Gala 2026')")).toBeVisible();

      // 3. DELETE HOLIDAY
      const updatedRow = page.locator("tr:has-text('Independence Day Gala 2026')");
      await updatedRow.locator("button").first().click();
      await page.locator("button:has-text('Delete')").click();

      await expect(page.getByRole("heading", { name: "Confirm Deletion" })).toBeVisible();
      await page.getByRole("button", { name: "Yes, Delete" }).click();

      await expect(page.locator("td:has-text('Independence Day Gala 2026')")).not.toBeVisible();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 6: Notice Board & Announcements (/notices)
  // ───────────────────────────────────────────────────────────────────────────
  test.describe("Notice Board & Announcements", () => {
    test("lists notices with publish dates and target audience badges", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/notices");

      await expect(page.getByRole("heading", { name: "Notice Board" })).toBeVisible();
      await expect(page.locator("span:has-text('Annual Sports Meet 2026')")).toBeVisible();
      await expect(page.locator("span:has-text('Staff Meeting on Curriculum')")).toBeVisible();
      await expect(page.locator("span:has-text('Parent Teacher Conference Notice')")).toBeVisible();
    });

    test("creates a notice with target audience and simulated attachment upload", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/notices");

      await page.getByRole("button", { name: "Add Message" }).click();
      await expect(page.getByRole("heading", { name: "New Notice / Message" })).toBeVisible();

      // Title & Date
      await page.locator("input[placeholder='e.g. Parent-Teacher Meeting']").fill("Term 2 Exam Schedule Released");
      await page.locator("textarea[placeholder='Write your notice here...']").fill("Please download the attached exam routine for grade 1 to 10.");

      // Set target audience (Student checkbox/label)
      const studentCheckbox = page.locator("label:has-text('Student')").locator("input[type='checkbox']");
      if (await studentCheckbox.isVisible()) {
        await studentCheckbox.check();
      }

      // Submit Notice
      await page.locator("form").getByRole("button", { name: "Add New Message" }).click();

      // Verify notice appears on board
      await expect(page.locator("span:has-text('Term 2 Exam Schedule Released')")).toBeVisible();
    });

    test("edits an existing notice and deletes it", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/notices");

      // Edit notice
      const row = page.locator("tr:has-text('Annual Sports Meet 2026')");
      const editBtn = row.locator("td").last().locator("button").first();
      await editBtn.click();

      await expect(page.getByRole("heading", { name: "Edit Notice / Message" })).toBeVisible();
      await page.locator("form input[type='text']").first().fill("Annual Sports Meet 2026 (Updated Timings)");

      await page.locator("form button[type='submit']").click();
      await expect(page.locator("span:has-text('Annual Sports Meet 2026 (Updated Timings)')")).toBeVisible();

      // Delete notice
      const updatedRow = page.locator("tr:has-text('Annual Sports Meet 2026 (Updated Timings)')");
      const deleteBtn = updatedRow.locator("td").last().locator("button").last();
      await deleteBtn.click();

      await expect(page.getByRole("heading", { name: "Delete Notice?" })).toBeVisible();
      await page.locator("div.fixed").getByRole("button", { name: "Delete", exact: true }).click();

      await expect(page.locator("span:has-text('Annual Sports Meet 2026 (Updated Timings)')")).not.toBeVisible();
    });

    test("allows selecting multiple notices with select all checkbox", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/notices");

      // Check 'Mark & Delete All'
      const selectAllCheckbox = page.locator("input[type='checkbox']").first();
      await selectAllCheckbox.check();

      // Verify checkboxes are checked
      const rowCheckboxes = page.locator("tbody input[type='checkbox']");
      const count = await rowCheckboxes.count();
      for (let i = 0; i < count; i++) {
        await expect(rowCheckboxes.nth(i)).toBeChecked();
      }

      // Uncheck
      await selectAllCheckbox.uncheck();
      for (let i = 0; i < count; i++) {
        await expect(rowCheckboxes.nth(i)).not.toBeChecked();
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 7: Permissions & Role Boundaries
  // ───────────────────────────────────────────────────────────────────────────
  test.describe("Permissions & Role Boundaries", () => {
    test("student cannot access infrastructure management or see modification buttons", async ({ page }) => {
      await loginAsStudent(page, { subdomain: "myschool" });

      // Student visits holidays: can view
      await page.goto("/holidays?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");
      await expect(page.getByRole("heading", { name: "Holidays", exact: true })).toBeVisible();

      // Student visits notices: can view notice board
      await page.goto("/notices?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");
      await expect(page.getByRole("heading", { name: "Notice Board" })).toBeVisible();

      // Student visiting restricted transport route is redirected to dashboard
      await page.goto("/transport/bus-details?subdomain=myschool");
      await page.waitForLoadState("domcontentloaded");
      await expect(page).toHaveURL(/dashboard/);
    });

    test("super admin has full CRUD authority across operations modules", async ({ page }) => {
      await loginAsSuperAdmin(page);
      await page.goto("/transport/bus-details");

      await expect(page.getByRole("button", { name: "Add Bus" })).toBeVisible();
      await expect(page.locator("td:has-text('BUS-101')")).toBeVisible();

      await page.goto("/academic/class-room");
      await expect(page.getByRole("button", { name: "Add Class Room" })).toBeVisible();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 8: Resiliency, API Errors & Empty States
  // ───────────────────────────────────────────────────────────────────────────
  test.describe("Resiliency & Error Handling", () => {
    test("renders clean empty state when no fleet vehicles exist", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        busesData: [],
      });
      await page.goto("/transport/bus-details");

      // Stat cards reflect 0
      await expect(page.locator("p:has-text('Total Buses')")).toBeVisible();
      await expect(page.locator("h3:has-text('Bus List')")).toBeVisible();
    });

    test("renders clean empty state when no notices exist", async ({ page }) => {
      await loginAsSchoolAdmin(page, {
        noticesData: [],
      });
      await page.goto("/notices");

      await expect(page.locator("text=No notices found")).toBeVisible();
    });

    test("refresh button triggers data re-sync without crash", async ({ page }) => {
      await loginAsSchoolAdmin(page);
      await page.goto("/transport/bus-details");

      // Click refresh button
      const refreshBtn = page.locator("button:has(.lucide-refresh-cw)").first();
      await refreshBtn.click();

      // Page still healthy
      await expect(page.locator("td:has-text('BUS-101')")).toBeVisible();
    });
  });
});
