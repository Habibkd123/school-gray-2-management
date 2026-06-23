import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  // Check auth: only admins (school_admin / super_admin) can reset password
  const { schoolId, role, error } = requireAuth(request, ["school_admin", "super_admin"]);
  if (error) return error;

  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid user ID" },
      { status: 400 }
    );
  }

  try {
    const { password } = await request.json();
    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    await connectDB();

    const query: Record<string, any> = { _id: id };
    if (role !== "super_admin") {
      query.school_id = schoolId;
    }

    const user = await User.findOne(query);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    user.password_hash = password;
    user.plain_password = password;
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Password updated successfully"
    });
  } catch (err) {
    console.error("[POST /api/users/[id]/reset-password] Error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
