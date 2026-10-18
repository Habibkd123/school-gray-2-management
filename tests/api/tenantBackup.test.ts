import { describe, it, expect } from "vitest";
import { generateAccessToken } from "@/lib/utils/jwt";
import { GET, POST } from "@/app/api/backup/tenant/route";
import { NextRequest } from "next/server";

describe("Tenant Backup & Disaster Recovery API", () => {
  it("should reject unauthenticated request", async () => {
    const req = new NextRequest("http://localhost:3000/api/backup/tenant");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("should reject teacher role from triggering tenant backup", async () => {
    const token = generateAccessToken({
      user_id: "usr_teacher",
      school_id: "6a2790ea0d99d9775d96be6a",
      role: "teacher",
    });

    const req = new NextRequest("http://localhost:3000/api/backup/tenant", {
      headers: { authorization: `Bearer ${token}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("should reject restore when backup format is invalid", async () => {
    const token = generateAccessToken({
      user_id: "usr_admin",
      school_id: "6a2790ea0d99d9775d96be6a",
      role: "school_admin",
    });

    const req = new NextRequest("http://localhost:3000/api/backup/tenant", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ invalid: "data" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should reject restore when tenant ID does not match admin school", async () => {
    const token = generateAccessToken({
      user_id: "usr_admin",
      school_id: "6a2790ea0d99d9775d96be6a",
      role: "school_admin",
    });

    const maliciousBackup = {
      format_version: "2.0-saas",
      tenant: { id: "6ab333f5c76c479dba790075", name: "Other School" },
      data: {},
    };

    const req = new NextRequest("http://localhost:3000/api/backup/tenant", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(maliciousBackup),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.message).toContain("Tenant mismatch");
  });
});
