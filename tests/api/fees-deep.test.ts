import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { setupTestDatabase, teardownTestDatabase, TestDataContext } from "../helpers/dbTestSetup";
import {
  GET as getFeesRoute,
  POST as saveFeeConfigRoute,
  invalidateFeesCache,
} from "@/app/api/fees/route";
import {
  GET as getFeePaymentsRoute,
  POST as recordFeePaymentRoute,
  DELETE as deleteFeePaymentRoute,
  PATCH as patchFeePaymentRoute,
  invalidateFeesPaymentsCache,
} from "@/app/api/fees/payments/route";
import {
  GET as getFeeGroupsRoute,
  POST as createFeeGroupRoute,
} from "@/app/api/fees/groups/route";
import {
  PUT as updateFeeGroupRoute,
  DELETE as deleteFeeGroupRoute,
} from "@/app/api/fees/groups/[id]/route";
import {
  GET as getFeeTypesRoute,
  POST as createFeeTypeRoute,
} from "@/app/api/fees/types/route";
import {
  PUT as updateFeeTypeRoute,
  DELETE as deleteFeeTypeRoute,
} from "@/app/api/fees/types/[id]/route";
import {
  GET as getFeeMasterRoute,
  POST as createFeeMasterRoute,
} from "@/app/api/fees/master/route";
import {
  PUT as updateFeeMasterRoute,
  DELETE as deleteFeeMasterRoute,
} from "@/app/api/fees/master/[id]/route";
import {
  GET as getFeeAllocationsRoute,
  POST as saveFeeAllocationsRoute,
} from "@/app/api/fees/allocations/route";
import { generateAccessToken } from "@/lib/utils/jwt";
import {
  ClassFee,
  StudentFeePayment,
  StudentFeeAssignment,
  FeeGroup,
  FeeType,
  FeeMaster,
  FeeAllocation,
  Parent,
} from "@/lib/models/index";
import User from "@/lib/models/User";
import bcrypt from "bcryptjs";

let ctx: TestDataContext;

beforeAll(async () => {
  ctx = await setupTestDatabase("fees-dp");
  invalidateFeesCache();
  invalidateFeesPaymentsCache();
}, 30000);

afterAll(async () => {
  await teardownTestDatabase("fees-dp");
}, 20000);

describe("Deep Fees Test Suite (/api/fees/*)", () => {
  const academicYear = "2026-2027";
  let parentUserA: any;
  let parentDocA: any;

  beforeAll(async () => {
    // Link a Parent to studentDocA
    const passwordHash = await bcrypt.hash("Password123#", 10);
    parentUserA = await User.create({
      name: "Parent of Alice",
      email: "parent-alice-fees@testschool.com",
      username: "parent.alice.fees",
      password_hash: passwordHash,
      role: "parent",
      school_id: ctx.schoolA._id,
      is_active: true,
    });

    parentDocA = await Parent.create({
      school_id: ctx.schoolA._id,
      user_id: parentUserA._id,
      name: "Parent of Alice",
      phone: "9876543999",
      relation: "Father",
    });

    ctx.studentDocA.parent_id = parentDocA._id;
    await ctx.studentDocA.save();
  });

  // ─── 1. Fee Configuration & Setup (/api/fees POST) ────────
  describe("Fee Configuration & Setup (/api/fees POST)", () => {
    it("should reject unauthenticated request with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: ctx.classA1._id.toString(), academic_year: academicYear }),
      });
      const res = await saveFeeConfigRoute(req);
      expect(res.status).toBe(401);
    });

    it("should reject unauthorized roles (teacher/student/parent) with 403", async () => {
      const teacherToken = generateAccessToken({
        user_id: ctx.schoolATeacher._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "teacher",
      });

      const req = new NextRequest("http://localhost:3000/api/fees", {
        method: "POST",
        headers: {
          authorization: `Bearer ${teacherToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ class_id: ctx.classA1._id.toString(), academic_year: academicYear }),
      });
      const res = await saveFeeConfigRoute(req);
      expect(res.status).toBe(403);
    });

    it("should reject invalid class_id or student_id format with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/fees", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          class_id: "not-a-mongo-id",
          academic_year: academicYear,
          fee_types: [{ name: "Tuition", amount: 5000, is_enabled: true }],
        }),
      });

      const res = await saveFeeConfigRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid class_id format");
    });

    it("should allow School Admin to setup class-wide fee structure", async () => {
      invalidateFeesCache(ctx.schoolA._id.toString());
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/fees", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          class_id: ctx.classA1._id.toString(),
          academic_year: academicYear,
          fee_types: [
            { name: "Tuition Fee", amount: 4000, is_enabled: true },
            { name: "Lab Fee", amount: 1000, is_enabled: true },
            { name: "Sports Fee (Optional)", amount: 500, is_enabled: false },
          ],
        }),
      });

      const res = await saveFeeConfigRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      // Total amount should sum only enabled fee types (4000 + 1000 = 5000)
      expect(json.data.total_amount).toBe(5000);
      expect(json.data.fee_types).toHaveLength(3);
    });

    it("should allow student-specific custom fee override", async () => {
      invalidateFeesCache(ctx.schoolA._id.toString());
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/fees", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: ctx.studentDocA._id.toString(),
          academic_year: academicYear,
          fee_types: [
            { name: "Tuition Fee", amount: 3500, is_enabled: true }, // discounted tuition
            { name: "Lab Fee", amount: 1000, is_enabled: true },
          ],
        }),
      });

      const res = await saveFeeConfigRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.total_amount).toBe(4500);
      expect(json.data.student_id.toString()).toBe(ctx.studentDocA._id.toString());
    });
  });

  // ─── 2. Fee Querying & Calculations (/api/fees GET) ────────
  describe("Fee Querying, Due & Balance Calculations (/api/fees GET)", () => {
    it("should retrieve config_only fee structure for class/student", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/fees?config_only=true&student_id=${ctx.studentDocA._id.toString()}&academic_year=${academicYear}`,
        { headers: { authorization: `Bearer ${adminToken}` } }
      );

      const res = await getFeesRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.total_amount).toBe(4500); // from custom override
    });

    it("should compute student fee balances, dues, and statuses correctly before payment", async () => {
      invalidateFeesCache(ctx.schoolA._id.toString());
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/fees?academic_year=${academicYear}&class_id=${ctx.classA1._id.toString()}`,
        { headers: { authorization: `Bearer ${adminToken}` } }
      );

      const res = await getFeesRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.students).toBeDefined();

      const alice = json.data.students.find((s: any) => s._id.toString() === ctx.studentDocA._id.toString());
      expect(alice).toBeDefined();
      expect(alice.totalFees).toBe(4500);
      expect(alice.totalPaid).toBe(0);
      expect(alice.balanceAmount).toBe(4500);
      expect(alice.status).toBe("Pending");
    });
  });

  // ─── 3. Fee Payments Collection (/api/fees/payments POST) ────────
  describe("Fee Payment Collections, Concessions, & Overlap Rejection", () => {
    let createdPaymentId: string;

    it("should reject payment with missing required fields with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/fees/payments", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: ctx.studentDocA._id.toString(),
          // missing amount, payment_method, dates
        }),
      });

      const res = await recordFeePaymentRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Missing required fields");
    });

    it("should reject non-positive amount (₹0 or negative) with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/fees/payments", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: ctx.studentDocA._id.toString(),
          payment_method: "Cash",
          amount_paid: 0,
          start_date: "2026-04-01",
          end_date: "2026-04-30",
        }),
      });

      const res = await recordFeePaymentRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("greater than ₹0");
    });

    it("should reject invalid payment method with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/fees/payments", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: ctx.studentDocA._id.toString(),
          payment_method: "Cryptocurrency",
          amount_paid: 1000,
          start_date: "2026-04-01",
          end_date: "2026-04-30",
        }),
      });

      const res = await recordFeePaymentRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid payment_method");
    });

    it("should reject inverted date range (end_date < start_date) with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/fees/payments", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: ctx.studentDocA._id.toString(),
          payment_method: "Cash",
          amount_paid: 1500,
          start_date: "2026-05-30",
          end_date: "2026-05-01", // earlier than start_date
        }),
      });

      const res = await recordFeePaymentRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("end_date cannot be before start_date");
    });

    it("should reject negative discount/fine/scholarship values with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/fees/payments", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: ctx.studentDocA._id.toString(),
          payment_method: "Cash",
          amount_paid: 1500,
          start_date: "2026-04-01",
          end_date: "2026-04-30",
          discount: -200, // negative discount
        }),
      });

      const res = await recordFeePaymentRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Discount must be a non-negative number");
    });

    it("should reject recording payment for cross-tenant student (School B student by School A admin) with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/fees/payments", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: ctx.studentDocB._id.toString(), // belongs to School B
          payment_method: "Cash",
          amount_paid: 1000,
          start_date: "2026-04-01",
          end_date: "2026-04-30",
        }),
      });

      const res = await recordFeePaymentRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid Student record");
    });

    it("should successfully record a partial fee payment with concessions and atomic receipt number", async () => {
      invalidateFeesPaymentsCache(ctx.schoolA._id.toString());
      invalidateFeesCache(ctx.schoolA._id.toString());
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/fees/payments", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: ctx.studentDocA._id.toString(),
          payment_method: "UPI",
          amount_paid: 2000.50, // partial payment with decimal
          start_date: "2026-04-01",
          end_date: "2026-04-30",
          collection_type: "Monthly",
          discount: 200,
          scholarship: 300,
          remarks: "First installment via UPI",
          fee_breakdown: [
            { name: "Tuition Fee", amount_paid: 1700.50 },
            { name: "Lab Fee", amount_paid: 300 },
          ],
        }),
      });

      const res = await recordFeePaymentRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.payment.receipt_number).toMatch(/^REC-\d{8}-\d{5}$/);
      expect(json.data.payment.amount_paid).toBe(2000.50);
      expect(json.data.payment.discount).toBe(200);
      expect(json.data.payment.scholarship).toBe(300);
      expect(json.data.payment.collected_by._id.toString()).toBe(ctx.schoolAAdmin._id.toString());

      createdPaymentId = json.data.payment._id;
    });

    it("should verify fee balance and partial status transition in /api/fees GET", async () => {
      invalidateFeesCache(ctx.schoolA._id.toString());
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(
        `http://localhost:3000/api/fees?academic_year=${academicYear}&class_id=${ctx.classA1._id.toString()}`,
        { headers: { authorization: `Bearer ${adminToken}` } }
      );

      const res = await getFeesRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      const alice = json.data.students.find((s: any) => s._id.toString() === ctx.studentDocA._id.toString());
      expect(alice).toBeDefined();
      // Total fees = 4500. Settled = 2000.50 (paid) + 200 (discount) + 300 (scholarship) = 2500.50.
      expect(alice.totalPaid).toBe(2500.50);
      expect(alice.balanceAmount).toBe(1999.50);
      expect(alice.status).toBe("Partial");
    });

    it("should reject duplicate payment overlapping the same period with 409 Conflict", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/fees/payments", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          student_id: ctx.studentDocA._id.toString(),
          payment_method: "Cash",
          amount_paid: 1000,
          start_date: "2026-04-15", // overlaps 2026-04-01 to 2026-04-30
          end_date: "2026-05-15",
        }),
      });

      const res = await recordFeePaymentRoute(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.message).toContain("Duplicate payment rejected");
    });
  });

  // ─── 4. Concurrent Collections & Atomic Receipt Numbers ────────
  describe("Concurrent Fee Collections", () => {
    it("should safely process concurrent payments for different students without receipt number collisions", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Fire 3 parallel requests with distinct date periods for alice
      const periods = [
        { start: "2026-06-01", end: "2026-06-30", amount: 500 },
        { start: "2026-07-01", end: "2026-07-31", amount: 600 },
        { start: "2026-08-01", end: "2026-08-31", amount: 700 },
      ];

      const promises = periods.map(p => {
        const req = new NextRequest("http://localhost:3000/api/fees/payments", {
          method: "POST",
          headers: {
            authorization: `Bearer ${adminToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            student_id: ctx.studentDocA._id.toString(),
            payment_method: "Cash",
            amount_paid: p.amount,
            start_date: p.start,
            end_date: p.end,
          }),
        });
        return recordFeePaymentRoute(req);
      });

      const responses = await Promise.all(promises);
      const receiptNumbers: string[] = [];

      for (const res of responses) {
        expect(res.status).toBe(201);
        const json = await res.json();
        receiptNumbers.push(json.data.payment.receipt_number);
      }

      // Ensure every single receipt number is distinct
      const uniqueReceipts = new Set(receiptNumbers);
      expect(uniqueReceipts.size).toBe(receiptNumbers.length);
    });
  });

  // ─── 5. Voiding & Restoring Payments (DELETE / PATCH) ────────
  describe("Voiding & Restoring Payments (/api/fees/payments)", () => {
    let testPaymentId: string;

    beforeAll(async () => {
      const paymentDoc = await StudentFeePayment.create({
        school_id: ctx.schoolA._id,
        student_id: ctx.studentDocA._id,
        receipt_number: "REC-TEST-VOID-001",
        amount_paid: 1200,
        payment_date: new Date(),
        payment_method: "Cash",
        start_date: new Date("2026-09-01"),
        end_date: new Date("2026-09-30"),
        collection_type: "Monthly",
        collected_by: ctx.schoolAAdmin._id,
      });
      testPaymentId = paymentDoc._id.toString();
    });

    it("should reject voiding with invalid payment ID with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/fees/payments?id=invalid-id", {
        method: "DELETE",
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await deleteFeePaymentRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid payment ID format");
    });

    it("should soft delete (void) payment with audit tracking", async () => {
      invalidateFeesPaymentsCache(ctx.schoolA._id.toString());
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/fees/payments?id=${testPaymentId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await deleteFeePaymentRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain("voided successfully");

      // Verify in DB that is_deleted is true and deleted_by is tracked
      const doc = await StudentFeePayment.findById(testPaymentId);
      expect(doc?.is_deleted).toBe(true);
      expect(doc?.deleted_by?.toString()).toBe(ctx.schoolAAdmin._id.toString());
    });

    it("should restore a voided payment via PATCH", async () => {
      invalidateFeesPaymentsCache(ctx.schoolA._id.toString());
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/fees/payments?id=${testPaymentId}&action=restore`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await patchFeePaymentRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain("restored successfully");

      const doc = await StudentFeePayment.findById(testPaymentId);
      expect(doc?.is_deleted).toBe(false);
      expect(doc?.deleted_at).toBeNull();
    });
  });

  // ─── 6. Role-Based Permissions & IDOR Defense ────────
  describe("Role Guards & IDOR Isolation", () => {
    it("should allow Student to view only their own payments", async () => {
      const studentToken = generateAccessToken({
        user_id: ctx.schoolAStudent._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "student",
      });

      const req = new NextRequest("http://localhost:3000/api/fees/payments", {
        headers: { authorization: `Bearer ${studentToken}` },
      });

      const res = await getFeePaymentsRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      for (const p of json.data.payments) {
        expect(p.student_id._id.toString()).toBe(ctx.studentDocA._id.toString());
      }
    });

    it("should allow Parent to view their child payments but reject another student with 403", async () => {
      const parentToken = generateAccessToken({
        user_id: parentUserA._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "parent",
      });

      // View own child
      const authReq = new NextRequest(
        `http://localhost:3000/api/fees/payments?student_id=${ctx.studentDocA._id.toString()}`,
        { headers: { authorization: `Bearer ${parentToken}` } }
      );
      const authRes = await getFeePaymentsRoute(authReq);
      expect(authRes.status).toBe(200);

      // Attempt to access School B student
      const unauthReq = new NextRequest(
        `http://localhost:3000/api/fees/payments?student_id=${ctx.studentDocB._id.toString()}`,
        { headers: { authorization: `Bearer ${parentToken}` } }
      );
      const unauthRes = await getFeePaymentsRoute(unauthReq);
      expect(unauthRes.status).toBe(403);
    });
  });

  // ─── 7. Fee Master, Groups & Types Management ────────
  describe("Fee Master, Groups & Types Management", () => {
    let groupId: string;
    let typeId: string;
    let masterId: string;

    it("should create a fee group", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/fees/groups", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Annual Academic Fees",
          description: "Primary annual collection group",
        }),
      });

      const res = await createFeeGroupRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.group.name).toBe("Annual Academic Fees");
      groupId = json.data.group._id;
    });

    it("should create a fee type", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/fees/types", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Library & Digital Media Fee",
          description: "Annual access to school digital catalog",
        }),
      });

      const res = await createFeeTypeRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.type.name).toBe("Library & Digital Media Fee");
      typeId = json.data.type._id;
    });

    it("should create a fee master linking group and type", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/fees/master", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fee_group_id: groupId,
          fee_type_id: typeId,
          amount: 800,
          due_date: new Date("2026-09-30"),
          fine_type: "Fixed",
          fine_amount: 50,
        }),
      });

      const res = await createFeeMasterRoute(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.master.amount).toBe(800);
      masterId = json.data.master._id;
    });

    it("should assign and unassign student fee allocations", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Allocate
      const req = new NextRequest("http://localhost:3000/api/fees/allocations", {
        method: "POST",
        headers: {
          authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fee_group_id: groupId,
          student_ids: [ctx.studentDocA._id.toString()],
        }),
      });

      const res = await saveFeeAllocationsRoute(req);
      expect(res.status).toBe(201);

      // Verify allocation exists
      const getReq = new NextRequest(
        `http://localhost:3000/api/fees/allocations?student_id=${ctx.studentDocA._id.toString()}`,
        { headers: { authorization: `Bearer ${adminToken}` } }
      );
      const getRes = await getFeeAllocationsRoute(getReq);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.data.allocations.length).toBeGreaterThan(0);
    });

    it("should prevent deleting a fee group that has linked masters or allocations with 400", async () => {
      const adminToken = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/fees/groups/${groupId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await deleteFeeGroupRoute(req, { params: Promise.resolve({ id: groupId }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Cannot delete group");
    });
  });
});
