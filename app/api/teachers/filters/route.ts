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
const _teacherFiltersCache = new Map<string, TeacherFilterCacheEntry>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

export async function GET(request: NextRequest) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "teacher", "super_admin", "student", "parent"]);
  if (error) return error;

  const cacheKey = String(schoolId);
  const cached = _teacherFiltersCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return sendConditionalJson(
      request,
      { success: true, data: cached.data },
      { cacheControl: "private, max-age=180, stale-while-revalidate=60" }
    );
  }

  try {
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

    return sendConditionalJson(
      request,
      { success: true, data: filterData },
      { cacheControl: "private, max-age=180, stale-while-revalidate=60" }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
