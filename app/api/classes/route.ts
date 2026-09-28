import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import Class, { computeSortWeight } from "@/lib/models/Class";
import Teacher from "@/lib/models/Teacher";
import { TeacherAssignment, Student, Subject } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import { sendConditionalJson } from "@/lib/etag";

// GET: Fetch all classes for the school (DB-level pagination & sort_weight ordering)
export async function GET(req: NextRequest) {
  const authResult = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (authResult.error) return authResult.error;
  const { schoolId, user } = authResult;

  try {
    await connectToDatabase();

    const url           = new URL(req.url);
    const search        = url.searchParams.get("search") || "";
    const academic_year = url.searchParams.get("academic_year") || "";
    const section       = url.searchParams.get("section") || "";
    const status        = url.searchParams.get("status") || "";
    const sortOrder     = url.searchParams.get("sort") === "desc" ? -1 : 1;
    const limitParam    = url.searchParams.get("limit");
    const isAll         = limitParam === "all";
    const page          = Math.max(1, parseInt(url.searchParams.get("page")  || "1"));
    const limit         = isAll ? 100000 : Math.min(500, Math.max(1, parseInt(limitParam || "10")));
    const skip          = isAll ? 0 : (page - 1) * limit;

    const query: Record<string, any> = { school_id: schoolId as string };
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
        return NextResponse.json(
          { success: true, data: { classes: [], total: 0, page, limit, totalPages: 0 } },
          { headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" } }
        );
      }
    }

    if (search) {
      andFilters.push({
        $or: [
          { name:    { $regex: search, $options: "i" } },
          { section: { $regex: search, $options: "i" } },
        ]
      });
    }

    if (academic_year) query.academic_year = academic_year;
    if (section)       query.section       = section;
    if (status && status !== "all") {
      query.status = status;
    } else if (status !== "all") {
      query.status = { $ne: "Archived" };
    }
    if (andFilters.length > 0) query.$and  = andFilters;

    // Run count + paged list in parallel for minimum latency
    const [total, classes] = await Promise.all([
      Class.countDocuments(query),
      Class.find(query)
        .populate("class_teacher_id", "name employee_id photo_url designation department status is_active")
        .sort({ sort_weight: sortOrder, section: 1 })  // DB-level custom school order
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const includeStatsParam = url.searchParams.get("include_stats");
    // Only compute stats if explicitly requested, or for paged table requests where stats are displayed
    const shouldComputeStats =
      includeStatsParam === "true" ||
      (!isAll && includeStatsParam !== "false" && classes.length > 0);

    let classesWithStats = classes;

    if (shouldComputeStats && classes.length > 0) {
      const classIds = classes.map((c: any) => c._id);
      const classNames = Array.from(new Set(classes.map((c: any) => c.name)));
      const schoolObjId = mongoose.Types.ObjectId.isValid(schoolId as string)
        ? new mongoose.Types.ObjectId(schoolId as string)
        : schoolId;

      const [studentCounts, subjectCounts, sectionCounts] = await Promise.all([
        Student.aggregate([
          { $match: { school_id: schoolObjId, class_id: { $in: classIds } } },
          { $group: { _id: "$class_id", count: { $sum: 1 } } }
        ]),
        Subject.aggregate([
          { $match: { school_id: schoolObjId, class_id: { $in: classIds } } },
          { $group: { _id: "$class_id", count: { $sum: 1 } } }
        ]),
        Class.aggregate([
          { $match: { school_id: schoolObjId, name: { $in: classNames } } },
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

    return sendConditionalJson(
      req,
      {
        success: true,
        data: {
          classes: classesWithStats,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      { cacheControl: "private, max-age=60, stale-while-revalidate=60" }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST: Create a new class
export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();

    const body = await req.json();
    const { name, section, academic_year, class_teacher_id, capacity, class_code, status } = body;

    if (!name || !academic_year) {
      return NextResponse.json(
        { success: false, message: "Class name and academic year are required" },
        { status: 400 }
      );
    }

    const newClass = await Class.create({
      school_id:        schoolId as string,
      name:             name.trim(),
      section:          section?.trim() || "",
      class_code:       class_code?.trim().toUpperCase() || undefined,
      status:           status || "Active",
      academic_year:    academic_year.trim(),
      class_teacher_id: class_teacher_id || null,
      capacity:         capacity ? parseInt(capacity) : 40,
      sort_weight:      computeSortWeight(name.trim()),  // set on create too (pre-save also handles it)
    });

    const populated = await newClass.populate("class_teacher_id", "name employee_id");

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
