import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Teacher from "@/lib/models/Teacher";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/utils/auth";
import { sendCompressedJson } from "@/lib/compression";

// In-memory cache for teacher profiles (TTL 60s)
const teacherProfileCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60_000;

// GET /api/teacher/profile — Get logged-in teacher's profile
export async function GET(request: NextRequest) {
  const { userId, error } = requireAuth(request, ["teacher"]);
  if (error) return error;

  const cached = teacherProfileCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return sendCompressedJson(request, { success: true, data: cached.data }, { cacheControl: "private, max-age=60" });
  }

  try {
    await connectDB();
    const teacher = await Teacher.findOne({ user_id: userId }).lean();

    if (!teacher) {
      return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });
    }

    teacherProfileCache.set(userId, { data: teacher, timestamp: Date.now() });
    return sendCompressedJson(request, { success: true, data: teacher }, { cacheControl: "private, max-age=60" });
  } catch (err) {
    console.error("[GET /api/teacher/profile]", err);
    return NextResponse.json({ success: false, message: "Failed to fetch profile" }, { status: 500 });
  }
}

// PATCH /api/teacher/profile — Update logged-in teacher's profile
export async function PATCH(request: NextRequest) {
  const { userId, error } = requireAuth(request, ["teacher"]);
  if (error) return error;

  try {
    await connectDB();
    const body = await request.json();

    // Only allow safe fields to be updated
    const { name, phone, email, address, photo_url } = body;

    const updated = await Teacher.findOneAndUpdate(
      { user_id: userId },
      { $set: { name, phone, email, address, photo_url } },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });
    }

    // Invalidate cache
    teacherProfileCache.delete(userId);

    // Also update User model (name & email)
    await User.findByIdAndUpdate(userId, {
      $set: { name, email }
    });

    return sendCompressedJson(request, { success: true, message: "Profile updated", data: updated });
  } catch (err) {
    console.error("[PATCH /api/teacher/profile]", err);
    return NextResponse.json({ success: false, message: "Failed to update profile" }, { status: 500 });
  }
}
