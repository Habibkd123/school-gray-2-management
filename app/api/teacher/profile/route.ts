import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Teacher from "@/lib/models/Teacher";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/utils/auth";

// GET /api/teacher/profile — Get logged-in teacher's profile
export async function GET(request: NextRequest) {
  const { userId, error } = requireAuth(request, ["teacher"]);
  if (error) return error;

  try {
    await connectDB();
    const teacher = await Teacher.findOne({ user_id: userId }).lean();

    if (!teacher) {
      return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: teacher });
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
    );

    if (!updated) {
      return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 404 });
    }

    // Also update User model (name & email)
    await User.findByIdAndUpdate(userId, {
      $set: { name, email }
    });

    return NextResponse.json({ success: true, message: "Profile updated", data: updated });
  } catch (err) {
    console.error("[PATCH /api/teacher/profile]", err);
    return NextResponse.json({ success: false, message: "Failed to update profile" }, { status: 500 });
  }
}
