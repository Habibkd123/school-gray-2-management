import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { ClassTest, ClassTestMark } from "@/lib/models/index";
import Student from "@/lib/models/Student";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";
import { sendCompressedJson } from "@/lib/compression";

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

    // ── Aggregation + countDocuments run concurrently (previously sequential) ──
    // The $group stage computes highest/lowest/sum/pass_count at DB level,
    // transferring 1 stats document instead of N raw mark documents.
    // Index used: class_test_mark_test_student_unique_v1 ({ test_id, student_id })
    const [analyticsResult, totalStudents] = await Promise.all([
      ClassTestMark.aggregate([
        // STAGE 1: Filter by test_id — uses the { test_id, student_id } unique index
        { $match: { test_id: new mongoose.Types.ObjectId(id) } },
        // STAGE 2: Compute all statistics in a single DB-level pass
        {
          $group: {
            _id:           null,
            marks_entered: { $sum: 1 },
            highest:       { $max: "$marks_obtained" },
            lowest:        { $min: "$marks_obtained" },
            total_sum:     { $sum: "$marks_obtained" },
            pass_count:    { $sum: { $cond: ["$is_pass", 1, 0] } },
          },
        },
      ]),
      Student.countDocuments({
        school_id: schoolId,
        class_id: test.class_id,
        is_active: true,
      }),
    ]);

    const analytics = analyticsResult[0];

    // Preserve existing empty-marks behavior: all numeric fields default to 0/null
    if (!analytics || analytics.marks_entered === 0) {
      return sendCompressedJson(req, {
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
      }, { cacheControl: "private, no-cache" });
    }

    // Derive remaining fields in JS — same formulas and precision as before
    const marksEntered    = analytics.marks_entered;
    const passCount       = analytics.pass_count;
    const failCount       = marksEntered - passCount;
    const average         = analytics.total_sum / marksEntered;
    const passPercentage  = parseFloat(((passCount / marksEntered) * 100).toFixed(1));
    const failPercentage  = parseFloat(((failCount / marksEntered) * 100).toFixed(1));

    // Chapter performance alert: if >50% failed and there's a chapter linked
    let chapterAlert: string | null = null;
    if (test.chapter && failPercentage > 50) {
      chapterAlert = `Most students performed poorly in "${test.chapter}". Re-teaching this chapter is recommended.`;
    }

    return sendCompressedJson(req, {
      success: true,
      data: {
        total_students:  totalStudents,
        marks_entered:   marksEntered,
        highest:         analytics.highest,
        lowest:          analytics.lowest,
        average:         parseFloat(average.toFixed(2)),
        pass_count:      passCount,
        fail_count:      failCount,
        pass_percentage: passPercentage,
        fail_percentage: failPercentage,
        chapter:         test.chapter || null,
        chapter_alert:   chapterAlert,
        total_marks:     test.total_marks,
        passing_marks:   test.passing_marks,
      },
    }, { cacheControl: "private, no-cache" });
  } catch (err: any) {
    console.error("[GET /api/assessments/[id]/analytics]", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
