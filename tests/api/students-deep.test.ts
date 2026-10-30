import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { setupTestDatabase, teardownTestDatabase, TestDataContext } from "../helpers/dbTestSetup";
import { GET as getStudentsRoute, POST as createStudentRoute } from "@/app/api/students/route";
import {
  GET as getStudentByIdRoute,
  PUT as updateStudentRoute,
  DELETE as deleteStudentRoute,
} from "@/app/api/students/[id]/route";
import { POST as promoteStudentsRoute } from "@/app/api/students/promote/route";
import { POST as validateImportRoute } from "@/app/api/students/import/validate/route";
import { POST as importStudentsRoute } from "@/app/api/students/import/route";
import { generateAccessToken } from "@/lib/utils/jwt";
import Student from "@/lib/models/Student";
import User from "@/lib/models/User";
import mongoose from "mongoose";

let ctx: TestDataContext;

beforeAll(async () => {
  ctx = await setupTestDatabase("students");
}, 25000);

afterAll(async () => {
  await teardownTestDatabase("students");
}, 25000);

describe("Deep Students API Test Suite", () => {
  // ─── 1. Create Student (POST /api/students) ─────────────────────
  describe("POST /api/students", () => {
    it("should allow School Admin to create a new student with required fields", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const studentPayload = {
        name: "Test New Student",
        class_id: ctx.classA1._id.toString(),
        admission_no: `STUD-NEW-${Date.now()}`,
        academic_year: "2026-2027",
        gender: "male",
        dob: "2010-05-15",
        phone: "9988776655",
        guardian_name: "Test Guardian",
        guardian_phone: "9988776654",
        guardian_relation: "Father",
      };

      const req = new NextRequest("http://localhost:3000/api/students", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(studentPayload),
      });

      const res = await createStudentRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Test New Student");
      expect(json.data.school_id).toBe(ctx.schoolA._id.toString());
      expect(json.data.user_id).toBeDefined(); // Student user account auto-created
    });

    it("should reject creation if student name is missing", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/students", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          class_id: ctx.classA1._id.toString(),
          admission_no: "ADM-NONAME",
        }),
      });

      const res = await createStudentRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Student name is required");
    });

    it("should reject creation if class_id is missing or invalid ObjectId", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req1 = new NextRequest("http://localhost:3000/api/students", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Alice", admission_no: "ADM-1" }),
      });
      const res1 = await createStudentRoute(req1);
      expect(res1.status).toBe(400);

      const req2 = new NextRequest("http://localhost:3000/api/students", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Alice",
          class_id: "invalid_class_object_id",
          admission_no: "ADM-2",
        }),
      });
      const res2 = await createStudentRoute(req2);
      expect(res2.status).toBe(400);
      expect(res2.status).not.toBe(500);
    });

    it("should reject duplicate admission number within the same school with 409", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/students", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Duplicate Adm Student",
          class_id: ctx.classA1._id.toString(),
          admission_no: ctx.studentDocA.admission_no, // Already exists in School A
        }),
      });

      const res = await createStudentRoute(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.message).toContain("already exists");
    });

    it("should reject Teacher role from creating a student (RBAC)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolATeacher._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "teacher",
      });

      const req = new NextRequest("http://localhost:3000/api/students", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Teacher Created Student",
          class_id: ctx.classA1._id.toString(),
          admission_no: "TEACH-101",
        }),
      });

      const res = await createStudentRoute(req);
      expect(res.status).toBe(403);
    });
  });

  // ─── 2. List & Filter Students (GET /api/students) ──────────────
  describe("GET /api/students", () => {
    it("should return student list with pagination and class population for School A Admin", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/students?page=1&limit=10", {
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getStudentsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.students)).toBe(true);
      expect(json.data.students.length).toBeGreaterThanOrEqual(1);

      // Verify tenant isolation: NO student from School B is returned
      const schoolBStudent = json.data.students.find(
        (s: any) => s._id.toString() === ctx.studentDocB._id.toString()
      );
      expect(schoolBStudent).toBeUndefined();
    });

    it("should filter students by class_id and academic_year", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/students?class_id=${ctx.classA1._id}&academic_year=2026-2027`,
        { headers: { authorization: `Bearer ${token}` } }
      );

      const res = await getStudentsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      for (const s of json.data.students) {
        expect(s.class_id._id.toString()).toBe(ctx.classA1._id.toString());
      }
    });

    it("should gracefully handle malformed class_id without 500 error", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/students?class_id=invalid_id_not_object", {
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getStudentsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.students).toEqual([]); // Clean empty result
    });

    it("should support text search by student name", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/students?search=Alice", {
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getStudentsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      const found = json.data.students.some((s: any) => s.name.includes("Alice"));
      expect(found).toBe(true);
    });
  });

  // ─── 3. Single Student Details & IDOR (GET /api/students/[id]) ──
  describe("GET /api/students/[id]", () => {
    it("should allow School A Admin to view student in School A", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/students/${ctx.studentDocA._id}`, {
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getStudentByIdRoute(req, {
        params: Promise.resolve({ id: ctx.studentDocA._id.toString() }),
      });

      expect(res!.status).toBe(200);
      const json = await res!.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Alpha Student Alice");
    });

    it("should BLOCK School A Admin from viewing School B Student (IDOR Defense)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Target belongs to School B!
      const targetId = ctx.studentDocB._id.toString();

      const req = new NextRequest(`http://localhost:3000/api/students/${targetId}`, {
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getStudentByIdRoute(req, {
        params: Promise.resolve({ id: targetId }),
      });

      expect([403, 404]).toContain(res!.status);
    });

    it("should reject student role attempting to access another student's profile (Role-based IDOR)", async () => {
      const studentToken = generateAccessToken({
        user_id: ctx.schoolAStudent._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "student",
      });

      // Alice tries to access Bob's profile
      const req = new NextRequest(`http://localhost:3000/api/students/${ctx.studentDocB._id}`, {
        headers: { authorization: `Bearer ${studentToken}` },
      });

      const res = await getStudentByIdRoute(req, {
        params: Promise.resolve({ id: ctx.studentDocB._id.toString() }),
      });

      expect([403, 404]).toContain(res!.status);
    });

    it("should cleanly return 400 for invalid student ID", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/students/malformed_id", {
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getStudentByIdRoute(req, {
        params: Promise.resolve({ id: "malformed_id" }),
      });

      expect(res!.status).toBe(400);
      const json = await res!.json();
      expect(json.message).toContain("Invalid student ID");
    });
  });

  // ─── 4. Update Student (PUT /api/students/[id]) ──────────────────
  describe("PUT /api/students/[id]", () => {
    it("should allow School Admin to update student information", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const studentId = ctx.studentDocA._id.toString();

      const req = new NextRequest(`http://localhost:3000/api/students/${studentId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Alpha Student Alice Updated",
          blood_group: "O+",
        }),
      });

      const res = await updateStudentRoute(req, {
        params: Promise.resolve({ id: studentId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      const check = await Student.findById(studentId);
      expect(check?.name).toBe("Alpha Student Alice Updated");
      expect(check?.blood_group).toBe("O+");
    });

    it("should BLOCK School A Admin from updating School B student (IDOR Defense)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const targetId = ctx.studentDocB._id.toString();

      const req = new NextRequest(`http://localhost:3000/api/students/${targetId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Hacked Student" }),
      });

      const res = await updateStudentRoute(req, {
        params: Promise.resolve({ id: targetId }),
      });

      expect([403, 404]).toContain(res.status);
      const check = await Student.findById(targetId);
      expect(check?.name).not.toBe("Hacked Student");
    });
  });

  // ─── 5. Delete Student (DELETE /api/students/[id]) ───────────────
  describe("DELETE /api/students/[id]", () => {
    it("should perform soft-delete and deactivate linked login user account", async () => {
      // Create temporary student to delete
      const tempUser = await User.create({
        school_id: ctx.schoolA._id,
        name: "Student To Delete",
        email: `delete.temp.${Date.now()}@testschool.com`,
        password_hash: "hash",
        role: "student",
        is_active: true,
      });

      const tempStudent = await Student.create({
        school_id: ctx.schoolA._id,
        user_id: tempUser._id,
        class_id: ctx.classA1._id,
        name: "Student To Delete",
        admission_no: `DEL-ADM-${Date.now()}`,
        academic_year: "2026-2027",
        is_active: true,
      });

      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/students/${tempStudent._id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await deleteStudentRoute(req, {
        params: Promise.resolve({ id: tempStudent._id.toString() }),
      });

      expect(res.status).toBe(200);

      // Verify soft delete in database
      const checkStudent = await Student.findById(tempStudent._id);
      expect(checkStudent?.is_deleted).toBe(true);
      expect(checkStudent?.is_active).toBe(false);

      // Verify linked user was deactivated
      const checkUser = await User.findById(tempUser._id);
      expect(checkUser?.is_active).toBe(false);
    });

    it("should BLOCK School A Admin from deleting School B Student (IDOR Defense)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const targetId = ctx.studentDocB._id.toString();

      const req = new NextRequest(`http://localhost:3000/api/students/${targetId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await deleteStudentRoute(req, {
        params: Promise.resolve({ id: targetId }),
      });

      expect([403, 404]).toContain(res.status);

      const check = await Student.findById(targetId);
      expect(check?.is_deleted).not.toBe(true);
    });
  });

  // ─── 6. Bulk Promotion (POST /api/students/promote) ─────────────
  describe("POST /api/students/promote", () => {
    it("should promote students to next class and update academic year", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const studentId = ctx.studentDocA._id.toString();
      const targetClassId = ctx.classA2._id.toString(); // Promote from Class 10 to Class 11

      const req = new NextRequest("http://localhost:3000/api/students/promote", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promotions: [
            {
              studentId,
              classId: targetClassId,
              academicYear: "2027-2028",
            },
          ],
        }),
      });

      const res = await promoteStudentsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.succeededCount).toBe(1);

      const updated = await Student.findById(studentId);
      expect(updated?.class_id.toString()).toBe(targetClassId);
      expect(updated?.academic_year).toBe("2027-2028");

      // Revert back
      await Student.findByIdAndUpdate(studentId, {
        class_id: ctx.classA1._id,
        academic_year: "2026-2027",
      });
    });

    it("should reject promoting student belonging to another school (Cross-tenant defense)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Target is School B's student!
      const req = new NextRequest("http://localhost:3000/api/students/promote", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promotions: [
            {
              studentId: ctx.studentDocB._id.toString(),
              classId: ctx.classA2._id.toString(),
            },
          ],
        }),
      });

      const res = await promoteStudentsRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Failed to promote");
    });
  });

  // ─── 7. Bulk Import Validation (POST /api/students/import/validate) 
  describe("POST /api/students/import/validate", () => {
    it("should validate CSV import rows and flag duplicate admission numbers", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const rows = [
        {
          name: "Valid Import Student",
          admission_no: `IMPORT-ADM-${Date.now()}`,
          class: "Class 10",
          section: "A",
          gender: "Male",
          dob: "2010-01-01",
          phone: "9123456789",
          guardian_name: "Guardian",
          guardian_phone: "9123456780",
          guardian_relation: "Father",
          academic_year: "2026-2027",
        },
        {
          name: "Duplicate Adm Student",
          admission_no: ctx.studentDocA.admission_no, // Duplicate of existing student!
          class: "Class 10",
          section: "A",
          gender: "Female",
          dob: "2010-02-02",
          guardian_name: "Guardian",
          guardian_phone: "9123456781",
          guardian_relation: "Mother",
          academic_year: "2026-2027",
        },
      ];

      const req = new NextRequest("http://localhost:3000/api/students/import/validate", {
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
      expect(Array.isArray(json.data)).toBe(true);
      const validRows = json.data.filter((r: any) => r.isValid);
      const invalidRows = json.data.filter((r: any) => !r.isValid);
      expect(validRows.length).toBe(1);
      expect(invalidRows.length).toBe(1);
      expect(json.data[1].isValid).toBe(false);
      expect(json.data[1].errors[0]).toContain("already exists");
    });
  });
});
