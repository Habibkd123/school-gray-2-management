import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { setupTestDatabase, teardownTestDatabase, TestDataContext } from "../helpers/dbTestSetup";
import { GET as getUsersRoute } from "@/app/api/users/route";
import {
  GET as getUserByIdRoute,
  PUT as updateUserRoute,
  DELETE as deleteUserRoute,
} from "@/app/api/users/[id]/route";
import { POST as resetUserPasswordRoute } from "@/app/api/users/[id]/reset-password/route";
import { generateAccessToken } from "@/lib/utils/jwt";
import User from "@/lib/models/User";

let ctx: TestDataContext;

beforeAll(async () => {
  ctx = await setupTestDatabase("users");
}, 25000);

afterAll(async () => {
  await teardownTestDatabase("users");
}, 25000);

describe("Deep Users CRUD, RBAC & IDOR Test Suite", () => {
  // ─── 1. GET /api/users (List School Admins) ──────────────────────
  describe("GET /api/users", () => {
    it("should allow Super Admin to list school admins with pagination", async () => {
      const token = generateAccessToken({
        user_id: ctx.superAdmin._id.toString(),
        school_id: null,
        role: "super_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/users?page=1&limit=10", {
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getUsersRoute(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.users)).toBe(true);
      expect(json.data.page).toBe(1);
      expect(json.data.limit).toBe(10);
    });

    it("should reject School Admin from listing all system users (RBAC)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest("http://localhost:3000/api/users", {
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getUsersRoute(req);
      expect(res.status).toBe(403);
    });

    it("should reject Teacher from accessing /api/users (RBAC)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolATeacher._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "teacher",
      });

      const req = new NextRequest("http://localhost:3000/api/users", {
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getUsersRoute(req);
      expect(res.status).toBe(403);
    });

    it("should reject unauthenticated request with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/users");
      const res = await getUsersRoute(req);
      expect(res.status).toBe(401);
    });
  });

  // ─── 2. GET /api/users/[id] (Read User & IDOR Prevention) ───────
  describe("GET /api/users/[id]", () => {
    it("should allow School A Admin to read School A Teacher", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/users/${ctx.schoolATeacher._id}`, {
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getUserByIdRoute(req, {
        params: Promise.resolve({ id: ctx.schoolATeacher._id.toString() }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.email).toBe(ctx.schoolATeacher.email);
    });

    it("should BLOCK School A Admin from reading School B Teacher (IDOR Defense)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Target belongs to School B!
      const targetId = ctx.schoolBTeacher._id.toString();

      const req = new NextRequest(`http://localhost:3000/api/users/${targetId}`, {
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getUserByIdRoute(req, {
        params: Promise.resolve({ id: targetId }),
      });

      // Must be 404 (tenant-isolated query doesn't find it) or 403 Forbidden
      expect([403, 404]).toContain(res.status);
    });

    it("should allow Super Admin to read user from any school", async () => {
      const token = generateAccessToken({
        user_id: ctx.superAdmin._id.toString(),
        school_id: null,
        role: "super_admin",
      });

      const targetId = ctx.schoolBStudent._id.toString();

      const req = new NextRequest(`http://localhost:3000/api/users/${targetId}`, {
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getUserByIdRoute(req, {
        params: Promise.resolve({ id: targetId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.email).toBe(ctx.schoolBStudent.email);
    });

    it("should handle invalid/non-ObjectId string with 400 Bad Request instead of 500", async () => {
      const token = generateAccessToken({
        user_id: ctx.superAdmin._id.toString(),
        school_id: null,
        role: "super_admin",
      });

      const invalidId = "invalid_not_an_object_id";

      const req = new NextRequest(`http://localhost:3000/api/users/${invalidId}`, {
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await getUserByIdRoute(req, {
        params: Promise.resolve({ id: invalidId }),
      });

      expect([400, 404]).toContain(res.status);
      expect(res.status).not.toBe(500);
    });
  });

  // ─── 3. PUT /api/users/[id] (Update User & IDOR Prevention) ───────
  describe("PUT /api/users/[id]", () => {
    it("should allow School A Admin to update details of School A Student", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const targetId = ctx.schoolAStudent._id.toString();

      const req = new NextRequest(`http://localhost:3000/api/users/${targetId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Alice Updated Name" }),
      });

      const res = await updateUserRoute(req, {
        params: Promise.resolve({ id: targetId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      const check = await User.findById(targetId);
      expect(check?.name).toBe("Alice Updated Name");
    });

    it("should BLOCK School A Admin from updating School B Student (IDOR Defense)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Target belongs to School B!
      const targetId = ctx.schoolBStudent._id.toString();

      const req = new NextRequest(`http://localhost:3000/api/users/${targetId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Hacked by School A" }),
      });

      const res = await updateUserRoute(req, {
        params: Promise.resolve({ id: targetId }),
      });

      expect([403, 404]).toContain(res.status);

      // Verify the name was NOT altered in DB
      const check = await User.findById(targetId);
      expect(check?.name).not.toBe("Hacked by School A");
    });

    it("should reject Teacher role from updating user accounts (RBAC)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolATeacher._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "teacher",
      });

      const targetId = ctx.schoolAStudent._id.toString();

      const req = new NextRequest(`http://localhost:3000/api/users/${targetId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Teacher Hack Attempt" }),
      });

      const res = await updateUserRoute(req, {
        params: Promise.resolve({ id: targetId }),
      });

      expect(res.status).toBe(403);
    });

    it("should cleanly handle invalid ObjectId with 400 Bad Request instead of 500", async () => {
      const token = generateAccessToken({
        user_id: ctx.superAdmin._id.toString(),
        school_id: null,
        role: "super_admin",
      });

      const invalidId = "malformed_id_123";

      const req = new NextRequest(`http://localhost:3000/api/users/${invalidId}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "New Name" }),
      });

      const res = await updateUserRoute(req, {
        params: Promise.resolve({ id: invalidId }),
      });

      expect([400, 404]).toContain(res.status);
      expect(res.status).not.toBe(500);
    });
  });

  // ─── 4. DELETE /api/users/[id] (Remove User & RBAC) ──────────────
  describe("DELETE /api/users/[id]", () => {
    it("should reject School Admin from deleting a user (Only Super Admin can DELETE)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const targetId = ctx.schoolAStudent._id.toString();

      const req = new NextRequest(`http://localhost:3000/api/users/${targetId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await deleteUserRoute(req, {
        params: Promise.resolve({ id: targetId }),
      });

      expect(res.status).toBe(403);
    });

    it("should allow Super Admin to delete a user", async () => {
      // Create a temporary user to delete
      const tempUser = await User.create({
        name: "Temporary User To Delete",
        email: "temp.delete@testschool.com",
        username: "temp.delete.myschoollife",
        password_hash: "hash",
        role: "student",
        school_id: ctx.schoolA._id,
      });

      const token = generateAccessToken({
        user_id: ctx.superAdmin._id.toString(),
        school_id: null,
        role: "super_admin",
      });

      const req = new NextRequest(`http://localhost:3000/api/users/${tempUser._id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await deleteUserRoute(req, {
        params: Promise.resolve({ id: tempUser._id.toString() }),
      });

      expect(res.status).toBe(200);

      const check = await User.findById(tempUser._id);
      expect(check).toBeNull();
    });

    it("should handle invalid ObjectId in DELETE with 400 Bad Request instead of 500", async () => {
      const token = generateAccessToken({
        user_id: ctx.superAdmin._id.toString(),
        school_id: null,
        role: "super_admin",
      });

      const invalidId = "not_valid_id";

      const req = new NextRequest(`http://localhost:3000/api/users/${invalidId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await deleteUserRoute(req, {
        params: Promise.resolve({ id: invalidId }),
      });

      expect([400, 404]).toContain(res.status);
      expect(res.status).not.toBe(500);
    });
  });

  // ─── 5. POST /api/users/[id]/reset-password (Admin Reset & IDOR) ──
  describe("POST /api/users/[id]/reset-password", () => {
    it("should allow School A Admin to reset password for School A Student", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const targetId = ctx.schoolAStudent._id.toString();

      const req = new NextRequest(`http://localhost:3000/api/users/${targetId}/reset-password`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: "NewStudentPass123#" }),
      });

      const res = await resetUserPasswordRoute(req, {
        params: Promise.resolve({ id: targetId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("should BLOCK School A Admin from resetting password of School B Student (IDOR Account Takeover Prevention)", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      // Target belongs to School B!
      const targetId = ctx.schoolBStudent._id.toString();

      const req = new NextRequest(`http://localhost:3000/api/users/${targetId}/reset-password`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: "HackedPassword123#" }),
      });

      const res = await resetUserPasswordRoute(req, {
        params: Promise.resolve({ id: targetId }),
      });

      expect([403, 404]).toContain(res.status);

      // Verify the password was NOT changed to hacked password
      const student = await User.findById(targetId).select("+password_hash");
      const match = await student?.comparePassword("HackedPassword123#");
      expect(match).toBe(false);
    });

    it("should reject password shorter than 6 characters with 400", async () => {
      const token = generateAccessToken({
        user_id: ctx.schoolAAdmin._id.toString(),
        school_id: ctx.schoolA._id.toString(),
        role: "school_admin",
      });

      const targetId = ctx.schoolAStudent._id.toString();

      const req = new NextRequest(`http://localhost:3000/api/users/${targetId}/reset-password`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: "123" }),
      });

      const res = await resetUserPasswordRoute(req, {
        params: Promise.resolve({ id: targetId }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("at least 6 characters");
    });
  });
});
