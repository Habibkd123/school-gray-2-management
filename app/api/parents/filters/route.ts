export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Parent, Class } from "@/lib/models";
import Student from "@/lib/models/Student";
import { requireAuth } from "@/lib/utils/auth";
import { sendCompressedJson } from "@/lib/compression";

// In-memory cache for filter options per school (60s TTL)
const g = globalThis as any;
if (!g._parentsFilterCache) g._parentsFilterCache = new Map<string, { data: any; expiresAt: number }>();
const _filterCache: Map<string, { data: any; expiresAt: number }> = g._parentsFilterCache;

export function invalidateParentsFiltersCache(schoolId?: string) {
  if (!schoolId) { _filterCache.clear(); return; }
  _filterCache.delete(String(schoolId));
}

export async function GET(request: NextRequest) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  const cacheKey = String(schoolId);
  const cached = _filterCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return sendCompressedJson(
      request,
      { success: true, data: cached.data },
      { cacheControl: "private, max-age=30, stale-while-revalidate=60" }
    );
  }

  try {
    await connectDB();

    const [classes, students, relations] = await Promise.all([
      Class.find({ school_id: schoolId }).select("name section academic_year").sort({ sort_weight: 1, name: 1 }).lean(),
      Student.find({ school_id: schoolId, is_active: true }).select("name").sort({ name: 1 }).limit(100).lean(),
      Parent.distinct("relation", { school_id: schoolId }),
    ]);

    const academicYearSet = new Set<string>();
    const sectionSet = new Set<string>();
    for (const c of classes as any[]) {
      if (c.academic_year) academicYearSet.add(c.academic_year);
      if (c.section) sectionSet.add(c.section);
    }

    const defaultRelations = ["Father", "Mother", "Guardian", "Other"];
    const mergedRelations = Array.from(new Set([...relations.filter(Boolean), ...defaultRelations]));

    const filterData = {
      academicYears: Array.from(academicYearSet),
      classes: classes.map((c: any) => ({
        _id: c._id.toString(),
        name: c.name,
        section: c.section
      })),
      sections: Array.from(sectionSet),
      students: students.map((s: any) => ({
        _id: s._id.toString(),
        name: s.name
      })),
      guardianTypes: mergedRelations
    };

    _filterCache.set(cacheKey, { data: filterData, expiresAt: Date.now() + 60_000 });

    return sendCompressedJson(request, {
      success: true,
      data: filterData
    }, {
      cacheControl: "private, max-age=30, stale-while-revalidate=60"
    });
  } catch (err: any) {
    console.error("[GET /api/parents/filters]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to load filters" },
      { status: 500 }
    );
  }
}
