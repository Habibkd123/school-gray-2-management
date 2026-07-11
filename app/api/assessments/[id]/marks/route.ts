import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { ClassTest, ClassTestMark } from "@/lib/models/index";
import Student from "@/lib/models/Student";
import Teacher from "@/lib/models/Teacher";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

// GET — List all students for the test's class with their marks (if entered)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher"]);
  if (error) return error;
  if (!schoolId) return NextResponse.json({ success: false, message: "No school context" }, { status: 400 });

  try {
    await connectDB();
    void [Teacher.modelName];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid test ID" }, { status: 400 });
    }

    const test = await ClassTest.findOne({ _id: id, school_id: schoolId }).lean();
    if (!test) return NextResponse.json({ success: false, message: "Test not found" }, { status: 404 });

    // Get all active students in this class
    const students = await Student.find({
      school_id: schoolId,
      class_id: test.class_id,
      status: "Active",
    })
      .select("_id name roll_no admission_no photo_url")
      .sort({ roll_no: 1, name: 1 })
      .lean();

    // Get existing marks for this test
    const marks = await ClassTestMark.find({ test_id: id }).lean();
    const marksMap = new Map(marks.map((m) => [String(m.student_id), m]));

    const rows = students.map((s) => {
      const mark = marksMap.get(String(s._id));
      return {
        student_id: s._id,
        name: s.name,
        roll_no: s.roll_no || "",
        admission_no: s.admission_no || "",
        photo_url: (s as any).photo_url || "",
        marks_obtained: mark?.marks_obtained ?? null,
        is_pass: mark?.is_pass ?? null,
        remarks: mark?.remarks ?? "",
        attendance_status: mark?.attendance_status || "Present",
        has_entry: !!mark,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        test: {
          _id: test._id,
          title: test.title,
          total_marks: test.total_marks,
          passing_marks: test.passing_marks,
          is_published: test.is_published,
          status: test.status,
          class_id: test.class_id,
          subject_id: test.subject_id,
        },
        rows,
      },
    });
  } catch (err: any) {
    console.error("[GET /api/assessments/[id]/marks]", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// POST — Bulk save / upsert marks
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { schoolId, role, userId, error } = requireAuth(req, ["school_admin", "teacher"]);
  if (error) return error;
  if (!schoolId) return NextResponse.json({ success: false, message: "No school context" }, { status: 400 });

  try {
    await connectDB();

    const test = await ClassTest.findOne({ _id: id, school_id: schoolId }).lean();
    if (!test) return NextResponse.json({ success: false, message: "Test not found" }, { status: 404 });

    // Published Lock check
    if ((test.is_published || test.status === "published") && role === "teacher") {
      return NextResponse.json({ success: false, message: "Marks are locked because this assessment has been published. Only Principal/Admin can modify published marks." }, { status: 403 });
    }

    // Teacher permissions check (creator or mapped assignment)
    if (role === "teacher") {
      const teacherDoc = await Teacher.findOne({ user_id: userId, school_id: schoolId }).select("_id").lean();
      if (!teacherDoc) {
        return NextResponse.json({ success: false, message: "Teacher profile not found" }, { status: 403 });
      }

      const isCreator = String(test.teacher_id) === String(teacherDoc._id);
      if (!isCreator) {
        const hasAssignment = await mongoose.model("TeacherAssignment").findOne({
          school_id: schoolId,
          teacher_id: teacherDoc._id,
          class_id: test.class_id,
          $or: [
            { subject_master_id: test.subject_id },
            { assignment_type: "Class Teacher" },
            { assignment_type: "Co-Class Teacher" }
          ],
          status: "Active",
          is_deleted: { $ne: true }
        }).lean();

        if (!hasAssignment) {
          return NextResponse.json({ success: false, message: "You are not authorized to enter marks for this class/subject." }, { status: 403 });
        }
      }
    }

    const { entries } = await req.json();
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ success: false, message: "No entries provided" }, { status: 400 });
    }

    const ops: any[] = [];
    const errors: string[] = [];

    for (const entry of entries) {
      const { student_id, marks_obtained, remarks, attendance_status } = entry;

      if (!student_id || !mongoose.Types.ObjectId.isValid(student_id)) {
        errors.push(`Invalid student_id: ${student_id}`);
        continue;
      }

      const newAttendanceStatus = attendance_status || "Present";
      let mo = Number(marks_obtained);
      if (newAttendanceStatus === "Absent") {
        mo = 0;
      }

      if (newAttendanceStatus === "Present") {
        if (marks_obtained === null || marks_obtained === undefined || marks_obtained === "") continue;
        if (isNaN(mo) || mo < 0) {
          errors.push(`Invalid marks for student ${student_id}`);
          continue;
        }
        if (mo > test.total_marks) {
          errors.push(`Marks (${mo}) exceed total marks (${test.total_marks}) for student ${student_id}`);
          continue;
        }
      }

      const is_pass = mo >= test.passing_marks;
      
      const previous = await ClassTestMark.findOne({ test_id: id, student_id }).lean();

      ops.push({
        updateOne: {
          filter: { test_id: id, student_id },
          update: {
            $set: {
              school_id: schoolId,
              test_id: new mongoose.Types.ObjectId(id),
              student_id: new mongoose.Types.ObjectId(student_id),
              marks_obtained: mo,
              is_pass,
              remarks: remarks?.trim() || null,
              attendance_status: newAttendanceStatus,
              entered_by: new mongoose.Types.ObjectId(userId!),
            },
          },
          upsert: true,
        },
      });

      // Log Audit Trail entry
      try {
        if (previous) {
          if (
            previous.marks_obtained !== mo ||
            previous.attendance_status !== newAttendanceStatus
          ) {
            await mongoose.model("ClassTestMarkAudit").create({
              school_id: schoolId,
              mark_id: previous._id,
              test_id: id,
              student_id,
              previous_marks: previous.marks_obtained,
              new_marks: mo,
              previous_attendance_status: previous.attendance_status || "Present",
              new_attendance_status: newAttendanceStatus,
              action_type: "update",
              reason: remarks || "Marks updated in Assessment Console",
              changed_by: userId
            });
          }
        } else {
          await mongoose.model("ClassTestMarkAudit").create({
            school_id: schoolId,
            test_id: id,
            student_id,
            previous_marks: 0,
            new_marks: mo,
            previous_attendance_status: "Present",
            new_attendance_status: newAttendanceStatus,
            action_type: "create",
            reason: remarks || "Initial assessment entry",
            changed_by: userId
          });
        }
      } catch (auditErr) {
        console.error("ClassTestMark Audit Log Failed:", auditErr);
      }
    }

    if (errors.length > 0 && ops.length === 0) {
      return NextResponse.json({ success: false, message: errors.join("; ") }, { status: 400 });
    }

    if (ops.length > 0) {
      await ClassTestMark.bulkWrite(ops);

      // Compute and update student rankings
      const allMarks = await ClassTestMark.find({ test_id: id })
        .sort({ marks_obtained: -1 })
        .lean();
      const rankOps = allMarks.map((m, idx) => ({
        updateOne: {
          filter: { _id: m._id },
          update: { $set: { rank: idx + 1 } },
        },
      }));
      if (rankOps.length) await ClassTestMark.bulkWrite(rankOps);
    }

    return NextResponse.json({
      success: true,
      message: `Marks saved for ${ops.length} students`,
      warnings: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error("[POST /api/assessments/[id]/marks]", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
