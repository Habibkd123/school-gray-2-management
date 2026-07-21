import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { ClassTest, ClassTestMark } from "@/lib/models/index";
import Student from "@/lib/models/Student";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

// GET — Performance analytics for a test
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "student"]);
  if (error) return error;
  if (!schoolId) return NextResponse.json({ success: false, message: "No school context" }, { status: 400 });

  try {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid test ID" }, { status: 400 });
    }

    const test = await ClassTest.findOne({ _id: id, school_id: schoolId }).lean();
    if (!test) return NextResponse.json({ success: false, message: "Test not found" }, { status: 404 });

    const marks = await ClassTestMark.find({ test_id: id }).lean();
    const totalStudents = await Student.countDocuments({
      school_id: schoolId,
      class_id: test.class_id,
      is_active: true,
    });

    if (marks.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          total_students: totalStudents,
          marks_entered: 0,
          highest: null,
          lowest: null,
          average: null,
          pass_count: 0,
          fail_count: 0,
          pass_percentage: 0,
          fail_percentage: 0,
          chapter: test.chapter || null,
          chapter_alert: null,
        },
      });
    }

    const marksArr = marks.map((m) => m.marks_obtained);
    const highest = Math.max(...marksArr);
    const lowest = Math.min(...marksArr);
    const average = marksArr.reduce((a, b) => a + b, 0) / marksArr.length;
    const passCount = marks.filter((m) => m.is_pass).length;
    const failCount = marks.length - passCount;
    const passPercentage = parseFloat(((passCount / marks.length) * 100).toFixed(1));
    const failPercentage = parseFloat(((failCount / marks.length) * 100).toFixed(1));

    // Chapter performance alert: if >50% failed and there's a chapter linked
    let chapterAlert: string | null = null;
    if (test.chapter && failPercentage > 50) {
      chapterAlert = `Most students performed poorly in "${test.chapter}". Re-teaching this chapter is recommended.`;
    }

    return NextResponse.json({
      success: true,
      data: {
        total_students: totalStudents,
        marks_entered: marks.length,
        highest,
        lowest,
        average: parseFloat(average.toFixed(2)),
        pass_count: passCount,
        fail_count: failCount,
        pass_percentage: passPercentage,
        fail_percentage: failPercentage,
        chapter: test.chapter || null,
        chapter_alert: chapterAlert,
        total_marks: test.total_marks,
        passing_marks: test.passing_marks,
      },
    });
  } catch (err: any) {
    console.error("[GET /api/assessments/[id]/analytics]", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
