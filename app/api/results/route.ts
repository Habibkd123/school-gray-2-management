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

export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const body = await req.json();

    // Support bulk entry: array or single object
    const entries = Array.isArray(body) ? body : [body];

    const results = await Promise.all(entries.map(async (entry) => {
      const { exam_id, student_id, subject_id, marks_obtained, total_marks, passing_marks, grade, remarks } = entry;
      const is_pass = passing_marks ? Number(marks_obtained) >= Number(passing_marks) : undefined;

      return Result.findOneAndUpdate(
        { school_id: schoolId, exam_id, student_id, subject_id },
        {
          $set: {
            school_id: schoolId,
            exam_id, student_id, subject_id,
            marks_obtained: Number(marks_obtained),
            total_marks: Number(total_marks),
            passing_marks: passing_marks ? Number(passing_marks) : undefined,
            grade: grade?.trim(),
            is_pass,
            remarks: remarks?.trim(),
          }
        },
        { upsert: true, new: true }
      );
    }));

    return NextResponse.json({ success: true, data: { results } }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
