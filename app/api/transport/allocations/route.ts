import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { TransportAllocation } from "@/lib/models";
import { requireAuth } from "@/lib/utils/auth";
import { sendCompressedJson } from "@/lib/compression";

// Server cache & in-flight deduplication (keyed by school_id)
const _allocationsServerCache = new Map<string, { data: any; expiresAt: number }>();
const _allocationsInFlight = new Map<string, Promise<any>>();
const ALLOCATIONS_CACHE_TTL = 60_000;

export function invalidateAllocationsCache(schoolId?: string) {
  if (schoolId) {
    _allocationsServerCache.delete(`alloc_${schoolId}`);
  } else {
    _allocationsServerCache.clear();
  }
}

export async function GET(request: NextRequest) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "super_admin", "teacher"]);
  if (error) return error;

  const cacheKey = `alloc_${schoolId}`;
  const cached = _allocationsServerCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return sendCompressedJson(request, cached.data, {
      cacheControl: "private, max-age=30, stale-while-revalidate=60",
    });
  }

  const existingInFlight = _allocationsInFlight.get(cacheKey);
  if (existingInFlight) {
    try {
      const payload = await existingInFlight;
      return sendCompressedJson(request, payload, {
        cacheControl: "private, max-age=30, stale-while-revalidate=60",
      });
    } catch (e) {
      // Fall through to retry on error
    }
  }

  try {
    const fetchPromise = (async () => {
      await connectDB();

      const allocations = await TransportAllocation.find({ school_id: schoolId })
        .populate({
          path: "student_id",
          select: "name admission_no class_id",
          populate: { path: "class_id", select: "name section" },
        })
        .populate("route_id", "routeName")
        .populate("bus_id", "busNumber")
        .sort({ createdAt: -1 })
        .lean();

      const transformed = allocations.map((alloc: any) => {
        const student = alloc.student_id;
        const classObj = student?.class_id;
        const className = classObj ? `${classObj.name}${classObj.section ? ` - ${classObj.section}` : ""}` : "N/A";

        return {
          _id: alloc._id,
          id: alloc._id.toString(),
          studentName: student?.name || "Unknown Student",
          studentId: student?._id ? student._id.toString() : "",
          admissionNo: student?.admission_no || "N/A",
          className: className,
          route: alloc.route_id?.routeName || "Unknown",
          route_id: alloc.route_id?._id ? alloc.route_id._id.toString() : "",
          busNumber: alloc.bus_id?.busNumber || "Unknown",
          bus_id: alloc.bus_id?._id ? alloc.bus_id._id.toString() : "",
          pickupStop: alloc.pickupStop,
          status: alloc.status,
          createdAt: alloc.createdAt,
        };
      });

      return { success: true, data: transformed };
    })();

    _allocationsInFlight.set(cacheKey, fetchPromise);

    const payload = await fetchPromise;
    _allocationsServerCache.set(cacheKey, {
      data: payload,
      expiresAt: Date.now() + ALLOCATIONS_CACHE_TTL,
    });
    return sendCompressedJson(request, payload, {
      cacheControl: "private, max-age=30, stale-while-revalidate=60",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    _allocationsInFlight.delete(cacheKey);
  }
}

export async function POST(request: NextRequest) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    const body = await request.json();
    await connectDB();

    const postPayload = { ...body };
    if (!postPayload.bus_id) {
      postPayload.bus_id = null;
    }

    const newAlloc = await TransportAllocation.create({
      ...postPayload,
      school_id: schoolId,
    });

    invalidateAllocationsCache(schoolId as string);

    return NextResponse.json({ success: true, data: newAlloc }, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: "Student is already allocated to a transport route" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
