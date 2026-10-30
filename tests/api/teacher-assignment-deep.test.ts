import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { setupTestDatabase, teardownTestDatabase, TestDataContext } from "../helpers/dbTestSetup";
import {
  GET as getAssignmentsRoute,
  POST as createAssignmentRoute,
  invalidateTaCache,
} from "@/app/api/teacher-assignment/route";
import {
  PUT as updateAssignmentRoute,
  DELETE as deleteAssignmentRoute,
} from "@/app/api/teacher-assignment/[id]/route";
import { generateAccessToken } from "@/lib/utils/jwt";
import { TeacherAssignment, Class } from "@/lib/models/index";
import Teacher from "@/lib/models/Teacher";

let ctx: TestDataContext;

beforeAll(async () => {
  ctx = await setupTestDatabase("assignments");
  invalidateTaCache();
}, 25000);

afterAll(async () => {
  await teardownTestDatabase("assignments");
  invalidateTaCache();
}, 25000);

describe("Deep Teacher Assignment & Subject Mapping Test Suite", () => {
  let createdSubjectAssignmentId: string;
  let createdClassTeacherAssignmentId: string;
  let schoolBAssignmentId: string;

  // ─── 1. Create Teacher Assignment (POST /api/teacher-assignment) ──
  describe("POST /api/teacher-assignment", () => {
    it("should allow School Admin to assign a Subject Teacher to Class and Subject", async () => {
      invalidateTaCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const payload = {
        academic_year: "2026-2027",
        teacher_id: ctx.teacherDocA._id.toString(),
        class_id: ctx.classA1._id.toString(),
        subject_master_id: ctx.subjectA1._id.toString(),
        assignment_type: "Subject Teacher",
        remarks: "Primary math teacher",
      };

      const req = new NextRequest("http://localhost:3000/api/teacher-assignment", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await createAssignmentRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.count).toBe(1);
      expect(json.data.length).toBe(1);
      expect(json.data[0].assignment_type).toBe("Subject Teacher");

      createdSubjectAssignmentId = json.data[0]._id;

      // Verify in DB
      const inDb = await TeacherAssignment.findById(createdSubjectAssignmentId);
      expect(inDb).not.toBeNull();
      expect(inDb?.academic_year).toBe("2026-2027");
      expect(inDb?.status).toBe("Active");
      expect(inDb?.history?.length).toBeGreaterThan(0);
    });

    it("should reject duplicate subject assignment for the same teacher, class, and year with 409", async () => {
      invalidateTaCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const payload = {
        academic_year: "2026-2027",
        teacher_id: ctx.teacherDocA._id.toString(),
        class_id: ctx.classA1._id.toString(),
        subject_master_id: ctx.subjectA1._id.toString(),
        assignment_type: "Subject Teacher",
      };

      const req = new NextRequest("http://localhost:3000/api/teacher-assignment", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await createAssignmentRoute(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.message).toContain("already assigned");
    });

    it("should allow assigning a Class Teacher and sync class_teacher_id in Class", async () => {
      invalidateTaCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const payload = {
        academic_year: "2026-2027",
        teacher_id: ctx.teacherDocA._id.toString(),
        class_id: ctx.classA1._id.toString(),
        assignment_type: "Class Teacher",
        remarks: "Class teacher of Class 10-A",
      };

      const req = new NextRequest("http://localhost:3000/api/teacher-assignment", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await createAssignmentRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data[0].assignment_type).toBe("Class Teacher");

      createdClassTeacherAssignmentId = json.data[0]._id;

      // Verify Class was updated in DB
      const classInDb = await Class.findById(ctx.classA1._id);
      expect(classInDb?.class_teacher_id?.toString()).toBe(ctx.teacherDocA._id.toString());
    });

    it("should reject assigning a SECOND Class Teacher to the same class with 409 Conflict", async () => {
      invalidateTaCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Create another teacher in School A
      const secondTeacher = await Teacher.create({
        school_id: ctx.schoolA._id,
        name: "Second Alpha Teacher",
        employee_id: `SEC-${Date.now()}`,
        is_active: true,
      });

      const payload = {
        academic_year: "2026-2027",
        teacher_id: secondTeacher._id.toString(),
        class_id: ctx.classA1._id.toString(), // Class A1 already has TeacherDocA!
        assignment_type: "Class Teacher",
      };

      const req = new NextRequest("http://localhost:3000/api/teacher-assignment", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await createAssignmentRoute(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.message).toContain("already has an active Class Teacher");
    });

    it("should reject assigning a teacher as Class Teacher to multiple classes with 409 Conflict", async () => {
      invalidateTaCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // TeacherDocA is already Class Teacher of Class A1! Trying to assign to Class A2:
      const payload = {
        academic_year: "2026-2027",
        teacher_id: ctx.teacherDocA._id.toString(),
        class_id: ctx.classA2._id.toString(),
        assignment_type: "Class Teacher",
      };

      const req = new NextRequest("http://localhost:3000/api/teacher-assignment", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await createAssignmentRoute(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.message).toContain("already assigned as Class Teacher for");
    });

    it("should BLOCK assigning School B teacher to School A class (Cross-Tenant IDOR Defense)", async () => {
      invalidateTaCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const payload = {
        academic_year: "2026-2027",
        teacher_id: ctx.teacherDocB._id.toString(), // Belongs to School B!
        class_id: ctx.classA1._id.toString(),
        subject_master_id: ctx.subjectA1._id.toString(),
        assignment_type: "Subject Teacher",
      };

      const req = new NextRequest("http://localhost:3000/api/teacher-assignment", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await createAssignmentRoute(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.message).toContain("Teacher not found");
    });

    it("should defend against invalid ObjectIds with 400 Bad Request", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/teacher-assignment", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: "2026-2027",
          teacher_id: "invalid-id",
          class_id: ctx.classA1._id.toString(),
          assignment_type: "Class Teacher",
        }),
      });

      const res = await createAssignmentRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid IDs");
    });
  });

  // ─── 2. List & Query Assignments (GET /api/teacher-assignment) ────
  describe("GET /api/teacher-assignment", () => {
    beforeAll(async () => {
      // Create a School B assignment for IDOR test
      const bAssignment = await TeacherAssignment.create({
        school_id: ctx.schoolB._id,
        academic_year: "2026-2027",
        teacher_id: ctx.teacherDocB._id,
        class_id: ctx.classB1._id,
        subject_master_id: ctx.subjectB1._id,
        assignment_type: "Subject Teacher",
        status: "Active",
      });
      schoolBAssignmentId = bAssignment._id.toString();
    });

    it("should list teacher assignments for School A with populated relations", async () => {
      invalidateTaCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/teacher-assignment?page=1&limit=10", {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getAssignmentsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.assignments)).toBe(true);
      expect(json.data.assignments.length).toBeGreaterThanOrEqual(2);

      // Verify no School B assignments leaked
      const leaked = json.data.assignments.some(
        (a: any) => a._id === schoolBAssignmentId || a.school_id === ctx.schoolB._id.toString()
      );
      expect(leaked).toBe(false);
    });

    it("should filter assignments by class_id and teacher_id", async () => {
      invalidateTaCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/teacher-assignment?class_id=${ctx.classA1._id.toString()}&teacher_id=${ctx.teacherDocA._id.toString()}`,
        {
          method: "GET",
          headers: { authorization: `Bearer ${token}` },
        }
      );

      const res = await getAssignmentsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.assignments.length).toBeGreaterThanOrEqual(1);
    });

    it("should return empty results safely without 500 crash on invalid teacher_id query filter", async () => {
      invalidateTaCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/teacher-assignment?teacher_id=invalid-id", {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getAssignmentsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.assignments).toEqual([]);
    });
  });

  // ─── 3. Update Assignment (PUT /api/teacher-assignment/[id]) ───────
  describe("PUT /api/teacher-assignment/[id]", () => {
    it("should allow School Admin to update assignment remarks and track history", async () => {
      invalidateTaCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/teacher-assignment/${createdSubjectAssignmentId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          remarks: "Updated: Senior Mathematics Mentor",
        }),
      });

      const res = await updateAssignmentRoute(req, {
        params: Promise.resolve({ id: createdSubjectAssignmentId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.remarks).toBe("Updated: Senior Mathematics Mentor");

      // Verify history trail in DB
      const inDb = await TeacherAssignment.findById(createdSubjectAssignmentId);
      const lastHistory = inDb?.history?.at(-1);
      expect(lastHistory?.action).toBe("Update");
    });

    it("should BLOCK School A Admin from updating School B assignment (IDOR Defense)", async () => {
      invalidateTaCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/teacher-assignment/${schoolBAssignmentId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          remarks: "Malicious Cross-Tenant Tamper",
        }),
      });

      const res = await updateAssignmentRoute(req, {
        params: Promise.resolve({ id: schoolBAssignmentId }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.message).toContain("not found");
    });

    it("should reject malformed assignment ID with 400 Bad Request", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/teacher-assignment/invalid-id", {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "Inactive" }),
      });

      const res = await updateAssignmentRoute(req, {
        params: Promise.resolve({ id: "invalid-id" }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid assignment ID");
    });
  });

  // ─── 4. Delete & Soft Delete (DELETE /api/teacher-assignment/[id]) ──
  describe("DELETE /api/teacher-assignment/[id]", () => {
    it("should BLOCK School A Admin from deleting School B assignment (IDOR Defense)", async () => {
      invalidateTaCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/teacher-assignment/${schoolBAssignmentId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await deleteAssignmentRoute(req, {
        params: Promise.resolve({ id: schoolBAssignmentId }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.message).toContain("not found");
    });

    it("should soft delete Class Teacher assignment and reset class_teacher_id in Class", async () => {
      invalidateTaCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/teacher-assignment/${createdClassTeacherAssignmentId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await deleteAssignmentRoute(req, {
        params: Promise.resolve({ id: createdClassTeacherAssignmentId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain("soft-deleted");

      // Verify in DB that is_deleted is true
      const inDb = await TeacherAssignment.findById(createdClassTeacherAssignmentId);
      expect(inDb?.is_deleted).toBe(true);

      // Verify Class has class_teacher_id cleared to null
      const classInDb = await Class.findById(ctx.classA1._id);
      expect(classInDb?.class_teacher_id).toBeNull();
    });

    it("should return 404 when attempting to delete an already deleted assignment", async () => {
      invalidateTaCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/teacher-assignment/${createdClassTeacherAssignmentId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await deleteAssignmentRoute(req, {
        params: Promise.resolve({ id: createdClassTeacherAssignmentId }),
      });

      expect(res.status).toBe(404);
    });
  });

  // ─── 5. Authorization & Concurrency ───────────────────────────────
  describe("Security & Concurrency", () => {
    it("should reject student role from creating or modifying assignments (403)", async () => {
      const studentToken = generateAccessToken({
        user_id: ctx.schoolAStudent._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "student",
      });

      const req = new NextRequest("http://localhost:3000/api/teacher-assignment", {
        method: "POST",
        headers: {
          authorization: `Bearer ${studentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: "2026-2027",
          teacher_id: ctx.teacherDocA._id.toString(),
          class_id: ctx.classA1._id.toString(),
          assignment_type: "Class Teacher",
        }),
      });

      const res = await createAssignmentRoute(req);
      expect(res.status).toBe(403);
    });
  });
});
