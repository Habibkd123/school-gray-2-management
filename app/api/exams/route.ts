import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Exam } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import { sendCompressedJson } from "@/lib/compression";

// Server cache & in-flight deduplication
const _examsServerCache = new Map<string, { data: any; expiresAt: number }>();
const _examsInFlight = new Map<string, Promise<any>>();
const EXAMS_CACHE_TTL = 30_000;

export function invalidateExamsCache(schoolId?: string | null) {
  if (schoolId) {
    for (const key of _examsServerCache.keys()) {
      if (key.startsWith(`exam_${schoolId}`)) {
        _examsServerCache.delete(key);
      }
    }
  } else {
    _examsServerCache.clear();
  }
}

export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  const url = new URL(req.url);
  const classId = url.searchParams.get("class_id");
  const academic_year = url.searchParams.get("academic_year");

  const cacheKey = `exam_${schoolId}_${classId || "all"}_${academic_year || "all"}`;

  const cached = _examsServerCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return sendCompressedJson(req, cached.data, {
      cacheControl: "private, max-age=15, stale-while-revalidate=30",
    });
  }

  const existingInFlight = _examsInFlight.get(cacheKey);
  if (existingInFlight) {
    try {
      const payload = await existingInFlight;
      return sendCompressedJson(req, payload, {
        cacheControl: "private, max-age=15, stale-while-revalidate=30",
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  const queryPromise = (async () => {
    await connectToDatabase();
    const query: any = { school_id: schoolId };
    if (classId) query.class_id = classId;
    if (academic_year) query.academic_year = academic_year;

    const exams = await Exam.find(query)
      .sort({ createdAt: -1 })
      .populate("class_id", "name section")
      .lean();

    const payload = { success: true, data: { exams } };
    _examsServerCache.set(cacheKey, { data: payload, expiresAt: Date.now() + EXAMS_CACHE_TTL });
    return payload;
  })();

  _examsInFlight.set(cacheKey, queryPromise);

  try {
    const payload = await queryPromise;
    return sendCompressedJson(
      req,
      payload,
      { cacheControl: "private, max-age=15, stale-while-revalidate=30" }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  } finally {
    _examsInFlight.delete(cacheKey);
  }
}

export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { name, type, class_id, class_ids, academic_year, start_date, end_date, description, status } = body;

    if (!name || !academic_year) {
      return NextResponse.json({ success: false, message: "Name and academic year are required" }, { status: 400 });
    }

    const classesToCreate = Array.isArray(class_ids) && class_ids.length > 0 
      ? class_ids 
      : (class_id ? [class_id] : []);

    if (classesToCreate.length === 0) {
      return NextResponse.json({ success: false, message: "Class selection is required" }, { status: 400 });
    }

    const createdExams = [];
    for (const cId of classesToCreate) {
      const exam = await Exam.create({
        school_id: schoolId as string,
        class_id: cId,
        name: name.trim(),
        type: type || "other",
        academic_year,
        start_date: start_date ? new Date(start_date) : undefined,
        end_date: end_date ? new Date(end_date) : undefined,
        is_published: false,
        description: description || "",
        status: status || "upcoming",
      });
      createdExams.push(exam);
    }

    invalidateExamsCache(schoolId);

    return NextResponse.json({ success: true, data: createdExams[0], all: createdExams }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
