import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { setupTestDatabase, teardownTestDatabase, TestDataContext } from "../helpers/dbTestSetup";
import {
  GET as getSubjectsRoute,
  POST as createSubjectRoute,
} from "@/app/api/subjects/route";
import {
  GET as getSubjectByIdRoute,
  PUT as updateSubjectRoute,
  DELETE as deleteSubjectRoute,
} from "@/app/api/subjects/[id]/route";
import {
  GET as getSyllabusRoute,
  POST as createSyllabusRoute,
  invalidateSyllabusServerCache,
} from "@/app/api/syllabus/route";
import {
  GET as getSyllabusByIdRoute,
  PUT as updateSyllabusRoute,
  DELETE as deleteSyllabusRoute,
  invalidateSyllabusDetailCache,
} from "@/app/api/syllabus/[id]/route";
import { generateAccessToken } from "@/lib/utils/jwt";
import { Subject, Syllabus } from "@/lib/models/index";

let ctx: TestDataContext;

beforeAll(async () => {
  ctx = await setupTestDatabase("subjectsyllabus");
  invalidateSyllabusServerCache();
  invalidateSyllabusDetailCache();
}, 25000);

afterAll(async () => {
  await teardownTestDatabase("subjectsyllabus");
  invalidateSyllabusServerCache();
  invalidateSyllabusDetailCache();
}, 25000);

describe("Deep Academics: Subjects & Syllabus Test Suite", () => {
  let createdSubjectId: string;
  let schoolBSubjectId: string;
  let createdSyllabusId: string;

  // ─── 1. Subjects CRUD & Validations (POST /api/subjects) ───────────
  describe("POST /api/subjects", () => {
    it("should allow School Admin to create a subject mapped to a class", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const payload = {
        name: "Computer Science",
        code: "CS101",
        type: "Both",
        class_id: ctx.classA1._id.toString(),
        full_marks: 100,
        pass_marks: 40,
      };

      const req = new NextRequest("http://localhost:3000/api/subjects", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await createSubjectRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Computer Science");
      expect(json.data.code).toBe("CS101");
      expect(json.data.pass_marks).toBe(40);

      createdSubjectId = json.data._id;

      // Verify in DB
      const inDb = await Subject.findById(createdSubjectId);
      expect(inDb).not.toBeNull();
      expect(inDb?.class_id?.toString()).toBe(ctx.classA1._id.toString());
    });

    it("should reject duplicate subject name for the same class with 409 Conflict", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/subjects", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Computer Science",
          class_id: ctx.classA1._id.toString(),
        }),
      });

      const res = await createSubjectRoute(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.message).toContain("already exists for this class");
    });

    it("should reject missing subject name with 400 Bad Request", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/subjects", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          class_id: ctx.classA1._id.toString(),
        }),
      });

      const res = await createSubjectRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Subject name is required");
    });

    it("should BLOCK creating a subject attached to School B class (Cross-Tenant IDOR Defense)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/subjects", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Hacked Subject",
          class_id: ctx.classB1._id.toString(), // Belongs to School B!
        }),
      });

      const res = await createSubjectRoute(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.message).toContain("Class not found");
    });
  });

  // ─── 2. List & Query Subjects (GET /api/subjects) ──────────────────
  describe("GET /api/subjects", () => {
    beforeAll(async () => {
      // Create a School B subject for IDOR testing
      const bSub = await Subject.create({
        school_id: ctx.schoolB._id,
        class_id: ctx.classB1._id,
        name: "School B French",
        code: "FR101",
      });
      schoolBSubjectId = bSub._id.toString();
    });

    it("should list subjects for School A filtered by class_id and search", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/subjects?class_id=${ctx.classA1._id.toString()}&search=Computer`,
        {
          method: "GET",
          headers: { authorization: `Bearer ${token}` },
        }
      );

      const res = await getSubjectsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.subjects.length).toBe(1);
      expect(json.data.subjects[0].name).toBe("Computer Science");

      // Verify no School B subjects leaked
      const leaked = json.data.subjects.some((s: any) => s._id === schoolBSubjectId);
      expect(leaked).toBe(false);
    });
  });

  // ─── 3. Single Subject CRUD & IDOR (GET/PUT/DELETE /api/subjects/[id])
  describe("Single Subject CRUD & IDOR Defense", () => {
    it("should fetch single subject by ID", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/subjects/${createdSubjectId}`, {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getSubjectByIdRoute(req, {
        params: Promise.resolve({ id: createdSubjectId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Computer Science");
    });

    it("should BLOCK School A Admin from accessing School B subject (IDOR Defense)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/subjects/${schoolBSubjectId}`, {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getSubjectByIdRoute(req, {
        params: Promise.resolve({ id: schoolBSubjectId }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.message).toContain("Subject not found");
    });

    it("should update subject details", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/subjects/${createdSubjectId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pass_marks: 45,
          full_marks: 100,
        }),
      });

      const res = await updateSubjectRoute(req, {
        params: Promise.resolve({ id: createdSubjectId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.pass_marks).toBe(45);
    });

    it("should delete an unlinked subject successfully", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/subjects/${createdSubjectId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await deleteSubjectRoute(req, {
        params: Promise.resolve({ id: createdSubjectId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain("deleted successfully");
    });
  });

  // ─── 4. Syllabus Creation & Hierarchy (POST /api/syllabus) ─────────
  describe("Syllabus API (/api/syllabus/*)", () => {
    it("should allow School Admin to create a syllabus with nodes hierarchy", async () => {
      invalidateSyllabusServerCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const payload = {
        academic_year: "2026-2027",
        class_id: ctx.classA1._id.toString(),
        subject_master_id: ctx.subjectA1._id.toString(),
        title: "Mathematics Curriculum 2026-2027",
        description: "Comprehensive algebra, geometry and calculus curriculum",
        status: "Draft",
        nodes: [
          {
            id: "chap-1",
            title: "Real Numbers & Polynomials",
            type: "chapter",
            children: [
              { id: "top-1-1", title: "Fundamental Theorem of Arithmetic", type: "topic" },
              { id: "top-1-2", title: "Zeroes of a Polynomial", type: "topic" },
            ],
            resources: [
              { title: "Polynomials Study Guide", type: "document", url: "https://example.com/guide.pdf" },
            ],
          },
        ],
      };

      const req = new NextRequest("http://localhost:3000/api/syllabus", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await createSyllabusRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe("Mathematics Curriculum 2026-2027");
      expect(json.data.version).toBe(1);
      expect(json.data.nodes.length).toBe(1);
      expect(json.data.nodes[0].children.length).toBe(2);

      createdSyllabusId = json.data._id;
    });

    it("should query syllabi list with mode=stats for progress tracking", async () => {
      invalidateSyllabusServerCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/syllabus?class_id=${ctx.classA1._id.toString()}&academic_year=2026-2027&mode=stats`,
        {
          method: "GET",
          headers: { authorization: `Bearer ${token}` },
        }
      );

      const res = await getSyllabusRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);
      expect(json.data[0].chapters).toBeDefined();
    });

    it("should increment version and save audit history on syllabus update", async () => {
      invalidateSyllabusServerCache();
      invalidateSyllabusDetailCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/syllabus/${createdSyllabusId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Mathematics Curriculum (Revised Edition)",
          incrementVersion: true,
          remarks: "Added extra resources to Chapter 1",
          status: "Draft",
        }),
      });

      const res = await updateSyllabusRoute(req, {
        params: Promise.resolve({ id: createdSyllabusId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe("Mathematics Curriculum (Revised Edition)");
      expect(json.data.version).toBe(2);
      expect(json.data.history.length).toBe(1);
    });

    it("should BLOCK deleting a Published syllabus (Safety Constraint)", async () => {
      invalidateSyllabusServerCache();
      invalidateSyllabusDetailCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // First publish the syllabus
      await Syllabus.findByIdAndUpdate(createdSyllabusId, { status: "Published" });

      const req = new NextRequest(`http://localhost:3000/api/syllabus/${createdSyllabusId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await deleteSyllabusRoute(req, {
        params: Promise.resolve({ id: createdSyllabusId }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Safety Block: Cannot delete a Published syllabus");
    });

    it("should successfully delete a Draft/Unpublished syllabus", async () => {
      invalidateSyllabusServerCache();
      invalidateSyllabusDetailCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Change status to Draft
      await Syllabus.findByIdAndUpdate(createdSyllabusId, { status: "Draft" });

      const req = new NextRequest(`http://localhost:3000/api/syllabus/${createdSyllabusId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await deleteSyllabusRoute(req, {
        params: Promise.resolve({ id: createdSyllabusId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain("deleted successfully");

      // Verify in DB
      const inDb = await Syllabus.findById(createdSyllabusId);
      expect(inDb).toBeNull();
    });
  });

  // ─── 5. Role-based Authorization Guard ────────────────────────────
  describe("Role-based Authorization & RBAC Guard", () => {
    it("should reject student role from creating or modifying subjects and syllabus (403)", async () => {
      const studentToken = generateAccessToken({
        user_id: ctx.schoolAStudent._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "student",
      });

      const subjectReq = new NextRequest("http://localhost:3000/api/subjects", {
        method: "POST",
        headers: {
          authorization: `Bearer ${studentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Unauthorized Subject",
          class_id: ctx.classA1._id.toString(),
        }),
      });

      const subjectRes = await createSubjectRoute(subjectReq);
      expect(subjectRes.status).toBe(403);

      const syllabusReq = new NextRequest("http://localhost:3000/api/syllabus", {
        method: "POST",
        headers: {
          authorization: `Bearer ${studentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: "2026-2027",
          class_id: ctx.classA1._id.toString(),
          subject_master_id: ctx.subjectA1._id.toString(),
        }),
      });

      const syllabusRes = await createSyllabusRoute(syllabusReq);
      expect(syllabusRes.status).toBe(403);
    });
  });
});
