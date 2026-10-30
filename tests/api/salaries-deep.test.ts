import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { setupTestDatabase, teardownTestDatabase, TestDataContext } from "../helpers/dbTestSetup";
import { generateAccessToken } from "@/lib/utils/jwt";
import {
  GET as getSalariesRoute,
  POST as createSalariesRoute,
  invalidateSalariesCache,
} from "@/app/api/salaries/route";
import { GET as getSalaryPreviewRoute } from "@/app/api/salaries/preview/route";
import {
  GET as getSalarySlipRoute,
  PUT as updateSalarySlipRoute,
  DELETE as deleteSalarySlipRoute,
  PATCH as patchSalarySlipRoute,
} from "@/app/api/salaries/[id]/route";
import {
  SalaryPayment,
  Attendance,
} from "@/lib/models/index";
import Teacher from "@/lib/models/Teacher";

let ctx: TestDataContext;

beforeAll(async () => {
  ctx = await setupTestDatabase("sal-dp");
  invalidateSalariesCache();
}, 30000);

afterAll(async () => {
  await teardownTestDatabase("sal-dp");
});

describe("Deep Salaries & Payroll Test Suite (/api/salaries/*)", () => {
  const period = "2026-03";
  let schoolAAdminToken: string;
  let schoolBAdminToken: string;
  let teacherAToken: string;
  let teacherBToken: string;
  let studentAToken: string;

  beforeAll(async () => {
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

    teacherAToken = generateAccessToken({
      user_id: ctx.schoolATeacher._id.toString(),
      school_id: ctx.schoolA._id.toString(),
      role: "teacher",
    });

    teacherBToken = generateAccessToken({
      user_id: ctx.schoolBTeacher._id.toString(),
      school_id: ctx.schoolB._id.toString(),
      role: "teacher",
    });

    studentAToken = generateAccessToken({
      user_id: ctx.schoolAStudent._id.toString(),
      school_id: ctx.schoolA._id.toString(),
      role: "student",
    });

    // Seed realistic attendance records for teacherDocA in March 2026:
    // 20 present, 2 absent, 2 half_day (0.5 present, 0.5 absent), 1 leave, 1 holiday
    // Total present = 20 + (2 * 0.5) + 1 + 1 = 23
    // Total absent = 2 + (2 * 0.5) = 3
    const attendanceRecords = [
      { status: "present", count: 20 },
      { status: "absent", count: 2 },
      { status: "half_day", count: 2 },
      { status: "leave", count: 1 },
      { status: "holiday", count: 1 },
    ];

    let day = 1;
    for (const group of attendanceRecords) {
      for (let i = 0; i < group.count; i++) {
        const dateStr = `2026-03-${String(day).padStart(2, "0")}`;
        await Attendance.create({
          school_id: ctx.schoolA._id,
          type: "teacher",
          date: new Date(`${dateStr}T09:00:00.000Z`),
          academic_year: "2026-2027",
          marked_by: ctx.schoolAAdmin._id,
          records: [
            {
              teacher_id: ctx.teacherDocA._id,
              status: group.status,
            },
          ],
        });
        day++;
      }
    }
  });

  // ─── 1. Dynamic Salary Preview & Calculations (/api/salaries/preview) ───
  describe("Dynamic Salary Preview & Calculations (/api/salaries/preview)", () => {
    it("should reject unauthenticated request with 401", async () => {
      const req = new NextRequest(`http://localhost:3000/api/salaries/preview?teacher_id=${ctx.teacherDocA._id}`);
      const res = await getSalaryPreviewRoute(req);
      expect(res.status).toBe(401);
    });

    it("should reject non-admin roles (teacher/student) with 403", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/salaries/preview?teacher_id=${ctx.teacherDocA._id}`,
        { headers: { authorization: `Bearer ${teacherAToken}` } }
      );
      const res = await getSalaryPreviewRoute(req);
      expect(res.status).toBe(403);
    });

    it("should return 400 when teacher_id is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/salaries/preview", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getSalaryPreviewRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("teacher_id is required");
    });

    it("should return 400 when teacher_id format is invalid", async () => {
      const req = new NextRequest("http://localhost:3000/api/salaries/preview?teacher_id=invalid-id", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getSalaryPreviewRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid teacher ID");
    });

    it("should return 400 on malformed period string", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/salaries/preview?teacher_id=${ctx.teacherDocA._id}&period=2026-99`,
        { headers: { authorization: `Bearer ${schoolAAdminToken}` } }
      );
      const res = await getSalaryPreviewRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid period format");
    });

    it("should reject preview for cross-tenant teacher with 404 (School A admin requesting School B teacher)", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/salaries/preview?teacher_id=${ctx.teacherDocB._id}&period=${period}`,
        { headers: { authorization: `Bearer ${schoolAAdminToken}` } }
      );
      const res = await getSalaryPreviewRoute(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.message).toContain("Teacher not found");
    });

    it("should dynamically calculate exact attendance days, daily salary rate, suggested deductions and net payable", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/salaries/preview?teacher_id=${ctx.teacherDocA._id}&period=${period}`,
        { headers: { authorization: `Bearer ${schoolAAdminToken}` } }
      );
      const res = await getSalaryPreviewRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      const d = json.data;
      expect(d.monthlySalary).toBe(50000); // Set in dbTestSetup
      expect(d.workingDays).toBe(26); // 20 + 2 + 2 + 1 + 1 = 26 records
      expect(d.presentDays).toBe(23); // 20 + 1 + 1 + 1 = 23
      expect(d.absentDays).toBe(3);   // 2 + 1 = 3
      expect(d.halfDays).toBe(2);
      expect(d.leaveDays).toBe(1);
      expect(d.holidayDays).toBe(1);

      // Verify Decimal Precision:
      // dailySalary = Math.round((50000 / 30) * 100) / 100 = 1666.67
      expect(d.dailySalary).toBe(1666.67);

      // suggestedDeduction = Math.round(3 * 1666.67 * 100) / 100 = 5000.01
      expect(d.suggestedDeduction).toBe(5000.01);

      // totalPayableAmount = 50000 - 5000.01 = 44999.99
      expect(d.totalPayableAmount).toBe(44999.99);
    });
  });

  // ─── 2. Bulk Payroll Generation & Idempotency (/api/salaries POST) ───────
  describe("Bulk Payroll Generation, Idempotency, & Filtering (/api/salaries POST)", () => {
    it("should reject bulk generation without salary_period with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${schoolAAdminToken}`,
        },
        body: JSON.stringify({ bulk: true }),
      });
      const res = await createSalariesRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Salary period (YYYY-MM) is required");
    });

    it("should return 404 when filter yields no matching teachers", async () => {
      const req = new NextRequest("http://localhost:3000/api/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${schoolAAdminToken}`,
        },
        body: JSON.stringify({
          bulk: true,
          salary_period: period,
          department: "NonExistentDept",
        }),
      });
      const res = await createSalariesRoute(req);
      expect(res.status).toBe(404);
    });

    it("should generate Draft payroll records for active eligible teachers", async () => {
      const req = new NextRequest("http://localhost:3000/api/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${schoolAAdminToken}`,
        },
        body: JSON.stringify({
          bulk: true,
          salary_period: period,
        }),
      });
      const res = await createSalariesRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain("Successfully generated draft payroll");

      // Verify the draft record exists in MongoDB
      const draft = await SalaryPayment.findOne({
        school_id: ctx.schoolA._id,
        teacher_id: ctx.teacherDocA._id,
        salary_period: period,
      });
      expect(draft).toBeDefined();
      expect(draft?.status).toBe("Draft");
      expect(draft?.monthly_salary).toBe(50000);
      expect(draft?.payable_amount).toBe(44999.99);
      expect(draft?.receipt_number).toMatch(/^SAL-202603-\d{4}$/);
    });

    it("should be idempotent: subsequent bulk generation skips already generated teachers without duplicating", async () => {
      const req = new NextRequest("http://localhost:3000/api/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${schoolAAdminToken}`,
        },
        body: JSON.stringify({
          bulk: true,
          salary_period: period,
        }),
      });
      const res = await createSalariesRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain("Successfully generated draft payroll for 0 teachers");

      // Verify still only 1 record exists in DB
      const count = await SalaryPayment.countDocuments({
        school_id: ctx.schoolA._id,
        teacher_id: ctx.teacherDocA._id,
        salary_period: period,
      });
      expect(count).toBe(1);
    });
  });

  // ─── 3. Payroll Lifecycle Status Transitions ───────────────────────────
  describe("Payroll Lifecycle Status Transitions (Draft -> Under Review -> Approved -> Finalized -> Paid)", () => {
    it("should transition Draft records to 'Under Review' via submit_review", async () => {
      const req = new NextRequest("http://localhost:3000/api/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${schoolAAdminToken}`,
        },
        body: JSON.stringify({
          bulk: true,
          salary_period: period,
          action: "submit_review",
        }),
      });
      const res = await createSalariesRoute(req);
      expect(res.status).toBe(200);

      const record = await SalaryPayment.findOne({
        school_id: ctx.schoolA._id,
        teacher_id: ctx.teacherDocA._id,
        salary_period: period,
      });
      expect(record?.status).toBe("Under Review");
    });

    it("should transition 'Under Review' records to 'Approved' via approve action", async () => {
      const req = new NextRequest("http://localhost:3000/api/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${schoolAAdminToken}`,
        },
        body: JSON.stringify({
          bulk: true,
          salary_period: period,
          action: "approve",
        }),
      });
      const res = await createSalariesRoute(req);
      expect(res.status).toBe(200);

      const record = await SalaryPayment.findOne({
        school_id: ctx.schoolA._id,
        teacher_id: ctx.teacherDocA._id,
        salary_period: period,
      });
      expect(record?.status).toBe("Approved");
      expect(record?.approved_by?.toString()).toBe(ctx.schoolAAdmin._id.toString());
    });

    it("should reject finalization if month has not ended and early finalization flag is omitted", async () => {
      // Future salary period that has definitely not ended
      const futurePeriod = "2029-12";
      await SalaryPayment.create({
        school_id: ctx.schoolA._id,
        teacher_id: ctx.teacherDocA._id,
        salary_period: futurePeriod,
        monthly_salary: 50000,
        working_days: 30,
        present_days: 30,
        absent_days: 0,
        suggested_deduction: 0,
        final_salary: 50000,
        status: "Approved",
        receipt_number: "SAL-202912-9999",
      });

      const req = new NextRequest("http://localhost:3000/api/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${schoolAAdminToken}`,
        },
        body: JSON.stringify({
          bulk: true,
          salary_period: futurePeriod,
          action: "finalize",
          allow_early_finalization: false,
        }),
      });
      const res = await createSalariesRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("has not ended yet");

      // Cleanup future record
      await SalaryPayment.deleteOne({ school_id: ctx.schoolA._id, salary_period: futurePeriod });
    });

    it("should successfully finalize with allow_early_finalization=true", async () => {
      const req = new NextRequest("http://localhost:3000/api/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${schoolAAdminToken}`,
        },
        body: JSON.stringify({
          bulk: true,
          salary_period: period,
          action: "finalize",
          allow_early_finalization: true,
        }),
      });
      const res = await createSalariesRoute(req);
      expect(res.status).toBe(200);

      const record = await SalaryPayment.findOne({
        school_id: ctx.schoolA._id,
        teacher_id: ctx.teacherDocA._id,
        salary_period: period,
      });
      expect(record?.status).toBe("Finalized");
      expect(record?.finalized_by?.toString()).toBe(ctx.schoolAAdmin._id.toString());
      expect(record?.finalized_at).toBeDefined();
    });

    it("should transition Finalized records to 'Paid' via bulk pay action", async () => {
      const req = new NextRequest("http://localhost:3000/api/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${schoolAAdminToken}`,
        },
        body: JSON.stringify({
          bulk: true,
          salary_period: period,
          action: "pay",
          payment_method: "Bank Transfer",
        }),
      });
      const res = await createSalariesRoute(req);
      expect(res.status).toBe(200);

      const record = await SalaryPayment.findOne({
        school_id: ctx.schoolA._id,
        teacher_id: ctx.teacherDocA._id,
        salary_period: period,
      });
      expect(record?.status).toBe("Paid");
      expect(record?.payment_method).toBe("Bank Transfer");
      expect(record?.payment_date).toBeDefined();
    });
  });

  // ─── 4. Single Salary Payment & Duplicate Prevention ───────────────────
  describe("Single Salary Payment, Concessions, & Duplicate Payout Defense", () => {
    const singlePeriod = "2026-04";

    it("should reject payout when missing required fields with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${schoolAAdminToken}`,
        },
        body: JSON.stringify({
          teacher_id: ctx.teacherDocA._id.toString(),
          // missing salary_period, monthly_salary, final_salary
        }),
      });
      const res = await createSalariesRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Missing required fields");
    });

    it("should reject payout with invalid teacher ID format with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${schoolAAdminToken}`,
        },
        body: JSON.stringify({
          teacher_id: "not-a-valid-id",
          salary_period: singlePeriod,
          monthly_salary: 50000,
          final_salary: 50000,
        }),
      });
      const res = await createSalariesRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid teacher ID");
    });

    it("should reject payout with negative bonus or negative deduction with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${schoolAAdminToken}`,
        },
        body: JSON.stringify({
          teacher_id: ctx.teacherDocA._id.toString(),
          salary_period: singlePeriod,
          monthly_salary: 50000,
          final_salary: 50000,
          bonus: -500,
        }),
      });
      const res = await createSalariesRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("cannot be negative");
    });

    it("should reject paying salary for cross-tenant teacher with 404", async () => {
      const req = new NextRequest("http://localhost:3000/api/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${schoolAAdminToken}`,
        },
        body: JSON.stringify({
          teacher_id: ctx.teacherDocB._id.toString(), // belongs to School B
          salary_period: singlePeriod,
          monthly_salary: 45000,
          final_salary: 45000,
        }),
      });
      const res = await createSalariesRoute(req);
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.message).toContain("Teacher not found");
    });

    it("should successfully disburse single salary with bonus, overtime, and deductions", async () => {
      const req = new NextRequest("http://localhost:3000/api/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${schoolAAdminToken}`,
        },
        body: JSON.stringify({
          teacher_id: ctx.teacherDocA._id.toString(),
          salary_period: singlePeriod,
          monthly_salary: 50000,
          bonus: 2500,
          deduction: 1000,
          overtime_amount: 1500,
          tax_deduction: 500,
          final_salary: 52500, // 50000 + 2500 + 1500 - 1000 - 500 = 52500
          payment_method: "UPI",
          remarks: "April Performance Incentive",
          status: "Paid",
        }),
      });
      const res = await createSalariesRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.receipt_number).toMatch(/^SAL-202604-\d{4}$/);
      expect(json.data.final_salary).toBe(52500);
      expect(json.data.status).toBe("Paid");
    });

    it("should prevent duplicate payout for already Paid period with 409 Conflict", async () => {
      const req = new NextRequest("http://localhost:3000/api/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${schoolAAdminToken}`,
        },
        body: JSON.stringify({
          teacher_id: ctx.teacherDocA._id.toString(),
          salary_period: singlePeriod,
          monthly_salary: 50000,
          final_salary: 52500,
        }),
      });
      const res = await createSalariesRoute(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.message).toContain("already been paid for this employee");
    });
  });

  // ─── 5. Single Salary Record Operations & Lock Rules (/api/salaries/[id]) ───
  describe("Single Record Operations, Lock Rules, Soft Delete & Restore (/api/salaries/[id])", () => {
    let testPaymentId: string;

    beforeAll(async () => {
      // Create a draft payment for testing mutations
      const draft = await SalaryPayment.create({
        school_id: ctx.schoolA._id,
        teacher_id: ctx.teacherDocA._id,
        salary_period: "2026-05",
        monthly_salary: 50000,
        working_days: 30,
        present_days: 30,
        absent_days: 0,
        suggested_deduction: 0,
        payable_amount: 50000,
        final_salary: 50000,
        status: "Draft",
        receipt_number: "SAL-202605-7777",
      });
      testPaymentId = draft._id.toString();
    });

    it("should reject operations on invalid salary payment ID format with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/salaries/invalid-mongo-id", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getSalarySlipRoute(req, { params: Promise.resolve({ id: "invalid-mongo-id" }) });
      expect(res.status).toBe(400);
    });

    it("should return 404 when salary slip is not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const req = new NextRequest(`http://localhost:3000/api/salaries/${nonExistentId}`, {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getSalarySlipRoute(req, { params: Promise.resolve({ id: nonExistentId }) });
      expect(res.status).toBe(404);
    });

    it("should allow teacher to view their own salary slip", async () => {
      const req = new NextRequest(`http://localhost:3000/api/salaries/${testPaymentId}`, {
        headers: { authorization: `Bearer ${teacherAToken}` },
      });
      const res = await getSalarySlipRoute(req, { params: Promise.resolve({ id: testPaymentId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.receipt_number).toBe("SAL-202605-7777");
    });

    it("should reject student or parent viewing teacher salary slips with 403", async () => {
      const req = new NextRequest(`http://localhost:3000/api/salaries/${testPaymentId}`, {
        headers: { authorization: `Bearer ${studentAToken}` },
      });
      const res = await getSalarySlipRoute(req, { params: Promise.resolve({ id: testPaymentId }) });
      expect(res.status).toBe(403);
    });

    it("should allow modifying a Draft salary record (PUT)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/salaries/${testPaymentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${schoolAAdminToken}`,
        },
        body: JSON.stringify({
          bonus: 1000,
          deduction: 500,
          final_salary: 50500,
          remarks: "Updated Draft",
        }),
      });
      const res = await updateSalarySlipRoute(req, { params: Promise.resolve({ id: testPaymentId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.bonus).toBe(1000);
      expect(json.data.final_salary).toBe(50500);
    });

    it("should reject editing a locked Paid record with 400", async () => {
      // Find the Paid record from April
      const paidRecord = await SalaryPayment.findOne({
        school_id: ctx.schoolA._id,
        salary_period: "2026-04",
        status: "Paid",
      });
      expect(paidRecord).toBeDefined();

      const req = new NextRequest(`http://localhost:3000/api/salaries/${paidRecord?._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${schoolAAdminToken}`,
        },
        body: JSON.stringify({
          bonus: 9999, // Attempt to tamper locked paid slip
        }),
      });
      const res = await updateSalarySlipRoute(req, { params: Promise.resolve({ id: paidRecord?._id.toString() as string }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("locked");
    });

    it("should soft delete a salary record (DELETE without permanent)", async () => {
      const req = new NextRequest(`http://localhost:3000/api/salaries/${testPaymentId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await deleteSalarySlipRoute(req, { params: Promise.resolve({ id: testPaymentId }) });
      expect(res.status).toBe(200);

      const record = await SalaryPayment.findById(testPaymentId);
      expect(record?.is_deleted).toBe(true);
      expect(record?.deleted_at).toBeDefined();
    });

    it("should restore a soft-deleted record via PATCH", async () => {
      const req = new NextRequest(`http://localhost:3000/api/salaries/${testPaymentId}?action=restore`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await patchSalarySlipRoute(req, { params: Promise.resolve({ id: testPaymentId }) });
      expect(res.status).toBe(200);

      const record = await SalaryPayment.findById(testPaymentId);
      expect(record?.is_deleted).toBe(false);
      expect(record?.deleted_at).toBeNull();
    });

    it("should permanently hard delete a record when permanent=true is provided", async () => {
      const req = new NextRequest(`http://localhost:3000/api/salaries/${testPaymentId}?permanent=true`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await deleteSalarySlipRoute(req, { params: Promise.resolve({ id: testPaymentId }) });
      expect(res.status).toBe(200);

      const record = await SalaryPayment.findById(testPaymentId);
      expect(record).toBeNull();
    });
  });

  // ─── 6. Salary History, Aggregation, & Role-Based Queries (/api/salaries GET) ───
  describe("Salary History, Aggregation, & Role-Based Queries (/api/salaries GET)", () => {
    it("should reject unauthenticated request with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/salaries");
      const res = await getSalariesRoute(req);
      expect(res.status).toBe(401);
    });

    it("should reject invalid teacher_id parameter with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/salaries?teacher_id=bad-format", {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getSalariesRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid teacher ID");
    });

    it("should return payroll summary including totalPaid and totalPending", async () => {
      invalidateSalariesCache(ctx.schoolA._id.toString());
      const req = new NextRequest(`http://localhost:3000/api/salaries?period=${period}`, {
        headers: { authorization: `Bearer ${schoolAAdminToken}` },
      });
      const res = await getSalariesRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.summary).toBeDefined();
      expect(json.data.summary.totalPaid).toBeGreaterThanOrEqual(44999.99);
      expect(Array.isArray(json.data.payments)).toBe(true);
    });

    it("should restrict teacher to their own salary history only", async () => {
      const req = new NextRequest("http://localhost:3000/api/salaries", {
        headers: { authorization: `Bearer ${teacherAToken}` },
      });
      const res = await getSalariesRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      for (const p of json.data.payments) {
        expect(p.teacher_id._id.toString()).toBe(ctx.teacherDocA._id.toString());
      }
    });

    it("should isolate cross-tenant records: School B Admin sees 0 School A payments", async () => {
      const req = new NextRequest("http://localhost:3000/api/salaries", {
        headers: { authorization: `Bearer ${schoolBAdminToken}` },
      });
      const res = await getSalariesRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      for (const p of json.data.payments) {
        expect(p.school_id.toString()).toBe(ctx.schoolB._id.toString());
      }
    });
  });
});
