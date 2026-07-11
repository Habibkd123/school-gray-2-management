import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Result, Exam } from "@/lib/models/index";
import Student from "@/lib/models/Student";
import Parent from "@/lib/models/Parent";
import { requireAuth } from "@/lib/utils/auth";
import { paginateQuery } from "@/lib/utils/pagination";

export async function GET(req: NextRequest) {
  const { schoolId, role, userId, error } = requireAuth(req, ["school_admin", "teacher", "student", "parent", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const examId = url.searchParams.get("exam_id");
    const studentId = url.searchParams.get("student_id");
    const classId = url.searchParams.get("class_id");
    const academic_year = url.searchParams.get("academic_year");

    const query: any = { school_id: schoolId };
    if (examId) query.exam_id = examId;
    
    let targetStudentIds: string[] | null = null;
    if (classId) {
      const classStudents = await Student.find({ class_id: classId, school_id: schoolId }).select("_id").lean();
      targetStudentIds = classStudents.map((s: any) => s._id.toString());
    }

    if (studentId) {
      if (targetStudentIds && !targetStudentIds.includes(studentId)) {
        return NextResponse.json({ success: true, data: { results: [], total: 0, page: 1, totalPages: 1, limit: 25 } });
      }
      query.student_id = studentId;
    } else if (targetStudentIds) {
      query.student_id = { $in: targetStudentIds };
    }

    if (role === "student") {
      const studentProfile = await Student.findOne({ school_id: schoolId, user_id: userId }).select("_id").lean();
      if (!studentProfile) {
        return NextResponse.json({ success: true, data: { results: [], total: 0, page: 1, totalPages: 1, limit: 25 } });
      }
      if (studentId && studentId !== studentProfile._id.toString()) {
        return NextResponse.json({ success: false, message: "Access denied to student record" }, { status: 403 });
      }
      query.student_id = studentProfile._id;
    } else if (role === "parent") {
      const parent = await Parent.findOne({ user_id: userId, school_id: schoolId }).select("_id").lean();
      if (!parent) {
        return NextResponse.json({ success: true, data: { results: [], total: 0, page: 1, totalPages: 1, limit: 25 } });
      }
      const children = await Student.find({ school_id: schoolId, parent_id: parent._id }).select("_id").lean();
      const childIds = children.map((c: any) => c._id.toString());
      if (studentId) {
        if (!childIds.includes(studentId)) {
          return NextResponse.json({ success: false, message: "Access denied to student record" }, { status: 403 });
        }
        query.student_id = studentId;
      } else {
        query.student_id = { $in: childIds };
      }
    }

    // Filter by academic year — look up exam IDs for that year
    if (academic_year && !examId) {
      const examsForYear = await Exam.find({ school_id: schoolId, academic_year }).select("_id").lean();
      const examIds = examsForYear.map((e: any) => e._id);
      query.exam_id = { $in: examIds };
    }

    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "25"));

    const { items: results, total, totalPages } = await paginateQuery(
      Result,
      query,
      {
        page,
        limit,
        sort: { createdAt: -1 },
        populate: [
          { path: "student_id", select: "name roll_no" },
          { path: "subject_id", select: "name code" },
          { path: "exam_id", select: "name type" }
        ]
      }
    );

    return NextResponse.json({ success: true, data: { results, total, page, totalPages, limit } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  const { schoolId, role, userId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const body = await req.json();

    // Support bulk entry: array or single object
    const entries = Array.isArray(body) ? body : [body];

    if (entries.length > 0) {
      const firstExamId = entries[0].exam_id;
      const exam = await Exam.findById(firstExamId).lean() as any;
      
      if (exam?.is_published && role === "teacher") {
        return NextResponse.json({ success: false, message: "Marks are locked because the exam results have been published. Only Principal/Admin can modify published marks." }, { status: 403 });
      }

      if (role === "teacher") {
        const teacherRecord = await mongoose.model("Teacher").findOne({ user_id: userId, school_id: schoolId }).select("_id").lean() as any;
        if (!teacherRecord) {
          return NextResponse.json({ success: false, message: "Teacher profile not found." }, { status: 403 });
        }

        const classId = exam?.class_id;
        const subjectId = entries[0].subject_id;

        const hasAssignment = await mongoose.model("TeacherAssignment").findOne({
          school_id: schoolId,
          teacher_id: teacherRecord._id,
          class_id: classId,
          $or: [
            { subject_master_id: subjectId },
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

    const results = await Promise.all(entries.map(async (entry) => {
      const { exam_id, student_id, subject_id, marks_obtained, total_marks, passing_marks, grade, remarks, status, attendance_status } = entry;
      const is_pass = passing_marks ? Number(marks_obtained) >= Number(passing_marks) : undefined;
      
      const previous = await Result.findOne({ school_id: schoolId, exam_id, student_id, subject_id }).lean();
      const newObtained = Number(marks_obtained || 0);
      const newAttendanceStatus = attendance_status || "Present";
      const newStatusVal = status || "final";

      const savedResult = await Result.findOneAndUpdate(
        { school_id: schoolId, exam_id, student_id, subject_id },
        {
          $set: {
            school_id: schoolId,
            exam_id, student_id, subject_id,
            marks_obtained: newObtained,
            total_marks: Number(total_marks),
            passing_marks: passing_marks ? Number(passing_marks) : undefined,
            grade: grade?.trim(),
            is_pass,
            remarks: remarks?.trim(),
            status: newStatusVal,
            attendance_status: newAttendanceStatus,
            entered_by: role === "teacher" ? userId : undefined
          }
        },
        { upsert: true, new: true }
      );

      // Log Audit History
      try {
        if (previous) {
          if (
            previous.marks_obtained !== newObtained ||
            previous.attendance_status !== newAttendanceStatus ||
            previous.status !== newStatusVal
          ) {
            await mongoose.model("ResultAudit").create({
              school_id: schoolId,
              result_id: previous._id,
              exam_id,
              student_id,
              subject_id,
              previous_marks: previous.marks_obtained,
              new_marks: newObtained,
              previous_status: previous.status,
              new_status: newStatusVal,
              previous_attendance_status: previous.attendance_status || "Present",
              new_attendance_status: newAttendanceStatus,
              action_type: "update",
              reason: remarks || "Marks updated in Entry Portal",
              changed_by: userId
            });
          }
        } else {
          await mongoose.model("ResultAudit").create({
            school_id: schoolId,
            result_id: savedResult._id,
            exam_id,
            student_id,
            subject_id,
            previous_marks: 0,
            new_marks: newObtained,
            previous_status: "draft",
            new_status: newStatusVal,
            previous_attendance_status: "Present",
            new_attendance_status: newAttendanceStatus,
            action_type: "create",
            reason: remarks || "Initial marks entry",
            changed_by: userId
          });
        }
      } catch (auditErr) {
        console.error("Result Audit Log Failed:", auditErr);
      }

      return savedResult;
    }));

    return NextResponse.json({ success: true, data: { results } }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "Result ID is required" }, { status: 400 });
    }

    const result = await Result.findOneAndDelete({ _id: id, school_id: schoolId });
    if (!result) {
      return NextResponse.json({ success: false, message: "Result not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Result deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
