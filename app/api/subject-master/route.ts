import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { SubjectMaster } from "@/lib/models/index";
import Stream from "@/lib/models/Stream";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";
import { SubjectAssignment, TeacherAssignment } from "@/lib/models/index";
import { sendCompressedJson } from "@/lib/compression";

// ─── Server-side cache ───────────────────────────────────────
const gs = globalThis as any;
if (!gs._subjectMasterCache) gs._subjectMasterCache = new Map<string, { data: any; expiresAt: number }>();
const _cache: Map<string, { data: any; expiresAt: number }> = gs._subjectMasterCache;
const TTL = 60_000;

export function invalidateSubjectMasterCache(schoolId?: string) {
  if (!schoolId) { _cache.clear(); return; }
  for (const k of Array.from(_cache.keys())) {
    if (k.startsWith(String(schoolId))) _cache.delete(k);
  }
}

// GET — list subject masters
export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "accountant", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const cacheKey = `${schoolId}:${url.searchParams.toString()}`;
    const cached = _cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return sendCompressedJson(req, cached.data, { cacheControl: "private, max-age=30, stale-while-revalidate=60" });
    }
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limitParam = url.searchParams.get("limit");
    const isAll = limitParam === "all" || (limitParam && parseInt(limitParam) >= 1000);
    const limit = isAll ? 100000 : parseInt(limitParam || "50");

    const query: any = { school_id: schoolId };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { subject_code: { $regex: search, $options: "i" } },
      ];
    }
    if (status && status !== "all") {
      query.status = status;
    } else if (status !== "all") {
      query.status = { $ne: "Archived" };
    }

    const [total, subjects] = await Promise.all([
      SubjectMaster.countDocuments(query),
      SubjectMaster.find(query)
        .sort({ name: 1 })
        .skip(isAll ? 0 : (page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const subjectIds = subjects.map((s: any) => s._id);

    // Run 2 batch aggregations instead of 100 sequential/parallel countDocuments
    const [classCountAgg, teacherCountAgg] = await Promise.all([
      SubjectAssignment.aggregate([
        { $match: { school_id: new mongoose.Types.ObjectId(schoolId as string), subject_master_id: { $in: subjectIds } } },
        { $group: { _id: "$subject_master_id", count: { $sum: 1 } } }
      ]),
      TeacherAssignment.aggregate([
        { $match: { school_id: new mongoose.Types.ObjectId(schoolId as string), is_deleted: false, subject_master_id: { $in: subjectIds } } },
        { $group: { _id: "$subject_master_id", count: { $sum: 1 } } }
      ])
    ]);

    const classCountMap = new Map(classCountAgg.map((item: any) => [String(item._id), item.count]));
    const teacherCountMap = new Map(teacherCountAgg.map((item: any) => [String(item._id), item.count]));

    const subjectsWithStats = subjects.map((s: any) => ({
      ...s,
      classesCount: classCountMap.get(String(s._id)) || 0,
      teachersCount: teacherCountMap.get(String(s._id)) || 0,
    }));

    const responseData = { success: true, data: { subjects: subjectsWithStats, total, page, totalPages: Math.ceil(total / limit) } };
    _cache.set(cacheKey, { data: responseData, expiresAt: Date.now() + TTL });
    return sendCompressedJson(req, responseData, { cacheControl: "private, max-age=30, stale-while-revalidate=60" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}

// POST — create subject master
export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const { name, subject_code, description, status, allowed_streams } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ success: false, message: "Subject name is required" }, { status: 400 });
    }

    let finalAllowedStreams = Array.isArray(allowed_streams) ? allowed_streams : [];

    // Auto-tagging logic: If no streams were manually selected, try to auto-detect based on subject name
    if (finalAllowedStreams.length === 0) {
      const lowerName = name.trim().toLowerCase();
      
      const scienceKeywords = ["physics", "chemistry", "biology", "math", "mathematics", "computer", "botany", "zoology", "science"];
      const artsKeywords = ["history", "geograph", "geography", "political", "sociology", "psychology", "philosophy", "arts", "literature", "social", "civics", "drawing", "music", "home science"];
      const commerceKeywords = ["account", "business", "economics", "commerce", "finance", "accounts", "bookkeeping", "entrepreneurship"];

      let targetStreamName = "";
      if (scienceKeywords.some(kw => lowerName.includes(kw))) targetStreamName = "Science";
      else if (artsKeywords.some(kw => lowerName.includes(kw))) targetStreamName = "Arts";
      else if (commerceKeywords.some(kw => lowerName.includes(kw))) targetStreamName = "Commerce";

      if (targetStreamName) {
        // Find the stream in the database by name (case-insensitive)
        const matchedStream = await Stream.findOne({ 
          school_id: schoolId, 
          name: { $regex: new RegExp(`^${targetStreamName}$`, "i") } 
        }).lean();
        
        if (matchedStream) {
          finalAllowedStreams = [matchedStream._id.toString()];
        }
      }
    }

    const subject = await SubjectMaster.create({
      school_id: String(schoolId),
      name: name.trim(),
      subject_code: subject_code?.trim().toUpperCase() || undefined,
      description: description?.trim() || undefined,
      status: status || "Active",
      allowed_streams: finalAllowedStreams,
    });

    invalidateSubjectMasterCache(String(schoolId));
    return NextResponse.json({ success: true, data: subject }, { status: 201 });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ success: false, message: "A subject with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
