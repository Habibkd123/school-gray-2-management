import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { setupTestDatabase, teardownTestDatabase, TestDataContext } from "../helpers/dbTestSetup";
import {
  GET as getTeacherAttendanceRoute,
  POST as markTeacherAttendanceRoute,
  invalidateTeacherAttendanceCache,
} from "@/app/api/attendance/teacher/route";
import {
  GET as getTeacherAttendanceByIdRoute,
  POST as updateTeacherAttendanceByIdRoute,
} from "@/app/api/attendance/teacher/[id]/route";
import {
  GET as getAttendanceSummaryRoute,
} from "@/app/api/attendance/summary/route";
import {
  GET as getAttendanceReportsRoute,
  invalidateAttendanceReportsCache,
} from "@/app/api/reports/attendance/route";
import {
  GET as getHolidaysRoute,
  POST as createHolidayRoute,
  invalidateHolidaysCache,
} from "@/app/api/holidays/route";
import {
  PUT as updateHolidayRoute,
  DELETE as deleteHolidayRoute,
} from "@/app/api/holidays/[id]/route";
import { generateAccessToken } from "@/lib/utils/jwt";
import { Attendance, Holiday, Parent } from "@/lib/models/index";
import User from "@/lib/models/User";
import bcrypt from "bcryptjs";

let ctx: TestDataContext;

beforeAll(async () => {
  ctx = await setupTestDatabase("att-rep");
  invalidateTeacherAttendanceCache();
  invalidateAttendanceReportsCache();
  invalidateHolidaysCache();
}, 30000);

afterAll(async () => {
  await teardownTestDatabase("att-rep");
});

describe("Deep Teacher Attendance, Reports, Summary & Holidays Suite", () => {
  const academicYear = "2026-2027";
  const todayStr = new Date().toISOString().split("T")[0];
  const pastDateStr = "2026-02-15";

  let createdHolidayId: string;
  let parentUserA: any;
  let parentDocA: any;

  beforeAll(async () => {
    // Setup a parent user & document linked to studentDocA
    const passwordHash = await bcrypt.hash("Password123#", 10);
    parentUserA = await User.create({
      name: "Alpha Parent John",
      email: "att-rep-parent@testschool.com",
      username: "att.rep.parent",
      password_hash: passwordHash,
      role: "parent",
      school_id: ctx.schoolA._id,
      is_active: true,
    });

    parentDocA = await Parent.create({
      school_id: ctx.schoolA._id,
      user_id: parentUserA._id,
      name: "Alpha Parent John",
      phone: "9876543300",
      relation: "Father",
      address: "123 School Way",
    });

    // Link parent to studentDocA
    ctx.studentDocA.parent_id = parentDocA._id;
    await ctx.studentDocA.save();
  });

  // ─── 1. Teacher Attendance Management (/api/attendance/teacher) ────────
  describe("Teacher Attendance (/api/attendance/teacher)", () => {
    it("should reject unauthenticated requests with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/attendance/teacher?academic_year=2026-2027&date=2026-02-15");
      const res = await getTeacherAttendanceRoute(req);
      expect(res.status).toBe(401);
    });

    it("should reject teachers from getting all teacher attendance (admin-only) with 403", async () => {
      const teacherToken = generateAccessToken({
        user_id: ctx.schoolATeacher._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "teacher",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/attendance/teacher?academic_year=${academicYear}&date=${todayStr}`,
        { headers: { authorization: `Bearer ${teacherToken}` } }
      );

      const res = await getTeacherAttendanceRoute(req);
      expect(res.status).toBe(403);
    });

    it("should reject missing academic_year or date in GET with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/attendance/teacher?academic_year=2026-2027", {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await getTeacherAttendanceRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("required");
    });

    it("should reject invalid dateParam format in GET with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/attendance/teacher?academic_year=2026-2027&date=not-a-date", {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await getTeacherAttendanceRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid date format");
    });

    it("should allow School Admin to GET active teachers attendance list", async () => {
      invalidateTeacherAttendanceCache(ctx.schoolA._id.toString());
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/attendance/teacher?academic_year=${academicYear}&date=${todayStr}`,
        { headers: { authorization: `Bearer ${adminToken}` } }
      );

      const res = await getTeacherAttendanceRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.records).toBeDefined();
      expect(json.data.records.length).toBeGreaterThan(0);
      expect(json.data.records[0].teacher_id._id.toString()).toBe(ctx.teacherDocA._id.toString());
    });

    it("should reject non-admin users from marking teacher attendance with 403", async () => {
      const teacherToken = generateAccessToken({
        user_id: ctx.schoolATeacher._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "teacher",
      });

      const req = new NextRequest("http://localhost:3000/api/attendance/teacher", {
        method: "POST",
        headers: {
          authorization: `Bearer ${teacherToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: academicYear,
          date: todayStr,
          records: [{ teacher_id: ctx.teacherDocA._id.toString(), status: "present" }],
        }),
      });

      const res = await markTeacherAttendanceRoute(req);
      expect(res.status).toBe(403);
    });

    it("should validate POST payload fields (date, records array, statuses) with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Missing records
      const req1 = new NextRequest("http://localhost:3000/api/attendance/teacher", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ academic_year: academicYear, date: todayStr }),
      });
      const res1 = await markTeacherAttendanceRoute(req1);
      expect(res1.status).toBe(400);

      // Invalid date
      const req2 = new NextRequest("http://localhost:3000/api/attendance/teacher", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ academic_year: academicYear, date: "bad-date", records: [] }),
      });
      const res2 = await markTeacherAttendanceRoute(req2);
      expect(res2.status).toBe(400);

      // Invalid status in record
      const req3 = new NextRequest("http://localhost:3000/api/attendance/teacher", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: academicYear,
          date: todayStr,
          records: [{ teacher_id: ctx.teacherDocA._id.toString(), status: "on_vacation_invalid" }],
        }),
      });
      const res3 = await markTeacherAttendanceRoute(req3);
      expect(res3.status).toBe(400);
      const json3 = await res3.json();
      expect(json3.message).toContain("Invalid status");
    });

    it("should allow School Admin to save teacher attendance with working_hours and late_minutes", async () => {
      invalidateTeacherAttendanceCache(ctx.schoolA._id.toString());
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/attendance/teacher", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academic_year: academicYear,
          date: todayStr,
          records: [
            {
              teacher_id: ctx.teacherDocA._id.toString(),
              status: "present",
              check_in: "08:30",
              check_out: "16:00",
              working_hours: 7.5,
              late_minutes: 0,
              note: "Regular duty",
            },
          ],
        }),
      });

      const res = await markTeacherAttendanceRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.type).toBe("teacher");
      expect(json.data.records[0].working_hours).toBe(7.5);
      expect(json.data.records[0].check_in).toBe("08:30");
    });
  });

  // ─── 2. Individual Teacher Attendance History & Edit (/api/attendance/teacher/[id]) ────────
  describe("Individual Teacher Attendance (/api/attendance/teacher/[id])", () => {
    it("should reject invalid teacher ID with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/attendance/teacher/invalid-id", {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await getTeacherAttendanceByIdRoute(req, { params: Promise.resolve({ id: "invalid-id" }) });
      expect(res.status).toBe(400);
    });

    it("should allow teacher to view their own attendance history", async () => {
      const teacherToken = generateAccessToken({
        user_id: ctx.schoolATeacher._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "teacher",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/attendance/teacher/${ctx.teacherDocA._id.toString()}?academic_year=${academicYear}`,
        { headers: { authorization: `Bearer ${teacherToken}` } }
      );

      const res = await getTeacherAttendanceByIdRoute(req, {
        params: Promise.resolve({ id: ctx.teacherDocA._id.toString() }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.teacher.name).toBe("Alpha Teacher John");
      expect(json.data.stats).toBeDefined();
    });

    it("should reject a teacher attempting to view another teacher's history with 403", async () => {
      const teacherToken = generateAccessToken({
        user_id: ctx.schoolATeacher._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "teacher",
      });

      // Attempt to access School B teacher
      const req = new NextRequest(
        `http://localhost:3000/api/attendance/teacher/${ctx.teacherDocB._id.toString()}`,
        { headers: { authorization: `Bearer ${teacherToken}` } }
      );

      const res = await getTeacherAttendanceByIdRoute(req, {
        params: Promise.resolve({ id: ctx.teacherDocB._id.toString() }),
      });
      // School B teacher doesn't belong to School A -> 404
      expect([403, 404]).toContain(res.status);
    });

    it("should reject updating teacher attendance without reason with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/attendance/teacher/${ctx.teacherDocA._id.toString()}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: todayStr,
          status: "half_day",
          // missing reason
        }),
      });

      const res = await updateTeacherAttendanceByIdRoute(req, {
        params: Promise.resolve({ id: ctx.teacherDocA._id.toString() }),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("reason is mandatory");
    });

    it("should allow editing teacher attendance with valid reason", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/attendance/teacher/${ctx.teacherDocA._id.toString()}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: todayStr,
          status: "half_day",
          note: "Left early for conference",
          reason: "Approved half day by principal",
        }),
      });

      const res = await updateTeacherAttendanceByIdRoute(req, {
        params: Promise.resolve({ id: ctx.teacherDocA._id.toString() }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain("Attendance updated successfully");
    });
  });

  // ─── 3. Attendance Summary Aggregation (/api/attendance/summary) ────────
  describe("Attendance Summary Aggregation (/api/attendance/summary)", () => {
    it("should reject missing startDate or endDate with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/attendance/summary?startDate=2026-01-01", {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await getAttendanceSummaryRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("startDate and endDate are required");
    });

    it("should reject student summary without classId and without recordId with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/attendance/summary?startDate=2026-01-01&endDate=2026-12-31&type=student", {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await getAttendanceSummaryRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("classId or recordId is required");
    });

    it("should return aggregated counts for a class", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/attendance/summary?startDate=2026-01-01&endDate=2026-12-31&type=student&classId=${ctx.classA1._id.toString()}`,
        { headers: { authorization: `Bearer ${adminToken}` } }
      );

      const res = await getAttendanceSummaryRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
    });

    it("should allow student role to fetch their own summary", async () => {
      const studentToken = generateAccessToken({
        user_id: ctx.schoolAStudent._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "student",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/attendance/summary?startDate=2026-01-01&endDate=2026-12-31&type=student",
        { headers: { authorization: `Bearer ${studentToken}` } }
      );

      const res = await getAttendanceSummaryRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
    });

    it("should allow parent role to fetch their child summary but reject other children with 403", async () => {
      const parentToken = generateAccessToken({
        user_id: parentUserA._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "parent",
      });

      // Authorized child (studentDocA)
      const authReq = new NextRequest(
        `http://localhost:3000/api/attendance/summary?startDate=2026-01-01&endDate=2026-12-31&type=student&recordId=${ctx.studentDocA._id.toString()}`,
        { headers: { authorization: `Bearer ${parentToken}` } }
      );
      const authRes = await getAttendanceSummaryRoute(authReq);
      expect(authRes.status).toBe(200);

      // Unauthorized child (studentDocB belongs to School B and another parent)
      const unauthReq = new NextRequest(
        `http://localhost:3000/api/attendance/summary?startDate=2026-01-01&endDate=2026-12-31&type=student&recordId=${ctx.studentDocB._id.toString()}`,
        { headers: { authorization: `Bearer ${parentToken}` } }
      );
      const unauthRes = await getAttendanceSummaryRoute(unauthReq);
      expect(unauthRes.status).toBe(403);
    });

    it("should return detailed daily records when detail=true is specified", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/attendance/summary?startDate=2026-01-01&endDate=2026-12-31&type=student&classId=${ctx.classA1._id.toString()}&recordId=${ctx.studentDocA._id.toString()}&detail=true`,
        { headers: { authorization: `Bearer ${adminToken}` } }
      );

      const res = await getAttendanceSummaryRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });
  });

  // ─── 4. Attendance Reports (/api/reports/attendance) ────────
  describe("Attendance Reports (/api/reports/attendance)", () => {
    it("should reject invalid type parameter with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/reports/attendance?type=invalid-report-type", {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await getAttendanceReportsRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid type parameter");
    });

    it("should reject monthly report without month parameter with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/reports/attendance?type=monthly", {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await getAttendanceReportsRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Month (YYYY-MM) parameter is required");
    });

    it("should return daily attendance report class-wise", async () => {
      invalidateAttendanceReportsCache(ctx.schoolA._id.toString());
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/reports/attendance?type=daily&date=${todayStr}`, {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await getAttendanceReportsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
      const classStat = json.data.find((c: any) => c.classId.toString() === ctx.classA1._id.toString());
      expect(classStat).toBeDefined();
      expect(classStat.className).toBe("Class 10");
      expect(typeof classStat.rate).toBe("number");
    });

    it("should return monthly attendance report with working days and rates", async () => {
      invalidateAttendanceReportsCache(ctx.schoolA._id.toString());
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const monthStr = todayStr.substring(0, 7); // YYYY-MM
      const req = new NextRequest(`http://localhost:3000/api/reports/attendance?type=monthly&month=${monthStr}`, {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await getAttendanceReportsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      const stat = json.data[0];
      expect(stat).toBeDefined();
      expect(stat.className).toBeDefined();
      expect(typeof stat.workingDays).toBe("number");
      expect(typeof stat.rate).toBe("number");
    });

    it("should return teacher recent 7-day attendance report", async () => {
      invalidateAttendanceReportsCache(ctx.schoolA._id.toString());
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/reports/attendance?type=teacher-recent", {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await getAttendanceReportsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      const teacherStat = json.data.find((t: any) => t.teacherId.toString() === ctx.teacherDocA._id.toString());
      expect(teacherStat).toBeDefined();
      expect(teacherStat.history).toHaveLength(7);
    });
  });

  // ─── 5. Holidays Management (/api/holidays & /api/holidays/[id]) ────────
  describe("Holidays Management (/api/holidays/*)", () => {
    it("should reject holiday creation with missing required fields with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/holidays", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: "No title or date",
        }),
      });

      const res = await createHolidayRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Missing required fields");
    });

    it("should reject holiday creation with invalid date format with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/holidays", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Invalid Date Holiday",
          date: "not-a-date",
        }),
      });

      const res = await createHolidayRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid date format");
    });

    it("should allow School Admin to create a holiday with 201", async () => {
      invalidateHolidaysCache(ctx.schoolA._id.toString());
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/holidays", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "National Independence Day",
          date: "2026-08-15",
          description: "Public holiday celebrating national sovereignty",
          status: "Active",
        }),
      });

      const res = await createHolidayRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe("National Independence Day");
      expect(json.data.display_id).toBeDefined();

      createdHolidayId = json.data._id;
    });

    it("should return paginated list of holidays via GET /api/holidays", async () => {
      invalidateHolidaysCache(ctx.schoolA._id.toString());
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/holidays?page=1&limit=10", {
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await getHolidaysRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.holidays.length).toBeGreaterThan(0);
      expect(json.data.total).toBeGreaterThan(0);
    });

    it("should reject updating holiday with invalid ID with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/holidays/invalid-id", {
        method: "PUT",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "Updated Title" }),
      });

      const res = await updateHolidayRoute(req, { params: Promise.resolve({ id: "invalid-id" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid holiday ID");
    });

    it("should allow School Admin to update a holiday", async () => {
      invalidateHolidaysCache(ctx.schoolA._id.toString());
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/holidays/${createdHolidayId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Independence Day (Observed)",
          description: "Updated description for observed holiday",
        }),
      });

      const res = await updateHolidayRoute(req, { params: Promise.resolve({ id: createdHolidayId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe("Independence Day (Observed)");
    });

    it("should allow School Admin to delete a holiday", async () => {
      invalidateHolidaysCache(ctx.schoolA._id.toString());
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/holidays/${createdHolidayId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await deleteHolidayRoute(req, { params: Promise.resolve({ id: createdHolidayId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain("Deleted successfully");

      // Verify deletion from DB
      const deletedDoc = await Holiday.findById(createdHolidayId);
      expect(deletedDoc).toBeNull();
    });
  });
});
