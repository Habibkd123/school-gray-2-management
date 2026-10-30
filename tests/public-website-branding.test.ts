import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { setupTestDatabase, teardownTestDatabase, TestDataContext } from "./helpers/dbTestSetup";
import {
  THEME_PRESETS,
  PRESET_LABELS,
  getPresetTheme,
  resolveThemeConfig,
  themeColorsToCssVars,
} from "@/lib/themes/presets";
import {
  getSchoolThemeById,
  invalidateSchoolThemeCache,
} from "@/lib/themes/getSchoolTheme";
import {
  resolveSchoolIdServer,
  resolveSchoolMeta,
  invalidateSchoolSlugCache,
} from "@/lib/themes/resolveSchool";

// Mocks for external email / nodemailer
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: "mock-contact-mail-123" }),
    })),
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

// Route handlers under test
import { GET as getPublicSchoolInfo } from "@/app/api/public/school-info/route";
import { GET as getPublicTheme } from "@/app/api/public/theme/route";
import { GET as getPublicClasses } from "@/app/api/public/classes/route";
import { POST as postDemoRequest } from "@/app/api/public/demo-request/route";
import { POST as postPublicAdmission } from "@/app/api/public/admissions/route";
import { POST as postContactEnquiry } from "@/app/api/contact/route";

describe("Public Website & School Branding - Deep Unit & Integration Test Suite", () => {
  let ctx: TestDataContext;

  beforeAll(async () => {
    ctx = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. THEME PRESETS & CSS VARIABLES CALCULATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("1. Theme Presets & CSS Variables Calculations", () => {
    it("1.1 should correctly resolve all 5 built-in theme presets", () => {
      const presets = ["cbse_saffron", "navy_blue", "emerald_green", "crimson_maroon", "modern_teal"] as const;

      for (const preset of presets) {
        const theme = getPresetTheme(preset);
        expect(theme.preset).toBe(preset);
        expect(theme.colors.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(theme.colors.primary_hover).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(theme.colors.background).toBeDefined();
        expect(theme.colors.foreground).toBeDefined();
        expect(theme.colors.sidebar_bg).toBeDefined();
        expect(theme.colors.border_color).toBeDefined();
      }
    });

    it("1.2 should fallback to navy_blue for unknown or custom presets without config", () => {
      const fallback = getPresetTheme("custom");
      expect(fallback.preset).toBe("custom");
      expect(fallback.colors.primary).toBe(THEME_PRESETS.navy_blue.colors.primary);

      const resolvedUnknown = resolveThemeConfig({ preset: "unknown_preset" as any });
      expect(resolvedUnknown.preset).toBe("navy_blue");
      expect(resolvedUnknown.colors.primary).toBe(THEME_PRESETS.navy_blue.colors.primary);
    });

    it("1.3 should correctly map all 13 ThemeColors tokens into CSS custom properties", () => {
      const colors = THEME_PRESETS.emerald_green.colors;
      const cssVars = themeColorsToCssVars(colors);

      expect(cssVars["--primary"]).toBe("#059669");
      expect(cssVars["--primary-hover"]).toBe("#047857");
      expect(cssVars["--background"]).toBe("#F8FAFC");
      expect(cssVars["--foreground"]).toBe("#0F172A");
      expect(cssVars["--sidebar-bg"]).toBe("#064E3B");
      expect(cssVars["--border-color"]).toBe("#E2E8F0");
      expect(cssVars["--card-bg"]).toBe("#FFFFFF");
      expect(cssVars["--success"]).toBe("#10B981");
      expect(cssVars["--danger"]).toBe("#EF4444");
      expect(cssVars["--warning"]).toBe("#F59E0B");
      expect(cssVars["--info"]).toBe("#3B82F6");
      expect(cssVars["--muted-text"]).toBe("#64748B");
      expect(cssVars["--section-alt"]).toBe("#ECFDF5");
    });

    it("1.4 should support custom color overrides on top of presets", () => {
      const customized = resolveThemeConfig({
        preset: "cbse_saffron",
        colors: {
          ...THEME_PRESETS.cbse_saffron.colors,
          primary: "#FF5722",
          sidebar_bg: "#212121",
        },
      });

      expect(customized.colors.primary).toBe("#FF5722");
      expect(customized.colors.sidebar_bg).toBe("#212121");
      // Other colors retain preset defaults
      expect(customized.colors.success).toBe(THEME_PRESETS.cbse_saffron.colors.success);
    });

    it("1.5 should handle theme caching and cache invalidation", async () => {
      invalidateSchoolThemeCache();
      const theme1 = await getSchoolThemeById(ctx.schoolA._id.toString());
      expect(theme1).not.toBeNull();
      expect(theme1?.school_name).toBe(ctx.schoolA.name);

      // Invalidate specifically for schoolA
      invalidateSchoolThemeCache(ctx.schoolA._id.toString());
      const theme2 = await getSchoolThemeById(ctx.schoolA.slug);
      expect(theme2).not.toBeNull();
      expect(theme2?.school_id).toBe(ctx.schoolA._id.toString());
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. MULTI-TENANT SUBDOMAIN & RESOLUTION RULES
  // ═══════════════════════════════════════════════════════════════════════════

  describe("2. Multi-Tenant Subdomain & Resolution Rules", () => {
    it("2.1 should resolve school by direct x-school-id header", async () => {
      const headers = new Headers();
      headers.set("x-school-id", ctx.schoolA._id.toString());

      const resolvedId = await resolveSchoolIdServer(headers);
      expect(resolvedId).toBe(ctx.schoolA._id.toString());
    });

    it("2.2 should resolve school by x-subdomain header", async () => {
      invalidateSchoolSlugCache();
      const headers = new Headers();
      headers.set("x-subdomain", ctx.schoolA.subdomain);

      const resolvedId = await resolveSchoolIdServer(headers);
      expect(resolvedId).toBe(ctx.schoolA._id.toString());
    });

    it("2.3 should resolve school by query param in URL (?subdomain=)", async () => {
      const headers = new Headers();
      const url = `http://localhost:3000/admissions?subdomain=${ctx.schoolB.subdomain}`;

      const resolvedId = await resolveSchoolIdServer(headers, url);
      expect(resolvedId).toBe(ctx.schoolB._id.toString());
    });

    it("2.4 should resolve school by query param (?school_id=)", async () => {
      const headers = new Headers();
      const url = `http://localhost:3000/api/public/theme?school_id=${ctx.schoolA._id.toString()}`;

      const resolvedId = await resolveSchoolIdServer(headers, url);
      expect(resolvedId).toBe(ctx.schoolA._id.toString());
    });

    it("2.5 should bypass school resolution when x-platform-view is true", async () => {
      const headers = new Headers();
      headers.set("x-school-id", ctx.schoolA._id.toString());
      headers.set("x-platform-view", "true");

      const resolvedId = await resolveSchoolIdServer(headers);
      expect(resolvedId).toBeNull();
    });

    it("2.6 should return null for non-existent subdomain without throwing errors", async () => {
      const headers = new Headers();
      headers.set("x-subdomain", "non-existent-random-school-xyz-999");

      const resolvedId = await resolveSchoolIdServer(headers);
      expect(resolvedId).toBeNull();
    });

    it("2.7 should resolve full school meta with SEO config", async () => {
      const headers = new Headers();
      headers.set("x-subdomain", ctx.schoolA.subdomain);

      const meta = await resolveSchoolMeta(headers);
      expect(meta).not.toBeNull();
      expect(meta?.name).toBe(ctx.schoolA.name);
      expect(meta?.school_id).toBe(ctx.schoolA._id.toString());
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. PUBLIC API: SCHOOL INFO & SENSITIVE DATA LEAK PROTECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("3. Public School Info & Sensitive Data Leak Protection", () => {
    it("3.1 should return 400 when no subdomain, custom_domain or school_id is provided", async () => {
      const req = new NextRequest("http://localhost:3000/api/public/school-info");
      const res = await getPublicSchoolInfo(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("required");
    });

    it("3.2 should return 404 when querying an unknown subdomain", async () => {
      const req = new NextRequest("http://localhost:3000/api/public/school-info?subdomain=unknown-school-999");
      const res = await getPublicSchoolInfo(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toContain("School not found");
    });

    it("3.3 should return 200 with school info and SEO meta for valid subdomain", async () => {
      const req = new NextRequest(`http://localhost:3000/api/public/school-info?subdomain=${ctx.schoolA.subdomain}`);
      const res = await getPublicSchoolInfo(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.name).toBe(ctx.schoolA.name);
      expect(json.data.subdomain).toBe(ctx.schoolA.subdomain);
      expect(json.data.meta).toBeDefined();
      expect(json.data.meta.title).toBeDefined();
    });

    it("3.4 SECURITY: should NOT leak passwords, hash, jwt, or internal admin secrets", async () => {
      const req = new NextRequest(`http://localhost:3000/api/public/school-info?school_id=${ctx.schoolA._id.toString()}`);
      const res = await getPublicSchoolInfo(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      const d = json.data;

      // Assert sensitive fields are completely absent
      expect(d.password).toBeUndefined();
      expect(d.password_hash).toBeUndefined();
      expect(d.secret).toBeUndefined();
      expect(d.jwt_secret).toBeUndefined();
      expect(d.receipt_config).toBeUndefined();
      expect(d.login_config).toBeUndefined();
      expect(d.api_keys).toBeUndefined();
      expect(d.database_uri).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. PUBLIC API: THEME CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("4. Public Theme Configuration", () => {
    it("4.1 should return 400 when school cannot be resolved", async () => {
      const req = new NextRequest("http://localhost:3000/api/public/theme");
      const res = await getPublicTheme(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it("4.2 should return 200 with theme variables and school branding when resolved", async () => {
      const req = new NextRequest(`http://localhost:3000/api/public/theme?school_id=${ctx.schoolA._id.toString()}`, {
        headers: { "x-school-id": ctx.schoolA._id.toString() },
      });
      const res = await getPublicTheme(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.school_id).toBe(ctx.schoolA._id.toString());
      expect(json.data.school_name).toBe(ctx.schoolA.name);
      expect(json.data.css_vars).toBeDefined();
      expect(json.data.css_vars["--primary"]).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. PUBLIC API: ACTIVE CLASSES PROJECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("5. Public Active Classes Projection", () => {
    it("5.1 should return active classes for resolved school", async () => {
      const req = new NextRequest(`http://localhost:3000/api/public/classes?school_id=${ctx.schoolA._id.toString()}`, {
        headers: { "x-school-id": ctx.schoolA._id.toString() },
      });
      const res = await getPublicClasses(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);

      // Verify only public safe fields are returned
      const firstClass = json.data[0];
      expect(firstClass._id).toBeDefined();
      expect(firstClass.name).toBeDefined();
      expect(firstClass.created_by).toBeUndefined();
      expect(firstClass.school_id).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. PUBLIC API: 1:1 LIVE DEMO REQUEST & SPAM / DUPLICATE PREVENTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("6. 1:1 Live Demo Request & Spam / Duplicate Prevention", () => {
    it("6.1 should reject demo request when required fields are missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/public/demo-request", {
        method: "POST",
        body: JSON.stringify({ schoolName: "Delhi Public School" }), // missing contactPerson & phone
      });
      const res = await postDemoRequest(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("required");
    });

    it("6.2 should reject demo request with invalid/short phone number", async () => {
      const req = new NextRequest("http://localhost:3000/api/public/demo-request", {
        method: "POST",
        body: JSON.stringify({
          schoolName: "Delhi Public School",
          contactPerson: "Principal Roy",
          phone: "123", // invalid length
        }),
      });
      const res = await postDemoRequest(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("valid phone number");
    });

    const uniqueDemoPhone = "98" + Math.floor(10000000 + Math.random() * 90000000);

    it("6.3 should successfully record valid demo request and return confirmation", async () => {
      const req = new NextRequest("http://localhost:3000/api/public/demo-request", {
        method: "POST",
        body: JSON.stringify({
          schoolName: "Apex International School",
          contactPerson: "Dr. Arvind Mehta",
          phone: uniqueDemoPhone,
          email: "arvind@apexschool.org",
          studentCount: "1000-2500",
          message: "Interested in automated fee collection and student portals",
        }),
      });
      const res = await postDemoRequest(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toContain("campus walkthrough request has been received");
      expect(json.id).toBeDefined();
    });

    it("6.4 DUPLICATE PREVENTION: should throttle repeat demo requests from the same phone", async () => {
      const req = new NextRequest("http://localhost:3000/api/public/demo-request", {
        method: "POST",
        body: JSON.stringify({
          schoolName: "Apex International School",
          contactPerson: "Dr. Arvind Mehta",
          phone: uniqueDemoPhone,
        }),
      });
      const res = await postDemoRequest(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.is_duplicate).toBe(true);
      expect(json.message).toContain("already been received");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. PUBLIC API: ONLINE ADMISSION APPLICATION & DUPLICATE PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════════

  describe("7. Online Admission Application & Duplicate Persistence", () => {
    it("7.1 should reject admission application when required fields are missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/public/admissions", {
        method: "POST",
        headers: { "x-school-id": ctx.schoolA._id.toString() },
        body: JSON.stringify({
          academic_year: "2026-2027",
          student_name: "Test Candidate",
          // missing class_id, gender, dob, phone
        }),
      });
      const res = await postPublicAdmission(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it("7.2 should reject admission application with invalid mobile number", async () => {
      const req = new NextRequest("http://localhost:3000/api/public/admissions", {
        method: "POST",
        headers: { "x-school-id": ctx.schoolA._id.toString() },
        body: JSON.stringify({
          academic_year: "2026-2027",
          class_id: ctx.classA1._id.toString(),
          student_name: "Rohan Verma",
          gender: "male",
          dob: "2015-05-12",
          phone: "123", // invalid
        }),
      });
      const res = await postPublicAdmission(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("valid mobile number");
    });

    const uniqueAdmissionPhone = "97" + Math.floor(10000000 + Math.random() * 90000000);

    it("7.3 should successfully submit admission application and generate ADM-YYYY-XXXXXX number", async () => {
      const req = new NextRequest("http://localhost:3000/api/public/admissions", {
        method: "POST",
        headers: { "x-school-id": ctx.schoolA._id.toString() },
        body: JSON.stringify({
          academic_year: "2026-2027",
          class_id: ctx.classA1._id.toString(),
          student_name: "Aarav Sharma",
          gender: "male",
          dob: "2016-08-15",
          blood_group: "O+",
          father_name: "Vikram Sharma",
          mother_name: "Pooja Sharma",
          phone: uniqueAdmissionPhone,
          email: "vikram@example.com",
          address: "123 Green Avenue, Jaipur",
          city: "Jaipur",
          state: "Rajasthan",
          pin_code: "302001",
        }),
      });
      const res = await postPublicAdmission(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.application_no).toMatch(/^ADM-2026-\d{6}$/);
      expect(json.data._id).toBeDefined();

      // Verify persistence in MongoDB
      const admissionInDb = await mongoose.model("Admission").findById(json.data._id).lean();
      expect(admissionInDb).not.toBeNull();
      expect((admissionInDb as any).status).toBe("New");
      expect((admissionInDb as any).student_name).toBe("Aarav Sharma");
      expect((admissionInDb as any).school_id.toString()).toBe(ctx.schoolA._id.toString());
    });

    it("7.4 DUPLICATE SUBMISSION: should return existing application when submitted twice within 24h", async () => {
      const req = new NextRequest("http://localhost:3000/api/public/admissions", {
        method: "POST",
        headers: { "x-school-id": ctx.schoolA._id.toString() },
        body: JSON.stringify({
          academic_year: "2026-2027",
          class_id: ctx.classA1._id.toString(),
          student_name: "Aarav Sharma",
          gender: "male",
          dob: "2016-08-15",
          phone: uniqueAdmissionPhone,
        }),
      });
      const res = await postPublicAdmission(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.is_duplicate).toBe(true);
      expect(json.data.application_no).toMatch(/^ADM-2026-\d{6}$/);
      expect(json.message).toContain("already submitted");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. PUBLIC API: CONTACT & QUICK ENQUIRY FORM
  // ═══════════════════════════════════════════════════════════════════════════

  describe("8. Public Contact & Quick Enquiry Form", () => {
    it("8.1 should reject enquiry when name or email is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        body: JSON.stringify({ phone: "9876543210" }), // missing name & email
      });
      const res = await postContactEnquiry(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("Name and Email are required");
    });

    it("8.2 should successfully accept enquiry with name, email and grade", async () => {
      const req = new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        body: JSON.stringify({
          name: "Suresh Gupta",
          email: "suresh@example.com",
          phone: "9123456780",
          grade: "Primary (I-V)",
        }),
      });
      const res = await postContactEnquiry(req);
      const json = await res.json();

      // With nodemailer mocked, should return 200
      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
    });
  });
});
