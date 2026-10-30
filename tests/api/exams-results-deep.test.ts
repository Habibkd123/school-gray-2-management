import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { setupTestDatabase, teardownTestDatabase, TestDataContext } from "../helpers/dbTestSetup";
import {
  GET as getExamsRoute,
  POST as createExamRoute,
  invalidateExamsCache,
} from "@/app/api/exams/route";
import {
  GET as getExamByIdRoute,
  PUT as updateExamRoute,
  DELETE as deleteExamRoute,
  PATCH as patchExamRoute,
} from "@/app/api/exams/[id]/route";
import {
  GET as getExamSchedulesRoute,
  POST as createExamScheduleRoute,
} from "@/app/api/exams/schedule/route";
import {
  PUT as updateExamScheduleRoute,
  DELETE as deleteExamScheduleRoute,
} from "@/app/api/exams/schedule/[id]/route";
import {
  GET as getGradesRoute,
  POST as createGradeRoute,
} from "@/app/api/grades/route";
import {
  PUT as updateGradeRoute,
  DELETE as deleteGradeRoute,
} from "@/app/api/grades/[id]/route";
import {
  GET as getResultsRoute,
  POST as createResultsRoute,
  DELETE as deleteResultRoute,
} from "@/app/api/results/route";
import { GET as getResultAuditRoute } from "@/app/api/results/audit/route";
import { generateAccessToken } from "@/lib/utils/jwt";
import { Exam, ExamSchedule, Grade, Result, ResultAudit } from "@/lib/models/index";

let ctx: TestDataContext;

beforeAll(async () => {
  ctx = await setupTestDatabase("exams-res");
  invalidateExamsCache();
}, 30000);

afterAll(async () => {
  await teardownTestDatabase("exams-res");
});

describe("Deep Exams & Results Test Suite", () => {
  let createdExamId: string;
  let bulkExamId: string;
  let schoolBExamId: string;
  let createdScheduleId: string;
  let createdGradeId: string;
  let schoolBGradeId: string;
  let createdResultId: string;

  // ─── 1. Exam CRUD & Multi-Class Bulk Creation (/api/exams/*) ────────
  describe("Exams Management (/api/exams/*)", () => {
    it("should allow School Admin to create an exam for a class", async () => {
      invalidateExamsCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/exams", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Mid-Term Examination 2026",
          type: "mid_term",
          class_id: ctx.classA1._id.toString(),
          academic_year: "2026-2027",
          start_date: "2026-09-15T09:00:00.000Z",
          end_date: "2026-09-25T12:00:00.000Z",
          description: "First semester mid-term comprehensive evaluations",
          status: "upcoming",
        }),
      });

      const res = await createExamRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Mid-Term Examination 2026");
      expect(json.data.academic_year).toBe("2026-2027");
      expect(json.data.status).toBe("upcoming");
      expect(json.data.is_published).toBe(false);

      createdExamId = json.data._id;
    });

    it("should allow bulk creation of exams across multiple classes via class_ids", async () => {
      invalidateExamsCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/exams", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Annual Final Exam 2027",
          type: "annual",
          class_ids: [ctx.classA1._id.toString(), ctx.classA2._id.toString()],
          academic_year: "2026-2027",
          description: "End of year cumulative exams",
        }),
      });

      const res = await createExamRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.all.length).toBe(2);
      bulkExamId = json.all[0]._id;
    });

    it("should reject missing required fields (name, academic_year, class) with 400", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Missing name
      const req1 = new NextRequest("http://localhost:3000/api/exams", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ academic_year: "2026-2027", class_id: ctx.classA1._id.toString() }),
      });
      const res1 = await createExamRoute(req1);
      expect(res1.status).toBe(400);

      // Missing class
      const req2 = new NextRequest("http://localhost:3000/api/exams", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Unit Test 1", academic_year: "2026-2027" }),
      });
      const res2 = await createExamRoute(req2);
      expect(res2.status).toBe(400);
      const json2 = await res2.json();
      expect(json2.message).toContain("Class selection is required");
    });

    it("should BLOCK School A from creating an exam attached to School B Class (Cross-Tenant Defense)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/exams", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Infiltrator Exam",
          class_id: ctx.classB1._id.toString(), // School B class
          academic_year: "2026-2027",
        }),
      });

      const res = await createExamRoute(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.message).toContain("not found in this school");
    });

    it("should list exams for School A filtered by academic_year and class_id", async () => {
      invalidateExamsCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/exams?academic_year=2026-2027&class_id=${ctx.classA1._id.toString()}`,
        {
          method: "GET",
          headers: { authorization: `Bearer ${token}` },
        }
      );

      const res = await getExamsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.exams)).toBe(true);
      expect(json.data.exams.length).toBeGreaterThanOrEqual(1);
      const match = json.data.exams.find((e: any) => e._id === createdExamId);
      expect(match).toBeDefined();
      expect(match.name).toBe("Mid-Term Examination 2026");
    });

    it("should fetch single exam by ID and BLOCK Cross-Tenant access", async () => {
      // 1. Create School B exam directly in DB for cross-tenant check
      const schoolBExam = await Exam.create({
        school_id: ctx.schoolB._id,
        class_id: ctx.classB1._id,
        name: "School B Pre-Board",
        academic_year: "2026-2027",
        type: "pre_board",
      });
      schoolBExamId = schoolBExam._id.toString();

      const tokenA = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Legitimate School A fetch
      const reqA = new NextRequest(`http://localhost:3000/api/exams/${createdExamId}`, {
        method: "GET",
        headers: { authorization: `Bearer ${tokenA}` },
      });
      const resA = await getExamByIdRoute(reqA, { params: Promise.resolve({ id: createdExamId }) });
      expect(resA.status).toBe(200);
      const jsonA = await resA.json();
      expect(jsonA.data.name).toBe("Mid-Term Examination 2026");

      // Cross-Tenant attempt: School A tries to fetch School B Exam
      const reqB = new NextRequest(`http://localhost:3000/api/exams/${schoolBExamId}`, {
        method: "GET",
        headers: { authorization: `Bearer ${tokenA}` },
      });
      const resB = await getExamByIdRoute(reqB, { params: Promise.resolve({ id: schoolBExamId }) });
      expect(resB.status).toBe(404);
      const jsonB = await resB.json();
      expect(jsonB.message).toContain("Exam not found");
    });

    it("should update exam details (name, description, status)", async () => {
      invalidateExamsCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/exams/${createdExamId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: "Updated exam instructions and guidelines",
          status: "ongoing",
        }),
      });

      const res = await updateExamRoute(req, {
        params: Promise.resolve({ id: createdExamId }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.description).toBe("Updated exam instructions and guidelines");
      expect(json.data.status).toBe("ongoing");
    });

    it("should soft-delete an exam and allow restoring it via PATCH", async () => {
      invalidateExamsCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Soft delete
      const delReq = new NextRequest(`http://localhost:3000/api/exams/${bulkExamId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });
      const delRes = await deleteExamRoute(delReq, { params: Promise.resolve({ id: bulkExamId }) });
      expect(delRes.status).toBe(200);

      const inDb = await Exam.findById(bulkExamId);
      expect(inDb?.is_deleted).toBe(true);

      // Restore
      const restoreReq = new NextRequest(`http://localhost:3000/api/exams/${bulkExamId}?action=restore`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${token}` },
      });
      const restoreRes = await patchExamRoute(restoreReq, { params: Promise.resolve({ id: bulkExamId }) });
      expect(restoreRes.status).toBe(200);

      const restoredDb = await Exam.findById(bulkExamId);
      expect(restoredDb?.is_deleted).toBe(false);
    });
  });

  // ─── 2. Exam Schedules (/api/exams/schedule/*) ──────────────────────
  describe("Exam Schedules API (/api/exams/schedule/*)", () => {
    it("should create an exam schedule with timing and marks allocation", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/exams/schedule", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exam_id: createdExamId,
          subject_id: ctx.subjectA1._id.toString(),
          date: "2026-09-16T00:00:00.000Z",
          start_time: "09:30 AM",
          end_time: "12:30 PM",
          max_marks: 100,
          passing_marks: 35,
          room: "Hall-102",
        }),
      });

      const res = await createExamScheduleRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.max_marks).toBe(100);
      expect(json.data.passing_marks).toBe(35);
      expect(json.data.room).toBe("Hall-102");

      createdScheduleId = json.data._id;
    });

    it("should reject duplicate exam schedule for the same subject and date on the same exam (400)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/exams/schedule", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exam_id: createdExamId,
          subject_id: ctx.subjectA1._id.toString(),
          date: "2026-09-16T00:00:00.000Z", // Same date + subject
          start_time: "02:00 PM",
          end_time: "05:00 PM",
          max_marks: 100,
          passing_marks: 35,
        }),
      });

      const res = await createExamScheduleRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("already exists for this exam");
    });

    it("should reject invalid marks configuration (passing_marks > max_marks or negative)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/exams/schedule", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exam_id: createdExamId,
          subject_id: ctx.subjectA2._id.toString(),
          date: "2026-09-18T00:00:00.000Z",
          start_time: "09:30 AM",
          end_time: "12:30 PM",
          max_marks: 50,
          passing_marks: 60, // passing > max
        }),
      });

      const res = await createExamScheduleRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("between 0 and max marks");
    });

    it("should BLOCK School A from scheduling School B Subject (Cross-Tenant Defense)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/exams/schedule", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exam_id: createdExamId,
          subject_id: ctx.subjectB1._id.toString(), // School B subject
          date: "2026-09-20T00:00:00.000Z",
          start_time: "09:30 AM",
          end_time: "12:30 PM",
          max_marks: 100,
          passing_marks: 35,
        }),
      });

      const res = await createExamScheduleRoute(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.message).toContain("Subject not found in this school");
    });

    it("should list exam schedules and allow updates", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // List
      const listReq = new NextRequest(
        `http://localhost:3000/api/exams/schedule?exam_id=${createdExamId}`,
        { method: "GET", headers: { authorization: `Bearer ${token}` } }
      );
      const listRes = await getExamSchedulesRoute(listReq);
      expect(listRes.status).toBe(200);
      const listJson = await listRes.json();
      expect(listJson.data.length).toBeGreaterThanOrEqual(1);

      // Update
      const updateReq = new NextRequest(`http://localhost:3000/api/exams/schedule/${createdScheduleId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ room: "Auditorium-North" }),
      });
      const updateRes = await updateExamScheduleRoute(updateReq, {
        params: Promise.resolve({ id: createdScheduleId }),
      });
      expect(updateRes.status).toBe(200);
      const updateJson = await updateRes.json();
      expect(updateJson.data.room).toBe("Auditorium-North");
    });
  });

  // ─── 3. Grades Configuration (/api/grades/*) ────────────────────────
  describe("Grades Scale API (/api/grades/*)", () => {
    it("should create grade scale entries with marks boundary and points", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const payload = {
        grade_name: "A+",
        marks_from: 90,
        marks_upto: 100,
        grade_points: 10,
        description: "Outstanding Performance",
      };

      const req = new NextRequest("http://localhost:3000/api/grades", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await createGradeRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.grade_name).toBe("A+");
      expect(json.data.grade_points).toBe(10);

      createdGradeId = json.data._id;
    });

    it("should reject duplicate grade name in the same school with 409", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/grades", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grade_name: "A+", // Duplicate name
          marks_from: 95,
          marks_upto: 100,
          grade_points: 10,
        }),
      });

      const res = await createGradeRoute(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.message).toContain("already exists");
    });

    it("should BLOCK School A from modifying School B grade (IDOR Defense)", async () => {
      // Create a grade for School B
      const gradeB = await Grade.create({
        school_id: ctx.schoolB._id,
        grade_name: "B-Top",
        marks_from: 75,
        marks_upto: 85,
        grade_points: 8,
      });
      schoolBGradeId = gradeB._id.toString();

      const tokenA = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/grades/${schoolBGradeId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${tokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ grade_points: 1 }),
      });

      const res = await updateGradeRoute(req, {
        params: Promise.resolve({ id: schoolBGradeId }),
      });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.message).toContain("Not found");
    });

    it("should defend against malformed grade ID with 400 Bad Request", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/grades/not-a-mongo-id", {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ grade_points: 9 }),
      });

      const res = await updateGradeRoute(req, {
        params: Promise.resolve({ id: "not-a-mongo-id" }),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid ID");
    });
  });

  // ─── 4. Results & Marks Entry (/api/results/*) ──────────────────────
  describe("Results, Marks Validation & Audit Trail (/api/results/*)", () => {
    it("should allow entering marks with decimal precision and calculate is_pass", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/results", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exam_id: createdExamId,
          student_id: ctx.studentDocA._id.toString(),
          subject_id: ctx.subjectA1._id.toString(),
          marks_obtained: 88.5, // Decimal precision
          total_marks: 100,
          passing_marks: 33,
          grade: "A",
          remarks: "Excellent grasp of algebraic methods",
          status: "final",
          attendance_status: "Present",
        }),
      });

      const res = await createResultsRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.results.length).toBe(1);
      expect(json.data.results[0].marks_obtained).toBe(88.5);
      expect(json.data.results[0].is_pass).toBe(true);

      createdResultId = json.data.results[0]._id;

      // Verify that initial entry was logged in ResultAudit
      const auditLog = await ResultAudit.findOne({
        exam_id: createdExamId,
        student_id: ctx.studentDocA._id,
        action_type: "create",
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.new_marks).toBe(88.5);
    });

    it("should reject marks exceeding total marks or negative marks with 400", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Marks exceeding total
      const req1 = new NextRequest("http://localhost:3000/api/results", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_id: createdExamId,
          student_id: ctx.studentDocA._id.toString(),
          subject_id: ctx.subjectA2._id.toString(),
          marks_obtained: 105, // > 100
          total_marks: 100,
        }),
      });
      const res1 = await createResultsRoute(req1);
      expect(res1.status).toBe(400);
      const json1 = await res1.json();
      expect(json1.message).toContain("cannot exceed total marks");

      // Negative marks
      const req2 = new NextRequest("http://localhost:3000/api/results", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_id: createdExamId,
          student_id: ctx.studentDocA._id.toString(),
          subject_id: ctx.subjectA2._id.toString(),
          marks_obtained: -5,
          total_marks: 100,
        }),
      });
      const res2 = await createResultsRoute(req2);
      expect(res2.status).toBe(400);
      const json2 = await res2.json();
      expect(json2.message).toContain("cannot be negative");
    });

    it("should record an audit log when marks are updated and verify via /api/results/audit", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Update marks from 88.5 to 92.0
      const updateReq = new NextRequest("http://localhost:3000/api/results", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exam_id: createdExamId,
          student_id: ctx.studentDocA._id.toString(),
          subject_id: ctx.subjectA1._id.toString(),
          marks_obtained: 92.0,
          total_marks: 100,
          passing_marks: 33,
          grade: "A+",
          remarks: "Re-evaluation after answer key review",
        }),
      });

      const updateRes = await createResultsRoute(updateReq);
      expect(updateRes.status).toBe(201);

      // Verify audit endpoint
      const auditReq = new NextRequest(
        `http://localhost:3000/api/results/audit?exam_id=${createdExamId}&subject_id=${ctx.subjectA1._id.toString()}`,
        {
          method: "GET",
          headers: { authorization: `Bearer ${token}` },
        }
      );

      const auditRes = await getResultAuditRoute(auditReq);
      expect(auditRes.status).toBe(200);
      const auditJson = await auditRes.json();
      expect(auditJson.success).toBe(true);
      expect(auditJson.data.length).toBeGreaterThanOrEqual(2); // 1 create + 1 update

      const updateAudit = auditJson.data.find((a: any) => a.action_type === "update");
      expect(updateAudit).toBeDefined();
      expect(updateAudit.previous_marks).toBe(88.5);
      expect(updateAudit.new_marks).toBe(92);
      expect(updateAudit.reason).toContain("Re-evaluation");
    });

    it("should BLOCK teachers from editing marks when exam is published (Safety Lock)", async () => {
      // 1. Mark the exam as published
      await Exam.findByIdAndUpdate(createdExamId, { is_published: true });

      const teacherToken = generateAccessToken({
        user_id: ctx.schoolATeacher._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "teacher",
      });

      const req = new NextRequest("http://localhost:3000/api/results", {
        method: "POST",
        headers: {
          authorization: `Bearer ${teacherToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exam_id: createdExamId,
          student_id: ctx.studentDocA._id.toString(),
          subject_id: ctx.subjectA1._id.toString(),
          marks_obtained: 95,
          total_marks: 100,
        }),
      });

      const res = await createResultsRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toContain("Marks are locked because the exam results have been published");

      // Reset is_published to false for other tests
      await Exam.findByIdAndUpdate(createdExamId, { is_published: false });
    });

    it("should enforce Student role to read ONLY their own results (403 IDOR Defense)", async () => {
      const studentToken = generateAccessToken({
        user_id: ctx.schoolAStudent._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "student",
      });

      // Legitimate query for own results
      const ownReq = new NextRequest(
        `http://localhost:3000/api/results?exam_id=${createdExamId}&student_id=${ctx.studentDocA._id.toString()}`,
        {
          method: "GET",
          headers: { authorization: `Bearer ${studentToken}` },
        }
      );
      const ownRes = await getResultsRoute(ownReq);
      expect(ownRes.status).toBe(200);

      // Attempting to spy on another student's ID
      const spyReq = new NextRequest(
        `http://localhost:3000/api/results?exam_id=${createdExamId}&student_id=${ctx.studentDocB._id.toString()}`,
        {
          method: "GET",
          headers: { authorization: `Bearer ${studentToken}` },
        }
      );
      const spyRes = await getResultsRoute(spyReq);
      expect(spyRes.status).toBe(403);
      const spyJson = await spyRes.json();
      expect(spyJson.message).toContain("Access denied to student record");
    });
  });
});
