import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Admission } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";
import { sendCompressedJson } from "@/lib/compression";

// ─── Server-side cache for stats ────────────────────────────────
const gs = globalThis as any;
if (!gs._admissionsStatsCache) gs._admissionsStatsCache = new Map<string, { data: any; expiresAt: number }>();
const _statsCache: Map<string, { data: any; expiresAt: number }> = gs._admissionsStatsCache;
const STATS_CACHE_TTL = 60_000; // 60 seconds

export function invalidateAdmissionsStatsCache(schoolId?: string) {
  if (!schoolId) { _statsCache.clear(); return; }
  _statsCache.delete(String(schoolId));
}

export async function GET(req: NextRequest) {
  const { schoolId, role, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  let targetSchoolId = req.nextUrl.searchParams.get("school_id");
  if (role !== "super_admin") {
    targetSchoolId = schoolId as string;
  }
  
  if (!targetSchoolId && role !== "super_admin") {
    return NextResponse.json({ success: false, message: "No school context" }, { status: 400 });
  }

  // Cache check
  const cacheKey = targetSchoolId ? String(targetSchoolId) : "super_all";
  const cached = _statsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return sendCompressedJson(req, cached.data, { cacheControl: "private, max-age=30, stale-while-revalidate=60" });
  }

  try {
    await connectDB();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const schoolFilter: any = targetSchoolId ? { school_id: new mongoose.Types.ObjectId(targetSchoolId) } : {};

    const [statusGroups, totalCount, todayCount, thisMonthCount, recents] = await Promise.all([
      Admission.aggregate([
        ...(targetSchoolId ? [{ $match: schoolFilter }] : []),
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      Admission.countDocuments(schoolFilter),
      Admission.countDocuments({
        ...schoolFilter,
        submission_date: { $gte: startOfToday }
      }),
      Admission.countDocuments({
        ...schoolFilter,
        submission_date: { $gte: startOfMonth }
      }),
      Admission.find(schoolFilter)
        .select("_id application_no student_name phone submission_date status")
        .sort({ submission_date: -1, createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const counts: Record<string, number> = {};
    for (const group of statusGroups) {
      if (group._id) counts[group._id] = group.count;
    }

    const newApps = counts["New"] || 0;
    const approved = (counts["Approved"] || 0) + (counts["Admission Completed"] || 0);
    const rejected = counts["Rejected"] || 0;
    const review = (counts["Under Review"] || 0) + (counts["Documents Pending"] || 0) + (counts["Interview Scheduled"] || 0);
    const rate = totalCount > 0 ? Math.round((approved / totalCount) * 100) : 0;

    const responseData = {
      success: true,
      data: {
        stats: { total: totalCount, newApps, approved, rejected, review, today: todayCount, thisMonth: thisMonthCount, rate },
        recents,
      }
    };

    _statsCache.set(cacheKey, { data: responseData, expiresAt: Date.now() + STATS_CACHE_TTL });
    return sendCompressedJson(req, responseData, { cacheControl: "private, max-age=30, stale-while-revalidate=60" });
  } catch (err: any) {
    console.error("[GET /api/admissions/stats]", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
