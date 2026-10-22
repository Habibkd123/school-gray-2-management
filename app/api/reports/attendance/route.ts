import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Attendance } from "@/lib/models/index";
import Student from "@/lib/models/Student";
import Teacher from "@/lib/models/Teacher";
import Class from "@/lib/models/Class";
import { requireAuth } from "@/lib/utils/auth";
import { sendCompressedJson } from "@/lib/compression";
import mongoose from "mongoose";

// Server cache & in-flight deduplication
const _attendanceReportsServerCache = new Map<string, { data: any; expiresAt: number }>();
const _attendanceReportsInFlight = new Map<string, Promise<any>>();
const ATTENDANCE_REPORTS_CACHE_TTL = 30_000;

export function invalidateAttendanceReportsCache(schoolId?: string | null) {
  if (schoolId) {
    for (const key of _attendanceReportsServerCache.keys()) {
      if (key.startsWith(`att_rep_${schoolId}`)) {
        _attendanceReportsServerCache.delete(key);
      }
    }
  } else {
    _attendanceReportsServerCache.clear();
  }
}

// GET /api/reports/attendance
export async function GET(req: NextRequest) {
  const { schoolId, role, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const reportType = url.searchParams.get("type") || "daily"; // daily or monthly or teacher-recent
    const dateStr = url.searchParams.get("date") || ""; // YYYY-MM-DD
    const monthStr = url.searchParams.get("month") || ""; // YYYY-MM
    const classId = url.searchParams.get("classId") || "";
    const sectionId = url.searchParams.get("sectionId") || "";

    const cacheKey = `att_rep_${schoolId}_${reportType}_${dateStr}_${monthStr}_${classId}_${sectionId}`;

    const cached = _attendanceReportsServerCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return sendCompressedJson(req, cached.data, {
        cacheControl: "private, max-age=15, stale-while-revalidate=30",
      });
    }

    const existingInFlight = _attendanceReportsInFlight.get(cacheKey);
    if (existingInFlight) {
      try {
        const payload = await existingInFlight;
        return sendCompressedJson(req, payload, {
          cacheControl: "private, max-age=15, stale-while-revalidate=30",
        });
      } catch (err: any) {
        // Fall through to retry on error
      }
    }

    const fetchPromise = (async () => {
      await connectToDatabase();

      // 1. Daily Attendance Report
      if (reportType === "daily") {
        const targetDate = dateStr ? new Date(dateStr) : new Date();
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

        const classQuery: any = { school_id: schoolId };
        if (classId) classQuery._id = classId;

        const attendanceMatch: any = {
          school_id: new mongoose.Types.ObjectId(schoolId as string),
          type: "student",
          date: { $gte: startOfDay, $lte: endOfDay },
        };
        if (classId && mongoose.Types.ObjectId.isValid(classId)) {
          attendanceMatch.class_id = new mongoose.Types.ObjectId(classId);
        }

        const [attendanceAgg, markedClassIds, allClasses, studentCounts] = await Promise.all([
          Attendance.aggregate([
            { $match: attendanceMatch },
            { $unwind: "$records" },
            {
              $group: {
                _id: "$class_id",
                present: { $sum: { $cond: [{ $eq: [{ $toLower: "$records.status" }, "present"] }, 1, 0] } },
                absent:  { $sum: { $cond: [{ $eq: [{ $toLower: "$records.status" }, "absent"] }, 1, 0] } },
                late:    { $sum: { $cond: [{ $eq: [{ $toLower: "$records.status" }, "late"] }, 1, 0] } },
                leave:   { $sum: { $cond: [{ $eq: [{ $toLower: "$records.status" }, "leave"] }, 1, 0] } },
                halfDay: { $sum: { $cond: [{ $eq: [{ $toLower: "$records.status" }, "half_day"] }, 1, 0] } },
              },
            },
          ]),
          Attendance.find(attendanceMatch).distinct("class_id"),
          Class.find(classQuery).select("_id name section").lean(),
          Student.aggregate([
            { $match: { school_id: new mongoose.Types.ObjectId(schoolId as string), is_active: true } },
            { $group: { _id: "$class_id", count: { $sum: 1 } } },
          ]),
        ]);

        const countMap = new Map<string, number>();
        studentCounts.forEach((sc: any) => {
          if (sc._id) countMap.set(sc._id.toString(), sc.count);
        });

        const markedSet = new Set(markedClassIds.map((id: any) => id?.toString()));
        const attMap = new Map<string, any>();
        attendanceAgg.forEach((a: any) => {
          if (a._id) attMap.set(a._id.toString(), a);
        });

        const classStats = allClasses.map((cls) => {
          const att = attMap.get(cls._id.toString());
          const isMarked = markedSet.has(cls._id.toString());

          const present = att ? att.present : 0;
          const absent  = att ? att.absent : 0;
          const late    = att ? att.late : 0;
          const leave   = att ? att.leave : 0;
          const halfDay = att ? att.halfDay : 0;

          const totalStudents = countMap.get(cls._id.toString()) || 0;
          const totalMarked = present + absent + late + leave + halfDay;

          return {
            classId: cls._id,
            className: cls.name,
            section: cls.section,
            total: totalStudents,
            present,
            absent,
            late,
            leave,
            halfDay,
            isMarked,
            rate: totalMarked ? Math.round(((present + late + halfDay) / totalMarked) * 100) : 0,
          };
        });

        return { success: true, data: classStats };
      }

      // 2. Monthly Attendance Report
      if (reportType === "monthly") {
        if (!monthStr) {
          throw new Error("Month (YYYY-MM) parameter is required");
        }

        const [year, month] = monthStr.split("-").map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const classQuery: any = { school_id: schoolId };
        if (classId) classQuery._id = classId;

        const attendanceMatch: any = {
          school_id: new mongoose.Types.ObjectId(schoolId as string),
          type: "student",
          date: { $gte: startDate, $lte: endDate },
        };
        if (classId && mongoose.Types.ObjectId.isValid(classId)) {
          attendanceMatch.class_id = new mongoose.Types.ObjectId(classId);
        }

        const [monthlyAgg, allClasses, studentCounts] = await Promise.all([
          Attendance.aggregate([
            { $match: attendanceMatch },
            { $unwind: "$records" },
            {
              $group: {
                _id: "$class_id",
                totalPresent: {
                  $sum: { $cond: [{ $in: [{ $toLower: "$records.status" }, ["present", "late", "half_day"]] }, 1, 0] },
                },
                totalAbsent: {
                  $sum: { $cond: [{ $eq: [{ $toLower: "$records.status" }, "absent"] }, 1, 0] },
                },
                totalRecords: { $sum: 1 },
                dates: { $addToSet: "$date" },
              },
            },
            {
              $project: {
                totalPresent: 1,
                totalAbsent: 1,
                totalRecords: 1,
                workingDays: { $size: "$dates" },
              },
            },
          ]),
          Class.find(classQuery).select("_id name section").lean(),
          Student.aggregate([
            { $match: { school_id: new mongoose.Types.ObjectId(schoolId as string), is_active: true } },
            { $group: { _id: "$class_id", count: { $sum: 1 } } },
          ]),
        ]);

        const countMap = new Map<string, number>();
        studentCounts.forEach((sc: any) => {
          if (sc._id) countMap.set(sc._id.toString(), sc.count);
        });

        const monthlyMap = new Map<string, any>();
        monthlyAgg.forEach((m: any) => {
          if (m._id) monthlyMap.set(m._id.toString(), m);
        });

        const monthlyStats = allClasses.map((cls: any) => {
          const m = monthlyMap.get(cls._id.toString());
          const workingDays = m ? m.workingDays : 0;
          const totalPresent = m ? m.totalPresent : 0;
          const totalAbsent = m ? m.totalAbsent : 0;
          const totalRecords = m ? m.totalRecords : 0;

          const studentCount = countMap.get(cls._id.toString()) || 0;

          return {
            classId: cls._id,
            className: cls.name,
            section: cls.section,
            studentCount,
            workingDays,
            averagePresent: workingDays ? Math.round(totalPresent / workingDays) : 0,
            averageAbsent: workingDays ? Math.round(totalAbsent / workingDays) : 0,
            rate: totalRecords ? Math.round((totalPresent / totalRecords) * 100) : 0,
          };
        });

        return { success: true, data: monthlyStats };
      }

      // 3. Recent Teacher Attendance (Last 7 Days)
      if (reportType === "teacher-recent") {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);

        const [attendanceRecords, allTeachers] = await Promise.all([
          Attendance.find({
            school_id: schoolId as string,
            type: "teacher",
            date: { $gte: sevenDaysAgo, $lte: today },
          })
            .select("date records.teacher_id records.status")
            .sort({ date: 1 })
            .lean(),
          Teacher.find({ school_id: schoolId }).select("_id name employee_id").lean(),
        ]);

        const teacherStats = allTeachers.map((teacher: any) => {
          const history: string[] = [];

          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateKey = d.toDateString();

            const dayDoc = attendanceRecords.find(
              (r) => new Date(r.date).toDateString() === dateKey
            );

            let status = "N/A";
            if (dayDoc && dayDoc.records) {
              const record = dayDoc.records.find(
                (rec: any) => rec.teacher_id?.toString() === teacher._id.toString()
              );
              if (record) {
                status = record.status;
              }
            }
            history.push(status);
          }

          return {
            teacherId: teacher._id,
            history,
          };
        });

        return { success: true, data: teacherStats };
      }

      throw new Error("Invalid type parameter");
    })();

    _attendanceReportsInFlight.set(cacheKey, fetchPromise);

    try {
      const payload = await fetchPromise;
      _attendanceReportsServerCache.set(cacheKey, {
        data: payload,
        expiresAt: Date.now() + ATTENDANCE_REPORTS_CACHE_TTL,
      });
      return sendCompressedJson(req, payload, {
        cacheControl: "private, max-age=15, stale-while-revalidate=30",
      });
    } finally {
      _attendanceReportsInFlight.delete(cacheKey);
    }
  } catch (err: any) {
    const status = err.message === "Month (YYYY-MM) parameter is required" || err.message === "Invalid type parameter" ? 400 : 500;
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error" },
      { status }
    );
  }
}
