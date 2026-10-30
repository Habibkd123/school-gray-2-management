import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { setupTestDatabase, teardownTestDatabase, TestDataContext } from "../helpers/dbTestSetup";
import { GET as getAdmissionsRoute, POST as createAdmissionRoute } from "@/app/api/admissions/route";
import {
  GET as getAdmissionByIdRoute,
  PUT as updateAdmissionRoute,
  DELETE as deleteAdmissionRoute,
} from "@/app/api/admissions/[id]/route";
import { PUT as updateAdmissionStatusRoute } from "@/app/api/admissions/[id]/status/route";
import { POST as approveAdmissionRoute } from "@/app/api/admissions/[id]/approve/route";
import { generateAccessToken } from "@/lib/utils/jwt";
import Admission from "@/lib/models/Admission";
import Student from "@/lib/models/Student";
import User from "@/lib/models/User";

let ctx: TestDataContext;

beforeAll(async () => {
  ctx = await setupTestDatabase("admissions");
}, 25000);

afterAll(async () => {
  await teardownTestDatabase("admissions");
}, 25000);

describe("Deep Admissions & Enrollment Test Suite", () => {
  let createdAdmissionId: string;
  let schoolBAdmissionId: string;

  // ─── 1. Create Admission Inquiry (POST /api/admissions) ─────────
  describe("POST /api/admissions", () => {
    it("should allow School Admin to create a new admission inquiry with generated application_no", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const payload = {
        student_name: "John Admission Candidate",
        gender: "male",
        dob: "2012-08-10",
        phone: "9876500001",
        academic_year: "2026-2027",
        class_id: ctx.classA1._id.toString(),
        father_name: "Mark Candidate",
        mother_name: "Sarah Candidate",
      };

      const req = new NextRequest("http://localhost:3000/api/admissions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await createAdmissionRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.application_no).toMatch(/^ADM-\d{4}-\d{6}$/);
      expect(json.data.status).toBe("New");
      expect(json.data.student_name).toBe("John Admission Candidate");

      createdAdmissionId = json.data._id.toString();
    });

    it("should reject creation if required fields are missing", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Missing student_name and phone
      const req = new NextRequest("http://localhost:3000/api/admissions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: "2026-2027",
          class_id: ctx.classA1._id.toString(),
        }),
      });

      const res = await createAdmissionRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("should reject creation if class_id is invalid ObjectId", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/admissions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_name: "Candidate With Invalid Class",
          gender: "female",
          dob: "2012-01-01",
          phone: "9876500002",
          academic_year: "2026-2027",
          class_id: "not_a_valid_object_id",
        }),
      });

      const res = await createAdmissionRoute(req);
      expect(res.status).toBe(400);
      expect(res.status).not.toBe(500);
    });
  });

  // ─── 2. List & Filter Admissions (GET /api/admissions) ──────────
  describe("GET /api/admissions", () => {
    beforeAll(async () => {
      // Create a School B admission to test cross-tenant isolation
      const admB = await Admission.create({
        school_id: ctx.schoolB._id,
        application_no: `ADM-2026-${Date.now().toString().slice(-6)}`,
        status: "New",
        academic_year: "2026-2027",
        class_id: ctx.classB1._id,
        student_name: "School B Candidate",
        gender: "male",
        dob: new Date("2012-01-01"),
        phone: "9876500099",
      });
      schoolBAdmissionId = admB._id.toString();
    });

    it("should return admissions list scoped only to the admin's school", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/admissions?page=1&limit=10", {
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getAdmissionsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);

      // Verify School B admission is NOT present
      const foundB = json.data.some((a: any) => a._id === schoolBAdmissionId);
      expect(foundB).toBe(false);
    });

    it("should filter admissions by status", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/admissions?status=New", {
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getAdmissionsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      for (const a of json.data) {
        expect(a.status).toBe("New");
      }
    });

    it("should reject unauthenticated request with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/admissions");
      const res = await getAdmissionsRoute(req);
      expect(res.status).toBe(401);
    });
  });

  // ─── 3. Single Admission & IDOR (GET /api/admissions/[id]) ──────
  describe("GET /api/admissions/[id]", () => {
    it("should allow School A Admin to view School A admission", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/admissions/${createdAdmissionId}`, {
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getAdmissionByIdRoute(req, {
        params: Promise.resolve({ id: createdAdmissionId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.student_name).toBe("John Admission Candidate");
    });

    it("should BLOCK School A Admin from viewing School B admission (IDOR Defense)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/admissions/${schoolBAdmissionId}`, {
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getAdmissionByIdRoute(req, {
        params: Promise.resolve({ id: schoolBAdmissionId }),
      });

      expect([403, 404]).toContain(res.status);
    });

    it("should cleanly return 400 for invalid application ID", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/admissions/not_an_id", {
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getAdmissionByIdRoute(req, {
        params: Promise.resolve({ id: "not_an_id" }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid application ID");
    });
  });

  // ─── 4. Status Transition & Audit (PUT /api/admissions/[id]/status)
  describe("PUT /api/admissions/[id]/status", () => {
    it("should transition status to 'Under Review' and record status history", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/admissions/${createdAdmissionId}/status`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "Under Review",
          remarks: "Documents verified, proceeding with review.",
        }),
      });

      const res = await updateAdmissionStatusRoute(req, {
        params: Promise.resolve({ id: createdAdmissionId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("Under Review");
      expect(json.data.status_history.length).toBeGreaterThanOrEqual(1);
      const latestHistory = json.data.status_history[json.data.status_history.length - 1];
      expect(latestHistory.status).toBe("Under Review");
    });

    it("should reject invalid status value with 400", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/admissions/${createdAdmissionId}/status`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "InvalidCustomStatus" }),
      });

      const res = await updateAdmissionStatusRoute(req, {
        params: Promise.resolve({ id: createdAdmissionId }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid status value");
    });

    it("should BLOCK School A Admin from updating status of School B admission (IDOR Defense)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/admissions/${schoolBAdmissionId}/status`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "Approved" }),
      });

      const res = await updateAdmissionStatusRoute(req, {
        params: Promise.resolve({ id: schoolBAdmissionId }),
      });

      expect([403, 404]).toContain(res.status);
    });
  });

  // ─── 5. Approve Admission & Student Enrollment (POST /approve) ──
  describe("POST /api/admissions/[id]/approve", () => {
    it("should approve admission, enroll student, auto-generate login user, and complete application", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/admissions/${createdAdmissionId}/approve`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          class_id: ctx.classA1._id.toString(),
        }),
      });

      const res = await approveAdmissionRoute(req, {
        params: Promise.resolve({ id: createdAdmissionId }),
      });

      expect([200, 201]).toContain(res.status);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.name).toBe("John Admission Candidate");
      expect(json.data.admission_no).toMatch(/^SCH-\d{4}-\d{5}$/);
      expect(json.credentials).toBeDefined(); // Student user credentials generated
      expect(json.credentials.loginId).toBeDefined();

      const admissionInDb = await Admission.findById(createdAdmissionId);
      expect(admissionInDb?.status).toBe("Admission Completed");

      // Verify in DB that Student record exists
      const studentInDb = await Student.findOne({
        school_id: ctx.schoolA._id,
        name: "John Admission Candidate",
      });
      expect(studentInDb).not.toBeNull();
      expect(studentInDb?.is_active).toBe(true);

      // Verify in DB that User record exists
      const userInDb = await User.findById(studentInDb?.user_id);
      expect(userInDb).not.toBeNull();
      expect(userInDb?.role).toBe("student");
    });

    it("should reject re-approving an already completed admission with 400", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/admissions/${createdAdmissionId}/approve`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          class_id: ctx.classA1._id.toString(),
        }),
      });

      const res = await approveAdmissionRoute(req, {
        params: Promise.resolve({ id: createdAdmissionId }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("already been completed");
    });

    it("should BLOCK School A Admin from approving School B admission (IDOR Defense)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/admissions/${schoolBAdmissionId}/approve`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          class_id: ctx.classA1._id.toString(),
        }),
      });

      const res = await approveAdmissionRoute(req, {
        params: Promise.resolve({ id: schoolBAdmissionId }),
      });

      expect([403, 404]).toContain(res.status);
    });
  });

  // ─── 6. Delete Admission (DELETE /api/admissions/[id]) ───────────
  describe("DELETE /api/admissions/[id]", () => {
    it("should allow School Admin to delete an admission", async () => {
      // Create a temporary admission to delete
      const tempAdm = await Admission.create({
        school_id: ctx.schoolA._id,
        application_no: `ADM-TEMP-${Date.now().toString().slice(-6)}`,
        status: "New",
        academic_year: "2026-2027",
        class_id: ctx.classA1._id,
        student_name: "Temporary Candidate To Delete",
        gender: "female",
        dob: new Date("2011-04-12"),
        phone: "9876540000",
      });

      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/admissions/${tempAdm._id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await deleteAdmissionRoute(req, {
        params: Promise.resolve({ id: tempAdm._id.toString() }),
      });

      expect(res.status).toBe(200);

      // Verify soft delete in DB
      const check = await Admission.findById(tempAdm._id);
      expect(check?.is_deleted).toBe(true);
    });

    it("should BLOCK School A Admin from deleting School B admission (IDOR Defense)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/admissions/${schoolBAdmissionId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await deleteAdmissionRoute(req, {
        params: Promise.resolve({ id: schoolBAdmissionId }),
      });

      expect([403, 404]).toContain(res.status);

      const check = await Admission.findById(schoolBAdmissionId);
      expect(check?.is_deleted).not.toBe(true);
    });
  });
});
