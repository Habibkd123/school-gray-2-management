import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { requireAuth } from "@/lib/utils/auth";
import Class from "@/lib/models/Class";
import Student from "@/lib/models/Student";
import Teacher from "@/lib/models/Teacher";
import { Subject, SubjectMaster, Attendance } from "@/lib/models/index";
import { sendConditionalJson } from "@/lib/etag";
import mongoose from "mongoose";

const STATS_CACHE_TTL = 10_000; // 10 seconds TTL
const _statsCache = new Map<string, { data: any; timestamp: number }>();
const _statsInFlight = new Map<string, Promise<any>>();

export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin", "teacher"]);
  if (error) return error;

  const schoolKey = String(schoolId);
  const cached = _statsCache.get(schoolKey);
  if (cached && (Date.now() - cached.timestamp) < STATS_CACHE_TTL) {
    return sendConditionalJson(
      req,
      { success: true, data: cached.data },
      { cacheControl: "private, no-cache" }
    );
  }

  if (_statsInFlight.has(schoolKey)) {
    try {
      const data = await _statsInFlight.get(schoolKey)!;
      return sendConditionalJson(
        req,
        { success: true, data },
        { cacheControl: "private, no-cache" }
      );
    } catch {
      // Fall through to retry on error
    }
  }

  const queryPromise = (async () => {
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
      activeClasses,
      totalSubjects,
      totalSubjectMasters,
      todaysStudentAttendances,
    ] = await Promise.all([
      Student.countDocuments({ school_id: schoolId, is_deleted: { $ne: true } }),
      Student.countDocuments({ school_id: schoolId, is_deleted: { $ne: true }, is_active: true }),
      Teacher.countDocuments({ school_id: schoolId, is_deleted: { $ne: true } }),
      Teacher.countDocuments({ school_id: schoolId, is_deleted: { $ne: true }, is_active: { $ne: false } }),
      Class.countDocuments({ school_id: schoolId, is_deleted: { $ne: true } }),
      Class.countDocuments({
        school_id: schoolId,
        is_deleted: { $ne: true },
        status: { $nin: ["Inactive", "Archived"] },
      }),
      Subject.countDocuments({ school_id: schoolId }),
      SubjectMaster.countDocuments({ school_id: schoolId }),
      // Today's student attendance stats computed directly at DB level via aggregation
      // (Replaces transferring full records[] arrays to Node.js and looping in memory)
      Attendance.aggregate([
        {
          $match: {
            school_id: new mongoose.Types.ObjectId(schoolId as string),
            type: "student",
            date: { $gte: todayStart, $lte: todayEnd },
          },
        },
        { $unwind: "$records" },
        {
          $group: {
            _id:     null,
            total:   { $sum: 1 },
            present: { $sum: { $cond: [{ $in: ["$records.status", ["present", "half_day"]] }, 1, 0] } },
            absent:  { $sum: { $cond: [{ $eq: ["$records.status", "absent"] }, 1, 0] } },
            late:    { $sum: { $cond: [{ $eq: ["$records.status", "late"] }, 1, 0] } },
            leave:   { $sum: { $cond: [{ $eq: ["$records.status", "leave"] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const todayAtt = todaysStudentAttendances[0];
    const todayTotal   = todayAtt?.total   || 0;
    const todayPresent = todayAtt?.present || 0;
    const todayAbsent  = todayAtt?.absent  || 0;
    const todayLate    = todayAtt?.late    || 0;
    const todayLeave   = todayAtt?.leave   || 0;

    const attendancePct = todayTotal > 0
      ? parseFloat(((todayPresent / todayTotal) * 100).toFixed(1))
      : null; // null means "not marked yet"

    const totalSubjectsUnified = Math.max(totalSubjects, totalSubjectMasters);

    return {
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
        active: activeClasses,
        inactive: Math.max(0, totalClasses - activeClasses),
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
    };
  })();

  _statsInFlight.set(schoolKey, queryPromise);

  try {
    const data = await queryPromise;
    _statsCache.set(schoolKey, { data, timestamp: Date.now() });

    return sendConditionalJson(
      req,
      {
        success: true,
        data,
      },
      { cacheControl: "private, no-cache" }
    );
  } catch (err: any) {
    console.error("[GET /api/dashboard/stats]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  } finally {
    _statsInFlight.delete(schoolKey);
  }
}
