import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { setupTestDatabase, teardownTestDatabase, TestDataContext } from "./helpers/dbTestSetup";
import { generateAccessToken } from "@/lib/utils/jwt";
import School from "@/lib/models/School";
import User from "@/lib/models/User";

// Import Route Handlers under test
import { POST as loginUser } from "@/app/api/auth/login/route";
import { GET as getSchools, POST as createSchool } from "@/app/api/schools/route";
import {
  GET as getSchoolById,
  PUT as updateSchoolById,
  DELETE as deleteSchoolById,
} from "@/app/api/schools/[id]/route";
import {
  GET as getMetaConfig,
  PUT as updateMetaConfig,
} from "@/app/api/school/meta-config/route";
import { GET as getSuperAnalytics } from "@/app/api/dashboard/super-analytics/route";
import { GET as getTenantBackup } from "@/app/api/backup/tenant/route";

describe("Super-Admin Portal & School Management - Deep / Bulletproof Test Suite", () => {
  let ctx: TestDataContext;
  let superAdminToken: string;
  let schoolAAdminToken: string;
  let teacherToken: string;
  let studentToken: string;

  beforeAll(async () => {
    ctx = await setupTestDatabase("sa-test");

    superAdminToken = generateAccessToken({
      user_id: ctx.superAdmin._id.toString(),
      role: "super_admin",
      school_id: null,
    });

    schoolAAdminToken = generateAccessToken({
      user_id: ctx.schoolAAdmin._id.toString(),
      role: "school_admin",
      school_id: ctx.schoolA._id.toString(),
    });

    teacherToken = generateAccessToken({
      user_id: ctx.schoolATeacher._id.toString(),
      role: "teacher",
      school_id: ctx.schoolA._id.toString(),
    });

    studentToken = generateAccessToken({
      user_id: ctx.schoolAStudent._id.toString(),
      role: "student",
      school_id: ctx.schoolA._id.toString(),
    });
  });

  afterAll(async () => {
    // Teardown created test records
    await teardownTestDatabase();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: SUPER-ADMIN AUTHENTICATION & LOGIN WORKFLOW
  // ═══════════════════════════════════════════════════════════════════════════

  describe("1. Super-Admin Authentication & Login Workflow", () => {
    it("1.1 should successfully login as Super Admin with valid credentials and is_super_admin flag", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: ctx.superAdmin.username,
          password: "Password123#",
          is_super_admin: true,
        }),
      });

      const res = await loginUser(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.user.role).toBe("super_admin");
      expect(json.data.user.school_id).toBeNull();
      expect(json.data.access_token).toBeDefined();
    });

    it("1.2 should reject login with invalid password for super admin", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: ctx.superAdmin.username,
          password: "WrongPassword#999",
          is_super_admin: true,
        }),
      });

      const res = await loginUser(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.message).toMatch(/incorrect.*password|invalid.*password|credentials/i);
    });

    it("1.3 should reject non-super_admin accounts trying to authenticate as is_super_admin", async () => {
      // Normal school admin trying to login via Super Admin portal
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: ctx.schoolAAdmin.username,
          password: "Password123#",
          is_super_admin: true,
        }),
      });

      const res = await loginUser(req);
      const json = await res.json();

      // Should either reject or return user without super_admin privileges
      if (res.status === 200) {
        expect(json.data.user.role).not.toBe("super_admin");
      } else {
        expect(res.status).toBeGreaterThanOrEqual(400);
      }
    });

    it("1.4 should require both username/email and password fields", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "",
          password: "",
        }),
      });

      const res = await loginUser(req);
      expect(res.status).toBe(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: SCHOOL CREATION WORKFLOW & VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("2. School Creation Workflow & Validation", () => {
    it("2.1 should reject school creation when required name or slug is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/schools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          name: "",
          slug: "",
        }),
      });

      const res = await createSchool(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it("2.2 should reject school creation when slug has invalid characters or spaces", async () => {
      const req = new NextRequest("http://localhost:3000/api/schools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          name: "Invalid Slug School",
          slug: "invalid slug with spaces!",
        }),
      });

      const res = await createSchool(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("Slug can only contain lowercase letters, numbers, and hyphens.");
    });

    it("2.3 should reject school creation when slug already exists (409 Conflict)", async () => {
      const req = new NextRequest("http://localhost:3000/api/schools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          name: "Duplicate Alpha School",
          slug: ctx.schoolA.slug,
        }),
      });

      const res = await createSchool(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.message).toContain("already exists");
    });

    it("2.4 should reject school creation when subdomain is already taken (409 Conflict)", async () => {
      const req = new NextRequest("http://localhost:3000/api/schools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          name: "Duplicate Subdomain School",
          slug: "unique-slug-test-123",
          subdomain: ctx.schoolA.subdomain,
        }),
      });

      const res = await createSchool(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.message).toContain("already taken");
    });

    it("2.5 should successfully create school and auto-provision school_admin account", async () => {
      const testSlug = "sa-test-created-school";
      // Ensure no leftover
      await School.deleteOne({ slug: testSlug });
      await User.deleteMany({ email: `admin@${testSlug}.com` });

      const req = new NextRequest("http://localhost:3000/api/schools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          name: "Super-Admin Created Academy",
          slug: testSlug,
          subdomain: testSlug,
          address: "100 Education Blvd, Tech City",
          phone: "+91 99999 11111",
          email: `contact@${testSlug}.com`,
          admin_name: "Principal Test",
          admin_email: `admin@${testSlug}.com`,
          admin_password: "MasterPassword#2026",
          is_active: true,
        }),
      });

      const res = await createSchool(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.school.name).toBe("Super-Admin Created Academy");
      expect(json.data.school.slug).toBe(testSlug);
      expect(json.data.school.is_active).toBe(true);

      // Verify auto-provisioned admin user
      expect(json.data.admin_user).toBeDefined();
      expect(json.data.admin_user.email).toBe(`admin@${testSlug}.com`);

      // Verify in DB
      const createdUser = await User.findOne({ email: `admin@${testSlug}.com` }).lean();
      expect(createdUser).not.toBeNull();
      expect(createdUser?.role).toBe("school_admin");
      expect(createdUser?.school_id?.toString()).toBe(json.data.school._id.toString());
      expect(createdUser?.must_change_password).toBe(true);

      // Clean up newly created school
      await User.deleteMany({ school_id: json.data.school._id });
      await School.deleteOne({ _id: json.data.school._id });
    });

    it("2.6 RBAC: should reject school creation by non-super_admin accounts (403 Forbidden)", async () => {
      // School Admin trying to create another school
      const reqAdmin = new NextRequest("http://localhost:3000/api/schools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${schoolAAdminToken}`,
        },
        body: JSON.stringify({
          name: "Unauthorized School",
          slug: "unauth-school",
        }),
      });
      const resAdmin = await createSchool(reqAdmin);
      expect(resAdmin.status).toBe(403);

      // Teacher trying to create a school
      const reqTeacher = new NextRequest("http://localhost:3000/api/schools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          name: "Teacher School",
          slug: "teacher-school",
        }),
      });
      const resTeacher = await createSchool(reqTeacher);
      expect(resTeacher.status).toBe(403);

      // Guest / Unauthenticated
      const reqGuest = new NextRequest("http://localhost:3000/api/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Guest School",
          slug: "guest-school",
        }),
      });
      const resGuest = await createSchool(reqGuest);
      expect(resGuest.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: SCHOOL LISTS, COUNTS & RBAC ISOLATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("3. School Lists, Counts & RBAC Isolation", () => {
    it("3.1 should list all registered schools with student, teacher and class count enrichments for Super Admin", async () => {
      const req = new NextRequest("http://localhost:3000/api/schools", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
        },
      });

      const res = await getSchools(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(2);

      // Validate enrichment fields
      const alphaSchool = json.data.find((s: any) => s._id.toString() === ctx.schoolA._id.toString());
      expect(alphaSchool).toBeDefined();
      expect(typeof alphaSchool.studentsCount).toBe("number");
      expect(typeof alphaSchool.teachersCount).toBe("number");
      expect(typeof alphaSchool.classesCount).toBe("number");
      expect(alphaSchool.classesCount).toBeGreaterThanOrEqual(1);
    });

    it("3.2 RBAC: should reject school listing by non-super_admins (403 Forbidden)", async () => {
      // School admin cannot list all schools in the multi-tenant system
      const reqAdmin = new NextRequest("http://localhost:3000/api/schools", {
        method: "GET",
        headers: { Authorization: `Bearer ${schoolAAdminToken}` },
      });
      const resAdmin = await getSchools(reqAdmin);
      expect(resAdmin.status).toBe(403);

      // Teacher cannot list all schools
      const reqTeacher = new NextRequest("http://localhost:3000/api/schools", {
        method: "GET",
        headers: { Authorization: `Bearer ${teacherToken}` },
      });
      const resTeacher = await getSchools(reqTeacher);
      expect(resTeacher.status).toBe(403);

      // Unauthenticated request
      const reqGuest = new NextRequest("http://localhost:3000/api/schools", { method: "GET" });
      const resGuest = await getSchools(reqGuest);
      expect(resGuest.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: SCHOOL DETAILS, UPDATE, STATUS TOGGLING & CACHE INVALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("4. School Details, Update, Status Toggling & Cache Invalidation", () => {
    it("4.1 should fetch single school by ID or slug for Super Admin", async () => {
      // By ID
      const reqById = new NextRequest(`http://localhost:3000/api/schools/${ctx.schoolA._id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const resById = await getSchoolById(reqById, { params: Promise.resolve({ id: ctx.schoolA._id.toString() }) });
      const jsonById = await resById.json();

      expect(resById.status).toBe(200);
      expect(jsonById.data.name).toBe(ctx.schoolA.name);

      // By Slug
      const reqBySlug = new NextRequest(`http://localhost:3000/api/schools/${ctx.schoolA.slug}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const resBySlug = await getSchoolById(reqBySlug, { params: Promise.resolve({ id: ctx.schoolA.slug }) });
      const jsonBySlug = await resBySlug.json();

      expect(resBySlug.status).toBe(200);
      expect(jsonBySlug.data._id.toString()).toBe(ctx.schoolA._id.toString());
    });

    it("4.2 should return 404 for non-existent school ID or slug", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const req = new NextRequest(`http://localhost:3000/api/schools/${fakeId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const res = await getSchoolById(req, { params: Promise.resolve({ id: fakeId }) });
      expect(res.status).toBe(404);
    });

    it("4.3 should update school properties and persist to database", async () => {
      const updatedAddress = "Updated Campus Address 456, Knowledge Park";
      const updatedPhone = "+91 88888 22222";

      const req = new NextRequest(`http://localhost:3000/api/schools/${ctx.schoolA._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          address: updatedAddress,
          phone: updatedPhone,
        }),
      });

      const res = await updateSchoolById(req, { params: Promise.resolve({ id: ctx.schoolA._id.toString() }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      // Verify in DB
      const dbSchool = await School.findById(ctx.schoolA._id).lean();
      expect(dbSchool?.address).toBe(updatedAddress);
      expect(dbSchool?.phone).toBe(updatedPhone);
    });

    it("4.4 should reject empty school name when updating (400 Bad Request)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/schools/${ctx.schoolA._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          name: "   ",
        }),
      });

      const res = await updateSchoolById(req, { params: Promise.resolve({ id: ctx.schoolA._id.toString() }) });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("School name cannot be empty");
    });

    it("4.5 should toggle school status to inactive (suspended) and back to active", async () => {
      // 1. Suspend school
      const reqSuspend = new NextRequest(`http://localhost:3000/api/schools/${ctx.schoolB._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          is_active: false,
        }),
      });
      const resSuspend = await updateSchoolById(reqSuspend, { params: Promise.resolve({ id: ctx.schoolB._id.toString() }) });
      const jsonSuspend = await resSuspend.json();

      expect(resSuspend.status).toBe(200);
      expect(jsonSuspend.data.is_active).toBe(false);

      const dbSuspended = await School.findById(ctx.schoolB._id).lean();
      expect(dbSuspended?.is_active).toBe(false);

      // 2. Reactivate school
      const reqReactivate = new NextRequest(`http://localhost:3000/api/schools/${ctx.schoolB._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          is_active: true,
        }),
      });
      const resReactivate = await updateSchoolById(reqReactivate, { params: Promise.resolve({ id: ctx.schoolB._id.toString() }) });
      const jsonReactivate = await resReactivate.json();

      expect(resReactivate.status).toBe(200);
      expect(jsonReactivate.data.is_active).toBe(true);

      const dbReactivated = await School.findById(ctx.schoolB._id).lean();
      expect(dbReactivated?.is_active).toBe(true);
    });

    it("4.6 should reject updating subdomain if already used by another school (409 Conflict)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/schools/${ctx.schoolB._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          subdomain: ctx.schoolA.subdomain,
        }),
      });

      const res = await updateSchoolById(req, { params: Promise.resolve({ id: ctx.schoolB._id.toString() }) });
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.message).toContain("already in use by another school");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: SCHOOL DELETION RESTRICTIONS & INTEGRITY GUARD
  // ═══════════════════════════════════════════════════════════════════════════

  describe("5. School Deletion Restrictions & Integrity Guard", () => {
    it("5.1 should prevent deletion of a school when users are still assigned (409 Conflict)", async () => {
      // School A has schoolAAdmin and schoolATeacher assigned
      const req = new NextRequest(`http://localhost:3000/api/schools/${ctx.schoolA._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      const res = await deleteSchoolById(req, { params: Promise.resolve({ id: ctx.schoolA._id.toString() }) });
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.message).toContain("Cannot delete school");
      expect(json.message).toContain("user(s) are still assigned");

      // Verify school was NOT deleted
      const stillExists = await School.findById(ctx.schoolA._id).lean();
      expect(stillExists).not.toBeNull();
    });

    it("5.2 should allow deletion of an empty school with zero assigned users", async () => {
      // Create empty temporary school
      const emptySchool = await School.create({
        name: "Temporary Empty School",
        slug: "temp-empty-school-xyz",
        subdomain: "temp-empty-school-xyz",
        is_active: false,
      });

      const req = new NextRequest(`http://localhost:3000/api/schools/${emptySchool._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      const res = await deleteSchoolById(req, { params: Promise.resolve({ id: emptySchool._id.toString() }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toContain("School deleted successfully");

      // Verify deleted from DB
      const deletedCheck = await School.findById(emptySchool._id).lean();
      expect(deletedCheck).toBeNull();
    });

    it("5.3 should reject deletion attempt by non-super_admin accounts (403 Forbidden)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/schools/${ctx.schoolA._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${schoolAAdminToken}` },
      });

      const res = await deleteSchoolById(req, { params: Promise.resolve({ id: ctx.schoolA._id.toString() }) });
      expect(res.status).toBe(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: SEO & METADATA CONFIGURATION ENDPOINT
  // ═══════════════════════════════════════════════════════════════════════════

  describe("6. SEO & Metadata Configuration Endpoint", () => {
    it("6.1 should fetch school SEO metadata for Super Admin using ?school_id=", async () => {
      const req = new NextRequest(`http://localhost:3000/api/school/meta-config?school_id=${ctx.schoolA._id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      const res = await getMetaConfig(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.school_id).toBe(ctx.schoolA._id.toString());
      expect(json.data.school_name).toBe(ctx.schoolA.name);
    });

    it("6.2 should update school SEO metadata and social tags for Super Admin", async () => {
      const req = new NextRequest("http://localhost:3000/api/school/meta-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`,
        },
        body: JSON.stringify({
          school_id: ctx.schoolA._id.toString(),
          meta_title: "Alpha International Academy | Official Campus ERP",
          meta_description: "Premier digital campus with online admissions, marksheet generation, and portal.",
          meta_keywords: "alpha academy, cbse, digital erp, student portal",
          og_image: "https://example.com/alpha-campus-og.jpg",
          favicon_url: "https://example.com/alpha-favicon.ico",
          google_site_verification: "google-site-verification-token-alpha-123",
          google_analytics_id: "G-ALPHA123456",
          custom_head_scripts: "<script>console.log('alpha-custom-script');</script>",
        }),
      });

      const res = await updateMetaConfig(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      // Verify in DB
      const dbSchool = await School.findById(ctx.schoolA._id).lean();
      const meta = (dbSchool as any)?.meta_config;
      expect(meta?.meta_title).toBe("Alpha International Academy | Official Campus ERP");
      expect(meta?.og_image).toBe("https://example.com/alpha-campus-og.jpg");
      expect(meta?.google_analytics_id).toBe("G-ALPHA123456");
    });

    it("6.3 Multi-Tenant Isolation: School Admin cannot modify another school's meta config", async () => {
      // School A Admin attempts to modify School B's meta config by sending school_id: School B
      const req = new NextRequest("http://localhost:3000/api/school/meta-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${schoolAAdminToken}`,
        },
        body: JSON.stringify({
          school_id: ctx.schoolB._id.toString(), // Attacker attempts to target School B
          meta_title: "HACKED META TITLE",
        }),
      });

      const res = await updateMetaConfig(req);
      expect(res.status).toBe(200);

      // Verify School B was NOT modified (requireAuth restricts non-super_admins to their own schoolId)
      const schoolBCheck = await School.findById(ctx.schoolB._id).lean();
      expect((schoolBCheck as any)?.meta_config?.meta_title).not.toBe("HACKED META TITLE");

      // Verify School A received the edit because non-super_admin targets their own tenant
      const schoolACheck = await School.findById(ctx.schoolA._id).lean();
      expect((schoolACheck as any)?.meta_config?.meta_title).toBe("HACKED META TITLE");
    });

    it("6.4 RBAC: should reject meta config access for teacher or student accounts (403 Forbidden)", async () => {
      const reqTeacher = new NextRequest("http://localhost:3000/api/school/meta-config", {
        method: "GET",
        headers: { Authorization: `Bearer ${teacherToken}` },
      });
      const resTeacher = await getMetaConfig(reqTeacher);
      expect(resTeacher.status).toBe(403);

      const reqStudent = new NextRequest("http://localhost:3000/api/school/meta-config", {
        method: "GET",
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      const resStudent = await getMetaConfig(reqStudent);
      expect(resStudent.status).toBe(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 7: SUPER ANALYTICS & GLOBAL METRICS API
  // ═══════════════════════════════════════════════════════════════════════════

  describe("7. Super Analytics & Global Metrics API", () => {
    it("7.1 should return aggregate live network statistics for Super Admin", async () => {
      const req = new NextRequest("http://localhost:3000/api/dashboard/super-analytics", {
        method: "GET",
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      const res = await getSuperAnalytics(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.summary).toBeDefined();
      expect(typeof json.data.summary.totalSchools).toBe("number");
      expect(typeof json.data.summary.activeSchools).toBe("number");
      expect(typeof json.data.summary.totalStudents).toBe("number");
      expect(typeof json.data.summary.totalTeachers).toBe("number");
      expect(json.data.summary.totalSchools).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(json.data.adminGrowth)).toBe(true);
      expect(Array.isArray(json.data.enrollmentTrends)).toBe(true);
    });

    it("7.2 RBAC: should reject super-analytics access for non-super_admins (403 Forbidden)", async () => {
      const reqAdmin = new NextRequest("http://localhost:3000/api/dashboard/super-analytics", {
        method: "GET",
        headers: { Authorization: `Bearer ${schoolAAdminToken}` },
      });
      const resAdmin = await getSuperAnalytics(reqAdmin);
      expect(resAdmin.status).toBe(403);

      const reqTeacher = new NextRequest("http://localhost:3000/api/dashboard/super-analytics", {
        method: "GET",
        headers: { Authorization: `Bearer ${teacherToken}` },
      });
      const resTeacher = await getSuperAnalytics(reqTeacher);
      expect(resTeacher.status).toBe(403);

      const reqGuest = new NextRequest("http://localhost:3000/api/dashboard/super-analytics", {
        method: "GET",
      });
      const resGuest = await getSuperAnalytics(reqGuest);
      expect(resGuest.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 8: MULTI-SCHOOL DATA ISOLATION & TENANT SWITCHING
  // ═══════════════════════════════════════════════════════════════════════════

  describe("8. Multi-School Data Isolation & Tenant Switching", () => {
    it("8.1 should allow Super Admin to switch school context in tenant backup API via ?school_id=", async () => {
      // Super admin backups School A
      const reqA = new NextRequest(`http://localhost:3000/api/backup/tenant?school_id=${ctx.schoolA._id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const resA = await getTenantBackup(reqA);
      const jsonA = await resA.json();

      expect(resA.status).toBe(200);
      expect(jsonA.format_version).toBe("2.0-saas");
      expect(jsonA.tenant.id).toBe(ctx.schoolA._id.toString());
      expect(jsonA.data.school._id.toString()).toBe(ctx.schoolA._id.toString());

      // Super admin switches to School B
      const reqB = new NextRequest(`http://localhost:3000/api/backup/tenant?school_id=${ctx.schoolB._id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const resB = await getTenantBackup(reqB);
      const jsonB = await resB.json();

      expect(resB.status).toBe(200);
      expect(jsonB.format_version).toBe("2.0-saas");
      expect(jsonB.tenant.id).toBe(ctx.schoolB._id.toString());
      expect(jsonB.data.school._id.toString()).toBe(ctx.schoolB._id.toString());
    });

    it("8.2 Multi-Tenant Isolation: School Admin CANNOT backup another school by changing ?school_id=", async () => {
      // School A Admin attempts to query School B backup
      const req = new NextRequest(`http://localhost:3000/api/backup/tenant?school_id=${ctx.schoolB._id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getTenantBackup(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.format_version).toBe("2.0-saas");
      // Backend forces auth.schoolId (School A), completely ignoring the unauthorized query param
      expect(json.tenant.id).toBe(ctx.schoolA._id.toString());
      expect(json.tenant.id).not.toBe(ctx.schoolB._id.toString());
    });

    it("8.3 RBAC: should reject tenant backup API for teacher, parent, or student (403 Forbidden)", async () => {
      const reqTeacher = new NextRequest("http://localhost:3000/api/backup/tenant", {
        method: "GET",
        headers: { Authorization: `Bearer ${teacherToken}` },
      });
      const resTeacher = await getTenantBackup(reqTeacher);
      expect(resTeacher.status).toBe(403);

      const reqStudent = new NextRequest("http://localhost:3000/api/backup/tenant", {
        method: "GET",
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      const resStudent = await getTenantBackup(reqStudent);
      expect(resStudent.status).toBe(403);
    });
  });
});
