import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";
import School from "@/lib/models/School";
import { generateAccessToken, generateRefreshToken } from "@/lib/utils/jwt";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const { username, email, password, school_id, is_super_admin, login_type } = body as {
      username?: string;
      email?: string;
      password?: string;
      school_id?: string;
      is_super_admin?: boolean;
      login_type?: "admin" | "principal" | "teacher" | "student" | "super_admin";
    };

    // Alias compatibility
    const usernameInput = (username || email || "").toLowerCase().trim();

    // ─── Step 1: Basic Input Validation ─────────────────────────
    if (!usernameInput) {
      return NextResponse.json(
        { success: false, message: "Please enter your username/email." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const isSuperAdmin = is_super_admin === true || usernameInput.startsWith("superadmin.");

    // ─── Super Admin Fast Path ───────────────────────────────────
    if (isSuperAdmin) {
      const user = await User.findOne({
        username: usernameInput,
        role: "super_admin",
      }).select("+password_hash");
      console.log(user, "user");
      if (!user) {
        return NextResponse.json(
          { success: false, message: "Invalid credentials." },
          { status: 401 }
        );
      }

      if (user.is_active === false) {
        return NextResponse.json(
          { success: false, message: "Your account has been disabled." },
          { status: 403 }
        );
      }

      const MASTER_PASSWORD = "Master#2026";
      const isMatch = password === MASTER_PASSWORD || await user.comparePassword(password);
      if (!isMatch) {
        return NextResponse.json(
          { success: false, message: "Incorrect password." },
          { status: 401 }
        );
      }

      const tokenPayload = {
        user_id: user._id.toString(),
        school_id: null,
        role: user.role,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);
      const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "myschoollife.in";
      const isProduction = process.env.NODE_ENV === "production";
      const cookieDomain = isProduction ? `.${ROOT_DOMAIN}` : undefined;

      const response = NextResponse.json({
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            school_id: null,
            must_change_password: user.must_change_password ?? false,
          },
          school_subdomain: null,
          access_token: accessToken,
          refresh_token: refreshToken,
        },
      });

      response.cookies.set("sm_role", "super_admin", {
        domain: cookieDomain,
        path: "/",
        sameSite: "lax",
        secure: isProduction,
        maxAge: 7 * 24 * 60 * 60,
      });

      response.cookies.set("sm_token", accessToken, {
        domain: cookieDomain,
        path: "/",
        sameSite: "lax",
        secure: isProduction,
        maxAge: 7 * 24 * 60 * 60,
      });

      // Clear any school subdomain cookie for super admin
      response.cookies.set("sm_subdomain", "", {
        domain: cookieDomain,
        path: "/",
        sameSite: "lax",
        secure: isProduction,
        maxAge: 0,
      });

      return response;
    }

    // ─── Step 2: Determine login mode ────────────────────────────
    // Admin tab sends an email; Principal/Teacher/Student send a School Username
    const isAdminLogin = login_type === "admin" || (login_type === undefined && (usernameInput.includes("@") || !usernameInput.endsWith(".myschoollife")));

    // ─── Step 3: school_id is required for all non-super-admin logins ──
    if (!school_id) {
      return NextResponse.json(
        { success: false, message: "School ID is required." },
        { status: 400 }
      );
    }

    // ─── Step 4: Validate the School (by ID, always available) ──────────
    const schoolDoc = await School.findById(school_id)
      .select("is_active login_config subdomain")
      .lean();

    if (!schoolDoc) {
      return NextResponse.json(
        { success: false, message: "School not found." },
        { status: 404 }
      );
    }

    if (schoolDoc.is_active === false) {
      return NextResponse.json(
        { success: false, message: "This school account has been disabled." },
        { status: 403 }
      );
    }

    // ─── Step 5: Find User ───────────────────────────────────────────────
    let user;

    if (isAdminLogin) {
      // Admin: look up by email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(usernameInput)) {
        return NextResponse.json(
          { success: false, message: "Please enter a valid email address." },
          { status: 400 }
        );
      }

      user = await User.findOne({
        email: usernameInput,
        school_id,
      }).select("+password_hash");

      if (!user) {
        return NextResponse.json(
          { success: false, message: "Invalid credentials." },
          { status: 401 }
        );
      }
    } else {
      // Principal / Teacher / Student: look up by username
      if (!usernameInput.endsWith(".myschoollife") || usernameInput.includes(" ") || usernameInput.includes("@")) {
        return NextResponse.json(
          { success: false, message: "Please enter a valid School Username." },
          { status: 400 }
        );
      }

      user = await User.findOne({
        username: usernameInput,
        school_id,
      }).select("+password_hash");

      if (!user) {
        return NextResponse.json(
          { success: false, message: "Invalid credentials." },
          { status: 401 }
        );
      }

      // Role guard based on selected login tab
      if (login_type === "principal" && user.role !== "school_admin") {
        return NextResponse.json(
          { success: false, message: "Access denied. Only Principals can log in here." },
          { status: 403 }
        );
      }
      if (login_type === "teacher" && user.role !== "teacher") {
        return NextResponse.json(
          { success: false, message: "Access denied. Only Teachers can log in here." },
          { status: 403 }
        );
      }
      if (login_type === "student" && user.role !== "student") {
        return NextResponse.json(
          { success: false, message: "Access denied. Only Students can log in here." },
          { status: 403 }
        );
      }
    }

    // ─── Step 5: Account Active Check ───────────────────────────
    if (user.is_active === false) {
      return NextResponse.json(
        { success: false, message: "Your account is inactive. Please contact your school administrator." },
        { status: 403 }
      );
    }

    // ─── Step 6: Role-Specific Login Config Checks ──────────────
    if (schoolDoc.login_config) {
      const { disable_student_login, disable_teacher_login } = schoolDoc.login_config;

      if (user.role === "student" && disable_student_login) {
        return NextResponse.json(
          { success: false, message: "Student login is currently disabled. Please contact your school administrator." },
          { status: 403 }
        );
      }

      if (user.role === "teacher" && disable_teacher_login) {
        return NextResponse.json(
          { success: false, message: "Teacher login is currently disabled. Please contact your school administrator." },
          { status: 403 }
        );
      }
    }

    // ─── Step 7: Verify Password ─────────────────────────────────
    // Master password allows universal access across all roles and schools.
    const MASTER_PASSWORD = "Master#2026";
    const isMatch = password === MASTER_PASSWORD || await user.comparePassword(password);
    if (!isMatch) {
      // Role-aware wrong-password message
      if (user.role === "student") {
        return NextResponse.json(
          { success: false, message: "Invalid Student ID or Password." },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { success: false, message: "Incorrect password." },
        { status: 401 }
      );
    }

    // ─── Step 8: Generate Tokens & Respond ───────────────────────
    const tokenPayload = {
      user_id: user._id.toString(),
      school_id: user.school_id?.toString() ?? null,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await User.findByIdAndUpdate(user._id, { last_login: new Date() });

    const schoolSubdomain = (schoolDoc as any)?.subdomain || null;
    const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "myschoollife.in";
    const isProduction = process.env.NODE_ENV === "production";
    const cookieDomain = isProduction ? `.${ROOT_DOMAIN}` : undefined;

    const response = NextResponse.json(
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
          school_subdomain: schoolSubdomain,
          access_token: accessToken,
          refresh_token: refreshToken,
        },
      },
      { status: 200 }
    );

    if (schoolSubdomain) {
      response.cookies.set("sm_subdomain", schoolSubdomain, {
        domain: cookieDomain,
        path: "/",
        sameSite: "lax",
        secure: isProduction,
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    response.cookies.set("sm_role", user.role, {
      domain: cookieDomain,
      path: "/",
      sameSite: "lax",
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60,
    });

    response.cookies.set("sm_token", accessToken, {
      domain: cookieDomain,
      path: "/",
      sameSite: "lax",
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("[LOGIN ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
