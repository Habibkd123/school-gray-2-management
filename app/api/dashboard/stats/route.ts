import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { requireAuth } from "@/lib/utils/auth";
import Class from "@/lib/models/Class";
import Student from "@/lib/models/Student";
import Teacher from "@/lib/models/Teacher";
import { Subject, SubjectMaster, Attendance } from "@/lib/models/index";
import { sendConditionalJson } from "@/lib/etag";

export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin", "teacher"]);
  if (error) return error;

  try {
    await connectDB();

    // Today's date boundaries (UTC midnight-to-midnight)
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const todayEnd   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    // Run all queries in parallel for speed
    const [
      totalStudents,
      activeStudents,
      totalTeachers,
      activeTeachers,
      totalClasses,
      totalSubjects,
      totalSubjectMasters,
      todaysStudentAttendances,
    ] = await Promise.all([
      Student.countDocuments({ school_id: schoolId }),
      Student.countDocuments({ school_id: schoolId, is_active: true }),
      Teacher.countDocuments({ school_id: schoolId }),
      Teacher.countDocuments({ school_id: schoolId, is_active: { $ne: false } }),
      Class.countDocuments({ school_id: schoolId }),
      Subject.countDocuments({ school_id: schoolId }),
      SubjectMaster.countDocuments({ school_id: schoolId }),
      // Fetch today's student attendance records
      Attendance.find({
        school_id: schoolId,
        type: "student",
        date: { $gte: todayStart, $lte: todayEnd },
      }).select("records").lean(),
    ]);

    // Aggregate today's per-student statuses across all classes
    let todayPresent = 0;
    let todayAbsent  = 0;
    let todayLate    = 0;
    let todayLeave   = 0;
    let todayTotal   = 0;

    for (const att of todaysStudentAttendances as any[]) {
      for (const rec of att.records || []) {
        todayTotal++;
        const s = rec.status;
        if (s === "present" || s === "half_day") todayPresent++;
        else if (s === "absent") todayAbsent++;
        else if (s === "late") todayLate++;
        else if (s === "leave") todayLeave++;
      }
    }

    const attendancePct = todayTotal > 0
      ? parseFloat(((todayPresent / todayTotal) * 100).toFixed(1))
      : null; // null means "not marked yet"

    const totalSubjectsUnified = Math.max(totalSubjects, totalSubjectMasters);

    return sendConditionalJson(
      req,
      {
        success: true,
        data: {
          students: {
            total: totalStudents,
            active: activeStudents,
            inactive: totalStudents - activeStudents,
          },
          teachers: {
            total: totalTeachers,
            active: activeTeachers,
            inactive: totalTeachers - activeTeachers,
          },
          classes: {
            total: totalClasses,
          },
          subjects: {
            total: totalSubjectsUnified,
          },
          attendance: {
            total: todayTotal,
            present: todayPresent,
            absent: todayAbsent,
            late: todayLate,
            leave: todayLeave,
            percentage: attendancePct,
            marked: todayTotal > 0,
          },
        },
      },
      { cacheControl: "private, max-age=30, stale-while-revalidate=30" }
    );
  } catch (err: any) {
    console.error("[GET /api/dashboard/stats]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
