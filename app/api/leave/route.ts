import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { LeaveRequest } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";

export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const userIdParam = url.searchParams.get("userId");
    const query: any = { school_id: schoolId };
    if (status) query.status = status;
    
    // Only admins can see everyone's leave. Teachers/students see only their own.
    const { user } = requireAuth(req, ["school_admin", "super_admin", "teacher", "student"]);
    if (user && (user.role === "teacher" || user.role === "student")) {
      query.user_id = user.user_id;
    } else if (userIdParam) {
      query.user_id = userIdParam;
    }

    const leaves = await LeaveRequest.find(query)
      .sort({ createdAt: -1 })
      .populate("user_id", "name email role photo_url");

    return NextResponse.json({ success: true, data: { leaves } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { schoolId, user, error } = requireAuth(req, ["teacher", "school_admin", "super_admin", "student", "parent"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { leave_type, from_date, to_date, reason, user_id } = body;

    if (!leave_type || !from_date || !to_date) {
      return NextResponse.json({ success: false, message: "leave_type, from_date, to_date are required" }, { status: 400 });
    }

    const from = new Date(from_date);
    const to = new Date(to_date);
    const total_days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const leave = await LeaveRequest.create({
      school_id: schoolId!,
      user_id: user_id || user?.user_id || schoolId!,
      leave_type,
      from_date: from,
      to_date: to,
      total_days,
      reason: reason?.trim(),
      status: "pending",
    });

    return NextResponse.json({ success: true, data: leave }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
