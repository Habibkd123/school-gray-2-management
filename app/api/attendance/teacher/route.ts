import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Attendance } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const { schoolId, userId, role, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const academic_year = url.searchParams.get("academic_year");
    const dateParam = url.searchParams.get("date"); // YYYY-MM-DD

    if (!academic_year || !dateParam) {
      return NextResponse.json(
        { success: false, message: "academic_year and date are required" },
        { status: 400 }
      );
    }

    const startOfDay = new Date(dateParam);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(dateParam);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const query: any = {
      school_id: schoolId as string,
      academic_year,
      date: { $gte: startOfDay, $lte: endOfDay },
      type: "teacher",
    };

    const attendanceRecord = await Attendance.findOne(query).populate("records.teacher_id", "name employee_id _id");

    return NextResponse.json({
      success: true,
      data: attendanceRecord || null,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { schoolId, userId, role, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();

    const body = await req.json();
    const { academic_year, date, records } = body;

    if (!academic_year || !date || !records) {
      return NextResponse.json(
        { success: false, message: "academic_year, date, and records are required" },
        { status: 400 }
      );
    }

    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const filter: any = {
      school_id: new mongoose.Types.ObjectId(schoolId as string),
      academic_year,
      date: { $gte: startOfDay, $lte: endOfDay },
      type: "teacher",
    };

    const formattedRecords = records.map((r: any) => ({
      teacher_id: new mongoose.Types.ObjectId(r.teacher_id),
      status: r.status.toLowerCase(),
      note: r.note || null,
    }));

    const update: any = {
      $set: {
        marked_by: new mongoose.Types.ObjectId(userId as string),
        records: formattedRecords,
      },
      $setOnInsert: {
        school_id: new mongoose.Types.ObjectId(schoolId as string),
        academic_year,
        date: startOfDay,
        type: "teacher",
      }
    };

    const attendanceRecord = await Attendance.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      runValidators: true,
    });

    return NextResponse.json({
      success: true,
      message: "Teacher attendance saved successfully",
      data: attendanceRecord,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal server error" }, { status: 500 });
  }
}
