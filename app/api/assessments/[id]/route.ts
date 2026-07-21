import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { ClassTest, ClassTestMark } from "@/lib/models/index";
import Class from "@/lib/models/Class";
import Teacher from "@/lib/models/Teacher";
import Student from "@/lib/models/Student";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

function computeStatus(test: any): string {
  if (test.status === "draft") return "draft";
  if (test.is_published) return "published";
  const now = new Date();
  const testDate = new Date(test.test_date);
  const isToday = testDate.toDateString() === now.toDateString();
  if (isToday) {
    const [sh, sm] = (test.start_time || "00:00").split(":").map(Number);
    const [eh, em] = (test.end_time || "23:59").split(":").map(Number);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    if (nowMin >= sh * 60 + sm && nowMin <= eh * 60 + em) return "ongoing";
  }
  if (testDate < now && !isToday) return "completed";
  return "scheduled";
}

// GET — Single test with student stats
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "student", "parent"]);
  if (error) return error;
  if (!schoolId) return NextResponse.json({ success: false, message: "No school context" }, { status: 400 });

  try {
    await connectDB();
    void [Class.modelName, Teacher.modelName];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    const test = await ClassTest.findOne({ _id: id, school_id: schoolId })
      .populate("class_id", "name section")
      .populate("subject_id", "name code")
      .populate("teacher_id", "name employee_id")
      .lean();

    if (!test) return NextResponse.json({ success: false, message: "Test not found" }, { status: 404 });

    // Student count for the class
    const totalStudents = await Student.countDocuments({
      school_id: schoolId,
      class_id: test.class_id,
      is_active: true,
    });

    const marksEntered = await ClassTestMark.countDocuments({ test_id: id });
    const pendingMarks = Math.max(0, totalStudents - marksEntered);

    return NextResponse.json({
      success: true,
      data: {
        ...test,
        computedStatus: computeStatus(test),
        totalStudents,
        marksEntered,
        pendingMarks,
      },
    });
  } catch (err: any) {
    console.error("[GET /api/assessments/[id]]", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// PUT — Update test (admin can edit any; teacher can only edit own)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { schoolId, role, userId, error } = requireAuth(req, ["school_admin", "teacher"]);
  if (error) return error;
  if (!schoolId) return NextResponse.json({ success: false, message: "No school context" }, { status: 400 });

  try {
    await connectDB();

    const test = await ClassTest.findOne({ _id: id, school_id: schoolId });
    if (!test) return NextResponse.json({ success: false, message: "Test not found" }, { status: 404 });

    // Teachers can only edit their own tests
    if (role === "teacher") {
      const teacherDoc = await Teacher.findOne({ user_id: userId, school_id: schoolId }).select("_id").lean();
      if (!teacherDoc || String(test.teacher_id) !== String(teacherDoc._id)) {
        return NextResponse.json({ success: false, message: "You can only edit your own tests" }, { status: 403 });
      }
    }

    const body = await req.json();
    const allowedFields = [
      "title", "description", "class_id", "subject_id", "test_date",
      "start_time", "end_time", "total_marks", "passing_marks", "chapter",
      "academic_year", "status", "assessment_type"
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (test as any)[field] = body[field];
      }
    }

    if (body.total_marks && body.passing_marks && body.passing_marks > body.total_marks) {
      return NextResponse.json({ success: false, message: "Passing marks cannot exceed total marks" }, { status: 400 });
    }

    await test.save();

    return NextResponse.json({ success: true, data: test });
  } catch (err: any) {
    console.error("[PUT /api/assessments/[id]]", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// DELETE — Admin only
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { schoolId, role, error } = requireAuth(req, ["school_admin"]);
  if (error) return error;
  if (!schoolId) return NextResponse.json({ success: false, message: "No school context" }, { status: 400 });

  if (role !== "school_admin") {
    return NextResponse.json({ success: false, message: "Only admins can delete tests" }, { status: 403 });
  }

  try {
    await connectDB();

    const test = await ClassTest.findOneAndDelete({ _id: id, school_id: schoolId });
    if (!test) return NextResponse.json({ success: false, message: "Test not found" }, { status: 404 });

    // Also remove all marks for this test
    await ClassTestMark.deleteMany({ test_id: id });

    return NextResponse.json({ success: true, message: "Test deleted successfully" });
  } catch (err: any) {
    console.error("[DELETE /api/assessments/[id]]", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
