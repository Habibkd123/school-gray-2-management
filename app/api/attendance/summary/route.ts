import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Attendance, Timetable } from "@/lib/models/index";
import Class from "@/lib/models/Class";
import Teacher from "@/lib/models/Teacher";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";
import { sendCompressedJson } from "@/lib/compression";

export async function GET(req: NextRequest) {
  const { schoolId, role, userId, error } = requireAuth(req, [
    "school_admin",
    "teacher",
    "super_admin",
    "student",
    "parent"
  ]);
  if (error) return error;

  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const startDateParam = url.searchParams.get("startDate"); // YYYY-MM-DD
    const endDateParam = url.searchParams.get("endDate"); // YYYY-MM-DD
    const type = url.searchParams.get("type") || "student";
    const classId = url.searchParams.get("classId");
    let recordId = url.searchParams.get("recordId");

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { success: false, message: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    if (isNaN(new Date(startDateParam).getTime()) || isNaN(new Date(endDateParam).getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid startDate or endDate format" },
        { status: 400 }
      );
    }

    if (classId && !mongoose.Types.ObjectId.isValid(classId)) {
      return NextResponse.json({ success: false, message: "Invalid classId format" }, { status: 400 });
    }

    if (recordId && !mongoose.Types.ObjectId.isValid(recordId)) {
      return NextResponse.json({ success: false, message: "Invalid recordId format" }, { status: 400 });
    }

    // Role-based restrictions for student role
    if (role === "student") {
      const Student = (await import("@/lib/models/Student")).default;
      const studentProfile = await Student.findOne({ school_id: schoolId, user_id: userId }).select("_id").lean();
      if (!studentProfile) {
        return NextResponse.json({ success: false, message: "Student record not found" }, { status: 404 });
      }
      recordId = studentProfile._id.toString();
    }

    // Role-based restrictions for parent role
    if (role === "parent") {
      if (!recordId) {
        return NextResponse.json({ success: false, message: "recordId is required for parent" }, { status: 400 });
      }
      const Parent = (await import("@/lib/models/Parent")).default;
      const parentProfile = await Parent.findOne({ school_id: schoolId, user_id: userId }).lean();
      if (!parentProfile) {
        return NextResponse.json({ success: false, message: "Parent record not found" }, { status: 404 });
      }
      const Student = (await import("@/lib/models/Student")).default;
      const studentProfile = await Student.findOne({ _id: recordId, parent_id: parentProfile._id, school_id: schoolId }).select("_id").lean();
      if (!studentProfile) {
        return NextResponse.json({ success: false, message: "Unauthorized access to child data" }, { status: 403 });
      }
    }

    if (type === "student" && !classId && !recordId) {
      return NextResponse.json(
        { success: false, message: "classId or recordId is required for student summary" },
        { status: 400 }
      );
    }

    // Verify teacher assignment for student attendance summary
    if (type === "student" && role === "teacher") {
      const Teacher = (await import("@/lib/models/Teacher")).default;
      const teacher = await Teacher.findOne({ user_id: userId, school_id: schoolId }).lean();
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

      let targetClassId = classId;
      if (!targetClassId && recordId) {
        const Student = (await import("@/lib/models/Student")).default;
        const studentDoc = await Student.findOne({ _id: recordId, school_id: schoolId }).select("class_id").lean();
        if (studentDoc) {
          targetClassId = studentDoc.class_id?.toString();
        }
      }

      const hasAccess = targetClassId
        ? teacherClassIds.map(id => id.toString()).includes(targetClassId)
        : false;

      if (!hasAccess) {
        return NextResponse.json({ success: false, message: "You are not assigned to this class or student" }, { status: 403 });
      }
    }

    const startDate = new Date(startDateParam);
    startDate.setUTCHours(0, 0, 0, 0);

    const endDate = new Date(endDateParam);
    endDate.setUTCHours(23, 59, 59, 999);

    const detail = url.searchParams.get("detail") === "true";

    // ── Path 1: Detail view for a specific student/teacher (preserved) ──
    if (detail && recordId) {
      const detailQuery: any = {
        school_id: schoolId,
        date: { $gte: startDate, $lte: endDate },
        type,
      };
      if (type === "student") {
        if (classId) detailQuery.class_id = classId;
        detailQuery["records.student_id"] = recordId;
      } else {
        detailQuery["records.teacher_id"] = recordId;
      }

      const attendances = await Attendance.find(detailQuery).lean();
      const dailyRecords = attendances.map((att: any) => {
        const record = att.records?.find((r: any) => {
          const refId = type === "student" ? r.student_id : r.teacher_id;
          return refId && refId.toString() === recordId;
        });
        return {
          date: att.date,
          status: record ? record.status : null,
          note: record ? record.note : null,
        };
      }).filter((r: any) => r.status !== null);

      return NextResponse.json({
        success: true,
        data: dailyRecords,
      });
    }

    // ── Path 2: Summary aggregation (Database-level grouping & counting) ──
    // Replaces transferring entire records[] arrays to Node.js and looping in memory
    const matchFilter: Record<string, any> = {
      school_id: new mongoose.Types.ObjectId(schoolId as string),
      date: { $gte: startDate, $lte: endDate },
      type,
    };
    if (type === "student") {
      if (classId && mongoose.Types.ObjectId.isValid(classId)) {
        matchFilter.class_id = new mongoose.Types.ObjectId(classId);
      }
      if (recordId && mongoose.Types.ObjectId.isValid(recordId)) {
        matchFilter["records.student_id"] = new mongoose.Types.ObjectId(recordId);
      }
    } else if (type === "teacher" && recordId && mongoose.Types.ObjectId.isValid(recordId)) {
      matchFilter["records.teacher_id"] = new mongoose.Types.ObjectId(recordId);
    }

    const pipeline: mongoose.PipelineStage[] = [
      // STAGE 1: Filter using index (attendance_school_type_date_v1 / attendance_school_class_date_v1)
      { $match: matchFilter },
      // STAGE 2: Deconstruct embedded records array
      { $unwind: "$records" },
    ];

    // STAGE 3: If student or parent, restrict strictly to their student record ID
    if (recordId && mongoose.Types.ObjectId.isValid(recordId)) {
      pipeline.push({
        $match: {
          [type === "student" ? "records.student_id" : "records.teacher_id"]: new mongoose.Types.ObjectId(recordId),
        },
      });
    }

    // STAGE 4: Group by student_id or teacher_id and sum counts for standard statuses
    pipeline.push({
      $group: {
        _id:      type === "student" ? "$records.student_id" : "$records.teacher_id",
        present:  { $sum: { $cond: [{ $eq: ["$records.status", "present"] }, 1, 0] } },
        absent:   { $sum: { $cond: [{ $eq: ["$records.status", "absent"] }, 1, 0] } },
        late:     { $sum: { $cond: [{ $eq: ["$records.status", "late"] }, 1, 0] } },
        holiday:  { $sum: { $cond: [{ $eq: ["$records.status", "holiday"] }, 1, 0] } },
        half_day: { $sum: { $cond: [{ $eq: ["$records.status", "half_day"] }, 1, 0] } },
        leave:    { $sum: { $cond: [{ $eq: ["$records.status", "leave"] }, 1, 0] } },
      },
    });

    const rawSummary: Array<{
      _id: mongoose.Types.ObjectId | null;
      present: number;
      absent: number;
      late: number;
      holiday: number;
      half_day: number;
      leave: number;
    }> = await Attendance.aggregate(pipeline);

    // Reconstruct exact response map: { [id: string]: { present, absent, late, holiday, half_day, leave } }
    const summary: Record<string, { present: number; absent: number; late: number; holiday: number; half_day: number; leave: number }> = {};

    for (const row of rawSummary) {
      if (row._id) {
        summary[row._id.toString()] = {
          present: row.present,
          absent: row.absent,
          late: row.late,
          holiday: row.holiday,
          half_day: row.half_day,
          leave: row.leave,
        };
      }
    }

    return sendCompressedJson(req, {
      success: true,
      data: summary,
    }, { cacheControl: "private, no-cache" });
  } catch (err: any) {
    console.error("Attendance Summary Error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to fetch attendance summary" },
      { status: 500 }
    );
  }
}
