import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";
import { generateAccessToken, generateRefreshToken } from "@/lib/utils/jwt";
import { validate, validationErrorResponse } from "@/lib/utils/validate";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // ─── Check if this is a super_admin login (no school_id needed) ─────────
    const isSuperAdminAttempt = body.is_super_admin === true;

    // ─── Strict Validation ──────────────────────────────────────
    const errors = validate(body, {
      email: { required: true, isEmail: true },
      password: { required: true, minLength: 6 },
      // school_id required only for non-super_admin logins
      ...(isSuperAdminAttempt ? {} : { school_id: { required: true, isMongoId: true } }),
    });

    if (errors.length > 0) return validationErrorResponse(errors);

    const { email, password, school_id } = body as {
      email: string;
      password: string;
      school_id?: string;
    };

    // ─── Find user ────────────────────────────────────────────────────────────
    let user;

    if (isSuperAdminAttempt) {
      // Super Admin: look up globally by email + role, no school scope
      user = await User.findOne({
        email: email.toLowerCase().trim(),
        role: "super_admin",
        is_active: true,
      }).select("+password_hash");

      if (!user) {
        return NextResponse.json(
          { success: false, message: "Invalid credentials or not a Super Admin account" },
          { status: 401 }
        );
      }
    } else {
      // Regular login: scoped to school
      user = await User.findOne({
        email: email.toLowerCase().trim(),
        school_id,
        is_active: true,
      }).select("+password_hash");

      if (!user) {
        return NextResponse.json(
          { success: false, message: "Invalid email or password" },
          { status: 401 }
        );
      }
    }

    // ─── Verify password ─────────────────────────────────────────
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // ─── Generate tokens ──────────────────────────────────────────
    const tokenPayload = {
      user_id: user._id.toString(),
      school_id: user.school_id?.toString() ?? null,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // ─── Update last login ────────────────────────────────────────
    await User.findByIdAndUpdate(user._id, { last_login: new Date() });

    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            school_id: user.school_id,
            must_change_password: user.must_change_password ?? false,
          },
          access_token: accessToken,
          refresh_token: refreshToken,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[LOGIN ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
