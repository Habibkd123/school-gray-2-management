import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";
import School from "@/lib/models/School";
import { requireAuth } from "@/lib/utils/auth";

export async function GET(request: NextRequest) {
  try {
    // ─── Auth check ───────────────────────────────────────────────
    const { user, error } = requireAuth(request);
    if (error) return error;

    await connectDB();

    // ─── Fetch fresh user data from DB ────────────────────────────
    const dbUser = await User.findById(user!.user_id).select(
      "-password_hash -reset_token -reset_token_expiry"
    );

    if (!dbUser || !dbUser.is_active) {
      return NextResponse.json(
        { success: false, message: "User not found or deactivated" },
        { status: 404 }
      );
    }

    let schoolData = null;
    if (dbUser.school_id) {
      const schoolDoc = await School.findById(dbUser.school_id)
        .select("name subtitle logo_url subdomain")
        .lean();
      if (schoolDoc) {
        schoolData = {
          id: (schoolDoc as any)._id,
          name: (schoolDoc as any).name?.trim(),
          subtitle: (schoolDoc as any).subtitle?.trim(),
          logo_url: (schoolDoc as any).logo_url,
          subdomain: (schoolDoc as any).subdomain,
        };
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: dbUser._id,
          name: dbUser.name,
          email: dbUser.email,
          username: dbUser.username,
          role: dbUser.role,
          school_id: dbUser.school_id,
          school: schoolData,
          is_active: dbUser.is_active,
          last_login: dbUser.last_login,
          createdAt: dbUser.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[ME ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
