import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/utils/auth";
import { validate, validationErrorResponse } from "@/lib/utils/validate";

export async function POST(request: NextRequest) {
  try {
    // ─── Auth check ───────────────────────────────────────────────
    const { user, error } = requireAuth(request);
    if (error) return error;

    const body = await request.json();

    // ─── Strict Validation ────────────────────────────────────────
    const errors = validate(body, {
      current_password: { required: true },
      new_password: {
        required: true,
        minLength: 8,
        maxLength: 100,
        match: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        matchMessage:
          "new_password must contain uppercase, lowercase, and a number",
      },
    });

    if (errors.length > 0) return validationErrorResponse(errors);

    const { current_password, new_password } = body as {
      current_password: string;
      new_password: string;
    };

    if (current_password === new_password) {
      return NextResponse.json(
        { success: false, message: "New password must be different from current password" },
        { status: 400 }
      );
    }

    await connectDB();

    // ─── Fetch user with password ─────────────────────────────────
    const dbUser = await User.findById(user!.user_id).select("+password_hash");

    if (!dbUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // ─── Verify current password ──────────────────────────────────
    const isMatch = await dbUser.comparePassword(current_password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // ─── Update password (pre-save hook will hash it) ─────────────
    dbUser.password_hash = new_password;
    dbUser.plain_password = new_password;
    // ─── Clear first-login flag if set ────────────────────────────
    if (dbUser.must_change_password) {
      dbUser.must_change_password = false;
    }
    await dbUser.save();

    return NextResponse.json(
      {
        success: true,
        message: "Password changed successfully",
        data: { must_change_password: false },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[CHANGE PASSWORD ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
