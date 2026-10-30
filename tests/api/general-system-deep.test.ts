import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { setupTestDatabase, teardownTestDatabase, TestDataContext } from "../helpers/dbTestSetup";
import { generateAccessToken } from "@/lib/utils/jwt";

// Mock Cloudinary so upload tests run fast and offline
vi.mock("@/lib/cloudinary", () => ({
  uploadToCloudinary: vi.fn(async () => ({
    secure_url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    public_id: "sample_id",
  })),
}));

// Route handlers
import { POST as uploadFileRoute } from "@/app/api/upload/route";

import {
  GET as getHolidaysRoute,
  POST as createHolidayRoute,
  invalidateHolidaysCache,
} from "@/app/api/holidays/route";
import {
  GET as getHolidayByIdRoute,
  PUT as updateHolidayByIdRoute,
  DELETE as deleteHolidayByIdRoute,
} from "@/app/api/holidays/[id]/route";

import {
  GET as getNoticesRoute,
  POST as createNoticeRoute,
} from "@/app/api/notices/route";
import {
  GET as getNoticeByIdRoute,
  PUT as updateNoticeByIdRoute,
  DELETE as deleteNoticeByIdRoute,
  PATCH as patchNoticeByIdRoute,
} from "@/app/api/notices/[id]/route";

import {
  GET as getHomeworksRoute,
  POST as createHomeworkRoute,
  invalidateHomeworkCache,
} from "@/app/api/homework/route";
import {
  GET as getHomeworkByIdRoute,
  PUT as updateHomeworkByIdRoute,
  DELETE as deleteHomeworkByIdRoute,
} from "@/app/api/homework/[id]/route";

import { GET as getClassReportRoute } from "@/app/api/reports/class/[id]/route";
import { GET as getStudentReportRoute } from "@/app/api/reports/student/[id]/route";
import { GET as getTeacherReportRoute } from "@/app/api/reports/teacher/[id]/route";
import {
  GET as getAttendanceReportRoute,
  invalidateAttendanceReportsCache,
} from "@/app/api/reports/attendance/route";

import {
  GET as getTenantBackupRoute,
  POST as restoreTenantBackupRoute,
} from "@/app/api/backup/tenant/route";
import { POST as exportDataPdfRoute } from "@/app/api/backup/export/route";

import { GET as getThemeRoute } from "@/app/api/theme/route";
import {
  GET as getSchoolThemeRoute,
  PUT as updateSchoolThemeRoute,
} from "@/app/api/schools/[id]/theme/route";

import {
  Holiday,
  Notice,
  Homework,
  Attendance,
  Timetable,
} from "@/lib/models/index";
import Parent from "@/lib/models/Parent";
import Student from "@/lib/models/Student";
import Teacher from "@/lib/models/Teacher";
import User from "@/lib/models/User";
import School from "@/lib/models/School";

let ctx: TestDataContext;

beforeAll(async () => {
  ctx = await setupTestDatabase("gen-sys");
  invalidateHolidaysCache();
  invalidateHomeworkCache();
  invalidateAttendanceReportsCache();
}, 30000);

afterAll(async () => {
  await teardownTestDatabase("gen-sys");
});

describe("Deep General & System Test Suite", () => {
  let superAdminToken: string;
  let schoolAAdminToken: string;
  let schoolBAdminToken: string;
  let teacherTokenA: string;
  let teacherTokenB: string;
  let studentTokenA: string;
  let parentTokenA: string;
  let parentUserA: any;
  let parentDocA: any;

  beforeAll(async () => {
    superAdminToken = generateAccessToken({
      user_id: ctx.superAdmin._id.toString(),
      school_id: null,
      role: "super_admin",
    });

    schoolAAdminToken = generateAccessToken({
      user_id: ctx.schoolAAdmin._id.toString(),
      school_id: ctx.schoolA._id.toString(),
      role: "school_admin",
    });

    schoolBAdminToken = generateAccessToken({
      user_id: ctx.schoolBAdmin._id.toString(),
      school_id: ctx.schoolB._id.toString(),
      role: "school_admin",
    });

    teacherTokenA = generateAccessToken({
      user_id: ctx.schoolATeacher._id.toString(),
      school_id: ctx.schoolA._id.toString(),
      role: "teacher",
    });

    teacherTokenB = generateAccessToken({
      user_id: ctx.schoolBTeacher._id.toString(),
      school_id: ctx.schoolB._id.toString(),
      role: "teacher",
    });

    studentTokenA = generateAccessToken({
      user_id: ctx.schoolAStudent._id.toString(),
      school_id: ctx.schoolA._id.toString(),
      role: "student",
    });

    // Create a Parent in School A
    const passwordHash = await bcrypt.hash("Password123#", 10);
    parentUserA = await User.create({
      name: "Parent General Alice",
      email: "parent.gen.alice@testschool.com",
      username: "parent.gen.alice",
      password_hash: passwordHash,
      role: "parent",
      school_id: ctx.schoolA._id,
      is_active: true,
    });

    parentDocA = await Parent.create({
      school_id: ctx.schoolA._id,
      user_id: parentUserA._id,
      name: "Parent General Alice",
      phone: "9876543299",
      email: "parent.gen.alice@testschool.com",
      relation: "Mother",
      is_active: true,
    });

    ctx.studentDocA.parent_id = parentDocA._id;
    await ctx.studentDocA.save();

    parentTokenA = generateAccessToken({
      user_id: parentUserA._id.toString(),
      school_id: ctx.schoolA._id.toString(),
      role: "parent",
    });

    // Assign Teacher A to Class A1 via Timetable so Teacher A has access
    await Timetable.create({
      school_id: ctx.schoolA._id,
      class_id: ctx.classA1._id,
      subject_id: ctx.subjectA1._id,
      teacher_id: ctx.teacherDocA._id,
      day: "monday",
      start_time: "08:00 AM",
      end_time: "09:00 AM",
      room: "Room 101",
    });
  });

  // ─── 1. Uploads Security, File Validation & Limits ───────────────────────────
  describe("Uploads Security, File Validation & Limits (/api/upload)", () => {
    it("should reject unauthenticated upload request with 401", async () => {
      const formData = new FormData();
      formData.append("file", new File(["test content"], "test.png", { type: "image/png" }));
      const req = new NextRequest("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
      });
      const res = await uploadFileRoute(req);
      expect(res.status).toBe(401);
    });

    it("should reject student attempting to upload file with 403", async () => {
      const formData = new FormData();
      formData.append("file", new File(["test content"], "photo.png", { type: "image/png" }));
      const req = new NextRequest("http://localhost:3000/api/upload", {
        method: "POST",
        headers: { authorization: `Bearer ${studentTokenA}` },
        body: formData,
      });
      const res = await uploadFileRoute(req);
      expect(res.status).toBe(403);
    });

    it("should reject parent attempting to upload file with 403", async () => {
      const formData = new FormData();
      formData.append("file", new File(["test content"], "photo.png", { type: "image/png" }));
      const req = new NextRequest("http://localhost:3000/api/upload", {
        method: "POST",
        headers: { authorization: `Bearer ${parentTokenA}` },
        body: formData,
      });
      const res = await uploadFileRoute(req);
      expect(res.status).toBe(403);
    });

    it("should reject upload when no file is provided with 400", async () => {
      const formData = new FormData();
      const req = new NextRequest("http://localhost:3000/api/upload", {
        method: "POST",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
        body: formData,
      });
      const res = await uploadFileRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toMatch(/no file provided/i);
    });

    it("should reject empty file (0 bytes) with 400", async () => {
      const formData = new FormData();
      formData.append("file", new File([], "empty.png", { type: "image/png" }));
      const req = new NextRequest("http://localhost:3000/api/upload", {
        method: "POST",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
        body: formData,
      });
      const res = await uploadFileRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toMatch(/file cannot be empty/i);
    });

    it("should reject malicious filename with path traversal sequences with 400", async () => {
      const formData = new FormData();
      formData.append("file", new File(["malicious content"], "../../etc/passwd.png", { type: "image/png" }));
      const req = new NextRequest("http://localhost:3000/api/upload", {
        method: "POST",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
        body: formData,
      });
      const res = await uploadFileRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toMatch(/malicious filename detected/i);
    });

    it("should reject dangerous executable or script files with 400", async () => {
      const formData = new FormData();
      formData.append("file", new File(["binary content"], "payload.exe", { type: "application/x-msdownload" }));
      const req = new NextRequest("http://localhost:3000/api/upload", {
        method: "POST",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
        body: formData,
      });
      const res = await uploadFileRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toMatch(/strictly prohibited/i);
    });

    it("should reject disallowed file MIME types with 400", async () => {
      const formData = new FormData();
      formData.append("file", new File(["<html>bad</html>"], "bad.html", { type: "text/html" }));
      const req = new NextRequest("http://localhost:3000/api/upload", {
        method: "POST",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
        body: formData,
      });
      const res = await uploadFileRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toMatch(/invalid file type/i);
    });

    it("should reject image file exceeding 5MB limit with 400", async () => {
      const bigBuffer = new Uint8Array(6 * 1024 * 1024); // 6MB
      const formData = new FormData();
      formData.append("file", new File([bigBuffer], "large_photo.png", { type: "image/png" }));
      const req = new NextRequest("http://localhost:3000/api/upload", {
        method: "POST",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
        body: formData,
      });
      const res = await uploadFileRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toMatch(/file too large/i);
    });

    it("should successfully upload valid file (image/pdf) for authorized admin or teacher", async () => {
      const formData = new FormData();
      formData.append("file", new File(["valid image bytes"], "avatar.png", { type: "image/png" }));
      const req = new NextRequest("http://localhost:3000/api/upload", {
        method: "POST",
        headers: { authorization: `Bearer ${teacherTokenA}` },
        body: formData,
      });
      const res = await uploadFileRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.url).toBeDefined();
    });
  });

  // ─── 2. Holidays Management & Calendar ───────────────────────────────────────
  describe("Holidays Management & Calendar (/api/holidays/*)", () => {
    let createdHolidayId: string;

    it("should reject holiday creation by student or teacher with 403", async () => {
      const req = new NextRequest("http://localhost:3000/api/holidays", {
        method: "POST",
        headers: {
          authorization: `Bearer ${studentTokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "Student Holiday",
          date: "2026-11-01",
        }),
      });
      const res = await createHolidayRoute(req);
      expect(res.status).toBe(403);
    });

    it("should reject holiday creation with missing fields with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/holidays", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ title: "Diwali" }),
      });
      const res = await createHolidayRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toMatch(/missing required fields/i);
    });

    it("should reject holiday creation with invalid date format with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/holidays", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "Diwali",
          date: "invalid-date",
        }),
      });
      const res = await createHolidayRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toMatch(/invalid date format/i);
    });

    it("should successfully create a holiday for School A", async () => {
      const req = new NextRequest("http://localhost:3000/api/holidays", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "Diwali Holiday",
          date: "2026-11-12",
          description: "Festival of Lights",
          status: "Active",
        }),
      });
      const res = await createHolidayRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe("Diwali Holiday");
      createdHolidayId = json.data._id;
    });

    it("should allow students, parents, and teachers to view the holiday calendar", async () => {
      invalidateHolidaysCache(ctx.schoolA._id.toString());
      const req = new NextRequest("http://localhost:3000/api/holidays?limit=all", {
        headers: { authorization: `Bearer ${parentTokenA}` },
      });
      const res = await getHolidaysRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.holidays.length).toBeGreaterThanOrEqual(1);
    });

    it("should fetch single holiday by ID", async () => {
      const req = new NextRequest(`http://localhost:3000/api/holidays/${createdHolidayId}`, {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getHolidayByIdRoute(req, { params: Promise.resolve({ id: createdHolidayId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.title).toBe("Diwali Holiday");
    });

    it("should update holiday via PUT", async () => {
      const req = new NextRequest(`http://localhost:3000/api/holidays/${createdHolidayId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "Diwali Festival Holiday",
        }),
      });
      const res = await updateHolidayByIdRoute(req, { params: Promise.resolve({ id: createdHolidayId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.title).toBe("Diwali Festival Holiday");
    });

    it("should prevent School A Admin from deleting School B's holiday (cross-tenant IDOR)", async () => {
      // Create holiday in School B
      const hB = await Holiday.create({
        school_id: ctx.schoolB._id,
        display_id: "HB-001",
        title: "Beta Holiday",
        date: new Date("2026-12-25"),
      });

      const req = new NextRequest(`http://localhost:3000/api/holidays/${hB._id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await deleteHolidayByIdRoute(req, { params: Promise.resolve({ id: hB._id.toString() }) });
      expect(res.status).toBe(404);
    });

    it("should delete holiday via DELETE", async () => {
      const req = new NextRequest(`http://localhost:3000/api/holidays/${createdHolidayId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await deleteHolidayByIdRoute(req, { params: Promise.resolve({ id: createdHolidayId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.message).toMatch(/deleted successfully/i);
    });
  });

  // ─── 3. Notices & Communication ──────────────────────────────────────────────
  describe("Notices & Communication (/api/notices/*)", () => {
    let studentNoticeId: string;
    let teacherNoticeId: string;
    let draftNoticeId: string;

    beforeAll(async () => {
      // 1. Notice for Students
      const n1 = await Notice.create({
        school_id: ctx.schoolA._id,
        created_by: ctx.schoolAAdmin._id,
        title: "Annual Sports Day",
        content: "Sports day on Friday",
        target_audience: "students",
        is_published: true,
      });
      studentNoticeId = n1._id.toString();

      // 2. Notice for Teachers
      const n2 = await Notice.create({
        school_id: ctx.schoolA._id,
        created_by: ctx.schoolAAdmin._id,
        title: "Staff Meeting Notice",
        content: "Staff meeting at 3 PM",
        target_audience: "teachers",
        is_published: true,
      });
      teacherNoticeId = n2._id.toString();

      // 3. Unpublished Draft Notice
      const n3 = await Notice.create({
        school_id: ctx.schoolA._id,
        created_by: ctx.schoolAAdmin._id,
        title: "Confidential School Board Notice",
        content: "Internal notes only",
        target_audience: "all",
        is_published: false,
      });
      draftNoticeId = n3._id.toString();
    });

    it("should allow student to view student-targeted notice", async () => {
      const req = new NextRequest(`http://localhost:3000/api/notices/${studentNoticeId}`, {
        headers: { authorization: `Bearer ${studentTokenA}` },
      });
      const res = await getNoticeByIdRoute(req, { params: Promise.resolve({ id: studentNoticeId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.title).toBe("Annual Sports Day");
    });

    it("should BLOCK student from viewing teacher-targeted notice with 403", async () => {
      const req = new NextRequest(`http://localhost:3000/api/notices/${teacherNoticeId}`, {
        headers: { authorization: `Bearer ${studentTokenA}` },
      });
      const res = await getNoticeByIdRoute(req, { params: Promise.resolve({ id: teacherNoticeId }) });
      expect(res.status).toBe(403);
    });

    it("should BLOCK student from viewing unpublished draft notice with 403", async () => {
      const req = new NextRequest(`http://localhost:3000/api/notices/${draftNoticeId}`, {
        headers: { authorization: `Bearer ${studentTokenA}` },
      });
      const res = await getNoticeByIdRoute(req, { params: Promise.resolve({ id: draftNoticeId }) });
      expect(res.status).toBe(403);
    });

    it("should allow School Admin to view draft notice", async () => {
      const req = new NextRequest(`http://localhost:3000/api/notices/${draftNoticeId}`, {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getNoticeByIdRoute(req, { params: Promise.resolve({ id: draftNoticeId }) });
      expect(res.status).toBe(200);
    });

    it("should soft delete notice and restore it via PATCH action=restore", async () => {
      // 1. Soft delete
      const delReq = new NextRequest(`http://localhost:3000/api/notices/${studentNoticeId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const delRes = await deleteNoticeByIdRoute(delReq, { params: Promise.resolve({ id: studentNoticeId }) });
      expect(delRes.status).toBe(200);

      // Verify soft deleted notice not visible in normal student query
      const getReq = new NextRequest(`http://localhost:3000/api/notices/${studentNoticeId}`, {
        headers: { authorization: `Bearer ${studentTokenA}` },
      });
      const getRes = await getNoticeByIdRoute(getReq, { params: Promise.resolve({ id: studentNoticeId }) });
      expect(getRes.status).toBe(404);

      // 2. Restore via PATCH
      const patchReq = new NextRequest(`http://localhost:3000/api/notices/${studentNoticeId}?action=restore`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const patchRes = await patchNoticeByIdRoute(patchReq, { params: Promise.resolve({ id: studentNoticeId }) });
      expect(patchRes.status).toBe(200);

      // Verify restored
      const restored = await Notice.findById(studentNoticeId).lean();
      expect(restored?.is_deleted).toBe(false);
    });
  });

  // ─── 4. Homework & Student Submissions ───────────────────────────────────────
  describe("Homework & Student Submissions (/api/homework/*)", () => {
    let homeworkId: string;

    it("should reject homework creation with missing required fields with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/homework", {
        method: "POST",
        headers: {
          authorization: `Bearer ${teacherTokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ title: "Math Assignment 1" }),
      });
      const res = await createHomeworkRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toMatch(/required/i);
    });

    it("should reject Teacher A from creating homework for Class A2 (not assigned to Class A2) with 403", async () => {
      const req = new NextRequest("http://localhost:3000/api/homework", {
        method: "POST",
        headers: {
          authorization: `Bearer ${teacherTokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "Physics Problem Set",
          classId: ctx.classA2._id.toString(), // Not assigned to Teacher A!
          subject: "Physics",
          dueDate: "2026-11-15",
        }),
      });
      const res = await createHomeworkRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toMatch(/not assigned to this class/i);
    });

    it("should allow Teacher A to create homework for assigned Class A1", async () => {
      const req = new NextRequest("http://localhost:3000/api/homework", {
        method: "POST",
        headers: {
          authorization: `Bearer ${teacherTokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: "Math Calculus Homework",
          description: "Solve problems 1 to 10 on page 42",
          classId: ctx.classA1._id.toString(),
          subject: "Mathematics",
          dueDate: "2026-11-20",
          status: "published",
        }),
      });
      const res = await createHomeworkRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toBe("Math Calculus Homework");
      homeworkId = json.data._id;
    });

    it("should allow Student in Class A1 to submit homework", async () => {
      const req = new NextRequest(`http://localhost:3000/api/homework/${homeworkId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${studentTokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "submit",
          content: "Here are my calculus solutions: 1. x = 5, 2. y = 10",
        }),
      });
      const res = await updateHomeworkByIdRoute(req, { params: Promise.resolve({ id: homeworkId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.submissions.length).toBe(1);
    });

    it("should reject student submission without content with 400", async () => {
      const req = new NextRequest(`http://localhost:3000/api/homework/${homeworkId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${studentTokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "submit",
          content: "",
        }),
      });
      const res = await updateHomeworkByIdRoute(req, { params: Promise.resolve({ id: homeworkId }) });
      expect(res.status).toBe(400);
    });

    it("should reject Student from grading homework with 403", async () => {
      const req = new NextRequest(`http://localhost:3000/api/homework/${homeworkId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${studentTokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "grade",
          studentId: ctx.studentDocA._id.toString(),
          grade: "A+",
        }),
      });
      const res = await updateHomeworkByIdRoute(req, { params: Promise.resolve({ id: homeworkId }) });
      expect(res.status).toBe(403);
    });

    it("should allow assigned Teacher to grade student's submission", async () => {
      const req = new NextRequest(`http://localhost:3000/api/homework/${homeworkId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${teacherTokenA}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "grade",
          studentId: ctx.studentDocA._id.toString(),
          grade: "A",
          feedback: "Well done, step 2 was very clear",
        }),
      });
      const res = await updateHomeworkByIdRoute(req, { params: Promise.resolve({ id: homeworkId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.submissions[0].grade).toBe("A");
    });
  });

  // ─── 5. Reports Engine & Data Leakage Prevention ─────────────────────────────
  describe("Reports Engine & Data Leakage Prevention (/api/reports/*)", () => {
    it("should reject class report request with invalid class ID with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/reports/class/invalid-id", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getClassReportRoute(req, { params: Promise.resolve({ id: "invalid-id" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toMatch(/invalid class id/i);
    });

    it("should prevent School A Admin from viewing School B's class report (cross-tenant)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/reports/class/${ctx.classB1._id}`, {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getClassReportRoute(req, { params: Promise.resolve({ id: ctx.classB1._id.toString() }) });
      expect(res.status).toBe(404);
    });

    it("should reject student attempting to access class report with 403", async () => {
      const req = new NextRequest(`http://localhost:3000/api/reports/class/${ctx.classA1._id}`, {
        headers: { authorization: `Bearer ${studentTokenA}` },
      });
      const res = await getClassReportRoute(req, { params: Promise.resolve({ id: ctx.classA1._id.toString() }) });
      expect(res.status).toBe(403);
    });

    it("should return complete class report for authorized admin", async () => {
      const req = new NextRequest(`http://localhost:3000/api/reports/class/${ctx.classA1._id}`, {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getClassReportRoute(req, { params: Promise.resolve({ id: ctx.classA1._id.toString() }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.profile.name).toBe("Class 10");
      expect(json.data.demographics).toBeDefined();
    });

    it("should reject student report with invalid student ID with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/reports/student/invalid-id", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getStudentReportRoute(req, { params: Promise.resolve({ id: "invalid-id" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toMatch(/invalid student id/i);
    });

    it("should reject student attempting to access student reports endpoint with 403", async () => {
      const req = new NextRequest(`http://localhost:3000/api/reports/student/${ctx.studentDocA._id}`, {
        headers: { authorization: `Bearer ${studentTokenA}` },
      });
      const res = await getStudentReportRoute(req, { params: Promise.resolve({ id: ctx.studentDocA._id.toString() }) });
      expect(res.status).toBe(403);
    });

    it("should return student report for authorized admin", async () => {
      const req = new NextRequest(`http://localhost:3000/api/reports/student/${ctx.studentDocA._id}`, {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getStudentReportRoute(req, { params: Promise.resolve({ id: ctx.studentDocA._id.toString() }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.profile.name).toBe(ctx.studentDocA.name);
    });

    it("should reject teacher report with invalid teacher ID with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/reports/teacher/invalid-id", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getTeacherReportRoute(req, { params: Promise.resolve({ id: "invalid-id" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toMatch(/invalid teacher id/i);
    });

    it("should prevent Teacher A from viewing Teacher B's report (data leakage defense)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/reports/teacher/${ctx.teacherDocB._id}`, {
        headers: { authorization: `Bearer ${teacherTokenA}` },
      });
      const res = await getTeacherReportRoute(req, { params: Promise.resolve({ id: ctx.teacherDocB._id.toString() }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toMatch(/only view your own report/i);
    });

    it("should allow Teacher A to view their own report", async () => {
      const req = new NextRequest(`http://localhost:3000/api/reports/teacher/${ctx.teacherDocA._id}`, {
        headers: { authorization: `Bearer ${teacherTokenA}` },
      });
      const res = await getTeacherReportRoute(req, { params: Promise.resolve({ id: ctx.teacherDocA._id.toString() }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.profile.name).toBe("Alpha Teacher John");
    });

    it("should validate attendance reports parameters (type, month)", async () => {
      // Invalid report type
      const req1 = new NextRequest("http://localhost:3000/api/reports/attendance?type=invalid", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res1 = await getAttendanceReportRoute(req1);
      expect(res1.status).toBe(400);

      // Monthly report without month parameter
      const req2 = new NextRequest("http://localhost:3000/api/reports/attendance?type=monthly", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res2 = await getAttendanceReportRoute(req2);
      expect(res2.status).toBe(400);
      const json2 = await res2.json();
      expect(json2.message).toMatch(/month.*required/i);
    });

    it("should fetch daily attendance report successfully", async () => {
      const req = new NextRequest("http://localhost:3000/api/reports/attendance?type=daily", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getAttendanceReportRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });
  });

  // ─── 6. Backup Permissions, Integrity & Restore Safety ───────────────────────
  describe("Backup Permissions, Integrity & Restore Safety (/api/backup/*)", () => {
    let schoolABackupPayload: any;

    it("should reject student, parent, or teacher from generating tenant backup with 403", async () => {
      const req = new NextRequest("http://localhost:3000/api/backup/tenant", {
        headers: { authorization: `Bearer ${studentTokenA}` },
      });
      const res = await getTenantBackupRoute(req);
      expect(res.status).toBe(403);
    });

    it("should generate a complete, machine-restorable backup for School A Admin", async () => {
      const req = new NextRequest("http://localhost:3000/api/backup/tenant", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getTenantBackupRoute(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/json");

      const bodyText = await res.text();
      schoolABackupPayload = JSON.parse(bodyText);
      expect(schoolABackupPayload.format_version).toBe("2.0-saas");
      expect(schoolABackupPayload.tenant.id).toBe(ctx.schoolA._id.toString());
      expect(schoolABackupPayload.counts.students).toBeGreaterThanOrEqual(1);
      expect(schoolABackupPayload.data.students).toBeDefined();
    });

    it("should reject restore when backup format or data is invalid with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/backup/tenant", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ format_version: "1.0", data: {} }),
      });
      const res = await restoreTenantBackupRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toMatch(/invalid backup file format/i);
    });

    it("should prevent School A Admin from restoring School B's backup (Tenant mismatch defense)", async () => {
      const maliciousBackup = {
        format_version: "2.0-saas",
        tenant: {
          id: ctx.schoolB._id.toString(),
          name: "Beta Grammar School",
        },
        data: { classes: [] },
      };

      const req = new NextRequest("http://localhost:3000/api/backup/tenant", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(maliciousBackup),
      });
      const res = await restoreTenantBackupRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toMatch(/tenant mismatch/i);
    });

    it("should generate downloadable PDF data backup report via POST /api/backup/export", async () => {
      const req = new NextRequest("http://localhost:3000/api/backup/export", {
        method: "POST",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          module: "students",
          action: "download",
        }),
      });
      const res = await exportDataPdfRoute(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/pdf");
      const pdfBytes = await res.arrayBuffer();
      expect(pdfBytes.byteLength).toBeGreaterThan(100);
    });
  });

  // ─── 7. Theme Management & Validation ────────────────────────────────────────
  describe("Theme Management & Validation (/api/theme, /api/schools/[id]/theme)", () => {
    it("should return resolved theme and CSS variables for authenticated user", async () => {
      const req = new NextRequest("http://localhost:3000/api/theme", {
        headers: { authorization: `Bearer ${studentTokenA}` },
      });
      const res = await getThemeRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.theme).toBeDefined();
      expect(json.data.css_vars).toBeDefined();
    });

    it("should allow Super Admin to query theme for specific school via ?school_id", async () => {
      const req = new NextRequest(`http://localhost:3000/api/theme?school_id=${ctx.schoolA._id}`, {
        headers: { authorization: `Bearer ${superAdminToken}` },
      });
      const res = await getThemeRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.school_id).toBe(ctx.schoolA._id.toString());
    });

    it("should reject non-superadmin from updating school theme with 403", async () => {
      const req = new NextRequest(`http://localhost:3000/api/schools/${ctx.schoolA._id}/theme`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${schoolAAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ preset: "emerald_green" }),
      });
      const res = await updateSchoolThemeRoute(req, { params: Promise.resolve({ id: ctx.schoolA._id.toString() }) });
      expect(res.status).toBe(403);
    });

    it("should reject invalid theme preset with 400", async () => {
      const req = new NextRequest(`http://localhost:3000/api/schools/${ctx.schoolA._id}/theme`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${superAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ preset: "invalid_neon_preset" }),
      });
      const res = await updateSchoolThemeRoute(req, { params: Promise.resolve({ id: ctx.schoolA._id.toString() }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toMatch(/invalid theme preset/i);
    });

    it("should allow Super Admin to update school theme with valid preset", async () => {
      const req = new NextRequest(`http://localhost:3000/api/schools/${ctx.schoolA._id}/theme`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${superAdminToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ preset: "modern_teal" }),
      });
      const res = await updateSchoolThemeRoute(req, { params: Promise.resolve({ id: ctx.schoolA._id.toString() }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.theme.preset).toBe("modern_teal");
    });
  });
});
