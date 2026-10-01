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

    const query: any = {
      school_id: schoolId as string,
      date: { $gte: startDate, $lte: endDate },
      type,
    };
    if (type === "student") {
      if (classId) {
        query.class_id = classId;
      }
      if (recordId) {
        query["records.student_id"] = recordId;
      }
    }

    const detail = url.searchParams.get("detail") === "true";

    const attendances = await Attendance.find(query).lean();

    if (detail && recordId) {
      const dailyRecords = attendances.map((att: any) => {
        const record = att.records.find((r: any) => {
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

    // Aggregate results by student_id or teacher_id
    const summary: Record<string, { present: number; absent: number; late: number; holiday: number; half_day: number; leave: number }> = {};

    attendances.forEach((att: any) => {
      att.records.forEach((record: any) => {
        const refId = type === "student" ? record.student_id : record.teacher_id;
        if (!refId) return;
        const id = refId.toString();

        // Security: restrict records to recordId if role is student or parent
        if ((role === "student" || role === "parent") && id !== recordId) {
          return;
        }

        if (!summary[id]) {
          summary[id] = { present: 0, absent: 0, late: 0, holiday: 0, half_day: 0, leave: 0 };
        }
        
        const status = record.status as keyof typeof summary[string];
        if (summary[id][status] !== undefined) {
          summary[id][status] += 1;
        }
      });
    });

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
