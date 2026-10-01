import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Route, Bus } from "@/lib/models";
import { requireAuth } from "@/lib/utils/auth";
import { sendCompressedJson } from "@/lib/compression";

// Server cache & in-flight deduplication (keyed by school_id)
const _routesServerCache = new Map<string, { data: any; expiresAt: number }>();
const _routesInFlight = new Map<string, Promise<any>>();
const ROUTES_CACHE_TTL = 60_000;

export function invalidateRoutesCache(schoolId?: string) {
  if (schoolId) {
    _routesServerCache.delete(`routes_${schoolId}`);
  } else {
    _routesServerCache.clear();
  }
}

export async function GET(request: NextRequest) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "super_admin", "teacher"]);
  if (error) return error;

  const cacheKey = `routes_${schoolId}`;
  const cached = _routesServerCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return sendCompressedJson(request, cached.data, {
      cacheControl: "private, max-age=30, stale-while-revalidate=60",
    });
  }

  const existingInFlight = _routesInFlight.get(cacheKey);
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
      const routes = await Route.find({ school_id: schoolId }).sort({ createdAt: -1 }).lean();
      return { success: true, data: routes };
    })();

    _routesInFlight.set(cacheKey, fetchPromise);

    const payload = await fetchPromise;
    _routesServerCache.set(cacheKey, {
      data: payload,
      expiresAt: Date.now() + ROUTES_CACHE_TTL,
    });
    return sendCompressedJson(request, payload, {
      cacheControl: "private, max-age=30, stale-while-revalidate=60",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    _routesInFlight.delete(cacheKey);
  }
}

export async function POST(request: NextRequest) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    const body = await request.json();
    await connectDB();

    const newRoute = await Route.create({
      ...body,
      school_id: schoolId,
    });

    if (newRoute.assignedBus && newRoute.assignedBus !== "Not Assigned") {
      await Bus.findOneAndUpdate(
        { school_id: schoolId, busNumber: newRoute.assignedBus },
        { assignedRoute: newRoute.routeName }
      );
    }

    invalidateRoutesCache(schoolId as string);

    return NextResponse.json({ success: true, data: newRoute }, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: "Route name already exists" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
