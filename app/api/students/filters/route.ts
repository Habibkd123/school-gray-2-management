import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { requireAuth } from "@/lib/utils/auth";
import Student from "@/lib/models/Student";
import Class from "@/lib/models/Class";
import Section from "@/lib/models/Section";
import Admission from "@/lib/models/Admission";
import { sendConditionalJson } from "@/lib/etag";

interface FilterCacheEntry {
  data: any;
  expiresAt: number;
}
const _studentsFiltersCache = new Map<string, FilterCacheEntry>();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

export async function GET(request: NextRequest) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "teacher", "super_admin", "student", "parent"]);
  if (error) return error;

  const cacheKey = String(schoolId);
  const cached = _studentsFiltersCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return sendConditionalJson(
      request,
      { success: true, data: cached.data },
      { cacheControl: "private, max-age=180, stale-while-revalidate=60" }
    );
  }

  try {
    await connectDB();

    const [academicYears, classes, sections, houses, genders, admissionStatuses] = await Promise.all([
      Class.distinct("academic_year", { school_id: schoolId }),
      Class.find({ school_id: schoolId }).select("name section stream").lean(),
      Section.find({ school_id: schoolId, status: "Active" }).select("name").lean(),
      Student.distinct("house", { school_id: schoolId }),
      Student.distinct("gender", { school_id: schoolId }),
      Admission.distinct("status", { school_id: schoolId }),
    ]);

    const filterData = {
      academicYears: academicYears.filter(Boolean),
      classes: classes.map((c: any) => ({
        _id: c._id,
        name: c.name,
        section: c.section || "",
        stream: c.stream || ""
      })),
      sections: sections.map((s: any) => s.name),
      houses: houses.filter(Boolean),
      genders: genders.filter(Boolean).map((g: string) => g.charAt(0).toUpperCase() + g.slice(1).toLowerCase()),
      statuses: ["Active", "Inactive"],
      admissionStatuses: admissionStatuses.filter(Boolean),
    };

    _studentsFiltersCache.set(cacheKey, {
      data: filterData,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return sendConditionalJson(
      request,
      {
        success: true,
        data: filterData,
      },
      { cacheControl: "private, max-age=180, stale-while-revalidate=60" }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
