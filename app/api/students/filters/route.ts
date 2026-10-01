import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { requireAuth } from "@/lib/utils/auth";
import Class from "@/lib/models/Class";
import Section from "@/lib/models/Section";
import { sendCompressedJson } from "@/lib/compression";

interface FilterCacheEntry {
  data: any;
  expiresAt: number;
}
const g = globalThis as unknown as {
  _studentsFiltersCache?: Map<string, FilterCacheEntry>;
  _filtersInFlight?: Map<string, Promise<any>>;
};
if (!g._studentsFiltersCache) g._studentsFiltersCache = new Map();
if (!g._filtersInFlight) g._filtersInFlight = new Map();

const _studentsFiltersCache = g._studentsFiltersCache;
const _filtersInFlight = g._filtersInFlight;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function GET(request: NextRequest) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "teacher", "super_admin", "student", "parent"]);
  if (error) return error;

  const cacheKey = String(schoolId);
  const cached = _studentsFiltersCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return sendCompressedJson(
      request,
      { success: true, data: cached.data },
      { cacheControl: "private, max-age=120, stale-while-revalidate=300" }
    );
  }

  if (_filtersInFlight.has(cacheKey)) {
    try {
      const data = await _filtersInFlight.get(cacheKey)!;
      return sendCompressedJson(
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

    const [classes, sections] = await Promise.all([
      Class.find({ school_id: schoolId }).select("name section stream academic_year").lean(),
      Section.find({ school_id: schoolId, status: "Active" }).select("name").lean(),
    ]);

    const academicYears = Array.from(
      new Set(classes.map((c: any) => c.academic_year).filter(Boolean))
    );

    const filterData = {
      academicYears,
      classes: classes.map((c: any) => ({
        _id: c._id,
        name: c.name,
        section: c.section || "",
        stream: c.stream || ""
      })),
      sections: sections.map((s: any) => s.name),
      houses: ["Red", "Blue", "Green", "Yellow"],
      genders: ["Male", "Female", "Other"],
      statuses: ["Active", "Inactive"],
      admissionStatuses: ["New", "Under Review", "Interview Scheduled", "Approved", "Rejected", "Admission Completed"],
    };

    _studentsFiltersCache.set(cacheKey, {
      data: filterData,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return filterData;
  })();

  _filtersInFlight.set(cacheKey, queryPromise);

  try {
    const filterData = await queryPromise;
    return sendCompressedJson(
      request,
      {
        success: true,
        data: filterData,
      },
      { cacheControl: "private, max-age=120, stale-while-revalidate=300" }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  } finally {
    _filtersInFlight.delete(cacheKey);
  }
}
