import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { ExamSchedule } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const body = await req.json();
    const { date, start_time, end_time, max_marks, passing_marks, room } = body;

    const updateFields: any = {};
    if (date) updateFields.date = new Date(date);
    if (start_time) updateFields.start_time = start_time;
    if (end_time) updateFields.end_time = end_time;
    if (max_marks !== undefined) updateFields.max_marks = Number(max_marks);
    if (passing_marks !== undefined) updateFields.passing_marks = Number(passing_marks);
    if (room !== undefined) updateFields.room = room || null;

    try {
      const schedule = await ExamSchedule.findOneAndUpdate(
        { _id: id, school_id: schoolId },
        { $set: updateFields },
        { new: true }
      );

      if (!schedule) {
        return NextResponse.json({ success: false, message: "Schedule not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: schedule });
    } catch (dbErr: any) {
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

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const schedule = await ExamSchedule.findOneAndDelete({ _id: id, school_id: schoolId });
    
    if (!schedule) {
      return NextResponse.json({ success: false, message: "Schedule not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Schedule deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
