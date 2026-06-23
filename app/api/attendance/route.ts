import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Attendance, Timetable } from "@/lib/models/index";
import Class from "@/lib/models/Class";
import Teacher from "@/lib/models/Teacher";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

// GET: Fetch attendance for a class on a specific date
export async function GET(req: NextRequest) {
  const { schoolId, userId, role, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const classId = url.searchParams.get("classId");
    const dateParam = url.searchParams.get("date"); // YYYY-MM-DD
    const type = url.searchParams.get("type") || "student";

    if (type === "student" && !classId) {
      return NextResponse.json(
        { success: false, message: "classId and date are required for students" },
        { status: 400 }
      );
    }
    if (!dateParam) {
      return NextResponse.json(
        { success: false, message: "date is required" },
        { status: 400 }
      );
    }

    if (type === "student" && !mongoose.Types.ObjectId.isValid(classId!)) {
      return NextResponse.json(
        { success: false, message: "Invalid classId format" },
        { status: 400 }
      );
    }

    // Verify teacher assignment for student attendance
    if (type === "student" && role === "teacher") {
      const teacher = await Teacher.findOne({ user_id: userId, school_id: schoolId });
      if (!teacher) {
        return NextResponse.json({ success: false, message: "Teacher record not found" }, { status: 403 });
      }
      const classIdsFromTimetable = await Timetable.find({ teacher_id: teacher._id, school_id: schoolId }).distinct("class_id");
      const teacherClassIds = await Class.find({
        school_id: schoolId,
        $or: [
          { class_teacher_id: teacher._id },
          { _id: { $in: classIdsFromTimetable } }
        ]
      }).distinct("_id");

      const hasAccess = teacherClassIds.map(id => id.toString()).includes(classId!);
      if (!hasAccess) {
        return NextResponse.json({ success: false, message: "You are not assigned to this class" }, { status: 403 });
      }
    }

    const startOfDay = new Date(dateParam);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(dateParam);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const query: any = {
      school_id: schoolId as string,
      date: { $gte: startOfDay, $lte: endOfDay },
      type,
    };
    if (type === "student") {
      query.class_id = classId;
    }

    const attendanceRecord = await Attendance.findOne(query).populate("records.student_id", "name roll_no");

    return NextResponse.json({
      success: true,
      data: attendanceRecord || null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Save or Update attendance for a class on a specific date
export async function POST(req: NextRequest) {
  const { schoolId, userId, role, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();

    const body = await req.json();
    const { classId, date, records, type = "student" } = body;

    if (type === "student" && !classId) {
      return NextResponse.json(
        { success: false, message: "classId, date, and records are required for students" },
        { status: 400 }
      );
    }
    if (!date || !records) {
      return NextResponse.json(
        { success: false, message: "date, and records are required" },
        { status: 400 }
      );
    }

    if (type === "student" && !mongoose.Types.ObjectId.isValid(classId)) {
      return NextResponse.json(
        { success: false, message: "Invalid classId format" },
        { status: 400 }
      );
    }

    // Verify teacher assignment for student attendance
    if (type === "student" && role === "teacher") {
      const teacher = await Teacher.findOne({ user_id: userId, school_id: schoolId });
      if (!teacher) {
        return NextResponse.json({ success: false, message: "Teacher record not found" }, { status: 403 });
      }
      const classIdsFromTimetable = await Timetable.find({ teacher_id: teacher._id, school_id: schoolId }).distinct("class_id");
      const teacherClassIds = await Class.find({
        school_id: schoolId,
        $or: [
          { class_teacher_id: teacher._id },
          { _id: { $in: classIdsFromTimetable } }
        ]
      }).distinct("_id");

      const hasAccess = teacherClassIds.map(id => id.toString()).includes(classId);
      if (!hasAccess) {
        return NextResponse.json({ success: false, message: "You are not assigned to this class" }, { status: 403 });
      }
    }

    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Check if record already exists
    const filter: any = {
      school_id: new mongoose.Types.ObjectId(schoolId as string),
      date: { $gte: startOfDay, $lte: endOfDay },
      type,
    };
    if (type === "student") {
      filter.class_id = new mongoose.Types.ObjectId(classId);
    }

    const existingRecord = await Attendance.findOne(filter);

    // Date check: requestDateStr vs Today (local and UTC)
    const requestDateStr = date;
    const d = new Date();
    const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const utcToday = d.toISOString().split("T")[0];
    const isToday = (requestDateStr === localToday || requestDateStr === utcToday);

    if (!existingRecord && !isToday) {
      return NextResponse.json(
        { success: false, message: "Attendance can only be marked for today. Past records cannot be created." },
        { status: 400 }
      );
    }

    // Find the teacher ID if marked by a teacher
    let markedBy = userId;
    if (role === "teacher") {
      const teacher = await Teacher.findOne({ user_id: userId, school_id: schoolId });
      if (teacher) {
        markedBy = teacher._id.toString();
      }
    }

    // Format records to match schema: { student_id, status, note }
    const formattedRecords = records.map((r: any) => ({
      student_id: new mongoose.Types.ObjectId(r.studentId),
      status: r.status.toLowerCase(), // frontend "Present" -> backend "present"
      note: r.note || null,
    }));

    const update: any = {
      $set: {
        marked_by: new mongoose.Types.ObjectId(markedBy),
        records: formattedRecords,
      },
      $setOnInsert: {
        school_id: new mongoose.Types.ObjectId(schoolId as string),
        date: startOfDay,
        type,
      }
    };
    if (type === "student") {
      update.$setOnInsert.class_id = new mongoose.Types.ObjectId(classId);
    }

    const attendanceRecord = await Attendance.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      runValidators: true,
    });

    return NextResponse.json({
      success: true,
      message: "Attendance saved successfully",
      data: attendanceRecord,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
