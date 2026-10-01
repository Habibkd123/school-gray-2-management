import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { LeaveRequest } from "@/lib/models/index";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/utils/auth";
import { paginateQuery } from "@/lib/utils/pagination";
import { sendCompressedJson } from "@/lib/compression";

// Server cache & in-flight deduplication
const _leaveServerCache = new Map<string, { data: any; expiresAt: number }>();
const _leaveInFlight = new Map<string, Promise<any>>();
const LEAVE_CACHE_TTL = 30_000;

export function invalidateLeaveCache(schoolId?: string | null) {
  if (schoolId) {
    for (const key of _leaveServerCache.keys()) {
      if (key.startsWith(`leave_${schoolId}`)) {
        _leaveServerCache.delete(key);
      }
    }
  } else {
    _leaveServerCache.clear();
  }
}

export async function GET(req: NextRequest) {
  const { schoolId, user, role, error } = requireAuth(req, ["school_admin", "super_admin", "teacher", "student"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const userIdParam = url.searchParams.get("userId");
    const search = url.searchParams.get("search");
    const leaveType = url.searchParams.get("leaveType");
    const fromDate = url.searchParams.get("from");
    const toDate = url.searchParams.get("to");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "25"));

    // Teacher/student boundary
    const effectiveUserId = (role === "teacher" || role === "student") ? user?.user_id : (userIdParam || "");

    const cacheKey = `leave_${schoolId}_${role}_${effectiveUserId || "all"}_${status || "all"}_${leaveType || "all"}_${fromDate || ""}_${toDate || ""}_${search || ""}_${page}_${limit}`;

    const cached = _leaveServerCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return sendCompressedJson(req, cached.data, {
        cacheControl: "private, max-age=15, stale-while-revalidate=30"
      });
    }

    const existingInFlight = _leaveInFlight.get(cacheKey);
    if (existingInFlight) {
      try {
        const payload = await existingInFlight;
        return sendCompressedJson(req, payload, {
          cacheControl: "private, max-age=15, stale-while-revalidate=30"
        });
      } catch (err: any) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
      }
    }

    const queryPromise = (async () => {
      await connectToDatabase();

      const query: any = { school_id: schoolId };

      if (status) query.status = status.toLowerCase();
      if (leaveType) query.leave_type = leaveType.toLowerCase();

      if (role === "teacher" || role === "student") {
        query.user_id = user?.user_id;
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

      const responsePayload = {
        success: true,
        data: { leaves, total, page, totalPages, limit }
      };

      _leaveServerCache.set(cacheKey, { data: responsePayload, expiresAt: Date.now() + LEAVE_CACHE_TTL });
      return responsePayload;
    })();

    _leaveInFlight.set(cacheKey, queryPromise);

    const payload = await queryPromise;
    return sendCompressedJson(req, payload, {
      cacheControl: "private, max-age=15, stale-while-revalidate=30"
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  } finally {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const userIdParam = url.searchParams.get("userId");
    const search = url.searchParams.get("search");
    const leaveType = url.searchParams.get("leaveType");
    const fromDate = url.searchParams.get("from");
    const toDate = url.searchParams.get("to");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "25"));
    const effectiveUserId = (role === "teacher" || role === "student") ? user?.user_id : (userIdParam || "");
    const cacheKey = `leave_${schoolId}_${role}_${effectiveUserId || "all"}_${status || "all"}_${leaveType || "all"}_${fromDate || ""}_${toDate || ""}_${search || ""}_${page}_${limit}`;
    _leaveInFlight.delete(cacheKey);
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

    invalidateLeaveCache(schoolId);

    return NextResponse.json({ success: true, data: leave }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
