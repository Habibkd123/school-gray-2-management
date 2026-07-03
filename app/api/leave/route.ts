import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { LeaveRequest } from "@/lib/models/index";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/utils/auth";
import { paginateQuery } from "@/lib/utils/pagination";

export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const userIdParam = url.searchParams.get("userId");
    const search = url.searchParams.get("search");
    const leaveType = url.searchParams.get("leaveType");
    const fromDate = url.searchParams.get("from");
    const toDate = url.searchParams.get("to");

    const query: any = { school_id: schoolId };
    
    if (status) query.status = status.toLowerCase();
    if (leaveType) query.leave_type = leaveType.toLowerCase();
    
    // Only admins can see everyone's leave. Teachers/students see only their own.
    const { user } = requireAuth(req, ["school_admin", "super_admin", "teacher", "student"]);
    if (user && (user.role === "teacher" || user.role === "student")) {
      query.user_id = user.user_id;
    } else if (userIdParam) {
      query.user_id = userIdParam;
    }

    // Date Range: overlapping leave check
    if (fromDate && toDate) {
      query.from_date = { $lte: new Date(toDate) };
      query.to_date = { $gte: new Date(fromDate) };
    }

    // Search query: resolve User ID matching user name
    if (search?.trim()) {
      const trimmedSearch = search.trim();
      const matchedUsers = await User.find({
        school_id: schoolId,
        name: { $regex: trimmedSearch, $options: "i" }
      }).select("_id").lean();
      
      const userIds = matchedUsers.map(u => u._id);
      query.$or = [
        { user_id: { $in: userIds } },
        { leave_type: { $regex: trimmedSearch, $options: "i" } },
        { reason: { $regex: trimmedSearch, $options: "i" } }
      ];
    }

    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "25"));

    const { items: leaves, total, totalPages } = await paginateQuery(
      LeaveRequest,
      query,
      {
        page,
        limit,
        sort: { createdAt: -1 },
        populate: [{ path: "user_id", select: "name email role photo_url" }]
      }
    );

    return NextResponse.json({ success: true, data: { leaves, total, page, totalPages, limit } });
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
