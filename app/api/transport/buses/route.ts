import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Bus, Route } from "@/lib/models";
import { requireAuth } from "@/lib/utils/auth";
import { sendCompressedJson } from "@/lib/compression";

// Server cache & in-flight deduplication (keyed by school_id)
const _busesServerCache = new Map<string, { data: any; expiresAt: number }>();
const _busesInFlight = new Map<string, Promise<any>>();
const BUSES_CACHE_TTL = 60_000;

export function invalidateBusesCache(schoolId?: string) {
  if (schoolId) {
    _busesServerCache.delete(`buses_${schoolId}`);
  } else {
    _busesServerCache.clear();
  }
}

export async function GET(request: NextRequest) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "super_admin", "teacher"]);
  if (error) return error;

  const cacheKey = `buses_${schoolId}`;
  const cached = _busesServerCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return sendCompressedJson(request, cached.data, {
      cacheControl: "private, max-age=30, stale-while-revalidate=60",
    });
  }

  const existingInFlight = _busesInFlight.get(cacheKey);
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
      const buses = await Bus.find({ school_id: schoolId }).sort({ createdAt: -1 }).lean();
      return { success: true, data: buses };
    })();

    _busesInFlight.set(cacheKey, fetchPromise);

    const payload = await fetchPromise;
    _busesServerCache.set(cacheKey, {
      data: payload,
      expiresAt: Date.now() + BUSES_CACHE_TTL,
    });
    return sendCompressedJson(request, payload, {
      cacheControl: "private, max-age=30, stale-while-revalidate=60",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    _busesInFlight.delete(cacheKey);
  }
}

export async function POST(request: NextRequest) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    const body = await request.json();
    await connectDB();

    const newBus = await Bus.create({
      ...body,
      school_id: schoolId,
    });

    if (newBus.assignedRoute && newBus.assignedRoute !== "Not Assigned") {
      await Route.findOneAndUpdate(
        { school_id: schoolId, routeName: newBus.assignedRoute },
        { assignedBus: newBus.busNumber }
      );
    }

    invalidateBusesCache(schoolId as string);

    return NextResponse.json({ success: true, data: newBus }, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: "Bus number already exists" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
