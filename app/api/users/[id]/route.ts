import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/utils/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/users/[id] - Fetch live user data (used by LoginDetailsModal to get onboarding status)
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request, ["school_admin", "super_admin", "teacher"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;

  try {
    await connectDB();
    const query: Record<string, any> = { _id: id };
    if (auth.role !== "super_admin") {
      if (!auth.schoolId) {
        return NextResponse.json(
          { success: false, message: "No school context" },
          { status: 403 }
        );
      }
      query.school_id = auth.schoolId;
    }

    const user = await User.findOne(query).select("+plain_password name email username role is_active must_change_password").lean();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Only expose default plain_password if user hasn't changed it yet (onboarding phase)
    const safePlainPassword = user.must_change_password ? (user.plain_password || null) : null;

    return NextResponse.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        is_active: user.is_active,
        plain_password: safePlainPassword,
        must_change_password: user.must_change_password,
      }
    }, {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
  } catch (error: any) {
    console.error("[USER GET ERROR]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update user details/status
export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request, ["super_admin", "school_admin"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;

  try {
    await connectDB();
    const body = await request.json();

    const query: Record<string, any> = { _id: id };
    if (auth.role !== "super_admin") {
      if (!auth.schoolId) {
        return NextResponse.json(
          { success: false, message: "No school context" },
          { status: 403 }
        );
      }
      query.school_id = auth.schoolId;
    }

    const user = await User.findOne(query);
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
    // Only super_admin can change school assignment
    if (auth.role === "super_admin" && body.schoolId !== undefined) {
      user.school_id = body.schoolId;
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
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
