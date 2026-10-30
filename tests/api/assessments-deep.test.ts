import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { setupTestDatabase, teardownTestDatabase, TestDataContext } from "../helpers/dbTestSetup";
import {
  GET as getAssessmentsRoute,
  POST as createAssessmentRoute,
  invalidateAssessmentsCache,
} from "@/app/api/assessments/route";
import {
  GET as getAssessmentByIdRoute,
  PUT as updateAssessmentRoute,
  DELETE as deleteAssessmentRoute,
} from "@/app/api/assessments/[id]/route";
import {
  GET as getAssessmentMarksRoute,
  POST as saveAssessmentMarksRoute,
} from "@/app/api/assessments/[id]/marks/route";
import { GET as getAssessmentMarksAuditRoute } from "@/app/api/assessments/[id]/marks/audit/route";
import { POST as publishAssessmentRoute } from "@/app/api/assessments/[id]/publish/route";
import { GET as getAssessmentAnalyticsRoute } from "@/app/api/assessments/[id]/analytics/route";
import { GET as getAssessmentResultsRoute } from "@/app/api/assessments/[id]/results/route";
import { generateAccessToken } from "@/lib/utils/jwt";
import { ClassTest, ClassTestMark, ClassTestMarkAudit, Student } from "@/lib/models/index";

let ctx: TestDataContext;

beforeAll(async () => {
  ctx = await setupTestDatabase("assessments");
  invalidateAssessmentsCache();
}, 30000);

afterAll(async () => {
  await teardownTestDatabase("assessments");
});

describe("Deep Assessments, Marks & Analytics Test Suite", () => {
  let createdTestId: string;
  let teacherTestId: string;
  let schoolBTestId: string;
  let studentDocA2: any;

  // ─── 1. Assessment Creation & Lifecycle (/api/assessments/*) ────────
  describe("Assessment Management (/api/assessments/*)", () => {
    it("should allow School Admin to create a class test / assessment", async () => {
      invalidateAssessmentsCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const payload = {
        title: "Algebra & Linear Equations Quiz",
        description: "Weekly assessment for Chapter 3",
        class_id: ctx.classA1._id.toString(),
        subject_id: ctx.subjectA1._id.toString(),
        teacher_id: ctx.teacherDocA._id.toString(),
        test_date: "2026-10-15T00:00:00.000Z",
        start_time: "10:00",
        end_time: "11:00",
        total_marks: 25,
        passing_marks: 10,
        chapter: "Linear Equations",
        academic_year: "2026-2027",
        status: "scheduled",
        assessment_type: "Class Test",
      };

      const req = new NextRequest("http://localhost:3000/api/assessments", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await createAssessmentRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe("Algebra & Linear Equations Quiz");
      expect(json.data.total_marks).toBe(25);
      expect(json.data.passing_marks).toBe(10);
      expect(json.data.is_published).toBe(false);

      createdTestId = json.data._id;
    });

    it("should allow Teacher to create an assessment for assigned class", async () => {
      invalidateAssessmentsCache();
      const token = generateAccessToken({
        user_id: ctx.schoolATeacher._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "teacher",
      });

      const payload = {
        title: "Physics Mechanics Pop Quiz",
        class_id: ctx.classA1._id.toString(),
        subject_id: ctx.subjectA2._id.toString(),
        test_date: "2026-10-20T00:00:00.000Z",
        start_time: "11:00",
        end_time: "12:00",
        total_marks: 20,
        passing_marks: 8,
        academic_year: "2026-2027",
      };

      const req = new NextRequest("http://localhost:3000/api/assessments", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await createAssessmentRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe("Physics Mechanics Pop Quiz");
      expect(json.data.teacher_id).toBe(ctx.teacherDocA._id.toString());

      teacherTestId = json.data._id;
    });

    it("should validate required fields and marks boundary (passing_marks <= total_marks) with 400", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Missing title
      const req1 = new NextRequest("http://localhost:3000/api/assessments", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: ctx.classA1._id.toString(),
          subject_id: ctx.subjectA1._id.toString(),
          test_date: "2026-10-15",
          start_time: "10:00",
          end_time: "11:00",
          total_marks: 25,
          passing_marks: 10,
        }),
      });
      const res1 = await createAssessmentRoute(req1);
      expect(res1.status).toBe(400);
      const json1 = await res1.json();
      expect(json1.message).toContain("Title is required");

      // Passing marks > total marks
      const req2 = new NextRequest("http://localhost:3000/api/assessments", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Invalid Marks Quiz",
          class_id: ctx.classA1._id.toString(),
          subject_id: ctx.subjectA1._id.toString(),
          test_date: "2026-10-15",
          start_time: "10:00",
          end_time: "11:00",
          total_marks: 20,
          passing_marks: 25, // > 20
        }),
      });
      const res2 = await createAssessmentRoute(req2);
      expect(res2.status).toBe(400);
      const json2 = await res2.json();
      expect(json2.message).toContain("Passing marks cannot exceed total marks");
    });

    it("should list assessments with filters and computedStatus", async () => {
      invalidateAssessmentsCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/assessments?class_id=${ctx.classA1._id.toString()}&academic_year=2026-2027`,
        {
          method: "GET",
          headers: { authorization: `Bearer ${token}` },
        }
      );

      const res = await getAssessmentsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);

      const match = json.data.find((t: any) => t._id === createdTestId);
      expect(match).toBeDefined();
      expect(match.computedStatus).toBeDefined();
    });

    it("should fetch single assessment details and BLOCK Cross-Tenant access", async () => {
      // Create School B Test directly in DB
      const testB = await ClassTest.create({
        school_id: ctx.schoolB._id,
        class_id: ctx.classB1._id,
        subject_id: ctx.subjectB1._id,
        teacher_id: ctx.teacherDocB._id,
        title: "School B Confidential Test",
        academic_year: "2026-2027",
        test_date: new Date("2026-10-25"),
        start_time: "09:00",
        end_time: "10:00",
        total_marks: 30,
        passing_marks: 12,
      });
      schoolBTestId = testB._id.toString();

      const tokenA = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Legitimate School A fetch
      const reqA = new NextRequest(`http://localhost:3000/api/assessments/${createdTestId}`, {
        method: "GET",
        headers: { authorization: `Bearer ${tokenA}` },
      });
      const resA = await getAssessmentByIdRoute(reqA, { params: Promise.resolve({ id: createdTestId }) });
      expect(resA.status).toBe(200);
      const jsonA = await resA.json();
      expect(jsonA.data.title).toBe("Algebra & Linear Equations Quiz");

      // Cross-Tenant attempt: School A tries to fetch School B test
      const reqB = new NextRequest(`http://localhost:3000/api/assessments/${schoolBTestId}`, {
        method: "GET",
        headers: { authorization: `Bearer ${tokenA}` },
      });
      const resB = await getAssessmentByIdRoute(reqB, { params: Promise.resolve({ id: schoolBTestId }) });
      expect(resB.status).toBe(404);
      const jsonB = await resB.json();
      expect(jsonB.message).toContain("Test not found");
    });

    it("should update assessment details and defend against malformed ID", async () => {
      invalidateAssessmentsCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Valid update
      const req = new NextRequest(`http://localhost:3000/api/assessments/${createdTestId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: "Updated syllabus: Chapters 3 and 4 included",
          passing_marks: 12,
        }),
      });

      const res = await updateAssessmentRoute(req, {
        params: Promise.resolve({ id: createdTestId }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.passing_marks).toBe(12);

      // Malformed ID check
      const badReq = new NextRequest("http://localhost:3000/api/assessments/bad-id", {
        method: "PUT",
        headers: { authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ passing_marks: 10 }),
      });
      const badRes = await updateAssessmentRoute(badReq, {
        params: Promise.resolve({ id: "bad-id" }),
      });
      expect(badRes.status).toBe(400);
      const badJson = await badRes.json();
      expect(badJson.message).toContain("Invalid ID");
    });
  });

  // ─── 2. Marks Entry, Decimal Precision & Audit Trail ───────────────
  describe("Assessment Marks Entry & Rankings (/api/assessments/[id]/marks)", () => {
    beforeAll(async () => {
      // Create a second student in School A Class A1 for ranking tests
      studentDocA2 = await Student.create({
        school_id: ctx.schoolA._id,
        class_id: ctx.classA1._id,
        name: "Alpha Student Bob",
        roll_no: "102",
        admission_no: "TEST-ADM-002",
        academic_year: "2026-2027",
        gender: "male",
        is_active: true,
      });
    });

    it("should bulk save marks with decimal precision and calculate ranks", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const payload = {
        entries: [
          {
            student_id: ctx.studentDocA._id.toString(),
            marks_obtained: 23.5, // Top score -> Rank 1
            attendance_status: "Present",
            remarks: "Very accurate solutions",
          },
          {
            student_id: studentDocA2._id.toString(),
            marks_obtained: 18.0, // Second score -> Rank 2
            attendance_status: "Present",
            remarks: "Good effort",
          },
        ],
      };

      const req = new NextRequest(`http://localhost:3000/api/assessments/${createdTestId}/marks`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await saveAssessmentMarksRoute(req, {
        params: Promise.resolve({ id: createdTestId }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Verify DB rankings
      const mark1 = await ClassTestMark.findOne({ test_id: createdTestId, student_id: ctx.studentDocA._id });
      const mark2 = await ClassTestMark.findOne({ test_id: createdTestId, student_id: studentDocA2._id });

      expect(mark1?.marks_obtained).toBe(23.5);
      expect(mark1?.rank).toBe(1);
      expect(mark1?.is_pass).toBe(true);

      expect(mark2?.marks_obtained).toBe(18.0);
      expect(mark2?.rank).toBe(2);
      expect(mark2?.is_pass).toBe(true);

      // Verify Audit log creation
      const auditLogs = await ClassTestMarkAudit.find({ test_id: createdTestId });
      expect(auditLogs.length).toBeGreaterThanOrEqual(2);
      expect(auditLogs[0].action_type).toBe("create");
    });

    it("should reject marks exceeding total marks or negative values with 400", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const payload = {
        entries: [
          {
            student_id: ctx.studentDocA._id.toString(),
            marks_obtained: 30, // Total is 25
            attendance_status: "Present",
          },
        ],
      };

      const req = new NextRequest(`http://localhost:3000/api/assessments/${createdTestId}/marks`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await saveAssessmentMarksRoute(req, {
        params: Promise.resolve({ id: createdTestId }),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("exceed total marks");
    });

    it("should set marks to 0 and record Absent when attendance_status is Absent", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const payload = {
        entries: [
          {
            student_id: studentDocA2._id.toString(),
            marks_obtained: 20, // should be overridden to 0
            attendance_status: "Absent",
            remarks: "Medical leave",
          },
        ],
      };

      const req = new NextRequest(`http://localhost:3000/api/assessments/${createdTestId}/marks`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await saveAssessmentMarksRoute(req, {
        params: Promise.resolve({ id: createdTestId }),
      });
      expect(res.status).toBe(200);

      const mark = await ClassTestMark.findOne({ test_id: createdTestId, student_id: studentDocA2._id });
      expect(mark?.marks_obtained).toBe(0);
      expect(mark?.attendance_status).toBe("Absent");
      expect(mark?.is_pass).toBe(false);
    });

    it("should retrieve marks audit logs via /api/assessments/[id]/marks/audit", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/assessments/${createdTestId}/marks/audit`,
        {
          method: "GET",
          headers: { authorization: `Bearer ${token}` },
        }
      );

      const res = await getAssessmentMarksAuditRoute(req, {
        params: Promise.resolve({ id: createdTestId }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── 3. Publishing & Safety Locks ──────────────────────────────────
  describe("Publishing & Marks Locking (/api/assessments/[id]/publish)", () => {
    it("should allow publishing assessment results", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/assessments/${createdTestId}/publish`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await publishAssessmentRoute(req, {
        params: Promise.resolve({ id: createdTestId }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.is_published).toBe(true);

      const inDb = await ClassTest.findById(createdTestId);
      expect(inDb?.is_published).toBe(true);
      expect(inDb?.status).toBe("published");
    });

    it("should BLOCK teachers from editing marks once assessment is published (Safety Lock)", async () => {
      const teacherToken = generateAccessToken({
        user_id: ctx.schoolATeacher._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "teacher",
      });

      const req = new NextRequest(`http://localhost:3000/api/assessments/${createdTestId}/marks`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${teacherToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entries: [
            {
              student_id: ctx.studentDocA._id.toString(),
              marks_obtained: 25,
            },
          ],
        }),
      });

      const res = await saveAssessmentMarksRoute(req, {
        params: Promise.resolve({ id: createdTestId }),
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toContain("Marks are locked because this assessment has been published");
    });
  });

  // ─── 4. Analytics Aggregation (/api/assessments/[id]/analytics) ──────
  describe("Performance Analytics (/api/assessments/[id]/analytics)", () => {
    it("should compute highest, lowest, average, and pass rate statistics", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/assessments/${createdTestId}/analytics`, {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getAssessmentAnalyticsRoute(req, {
        params: Promise.resolve({ id: createdTestId }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.marks_entered).toBe(2);
      expect(json.data.highest).toBe(23.5);
      expect(json.data.lowest).toBe(0); // Absent student got 0
      expect(json.data.pass_count).toBe(1);
      expect(json.data.pass_percentage).toBe(50); // 1 passed out of 2
    });

    it("should allow Student to view published assessment results", async () => {
      const studentToken = generateAccessToken({
        user_id: ctx.schoolAStudent._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "student",
      });

      const req = new NextRequest(`http://localhost:3000/api/assessments/${createdTestId}/results`, {
        method: "GET",
        headers: { authorization: `Bearer ${studentToken}` },
      });

      const res = await getAssessmentResultsRoute(req, {
        params: Promise.resolve({ id: createdTestId }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.rows)).toBe(true);
      expect(json.data.rows.length).toBeGreaterThanOrEqual(1);
    });

    it("should BLOCK Students from viewing UNPUBLISHED assessment results (403)", async () => {
      const studentToken = generateAccessToken({
        user_id: ctx.schoolAStudent._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "student",
      });

      // teacherTestId is still unpublished
      const req = new NextRequest(`http://localhost:3000/api/assessments/${teacherTestId}/results`, {
        method: "GET",
        headers: { authorization: `Bearer ${studentToken}` },
      });

      const res = await getAssessmentResultsRoute(req, {
        params: Promise.resolve({ id: teacherTestId }),
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toContain("Results have not been published yet");
    });
  });

  // ─── 5. Deletion & Cascading Mark Cleanup ──────────────────────────
  describe("Assessment Deletion (/api/assessments/[id])", () => {
    it("should delete an assessment and cascade delete all its marks", async () => {
      invalidateAssessmentsCache();
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/assessments/${createdTestId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await deleteAssessmentRoute(req, {
        params: Promise.resolve({ id: createdTestId }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain("deleted successfully");

      // Verify test is deleted
      const inDb = await ClassTest.findById(createdTestId);
      expect(inDb).toBeNull();

      // Verify cascading marks cleanup
      const marksInDb = await ClassTestMark.find({ test_id: createdTestId });
      expect(marksInDb.length).toBe(0);
    });
  });
});
