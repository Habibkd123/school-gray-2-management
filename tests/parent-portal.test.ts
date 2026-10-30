import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { setupTestDatabase, teardownTestDatabase, TestDataContext } from "./helpers/dbTestSetup";
import { generateAccessToken } from "@/lib/utils/jwt";

// Route Handlers
import { POST as loginUser } from "@/app/api/auth/login/route";
import {
  GET as getParentProfile,
  PATCH as updateParentProfile,
  invalidateParentProfileCache,
} from "@/app/api/parent/profile/route";
import { GET as getParentChildren } from "@/app/api/parent/children/route";
import { GET as getParentAttendance } from "@/app/api/parent/attendance/route";
import { GET as getFeeAllocations } from "@/app/api/fees/allocations/route";
import { GET as getFeePayments } from "@/app/api/fees/payments/route";
import { GET as getResults } from "@/app/api/results/route";
import { GET as getHomework } from "@/app/api/homework/route";
import { PUT as updateHomework } from "@/app/api/homework/[id]/route";
import { GET as getNotices } from "@/app/api/notices/route";

// Models
import User from "@/lib/models/User";
import Student from "@/lib/models/Student";
import Parent from "@/lib/models/Parent";
import Class from "@/lib/models/Class";
import {
  Attendance,
  FeeAllocation,
  StudentFeePayment,
  FeeMaster,
  FeeGroup,
  FeeType,
  Result,
  Exam,
  Homework,
  Notice,
} from "@/lib/models/index";

let ctx: TestDataContext;

// Parent A (School Alpha) with 2 children: childA1 and childA2
let parentUserA: any;
let parentDocA: any;
let parentTokenA: string;

let childA1: any;
let childA2: any;

// Parent B (School Alpha) with 1 child: childB1 (Different parent in same school)
let parentUserB: any;
let parentDocB: any;
let parentTokenB: string;
let childB1: any;

// Parent C (School Beta) with 1 child (Different school)
let parentUserC: any;
let parentDocC: any;
let parentTokenC: string;
let childC1: any;

// Parent D (School Alpha) with 0 children (Empty state)
let parentUserD: any;
let parentDocD: any;
let parentTokenD: string;

let studentToken: string;
let teacherToken: string;

let classA2: any;
let testExamA: any;
let testResultA1: any;
let testResultA2: any;
let testResultB1: any;

let testFeeGroupA: any;
let testFeeTypeA: any;
let testFeeMasterA: any;
let testPaymentA1: any;

let testHomeworkClassA1: any;
let testHomeworkClassA2: any;
let testHomeworkDraft: any;

let testNoticeAll: any;
let testNoticeParents: any;
let testNoticeTeachers: any;
let testNoticeUnpublished: any;

beforeAll(async () => {
  ctx = await setupTestDatabase("par-portal");
  invalidateParentProfileCache();

  const passwordHash = await bcrypt.hash("Password123#", 10);

  // 1. Create a second class in School A for testing class-specific scoping
  classA2 = await Class.create({
    school_id: ctx.schoolA._id,
    name: "Class 11",
    section: "B",
    academic_year: "2026-2027",
  });

  // 2. Setup Parent A (School Alpha)
  parentUserA = await User.create({
    name: "John Simpson",
    email: "parent.john.simpson@testschool.com",
    username: "parent.john.simpson",
    password_hash: passwordHash,
    role: "parent",
    school_id: ctx.schoolA._id,
    is_active: true,
  });

  parentDocA = await Parent.create({
    school_id: ctx.schoolA._id,
    user_id: parentUserA._id,
    name: "John Simpson",
    phone: "9876541111",
    email: "parent.john.simpson@testschool.com",
    relation: "Father",
    occupation: "Architect",
    address: "742 Evergreen Terrace",
    is_active: true,
  });

  // Link ctx.studentDocA as childA1 of Parent A
  await Student.findByIdAndUpdate(ctx.studentDocA._id, {
    parent_id: parentDocA._id,
    name: "Bart Simpson",
    roll_no: "101",
    admission_no: "ADM-001",
    class_id: ctx.classA1._id,
  });
  childA1 = await Student.findById(ctx.studentDocA._id).lean();

  // Create second child childA2 for Parent A in Class A2
  childA2 = await Student.create({
    school_id: ctx.schoolA._id,
    parent_id: parentDocA._id,
    name: "Lisa Simpson",
    roll_no: "102",
    admission_no: "ADM-002",
    class_id: classA2._id,
    gender: "female",
    is_active: true,
  });

  // 3. Setup Parent B (School Alpha, different family)
  parentUserB = await User.create({
    name: "Ned Flanders",
    email: "parent.ned.flanders@testschool.com",
    username: "parent.ned.flanders",
    password_hash: passwordHash,
    role: "parent",
    school_id: ctx.schoolA._id,
    is_active: true,
  });

  parentDocB = await Parent.create({
    school_id: ctx.schoolA._id,
    user_id: parentUserB._id,
    name: "Ned Flanders",
    phone: "9876542222",
    email: "parent.ned.flanders@testschool.com",
    relation: "Father",
    occupation: "Store Owner",
    address: "744 Evergreen Terrace",
    is_active: true,
  });

  childB1 = await Student.create({
    school_id: ctx.schoolA._id,
    parent_id: parentDocB._id,
    name: "Rod Flanders",
    roll_no: "201",
    admission_no: "ADM-003",
    class_id: ctx.classA1._id,
    gender: "male",
    is_active: true,
  });

  // 4. Setup Parent C (School Beta)
  parentUserC = await User.create({
    name: "Beta Parent",
    email: "parent.beta@testschool.org",
    username: "parent.beta",
    password_hash: passwordHash,
    role: "parent",
    school_id: ctx.schoolB._id,
    is_active: true,
  });

  parentDocC = await Parent.create({
    school_id: ctx.schoolB._id,
    user_id: parentUserC._id,
    name: "Beta Parent",
    phone: "9876543333",
    email: "parent.beta@testschool.org",
    relation: "Mother",
    occupation: "Scientist",
    address: "100 Beta Street",
    is_active: true,
  });

  await Student.findByIdAndUpdate(ctx.studentDocB._id, {
    parent_id: parentDocC._id,
    name: "Beta Student",
  });
  childC1 = await Student.findById(ctx.studentDocB._id).lean();

  // 5. Setup Parent D (School Alpha, with 0 children)
  parentUserD = await User.create({
    name: "Childless Parent",
    email: "parent.childless@testschool.com",
    username: "parent.childless",
    password_hash: passwordHash,
    role: "parent",
    school_id: ctx.schoolA._id,
    is_active: true,
  });

  parentDocD = await Parent.create({
    school_id: ctx.schoolA._id,
    user_id: parentUserD._id,
    name: "Childless Parent",
    phone: "9876544444",
    email: "parent.childless@testschool.com",
    relation: "Guardian",
    occupation: "Writer",
    address: "50 No Child Lane",
    is_active: true,
  });

  // Generate tokens
  parentTokenA = generateAccessToken({
    user_id: parentUserA._id.toString(),
    school_id: ctx.schoolA._id.toString(),
    role: "parent",
  });

  parentTokenB = generateAccessToken({
    user_id: parentUserB._id.toString(),
    school_id: ctx.schoolA._id.toString(),
    role: "parent",
  });

  parentTokenC = generateAccessToken({
    user_id: parentUserC._id.toString(),
    school_id: ctx.schoolB._id.toString(),
    role: "parent",
  });

  parentTokenD = generateAccessToken({
    user_id: parentUserD._id.toString(),
    school_id: ctx.schoolA._id.toString(),
    role: "parent",
  });

  studentToken = generateAccessToken({
    user_id: ctx.schoolAStudent._id.toString(),
    school_id: ctx.schoolA._id.toString(),
    role: "student",
  });

  teacherToken = generateAccessToken({
    user_id: ctx.schoolATeacher._id.toString(),
    school_id: ctx.schoolA._id.toString(),
    role: "teacher",
  });

  // 6. Seed Attendance records for childA1 in Class A1
  const attDate1 = new Date("2026-11-05T00:00:00.000Z");
  const attDate2 = new Date("2026-11-06T00:00:00.000Z");

  await Attendance.create({
    school_id: ctx.schoolA._id,
    academic_year: "2026-2027",
    marked_by: ctx.schoolAAdmin._id,
    class_id: ctx.classA1._id,
    type: "student",
    date: attDate1,
    records: [
      { student_id: childA1._id, status: "present", note: "On time" },
      { student_id: childB1._id, status: "absent", note: "Sick" },
    ],
  });

  await Attendance.create({
    school_id: ctx.schoolA._id,
    academic_year: "2026-2027",
    marked_by: ctx.schoolAAdmin._id,
    class_id: ctx.classA1._id,
    type: "student",
    date: attDate2,
    records: [
      { student_id: childA1._id, status: "present", note: "Active participation" },
      { student_id: childB1._id, status: "present", note: "Present" },
    ],
  });

  // 7. Seed Exam and Results
  testExamA = await Exam.create({
    school_id: ctx.schoolA._id,
    class_id: ctx.classA1._id,
    name: "Term 1 Final Examination 2026",
    type: "mid_term",
    academic_year: "2026-2027",
    start_date: new Date("2026-10-01"),
    end_date: new Date("2026-10-10"),
    is_published: true,
  });

  testResultA1 = await Result.create({
    school_id: ctx.schoolA._id,
    student_id: childA1._id,
    exam_id: testExamA._id,
    subject_id: ctx.subjectA1._id,
    marks_obtained: 88,
    total_marks: 100,
    passing_marks: 33,
    grade: "A",
    is_pass: true,
  });

  testResultA2 = await Result.create({
    school_id: ctx.schoolA._id,
    student_id: childA2._id,
    exam_id: testExamA._id,
    subject_id: ctx.subjectA1._id,
    marks_obtained: 95,
    total_marks: 100,
    passing_marks: 33,
    grade: "A+",
    is_pass: true,
  });

  testResultB1 = await Result.create({
    school_id: ctx.schoolA._id,
    student_id: childB1._id,
    exam_id: testExamA._id,
    subject_id: ctx.subjectA1._id,
    marks_obtained: 72,
    total_marks: 100,
    passing_marks: 33,
    grade: "B",
    is_pass: true,
  });

  // 8. Seed Fees: Group, Type, Master, Allocation, and Payments
  testFeeGroupA = await FeeGroup.create({
    school_id: ctx.schoolA._id,
    name: "Grade 10 Annual Tuition",
    description: "Annual academic tuition fee",
  });

  testFeeTypeA = await FeeType.create({
    school_id: ctx.schoolA._id,
    name: "Term 1 Tuition",
    description: "T1-TUI",
  });

  testFeeMasterA = await FeeMaster.create({
    school_id: ctx.schoolA._id,
    fee_group_id: testFeeGroupA._id,
    fee_type_id: testFeeTypeA._id,
    amount: 15000,
    due_date: new Date("2026-12-15"),
  });

  // Allocate fee group to childA1
  await FeeAllocation.create({
    school_id: ctx.schoolA._id,
    fee_group_id: testFeeGroupA._id,
    student_id: childA1._id,
  });

  // Seed Payment for childA1
  testPaymentA1 = await (StudentFeePayment.create as any)({
    school_id: ctx.schoolA._id,
    student_id: childA1._id,
    fee_master_id: testFeeMasterA._id,
    amount_paid: 10000,
    receipt_number: "REC-PAR-2026-0001",
    payment_method: "Online",
    collection_type: "Monthly",
    start_date: new Date("2026-04-01"),
    end_date: new Date("2027-03-31"),
    payment_date: new Date("2026-10-15"),
  });

  // Seed Payment for childB1
  await (StudentFeePayment.create as any)({
    school_id: ctx.schoolA._id,
    student_id: childB1._id,
    fee_master_id: testFeeMasterA._id,
    amount_paid: 15000,
    receipt_number: "REC-PAR-2026-0002",
    payment_method: "Cash",
    collection_type: "Monthly",
    start_date: new Date("2026-04-01"),
    end_date: new Date("2027-03-31"),
    payment_date: new Date("2026-10-18"),
  });

  // 9. Seed Homework: Class A1, Class A2, and Draft
  testHomeworkClassA1 = await Homework.create({
    school_id: ctx.schoolA._id,
    class_id: ctx.classA1._id,
    subject_id: ctx.subjectA1._id,
    teacher_id: ctx.schoolATeacher._id,
    title: "Algebra Quadratics Problem Set",
    description: "Complete problems 1 through 15",
    due_date: new Date("2026-11-20"),
    status: "published",
    submissions: [
      {
        student_id: childA1._id,
        content: "Submitted quadratics solution PDF",
        submitted_at: new Date("2026-11-10"),
      },
    ],
  });

  testHomeworkClassA2 = await Homework.create({
    school_id: ctx.schoolA._id,
    class_id: classA2._id,
    subject_id: ctx.subjectA1._id,
    teacher_id: ctx.schoolATeacher._id,
    title: "Class 11 Advanced Calculus Notes",
    description: "Read chapter 3 derivatives",
    due_date: new Date("2026-11-22"),
    status: "published",
    submissions: [],
  });

  testHomeworkDraft = await Homework.create({
    school_id: ctx.schoolA._id,
    class_id: ctx.classA1._id,
    subject_id: ctx.subjectA1._id,
    teacher_id: ctx.schoolATeacher._id,
    title: "Unreleased Teacher Draft Quiz",
    description: "Draft quiz not yet published",
    due_date: new Date("2026-11-25"),
    status: "draft",
    submissions: [],
  });

  // 10. Seed Notices: all, parents, teachers, unpublished
  testNoticeAll = await Notice.create({
    school_id: ctx.schoolA._id,
    created_by: ctx.schoolAAdmin._id,
    title: "Annual Sports Day Celebration",
    content: "Sports Day will be held on December 5th.",
    target_audience: "all",
    is_published: true,
    publish_date: new Date("2026-10-01"),
  });

  testNoticeParents = await Notice.create({
    school_id: ctx.schoolA._id,
    created_by: ctx.schoolAAdmin._id,
    title: "Parent-Teacher Meeting Schedule",
    content: "PTM will be conducted this Saturday from 10 AM to 1 PM.",
    target_audience: "parents",
    is_published: true,
    publish_date: new Date("2026-10-05"),
  });

  testNoticeTeachers = await Notice.create({
    school_id: ctx.schoolA._id,
    created_by: ctx.schoolAAdmin._id,
    title: "Staff Internal Grading Meeting",
    content: "Faculty briefing regarding semester marks entry.",
    target_audience: "teachers",
    is_published: true,
    publish_date: new Date("2026-10-06"),
  });

  testNoticeUnpublished = await Notice.create({
    school_id: ctx.schoolA._id,
    created_by: ctx.schoolAAdmin._id,
    title: "Draft Policy Update Announcement",
    content: "Confidential draft announcement.",
    target_audience: "all",
    is_published: false,
    publish_date: new Date("2026-10-08"),
  });
}, 30000);

afterAll(async () => {
  await teardownTestDatabase("par-portal");
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. PARENT AUTHENTICATION, PROFILE & PRIVILEGE ESCALATION GUARDS
// ═══════════════════════════════════════════════════════════════════════════

describe("1. Parent Authentication & Profile Boundaries", () => {
  it("1.1 should allow parent login via email and return parent access token", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "parent.john.simpson@testschool.com",
        password: "Password123#",
        school_id: ctx.schoolA._id.toString(),
      }),
    });

    const res = await loginUser(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.user.role).toBe("parent");
    expect(body.data.access_token).toBeDefined();
  });

  it("1.2 should reject parent login with incorrect password", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "parent.john.simpson@testschool.com",
        password: "WrongPassword#999",
        school_id: ctx.schoolA._id.toString(),
      }),
    });

    const res = await loginUser(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("1.3 GET /api/parent/profile: returns profile of authenticated parent", async () => {
    const req = new NextRequest("http://localhost:3000/api/parent/profile", {
      method: "GET",
      headers: { Authorization: `Bearer ${parentTokenA}` },
    });

    const res = await getParentProfile(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("John Simpson");
    expect(body.data.email).toBe("parent.john.simpson@testschool.com");
    expect(body.data.occupation).toBe("Architect");
  });

  it("1.4 GET /api/parent/profile: rejects unauthenticated requests with 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/parent/profile", {
      method: "GET",
    });

    const res = await getParentProfile(req);
    expect(res.status).toBe(401);
  });

  it("1.5 GET /api/parent/profile: rejects non-parent roles (student) with 403", async () => {
    const req = new NextRequest("http://localhost:3000/api/parent/profile", {
      method: "GET",
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    const res = await getParentProfile(req);
    expect(res.status).toBe(403);
  });

  it("1.6 PATCH /api/parent/profile: updates authorized fields (phone, address)", async () => {
    invalidateParentProfileCache();
    const req = new NextRequest("http://localhost:3000/api/parent/profile", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${parentTokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: "9876599999",
        address: "742 Evergreen Terrace (Renovated)",
      }),
    });

    const res = await updateParentProfile(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.phone).toBe("9876599999");
    expect(body.data.address).toBe("742 Evergreen Terrace (Renovated)");
  });

  it("1.7 PATCH /api/parent/profile: prevents privilege escalation (cannot change role or school_id)", async () => {
    invalidateParentProfileCache();
    const req = new NextRequest("http://localhost:3000/api/parent/profile", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${parentTokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "school_admin",
        school_id: ctx.schoolB._id.toString(),
        name: "John Simpson Updated",
      }),
    });

    const res = await updateParentProfile(req);
    expect(res.status).toBe(200);

    // Verify parent document in DB still has original school_id and user is still role 'parent'
    const parentInDb = await Parent.findById(parentDocA._id).lean();
    expect(parentInDb!.school_id.toString()).toBe(ctx.schoolA._id.toString());

    const userInDb = await User.findById(parentUserA._id).lean();
    expect(userInDb!.role).toBe("parent");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. LINKED CHILDREN VERIFICATION & MULTI-CHILD TENANT ISOLATION
// ═══════════════════════════════════════════════════════════════════════════

describe("2. Linked Children Verification & Multi-Child Isolation", () => {
  it("2.1 GET /api/parent/children: returns all and only children linked to authenticated parent", async () => {
    const req = new NextRequest("http://localhost:3000/api/parent/children", {
      method: "GET",
      headers: { Authorization: `Bearer ${parentTokenA}` },
    });

    const res = await getParentChildren(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(2);

    const childNames = body.data.map((c: any) => c.name);
    expect(childNames).toContain("Bart Simpson");
    expect(childNames).toContain("Lisa Simpson");

    // Must NOT contain Rod Flanders (child of Parent B)
    expect(childNames).not.toContain("Rod Flanders");
  });

  it("2.2 Multi-Tenant Cross-Parent Isolation: Parent B sees only their child (Rod Flanders)", async () => {
    const req = new NextRequest("http://localhost:3000/api/parent/children", {
      method: "GET",
      headers: { Authorization: `Bearer ${parentTokenB}` },
    });

    const res = await getParentChildren(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].name).toBe("Rod Flanders");
  });

  it("2.3 Cross-School Isolation: Parent C (School Beta) never sees School Alpha students", async () => {
    const req = new NextRequest("http://localhost:3000/api/parent/children", {
      method: "GET",
      headers: { Authorization: `Bearer ${parentTokenC}` },
    });

    const res = await getParentChildren(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].name).toBe("Beta Student");
  });

  it("2.4 Empty State: Parent D with 0 linked students returns empty array gracefully", async () => {
    const req = new NextRequest("http://localhost:3000/api/parent/children", {
      method: "GET",
      headers: { Authorization: `Bearer ${parentTokenD}` },
    });

    const res = await getParentChildren(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("2.5 Populates class details (name, section) for linked children", async () => {
    const req = new NextRequest("http://localhost:3000/api/parent/children", {
      method: "GET",
      headers: { Authorization: `Bearer ${parentTokenA}` },
    });

    const res = await getParentChildren(req);
    const body = await res.json();
    const bart = body.data.find((c: any) => c.name === "Bart Simpson");
    expect(bart.class_id).toBeDefined();
    expect(bart.class_id.name).toBe("Class 10");
    expect(bart.class_id.section).toBe("A");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. CHILD ATTENDANCE ACCESS, ANTI-TAMPERING & VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

describe("3. Child Attendance Access & Security Guards", () => {
  it("3.1 GET /api/parent/attendance: returns attendance records for linked child", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/parent/attendance?studentId=${childA1._id.toString()}&month=2026-11`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${parentTokenA}` },
      }
    );

    const res = await getParentAttendance(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(2);
    expect(body.data[0].status).toBe("present");
    expect(body.data[0].note).toBe("On time");
  });

  it("3.2 Anti-Tampering: passing another parent's child ID returns 403 Forbidden", async () => {
    // Parent A tries to fetch attendance of childB1 (Rod Flanders)
    const req = new NextRequest(
      `http://localhost:3000/api/parent/attendance?studentId=${childB1._id.toString()}&month=2026-11`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${parentTokenA}` },
      }
    );

    const res = await getParentAttendance(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/unauthorized|not found/i);
  });

  it("3.3 Anti-Tampering: passing cross-school child ID returns 403 Forbidden", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/parent/attendance?studentId=${childC1._id.toString()}&month=2026-11`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${parentTokenA}` },
      }
    );

    const res = await getParentAttendance(req);
    expect(res.status).toBe(403);
  });

  it("3.4 Input Validation: missing studentId or month returns 400 Bad Request", async () => {
    const reqNoMonth = new NextRequest(
      `http://localhost:3000/api/parent/attendance?studentId=${childA1._id.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${parentTokenA}` },
      }
    );

    const res = await getParentAttendance(reqNoMonth);
    expect(res.status).toBe(400);

    const reqNoStudent = new NextRequest(
      `http://localhost:3000/api/parent/attendance?month=2026-11`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${parentTokenA}` },
      }
    );

    const res2 = await getParentAttendance(reqNoStudent);
    expect(res2.status).toBe(400);
  });

  it("3.5 Input Validation: malformed month format (e.g. 2026-15) returns 400", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/parent/attendance?studentId=${childA1._id.toString()}&month=2026-15`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${parentTokenA}` },
      }
    );

    const res = await getParentAttendance(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/Invalid month format/i);
  });

  it("3.6 Input Validation: malformed non-ObjectId studentId returns 400", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/parent/attendance?studentId=invalid-id-xyz&month=2026-11`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${parentTokenA}` },
      }
    );

    const res = await getParentAttendance(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/Invalid studentId/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. FEE DUES, ALLOCATIONS & PAYMENT HISTORY ACCURACY
// ═══════════════════════════════════════════════════════════════════════════

describe("4. Fee Dues, Allocations & Payment History Accuracy", () => {
  it("4.1 GET /api/fees/allocations: returns allocated fee groups for linked child", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/fees/allocations?student_id=${childA1._id.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${parentTokenA}` },
      }
    );

    const res = await getFeeAllocations(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.allocations.length).toBe(1);
    expect(body.data.allocations[0].fee_group_id.name).toBe("Grade 10 Annual Tuition");
  });

  it("4.2 Anti-Tampering /api/fees/allocations: passing unlinked child ID returns 403", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/fees/allocations?student_id=${childB1._id.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${parentTokenA}` },
      }
    );

    const res = await getFeeAllocations(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toMatch(/Access denied/i);
  });

  it("4.3 GET /api/fees/payments: returns payments for linked child with accurate receipt number", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/fees/payments?student_id=${childA1._id.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${parentTokenA}` },
      }
    );

    const res = await getFeePayments(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.payments.length).toBe(1);
    expect(body.data.payments[0].receipt_number).toBe("REC-PAR-2026-0001");
    expect(body.data.payments[0].amount_paid).toBe(10000);
    expect(body.data.payments[0].payment_method).toBe("Online");
  });

  it("4.4 Anti-Tampering /api/fees/payments: passing unlinked child ID returns 403", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/fees/payments?student_id=${childB1._id.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${parentTokenA}` },
      }
    );

    const res = await getFeePayments(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toMatch(/Access denied/i);
  });

  it("4.5 Scoped Fallback: calling /api/fees/payments without student_id returns only parent's children payments", async () => {
    const req = new NextRequest("http://localhost:3000/api/fees/payments", {
      method: "GET",
      headers: { Authorization: `Bearer ${parentTokenA}` },
    });

    const res = await getFeePayments(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // Should contain childA1's payment, and NOT childB1's payment
    const receiptNumbers = body.data.payments.map((p: any) => p.receipt_number);
    expect(receiptNumbers).toContain("REC-PAR-2026-0001");
    expect(receiptNumbers).not.toContain("REC-PAR-2026-0002");
  });

  it("4.6 Financial Accuracy: fee due calculation matches (Total Fee 15000 - Paid 10000 = 5000 pending)", async () => {
    // 15000 total master fee - 10000 paid = 5000 pending
    const totalFee = testFeeMasterA.amount;
    const paid = testPaymentA1.amount_paid;
    const pending = totalFee - paid;
    expect(pending).toBe(5000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. EXAM RESULTS VERIFICATION & GRADE ISOLATION
// ═══════════════════════════════════════════════════════════════════════════

describe("5. Exam Results Verification & Grade Isolation", () => {
  it("5.1 GET /api/results: returns marks and grades for linked child (Bart Simpson)", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/results?studentId=${childA1._id.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${parentTokenA}` },
      }
    );

    const res = await getResults(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.results.length).toBe(1);

    const result = body.data.results[0];
    expect(result.marks_obtained).toBe(88);
    expect(result.total_marks).toBe(100);
    expect(result.grade).toBe("A");
    expect(result.is_pass).toBe(true);
  });

  it("5.2 Anti-Tampering: passing unlinked child ID returns 403 Forbidden", async () => {
    // Parent A requests results for Rod Flanders (childB1)
    const req = new NextRequest(
      `http://localhost:3000/api/results?studentId=${childB1._id.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${parentTokenA}` },
      }
    );

    const res = await getResults(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toMatch(/Access denied/i);
  });

  it("5.3 Multi-Child Scoping: calling /api/results without studentId returns results of both children of Parent A", async () => {
    const req = new NextRequest("http://localhost:3000/api/results", {
      method: "GET",
      headers: { Authorization: `Bearer ${parentTokenA}` },
    });

    const res = await getResults(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.results.length).toBe(2);

    const marks = body.data.results.map((r: any) => r.marks_obtained);
    expect(marks).toContain(88); // Bart (childA1)
    expect(marks).toContain(95); // Lisa (childA2)
    expect(marks).not.toContain(72); // Rod Flanders (childB1)
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. HOMEWORK ACCESS, CLASS BOUNDARIES & DRAFT ISOLATION
// ═══════════════════════════════════════════════════════════════════════════

describe("6. Homework Access & Class Boundaries", () => {
  it("6.1 GET /api/homework: returns published homework for linked child's class", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/homework?classId=${ctx.classA1._id.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${parentTokenA}` },
      }
    );

    const res = await getHomework(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.homeworks.length).toBe(1);
    expect(body.data.homeworks[0].title).toBe("Algebra Quadratics Problem Set");
  });

  it("6.2 Anti-Tampering: requesting homework for unassigned class returns 403 Forbidden", async () => {
    // Parent B (whose child is only in Class A1) requests homework for Class A2
    const req = new NextRequest(
      `http://localhost:3000/api/homework?classId=${classA2._id.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${parentTokenB}` },
      }
    );

    const res = await getHomework(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toMatch(/Access denied/i);
  });

  it("6.3 Draft Isolation: teacher unreleased draft homework is never returned to parents", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/homework?classId=${ctx.classA1._id.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${parentTokenA}` },
      }
    );

    const res = await getHomework(req);
    const body = await res.json();
    const titles = body.data.homeworks.map((h: any) => h.title);
    expect(titles).toContain("Algebra Quadratics Problem Set");
    expect(titles).not.toContain("Unreleased Teacher Draft Quiz");
  });

  it("6.4 Parent Submission Guard: parent attempting to submit homework directly via API is rejected with 403", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/homework/${testHomeworkClassA1._id.toString()}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${parentTokenA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "submit",
          content: "Parent submitting on behalf of student",
        }),
      }
    );

    const res = await updateHomework(req, {
      params: Promise.resolve({ id: testHomeworkClassA1._id.toString() }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toMatch(/Only students can submit homework/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. NOTICE BOARD AUDIENCE FILTERING
// ═══════════════════════════════════════════════════════════════════════════

describe("7. Notice Board Audience Filtering for Parent Portal", () => {
  it("7.1 GET /api/notices: returns notices for 'all' and 'parents'", async () => {
    const req = new NextRequest("http://localhost:3000/api/notices", {
      method: "GET",
      headers: { Authorization: `Bearer ${parentTokenA}` },
    });

    const res = await getNotices(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const titles = body.data.notices.map((n: any) => n.title);
    expect(titles).toContain("Annual Sports Day Celebration"); // audience: all
    expect(titles).toContain("Parent-Teacher Meeting Schedule"); // audience: parents
  });

  it("7.2 Notice Board Isolation: excludes staff/teacher exclusive notices", async () => {
    const req = new NextRequest("http://localhost:3000/api/notices", {
      method: "GET",
      headers: { Authorization: `Bearer ${parentTokenA}` },
    });

    const res = await getNotices(req);
    const body = await res.json();
    const titles = body.data.notices.map((n: any) => n.title);
    expect(titles).not.toContain("Staff Internal Grading Meeting"); // audience: teachers
  });

  it("7.3 Notice Board Isolation: excludes unpublished draft notices", async () => {
    const req = new NextRequest("http://localhost:3000/api/notices", {
      method: "GET",
      headers: { Authorization: `Bearer ${parentTokenA}` },
    });

    const res = await getNotices(req);
    const body = await res.json();
    const titles = body.data.notices.map((n: any) => n.title);
    expect(titles).not.toContain("Confidential draft announcement.");
  });
});
