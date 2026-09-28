import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Stream from "@/lib/models/Stream";
import { requireAuth } from "@/lib/utils/auth";
import Class from "@/lib/models/Class";
import Student from "@/lib/models/Student";
import { sendConditionalJson } from "@/lib/etag";

// GET — list streams for school
export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "accountant", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limitParam = url.searchParams.get("limit");
    const isAll = limitParam === "all" || (limitParam && parseInt(limitParam) >= 1000);
    const limit = isAll ? 100000 : parseInt(limitParam || "50");

    const query: any = { school_id: schoolId };
    if (search) query.name = { $regex: search, $options: "i" };
    if (status && status !== "all") {
      query.status = status;
    } else if (status !== "all") {
      query.status = { $ne: "Archived" };
    }

    const [total, streams] = await Promise.all([
      Stream.countDocuments(query),
      Stream.find(query)
        .sort({ name: 1 })
        .skip(isAll ? 0 : (page - 1) * limit)
        .limit(limit)
        .lean()
    ]);

    const includeStatsParam = url.searchParams.get("include_stats");
    const shouldComputeStats = includeStatsParam === "true" || (!isAll && includeStatsParam !== "false" && streams.length > 0);

    let streamsWithStats = streams;

    if (shouldComputeStats && streams.length > 0) {
      const classes = await Class.find({ school_id: schoolId }).select("_id name").lean();
      const schoolObjId = (schoolId as any);

      const studentCounts = await Student.aggregate([
        { $match: { school_id: schoolObjId, class_id: { $in: classes.map((c: any) => c._id) } } },
        { $group: { _id: "$class_id", count: { $sum: 1 } } }
      ]);
      const studentCountMap = new Map(studentCounts.map((sc: any) => [String(sc._id), sc.count]));

      streamsWithStats = streams.map((s: any) => {
        const streamRegex = new RegExp(s.name, "i");
        const matchedClasses = classes.filter((c: any) => streamRegex.test(c.name));
        const studentsCount = matchedClasses.reduce((sum: number, c: any) => sum + (studentCountMap.get(String(c._id)) || 0), 0);
        return {
          ...s,
          classesCount: matchedClasses.length,
          studentsCount,
        };
      });
    }

    return sendConditionalJson(
      req,
      {
        success: true,
        data: { streams: streamsWithStats, total, page, totalPages: Math.ceil(total / limit) },
      },
      { cacheControl: "private, max-age=120, stale-while-revalidate=60" }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}

// POST — create stream
export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const { name, status } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ success: false, message: "Stream name is required" }, { status: 400 });
    }

    const stream = await Stream.create({
      school_id: String(schoolId),
      name: name.trim(),
      status: status || "Active",
    });

    return NextResponse.json({ success: true, data: stream }, { status: 201 });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ success: false, message: "A stream with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
