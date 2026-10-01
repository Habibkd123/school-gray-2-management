import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { ClassTest, ClassTestMark } from "@/lib/models/index";
import Student from "@/lib/models/Student";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";
import { sendCompressedJson } from "@/lib/compression";

// GET — Paginated results for a test (published check for students)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { schoolId, role, userId, error } = requireAuth(req, [
    "school_admin", "teacher", "student", "parent",
  ]);
  if (error) return error;
  if (!schoolId) return NextResponse.json({ success: false, message: "No school context" }, { status: 400 });

  try {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid test ID" }, { status: 400 });
    }

    const test = await ClassTest.findOne({ _id: id, school_id: schoolId })
      .populate("class_id", "name section")
      .populate("subject_id", "name")
      .lean();
    if (!test) return NextResponse.json({ success: false, message: "Test not found" }, { status: 404 });

    // Students can only view published results
    if ((role === "student" || role === "parent") && !test.is_published) {
      return NextResponse.json({ success: false, message: "Results have not been published yet" }, { status: 403 });
    }

    const url = new URL(req.url);
    const search = url.searchParams.get("search");
    const filter = url.searchParams.get("filter"); // pass | fail
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, parseInt(url.searchParams.get("limit") || "50"));

    let marksQuery: any = { test_id: id };
    if (filter === "pass") marksQuery.is_pass = true;
    if (filter === "fail") marksQuery.is_pass = false;

    const allMarks = await ClassTestMark.find(marksQuery)
      .populate("student_id", "name roll_no admission_no")
      .sort({ rank: 1, marks_obtained: -1 })
      .lean();

    // Apply search client-side (student name / roll no)
    const filtered = search
      ? allMarks.filter((m) => {
          const s = m.student_id as any;
          const q = search.toLowerCase();
          return (
            s?.name?.toLowerCase().includes(q) ||
            s?.roll_no?.toString().includes(q) ||
            s?.admission_no?.toLowerCase().includes(q)
          );
        })
      : allMarks;

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    const rows = paginated.map((m) => {
      const s = m.student_id as any;
      const pct = test.total_marks > 0
        ? parseFloat(((m.marks_obtained / test.total_marks) * 100).toFixed(1))
        : 0;
      return {
        mark_id: m._id,
        student_id: s?._id,
        name: s?.name || "—",
        roll_no: s?.roll_no || "—",
        admission_no: s?.admission_no || "—",
        marks_obtained: m.marks_obtained,
        total_marks: test.total_marks,
        percentage: pct,
        is_pass: m.is_pass,
        rank: m.rank ?? null,
        remarks: m.remarks || "",
      };
    });

    return sendCompressedJson(req, {
      success: true,
      data: {
        test: {
          _id: test._id,
          title: test.title,
          total_marks: test.total_marks,
          passing_marks: test.passing_marks,
          is_published: test.is_published,
          class_id: test.class_id,
          subject_id: test.subject_id,
          test_date: test.test_date,
        },
        rows,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    }, { cacheControl: "private, no-cache" });
  } catch (err: any) {
    console.error("[GET /api/assessments/[id]/results]", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
