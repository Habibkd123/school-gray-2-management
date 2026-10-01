import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { requireAuth } from "@/lib/utils/auth";
import Teacher from "@/lib/models/Teacher";
import Class from "@/lib/models/Class";
import { sendConditionalJson } from "@/lib/etag";

interface TeacherFilterCacheEntry {
  data: any;
  expiresAt: number;
}
const g = globalThis as unknown as {
  _teacherFiltersCache?: Map<string, TeacherFilterCacheEntry>;
  _teacherFiltersInFlight?: Map<string, Promise<any>>;
};
if (!g._teacherFiltersCache) g._teacherFiltersCache = new Map();
if (!g._teacherFiltersInFlight) g._teacherFiltersInFlight = new Map();

const _teacherFiltersCache = g._teacherFiltersCache;
const _teacherFiltersInFlight = g._teacherFiltersInFlight;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function GET(request: NextRequest) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "teacher", "super_admin", "student", "parent"]);
  if (error) return error;

  const cacheKey = String(schoolId);
  const cached = _teacherFiltersCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return sendConditionalJson(
      request,
      { success: true, data: cached.data },
      { cacheControl: "private, max-age=120, stale-while-revalidate=300" }
    );
  }

  if (_teacherFiltersInFlight.has(cacheKey)) {
    try {
      const data = await _teacherFiltersInFlight.get(cacheKey)!;
      return sendConditionalJson(
        request,
        { success: true, data },
        { cacheControl: "private, max-age=120, stale-while-revalidate=300" }
      );
    } catch {
      // Fall through to query on error
    }
  }

  const queryPromise = (async () => {
    await connectDB();

    const [academicYears, departments, designations] = await Promise.all([
      Class.distinct("academic_year", { school_id: schoolId }),
      Teacher.distinct("department", { school_id: schoolId }),
      Teacher.distinct("designation", { school_id: schoolId }),
    ]);

    const filterData = {
      academicYears: academicYears.filter(Boolean),
      departments: departments.filter(Boolean),
      designations: designations.filter(Boolean),
      statuses: ["Active", "Inactive"],
    };

    _teacherFiltersCache.set(cacheKey, {
      data: filterData,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return filterData;
  })();

  _teacherFiltersInFlight.set(cacheKey, queryPromise);

  try {
    const filterData = await queryPromise;
    return sendConditionalJson(
      request,
      { success: true, data: filterData },
      { cacheControl: "private, max-age=120, stale-while-revalidate=300" }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  } finally {
    _teacherFiltersInFlight.delete(cacheKey);
  }
}
