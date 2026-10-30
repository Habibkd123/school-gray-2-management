import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { setupTestDatabase, teardownTestDatabase, TestDataContext } from "../helpers/dbTestSetup";
import { GET as getTeachersRoute, POST as createTeacherRoute, invalidateTeachersServerCache } from "@/app/api/teachers/route";
import {
  GET as getTeacherByIdRoute,
  PUT as updateTeacherRoute,
  DELETE as deleteTeacherRoute,
} from "@/app/api/teachers/[id]/route";
import { GET as getTeacherFiltersRoute } from "@/app/api/teachers/filters/route";
import { POST as importTeachersRoute } from "@/app/api/teachers/import/route";
import { POST as validateImportRoute } from "@/app/api/teachers/import/validate/route";
import { generateAccessToken } from "@/lib/utils/jwt";
import Teacher from "@/lib/models/Teacher";
import User from "@/lib/models/User";
import Class from "@/lib/models/Class";

let ctx: TestDataContext;

beforeAll(async () => {
  ctx = await setupTestDatabase("teachers");
  invalidateTeachersServerCache();
}, 25000);

afterAll(async () => {
  await teardownTestDatabase("teachers");
  invalidateTeachersServerCache();
}, 25000);

describe("Deep Teachers & Staff Test Suite", () => {
  let createdTeacherId: string;

  // ─── 1. Create Teacher (POST /api/teachers) ────────────────────────
  describe("POST /api/teachers", () => {
    it("should allow School Admin to create a teacher with auto-provisioned user account", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const payload = {
        name: "Professor Samuel Oak",
        employee_id: `OAK-${Date.now()}`,
        gender: "male",
        dob: "1980-05-15",
        phone: "9876599001",
        email: "samuel.oak@example.com",
        qualification: "Ph.D Biology",
        subject_specialization: "Biology",
        expertise: ["Biology", "Chemistry"],
        experience_years: 12,
        department: "Science",
        designation: "Head of Department",
        class_id: ctx.classA1._id.toString(),
      };

      const req = new NextRequest("http://localhost:3000/api/teachers", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await createTeacherRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Professor Samuel Oak");
      expect(json.data.employee_id).toBe(payload.employee_id);
      expect(json.data.department).toBe("Science");
      expect(json.credentials).toBeDefined();
      expect(json.credentials.loginId).toBeDefined();
      expect(json.credentials.password).toBe("Master#2026");

      createdTeacherId = json.data._id;

      // Verify Teacher document in DB
      const teacherInDb = await Teacher.findById(createdTeacherId);
      expect(teacherInDb).not.toBeNull();
      expect(teacherInDb?.is_active).toBe(true);
      expect(teacherInDb?.class_id?.toString()).toBe(ctx.classA1._id.toString());

      // Verify Class was updated with class_teacher_id
      const classInDb = await Class.findById(ctx.classA1._id);
      expect(classInDb?.class_teacher_id?.toString()).toBe(createdTeacherId);

      // Verify linked User document in DB
      const userInDb = await User.findById(teacherInDb?.user_id);
      expect(userInDb).not.toBeNull();
      expect(userInDb?.role).toBe("teacher");
      expect(userInDb?.is_active).toBe(true);
    });

    it("should reject creation when name is missing with 400", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/teachers", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: "9876599002",
        }),
      });

      const res = await createTeacherRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toBe("Name is required");
    });

    it("should reject duplicate mobile number in the same school with 409", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/teachers", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Duplicate Phone Teacher",
          phone: ctx.teacherDocA.phone, // Phone of existing Alpha teacher
        }),
      });

      const res = await createTeacherRoute(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.message).toContain("already exists in this school");
    });

    it("should reject duplicate employee ID in the same school with 409", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/teachers", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Duplicate Emp ID Teacher",
          employee_id: ctx.teacherDocA.employee_id, // Duplicate employee ID
          phone: "9876599099",
        }),
      });

      const res = await createTeacherRoute(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.message).toContain("already exists");
    });

    it("should defend against invalid class_id with 400 Bad Request", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/teachers", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Invalid Class Teacher",
          class_id: "not-a-valid-mongo-id",
        }),
      });

      const res = await createTeacherRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid class ID");
    });
  });

  // ─── 2. List & Filter Teachers (GET /api/teachers) ────────────────
  describe("GET /api/teachers", () => {
    it("should list active teachers for School A admin with pagination", async () => {
      invalidateTeachersServerCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/teachers?page=1&limit=10", {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getTeachersRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.teachers)).toBe(true);
      expect(json.data.teachers.length).toBeGreaterThanOrEqual(1);

      // Verify multi-tenant isolation: No School B teachers in School A listing
      const hasSchoolB = json.data.teachers.some(
        (t: any) => t.school_id?.toString() === ctx.schoolB._id.toString()
      );
      expect(hasSchoolB).toBe(false);
    });

    it("should filter teachers by department and search keyword", async () => {
      invalidateTeachersServerCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/teachers?department=Science&search=Samuel", {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getTeachersRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.teachers.length).toBe(1);
      expect(json.data.teachers[0].name).toBe("Professor Samuel Oak");
    });

    it("should allow Super Admin to query teachers across schools or specific school", async () => {
      invalidateTeachersServerCache();
      const token = generateAccessToken({
        user_id: ctx.superAdmin._id.toString(),
        school_id: "",
        role: "super_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/teachers?school_id=${ctx.schoolA._id.toString()}`, {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getTeachersRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.teachers.length).toBeGreaterThanOrEqual(1);
    });

    it("should safely handle invalid school_id for Super Admin without 500 crash", async () => {
      invalidateTeachersServerCache();
      const token = generateAccessToken({
        user_id: ctx.superAdmin._id.toString(),
        school_id: "",
        role: "super_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/teachers?school_id=invalid-mongo-id", {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getTeachersRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.teachers).toEqual([]);
    });
  });

  // ─── 3. Single Teacher CRUD & IDOR (GET/PUT/DELETE /api/teachers/[id])
  describe("GET /api/teachers/[id]", () => {
    it("should fetch single teacher details by ID with populated relations", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/teachers/${createdTeacherId}`, {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getTeacherByIdRoute(req, {
        params: Promise.resolve({ id: createdTeacherId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Professor Samuel Oak");
      expect(json.data.user_id).toBeDefined();
    });

    it("should reject malformed teacher ID with 400 Bad Request", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/teachers/bad-id", {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getTeacherByIdRoute(req, {
        params: Promise.resolve({ id: "bad-id" }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid teacher ID");
    });

    it("should BLOCK School A Admin from fetching School B teacher (IDOR Defense)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/teachers/${ctx.teacherDocB._id.toString()}`, {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getTeacherByIdRoute(req, {
        params: Promise.resolve({ id: ctx.teacherDocB._id.toString() }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.message).toContain("not found");
    });
  });

  // ─── 4. Update Teacher (PUT /api/teachers/[id]) ─────────────────────
  describe("PUT /api/teachers/[id]", () => {
    it("should allow School Admin to update teacher profile details", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/teachers/${createdTeacherId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          designation: "Principal Scientist",
          experience_years: 15,
        }),
      });

      const res = await updateTeacherRoute(req, {
        params: Promise.resolve({ id: createdTeacherId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.designation).toBe("Principal Scientist");
      expect(json.data.experience_years).toBe(15);
    });

    it("should validate password complexity when updating teacher password", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Weak password (< 8 chars, no uppercase/number)
      const req = new NextRequest(`http://localhost:3000/api/teachers/${createdTeacherId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: "weak",
        }),
      });

      const res = await updateTeacherRoute(req, {
        params: Promise.resolve({ id: createdTeacherId }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Validation failed");
    });

    it("should BLOCK School A Admin from updating School B teacher (IDOR Defense)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/teachers/${ctx.teacherDocB._id.toString()}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Malicious Hacked Teacher Name",
        }),
      });

      const res = await updateTeacherRoute(req, {
        params: Promise.resolve({ id: ctx.teacherDocB._id.toString() }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.message).toContain("not found");
    });

    it("should reject invalid class_id in update payload with 400", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/teachers/${createdTeacherId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          class_id: "not-a-valid-id",
        }),
      });

      const res = await updateTeacherRoute(req, {
        params: Promise.resolve({ id: createdTeacherId }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid class ID");
    });
  });

  // ─── 5. Delete & Soft Delete (DELETE /api/teachers/[id]) ───────────
  describe("DELETE /api/teachers/[id]", () => {
    it("should BLOCK School A Admin from deleting School B teacher (IDOR Defense)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/teachers/${ctx.teacherDocB._id.toString()}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await deleteTeacherRoute(req, {
        params: Promise.resolve({ id: ctx.teacherDocB._id.toString() }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.message).toContain("not found");
    });

    it("should soft delete teacher and deactivate linked user account", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/teachers/${createdTeacherId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await deleteTeacherRoute(req, {
        params: Promise.resolve({ id: createdTeacherId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain("archived to trash");

      // Verify in DB that is_deleted is true and is_active is false
      const teacherInDb = await Teacher.findById(createdTeacherId);
      expect(teacherInDb?.is_deleted).toBe(true);
      expect(teacherInDb?.is_active).toBe(false);

      // Verify linked User account is also deactivated
      const userInDb = await User.findById(teacherInDb?.user_id);
      expect(userInDb?.is_active).toBe(false);
    });

    it("should return 404 when attempting to delete an already deleted teacher", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/teachers/${createdTeacherId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await deleteTeacherRoute(req, {
        params: Promise.resolve({ id: createdTeacherId }),
      });

      expect(res.status).toBe(404);
    });
  });

  // ─── 6. Teacher Filters API (GET /api/teachers/filters) ────────────
  describe("GET /api/teachers/filters", () => {
    it("should return distinct departments, designations, and academic years", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/teachers/filters", {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getTeacherFiltersRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.departments)).toBe(true);
      expect(Array.isArray(json.data.designations)).toBe(true);
      expect(Array.isArray(json.data.academicYears)).toBe(true);
      expect(json.data.statuses).toContain("Active");
    });
  });

  // ─── 7. Bulk Import & CSV Validation (/api/teachers/import/*) ───────
  describe("POST /api/teachers/import/validate & POST /api/teachers/import", () => {
    it("should validate CSV rows, detect DB duplicates and missing required fields", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const rows = [
        {
          name: "Valid Import Teacher",
          employee_id: `NEW-EMP-${Date.now()}`,
          gender: "Male",
          dob: "1985-06-20",
          phone: "9876511111",
          subject_specialization: "Physics",
          qualification: "M.Sc Physics",
          experience_years: "6",
          "assigned classes": "Class 10 - A",
        },
        {
          name: "Duplicate Emp Teacher",
          employee_id: ctx.teacherDocA.employee_id, // Already exists in DB!
          subject_specialization: "Chemistry",
        },
        {
          // Missing name, employee_id, and subject
          phone: "9876522222",
        },
      ];

      const req = new NextRequest("http://localhost:3000/api/teachers/import/validate", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rows }),
      });

      const res = await validateImportRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(3);

      // Row 0: Valid
      expect(json.data[0].isValid).toBe(true);
      expect(json.data[0].errors.length).toBe(0);
      expect(json.data[0].data.class_ids.length).toBe(1);

      // Row 1: Duplicate employee ID
      expect(json.data[1].isValid).toBe(false);
      expect(json.data[1].errors[0]).toContain("already exists in database");

      // Row 2: Missing required fields
      expect(json.data[2].isValid).toBe(false);
      expect(json.data[2].errors).toContain("Teacher name is required.");
      expect(json.data[2].errors).toContain("Employee ID is required.");
      expect(json.data[2].errors).toContain("Subject specialization is required.");
    });

    it("should successfully import valid rows and provision user accounts", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const uniqueEmpId = `BULK-EMP-${Date.now()}`;
      const rows = [
        {
          name: "Bulk Imported Teacher One",
          employee_id: uniqueEmpId,
          gender: "female",
          dob: "1990-03-25",
          phone: "9876588888",
          subject_specialization: "History",
          qualification: "M.A History",
          experience_years: 4,
          class_ids: [ctx.classA2._id.toString()],
        },
      ];

      const req = new NextRequest("http://localhost:3000/api/teachers/import", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rows }),
      });

      const res = await importTeachersRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.successCount).toBe(1);
      expect(json.data.failedCount).toBe(0);

      // Verify in DB
      const importedTeacher = await Teacher.findOne({
        school_id: ctx.schoolA._id,
        employee_id: uniqueEmpId,
      });
      expect(importedTeacher).not.toBeNull();
      expect(importedTeacher?.name).toBe("Bulk Imported Teacher One");

      // Verify user account created
      const user = await User.findById(importedTeacher?.user_id);
      expect(user).not.toBeNull();
      expect(user?.role).toBe("teacher");
    });
  });

  // ─── 8. Role-based Authorization ──────────────────────────────────
  describe("Role-based Authorization & Security", () => {
    it("should forbid student role from creating or deleting teachers (403)", async () => {
      const studentToken = generateAccessToken({
        user_id: ctx.schoolAStudent._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "student",
      });

      const createReq = new NextRequest("http://localhost:3000/api/teachers", {
        method: "POST",
        headers: {
          authorization: `Bearer ${studentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Hacker Teacher" }),
      });

      const createRes = await createTeacherRoute(createReq);
      expect(createRes.status).toBe(403);

      const deleteReq = new NextRequest(`http://localhost:3000/api/teachers/${ctx.teacherDocA._id.toString()}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${studentToken}` },
      });

      const deleteRes = await deleteTeacherRoute(deleteReq, {
        params: Promise.resolve({ id: ctx.teacherDocA._id.toString() }),
      });
      expect(deleteRes.status).toBe(403);
    });
  });
});
