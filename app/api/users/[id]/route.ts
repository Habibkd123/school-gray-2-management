import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/utils/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PUT /api/users/[id] - Update user details/status
export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request, ["super_admin"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;

  try {
    await connectDB();
    const body = await request.json();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Update user properties
    if (body.name !== undefined) user.name = body.name.trim();
    if (body.email !== undefined) user.email = body.email.toLowerCase().trim();
    if (body.is_active !== undefined) user.is_active = !!body.is_active;
    if (body.schoolId !== undefined) user.school_id = body.schoolId;

    await user.save();

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: "Principal",
        schoolId: user.school_id,
        is_active: user.is_active
      }
    });
  } catch (error: any) {
    console.error("[USER UPDATE ERROR]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Remove user from database
export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request, ["super_admin"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;

  try {
    await connectDB();
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    await User.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error: any) {
    console.error("[USER DELETE ERROR]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
