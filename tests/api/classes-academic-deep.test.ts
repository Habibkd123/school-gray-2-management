import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { setupTestDatabase, teardownTestDatabase, TestDataContext } from "../helpers/dbTestSetup";
import {
  GET as getClassesRoute,
  POST as createClassRoute,
  invalidateServerClassesCache,
} from "@/app/api/classes/route";
import {
  GET as getClassByIdRoute,
  PUT as updateClassRoute,
  DELETE as deleteClassRoute,
  PATCH as patchClassRoute,
} from "@/app/api/classes/[id]/route";
import {
  GET as getSectionsRoute,
  POST as createSectionRoute,
  invalidateSectionsServerCache,
} from "@/app/api/sections/route";
import {
  GET as getSectionByIdRoute,
  PUT as updateSectionRoute,
  DELETE as deleteSectionRoute,
} from "@/app/api/sections/[id]/route";
import {
  GET as getStreamsRoute,
  POST as createStreamRoute,
  invalidateStreamsServerCache,
} from "@/app/api/streams/route";
import {
  GET as getStreamByIdRoute,
  PUT as updateStreamRoute,
  DELETE as deleteStreamRoute,
} from "@/app/api/streams/[id]/route";
import { GET as getDependencyCheckRoute } from "@/app/api/academic/dependency-check/route";
import { generateAccessToken } from "@/lib/utils/jwt";
import Class from "@/lib/models/Class";
import Section from "@/lib/models/Section";
import Stream from "@/lib/models/Stream";
import ClassFee from "@/lib/models/ClassFee";

let ctx: TestDataContext;

beforeAll(async () => {
  ctx = await setupTestDatabase("academics");
  invalidateServerClassesCache();
  invalidateSectionsServerCache();
  invalidateStreamsServerCache();
}, 25000);

afterAll(async () => {
  await teardownTestDatabase("academics");
  invalidateServerClassesCache();
  invalidateSectionsServerCache();
  invalidateStreamsServerCache();
}, 25000);

describe("Deep Academics: Classes, Sections & Streams Test Suite", () => {
  let createdClassId: string;
  let createdSectionId: string;
  let createdStreamId: string;

  // ─── 1. Classes CRUD & Constraints (POST /api/classes) ───────────
  describe("POST /api/classes", () => {
    it("should allow School Admin to create a class with section, capacity, and default fee", async () => {
      invalidateServerClassesCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const payload = {
        name: "Class 9",
        section: "C",
        academic_year: "2026-2027",
        capacity: 45,
        default_fee: 3000,
        class_teacher_id: ctx.teacherDocA._id.toString(),
      };

      const req = new NextRequest("http://localhost:3000/api/classes", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await createClassRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Class 9");
      expect(json.data.section).toBe("C");
      expect(json.data.capacity).toBe(45);
      expect(json.data.sort_weight).toBeDefined();

      createdClassId = json.data._id;

      // Verify in DB
      const inDb = await Class.findById(createdClassId);
      expect(inDb).not.toBeNull();
      expect(inDb?.status).toBe("Active");
    });

    it("should reject duplicate class + section + academic_year combination with 409", async () => {
      invalidateServerClassesCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/classes", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Class 9",
          section: "C",
          academic_year: "2026-2027",
        }),
      });

      const res = await createClassRoute(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.message).toContain("already exists");
    });

    it("should validate required fields (name and academic_year) with 400", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/classes", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          section: "A",
        }),
      });

      const res = await createClassRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("required");
    });

    it("should defend against malformed class_teacher_id with 400", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/classes", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Class 8",
          section: "A",
          academic_year: "2026-2027",
          class_teacher_id: "invalid-id",
        }),
      });

      const res = await createClassRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid class teacher ID");
    });

    it("should BLOCK assigning School B teacher as class teacher in School A (IDOR Defense)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/classes", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Class 8",
          section: "A",
          academic_year: "2026-2027",
          class_teacher_id: ctx.teacherDocB._id.toString(), // Belongs to School B!
        }),
      });

      const res = await createClassRoute(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.message).toContain("Class teacher not found in this school");
    });
  });

  // ─── 2. List & Query Classes (GET /api/classes) ───────────────────
  describe("GET /api/classes", () => {
    it("should list classes for School A with custom sort_weight ordering and pagination", async () => {
      invalidateServerClassesCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/classes?page=1&limit=10", {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getClassesRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.classes)).toBe(true);
      expect(json.data.classes.length).toBeGreaterThanOrEqual(2);

      // Verify School B classes are NOT in School A listing
      const leaked = json.data.classes.some(
        (c: any) => c.school_id?._id === ctx.schoolB._id.toString() || c.name === "Class 10" && c.section === "B"
      );
      expect(leaked).toBe(false);
    });

    it("should filter classes by academic_year and section", async () => {
      invalidateServerClassesCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/classes?academic_year=2026-2027&section=C", {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getClassesRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.classes.length).toBe(1);
      expect(json.data.classes[0].name).toBe("Class 9");
      expect(json.data.classes[0].section).toBe("C");
    });

    it("should restrict teacher role to assigned classes only", async () => {
      invalidateServerClassesCache();
      const token = generateAccessToken({
        user_id: ctx.schoolATeacher._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "teacher",
      });

      const req = new NextRequest("http://localhost:3000/api/classes", {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getClassesRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      // TeacherDocA is assigned to Class 9 (created above) as class teacher
      const hasClass9 = json.data.classes.some((c: any) => c.name === "Class 9");
      expect(hasClass9).toBe(true);
    });
  });

  // ─── 3. Single Class CRUD & IDOR (GET/PUT/DELETE /api/classes/[id])
  describe("GET /api/classes/[id] & PUT /api/classes/[id]", () => {
    it("should fetch single class details with populated default fee", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/classes/${createdClassId}`, {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getClassByIdRoute(req, {
        params: Promise.resolve({ id: createdClassId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Class 9");
      expect(json.data.default_fee).toBe(3000);
    });

    it("should reject malformed class ID with 400 Bad Request", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/classes/invalid-id", {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getClassByIdRoute(req, {
        params: Promise.resolve({ id: "invalid-id" }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid class ID");
    });

    it("should BLOCK School A Admin from accessing School B class (IDOR Defense)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/classes/${ctx.classB1._id.toString()}`, {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getClassByIdRoute(req, {
        params: Promise.resolve({ id: ctx.classB1._id.toString() }),
      });

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.message).toContain("not found");
    });

    it("should allow updating class capacity and default fee", async () => {
      invalidateServerClassesCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/classes/${createdClassId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          capacity: 50,
          default_fee: 3500,
        }),
      });

      const res = await updateClassRoute(req, {
        params: Promise.resolve({ id: createdClassId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.capacity).toBe(50);
    });
  });

  // ─── 4. Deletion Dependencies (DELETE /api/classes/[id]) ──────────
  describe("DELETE /api/classes/[id] & Dependency Guard", () => {
    it("should BLOCK deleting a class that contains active students with 409 Conflict", async () => {
      invalidateServerClassesCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Class A1 contains studentDocA!
      const req = new NextRequest(`http://localhost:3000/api/classes/${ctx.classA1._id.toString()}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await deleteClassRoute(req, {
        params: Promise.resolve({ id: ctx.classA1._id.toString() }),
      });

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.message).toContain("cannot be deleted because it contains: 1 Active Students");
    });

    it("should successfully soft delete an empty class and allow restoring it", async () => {
      invalidateServerClassesCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Remove teacher assignment and any fees from createdClassId first so it has 0 dependencies
      await Class.findByIdAndUpdate(createdClassId, { class_teacher_id: null });
      await ClassFee.deleteMany({ class_id: createdClassId });

      const deleteReq = new NextRequest(`http://localhost:3000/api/classes/${createdClassId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });

      const deleteRes = await deleteClassRoute(deleteReq, {
        params: Promise.resolve({ id: createdClassId }),
      });

      expect(deleteRes.status).toBe(200);
      const deleteJson = await deleteRes.json();
      expect(deleteJson.success).toBe(true);
      expect(deleteJson.message).toContain("archived (soft-deleted)");

      // Verify in DB that is_deleted is true and status is Archived
      const inDb = await Class.findById(createdClassId);
      expect(inDb?.is_deleted).toBe(true);
      expect(inDb?.status).toBe("Archived");

      // Now restore it using PATCH /api/classes/[id]?action=restore
      const restoreReq = new NextRequest(`http://localhost:3000/api/classes/${createdClassId}?action=restore`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${token}` },
      });

      const restoreRes = await patchClassRoute(restoreReq, {
        params: Promise.resolve({ id: createdClassId }),
      });

      expect(restoreRes.status).toBe(200);
      const restoreJson = await restoreRes.json();
      expect(restoreJson.success).toBe(true);
      expect(restoreJson.message).toContain("restored successfully");

      const restoredInDb = await Class.findById(createdClassId);
      expect(restoredInDb?.is_deleted).toBe(false);
      expect(restoredInDb?.status).toBe("Active");
    });
  });

  // ─── 5. Sections CRUD & Unique Constraints ────────────────────────
  describe("Sections API (/api/sections/*)", () => {
    it("should allow School Admin to create a section", async () => {
      invalidateSectionsServerCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/sections", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Section D",
          status: "Active",
        }),
      });

      const res = await createSectionRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Section D");

      createdSectionId = json.data._id;
    });

    it("should reject duplicate section name in the same school with 409", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/sections", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Section D",
        }),
      });

      const res = await createSectionRoute(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.message).toContain("already exists");
    });

    it("should reject malformed section ID with 400 Bad Request", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/sections/bad-id", {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getSectionByIdRoute(req, {
        params: Promise.resolve({ id: "bad-id" }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid section ID");
    });

    it("should delete section successfully", async () => {
      invalidateSectionsServerCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/sections/${createdSectionId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await deleteSectionRoute(req, {
        params: Promise.resolve({ id: createdSectionId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toBe("Section deleted");
    });
  });

  // ─── 6. Streams CRUD & Constraints ────────────────────────────────
  describe("Streams API (/api/streams/*)", () => {
    it("should allow School Admin to create a stream", async () => {
      invalidateStreamsServerCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/streams", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Commerce with Maths",
          status: "Active",
        }),
      });

      const res = await createStreamRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Commerce with Maths");

      createdStreamId = json.data._id;
    });

    it("should reject duplicate stream name in the same school with 409", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/streams", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Commerce with Maths",
        }),
      });

      const res = await createStreamRoute(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.message).toContain("already exists");
    });

    it("should reject malformed stream ID with 400 Bad Request", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/streams/bad-id", {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getStreamByIdRoute(req, {
        params: Promise.resolve({ id: "bad-id" }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid stream ID");
    });

    it("should delete an unlinked stream successfully", async () => {
      invalidateStreamsServerCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/streams/${createdStreamId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await deleteStreamRoute(req, {
        params: Promise.resolve({ id: createdStreamId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  // ─── 7. Dependency Check API (/api/academic/dependency-check) ──────
  describe("GET /api/academic/dependency-check", () => {
    it("should report non-deletable status for class with students", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/academic/dependency-check?type=class&id=${ctx.classA1._id.toString()}`,
        {
          method: "GET",
          headers: { authorization: `Bearer ${token}` },
        }
      );

      const res = await getDependencyCheckRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.deletable).toBe(false);
      expect(json.data.details.students).toBe(1);
      expect(json.data.reasons).toContain("1 Active Students");
    });

    it("should reject invalid dependency type with 400", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/academic/dependency-check?type=unknown&id=${ctx.classA1._id.toString()}`,
        {
          method: "GET",
          headers: { authorization: `Bearer ${token}` },
        }
      );

      const res = await getDependencyCheckRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toBe("Invalid dependency type");
    });
  });
});
