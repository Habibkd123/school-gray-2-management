import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Admission } from "@/lib/models/index";
import Class from "@/lib/models/Class";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";
import { sendCompressedJson } from "@/lib/compression";

// ─── Cache & In-Flight Dedup ─────────────────────────────────────────
const gr = globalThis as any;
if (!gr._admissionsReportsCache) gr._admissionsReportsCache = new Map<string, { data: any; expiresAt: number }>();
if (!gr._admissionsReportsInFlight) gr._admissionsReportsInFlight = new Map<string, Promise<any>>();

const _cache: Map<string, { data: any; expiresAt: number }> = gr._admissionsReportsCache;
const _inFlight: Map<string, Promise<any>> = gr._admissionsReportsInFlight;
const TTL = 60_000; // 60 seconds

export function invalidateAdmissionsReportsCache(schoolId?: string) {
  if (!schoolId) {
    _cache.clear();
    return;
  }
  _cache.delete(String(schoolId));
}

export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;
  if (!schoolId) return NextResponse.json({ success: false, message: "No school context" }, { status: 400 });

  const schoolKey = String(schoolId);

  // Fast in-memory cache check
  const cached = _cache.get(schoolKey);
  if (cached && cached.expiresAt > Date.now()) {
    return sendCompressedJson(req, cached.data, { cacheControl: "private, max-age=15, stale-while-revalidate=60" });
  }

  // Deduplicate concurrent in-flight requests for the same school
  if (_inFlight.has(schoolKey)) {
    try {
      const data = await _inFlight.get(schoolKey)!;
      return sendCompressedJson(req, data, { cacheControl: "private, max-age=15, stale-while-revalidate=60" });
    } catch {
      // Fall through on error to retry
    }
  }

  const queryPromise = (async () => {
    await connectDB();
    const schoolObjId = new mongoose.Types.ObjectId(schoolId);

    // Run status aggregation, class group aggregation, and lean class query in parallel
    const [statusGroups, classBuckets, classes] = await Promise.all([
      Admission.aggregate([
        { $match: { school_id: schoolObjId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Admission.aggregate([
        { $match: { school_id: schoolObjId } },
        {
          $group: {
            _id: "$class_id",
            total: { $sum: 1 },
            newApps: { $sum: { $cond: [{ $eq: ["$status", "New"] }, 1, 0] } },
            approved: {
              $sum: {
                $cond: [
                  { $in: ["$status", ["Approved", "Admission Completed"]] },
                  1, 0
                ]
              }
            },
            rejected: { $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] } },
          }
        },
        { $sort: { total: -1 } },
      ]),
      Class.find({ school_id: schoolObjId }).select("_id name section").lean(),
    ]);

    // Build class ID -> Display Name lookup map for O(1) matching (much faster than DB $lookup)
    const classMap = new Map<string, string>();
    for (const c of classes) {
      classMap.set(String(c._id), `${c.name}${c.section ? ` - ${c.section}` : ""}`);
    }

    let totalCount = 0;
    const statusCounts: Record<string, number> = {};
    for (const g of statusGroups) {
      if (g._id) {
        statusCounts[g._id] = g.count;
        totalCount += g.count;
      }
    }

    const classReports = classBuckets.map((b: any) => {
      const classIdStr = b._id ? String(b._id) : null;
      const className = classIdStr ? (classMap.get(classIdStr) || "Unassigned Class") : "Unassigned Class";
      const pending = Math.max(0, b.total - b.newApps - b.approved - b.rejected);
      const conversionRate = b.total > 0 ? Math.round((b.approved / b.total) * 100) : 0;
      return {
        classId: classIdStr,
        className,
        total: b.total,
        newApps: b.newApps,
        approved: b.approved,
        rejected: b.rejected,
        pending,
        conversionRate,
      };
    });

    const approvedCount = (statusCounts["Approved"] || 0) + (statusCounts["Admission Completed"] || 0);
    const conversionRate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

    const responseData = {
      success: true,
      data: {
        totalApps: totalCount,
        statusCounts,
        classReports,
        conversionRate,
      }
    };

    _cache.set(schoolKey, { data: responseData, expiresAt: Date.now() + TTL });
    return responseData;
  })();

  _inFlight.set(schoolKey, queryPromise);

  try {
    const responseData = await queryPromise;
    return sendCompressedJson(req, responseData, { cacheControl: "private, max-age=15, stale-while-revalidate=60" });
  } catch (err: any) {
    console.error("[GET /api/admissions/reports]", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  } finally {
    _inFlight.delete(schoolKey);
  }
}
