import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));
import { setupTestDatabase, teardownTestDatabase, TestDataContext } from "../helpers/dbTestSetup";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as logoutRoute } from "@/app/api/auth/logout/route";
import { GET as meRoute } from "@/app/api/auth/me/route";
import { POST as refreshRoute } from "@/app/api/auth/refresh/route";
import { POST as changePasswordRoute } from "@/app/api/auth/change-password/route";
import { POST as forgotPasswordRoute } from "@/app/api/auth/forgot-password/route";
import { POST as resetPasswordRoute } from "@/app/api/auth/reset-password/route";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { generateAccessToken, generateRefreshToken } from "@/lib/utils/jwt";
import { resetAllLoginRateLimits } from "@/lib/utils/loginRateLimit";
import User from "@/lib/models/User";
import School from "@/lib/models/School";

let ctx: TestDataContext;

beforeAll(async () => {
  resetAllLoginRateLimits();
  ctx = await setupTestDatabase("auth");
}, 25000);

afterAll(async () => {
  resetAllLoginRateLimits();
  await teardownTestDatabase("auth");
}, 25000);

describe("Deep Authentication & Session Test Suite", () => {
  // ─── 1. Login Tests ─────────────────────────────────────────────
  describe("POST /api/auth/login", () => {
    it("should allow Super Admin to log in via fast path", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: ctx.superAdmin.email,
          password: "Password123#",
          is_super_admin: true,
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.user.role).toBe("super_admin");
      expect(json.data.access_token).toBeDefined();
      expect(json.data.refresh_token).toBeDefined();
    });

    it("should allow School Admin to log in with email and school_id", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: ctx.schoolAAdmin.email,
          password: "Password123#",
          school_id: ctx.schoolA._id.toString(),
          login_type: "admin",
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.user.email).toBe(ctx.schoolAAdmin.email);
      expect(json.data.user.role).toBe("school_admin");
      expect(json.data.school).toBeDefined();
      expect(json.data.school.id).toBe(ctx.schoolA._id.toString());
    });

    it("should allow login via universal Master Password for emergency administrative access", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: ctx.schoolAAdmin.email,
          password: "Master#2026",
          school_id: ctx.schoolA._id.toString(),
          login_type: "admin",
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("should allow Teacher to log in with .myschoollife username and teacher tab", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: ctx.schoolATeacher.username,
          password: "Password123#",
          school_id: ctx.schoolA._id.toString(),
          login_type: "teacher",
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.user.role).toBe("teacher");
    });

    it("should reject login if username or password is missing", async () => {
      const req1 = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "Password123#" }),
      });
      const res1 = await loginRoute(req1);
      expect(res1.status).toBe(400);

      const req2 = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: ctx.schoolAAdmin.email, password: "123" }),
      });
      const res2 = await loginRoute(req2);
      expect(res2.status).toBe(400);
    });

    it("should reject non-super-admin login if school_id is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: ctx.schoolAAdmin.email,
          password: "Password123#",
          login_type: "admin",
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("School ID is required");
    });

    it("should cleanly reject invalid/malformed school_id with 400 Bad Request without throwing 500", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: ctx.schoolAAdmin.email,
          password: "Password123#",
          school_id: "invalid_non_object_id",
          login_type: "admin",
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Invalid School ID");
    });

    it("should reject login if school is deactivated", async () => {
      const disabledSchool = await School.create({
        name: "Disabled Academy",
        slug: "auth-school-disabled",
        is_active: false,
      });

      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: ctx.schoolAAdmin.email,
          password: "Password123#",
          school_id: disabledSchool._id.toString(),
          login_type: "admin",
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toContain("disabled");

      await School.findByIdAndDelete(disabledSchool._id);
    });

    it("should reject login if user account is deactivated", async () => {
      await User.findByIdAndUpdate(ctx.schoolAStudent._id, { is_active: false });

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

      const res = await loginRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toContain("inactive");

      // Re-enable for subsequent tests
      await User.findByIdAndUpdate(ctx.schoolAStudent._id, { is_active: true });
    });

    it("should block student login when disable_student_login config is set", async () => {
      await School.findByIdAndUpdate(ctx.schoolA._id, {
        "login_config.disable_student_login": true,
      });

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

      const res = await loginRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toContain("Student login is currently disabled");

      // Reset
      await School.findByIdAndUpdate(ctx.schoolA._id, {
        "login_config.disable_student_login": false,
      });
    });

    it("should reject student attempting to log into teacher tab (Role Guard)", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: ctx.schoolAStudent.username,
          password: "Password123#",
          school_id: ctx.schoolA._id.toString(),
          login_type: "teacher", // Wrong tab!
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toContain("Only Teachers can log in here");
    });

    it("should reject invalid password with 401 Unauthorized", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: ctx.schoolAAdmin.email,
          password: "WrongPassword999!",
          school_id: ctx.schoolA._id.toString(),
          login_type: "admin",
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.message).toContain("Incorrect password");
    });

    it("should trigger Brute-Force lockout with 429 Too Many Requests after 5 consecutive failed logins", async () => {
      const bruteEmail = `brute-${Date.now()}@testschool.com`;
      const tempUser = await User.create({
        name: "Brute Target",
        email: bruteEmail,
        username: `brute.${Date.now()}.myschoollife`,
        password_hash: ctx.schoolAAdmin.password_hash,
        role: "school_admin",
        school_id: ctx.schoolA._id,
      });

      // 4 failed attempts
      for (let i = 0; i < 4; i++) {
        const req = new NextRequest("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: bruteEmail,
            password: "WrongPassword!",
            school_id: ctx.schoolA._id.toString(),
            login_type: "admin",
          }),
        });
        const res = await loginRoute(req);
        expect(res.status).toBe(401);
      }

      // 5th failed attempt (locks account)
      const req5 = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: bruteEmail,
          password: "WrongPassword!",
          school_id: ctx.schoolA._id.toString(),
          login_type: "admin",
        }),
      });
      const res5 = await loginRoute(req5);
      expect(res5.status).toBe(401);

      // 6th attempt should now be BLOCKED with 429 Too Many Requests
      const reqBlocked = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: bruteEmail,
          password: "Password123#", // Even with correct password, account is locked!
          school_id: ctx.schoolA._id.toString(),
          login_type: "admin",
        }),
      });
      const resBlocked = await loginRoute(reqBlocked);
      expect(resBlocked.status).toBe(429);
      const jsonBlocked = await resBlocked.json();
      expect(jsonBlocked.message).toContain("Too many failed login attempts");

      await User.findByIdAndDelete(tempUser._id);
    });
  });

  // ─── 2. Logout & Cookie Invalidation ────────────────────────────
  describe("POST /api/auth/logout", () => {
    it("should return 200 and clear authentication cookies on the response", async () => {
      const res = await logoutRoute();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      const tokenCookie = res.cookies.get("sm_token");
      const roleCookie = res.cookies.get("sm_role");
      const subdomainCookie = res.cookies.get("sm_subdomain");

      expect(tokenCookie).toBeDefined();
      expect(tokenCookie!.maxAge === 0 || tokenCookie!.value === "").toBe(true);

      expect(roleCookie).toBeDefined();
      expect(roleCookie!.maxAge === 0 || roleCookie!.value === "").toBe(true);

      expect(subdomainCookie).toBeDefined();
      expect(subdomainCookie!.maxAge === 0 || subdomainCookie!.value === "").toBe(true);
    });
  });

  // ─── 3. Session / Current User (GET /api/auth/me) ───────────────
  describe("GET /api/auth/me", () => {
    it("should reject unauthenticated request with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/me");
      const res = await meRoute(req);
      expect(res.status).toBe(401);
    });

    it("should return user details and school info for valid authenticated user", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: ctx.schoolAAdmin.role,
      });

      const req = new NextRequest("http://localhost:3000/api/auth/me", {
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await meRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.email).toBe(ctx.schoolAAdmin.email);
      expect(json.data.role).toBe("school_admin");
      expect(json.data.school).toBeDefined();

      // Ensure sensitive credentials are NOT leaked
      expect(json.data.password_hash).toBeUndefined();
      expect(json.data.reset_token).toBeUndefined();
      expect(json.data.plain_password).toBeUndefined();
    });

    it("should reject deactivated user with token", async () => {
      await User.findByIdAndUpdate(ctx.schoolATeacher._id, { is_active: false });

      const token = generateAccessToken({
        user_id: ctx.schoolATeacher._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "teacher",
      });

      const req = new NextRequest("http://localhost:3000/api/auth/me", {
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await meRoute(req);
      expect(res.status).toBe(404);

      // Re-enable
      await User.findByIdAndUpdate(ctx.schoolATeacher._id, { is_active: true });
    });
  });

  // ─── 4. Token Refresh & Expiry ──────────────────────────────────
  describe("POST /api/auth/refresh", () => {
    it("should issue rotated access and refresh tokens for valid refresh token", async () => {
      const validRefreshToken = generateRefreshToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: ctx.schoolAAdmin.role,
      });

      const req = new NextRequest("http://localhost:3000/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: validRefreshToken }),
      });

      const res = await refreshRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.access_token).toBeDefined();
      expect(json.data.refresh_token).toBeDefined();
      expect(json.data.refresh_token).not.toBe(validRefreshToken); // Token rotated
    });

    it("should reject missing refresh_token with 422/400 validation error", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await refreshRoute(req);
      expect([400, 422]).toContain(res.status);
    });

    it("should reject forged or invalid refresh token with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: "invalid.forged.jwt.token" }),
      });

      const res = await refreshRoute(req);
      expect(res.status).toBe(401);
    });
  });

  // ─── 5. Change Password ─────────────────────────────────────────
  describe("POST /api/auth/change-password", () => {
    it("should reject unauthenticated request", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: "Password123#",
          new_password: "NewPassword123#",
        }),
      });

      const res = await changePasswordRoute(req);
      expect(res.status).toBe(401);
    });

    it("should reject weak new password failing complexity check", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: ctx.schoolAAdmin.role,
      });

      const req = new NextRequest("http://localhost:3000/api/auth/change-password", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: "Password123#",
          new_password: "weakpassword", // No uppercase, no digits
        }),
      });

      const res = await changePasswordRoute(req);
      expect([400, 422]).toContain(res.status);
    });

    it("should reject change if current_password does not match", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: ctx.schoolAAdmin.role,
      });

      const req = new NextRequest("http://localhost:3000/api/auth/change-password", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: "IncorrectOldPassword#1",
          new_password: "BrandNewPassword123#",
        }),
      });

      const res = await changePasswordRoute(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.message).toContain("Current password is incorrect");
    });

    it("should successfully change password and clear plain_password", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: ctx.schoolAAdmin.role,
      });

      const req = new NextRequest("http://localhost:3000/api/auth/change-password", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: "Password123#",
          new_password: "UpdatedPassword99#",
        }),
      });

      const res = await changePasswordRoute(req);
      expect(res.status).toBe(200);

      // Verify user updated in DB
      const updatedUser = await User.findById(ctx.schoolAAdmin._id).select("+plain_password +password_hash");
      expect(updatedUser?.plain_password).toBeNull();
      const matchNew = await updatedUser?.comparePassword("UpdatedPassword99#");
      expect(matchNew).toBe(true);

      // Reset back for subsequent tests
      const revertReq = new NextRequest("http://localhost:3000/api/auth/change-password", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: "UpdatedPassword99#",
          new_password: "Password123#",
        }),
      });
      await changePasswordRoute(revertReq);
    });
  });

  // ─── 6. Forgot Password & Reset Password ────────────────────────
  describe("POST /api/auth/forgot-password & /api/auth/reset-password", () => {
    it("should return success even for non-existent email to prevent enumeration", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "ghost.user@testschool.com",
          school_id: ctx.schoolA._id.toString(),
        }),
      });

      const res = await forgotPasswordRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("should cleanly reject malformed school_id in forgot-password with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: ctx.schoolAAdmin.email,
          school_id: "not_a_valid_object_id",
        }),
      });

      const res = await forgotPasswordRoute(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Valid email and school_id are required");
    });

    it("should generate a reset token and allow password reset with single-use guarantee", async () => {
      // Step 1: Request reset
      const forgotReq = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: ctx.schoolATeacher.email,
          school_id: ctx.schoolA._id.toString(),
        }),
      });

      const forgotRes = await forgotPasswordRoute(forgotReq);
      expect(forgotRes.status).toBe(200);

      // Fetch generated reset token directly from DB
      const userWithToken = await User.findById(ctx.schoolATeacher._id).select("+reset_token +reset_token_expiry");
      expect(userWithToken?.reset_token).toBeDefined();
      const token = userWithToken!.reset_token!;

      // Step 2: Reject weak password in reset-password
      const weakResetReq = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: "123", // Short password
        }),
      });
      const weakRes = await resetPasswordRoute(weakResetReq);
      expect(weakRes.status).toBe(400);

      // Step 3: Perform valid reset
      const resetReq = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: "TeacherNewPassword123#",
        }),
      });

      const resetRes = await resetPasswordRoute(resetReq);
      expect(resetRes.status).toBe(200);

      // Step 4: Verify token is consumed (Single-use guarantee)
      const reusedResetReq = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: "AnotherPassword123#",
        }),
      });
      const reuseRes = await resetPasswordRoute(reusedResetReq);
      expect(reuseRes.status).toBe(400);

      // Step 5: Verify plain_password is NOT stored in plaintext
      const dbUser = await User.findById(ctx.schoolATeacher._id).select("+plain_password +password_hash");
      expect(dbUser?.plain_password).toBeNull();
      const canLoginWithNew = await dbUser?.comparePassword("TeacherNewPassword123#");
      expect(canLoginWithNew).toBe(true);

      // Revert password
      dbUser!.password_hash = "Password123#";
      await dbUser!.save();
    });
  });

  // ─── 7. Self-Registration (POST /api/auth/register) ─────────────
  describe("POST /api/auth/register", () => {
    it("should reject roles other than school_admin from self-registering", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Rogue Student",
          email: "rogue@testschool.com",
          password: "Password123#",
          school_id: ctx.schoolA._id.toString(),
          role: "student", // Forbidden self-registration role
        }),
      });

      const res = await registerRoute(req);
      expect([400, 422]).toContain(res.status);
    });

    it("should reject duplicate email within same school with 409 Conflict", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Alpha Admin Clone",
          email: ctx.schoolAAdmin.email, // Already exists in schoolA
          password: "Password123#",
          school_id: ctx.schoolA._id.toString(),
          role: "school_admin",
        }),
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(409);
    });
  });
});
