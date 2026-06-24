import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Attendance, Timetable } from "@/lib/models/index";
import Class from "@/lib/models/Class";
import Teacher from "@/lib/models/Teacher";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const { schoolId, userId, role, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const academic_year = url.searchParams.get("academic_year");
    const dateParam = url.searchParams.get("date"); // YYYY-MM-DD
    const classId = url.searchParams.get("classId");
    const streamId = url.searchParams.get("streamId");
    const sectionId = url.searchParams.get("sectionId");

    if (!academic_year || !dateParam || !classId) {
      return NextResponse.json(
        { success: false, message: "academic_year, date, and classId are required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return NextResponse.json({ success: false, message: "Invalid classId format" }, { status: 400 });
    }

    // Verify teacher assignment for student attendance
    if (role === "teacher") {
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

    const startOfDay = new Date(dateParam);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(dateParam);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const query: any = {
      school_id: schoolId as string,
      academic_year,
      class_id: classId,
      date: { $gte: startOfDay, $lte: endOfDay },
      type: "student",
    };

    if (streamId && mongoose.Types.ObjectId.isValid(streamId)) {
      query.stream_id = streamId;
    } else {
      query.stream_id = null;
    }

    if (sectionId && mongoose.Types.ObjectId.isValid(sectionId)) {
      query.section_id = sectionId;
    } else {
      query.section_id = null;
    }

    const attendanceRecord = await Attendance.findOne(query).populate("records.student_id", "name roll_no");

    return NextResponse.json({
      success: true,
      data: attendanceRecord || null,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { schoolId, userId, role, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();

    const body = await req.json();
    const { academic_year, date, classId, streamId, sectionId, records } = body;

    if (!academic_year || !date || !classId || !records) {
      return NextResponse.json(
        { success: false, message: "academic_year, date, classId, and records are required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return NextResponse.json({ success: false, message: "Invalid classId format" }, { status: 400 });
    }

    // Verify teacher assignment for student attendance
    if (role === "teacher") {
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

    const filter: any = {
      school_id: new mongoose.Types.ObjectId(schoolId as string),
      academic_year,
      class_id: new mongoose.Types.ObjectId(classId),
      date: { $gte: startOfDay, $lte: endOfDay },
      type: "student",
    };
    filter.stream_id = streamId && mongoose.Types.ObjectId.isValid(streamId) ? new mongoose.Types.ObjectId(streamId) : null;
    filter.section_id = sectionId && mongoose.Types.ObjectId.isValid(sectionId) ? new mongoose.Types.ObjectId(sectionId) : null;

    const existingRecord = await Attendance.findOne(filter);

    // Date check: only allow today if not editing
    const requestDateStr = date;
    const d = new Date();
    const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const utcToday = d.toISOString().split("T")[0];
    const isToday = (requestDateStr === localToday || requestDateStr === utcToday);

    if (!existingRecord && !isToday && role !== "school_admin" && role !== "super_admin") {
      return NextResponse.json(
        { success: false, message: "Teachers can only mark attendance for today. Admins can mark past dates." },
        { status: 400 }
      );
    }

    const formattedRecords = records.map((r: any) => ({
      student_id: new mongoose.Types.ObjectId(r.student_id),
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
        class_id: new mongoose.Types.ObjectId(classId),
        stream_id: filter.stream_id,
        section_id: filter.section_id,
        date: startOfDay,
        type: "student",
      }
    };

    const attendanceRecord = await Attendance.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      runValidators: true,
    });

    return NextResponse.json({
      success: true,
      message: "Student attendance saved successfully",
      data: attendanceRecord,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal server error" }, { status: 500 });
  }
}
