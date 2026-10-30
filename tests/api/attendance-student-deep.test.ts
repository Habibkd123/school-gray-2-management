import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { setupTestDatabase, teardownTestDatabase, TestDataContext } from "../helpers/dbTestSetup";
import {
  GET as getStudentAttendanceRoute,
  POST as markStudentAttendanceRoute,
  invalidateStudentAttendanceCache,
} from "@/app/api/attendance/student/route";
import {
  GET as getStudentAttendanceByIdRoute,
  POST as updateStudentAttendanceByIdRoute,
  invalidateStudentHistoryCache,
} from "@/app/api/attendance/student/[id]/route";
import { generateAccessToken } from "@/lib/utils/jwt";
import { Attendance, TeacherAssignment, Student } from "@/lib/models/index";

let ctx: TestDataContext;

beforeAll(async () => {
  ctx = await setupTestDatabase("att-stud");
  invalidateStudentAttendanceCache();
  invalidateStudentHistoryCache();
}, 30000);

afterAll(async () => {
  await teardownTestDatabase("att-stud");
});

describe("Deep Student Attendance Test Suite (/api/attendance/student/*)", () => {
  const academicYear = "2026-2027";
  const todayStr = new Date().toISOString().split("T")[0];
  const pastDateStr = "2026-02-10";
  const futureDateStr = "2026-11-20";

  let studentDocA2: any;

  beforeAll(async () => {
    // Create a second student in classA1 for multi-student class testing
    studentDocA2 = await Student.create({
      school_id: ctx.schoolA._id,
      class_id: ctx.classA1._id,
      name: "Second Alpha Student Charlie",
      roll_no: "103",
      admission_no: "att-stud-ADM-003",
      academic_year: academicYear,
      gender: "male",
      phone: "9876543299",
      email: "charlie@testschool.com",
      guardian_name: "Charlie Senior",
      guardian_phone: "9876543298",
      guardian_relation: "Father",
      is_active: true,
    });
  });

  // ─── 1. Attendance Marking Validation & Permissions (/api/attendance/student POST) ────────
  describe("Student Attendance Marking POST Validation", () => {
    it("should reject unauthenticated requests with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/attendance/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academic_year: academicYear,
          date: pastDateStr,
          classId: ctx.classA1._id.toString(),
          records: [{ student_id: ctx.studentDocA._id.toString(), status: "present" }],
        }),
      });

      const res = await markStudentAttendanceRoute(req);
      expect(res.status).toBe(401);
    });

    it("should reject unauthorized roles (student/parent) with 403", async () => {
      const studentToken = generateAccessToken({
        user_id: ctx.schoolAStudent._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "student",
      });

      const req = new NextRequest("http://localhost:3000/api/attendance/student", {
        method: "POST",
        headers: {
          authorization: `Bearer ${studentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: academicYear,
          date: pastDateStr,
          classId: ctx.classA1._id.toString(),
          records: [{ student_id: ctx.studentDocA._id.toString(), status: "present" }],
        }),
      });

      const res = await markStudentAttendanceRoute(req);
      expect(res.status).toBe(403);
    });

    it("should reject missing required fields with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/attendance/student", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: academicYear,
          // missing date, classId, records
        }),
      });

      const res = await markStudentAttendanceRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("required");
    });

    it("should reject invalid date format with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/attendance/student", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: academicYear,
          date: "not-a-valid-date",
          classId: ctx.classA1._id.toString(),
          records: [{ student_id: ctx.studentDocA._id.toString(), status: "present" }],
        }),
      });

      const res = await markStudentAttendanceRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid date format");
    });

    it("should reject invalid classId format with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/attendance/student", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: academicYear,
          date: pastDateStr,
          classId: "invalid-id-123",
          records: [{ student_id: ctx.studentDocA._id.toString(), status: "present" }],
        }),
      });

      const res = await markStudentAttendanceRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid classId format");
    });

    it("should reject non-array records with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/attendance/student", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: academicYear,
          date: pastDateStr,
          classId: ctx.classA1._id.toString(),
          records: "present",
        }),
      });

      const res = await markStudentAttendanceRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("records must be an array");
    });

    it("should reject records with invalid student_id with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/attendance/student", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: academicYear,
          date: pastDateStr,
          classId: ctx.classA1._id.toString(),
          records: [{ student_id: "not-a-mongo-id", status: "present" }],
        }),
      });

      const res = await markStudentAttendanceRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("student_id");
    });

    it("should reject records with invalid status with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/attendance/student", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: academicYear,
          date: pastDateStr,
          classId: ctx.classA1._id.toString(),
          records: [{ student_id: ctx.studentDocA._id.toString(), status: "celebrating" }],
        }),
      });

      const res = await markStudentAttendanceRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid status");
    });

    it("should reject cross-tenant classId (School B class for School A) with 404", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/attendance/student", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: academicYear,
          date: pastDateStr,
          classId: ctx.classB1._id.toString(), // belongs to School B
          records: [{ student_id: ctx.studentDocA._id.toString(), status: "present" }],
        }),
      });

      const res = await markStudentAttendanceRoute(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.message).toContain("Class not found");
    });
  });

  // ─── 2. Successful Marking & Status Variety ────────
  describe("Attendance Marking Success & Multi-Status Support", () => {
    it("should successfully mark attendance with valid statuses by Admin", async () => {
      invalidateStudentAttendanceCache(ctx.schoolA._id.toString());
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/attendance/student", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: academicYear,
          date: pastDateStr,
          classId: ctx.classA1._id.toString(),
          records: [
            { student_id: ctx.studentDocA._id.toString(), status: "present", note: "On time" },
            { student_id: studentDocA2._id.toString(), status: "late", note: "Bus delay" },
          ],
        }),
      });

      const res = await markStudentAttendanceRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.records).toHaveLength(2);
      expect(json.data.records[0].status).toBe("present");
      expect(json.data.records[0].note).toBe("On time");
      expect(json.data.records[1].status).toBe("late");
      expect(json.data.records[1].note).toBe("Bus delay");
    });

    it("should require reason when updating/marking attendance a second time on the same date", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Attempt second submission WITHOUT reason
      const req = new NextRequest("http://localhost:3000/api/attendance/student", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: academicYear,
          date: pastDateStr,
          classId: ctx.classA1._id.toString(),
          records: [
            { student_id: ctx.studentDocA._id.toString(), status: "absent" },
            { student_id: studentDocA2._id.toString(), status: "present" },
          ],
        }),
      });

      const res = await markStudentAttendanceRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("reason is mandatory");
    });

    it("should successfully edit attendance when reason is provided and record audit history", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/attendance/student", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: academicYear,
          date: pastDateStr,
          classId: ctx.classA1._id.toString(),
          reason: "Correcting mistakenly marked status",
          records: [
            { student_id: ctx.studentDocA._id.toString(), status: "half_day", note: "Left at noon" },
            { student_id: studentDocA2._id.toString(), status: "present", note: "Arrived" },
          ],
        }),
      });

      const res = await markStudentAttendanceRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.edit_history).toBeDefined();
      expect(json.data.edit_history.length).toBeGreaterThan(0);

      const latestEntry = json.data.edit_history[json.data.edit_history.length - 1];
      expect(latestEntry.reason).toBe("Correcting mistakenly marked status");
      expect(latestEntry.changes.length).toBeGreaterThan(0);
      const change1 = latestEntry.changes.find((c: any) => c.student_id.toString() === ctx.studentDocA._id.toString());
      expect(change1).toBeDefined();
      expect(change1.old_status).toBe("present");
      expect(change1.new_status).toBe("half_day");
    });
  });

  // ─── 3. Teacher Role Assignment & Date Restriction Rules ────────
  describe("Teacher Role Permissions and Date Boundaries", () => {
    it("should reject teacher marking attendance for an unassigned class with 403", async () => {
      const teacherToken = generateAccessToken({
        user_id: ctx.schoolATeacher._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "teacher",
      });

      const req = new NextRequest("http://localhost:3000/api/attendance/student", {
        method: "POST",
        headers: {
          authorization: `Bearer ${teacherToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: academicYear,
          date: todayStr,
          classId: ctx.classA2._id.toString(), // Teacher is not assigned to classA2
          records: [{ student_id: ctx.studentDocA._id.toString(), status: "present" }],
        }),
      });

      const res = await markStudentAttendanceRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toContain("not assigned to this class");
    });

    it("should assign teacher to classA1 and enforce teacher can only mark TODAY's attendance", async () => {
      // Create teacher assignment for classA1
      await TeacherAssignment.create({
        school_id: ctx.schoolA._id,
        teacher_id: ctx.teacherDocA._id,
        class_id: ctx.classA1._id,
        academic_year: academicYear,
        status: "Active",
        is_deleted: false,
      });

      const teacherToken = generateAccessToken({
        user_id: ctx.schoolATeacher._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "teacher",
      });

      // Attempt to mark for past date as teacher -> should return 400
      const pastReq = new NextRequest("http://localhost:3000/api/attendance/student", {
        method: "POST",
        headers: {
          authorization: `Bearer ${teacherToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: academicYear,
          date: "2026-01-05", // past date
          classId: ctx.classA1._id.toString(),
          records: [{ student_id: ctx.studentDocA._id.toString(), status: "present" }],
        }),
      });

      const pastRes = await markStudentAttendanceRoute(pastReq);
      expect(pastRes.status).toBe(400);
      const pastJson = await pastRes.json();
      expect(pastJson.message).toContain("Teachers can only mark or edit today's attendance");

      // Attempt to mark for future date as teacher -> should return 400
      const futureReq = new NextRequest("http://localhost:3000/api/attendance/student", {
        method: "POST",
        headers: {
          authorization: `Bearer ${teacherToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: academicYear,
          date: futureDateStr, // future date
          classId: ctx.classA1._id.toString(),
          records: [{ student_id: ctx.studentDocA._id.toString(), status: "present" }],
        }),
      });

      const futureRes = await markStudentAttendanceRoute(futureReq);
      expect(futureRes.status).toBe(400);

      // Now mark for TODAY as teacher -> should succeed with 200
      invalidateStudentAttendanceCache(ctx.schoolA._id.toString());
      const todayReq = new NextRequest("http://localhost:3000/api/attendance/student", {
        method: "POST",
        headers: {
          authorization: `Bearer ${teacherToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: academicYear,
          date: todayStr,
          classId: ctx.classA1._id.toString(),
          records: [
            { student_id: ctx.studentDocA._id.toString(), status: "present", note: "Present today" },
            { student_id: studentDocA2._id.toString(), status: "absent", note: "Fever" },
          ],
        }),
      });

      const todayRes = await markStudentAttendanceRoute(todayReq);
      expect(todayRes.status).toBe(200);
      const todayJson = await todayRes.json();
      expect(todayJson.success).toBe(true);
      expect(todayJson.data.type).toBe("student");
    });
  });

  // ─── 4. Student Attendance Querying (/api/attendance/student GET) ────────
  describe("Student Attendance Querying GET", () => {
    it("should reject missing academic_year or date parameter with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/attendance/student?academic_year=2026-2027", {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await getStudentAttendanceRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("required");
    });

    it("should reject invalid dateParam format with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/attendance/student?academic_year=2026-2027&date=invalid-date", {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await getStudentAttendanceRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid date format");
    });

    it("should return attendance records for a specific class on a date", async () => {
      invalidateStudentAttendanceCache(ctx.schoolA._id.toString());
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/attendance/student?academic_year=${academicYear}&date=${todayStr}&classId=${ctx.classA1._id.toString()}`,
        { headers: { authorization: `Bearer ${adminToken}` } }
      );

      const res = await getStudentAttendanceRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.records).toHaveLength(2);
    });

    it("should return class-wide records when classId is not specified", async () => {
      invalidateStudentAttendanceCache(ctx.schoolA._id.toString());
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/attendance/student?academic_year=${academicYear}&date=${todayStr}`,
        { headers: { authorization: `Bearer ${adminToken}` } }
      );

      const res = await getStudentAttendanceRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("should restrict teacher query to only assigned classes", async () => {
      invalidateStudentAttendanceCache(ctx.schoolA._id.toString());
      const teacherToken = generateAccessToken({
        user_id: ctx.schoolATeacher._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "teacher",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/attendance/student?academic_year=${academicYear}&date=${todayStr}`,
        { headers: { authorization: `Bearer ${teacherToken}` } }
      );

      const res = await getStudentAttendanceRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      // All returned records must belong to teacher's assigned classes
      for (const rec of json.data) {
        expect(rec.class_id.toString()).toBe(ctx.classA1._id.toString());
      }
    });
  });

  // ─── 5. Individual Student History & Direct Edit (/api/attendance/student/[id]) ────────
  describe("Individual Student History & Edit (/api/attendance/student/[id])", () => {
    it("should reject invalid student ID format with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/attendance/student/bad-id", {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await getStudentAttendanceByIdRoute(req, { params: Promise.resolve({ id: "bad-id" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid student ID");
    });

    it("should return 404 for non-existent student or cross-tenant student", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // School B student accessed by School A admin -> IDOR protection
      const req = new NextRequest(`http://localhost:3000/api/attendance/student/${ctx.studentDocB._id.toString()}`, {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await getStudentAttendanceByIdRoute(req, {
        params: Promise.resolve({ id: ctx.studentDocB._id.toString() }),
      });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.message).toContain("Student not found");
    });

    it("should return detailed student attendance profile, history, and calculated stats", async () => {
      invalidateStudentHistoryCache(ctx.studentDocA._id.toString());
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/attendance/student/${ctx.studentDocA._id.toString()}?academic_year=${academicYear}`,
        { headers: { authorization: `Bearer ${adminToken}` } }
      );

      const res = await getStudentAttendanceByIdRoute(req, {
        params: Promise.resolve({ id: ctx.studentDocA._id.toString() }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.student.name).toBe("Alpha Student Alice");
      expect(json.data.stats).toBeDefined();
      expect(json.data.stats.totalWorkingDays).toBeGreaterThan(0);
      expect(typeof json.data.stats.attendancePercentage).toBe("number");
      expect(Array.isArray(json.data.history)).toBe(true);
    });

    it("should reject updating single student attendance without reason with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/attendance/student/${ctx.studentDocA._id.toString()}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: todayStr,
          status: "absent",
          // missing reason
        }),
      });

      const res = await updateStudentAttendanceByIdRoute(req, {
        params: Promise.resolve({ id: ctx.studentDocA._id.toString() }),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("reason is mandatory");
    });

    it("should successfully update single student attendance with reason", async () => {
      invalidateStudentHistoryCache(ctx.studentDocA._id.toString());
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/attendance/student/${ctx.studentDocA._id.toString()}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: todayStr,
          status: "absent",
          note: "Family emergency",
          reason: "Parent contacted school",
        }),
      });

      const res = await updateStudentAttendanceByIdRoute(req, {
        params: Promise.resolve({ id: ctx.studentDocA._id.toString() }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain("Attendance updated successfully");

      // Verify in DB that status is now absent and edit_history is recorded
      const updatedDoc = await Attendance.findOne({
        school_id: ctx.schoolA._id,
        "records.student_id": ctx.studentDocA._id,
        date: { $gte: new Date(`${todayStr}T00:00:00.000Z`) },
        type: "student",
      });
      expect(updatedDoc).toBeDefined();
      const stRecord = updatedDoc?.records.find(r => r.student_id?.toString() === ctx.studentDocA._id.toString());
      expect(stRecord?.status).toBe("absent");
      expect(stRecord?.note).toBe("Family emergency");
    });

    it("should return 'No changes detected' when submitting identical status and note", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/attendance/student/${ctx.studentDocA._id.toString()}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: todayStr,
          status: "absent",
          note: "Family emergency",
          reason: "Accidental resubmit",
        }),
      });

      const res = await updateStudentAttendanceByIdRoute(req, {
        params: Promise.resolve({ id: ctx.studentDocA._id.toString() }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toContain("No changes detected");
    });

    it("should enforce teacher can only edit today's attendance on individual student endpoint", async () => {
      const teacherToken = generateAccessToken({
        user_id: ctx.schoolATeacher._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "teacher",
      });

      // Attempt to edit past date as teacher -> 403
      const req = new NextRequest(`http://localhost:3000/api/attendance/student/${ctx.studentDocA._id.toString()}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${teacherToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: pastDateStr,
          status: "present",
          reason: "Teacher correction",
        }),
      });

      const res = await updateStudentAttendanceByIdRoute(req, {
        params: Promise.resolve({ id: ctx.studentDocA._id.toString() }),
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toContain("Teachers can only edit today's attendance");
    });
  });

  // ─── 6. Concurrent Marking Test ────────
  describe("Concurrent Student Attendance Marking", () => {
    it("should handle multiple concurrent updates safely", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const testDate = "2026-03-15";

      // Mark initial
      const initReq = new NextRequest("http://localhost:3000/api/attendance/student", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: academicYear,
          date: testDate,
          classId: ctx.classA1._id.toString(),
          records: [
            { student_id: ctx.studentDocA._id.toString(), status: "present" },
            { student_id: studentDocA2._id.toString(), status: "present" },
          ],
        }),
      });
      const initRes = await markStudentAttendanceRoute(initReq);
      expect(initRes.status).toBe(200);

      // Trigger 3 concurrent updates with reason
      const promises = [1, 2, 3].map((i) => {
        const req = new NextRequest("http://localhost:3000/api/attendance/student", {
          method: "POST",
          headers: {
            authorization: `Bearer ${adminToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            academic_year: academicYear,
            date: testDate,
            classId: ctx.classA1._id.toString(),
            reason: `Concurrent edit batch ${i}`,
            records: [
              { student_id: ctx.studentDocA._id.toString(), status: i % 2 === 0 ? "present" : "late" },
              { student_id: studentDocA2._id.toString(), status: "present" },
            ],
          }),
        });
        return markStudentAttendanceRoute(req);
      });

      const responses = await Promise.all(promises);
      for (const res of responses) {
        expect([200, 400]).toContain(res.status);
      }

      // Verify the document is consistent in the database
      const finalDoc = await Attendance.findOne({
        school_id: ctx.schoolA._id,
        class_id: ctx.classA1._id,
        date: { $gte: new Date("2026-03-15T00:00:00.000Z"), $lte: new Date("2026-03-15T23:59:59.999Z") },
        type: "student",
      });
      expect(finalDoc).toBeDefined();
      expect(finalDoc?.records).toHaveLength(2);
    });
  });
});
