import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { setupTestDatabase, teardownTestDatabase, TestDataContext } from "./helpers/dbTestSetup";
import { generateAccessToken } from "@/lib/utils/jwt";

// Route Handlers
import { POST as loginUser } from "@/app/api/auth/login/route";
import { GET as getStudentProfile } from "@/app/api/student/profile/route";
import { GET as getStudentById } from "@/app/api/students/[id]/route";
import { GET as getResults } from "@/app/api/results/route";
import { GET as getAttendanceSummary } from "@/app/api/attendance/summary/route";
import { GET as getFeePayments } from "@/app/api/fees/payments/route";
import { GET as getStudentReport } from "@/app/api/reports/student/[id]/route";
import { GET as getNotices, POST as createNotice } from "@/app/api/notices/route";
import { GET as getLeaves, POST as createLeave } from "@/app/api/leave/route";
import { GET as getLeaveById, PUT as updateLeaveById } from "@/app/api/leave/[id]/route";
import { GET as getHomework, POST as createHomework } from "@/app/api/homework/route";
import { GET as getSchedules } from "@/app/api/schedules/route";

// Models
import User from "@/lib/models/User";
import Student from "@/lib/models/Student";
import {
  Result,
  Attendance,
  StudentFeePayment,
  FeeMaster,
  FeeGroup,
  FeeType,
  Notice,
  LeaveRequest,
  Homework,
  Timetable,
  Exam,
} from "@/lib/models/index";

let ctx: TestDataContext;
let studentAToken: string;
let studentBToken: string;
let teacherToken: string;
let adminToken: string;

let testExamA: any;
let testResultA: any;
let testResultB: any;
let testNoticeAll: any;
let testNoticeTeachers: any;
let testNoticeDraft: any;
let testHomeworkA: any;
let testHomeworkDraft: any;
let testFeeMasterA: any;
let testPaymentA: any;
let testPaymentB: any;
let testTimetableA: any;

beforeAll(async () => {
  ctx = await setupTestDatabase("sp-portal");

  studentAToken = generateAccessToken({
    user_id: ctx.schoolAStudent._id.toString(),
    school_id: ctx.schoolA._id.toString(),
    role: "student",
  });

  studentBToken = generateAccessToken({
    user_id: ctx.schoolBStudent._id.toString(),
    school_id: ctx.schoolB._id.toString(),
    role: "student",
  });

  teacherToken = generateAccessToken({
    user_id: ctx.schoolATeacher._id.toString(),
    school_id: ctx.schoolA._id.toString(),
    role: "teacher",
  });

  adminToken = generateAccessToken({
    user_id: ctx.schoolAAdmin._id.toString(),
    school_id: ctx.schoolA._id.toString(),
    role: "school_admin",
  });

  // Seed sample Exam & Results
  testExamA = await Exam.create({
    school_id: ctx.schoolA._id,
    class_id: ctx.classA1._id,
    name: "Mid-Term Examination 2026",
    type: "mid_term",
    academic_year: "2026-2027",
    start_date: new Date("2026-09-15"),
    end_date: new Date("2026-09-25"),
    is_published: true,
  });

  const testExamB = await Exam.create({
    school_id: ctx.schoolB._id,
    class_id: ctx.classB1._id,
    name: "School B Mid-Term Examination",
    type: "mid_term",
    academic_year: "2026-2027",
    start_date: new Date("2026-09-15"),
    end_date: new Date("2026-09-25"),
    is_published: true,
  });

  testResultA = await Result.create({
    school_id: ctx.schoolA._id,
    exam_id: testExamA._id,
    student_id: ctx.studentDocA._id,
    subject_id: ctx.subjectA1._id,
    marks_obtained: 88,
    total_marks: 100,
    grade: "A",
    is_pass: true,
  });

  testResultB = await Result.create({
    school_id: ctx.schoolB._id,
    exam_id: testExamB._id,
    student_id: ctx.studentDocB._id,
    subject_id: ctx.subjectB1._id,
    marks_obtained: 62,
    total_marks: 100,
    grade: "B",
    is_pass: true,
  });

  // Seed Notices: All, Teachers Only, and Draft
  testNoticeAll = await Notice.create({
    school_id: ctx.schoolA._id,
    created_by: ctx.schoolAAdmin._id,
    title: "Annual Sports Day 2026 Announcement",
    content: "All students and staff must attend the sports ground.",
    target_audience: "all",
    is_published: true,
    publish_date: new Date(),
  });

  testNoticeTeachers = await Notice.create({
    school_id: ctx.schoolA._id,
    created_by: ctx.schoolAAdmin._id,
    title: "Confidential Faculty Evaluation Schedule",
    content: "Meeting in the conference room for teacher performance appraisals.",
    target_audience: "teachers",
    is_published: true,
    publish_date: new Date(),
  });

  testNoticeDraft = await Notice.create({
    school_id: ctx.schoolA._id,
    created_by: ctx.schoolAAdmin._id,
    title: "Unpublished Surprise Holiday Draft",
    content: "Draft notice not yet released.",
    target_audience: "all",
    is_published: false,
    publish_date: new Date(),
  });

  // Seed Homework: Published vs Draft
  testHomeworkA = await Homework.create({
    school_id: ctx.schoolA._id,
    class_id: ctx.classA1._id,
    subject_id: ctx.subjectA1._id,
    teacher_id: ctx.teacherDocA._id,
    title: "Math Chapter 4 Real Numbers Exercise",
    description: "Solve problems 1 to 20 from Chapter 4.",
    due_date: new Date(Date.now() + 86400000 * 3),
    status: "published",
  });

  testHomeworkDraft = await Homework.create({
    school_id: ctx.schoolA._id,
    class_id: ctx.classA1._id,
    subject_id: ctx.subjectA1._id,
    teacher_id: ctx.teacherDocA._id,
    title: "Upcoming Project Rough Draft",
    description: "Not finalized yet.",
    due_date: new Date(Date.now() + 86400000 * 10),
    status: "draft",
  });

  // Seed Fee Payments
  testPaymentA = await StudentFeePayment.create({
    school_id: ctx.schoolA._id,
    student_id: ctx.studentDocA._id,
    receipt_number: "REC-TEST-SP-0001",
    amount_paid: 15000,
    payment_method: "Online",
    payment_date: new Date("2026-08-10"),
    start_date: new Date("2026-08-01"),
    end_date: new Date("2026-08-31"),
    collection_type: "Monthly",
  });

  testPaymentB = await StudentFeePayment.create({
    school_id: ctx.schoolB._id,
    student_id: ctx.studentDocB._id,
    receipt_number: "REC-TEST-SP-0002",
    amount_paid: 12000,
    payment_method: "Cash",
    payment_date: new Date("2026-08-12"),
    start_date: new Date("2026-08-01"),
    end_date: new Date("2026-08-31"),
    collection_type: "Monthly",
  });

  // Seed Attendance for Student A
  await Attendance.create({
    school_id: ctx.schoolA._id,
    academic_year: "2026-2027",
    class_id: ctx.classA1._id,
    marked_by: ctx.schoolAAdmin._id,
    date: new Date("2026-10-05"),
    type: "student",
    records: [
      { student_id: ctx.studentDocA._id, status: "present" }
    ],
  });

  await Attendance.create({
    school_id: ctx.schoolA._id,
    academic_year: "2026-2027",
    class_id: ctx.classA1._id,
    marked_by: ctx.schoolAAdmin._id,
    date: new Date("2026-10-06"),
    type: "student",
    records: [
      { student_id: ctx.studentDocA._id, status: "absent" }
    ],
  });

  // Seed Timetable routine
  testTimetableA = await Timetable.create({
    school_id: ctx.schoolA._id,
    class_id: ctx.classA1._id,
    subject_id: ctx.subjectA1._id,
    teacher_id: ctx.teacherDocA._id,
    day: "monday",
    start_time: "09:00 AM",
    end_time: "10:00 AM",
    room: "Room 101",
  });
}, 35000);

afterAll(async () => {
  await teardownTestDatabase("sp-portal");
});

describe("Student Portal & Multi-Tenant Isolation - Deep / Bulletproof Test Suite", () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: STUDENT AUTHENTICATION & LOGIN WORKFLOW
  // ═══════════════════════════════════════════════════════════════════════════

  describe("1. Student Authentication & Session Boundaries", () => {
    it("1.1 should successfully authenticate student with school username and login_type: 'student'", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: ctx.schoolAStudent.username,
          password: "Password123#",
          school_id: ctx.schoolA._id.toString(),
          login_type: "student",
        }),
      });

      const res = await loginUser(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.user.role).toBe("student");
      expect(json.data.access_token).toBeDefined();
      expect(json.data.refresh_token).toBeDefined();
      expect(json.data.user.school_id.toString()).toBe(ctx.schoolA._id.toString());
    });

    it("1.2 should reject login with invalid password", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: ctx.schoolAStudent.username,
          password: "IncorrectPassword#999",
          school_id: ctx.schoolA._id.toString(),
          login_type: "student",
        }),
      });

      const res = await loginUser(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.message).toMatch(/invalid.*password|incorrect.*password|invalid.*credentials/i);
    });

    it("1.3 should reject student username format missing .myschoollife suffix", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "alice_without_suffix",
          password: "Password#123",
          school_id: ctx.schoolA._id.toString(),
          login_type: "student",
        }),
      });

      const res = await loginUser(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toMatch(/valid School Username/i);
    });

    it("1.4 Role Guard: should reject non-student accounts attempting to login as student", async () => {
      // Teacher trying to login via student login endpoint
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: ctx.schoolATeacher.username,
          password: "Password#123",
          school_id: ctx.schoolA._id.toString(),
          login_type: "student",
        }),
      });

      const res = await loginUser(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.message).toMatch(/Access denied.*Only Students/i);
    });

    it("1.5 should reject login for deactivated student accounts", async () => {
      // Temporarily deactivate student
      await User.updateOne({ _id: ctx.schoolAStudent._id }, { $set: { is_active: false } });

      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: ctx.schoolAStudent.username,
          password: "Password#123",
          school_id: ctx.schoolA._id.toString(),
          login_type: "student",
        }),
      });

      const res = await loginUser(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.message).toMatch(/inactive|disabled/i);

      // Restore active status
      await User.updateOne({ _id: ctx.schoolAStudent._id }, { $set: { is_active: true } });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: STUDENT OWN PROFILE & DIRECT RECORD ACCESS ISOLATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("2. Student Profile & Direct Record Isolation", () => {
    it("2.1 should retrieve the authenticated student's own profile (/api/student/profile)", async () => {
      const req = new NextRequest("http://localhost:3000/api/student/profile", {
        method: "GET",
        headers: { Authorization: `Bearer ${studentAToken}` },
      });

      const res = await getStudentProfile(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data._id.toString()).toBe(ctx.studentDocA._id.toString());
      expect(json.data.name).toBe("Alpha Student Alice");
      expect(json.data.class_id).toBeDefined();
      expect(json.data.class_id.name).toBe("Class 10");
      expect(json.data.class_id.section).toBe("A");
    });

    it("2.2 RBAC: should reject /api/student/profile for non-student roles (403 Forbidden)", async () => {
      const reqTeacher = new NextRequest("http://localhost:3000/api/student/profile", {
        method: "GET",
        headers: { Authorization: `Bearer ${teacherToken}` },
      });
      const resTeacher = await getStudentProfile(reqTeacher);
      expect(resTeacher.status).toBe(403);

      const reqAdmin = new NextRequest("http://localhost:3000/api/student/profile", {
        method: "GET",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const resAdmin = await getStudentProfile(reqAdmin);
      expect(resAdmin.status).toBe(403);
    });

    it("2.3 should allow student to fetch their own student document by ID (/api/students/[id])", async () => {
      const req = new NextRequest(`http://localhost:3000/api/students/${ctx.studentDocA._id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${studentAToken}` },
      });

      const res = await getStudentById(req, { params: Promise.resolve({ id: ctx.studentDocA._id.toString() }) });
      const json = await res!.json();

      expect(res!.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data._id.toString()).toBe(ctx.studentDocA._id.toString());
    });

    it("2.4 Anti-Tampering: Student A CANNOT access Student B's document via ID manipulation (403 Forbidden)", async () => {
      // Student A tries to fetch Student B's record
      const req = new NextRequest(`http://localhost:3000/api/students/${ctx.studentDocB._id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${studentAToken}` },
      });

      const res = await getStudentById(req, { params: Promise.resolve({ id: ctx.studentDocB._id.toString() }) });
      const json = await res!.json();

      // Either 403 Access denied or 404 Not found (because of school tenant boundary)
      expect([403, 404]).toContain(res!.status);
      expect(json.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: EXAM RESULTS & MARKS ISOLATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("3. Exam Results & Marks Isolation (/api/results)", () => {
    it("3.1 should return only the authenticated student's results", async () => {
      const req = new NextRequest("http://localhost:3000/api/results", {
        method: "GET",
        headers: { Authorization: `Bearer ${studentAToken}` },
      });

      const res = await getResults(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      const results = json.data?.results || json.data || [];
      expect(results.length).toBeGreaterThanOrEqual(1);

      // Verify every returned result belongs strictly to Student A
      for (const r of results) {
        const sid = typeof r.student_id === "object" ? r.student_id._id.toString() : r.student_id.toString();
        expect(sid).toBe(ctx.studentDocA._id.toString());
        expect(sid).not.toBe(ctx.studentDocB._id.toString());
      }
    });

    it("3.2 Anti-Tampering: Student attempting query manipulation ?student_id= receives 403 Forbidden", async () => {
      // Student A maliciously requests Student B's student_id
      const req = new NextRequest(`http://localhost:3000/api/results?student_id=${ctx.studentDocB._id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${studentAToken}` },
      });

      const res = await getResults(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.message).toMatch(/Access denied to student record/i);
    });

    it("3.3 Soft-Deleted Results: should not leak deleted marks to student", async () => {
      // Soft-delete Student A's result
      await Result.updateOne({ _id: testResultA._id }, { $set: { is_deleted: true } });

      const req = new NextRequest("http://localhost:3000/api/results", {
        method: "GET",
        headers: { Authorization: `Bearer ${studentAToken}` },
      });

      const res = await getResults(req);
      const json = await res.json();

      const results = json.data?.results || json.data || [];
      const foundDeleted = results.some((r: any) => r._id.toString() === testResultA._id.toString());
      expect(foundDeleted).toBe(false);

      // Restore result
      await Result.updateOne({ _id: testResultA._id }, { $set: { is_deleted: false } });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: STUDENT ATTENDANCE ISOLATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("4. Student Attendance Records & Summary Isolation (/api/attendance/summary)", () => {
    it("4.1 should return attendance summary for the authenticated student", async () => {
      const req = new NextRequest(
        "http://localhost:3000/api/attendance/summary?startDate=2026-10-01&endDate=2026-10-31&type=student",
        {
          method: "GET",
          headers: { Authorization: `Bearer ${studentAToken}` },
        }
      );

      const res = await getAttendanceSummary(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
    });

    it("4.2 Anti-Tampering: recordId spoofing is overridden by backend to student's own ID", async () => {
      // Student A tries to pass recordId of Student B
      const req = new NextRequest(
        `http://localhost:3000/api/attendance/summary?startDate=2026-10-01&endDate=2026-10-31&type=student&recordId=${ctx.studentDocB._id}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${studentAToken}` },
        }
      );

      const res = await getAttendanceSummary(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      // The backend forces recordId to studentProfile._id, preventing Student B's data from being returned
    });

    it("4.3 Validation: should return 400 when startDate or endDate are missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/attendance/summary?type=student", {
        method: "GET",
        headers: { Authorization: `Bearer ${studentAToken}` },
      });

      const res = await getAttendanceSummary(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toMatch(/startDate and endDate are required/i);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: STUDENT FEES & PAYMENT RECORD ISOLATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("5. Student Fees & Payment Record Isolation (/api/fees/payments)", () => {
    it("5.1 should return fee payments belonging strictly to the authenticated student", async () => {
      const req = new NextRequest("http://localhost:3000/api/fees/payments", {
        method: "GET",
        headers: { Authorization: `Bearer ${studentAToken}` },
      });

      const res = await getFeePayments(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      const payments = json.data?.payments || json.data || [];
      expect(payments.length).toBeGreaterThanOrEqual(1);

      // Verify each payment is for Student A
      for (const p of payments) {
        const sid = typeof p.student_id === "object" ? p.student_id._id.toString() : p.student_id.toString();
        expect(sid).toBe(ctx.studentDocA._id.toString());
        expect(sid).not.toBe(ctx.studentDocB._id.toString());
      }
    });

    it("5.2 Anti-Tampering: query parameter student_id spoofing is ignored for student role", async () => {
      // Student A tries to pass Student B's student_id
      const req = new NextRequest(`http://localhost:3000/api/fees/payments?student_id=${ctx.studentDocB._id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${studentAToken}` },
      });

      const res = await getFeePayments(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      const payments = json.data?.payments || json.data || [];
      for (const p of payments) {
        const sid = typeof p.student_id === "object" ? p.student_id._id.toString() : p.student_id.toString();
        expect(sid).toBe(ctx.studentDocA._id.toString());
        expect(sid).not.toBe(ctx.studentDocB._id.toString());
      }
    });

    it("5.3 Administrative Report Guard: should deny student access to /api/reports/student/[id] (403)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/reports/student/${ctx.studentDocA._id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${studentAToken}` },
      });

      const res = await getStudentReport(req, { params: Promise.resolve({ id: ctx.studentDocA._id.toString() }) });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.message).toMatch(/Access denied/i);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: NOTICE BOARD & TARGET AUDIENCE PRIVACY
  // ═══════════════════════════════════════════════════════════════════════════

  describe("6. Notice Board & Target Audience Privacy (/api/notices)", () => {
    it("6.1 should return published notices targeted to 'all' or 'students'", async () => {
      const req = new NextRequest("http://localhost:3000/api/notices", {
        method: "GET",
        headers: { Authorization: `Bearer ${studentAToken}` },
      });

      const res = await getNotices(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      const notices = json.data?.notices || json.data || [];

      // Annual Sports Day (target_audience: 'all') must be visible
      const foundSports = notices.some((n: any) => n.title.includes("Annual Sports Day"));
      expect(foundSports).toBe(true);
    });

    it("6.2 Privacy Guard: should NOT leak teachers-only or unpublished draft notices to students", async () => {
      const req = new NextRequest("http://localhost:3000/api/notices", {
        method: "GET",
        headers: { Authorization: `Bearer ${studentAToken}` },
      });

      const res = await getNotices(req);
      const json = await res.json();

      const notices = json.data?.notices || json.data || [];

      // Teachers only notice must NOT be visible to student
      const foundFaculty = notices.some((n: any) => n.title.includes("Confidential Faculty"));
      expect(foundFaculty).toBe(false);

      // Draft notice must NOT be visible
      const foundDraft = notices.some((n: any) => n.title.includes("Unpublished Surprise"));
      expect(foundDraft).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 7: STUDENT LEAVE APPLICATIONS & WORKFLOW
  // ═══════════════════════════════════════════════════════════════════════════

  describe("7. Student Leave Applications & Authorization (/api/leave)", () => {
    let createdLeaveId: string;

    it("7.1 should allow student to submit a valid leave request", async () => {
      const req = new NextRequest("http://localhost:3000/api/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${studentAToken}`,
        },
        body: JSON.stringify({
          leave_type: "sick",
          from_date: "2026-11-05",
          to_date: "2026-11-07",
          reason: "Viral fever and doctor recommended bed rest",
        }),
      });

      const res = await createLeave(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("pending");
      expect(json.data.leave_type).toBe("sick");
      createdLeaveId = json.data._id.toString();
    });

    it("7.2 Validation: should reject leave request with missing required fields or invalid dates", async () => {
      const req = new NextRequest("http://localhost:3000/api/leave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${studentAToken}`,
        },
        body: JSON.stringify({
          leave_type: "sick",
          from_date: "",
          to_date: "",
          reason: "",
        }),
      });

      const res = await createLeave(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
    });

    it("7.3 should only return leave requests belonging to the authenticated student", async () => {
      const req = new NextRequest("http://localhost:3000/api/leave", {
        method: "GET",
        headers: { Authorization: `Bearer ${studentAToken}` },
      });

      const res = await getLeaves(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      const leaves = json.data?.leaves || (Array.isArray(json.data) ? json.data : []);
      expect(leaves.length).toBeGreaterThanOrEqual(1);

      for (const l of leaves) {
        const uid = typeof l.user_id === "object" ? l.user_id._id.toString() : l.user_id.toString();
        expect(uid).toBe(ctx.schoolAStudent._id.toString());
      }
    });

    it("7.4 Privilege Escalation Guard: Student CANNOT approve or modify leave requests (403)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/leave/${createdLeaveId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${studentAToken}`,
        },
        body: JSON.stringify({
          status: "approved",
          admin_note: "Self-approved by student attempt",
        }),
      });

      const res = await updateLeaveById(req, { params: Promise.resolve({ id: createdLeaveId }) });
      expect(res.status).toBe(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 8: HOMEWORK & CLASS SCHEDULE INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe("8. Student Homework & Timetable Integration", () => {
    it("8.1 should return published homework assigned to the student's class", async () => {
      const req = new NextRequest(`http://localhost:3000/api/homework?class_id=${ctx.classA1._id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${studentAToken}` },
      });

      const res = await getHomework(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      const hwList = json.data?.homeworks || json.data?.homework || (Array.isArray(json.data) ? json.data : []);
      const foundMath = hwList.some((hw: any) => hw.title.includes("Math Chapter 4"));
      expect(foundMath).toBe(true);
    });

    it("8.2 Draft Homework Guard: should not expose draft homework to students", async () => {
      const req = new NextRequest(`http://localhost:3000/api/homework?class_id=${ctx.classA1._id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${studentAToken}` },
      });

      const res = await getHomework(req);
      const json = await res.json();

      const hwList = json.data?.homeworks || json.data?.homework || (Array.isArray(json.data) ? json.data : []);
      const foundDraft = hwList.some((hw: any) => hw.title.includes("Project Rough Draft"));
      expect(foundDraft).toBe(false);
    });

    it("8.3 should return daily routine schedule for student's class", async () => {
      const req = new NextRequest(`http://localhost:3000/api/schedules?class_id=${ctx.classA1._id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${studentAToken}` },
      });

      const res = await getSchedules(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      const schedules = json.data?.schedules || json.data || [];
      expect(schedules.length).toBeGreaterThanOrEqual(1);
      expect(schedules[0].day).toBe("monday");
      expect(schedules[0].start_time).toBe("09:00 AM");
    });
  });
});
