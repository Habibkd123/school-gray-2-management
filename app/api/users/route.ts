import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/utils/auth";

// GET /api/users - List all school administrators (Principals/School Admins)
export async function GET(request: NextRequest) {
  const auth = requireAuth(request, ["super_admin"]);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    // Retrieve users with school_admin role
    const users = await User.find({ role: "school_admin" }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: "Principal", // Display format matching frontend expectations
        schoolId: user.school_id,
        is_active: user.is_active,
        createdAt: user.createdAt
      }))
    });
  } catch (error: any) {
    console.error("[USERS GET ERROR]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}
