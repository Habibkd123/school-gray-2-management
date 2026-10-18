import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { generateAccessToken } from "@/lib/utils/jwt";
import { DELETE as deletePayment, PATCH as patchPayment } from "@/app/api/fees/payments/route";

describe("Soft-Delete, Payment Voiding, Restore & Permanent Purge Tests", () => {
  it("should reject DELETE payment request if unauthorized", async () => {
    const req = new NextRequest("http://localhost:3000/api/fees/payments?id=pmt_123", {
      method: "DELETE",
    });

    const res = await deletePayment(req);
    expect(res.status).toBe(401);
  });

  it("should reject DELETE payment request if missing payment ID", async () => {
    const token = generateAccessToken({
      user_id: "usr_admin",
      school_id: "sch_123456789012345678901234",
      role: "school_admin",
    });

    const req = new NextRequest("http://localhost:3000/api/fees/payments", {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const res = await deletePayment(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.message).toContain("Payment ID is required");
  });

  it("should reject PATCH restore request if unauthorized", async () => {
    const req = new NextRequest("http://localhost:3000/api/fees/payments?id=pmt_123&action=restore", {
      method: "PATCH",
    });

    const res = await patchPayment(req);
    expect(res.status).toBe(401);
  });

  it("should reject PATCH restore request if missing payment ID", async () => {
    const token = generateAccessToken({
      user_id: "usr_admin",
      school_id: "sch_123456789012345678901234",
      role: "school_admin",
    });

    const req = new NextRequest("http://localhost:3000/api/fees/payments?action=restore", {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const res = await patchPayment(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.message).toContain("Payment ID is required");
  });
});

