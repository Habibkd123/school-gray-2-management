import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";
import Student from "@/lib/models/Student";
import Teacher from "@/lib/models/Teacher";
import School from "@/lib/models/School";
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
      email: { required: true },
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
      const credential = email.toLowerCase().trim();
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credential);

      if (isEmail) {
        user = await User.findOne({
          email: credential,
          school_id,
          is_active: true,
        }).select("+password_hash");
      } else {
        // Find student with this admission_no
        const studentDoc = await Student.findOne({
          school_id,
          admission_no: { $regex: new RegExp(`^${credential}$`, "i") }
        }).select("user_id").lean();

        if (studentDoc && studentDoc.user_id) {
          user = await User.findOne({
            _id: studentDoc.user_id,
            school_id,
            is_active: true,
          }).select("+password_hash");
        }

        if (!user) {
          // Find teacher with this employee_id
          const teacherDoc = await Teacher.findOne({
            school_id,
            employee_id: { $regex: new RegExp(`^${credential}$`, "i") }
          }).select("user_id").lean();

          if (teacherDoc && teacherDoc.user_id) {
            user = await User.findOne({
              _id: teacherDoc.user_id,
              school_id,
              is_active: true,
            }).select("+password_hash");
          }
        }
      }

      if (!user) {
        return NextResponse.json(
          { success: false, message: "Invalid ID/email or password" },
          { status: 401 }
        );
      }
    }

    // ─── Check role login disable config ────────────────────────
    if (!isSuperAdminAttempt && user.school_id) {
      const schoolDoc = await School.findById(user.school_id).select("login_config").lean();
      if (schoolDoc && schoolDoc.login_config) {
        const { disable_student_login, disable_teacher_login } = schoolDoc.login_config;
        if (user.role === "student" && disable_student_login) {
          return NextResponse.json(
            { success: false, message: "Student login is currently disabled by the administrator. Please contact your school administrator for assistance." },
            { status: 403 }
          );
        }
        if (user.role === "teacher" && disable_teacher_login) {
          return NextResponse.json(
            { success: false, message: "Teacher login is currently disabled by the administrator. Please contact your school administrator for assistance." },
            { status: 403 }
          );
        }
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
