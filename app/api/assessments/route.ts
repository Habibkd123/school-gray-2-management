import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { ClassTest, ClassTestMark, Subject } from "@/lib/models/index";
import Class from "@/lib/models/Class";
import Teacher from "@/lib/models/Teacher";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

// ── Compute live status from stored fields ────────────────────────────────────
function computeStatus(test: any): string {
  if (test.status === "draft") return "draft";
  if (test.is_published) return "published";

  const now = new Date();
  const testDate = new Date(test.test_date);
  const isToday =
    testDate.toDateString() === now.toDateString();

  if (isToday) {
    const [sh, sm] = (test.start_time || "00:00").split(":").map(Number);
    const [eh, em] = (test.end_time || "23:59").split(":").map(Number);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (nowMin >= startMin && nowMin <= endMin) return "ongoing";
  }

  if (testDate < now && !isToday) return "completed";
  return "scheduled";
}

// GET — List all tests (school-scoped, paginated)
export async function GET(req: NextRequest) {
  const { schoolId, role, userId, error } = requireAuth(req, [
    "school_admin", "teacher", "student", "parent",
  ]);
  if (error) return error;
  if (!schoolId) return NextResponse.json({ success: false, message: "No school context" }, { status: 400 });

  try {
    await connectDB();
    // ensure models registered
    void [Class.modelName, Teacher.modelName];

    const url = new URL(req.url);
    const class_id = url.searchParams.get("class_id");
    const subject_id = url.searchParams.get("subject_id");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");
    const academic_year = url.searchParams.get("academic_year");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(url.searchParams.get("limit") || "20"));

    const query: any = { school_id: schoolId };

    // Teachers only see their own tests
    if (role === "teacher") {
      const teacherDoc = await Teacher.findOne({ user_id: userId, school_id: schoolId })
        .select("_id").lean();
      if (teacherDoc) query.teacher_id = teacherDoc._id;
    }

    if (class_id && mongoose.Types.ObjectId.isValid(class_id)) query.class_id = class_id;
    if (subject_id && mongoose.Types.ObjectId.isValid(subject_id)) query.subject_id = subject_id;
    if (academic_year) query.academic_year = academic_year;
    if (search) query.title = { $regex: search, $options: "i" };

    const total = await ClassTest.countDocuments(query);
    const tests = await ClassTest.find(query)
      .populate("class_id", "name section")
      .populate("subject_id", "name code")
      .populate("teacher_id", "name employee_id")
      .sort({ test_date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Attach computed status and filter by status param
    const enriched = tests.map((t) => ({ ...t, computedStatus: computeStatus(t) }));
    const filtered = status
      ? enriched.filter((t) => t.computedStatus === status)
      : enriched;

    return NextResponse.json({
      success: true,
      data: filtered,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    console.error("[GET /api/assessments]", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// POST — Create a test
export async function POST(req: NextRequest) {
  const { schoolId, role, userId, error } = requireAuth(req, ["school_admin", "teacher"]);
  if (error) return error;
  if (!schoolId) return NextResponse.json({ success: false, message: "No school context" }, { status: 400 });

  try {
    await connectDB();
    const body = await req.json();

    const {
      title, description, class_id, subject_id,
      test_date, start_time, end_time,
      total_marks, passing_marks, chapter, academic_year,
      status: requestedStatus, assessment_type
    } = body;

    if (!title?.trim()) return NextResponse.json({ success: false, message: "Title is required" }, { status: 400 });
    if (!class_id) return NextResponse.json({ success: false, message: "Class is required" }, { status: 400 });
    if (!subject_id) return NextResponse.json({ success: false, message: "Subject is required" }, { status: 400 });
    if (!test_date) return NextResponse.json({ success: false, message: "Test date is required" }, { status: 400 });
    if (!start_time || !end_time) return NextResponse.json({ success: false, message: "Start and end time are required" }, { status: 400 });
    if (!total_marks || total_marks < 1) return NextResponse.json({ success: false, message: "Total marks must be at least 1" }, { status: 400 });
    if (passing_marks == null || passing_marks < 0) return NextResponse.json({ success: false, message: "Passing marks are required" }, { status: 400 });
    if (passing_marks > total_marks) return NextResponse.json({ success: false, message: "Passing marks cannot exceed total marks" }, { status: 400 });

    // Find teacher_id for this user
    let teacher_id: string;
    const teacherDoc = await Teacher.findOne({ user_id: userId, school_id: schoolId }).select("_id").lean();

    if (role === "teacher") {
      if (!teacherDoc) return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 400 });
      teacher_id = String(teacherDoc._id);
    } else {
      // Admin can specify a teacher_id; fallback to a placeholder if not provided
      teacher_id = body.teacher_id || (teacherDoc ? String(teacherDoc._id) : userId);
    }

    const test = await ClassTest.create({
      school_id: schoolId,
      title: title.trim(),
      description: description?.trim() || undefined,
      class_id,
      subject_id,
      teacher_id,
      test_date: new Date(test_date),
      start_time: start_time.trim(),
      end_time: end_time.trim(),
      total_marks: Number(total_marks),
      passing_marks: Number(passing_marks),
      chapter: chapter?.trim() || undefined,
      academic_year,
      status: requestedStatus || "scheduled",
      assessment_type: assessment_type || "Class Test",
      is_published: false,
    });

    return NextResponse.json({ success: true, data: test }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/assessments]", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
