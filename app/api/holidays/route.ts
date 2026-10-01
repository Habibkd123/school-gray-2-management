import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Holiday } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import { paginateQuery } from "@/lib/utils/pagination";
import { sendCompressedJson } from "@/lib/compression";

// Server cache & in-flight deduplication
const _holidaysServerCache = new Map<string, { data: any; expiresAt: number }>();
const _holidaysInFlight = new Map<string, Promise<any>>();
const HOLIDAYS_CACHE_TTL = 60_000;

export function invalidateHolidaysCache(schoolId?: string | null) {
  if (schoolId) {
    for (const key of _holidaysServerCache.keys()) {
      if (key.startsWith(`holidays_${schoolId}`)) {
        _holidaysServerCache.delete(key);
      }
    }
  } else {
    _holidaysServerCache.clear();
  }
}

export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin", "teacher", "student"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const isAll = limitParam === "all";
    const page = isAll ? 1 : Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = isAll ? 1000 : Math.max(1, parseInt(limitParam || "25"));

    const cacheKey = `holidays_${schoolId}_${page}_${limit}`;
    const cached = _holidaysServerCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return sendCompressedJson(req, cached.data, {
        cacheControl: "private, max-age=30, stale-while-revalidate=60",
      });
    }

    const existingInFlight = _holidaysInFlight.get(cacheKey);
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
      const { items: holidays, total, totalPages } = await paginateQuery(
        Holiday,
        { school_id: schoolId },
        {
          page,
          limit,
          sort: { date: 1 },
        }
      );
      return { success: true, data: { holidays, total, page, totalPages, limit } };
    })();

    _holidaysInFlight.set(cacheKey, fetchPromise);

    try {
      const payload = await fetchPromise;
      _holidaysServerCache.set(cacheKey, {
        data: payload,
        expiresAt: Date.now() + HOLIDAYS_CACHE_TTL,
      });
      return sendCompressedJson(req, payload, {
        cacheControl: "private, max-age=30, stale-while-revalidate=60",
      });
    } finally {
      _holidaysInFlight.delete(cacheKey);
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
    const { title, date, description, status } = body;

    if (!title || !date) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const display_id = `H${Math.floor(100000 + Math.random() * 900000)}`;

    const holiday = await Holiday.create({
      school_id: schoolId as string,
      display_id,
      title: title.trim(),
      date: new Date(date),
      description: description?.trim(),
      status: status || "Active",
    });

    invalidateHolidaysCache(schoolId);

    return NextResponse.json({ success: true, data: holiday }, { status: 201 });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ success: false, message: "Holiday on this date with this title already exists" }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
