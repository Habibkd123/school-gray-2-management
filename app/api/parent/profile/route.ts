import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Parent } from "@/lib/models";
import { requireAuth } from "@/lib/utils/auth";
import { sendCompressedJson } from "@/lib/compression";

// In-memory cache for parent profiles (TTL 60s)
const parentProfileCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60_000;

// GET /api/parent/profile — Get logged-in parent's profile
export async function GET(request: NextRequest) {
  const { userId, error } = requireAuth(request, ["parent"]);
  if (error) return error;

  const cached = parentProfileCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return sendCompressedJson(request, { success: true, data: cached.data }, { cacheControl: "private, max-age=60" });
  }

  try {
    await connectDB();
    const parent = await Parent.findOne({ user_id: userId }).lean();

    if (!parent) {
      return NextResponse.json({ success: false, message: "Parent profile not found" }, { status: 404 });
    }

    parentProfileCache.set(userId, { data: parent, timestamp: Date.now() });
    return sendCompressedJson(request, { success: true, data: parent }, { cacheControl: "private, max-age=60" });
  } catch (err) {
    console.error("[GET /api/parent/profile]", err);
    return NextResponse.json({ success: false, message: "Failed to fetch profile" }, { status: 500 });
  }
}

// PATCH /api/parent/profile — Update logged-in parent's profile
export async function PATCH(request: NextRequest) {
  const { userId, error } = requireAuth(request, ["parent"]);
  if (error) return error;

  try {
    await connectDB();
    const body = await request.json();

    // Only allow safe fields to be updated
    const { name, phone, email, address, occupation, photo_url } = body;

    const updated = await Parent.findOneAndUpdate(
      { user_id: userId },
      { $set: { name, phone, email, address, occupation, photo_url } },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ success: false, message: "Parent profile not found" }, { status: 404 });
    }

    // Invalidate cache
    parentProfileCache.delete(userId);

    return sendCompressedJson(request, { success: true, message: "Profile updated", data: updated });
  } catch (err) {
    console.error("[PATCH /api/parent/profile]", err);
    return NextResponse.json({ success: false, message: "Failed to update profile" }, { status: 500 });
  }
}
