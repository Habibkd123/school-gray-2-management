import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { ExamSchedule } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";

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
      .sort({ date: 1, start_time: 1 });

    return NextResponse.json({ success: true, data: schedules });
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

    try {
      const schedule = await ExamSchedule.create({
        school_id: schoolId as string,
        exam_id,
        subject_id,
        date: new Date(date),
        start_time,
        end_time,
        max_marks: Number(max_marks),
        passing_marks: Number(passing_marks),
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
