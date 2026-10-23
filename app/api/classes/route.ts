import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import Class, { computeSortWeight } from "@/lib/models/Class";
import Teacher from "@/lib/models/Teacher";
import { TeacherAssignment, Student, Subject, SubjectAssignment, ClassFee } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import { sendConditionalJson } from "@/lib/etag";
import { invalidateFeesCache } from "@/app/api/fees/route";

// ─── Server-side cache on globalThis ──────────────────────────────
const gs = globalThis as any;
if (!gs._classesServerCache) gs._classesServerCache = new Map<string, { data: any; expiresAt: number }>();
if (!gs._classesInFlight) gs._classesInFlight = new Map<string, Promise<any>>();
const _serverClassesCache: Map<string, { data: any; expiresAt: number }> = gs._classesServerCache;
const _classesInFlight: Map<string, Promise<any>> = gs._classesInFlight;
const CLASSES_CACHE_TTL_MS = 60_000; // 60 seconds

export function invalidateServerClassesCache(schoolId?: string) {
  if (!schoolId) {
    _serverClassesCache.clear();
    return;
  }
  for (const key of Array.from(_serverClassesCache.keys())) {
    if (key.startsWith(String(schoolId))) {
      _serverClassesCache.delete(key);
    }
  }
}

// GET: Fetch all classes for the school (DB-level pagination & sort_weight ordering)
export async function GET(req: NextRequest) {
  const authResult = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (authResult.error) return authResult.error;
  const { schoolId, user } = authResult;

  const url = new URL(req.url);
  const sortedParams = new URLSearchParams(url.searchParams);
  sortedParams.sort();
  const cacheKey = `${schoolId}__${user.role === "teacher" ? user.user_id : "all"}__${sortedParams.toString()}`;
  const cached = _serverClassesCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return sendConditionalJson(
      req,
      cached.data,
      { cacheControl: "private, no-cache, no-store, must-revalidate" }
    );
  }

  if (_classesInFlight.has(cacheKey)) {
    try {
      const data = await _classesInFlight.get(cacheKey)!;
      return sendConditionalJson(
        req,
        data,
        { cacheControl: "private, no-cache, no-store, must-revalidate" }
      );
    } catch {
      // Fall through to retry on error
    }
  }

  const queryPromise = (async () => {
    await connectToDatabase();

    const search = url.searchParams.get("search") || "";
    const academic_year = url.searchParams.get("academic_year") || "";
    const section = url.searchParams.get("section") || "";
    const status = url.searchParams.get("status") || "";
    const sortOrder = url.searchParams.get("sort") === "desc" ? -1 : 1;
    const limitParam = url.searchParams.get("limit");
    const isAll = limitParam === "all";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = isAll ? 1000 : Math.min(500, Math.max(1, parseInt(limitParam || "10")));
    const skip = isAll ? 0 : (page - 1) * limit;

    const query: Record<string, any> = {};
    if (user.role === "super_admin") {
      const paramSchoolId = url.searchParams.get("school_id");
      if (paramSchoolId && paramSchoolId !== "all") {
        query.school_id = paramSchoolId;
      }
    } else {
      query.school_id = schoolId as string;
    }

    const showDeleted = url.searchParams.get("show_deleted") === "true";
    if (!showDeleted) {
      query.is_deleted = { $ne: true };
    }

    const andFilters: any[] = [];

    // Teacher role: restrict to classes where they are the class teacher OR assigned as Subject/Co-class teacher
    if (user.role === "teacher") {
      const teacher = await Teacher.findOne(
        { user_id: user.user_id, school_id: schoolId },
        { _id: 1 }                          // lean projection — only need _id
      ).lean();
      if (teacher) {
        const assignmentQuery: any = {
          school_id: schoolId,
          teacher_id: teacher._id,
          is_deleted: false,
          status: "Active"
        };
        if (academic_year) {
          assignmentQuery.academic_year = academic_year;
        }
        const assignedClassIds = await TeacherAssignment.find(assignmentQuery).distinct("class_id");

        andFilters.push({
          $or: [
            { class_teacher_id: teacher._id },
            { _id: { $in: assignedClassIds.filter(Boolean) } }
          ]
        });
      } else {
        // No teacher record → return empty result immediately
        return { classes: [], total: 0, page, limit, totalPages: 0 };
      }
    }

    if (search) {
      andFilters.push({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { section: { $regex: search, $options: "i" } },
        ]
      });
    }

    if (academic_year) query.academic_year = academic_year;
    if (section) query.section = section;
    if (status && status !== "all") {
      query.status = status;
    } else if (status !== "all") {
      query.status = { $ne: "Archived" };
    }
    if (andFilters.length > 0) query.$and = andFilters;

    // Run count + paged list in parallel for minimum latency
    const [total, classes] = await Promise.all([
      Class.countDocuments(query),
      Class.find(query)
        .populate("school_id", "name slug")
        .populate("class_teacher_id", "name employee_id photo_url designation department status is_active")
        .sort({ sort_weight: sortOrder, section: 1 })  // DB-level custom school order
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const includeStatsParam = url.searchParams.get("include_stats");
    // Fast return if no stats requested
    if (includeStatsParam === "false") {
      _classesInFlight.delete(cacheKey);
      const resData = {
        success: true,
        data: { classes, total, page, limit, totalPages: Math.ceil(total / limit) }
      };
      _serverClassesCache.set(cacheKey, { data: resData, expiresAt: Date.now() + CLASSES_CACHE_TTL_MS });
      return sendConditionalJson(
        req,
        resData,
        { cacheControl: "private, no-cache, no-store, must-revalidate" }
      );
    }

    // Only compute stats if explicitly requested, or for paged table requests where stats are displayed
    const shouldComputeStats =
      includeStatsParam === "true" ||
      (!isAll && includeStatsParam !== "false" && classes.length > 0);

    let classesWithStats = classes;

    if (shouldComputeStats && classes.length > 0) {
      const classIds = classes.map((c: any) => c._id);
      const classNames = Array.from(new Set(classes.map((c: any) => c.name)));
      const schoolObjId = schoolId && mongoose.Types.ObjectId.isValid(schoolId as string)
        ? new mongoose.Types.ObjectId(schoolId as string)
        : null;

      const schoolMatch = schoolObjId ? { school_id: { $in: [schoolObjId, String(schoolId)] } } : {};

      const [studentCounts, subjectCounts, sectionCounts] = await Promise.all([
        Student.aggregate([
          { $match: { ...schoolMatch, class_id: { $in: classIds } } },
          { $group: { _id: "$class_id", count: { $sum: 1 } } }
        ]),
        SubjectAssignment.aggregate([
          { $match: { ...schoolMatch, class_id: { $in: classIds } } },
          { $group: { _id: "$class_id", count: { $sum: 1 } } }
        ]),
        Class.aggregate([
          { $match: { ...(schoolObjId ? { school_id: schoolObjId } : {}), name: { $in: classNames }, academic_year: academic_year || { $exists: true } } },
          { $group: { _id: { name: "$name", academic_year: "$academic_year" }, count: { $sum: 1 } } }
        ])
      ]);

      const studentCountMap = new Map(studentCounts.map((s: any) => [String(s._id), s.count]));
      const subjectCountMap = new Map(subjectCounts.map((s: any) => [String(s._id), s.count]));
      const sectionCountMap = new Map(sectionCounts.map((s: any) => [`${s._id.name}__${s._id.academic_year}`, s.count]));

      classesWithStats = classes.map((c: any) => ({
        ...c,
        studentCount: studentCountMap.get(String(c._id)) || 0,
        subjectCount: subjectCountMap.get(String(c._id)) || 0,
        sectionCount: sectionCountMap.get(`${c.name}__${c.academic_year}`) || 0,
      }));
    }

    const responsePayload = {
      success: true,
      data: {
        classes: classesWithStats,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    _serverClassesCache.set(cacheKey, {
      data: responsePayload,
      expiresAt: Date.now() + CLASSES_CACHE_TTL_MS,
    });

    return responsePayload;
  })();

  _classesInFlight.set(cacheKey, queryPromise);

  try {
    const responsePayload = await queryPromise;
    return sendConditionalJson(
      req,
      responsePayload,
      { cacheControl: "private, no-cache, no-store, must-revalidate" }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  } finally {
    _classesInFlight.delete(cacheKey);
  }
}

// POST: Create a new class
export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();

    const body = await req.json();
    const { name, section, academic_year, class_teacher_id, capacity, class_code, status, default_fee } = body;

    if (!name || !academic_year) {
      return NextResponse.json(
        { success: false, message: "Class name and academic year are required" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const trimmedSection = section?.trim() || "";
    const trimmedYear = academic_year.trim();

    // Check if an existing class exists (including soft-deleted)
    const existingClass = await Class.findOne({
      school_id: schoolId,
      name: trimmedName,
      section: trimmedSection,
      academic_year: trimmedYear,
    });

    if (existingClass) {
      if (existingClass.is_deleted) {
        // Seamlessly revive the soft-deleted class
        existingClass.is_deleted = false;
        existingClass.deleted_at = null;
        existingClass.deleted_by = null;
        existingClass.status = status || "Active";
        existingClass.class_teacher_id = class_teacher_id || null;
        existingClass.capacity = capacity ? parseInt(capacity) : 40;
        if (class_code) existingClass.class_code = class_code.trim().toUpperCase();
        existingClass.sort_weight = computeSortWeight(trimmedName);
        await existingClass.save();

        if (default_fee !== undefined && default_fee !== null && default_fee !== "") {
          const amount = Math.max(0, Number(default_fee) || 0);
          try {
            await ClassFee.findOneAndUpdate(
              {
                school_id: new mongoose.Types.ObjectId(schoolId as string),
                class_id: existingClass._id,
                academic_year: trimmedYear,
              },
              {
                fee_types: [
                  { name: "Tuition Fees", amount, frequency: "Monthly", is_mandatory: true, is_enabled: true },
                  { name: "Academic Fees", amount: 0, frequency: "Yearly", is_mandatory: true, is_enabled: true },
                  { name: "Exam Fees", amount: 0, frequency: "Quarterly", is_mandatory: true, is_enabled: true },
                  { name: "Computer Fees", amount: 0, frequency: "Monthly", is_mandatory: true, is_enabled: true },
                  { name: "Library Fees", amount: 0, frequency: "Yearly", is_mandatory: true, is_enabled: true },
                  { name: "Transport Fees", amount: 0, frequency: "Monthly", is_mandatory: false, is_enabled: false },
                  { name: "Admission Fees", amount: 0, frequency: "One Time", is_mandatory: false, is_enabled: false },
                  { name: "Other Fees", amount: 0, frequency: "Monthly", is_mandatory: false, is_enabled: false },
                ],
                total_amount: amount,
              },
              { upsert: true }
            );
            invalidateFeesCache(String(schoolId));
          } catch (fErr) {
            console.warn("[Revive Class] Non-fatal default fee error:", fErr);
          }
        }

        const populated = await existingClass.populate("class_teacher_id", "name employee_id");
        invalidateServerClassesCache(String(schoolId));
        return NextResponse.json({ success: true, data: populated, message: "Class restored and activated" }, { status: 201 });
      } else {
        return NextResponse.json(
          { success: false, message: "A class with this name, section, and academic year already exists" },
          { status: 409 }
        );
      }
    }

    const newClass = await Class.create({
      school_id: schoolId as string,
      name: trimmedName,
      section: trimmedSection,
      class_code: class_code?.trim().toUpperCase() || undefined,
      status: status || "Active",
      academic_year: trimmedYear,
      class_teacher_id: class_teacher_id || null,
      capacity: capacity ? parseInt(capacity) : 40,
      sort_weight: computeSortWeight(trimmedName),  // set on create too (pre-save also handles it)
    });

    if (default_fee !== undefined && default_fee !== null && default_fee !== "") {
      const amount = Math.max(0, Number(default_fee) || 0);
      try {
        await ClassFee.findOneAndUpdate(
          {
            school_id: new mongoose.Types.ObjectId(schoolId as string),
            class_id: newClass._id,
            academic_year: trimmedYear,
          },
          {
            fee_types: [
              { name: "Tuition Fees", amount, frequency: "Monthly", is_mandatory: true, is_enabled: true },
              { name: "Academic Fees", amount: 0, frequency: "Yearly", is_mandatory: true, is_enabled: true },
              { name: "Exam Fees", amount: 0, frequency: "Quarterly", is_mandatory: true, is_enabled: true },
              { name: "Computer Fees", amount: 0, frequency: "Monthly", is_mandatory: true, is_enabled: true },
              { name: "Library Fees", amount: 0, frequency: "Yearly", is_mandatory: true, is_enabled: true },
              { name: "Transport Fees", amount: 0, frequency: "Monthly", is_mandatory: false, is_enabled: false },
              { name: "Admission Fees", amount: 0, frequency: "One Time", is_mandatory: false, is_enabled: false },
              { name: "Other Fees", amount: 0, frequency: "Monthly", is_mandatory: false, is_enabled: false },
            ],
            total_amount: amount,
          },
          { upsert: true }
        );
        invalidateFeesCache(String(schoolId));
      } catch (fErr) {
        console.warn("[Create Class] Non-fatal default fee error:", fErr);
      }
    }

    const populated = await newClass.populate("class_teacher_id", "name employee_id");

    invalidateServerClassesCache(String(schoolId));

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json(
        { success: false, message: "A class with this name, section, and academic year already exists" },
        { status: 409 }
      );
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
