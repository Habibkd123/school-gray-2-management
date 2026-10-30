import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { setupTestDatabase, teardownTestDatabase, TestDataContext } from "../helpers/dbTestSetup";
import { generateAccessToken } from "@/lib/utils/jwt";

import { GET as getParentChildrenRoute } from "@/app/api/parent/children/route";
import { GET as getParentAttendanceRoute } from "@/app/api/parent/attendance/route";
import {
  GET as getParentProfileRoute,
  PATCH as updateParentProfileRoute,
  invalidateParentProfileCache,
} from "@/app/api/parent/profile/route";
import { GET as getStudentProfileRoute } from "@/app/api/student/profile/route";
import {
  GET as getParentsRoute,
  POST as createParentRoute,
  invalidateParentsServerCache,
} from "@/app/api/parents/route";
import {
  GET as getParentByIdRoute,
  PUT as updateParentByIdRoute,
  DELETE as deleteParentByIdRoute,
} from "@/app/api/parents/[id]/route";
import { GET as getParentsFiltersRoute } from "@/app/api/parents/filters/route";
import {
  GET as getNoticesRoute,
  POST as createNoticeRoute,
} from "@/app/api/notices/route";
import { GET as getNoticeByIdRoute } from "@/app/api/notices/[id]/route";
import { GET as getFeePaymentsRoute } from "@/app/api/fees/payments/route";

import User from "@/lib/models/User";
import Student from "@/lib/models/Student";
import Parent from "@/lib/models/Parent";
import { Attendance, Notice } from "@/lib/models/index";
import Class from "@/lib/models/Class";

let ctx: TestDataContext;

beforeAll(async () => {
  ctx = await setupTestDatabase("ps-portal");
  invalidateParentsServerCache();
  invalidateParentProfileCache();
}, 30000);

afterAll(async () => {
  await teardownTestDatabase("ps-portal");
});

describe("Deep Parent & Student Portals Test Suite (/api/parent/*, /api/student/*)", () => {
  let parentUserA: any;
  let parentDocA: any;
  let parentTokenA: string;

  let parentUserC: any;
  let parentDocC: any;
  let parentTokenC: string;

  let parentUserB: any;
  let parentDocB: any;
  let parentTokenB: string;

  let studentTokenA: string;
  let studentTokenB: string;
  let schoolAAdminToken: string;
  let teacherTokenA: string;

  let childA2: any;
  let childC1: any;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash("Password123#", 10);

    // 1. Parent A in School A with 2 children (studentDocA and childA2)
    parentUserA = await User.create({
      name: "Parent Alice Senior",
      email: "parent.alice.senior@testschool.com",
      username: "parent.alice.senior",
      password_hash: passwordHash,
      role: "parent",
      school_id: ctx.schoolA._id,
      is_active: true,
    });

    parentDocA = await Parent.create({
      school_id: ctx.schoolA._id,
      user_id: parentUserA._id,
      name: "Parent Alice Senior",
      phone: "9876540001",
      email: "parent.alice.senior@testschool.com",
      relation: "Mother",
      occupation: "Engineer",
      address: "123 School Lane, Alpha City",
      is_active: true,
    });

    // Link studentDocA to parentDocA
    ctx.studentDocA.parent_id = parentDocA._id;
    await ctx.studentDocA.save();

    // Create a second child for Parent A in Class A2
    childA2 = await Student.create({
      school_id: ctx.schoolA._id,
      parent_id: parentDocA._id,
      class_id: ctx.classA2._id,
      name: "Alpha Student Alex",
      roll_no: "103",
      admission_no: "ps-portal-ADM-003",
      academic_year: "2026-2027",
      gender: "male",
      phone: "9876540003",
      is_active: true,
    });

    // 2. Parent C in School A with childC1 (Unlinked to Parent A)
    parentUserC = await User.create({
      name: "Parent Charlie Senior",
      email: "parent.charlie@testschool.com",
      username: "parent.charlie",
      password_hash: passwordHash,
      role: "parent",
      school_id: ctx.schoolA._id,
      is_active: true,
    });

    parentDocC = await Parent.create({
      school_id: ctx.schoolA._id,
      user_id: parentUserC._id,
      name: "Parent Charlie Senior",
      phone: "9876540002",
      email: "parent.charlie@testschool.com",
      relation: "Father",
      is_active: true,
    });

    childC1 = await Student.create({
      school_id: ctx.schoolA._id,
      parent_id: parentDocC._id,
      class_id: ctx.classA1._id,
      name: "Alpha Student Charlie Jr",
      roll_no: "104",
      admission_no: "ps-portal-ADM-004",
      academic_year: "2026-2027",
      gender: "male",
      phone: "9876540004",
      is_active: true,
    });

    // 3. Parent B in School B with studentDocB
    parentUserB = await User.create({
      name: "Parent Bob Beta",
      email: "parent.bob@testschool.org",
      username: "parent.bob.beta",
      password_hash: passwordHash,
      role: "parent",
      school_id: ctx.schoolB._id,
      is_active: true,
    });

    parentDocB = await Parent.create({
      school_id: ctx.schoolB._id,
      user_id: parentUserB._id,
      name: "Parent Bob Beta",
      phone: "9876540005",
      email: "parent.bob@testschool.org",
      relation: "Father",
      is_active: true,
    });

    ctx.studentDocB.parent_id = parentDocB._id;
    await ctx.studentDocB.save();

    // 4. Generate Tokens
    parentTokenA = generateAccessToken({
      user_id: parentUserA._id.toString(),
      school_id: ctx.schoolA._id.toString(),
      role: "parent",
    });

    parentTokenC = generateAccessToken({
      user_id: parentUserC._id.toString(),
      school_id: ctx.schoolA._id.toString(),
      role: "parent",
    });

    parentTokenB = generateAccessToken({
      user_id: parentUserB._id.toString(),
      school_id: ctx.schoolB._id.toString(),
      role: "parent",
    });

    studentTokenA = generateAccessToken({
      user_id: ctx.schoolAStudent._id.toString(),
      school_id: ctx.schoolA._id.toString(),
      role: "student",
    });

    studentTokenB = generateAccessToken({
      user_id: ctx.schoolBStudent._id.toString(),
      school_id: ctx.schoolB._id.toString(),
      role: "student",
    });

    schoolAAdminToken = generateAccessToken({
      user_id: ctx.schoolAAdmin._id.toString(),
      school_id: ctx.schoolA._id.toString(),
      role: "school_admin",
    });

    teacherTokenA = generateAccessToken({
      user_id: ctx.schoolATeacher._id.toString(),
      school_id: ctx.schoolA._id.toString(),
      role: "teacher",
    });
  });

  // ─── 1. Authentication, Session Expiry & Role Guards ────────────────────────
  describe("Authentication, Session Expiry & Role Guards", () => {
    it("should reject unauthenticated request to /api/parent/children with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/parent/children");
      const res = await getParentChildrenRoute(req);
      expect(res.status).toBe(401);
    });

    it("should reject expired JWT token with 401", async () => {
      const expiredToken = jwt.sign(
        {
          user_id: parentUserA._id.toString(),
          school_id: ctx.schoolA._id.toString(),
          role: "parent",
        },
        process.env.JWT_ACCESS_SECRET || "school_access_secret_key_2026",
        { expiresIn: "-5s" }
      );

      const req = new NextRequest("http://localhost:3000/api/parent/children", {
        headers: { authorization: `Bearer ${expiredToken}` },
      });
      const res = await getParentChildrenRoute(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.message).toMatch(/unauthorized|expired|invalid/i);
    });

    it("should reject malformed JWT token with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/student/profile", {
        headers: { authorization: "Bearer invalid.token.payload" },
      });
      const res = await getStudentProfileRoute(req);
      expect(res.status).toBe(401);
    });

    it("should reject unauthorized roles accessing student profile with 403 (Teacher/Admin)", async () => {
      const req = new NextRequest("http://localhost:3000/api/student/profile", {
        headers: { authorization: `Bearer ${teacherTokenA}` },
      });
      const res = await getStudentProfileRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toContain("Students only");
    });

    it("should reject student calling parent endpoints with 403", async () => {
      const req = new NextRequest("http://localhost:3000/api/parent/children", {
        headers: { authorization: `Bearer ${studentTokenA}` },
      });
      const res = await getParentChildrenRoute(req);
      expect(res.status).toBe(403);
    });

    it("should reject deactivated student account from fetching profile with 403", async () => {
      // Temporarily deactivate studentDocA
      ctx.studentDocA.is_active = false;
      await ctx.studentDocA.save();

      const req = new NextRequest("http://localhost:3000/api/student/profile", {
        headers: { authorization: `Bearer ${studentTokenA}` },
      });
      const res = await getStudentProfileRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toContain("deactivated");

      // Restore active status
      ctx.studentDocA.is_active = true;
      await ctx.studentDocA.save();
    });
  });

  // ─── 2. Parent-Child Relationship Verification & Child Ownership ─────────────
  describe("Parent-Child Relationship Verification & Child Ownership (/api/parent/children)", () => {
    it("should return exactly the children linked to the authenticated parent", async () => {
      const req = new NextRequest("http://localhost:3000/api/parent/children", {
        headers: { authorization: `Bearer ${parentTokenA}` },
      });
      const res = await getParentChildrenRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBe(2);

      const childIds = json.data.map((c: any) => c._id.toString());
      expect(childIds).toContain(ctx.studentDocA._id.toString());
      expect(childIds).toContain(childA2._id.toString());
      expect(childIds).not.toContain(childC1._id.toString());
      expect(childIds).not.toContain(ctx.studentDocB._id.toString());
    });

    it("should populate child's class and teacher details", async () => {
      const req = new NextRequest("http://localhost:3000/api/parent/children", {
        headers: { authorization: `Bearer ${parentTokenA}` },
      });
      const res = await getParentChildrenRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      const alice = json.data.find((c: any) => c._id.toString() === ctx.studentDocA._id.toString());
      expect(alice).toBeDefined();
      expect(alice.class_id).toBeDefined();
      expect(alice.class_id.name).toBe("Class 10");
      expect(alice.class_id.section).toBe("A");
    });

    it("should filter children by academic year correctly", async () => {
      const req = new NextRequest("http://localhost:3000/api/parent/children?academic_year=2026-2027", {
        headers: { authorization: `Bearer ${parentTokenA}` },
      });
      const res = await getParentChildrenRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.length).toBe(2);

      const reqEmpty = new NextRequest("http://localhost:3000/api/parent/children?academic_year=2021-2022", {
        headers: { authorization: `Bearer ${parentTokenA}` },
      });
      const resEmpty = await getParentChildrenRoute(reqEmpty);
      expect(resEmpty.status).toBe(200);
      const jsonEmpty = await resEmpty.json();
      expect(jsonEmpty.data.length).toBe(0);
    });

    it("should return 404 if parent user does not have a linked Parent document", async () => {
      // User with parent role but no Parent doc
      const orphanParentUser = await User.create({
        name: "Orphan Parent",
        email: "orphan.parent@testschool.com",
        username: "orphan.parent",
        password_hash: "hash",
        role: "parent",
        school_id: ctx.schoolA._id,
        is_active: true,
      });

      const orphanToken = generateAccessToken({
        user_id: orphanParentUser._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "parent",
      });

      const req = new NextRequest("http://localhost:3000/api/parent/children", {
        headers: { authorization: `Bearer ${orphanToken}` },
      });
      const res = await getParentChildrenRoute(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.message).toContain("Parent profile not found");
    });
  });

  // ─── 3. Cross-User Data Isolation & IDOR Defense (Attendance) ────────────────
  describe("Cross-User Data Isolation & IDOR Defense (/api/parent/attendance)", () => {
    beforeAll(async () => {
      // Seed attendance records for Alice (studentDocA) in March 2026
      await Attendance.create({
        school_id: ctx.schoolA._id,
        academic_year: "2026-2027",
        class_id: ctx.classA1._id,
        date: new Date("2026-03-10T09:00:00.000Z"),
        type: "student",
        marked_by: ctx.schoolAAdmin._id,
        records: [
          { student_id: ctx.studentDocA._id, status: "present", note: "On time" },
          { student_id: childC1._id, status: "absent", note: "Sick leave" },
        ],
      });

      await Attendance.create({
        school_id: ctx.schoolA._id,
        academic_year: "2026-2027",
        class_id: ctx.classA1._id,
        date: new Date("2026-03-11T09:00:00.000Z"),
        type: "student",
        marked_by: ctx.schoolAAdmin._id,
        records: [
          { student_id: ctx.studentDocA._id, status: "late", note: "Traffic" },
          { student_id: childC1._id, status: "present" },
        ],
      });
    });

    it("should reject request with missing studentId or month with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/parent/attendance", {
        headers: { authorization: `Bearer ${parentTokenA}` },
      });
      const res = await getParentAttendanceRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Missing studentId or month");
    });

    it("should reject invalid studentId format with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/parent/attendance?studentId=invalid-id&month=2026-03", {
        headers: { authorization: `Bearer ${parentTokenA}` },
      });
      const res = await getParentAttendanceRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid studentId");
    });

    it("should reject invalid month format with 400", async () => {
      const req = new NextRequest(`http://localhost:3000/api/parent/attendance?studentId=${ctx.studentDocA._id}&month=2026-99`, {
        headers: { authorization: `Bearer ${parentTokenA}` },
      });
      const res = await getParentAttendanceRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid month format");
    });

    it("should allow parent to view attendance of their own child", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/parent/attendance?studentId=${ctx.studentDocA._id}&month=2026-03`,
        { headers: { authorization: `Bearer ${parentTokenA}` } }
      );
      const res = await getParentAttendanceRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBe(2);
      expect(json.data[0].status).toBe("present");
      expect(json.data[1].status).toBe("late");
    });

    it("should BLOCK Parent A from viewing attendance of Child C (Same School IDOR Defense) with 403", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/parent/attendance?studentId=${childC1._id}&month=2026-03`,
        { headers: { authorization: `Bearer ${parentTokenA}` } }
      );
      const res = await getParentAttendanceRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toContain("unauthorized");
    });

    it("should BLOCK Parent A from viewing attendance of School B student (Cross-Tenant Defense) with 403", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/parent/attendance?studentId=${ctx.studentDocB._id}&month=2026-03`,
        { headers: { authorization: `Bearer ${parentTokenA}` } }
      );
      const res = await getParentAttendanceRoute(req);
      expect(res.status).toBe(403);
    });
  });

  // ─── 4. Student Ownership & Profile Security (/api/student/profile) ──────────
  describe("Student Ownership & Profile Security (/api/student/profile)", () => {
    it("should allow student to view their own profile with class and teacher populated", async () => {
      const req = new NextRequest("http://localhost:3000/api/student/profile", {
        headers: { authorization: `Bearer ${studentTokenA}` },
      });
      const res = await getStudentProfileRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data._id.toString()).toBe(ctx.studentDocA._id.toString());
      expect(json.data.admission_no).toBe(ctx.studentDocA.admission_no);
      expect(json.data.class_id.name).toBe("Class 10");
    });

    it("should isolate student data: Student A token returns Student A, Student B token returns Student B", async () => {
      const reqB = new NextRequest("http://localhost:3000/api/student/profile", {
        headers: { authorization: `Bearer ${studentTokenB}` },
      });
      const resB = await getStudentProfileRoute(reqB);
      expect(resB.status).toBe(200);
      const jsonB = await resB.json();
      expect(jsonB.data._id.toString()).toBe(ctx.studentDocB._id.toString());
      expect(jsonB.data.school_id.toString()).toBe(ctx.schoolB._id.toString());
      expect(jsonB.data._id.toString()).not.toBe(ctx.studentDocA._id.toString());
    });
  });

  // ─── 5. Parent Profile & Cache Invalidation (/api/parent/profile) ───────────
  describe("Parent Profile & Cache Invalidation (/api/parent/profile)", () => {
    it("should fetch logged-in parent's profile", async () => {
      invalidateParentProfileCache(parentUserA._id.toString());
      const req = new NextRequest("http://localhost:3000/api/parent/profile", {
        headers: { authorization: `Bearer ${parentTokenA}` },
      });
      const res = await getParentProfileRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Parent Alice Senior");
      expect(json.data.relation).toBe("Mother");
    });

    it("should update parent profile and safely preserve unprovided fields", async () => {
      const req = new NextRequest("http://localhost:3000/api/parent/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${parentTokenA}`,
        },
        body: JSON.stringify({
          phone: "9998887776",
          address: "456 Green Valley, Alpha City",
          occupation: "Principal Architect",
        }),
      });
      const res = await updateParentProfileRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.phone).toBe("9998887776");
      expect(json.data.address).toBe("456 Green Valley, Alpha City");
      expect(json.data.occupation).toBe("Principal Architect");
      expect(json.data.name).toBe("Parent Alice Senior"); // Preserved
      expect(json.data.relation).toBe("Mother");           // Preserved
    });

    it("should return updated profile from subsequent GET (verifying cache invalidation)", async () => {
      const req = new NextRequest("http://localhost:3000/api/parent/profile", {
        headers: { authorization: `Bearer ${parentTokenA}` },
      });
      const res = await getParentProfileRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.phone).toBe("9998887776");
      expect(json.data.occupation).toBe("Principal Architect");
    });
  });

  // ─── 6. Fee Dues & Payment Visibility in Portals ─────────────────────────────
  describe("Fee Dues & Payment Visibility in Portals (/api/fees/payments)", () => {
    it("should allow student to view their own fee payments", async () => {
      const req = new NextRequest("http://localhost:3000/api/fees/payments", {
        headers: { authorization: `Bearer ${studentTokenA}` },
      });
      const res = await getFeePaymentsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.payments)).toBe(true);
    });

    it("should allow parent to view payments for their child", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/fees/payments?student_id=${ctx.studentDocA._id}`,
        { headers: { authorization: `Bearer ${parentTokenA}` } }
      );
      const res = await getFeePaymentsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("should BLOCK Parent A from viewing fee payments of Child C (Same School IDOR) with 403", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/fees/payments?student_id=${childC1._id}`,
        { headers: { authorization: `Bearer ${parentTokenA}` } }
      );
      const res = await getFeePaymentsRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toContain("Access denied");
    });

    it("should BLOCK Parent A from viewing fee payments of School B student with 403", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/fees/payments?student_id=${ctx.studentDocB._id}`,
        { headers: { authorization: `Bearer ${parentTokenA}` } }
      );
      const res = await getFeePaymentsRoute(req);
      expect(res.status).toBe(403);
    });
  });

  // ─── 7. Notices Visibility, Audience Scoping & Draft Isolation ───────────────
  describe("Notices Visibility, Audience Scoping & Draft Isolation (/api/notices)", () => {
    let noticeForAll: any;
    let noticeForStudentsOnly: any;
    let noticeForParentsOnly: any;
    let noticeForTeachersOnly: any;
    let draftNoticeForStudents: any;

    beforeAll(async () => {
      // Create notices with various target audiences and publish states
      noticeForAll = await Notice.create({
        school_id: ctx.schoolA._id,
        created_by: ctx.schoolAAdmin._id,
        title: "Annual Sports Day Notice",
        content: "Sports Day will be held on Friday.",
        target_audience: "all",
        is_published: true,
      });

      noticeForStudentsOnly = await Notice.create({
        school_id: ctx.schoolA._id,
        created_by: ctx.schoolAAdmin._id,
        title: "Science Olympiad Registration",
        content: "Register before next Monday.",
        target_audience: "students",
        is_published: true,
      });

      noticeForParentsOnly = await Notice.create({
        school_id: ctx.schoolA._id,
        created_by: ctx.schoolAAdmin._id,
        title: "PTA Meeting Schedule",
        content: "Parent Teacher Association meeting next Saturday.",
        target_audience: "parents",
        is_published: true,
      });

      noticeForTeachersOnly = await Notice.create({
        school_id: ctx.schoolA._id,
        created_by: ctx.schoolAAdmin._id,
        title: "Teacher Evaluation Guidelines",
        content: "Strictly for teaching faculty.",
        target_audience: "teachers",
        is_published: true,
      });

      draftNoticeForStudents = await Notice.create({
        school_id: ctx.schoolA._id,
        created_by: ctx.schoolAAdmin._id,
        title: "Draft Exam Guidelines (Unpublished)",
        content: "Draft guidelines not yet approved.",
        target_audience: "students",
        is_published: false,
      });
    });

    it("should return notices targeted to 'all' and 'students' for Student role, excluding teacher/parent notices", async () => {
      const req = new NextRequest("http://localhost:3000/api/notices", {
        headers: { authorization: `Bearer ${studentTokenA}` },
      });
      const res = await getNoticesRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      const titles = json.data.notices.map((n: any) => n.title);

      expect(titles).toContain("Annual Sports Day Notice");
      expect(titles).toContain("Science Olympiad Registration");
      expect(titles).not.toContain("PTA Meeting Schedule");               // Parents only
      expect(titles).not.toContain("Teacher Evaluation Guidelines");      // Teachers only
      expect(titles).not.toContain("Draft Exam Guidelines (Unpublished)"); // Draft / Unpublished
    });

    it("should return notices targeted to 'all' and 'parents' for Parent role, excluding teacher/student notices", async () => {
      const req = new NextRequest("http://localhost:3000/api/notices", {
        headers: { authorization: `Bearer ${parentTokenA}` },
      });
      const res = await getNoticesRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      const titles = json.data.notices.map((n: any) => n.title);

      expect(titles).toContain("Annual Sports Day Notice");
      expect(titles).toContain("PTA Meeting Schedule");
      expect(titles).not.toContain("Science Olympiad Registration");      // Students only
      expect(titles).not.toContain("Teacher Evaluation Guidelines");      // Teachers only
      expect(titles).not.toContain("Draft Exam Guidelines (Unpublished)"); // Draft / Unpublished
    });

    it("should allow Student to view a single notice targeted to them via /api/notices/[id]", async () => {
      const req = new NextRequest(`http://localhost:3000/api/notices/${noticeForStudentsOnly._id}`, {
        headers: { authorization: `Bearer ${studentTokenA}` },
      });
      const res = await getNoticeByIdRoute(req, { params: Promise.resolve({ id: noticeForStudentsOnly._id.toString() }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.title).toBe("Science Olympiad Registration");
    });

    it("should BLOCK Student from viewing a notice targeted to teachers or parents via /api/notices/[id] with 403", async () => {
      const req = new NextRequest(`http://localhost:3000/api/notices/${noticeForTeachersOnly._id}`, {
        headers: { authorization: `Bearer ${studentTokenA}` },
      });
      const res = await getNoticeByIdRoute(req, { params: Promise.resolve({ id: noticeForTeachersOnly._id.toString() }) });
      expect(res.status).toBe(403);
    });

    it("should BLOCK Parent from viewing a notice targeted to students or teachers via /api/notices/[id] with 403", async () => {
      const req = new NextRequest(`http://localhost:3000/api/notices/${noticeForStudentsOnly._id}`, {
        headers: { authorization: `Bearer ${parentTokenA}` },
      });
      const res = await getNoticeByIdRoute(req, { params: Promise.resolve({ id: noticeForStudentsOnly._id.toString() }) });
      expect(res.status).toBe(403);
    });

    it("should BLOCK Student or Parent from viewing an unpublished/draft notice with 403", async () => {
      const req = new NextRequest(`http://localhost:3000/api/notices/${draftNoticeForStudents._id}`, {
        headers: { authorization: `Bearer ${studentTokenA}` },
      });
      const res = await getNoticeByIdRoute(req, { params: Promise.resolve({ id: draftNoticeForStudents._id.toString() }) });
      expect(res.status).toBe(403);
    });
  });

  // ─── 8. Parent Directory & Enumeration Defense (/api/parents/*) ──────────────
  describe("Parent Directory & Enumeration Defense (/api/parents/*)", () => {
    it("should allow School Admin to list parents with pagination", async () => {
      const req = new NextRequest("http://localhost:3000/api/parents?limit=10", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getParentsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.parents.length).toBeGreaterThanOrEqual(2);
    });

    it("should BLOCK Student from accessing parent list with 403", async () => {
      const req = new NextRequest("http://localhost:3000/api/parents", {
        headers: { authorization: `Bearer ${studentTokenA}` },
      });
      const res = await getParentsRoute(req);
      expect(res.status).toBe(403);
    });

    it("should allow Parent to view only their own parent record by ID via /api/parents/[id]", async () => {
      const req = new NextRequest(`http://localhost:3000/api/parents/${parentDocA._id}`, {
        headers: { authorization: `Bearer ${parentTokenA}` },
      });
      const res = await getParentByIdRoute(req, { params: Promise.resolve({ id: parentDocA._id.toString() }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data._id.toString()).toBe(parentDocA._id.toString());
      expect(json.data.children.length).toBe(2);
    });

    it("should BLOCK Parent A from viewing Parent C record (Unauthorized Enumeration) with 403", async () => {
      const req = new NextRequest(`http://localhost:3000/api/parents/${parentDocC._id}`, {
        headers: { authorization: `Bearer ${parentTokenA}` },
      });
      const res = await getParentByIdRoute(req, { params: Promise.resolve({ id: parentDocC._id.toString() }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toContain("Unauthorized parent view");
    });

    it("should return 400 when requesting parent with invalid ID format", async () => {
      const req = new NextRequest("http://localhost:3000/api/parents/invalid-id-123", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getParentByIdRoute(req, { params: Promise.resolve({ id: "invalid-id-123" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid parent ID");
    });

    it("should return 400 when attempting PUT or DELETE on parent with invalid ID format", async () => {
      const putReq = new NextRequest("http://localhost:3000/api/parents/invalid-id-123", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${schoolAAdminToken}`,
        },
        body: JSON.stringify({ name: "Invalid Update" }),
      });
      const putRes = await updateParentByIdRoute(putReq, { params: Promise.resolve({ id: "invalid-id-123" }) });
      expect(putRes.status).toBe(400);

      const delReq = new NextRequest("http://localhost:3000/api/parents/invalid-id-123", {
        method: "DELETE",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const delRes = await deleteParentByIdRoute(delReq, { params: Promise.resolve({ id: "invalid-id-123" }) });
      expect(delRes.status).toBe(400);
    });

    it("should return 404 when parent does not exist or belongs to another school (Cross-Tenant)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/parents/${parentDocB._id}`, {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getParentByIdRoute(req, { params: Promise.resolve({ id: parentDocB._id.toString() }) });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.message).toContain("Parent not found");
    });

    it("should fetch filter metadata via /api/parents/filters", async () => {
      const req = new NextRequest("http://localhost:3000/api/parents/filters", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getParentsFiltersRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.academicYears)).toBe(true);
      expect(Array.isArray(json.data.guardianTypes)).toBe(true);
    });
  });
});
