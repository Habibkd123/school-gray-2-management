import { describe, it, expect } from "vitest";
import { generateAccessToken, verifyAccessToken } from "@/lib/utils/jwt";
import { getAuthUser, requireAuth } from "@/lib/utils/auth";
import { NextRequest } from "next/server";

describe("Authentication & JWT Helpers", () => {
  it("should generate and verify a valid access token", () => {
    const payload = {
      user_id: "usr_12345",
      school_id: "sch_98765",
      role: "school_admin",
    };

    const token = generateAccessToken(payload);
    expect(token).toBeDefined();

    const decoded = verifyAccessToken(token);
    expect(decoded.user_id).toBe(payload.user_id);
    expect(decoded.school_id).toBe(payload.school_id);
    expect(decoded.role).toBe(payload.role);
  });

  it("should return null for getAuthUser when authorization header is missing", () => {
    const req = new NextRequest("http://localhost:3000/api/teachers");
    const user = getAuthUser(req);
    expect(user).toBeNull();
  });

  it("should return auth user payload when valid authorization header is present", () => {
    const payload = {
      user_id: "usr_teacher1",
      school_id: "sch_main",
      role: "teacher",
    };
    const token = generateAccessToken(payload);

    const req = new NextRequest("http://localhost:3000/api/teachers", {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const user = getAuthUser(req);
    expect(user).not.toBeNull();
    expect(user?.user_id).toBe("usr_teacher1");
    expect(user?.role).toBe("teacher");
  });

  it("should reject unauthorized request in requireAuth helper", () => {
    const req = new NextRequest("http://localhost:3000/api/teachers");
    const authResult = requireAuth(req, ["school_admin"]);

    expect(authResult.error).not.toBeNull();
    expect(authResult.user).toBeNull();
  });

  it("should grant access for authorized role in requireAuth helper", () => {
    const payload = {
      user_id: "usr_admin",
      school_id: "sch_1001",
      role: "school_admin",
    };
    const token = generateAccessToken(payload);

    const req = new NextRequest("http://localhost:3000/api/teachers", {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    const authResult = requireAuth(req, ["school_admin"]);
    expect(authResult.error).toBeNull();
    expect(authResult.userId).toBe("usr_admin");
    expect(authResult.schoolId).toBe("sch_1001");
  });
});
