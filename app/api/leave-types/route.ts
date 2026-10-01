import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { LeaveType } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import { sendCompressedJson } from "@/lib/compression";

// Server cache & in-flight deduplication
const _leaveTypesServerCache = new Map<string, { data: any; expiresAt: number }>();
const _leaveTypesInFlight = new Map<string, Promise<any>>();
const LEAVE_TYPES_CACHE_TTL = 60_000;

export function invalidateLeaveTypesCache(schoolId?: string | null) {
  if (schoolId) {
    for (const key of _leaveTypesServerCache.keys()) {
      if (key.startsWith(`leave_types_${schoolId}`)) {
        _leaveTypesServerCache.delete(key);
      }
    }
  } else {
    _leaveTypesServerCache.clear();
  }
}

export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin", "teacher", "student"]);
  if (error) return error;

  try {
    const cacheKey = `leave_types_${schoolId}`;
    const cached = _leaveTypesServerCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return sendCompressedJson(req, cached.data, {
        cacheControl: "private, max-age=30, stale-while-revalidate=60",
      });
    }

    const existingInFlight = _leaveTypesInFlight.get(cacheKey);
    if (existingInFlight) {
      try {
        const payload = await existingInFlight;
        return sendCompressedJson(req, payload, {
          cacheControl: "private, max-age=30, stale-while-revalidate=60",
        });
      } catch (err: any) {
        // Fall through to retry on error
      }
    }

    const fetchPromise = (async () => {
      await connectToDatabase();
      const leaveTypes = await LeaveType.find({ school_id: schoolId }).sort({ leave_type: 1 }).lean();
      return { success: true, data: leaveTypes };
    })();

    _leaveTypesInFlight.set(cacheKey, fetchPromise);

    try {
      const payload = await fetchPromise;
      _leaveTypesServerCache.set(cacheKey, {
        data: payload,
        expiresAt: Date.now() + LEAVE_TYPES_CACHE_TTL,
      });
      return sendCompressedJson(req, payload, {
        cacheControl: "private, max-age=30, stale-while-revalidate=60",
      });
    } finally {
      _leaveTypesInFlight.delete(cacheKey);
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { leave_type, status } = body;

    if (!leave_type) {
      return NextResponse.json({ success: false, message: "Leave type name is required" }, { status: 400 });
    }

    const leaveType = await LeaveType.create({
      school_id: schoolId as string,
      leave_type: leave_type.trim(),
      status: status || "Active",
    });

    invalidateLeaveTypesCache(schoolId);

    return NextResponse.json({ success: true, data: leaveType }, { status: 201 });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ success: false, message: "Leave type with this name already exists" }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
