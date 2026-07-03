import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/utils/auth";
import { paginateQuery } from "@/lib/utils/pagination";

// GET /api/users - List all school administrators (Principals/School Admins)
export async function GET(request: NextRequest) {
  const auth = requireAuth(request, ["super_admin"]);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "25"));

    const { items: users, total, totalPages } = await paginateQuery(
      User,
      { role: "school_admin" },
      {
        page,
        limit,
        sort: { createdAt: -1 }
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        users: users.map((user: any) => ({
          id: user._id,
          name: user.name,
          email: user.email,
          role: "Principal", // Display format matching frontend expectations
          schoolId: user.school_id,
          is_active: user.is_active,
          createdAt: user.createdAt
        })),
        total,
        page,
        totalPages,
        limit
      }
    });
  } catch (error: any) {
    console.error("[USERS GET ERROR]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}
