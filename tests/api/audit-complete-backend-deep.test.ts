import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { setupTestDatabase, teardownTestDatabase, TestDataContext } from "../helpers/dbTestSetup";
import { generateAccessToken } from "@/lib/utils/jwt";

// ─── Mocks for external email / CDN / cache services ──────────────────────
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: "mock-mail-id-123" }),
    })),
  },
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/cloudinary", () => ({
  uploadToCloudinary: vi.fn().mockResolvedValue({
    secure_url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
  }),
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

// ─── Route Handlers Under Audit ───────────────────────────────────────────
// 1. Leave & Leave Types
import { GET as getLeaves, POST as createLeave } from "@/app/api/leave/route";
import { GET as getLeaveById, PUT as updateLeaveById, DELETE as deleteLeaveById } from "@/app/api/leave/[id]/route";
import { GET as getLeaveTypes, POST as createLeaveType } from "@/app/api/leave-types/route";
import { GET as getLeaveTypeById, PUT as updateLeaveTypeById, DELETE as deleteLeaveTypeById } from "@/app/api/leave-types/[id]/route";

// 2. School & Academic Configurations
import { GET as getAcademicConfig, PUT as updateAcademicConfig } from "@/app/api/academic/config/route";
import { GET as getLoginConfig, PUT as updateLoginConfig } from "@/app/api/school/login-config/route";
import { GET as getMetaConfig, PUT as updateMetaConfig } from "@/app/api/school/meta-config/route";
import { GET as getReceiptConfig, PUT as updateReceiptConfig } from "@/app/api/school/receipt-config/route";
import { GET as getPermissions, POST as savePermissions } from "@/app/api/settings/permissions/route";

// 3. Dashboard & Super Analytics
import { GET as getDashboardStats } from "@/app/api/dashboard/stats/route";
import { GET as getSuperAnalytics } from "@/app/api/dashboard/super-analytics/route";

// 4. Document Engine
import { POST as generateDocument } from "@/app/api/documents/generate/route";
import { GET as getGeneratedDocs } from "@/app/api/documents/generated/route";
import { GET as getGeneratedDocById, PATCH as patchGeneratedDocById, DELETE as deleteGeneratedDocById } from "@/app/api/documents/generated/[id]/route";

// 5. Fees & Assessments Extensions
import { GET as getClassDefaults, POST as saveClassDefaults } from "@/app/api/fees/class-defaults/route";
import { PUT as updateFeeById, DELETE as deleteFeeById } from "@/app/api/fees/[id]/route";
import { GET as exportAssessmentResults } from "@/app/api/assessments/[id]/export/route";

// 6. Schedules Extensions
import { PUT as updateScheduleById, DELETE as deleteScheduleById } from "@/app/api/schedules/[id]/route";
import { POST as createSchedule } from "@/app/api/schedules/route";

// 7. Admissions Extensions
import { GET as getAdmissionsReports } from "@/app/api/admissions/reports/route";
import { GET as getAdmissionsStats } from "@/app/api/admissions/stats/route";
import { POST as addAdmissionNote } from "@/app/api/admissions/[id]/notes/route";
import { PATCH as patchAdmissionById } from "@/app/api/admissions/[id]/route";

// 8. Students & Teachers Extensions
import { GET as getStudentFilters } from "@/app/api/students/filters/route";
import { GET as getStudentImportTemplate } from "@/app/api/students/import/template/route";
import { GET as getTeacherProfile, PATCH as patchTeacherProfile } from "@/app/api/teacher/profile/route";
import { GET as getSyllabusByClass } from "@/app/api/syllabus-by-class/route";

// 9. Subject Master & Subject Assignment
import { GET as getSubjectAssignments, POST as createSubjectAssignment } from "@/app/api/subject-assignment/route";
import { PUT as updateSubjectAssignmentById, DELETE as deleteSubjectAssignmentById } from "@/app/api/subject-assignment/[id]/route";
import { GET as getSubjectMasters, POST as createSubjectMaster } from "@/app/api/subject-master/route";
import { GET as getSubjectMasterById, PUT as updateSubjectMasterById, DELETE as deleteSubjectMasterById } from "@/app/api/subject-master/[id]/route";

// 10. Public Endpoints & Setup
import { POST as postPublicAdmission } from "@/app/api/public/admissions/route";
import { GET as getPublicClasses } from "@/app/api/public/classes/route";
import { POST as postDemoRequest } from "@/app/api/public/demo-request/route";
import { GET as getPublicLanding } from "@/app/api/public/landing/route";
import { GET as getPublicSchoolInfo } from "@/app/api/public/school-info/route";
import { GET as getPublicTheme } from "@/app/api/public/theme/route";
import { POST as postPublicUpload } from "@/app/api/public/upload/route";
import { POST as postContact } from "@/app/api/contact/route";
import { GET as getLanding, PUT as putLanding, PATCH as patchLanding } from "@/app/api/landing/route";
import { GET as getSchoolLandingById, PUT as putSchoolLandingById, PATCH as patchSchoolLandingById } from "@/app/api/schools/[id]/landing/route";
import { GET as getSetupStatus, POST as postSetup } from "@/app/api/setup/route";

// Models
import {
  Admission,
  ClassFee,
  FeesStructure,
  ClassTest,
  ClassTestMark,
  Syllabus,
  SubjectMaster,
  LeaveRequest,
  LeaveType,
} from "@/lib/models/index";
import GeneratedDocument from "@/lib/models/GeneratedDocument";
import School from "@/lib/models/School";

let ctx: TestDataContext;
let schoolAAdminToken: string;
let schoolBAdminToken: string;
let superAdminToken: string;
let teacherTokenA: string;
let studentTokenA: string;

beforeAll(async () => {
  process.env.SETUP_SECRET_KEY = "test-secret-setup-key-xyz";
  ctx = await setupTestDatabase("audit-deep");

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

  superAdminToken = generateAccessToken({
    user_id: ctx.superAdmin._id.toString(),
    school_id: null,
    role: "super_admin",
  });

  teacherTokenA = generateAccessToken({
    user_id: ctx.schoolATeacher._id.toString(),
    school_id: ctx.schoolA._id.toString(),
    role: "teacher",
  });

  studentTokenA = generateAccessToken({
    user_id: ctx.schoolAStudent._id.toString(),
    school_id: ctx.schoolA._id.toString(),
    role: "student",
  });
}, 30000);

afterAll(async () => {
  await teardownTestDatabase("audit-deep");
}, 20000);

describe("Complete Backend API Audit & Verification Test Suite", () => {
  // ─── MODULE 1: Leave Management & Leave Types ─────────────────────────────
  describe("Module: Leave Management & Leave Types (/api/leave*, /api/leave-types*)", () => {
    let leaveTypeId: string;
    let leaveRequestId: string;

    it("should reject unauthenticated requests to leave routes with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/leave-types");
      const res = await getLeaveTypes(req);
      expect(res.status).toBe(401);
    });

    it("should create a leave type for School A", async () => {
      const req = new NextRequest("http://localhost:3000/api/leave-types", {
        method: "POST",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ leave_type: "Medical Leave", status: "Active" }),
      });
      const res = await createLeaveType(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.leave_type).toBe("Medical Leave");
      leaveTypeId = json.data._id;
    });

    it("should reject duplicate leave type name with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/leave-types", {
        method: "POST",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ leave_type: "Medical Leave", status: "Active" }),
      });
      const res = await createLeaveType(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("should get list of leave types", async () => {
      const req = new NextRequest("http://localhost:3000/api/leave-types", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getLeaveTypes(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.some((lt: any) => lt.leave_type === "Medical Leave")).toBe(true);
    });

    it("should get single leave type by ID", async () => {
      const req = new NextRequest(`http://localhost:3000/api/leave-types/${leaveTypeId}`, {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getLeaveTypeById(req, { params: Promise.resolve({ id: leaveTypeId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data._id).toBe(leaveTypeId);
    });

    it("should reject invalid ObjectId in leave type route with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/leave-types/invalid-id", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getLeaveTypeById(req, { params: Promise.resolve({ id: "invalid-id" }) });
      expect(res.status).toBe(400);
    });

    it("should update a leave type", async () => {
      const req = new NextRequest(`http://localhost:3000/api/leave-types/${leaveTypeId}`, {
        method: "PUT",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ status: "Inactive" }),
      });
      const res = await updateLeaveTypeById(req, { params: Promise.resolve({ id: leaveTypeId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("Inactive");
    });

    it("should create a leave request with calculated total_days", async () => {
      const req = new NextRequest("http://localhost:3000/api/leave", {
        method: "POST",
        headers: { authorization: `Bearer ${studentTokenA}`, "content-type": "application/json" },
        body: JSON.stringify({
          leave_type: "sick",
          from_date: "2026-11-01",
          to_date: "2026-11-03",
          reason: "Fever and rest recommended by doctor",
        }),
      });
      const res = await createLeave(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.total_days).toBe(3);
      expect(json.data.status).toBe("pending");
      leaveRequestId = json.data._id;
    });

    it("should reject leave request creation if required fields are missing with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/leave", {
        method: "POST",
        headers: { authorization: `Bearer ${studentTokenA}`, "content-type": "application/json" },
        body: JSON.stringify({ reason: "No dates provided" }),
      });
      const res = await createLeave(req);
      expect(res.status).toBe(400);
    });

    it("should list leaves with filters and pagination", async () => {
      const req = new NextRequest("http://localhost:3000/api/leave?page=1&limit=10&status=pending", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getLeaves(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.leaves.length).toBeGreaterThan(0);
    });

    it("should get single leave request by ID", async () => {
      const req = new NextRequest(`http://localhost:3000/api/leave/${leaveRequestId}`, {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getLeaveById(req, { params: Promise.resolve({ id: leaveRequestId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data._id).toBe(leaveRequestId);
    });

    it("should update leave request status to approved", async () => {
      const req = new NextRequest(`http://localhost:3000/api/leave/${leaveRequestId}`, {
        method: "PUT",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ status: "approved", admin_note: "Approved by Principal" }),
      });
      const res = await updateLeaveById(req, { params: Promise.resolve({ id: leaveRequestId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("approved");
      expect(json.data.admin_note).toBe("Approved by Principal");
    });

    it("should delete leave request and leave type", async () => {
      const delLeaveReq = new NextRequest(`http://localhost:3000/api/leave/${leaveRequestId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const resLeave = await deleteLeaveById(delLeaveReq, { params: Promise.resolve({ id: leaveRequestId }) });
      expect(resLeave.status).toBe(200);

      const delTypeReq = new NextRequest(`http://localhost:3000/api/leave-types/${leaveTypeId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const resType = await deleteLeaveTypeById(delTypeReq, { params: Promise.resolve({ id: leaveTypeId }) });
      expect(resType.status).toBe(200);
    });
  });

  // ─── MODULE 2: School & Academic Configurations ───────────────────────────
  describe("Module: School Configurations (/api/academic/config, /api/school/*, /api/settings/permissions)", () => {
    it("should get academic config for School A", async () => {
      const req = new NextRequest("http://localhost:3000/api/academic/config", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getAcademicConfig(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(typeof json.data.enable_sections).toBe("boolean");
    });

    it("should update academic config for School A", async () => {
      const req = new NextRequest("http://localhost:3000/api/academic/config", {
        method: "PUT",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ enable_streams: true, enable_sections: true }),
      });
      const res = await updateAcademicConfig(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.enable_streams).toBe(true);
    });

    it("should reject academic config update if no valid fields provided with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/academic/config", {
        method: "PUT",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ invalid_field: "value" }),
      });
      const res = await updateAcademicConfig(req);
      expect(res.status).toBe(400);
    });

    it("should get and update login config", async () => {
      const getReq = new NextRequest("http://localhost:3000/api/school/login-config", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const getRes = await getLoginConfig(getReq);
      expect(getRes.status).toBe(200);

      const putReq = new NextRequest("http://localhost:3000/api/school/login-config", {
        method: "PUT",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ disable_student_login: false, disable_teacher_login: false }),
      });
      const putRes = await updateLoginConfig(putReq);
      expect(putRes.status).toBe(200);
      const putJson = await putRes.json();
      expect(putJson.success).toBe(true);
      expect(putJson.data.disable_student_login).toBe(false);
    });

    it("should get and update meta config (SEO)", async () => {
      const getReq = new NextRequest("http://localhost:3000/api/school/meta-config", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const getRes = await getMetaConfig(getReq);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.success).toBe(true);
      expect(getJson.data.school_id).toBe(ctx.schoolA._id.toString());

      const putReq = new NextRequest("http://localhost:3000/api/school/meta-config", {
        method: "PUT",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({
          meta_title: "Alpha International Best School",
          meta_description: "Premier academic institution.",
          meta_keywords: "school, alpha, education",
        }),
      });
      const putRes = await updateMetaConfig(putReq);
      expect(putRes.status).toBe(200);
      const putJson = await putRes.json();
      expect(putJson.success).toBe(true);
      expect(putJson.data.meta_title).toBe("Alpha International Best School");
    });

    it("should get and update receipt builder config", async () => {
      const getReq = new NextRequest("http://localhost:3000/api/school/receipt-config", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const getRes = await getReceiptConfig(getReq);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.success).toBe(true);
      expect(getJson.data.config).toBeDefined();

      const putReq = new NextRequest("http://localhost:3000/api/school/receipt-config", {
        method: "PUT",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({
          showLogo: true,
          themeColor: "#2563eb",
          headerTitle: "Alpha Fee Receipt",
        }),
      });
      const putRes = await updateReceiptConfig(putReq);
      expect(putRes.status).toBe(200);
      const putJson = await putRes.json();
      expect(putJson.success).toBe(true);
      expect(putJson.data.headerTitle).toBe("Alpha Fee Receipt");
    });

    it("should get and save role permissions", async () => {
      const getReq = new NextRequest("http://localhost:3000/api/settings/permissions", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const getRes = await getPermissions(getReq);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.success).toBe(true);

      const postReq = new NextRequest("http://localhost:3000/api/settings/permissions", {
        method: "POST",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({
          role: "teacher",
          permissions: { can_mark_attendance: true, can_view_fees: false },
        }),
      });
      const postRes = await savePermissions(postReq);
      expect(postRes.status).toBe(200);
      const postJson = await postRes.json();
      expect(postJson.success).toBe(true);
    });
  });

  // ─── MODULE 3: Dashboard Stats & Super Analytics ──────────────────────────
  describe("Module: Dashboard & Super Analytics (/api/dashboard/*)", () => {
    it("should return comprehensive dashboard stats for School A", async () => {
      const req = new NextRequest("http://localhost:3000/api/dashboard/stats", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getDashboardStats(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.students).toBeDefined();
      expect(json.data.teachers).toBeDefined();
      expect(json.data.classes).toBeDefined();
      expect(json.data.attendance).toBeDefined();
    });

    it("should return super analytics for super_admin", async () => {
      const req = new NextRequest("http://localhost:3000/api/dashboard/super-analytics", {
        headers: { authorization: `Bearer ${superAdminToken}` },
      });
      const res = await getSuperAnalytics(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.summary.totalSchools).toBeGreaterThan(0);
      expect(json.data.enrollmentTrends).toBeDefined();
      expect(json.data.feeAnalytics).toBeDefined();
    });

    it("should reject non-super_admin from accessing super analytics with 403", async () => {
      const req = new NextRequest("http://localhost:3000/api/dashboard/super-analytics", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getSuperAnalytics(req);
      expect(res.status).toBe(403);
    });
  });

  // ─── MODULE 4: Document Generation Engine ─────────────────────────────────
  describe("Module: Document Engine (/api/documents/*)", () => {
    let generatedDocId: string;

    it("should reject document generation when templateId is missing with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/documents/generate", {
        method: "POST",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ referenceModule: "student" }),
      });
      const res = await generateDocument(req);
      expect(res.status).toBe(400);
    });

    it("should generate a document for student and return resolved variables", async () => {
      const req = new NextRequest("http://localhost:3000/api/documents/generate", {
        method: "POST",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({
          templateId: "bonafide_template_01",
          documentType: "bonafide",
          referenceModule: "student",
          referenceId: ctx.studentDocA._id.toString(),
        }),
      });
      const res = await generateDocument(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data[0].variables).toBeDefined();
      expect(json.data[0].variables["student_name"]).toBe(ctx.studentDocA.name);
      generatedDocId = json.data[0].id;
    });

    it("should list generated documents with pagination", async () => {
      const req = new NextRequest("http://localhost:3000/api/documents/generated?page=1&limit=10", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getGeneratedDocs(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.docs)).toBe(true);
    });

    it("should get single generated document by ID", async () => {
      if (!generatedDocId) return;
      const req = new NextRequest(`http://localhost:3000/api/documents/generated/${generatedDocId}`, {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getGeneratedDocById(req, { params: Promise.resolve({ id: generatedDocId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data._id).toBe(generatedDocId);
    });

    it("should reject invalid document ID with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/documents/generated/bad-id", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getGeneratedDocById(req, { params: Promise.resolve({ id: "bad-id" }) });
      expect(res.status).toBe(400);
    });

    it("should patch generated document status fields (is_printed, is_downloaded)", async () => {
      if (!generatedDocId) return;
      const req = new NextRequest(`http://localhost:3000/api/documents/generated/${generatedDocId}`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ is_printed: true, is_downloaded: true }),
      });
      const res = await patchGeneratedDocById(req, { params: Promise.resolve({ id: generatedDocId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.is_printed).toBe(true);
    });

    it("should delete generated document", async () => {
      if (!generatedDocId) return;
      const req = new NextRequest(`http://localhost:3000/api/documents/generated/${generatedDocId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await deleteGeneratedDocById(req, { params: Promise.resolve({ id: generatedDocId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  // ─── MODULE 5: Fees & Assessments Extensions ──────────────────────────────
  describe("Module: Fees Defaults & Assessment Export (/api/fees/*, /api/assessments/*)", () => {
    let feeStructureId: string;
    let testAssessmentId: string;

    it("should get default class fees structure", async () => {
      const req = new NextRequest("http://localhost:3000/api/fees/class-defaults", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getClassDefaults(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.classes)).toBe(true);
    });

    it("should save default class fee for Class A1", async () => {
      const req = new NextRequest("http://localhost:3000/api/fees/class-defaults", {
        method: "POST",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({
          class_id: ctx.classA1._id.toString(),
          academic_year: "2026-2027",
          default_amount: 3500,
        }),
      });
      const res = await saveClassDefaults(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.total_amount).toBe(3500);
    });

    it("should copy fee structure to other class", async () => {
      const req = new NextRequest("http://localhost:3000/api/fees/class-defaults", {
        method: "POST",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({
          copy_from_class_id: ctx.classA1._id.toString(),
          class_ids: [ctx.classA2._id.toString()],
          academic_year: "2026-2027",
        }),
      });
      const res = await saveClassDefaults(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("should update and delete single fee structure via /api/fees/[id]", async () => {
      const created = await FeesStructure.create({
        school_id: ctx.schoolA._id,
        class_id: ctx.classA1._id,
        academic_year: "2026-2027",
        name: "Term 1 Fees",
        amount: 2000,
        due_day: 10,
      });
      feeStructureId = created._id.toString();

      const putReq = new NextRequest(`http://localhost:3000/api/fees/${feeStructureId}`, {
        method: "PUT",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ amount: 2500 }),
      });
      const putRes = await updateFeeById(putReq, { params: Promise.resolve({ id: feeStructureId }) });
      expect(putRes.status).toBe(200);
      const putJson = await putRes.json();
      expect(putJson.data.amount).toBe(2500);

      const delReq = new NextRequest(`http://localhost:3000/api/fees/${feeStructureId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const delRes = await deleteFeeById(delReq, { params: Promise.resolve({ id: feeStructureId }) });
      expect(delRes.status).toBe(200);
    });

    it("should export assessment results as xlsx spreadsheet", async () => {
      const testDoc = await ClassTest.create({
        school_id: ctx.schoolA._id,
        class_id: ctx.classA1._id,
        subject_id: ctx.subjectA1._id,
        teacher_id: ctx.teacherDocA._id,
        title: "Mid-Term Assessment Math",
        test_date: new Date(),
        start_time: "09:00 AM",
        end_time: "10:00 AM",
        academic_year: "2026-2027",
        total_marks: 50,
        passing_marks: 18,
      });
      testAssessmentId = testDoc._id.toString();

      await ClassTestMark.create({
        school_id: ctx.schoolA._id,
        test_id: testDoc._id,
        student_id: ctx.studentDocA._id,
        entered_by: ctx.teacherDocA._id,
        marks_obtained: 42,
        is_pass: true,
        rank: 1,
      });

      const req = new NextRequest(`http://localhost:3000/api/assessments/${testAssessmentId}/export`, {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await exportAssessmentResults(req, { params: Promise.resolve({ id: testAssessmentId }) });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("spreadsheetml");
      const buffer = await res.arrayBuffer();
      expect(buffer.byteLength).toBeGreaterThan(100);

      await ClassTest.deleteOne({ _id: testDoc._id });
      await ClassTestMark.deleteMany({ test_id: testDoc._id });
    });
  });

  // ─── MODULE 6: Schedules Extensions ───────────────────────────────────────
  describe("Module: Schedules Extensions (/api/schedules/[id])", () => {
    let scheduleId: string;

    it("should update a schedule item and enforce valid start/end times", async () => {
      const postReq = new NextRequest("http://localhost:3000/api/schedules", {
        method: "POST",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({
          classId: ctx.classA1._id.toString(),
          subject: "Mathematics",
          day: "Monday",
          startTime: "09:00 AM",
          endTime: "09:45 AM",
          room: "101",
        }),
      });
      const postRes = await createSchedule(postReq);
      expect(postRes.status).toBe(201);
      const postJson = await postRes.json();
      scheduleId = postJson.data._id;

      // Reject update if start >= end
      const badReq = new NextRequest(`http://localhost:3000/api/schedules/${scheduleId}`, {
        method: "PUT",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ startTime: "10:00 AM", endTime: "09:00 AM" }),
      });
      const badRes = await updateScheduleById(badReq, { params: Promise.resolve({ id: scheduleId }) });
      expect(badRes.status).toBe(400);

      // Valid update
      const validReq = new NextRequest(`http://localhost:3000/api/schedules/${scheduleId}`, {
        method: "PUT",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ room: "102" }),
      });
      const validRes = await updateScheduleById(validReq, { params: Promise.resolve({ id: scheduleId }) });
      expect(validRes.status).toBe(200);
      const validJson = await validRes.json();
      expect(validJson.data.room).toBe("102");
    }, 15000);

    it("should delete schedule item", async () => {
      const delReq = new NextRequest(`http://localhost:3000/api/schedules/${scheduleId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const delRes = await deleteScheduleById(delReq, { params: Promise.resolve({ id: scheduleId }) });
      expect(delRes.status).toBe(200);
      const delJson = await delRes.json();
      expect(delJson.success).toBe(true);
    });
  });

  // ─── MODULE 7: Admissions Extensions ──────────────────────────────────────
  describe("Module: Admissions Extensions (/api/admissions/reports, stats, notes, patch)", () => {
    let testAdmissionId: string;

    beforeAll(async () => {
      const admission = await Admission.create({
        school_id: ctx.schoolA._id,
        application_no: "ADM-TEST-9999",
        student_name: "Test Applicant",
        gender: "male",
        dob: new Date("2012-05-10"),
        phone: "9876543299",
        academic_year: "2026-2027",
        class_id: ctx.classA1._id,
        status: "New",
      });
      testAdmissionId = admission._id.toString();
    });

    afterAll(async () => {
      await Admission.deleteOne({ _id: testAdmissionId });
    });

    it("should get admissions reports with class breakdown", async () => {
      const req = new NextRequest("http://localhost:3000/api/admissions/reports", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getAdmissionsReports(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.totalApps).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(json.data.classReports)).toBe(true);
    });

    it("should get admissions stats", async () => {
      const req = new NextRequest("http://localhost:3000/api/admissions/stats", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getAdmissionsStats(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.stats.total).toBeGreaterThanOrEqual(1);
    });

    it("should add admin note to admission application", async () => {
      const req = new NextRequest(`http://localhost:3000/api/admissions/${testAdmissionId}/notes`, {
        method: "POST",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ note: "Parent attended interaction round." }),
      });
      const res = await addAdmissionNote(req, { params: Promise.resolve({ id: testAdmissionId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.internal_notes.length).toBeGreaterThan(0);
    });

    it("should restore soft-deleted application via PATCH ?action=restore", async () => {
      await Admission.updateOne({ _id: testAdmissionId }, { is_deleted: true, status: "Cancelled" });
      const req = new NextRequest(`http://localhost:3000/api/admissions/${testAdmissionId}?action=restore`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await patchAdmissionById(req, { params: Promise.resolve({ id: testAdmissionId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.is_deleted).toBe(false);
      expect(json.data.status).toBe("Pending");
    });
  });

  // ─── MODULE 8: Students, Teachers & Academics Extensions ──────────────────
  describe("Module: Students & Teachers Extensions (/api/students/*, /api/teacher/*, /api/syllabus-by-class)", () => {
    it("should get student filters", async () => {
      const req = new NextRequest("http://localhost:3000/api/students/filters", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getStudentFilters(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.classes.length).toBeGreaterThan(0);
      expect(json.data.genders).toContain("Male");
    });

    it("should generate student import template xlsx", async () => {
      const req = new NextRequest("http://localhost:3000/api/students/import/template", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getStudentImportTemplate(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("spreadsheetml");
    });

    it("should get and patch logged-in teacher profile", async () => {
      const getReq = new NextRequest("http://localhost:3000/api/teacher/profile", {
        headers: { authorization: `Bearer ${teacherTokenA}` },
      });
      const getRes = await getTeacherProfile(getReq);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.success).toBe(true);
      expect(getJson.data.name).toBe(ctx.teacherDocA.name);

      const patchReq = new NextRequest("http://localhost:3000/api/teacher/profile", {
        method: "PATCH",
        headers: { authorization: `Bearer ${teacherTokenA}`, "content-type": "application/json" },
        body: JSON.stringify({ phone: "9988776655", address: "Teacher Staff Quarters 4B" }),
      });
      const patchRes = await patchTeacherProfile(patchReq);
      expect(patchRes.status).toBe(200);
      const patchJson = await patchRes.json();
      expect(patchJson.success).toBe(true);
      expect(patchJson.data.phone).toBe("9988776655");
    });

    it("should get syllabus by class cascading endpoint", async () => {
      await Syllabus.create({
        school_id: ctx.schoolA._id,
        class_id: ctx.classA1._id,
        subject_master_id: ctx.subjectA1._id,
        title: "Mathematics Syllabus",
        academic_year: "2026-2027",
        nodes: [{ id: "n1", type: "chapter", title: "Algebra Chapter 1", description: "Equations" }],
      });

      const req = new NextRequest(
        `http://localhost:3000/api/syllabus-by-class?class_id=${ctx.classA1._id.toString()}&subject_name=${encodeURIComponent(ctx.subjectA1.name)}`,
        { headers: { authorization: `Bearer ${schoolAAdminToken}` } }
      );
      const res = await getSyllabusByClass(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.chapters.length).toBeGreaterThan(0);
      expect(json.data.chapters[0].chapter_name).toBe("Algebra Chapter 1");
    });
  });

  // ─── MODULE 9: Subject Master & Subject Assignment ────────────────────────
  describe("Module: Subject Master & Assignment (/api/subject-master*, /api/subject-assignment*)", () => {
    let createdSubMasterId: string;
    let createdSubAssignId: string;

    it("should create subject master and auto-tag stream", async () => {
      const req = new NextRequest("http://localhost:3000/api/subject-master", {
        method: "POST",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({
          name: "Organic Chemistry",
          subject_code: "CHEM201",
          description: "Advanced chemistry",
          status: "Active",
        }),
      });
      const res = await createSubjectMaster(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Organic Chemistry");
      createdSubMasterId = json.data._id;
    });

    it("should get single subject master by ID", async () => {
      const req = new NextRequest(`http://localhost:3000/api/subject-master/${createdSubMasterId}`, {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getSubjectMasterById(req, { params: Promise.resolve({ id: createdSubMasterId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data._id).toBe(createdSubMasterId);
    });

    it("should update subject master", async () => {
      const req = new NextRequest(`http://localhost:3000/api/subject-master/${createdSubMasterId}`, {
        method: "PUT",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ description: "Updated syllabus description" }),
      });
      const res = await updateSubjectMasterById(req, { params: Promise.resolve({ id: createdSubMasterId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.description).toBe("Updated syllabus description");
    });

    it("should create subject assignment and sync teacher assignment", async () => {
      const req = new NextRequest("http://localhost:3000/api/subject-assignment", {
        method: "POST",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({
          academic_year: "2026-2027",
          class_id: ctx.classA1._id.toString(),
          subject_master_id: createdSubMasterId,
          teacher_id: ctx.teacherDocA._id.toString(),
          weekly_periods: 5,
        }),
      });
      const res = await createSubjectAssignment(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.count).toBe(1);
      createdSubAssignId = json.data[0]._id;
    });

    it("should reject duplicate subject assignment with 409", async () => {
      const req = new NextRequest("http://localhost:3000/api/subject-assignment", {
        method: "POST",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({
          academic_year: "2026-2027",
          class_id: ctx.classA1._id.toString(),
          subject_master_id: createdSubMasterId,
        }),
      });
      const res = await createSubjectAssignment(req);
      expect(res.status).toBe(409);
    });

    it("should list subject assignments with populated relationships", async () => {
      const req = new NextRequest("http://localhost:3000/api/subject-assignment?page=1&limit=10", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getSubjectAssignments(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.assignments.length).toBeGreaterThan(0);
    });

    it("should update subject assignment", async () => {
      const req = new NextRequest(`http://localhost:3000/api/subject-assignment/${createdSubAssignId}`, {
        method: "PUT",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ weekly_periods: 6 }),
      });
      const res = await updateSubjectAssignmentById(req, { params: Promise.resolve({ id: createdSubAssignId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.weekly_periods).toBe(6);
    });

    it("should prevent deleting subject master while in use with 409", async () => {
      const req = new NextRequest(`http://localhost:3000/api/subject-master/${createdSubMasterId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await deleteSubjectMasterById(req, { params: Promise.resolve({ id: createdSubMasterId }) });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.message).toContain("cannot be deleted because it is in use");
    });

    it("should delete subject assignment and then delete subject master", async () => {
      const delAssignReq = new NextRequest(`http://localhost:3000/api/subject-assignment/${createdSubAssignId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const resAssign = await deleteSubjectAssignmentById(delAssignReq, { params: Promise.resolve({ id: createdSubAssignId }) });
      expect(resAssign.status).toBe(200);

      const delMasterReq = new NextRequest(`http://localhost:3000/api/subject-master/${createdSubMasterId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const resMaster = await deleteSubjectMasterById(delMasterReq, { params: Promise.resolve({ id: createdSubMasterId }) });
      expect(resMaster.status).toBe(200);
    });
  });

  // ─── MODULE 10: Public Endpoints & System Setup ───────────────────────────
  describe("Module: Public Endpoints & System Setup (/api/public/*, /api/contact, /api/landing, /api/setup)", () => {
    it("should submit public admission form with unique application_no", async () => {
      const req = new NextRequest("http://localhost:3000/api/public/admissions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-school-id": ctx.schoolA._id.toString(),
        },
        body: JSON.stringify({
          academic_year: "2026-2027",
          class_id: ctx.classA1._id.toString(),
          student_name: "Public Candidate",
          gender: "female",
          dob: "2014-06-12",
          phone: "9123456780",
          father_name: "David Candidate",
        }),
      });
      const res = await postPublicAdmission(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.application_no).toMatch(/^ADM-2026-\d{6}$/);

      // Clean up
      await Admission.deleteOne({ _id: json.data._id });
    });

    it("should get public classes for admission form dropdown", async () => {
      const req = new NextRequest("http://localhost:3000/api/public/classes", {
        headers: { "x-school-id": ctx.schoolA._id.toString() },
      });
      const res = await getPublicClasses(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("should record demo request and trigger notification", async () => {
      const req = new NextRequest("http://localhost:3000/api/public/demo-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          schoolName: "Delhi Model School",
          contactPerson: "Mr. Sharma",
          phone: "9876543210",
          email: "sharma@delhimodelschool.edu",
          studentCount: "800",
          message: "Interested in full ERP rollout",
        }),
      });
      const res = await postDemoRequest(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("should reject demo request if required fields are missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/public/demo-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ schoolName: "Incomplete Form" }),
      });
      const res = await postDemoRequest(req);
      expect(res.status).toBe(400);
    });

    it("should get public school-info by subdomain with SEO meta", async () => {
      const req = new NextRequest(`http://localhost:3000/api/public/school-info?subdomain=${ctx.schoolA.subdomain}`);
      const res = await getPublicSchoolInfo(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe(ctx.schoolA.name);
      expect(json.data.meta).toBeDefined();
    });

    it("should get public theme config", async () => {
      const req = new NextRequest("http://localhost:3000/api/public/theme", {
        headers: { "x-school-id": ctx.schoolA._id.toString() },
      });
      const res = await getPublicTheme(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("should validate and handle public file upload", async () => {
      // Empty file rejection
      const emptyForm = new FormData();
      const emptyFile = new File([], "empty.png", { type: "image/png" });
      emptyForm.append("file", emptyFile);
      const emptyReq = new NextRequest("http://localhost:3000/api/public/upload", {
        method: "POST",
        body: emptyForm,
      });
      const emptyRes = await postPublicUpload(emptyReq);
      expect(emptyRes.status).toBe(400);

      // Valid file upload
      const validForm = new FormData();
      const validFile = new File(["valid-image-bytes-mock"], "student-photo.png", { type: "image/png" });
      validForm.append("file", validFile);
      const validReq = new NextRequest("http://localhost:3000/api/public/upload", {
        method: "POST",
        body: validForm,
      });
      const validRes = await postPublicUpload(validReq);
      expect(validRes.status).toBe(200);
      const validJson = await validRes.json();
      expect(validJson.success).toBe(true);
      expect(validJson.url).toContain("cloudinary");
    });

    it("should handle public contact form submission", async () => {
      const req = new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Parent Visitor",
          email: "parent@visitor.com",
          phone: "9876543210",
          grade: "Class 10",
        }),
      });
      const res = await postContact(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("should manage landing content (GET, PUT, PATCH)", async () => {
      // PUT Landing content
      const putReq = new NextRequest("http://localhost:3000/api/landing", {
        method: "PUT",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({
          about: { hero_tagline: "Welcome to Alpha School", vision: "Excellence", mission: "Service", history: "Est 2010", founded_year: 2010, infrastructure: "Modern" },
        }),
      });
      const putRes = await putLanding(putReq);
      expect(putRes.status).toBe(200);
      const putJson = await putRes.json();
      expect(putJson.success).toBe(true);

      // GET Landing content
      const getReq = new NextRequest("http://localhost:3000/api/landing", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const getRes = await getLanding(getReq);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.success).toBe(true);
      expect(getJson.data.about.hero_tagline).toBe("Welcome to Alpha School");

      // PATCH Landing section
      const patchReq = new NextRequest("http://localhost:3000/api/landing", {
        method: "PATCH",
        headers: { authorization: `Bearer ${schoolAAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({
          section: "about",
          data: { hero_tagline: "Alpha School - Empowering Minds" },
        }),
      });
      const patchRes = await patchLanding(patchReq);
      expect(patchRes.status).toBe(200);
      const patchJson = await patchRes.json();
      expect(patchJson.success).toBe(true);

      // GET via public route
      const pubReq = new NextRequest("http://localhost:3000/api/public/landing", {
        headers: { "x-school-id": ctx.schoolA._id.toString() },
      });
      const pubRes = await getPublicLanding(pubReq);
      expect(pubRes.status).toBe(200);
      const pubJson = await pubRes.json();
      expect(pubJson.success).toBe(true);
    });

    it("should allow super admin to manage cross-school landing via /api/schools/[id]/landing", async () => {
      const putReq = new NextRequest(`http://localhost:3000/api/schools/${ctx.schoolA._id}/landing`, {
        method: "PUT",
        headers: { authorization: `Bearer ${superAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({
          about: { hero_tagline: "Super Admin Updated Alpha", vision: "Global", mission: "Leadership", history: "Est 2010", founded_year: 2010, infrastructure: "World class" },
        }),
      });
      const putRes = await putSchoolLandingById(putReq, { params: Promise.resolve({ id: ctx.schoolA._id.toString() }) });
      expect(putRes.status).toBe(200);

      const getReq = new NextRequest(`http://localhost:3000/api/schools/${ctx.schoolA._id}/landing`, {
        headers: { authorization: `Bearer ${superAdminToken}` },
      });
      const getRes = await getSchoolLandingById(getReq, { params: Promise.resolve({ id: ctx.schoolA._id.toString() }) });
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.data.about.hero_tagline).toBe("Super Admin Updated Alpha");

      const patchReq = new NextRequest(`http://localhost:3000/api/schools/${ctx.schoolA._id}/landing`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${superAdminToken}`, "content-type": "application/json" },
        body: JSON.stringify({ section: "about", data: { hero_tagline: "Alpha High" } }),
      });
      const patchRes = await patchSchoolLandingById(patchReq, { params: Promise.resolve({ id: ctx.schoolA._id.toString() }) });
      expect(patchRes.status).toBe(200);
    });

    it("should verify setup endpoint (GET check and POST validation)", async () => {
      // GET setup status
      const getRes = await getSetupStatus();
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.success).toBe(true);
      expect(getJson.status).toBe("configured");

      // POST setup with bad key -> 403
      const badKeyReq = new NextRequest("http://localhost:3000/api/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          setup_key: "wrong-key",
          school_name: "Gamma School",
          school_slug: "gamma-school",
          admin_name: "Gamma Admin",
          admin_email: "admin@gammaschool.com",
          admin_password: "Password123#",
        }),
      });
      const badKeyRes = await postSetup(badKeyReq);
      expect(badKeyRes.status).toBe(403);

      // POST setup with existing slug -> 409
      const dupReq = new NextRequest("http://localhost:3000/api/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          setup_key: process.env.SETUP_SECRET_KEY,
          school_name: "Alpha School",
          school_slug: ctx.schoolA.slug,
          admin_name: "Alpha Admin 2",
          admin_email: "admin2@alphaschool.com",
          admin_password: "Password123#",
        }),
      });
      const dupRes = await postSetup(dupReq);
      expect(dupRes.status).toBe(409);
    });
  });
});
