import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { token, password } = body as { token: string; password: string };

    if (!token || !password) {
      return NextResponse.json(
        { success: false, message: "Token and new password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // ─── Find user with valid (non-expired) token ─────────────────
    const user = await User.findOne({
      reset_token: token,
      reset_token_expiry: { $gt: new Date() }, // not expired
    }).select("+reset_token +reset_token_expiry +password_hash +plain_password");

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired reset token. Please request a new one." },
        { status: 400 }
      );
    }

    // ─── Update password & clear token ───────────────────────────
    user.password_hash = password; // pre-save hook will bcrypt this
    user.plain_password = null; // Do not store personalized secret password in plaintext
    user.reset_token = undefined;
    user.reset_token_expiry = undefined;
    if (user.must_change_password) {
      user.must_change_password = false;
    }
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });
  } catch (error) {
    console.error("[RESET PASSWORD ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
