import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { ExamSchedule, Exam, Subject } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import { sendCompressedJson } from "@/lib/compression";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const examId = url.searchParams.get("exam_id");

    const query: any = { school_id: schoolId };
    if (examId) query.exam_id = examId;

    const schedules = await ExamSchedule.find(query)
      .populate("subject_id", "name code")
      .sort({ date: 1, start_time: 1 })
      .lean();

    return sendCompressedJson(req, { success: true, data: schedules }, { cacheControl: "private, no-cache" });
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
    const { exam_id, subject_id, date, start_time, end_time, max_marks, passing_marks, room } = body;

    if (!exam_id || !subject_id || !date || !start_time || !end_time || max_marks === undefined || passing_marks === undefined) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(exam_id) || !mongoose.Types.ObjectId.isValid(subject_id)) {
      return NextResponse.json({ success: false, message: "Invalid exam or subject ID" }, { status: 400 });
    }

    const maxMarksNum = Number(max_marks);
    const passingMarksNum = Number(passing_marks);

    if (isNaN(maxMarksNum) || maxMarksNum <= 0) {
      return NextResponse.json({ success: false, message: "Max marks must be greater than 0" }, { status: 400 });
    }
    if (isNaN(passingMarksNum) || passingMarksNum < 0 || passingMarksNum > maxMarksNum) {
      return NextResponse.json({ success: false, message: "Passing marks must be between 0 and max marks" }, { status: 400 });
    }

    const [exam, subject] = await Promise.all([
      Exam.findOne({ _id: exam_id, school_id: schoolId }),
      Subject.findOne({ _id: subject_id, school_id: schoolId }).then(async (s) => s || await mongoose.model("SubjectMaster").findOne({ _id: subject_id, school_id: schoolId })),
    ]);

    if (!exam) {
      return NextResponse.json({ success: false, message: "Exam not found in this school" }, { status: 404 });
    }
    if (!subject) {
      return NextResponse.json({ success: false, message: "Subject not found in this school" }, { status: 404 });
    }

    const existingSchedule = await ExamSchedule.findOne({
      exam_id,
      subject_id,
      date: new Date(date)
    });
    if (existingSchedule) {
      return NextResponse.json({ 
        success: false, 
        message: "A schedule for this subject and date already exists for this exam." 
      }, { status: 400 });
    }

    try {
      const schedule = await ExamSchedule.create({
        school_id: schoolId as string,
        exam_id,
        subject_id,
        date: new Date(date),
        start_time,
        end_time,
        max_marks: maxMarksNum,
        passing_marks: passingMarksNum,
        room: room || undefined
      });

      return NextResponse.json({ success: true, data: schedule }, { status: 201 });
    } catch (dbErr: any) {
      // Handle MongoDB unique index error for exam_id + subject_id + date duplicate
      if (dbErr.code === 11000) {
        return NextResponse.json({ 
          success: false, 
          message: "A schedule for this subject and date already exists for this exam." 
        }, { status: 400 });
      }
      throw dbErr;
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
