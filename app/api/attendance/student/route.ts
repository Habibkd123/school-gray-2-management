import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Attendance, Timetable, Student } from "@/lib/models/index";
import Class from "@/lib/models/Class";
import Teacher from "@/lib/models/Teacher";
import User from "@/lib/models/User";
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

    if (!academic_year || !dateParam) {
      return NextResponse.json(
        { success: false, message: "academic_year and date are required" },
        { status: 400 }
      );
    }

    if (classId && !mongoose.Types.ObjectId.isValid(classId)) {
      return NextResponse.json({ success: false, message: "Invalid classId format" }, { status: 400 });
    }

    const startOfDay = new Date(dateParam);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(dateParam);
    endOfDay.setUTCHours(23, 59, 59, 999);

    if (!classId) {
      const query: any = {
        school_id: schoolId as string,
        academic_year,
        date: { $gte: startOfDay, $lte: endOfDay },
        type: "student",
      };

      if (role === "teacher") {
        const teacher = await Teacher.findOne({ user_id: userId, school_id: schoolId });
        if (!teacher) {
          return NextResponse.json({ success: false, message: "Teacher record not found" }, { status: 403 });
        }
        const teacherClassIds = await Class.find({
          school_id: schoolId,
          class_teacher_id: teacher._id
        }).distinct("_id");
        query.class_id = { $in: teacherClassIds };
      }

      const attendanceRecords = await Attendance.find(query).lean();
      return NextResponse.json({
        success: true,
        data: attendanceRecords,
      });
    }

    // Verify teacher assignment for student attendance
    if (role === "teacher") {
      const teacher = await Teacher.findOne({ user_id: userId, school_id: schoolId });
      if (!teacher) {
        return NextResponse.json({ success: false, message: "Teacher record not found" }, { status: 403 });
      }
      const teacherClassIds = await Class.find({
        school_id: schoolId,
        class_teacher_id: teacher._id
      }).distinct("_id");

      const hasAccess = teacherClassIds.map(id => id.toString()).includes(classId);
      if (!hasAccess) {
        return NextResponse.json({ success: false, message: "You are not assigned to this class" }, { status: 403 });
      }
    }

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
      const teacherClassIds = await Class.find({
        school_id: schoolId,
        class_teacher_id: teacher._id
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

    // Date check
    const requestDateStr = date;
    const d = new Date();
    const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const utcToday = d.toISOString().split("T")[0];
    const isToday = (requestDateStr === localToday || requestDateStr === utcToday);

    if (existingRecord && (!body.reason || body.reason.trim() === "")) {
      return NextResponse.json(
        { success: false, message: "A reason is mandatory when editing attendance." },
        { status: 400 }
      );
    }

    if (role === "teacher") {
      if (!isToday) {
        return NextResponse.json(
          { success: false, message: "Teachers can only mark or edit today's attendance." },
          { status: 400 }
        );
      }
    }

    const formattedRecords = records.map((r: any) => ({
      student_id: new mongoose.Types.ObjectId(r.student_id),
      status: r.status.toLowerCase(),
      note: r.note || null,
    }));

    // Maintain Edit History / Audit Log for All Roles
    let auditLogEntry = null;
    if (existingRecord) {
      const changes: any[] = [];
      const oldRecordsMap = new Map();
      existingRecord.records.forEach((r: any) => {
        if (r.student_id) {
          oldRecordsMap.set(r.student_id.toString(), r);
        }
      });

      for (const r of formattedRecords) {
        const studentIdStr = r.student_id.toString();
        const oldRec = oldRecordsMap.get(studentIdStr);
        if (oldRec) {
          const oldStatus = oldRec.status;
          const newStatus = r.status;
          const oldNote = oldRec.note || "";
          const newNote = r.note || "";
          if (oldStatus !== newStatus || oldNote !== newNote) {
            changes.push({
              student_id: r.student_id,
              student_name: "", // Will populate below
              old_status: oldStatus,
              new_status: newStatus,
              old_note: oldNote,
              new_note: newNote,
            });
          }
        } else {
          changes.push({
            student_id: r.student_id,
            student_name: "",
            old_status: "not marked",
            new_status: r.status,
            old_note: "",
            new_note: r.note || "",
          });
        }
      }

      if (changes.length > 0) {
        const studentIds = changes.map(c => c.student_id);
        const { Student } = require("@/lib/models/index");
        const studentsList = await Student.find({ _id: { $in: studentIds } }).select("name").lean();
        const studentNameMap = new Map();
        studentsList.forEach((s: any) => {
          studentNameMap.set(s._id.toString(), s.name);
        });

        changes.forEach(c => {
          c.student_name = studentNameMap.get(c.student_id.toString()) || "Unknown Student";
        });

        const editor = await User.findById(userId).select("name").lean();
        const editorName = editor?.name || (role === "teacher" ? "Teacher" : "Admin/Principal");

        auditLogEntry = {
          edited_by: new mongoose.Types.ObjectId(userId as string),
          edited_by_name: editorName,
          edited_at: new Date(),
          reason: body.reason || "No reason provided",
          changes,
        };
      }
    }

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

    if (auditLogEntry) {
      update.$push = { edit_history: auditLogEntry };
    }

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
