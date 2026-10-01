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

        const [attendanceRecords, allClasses, studentCounts] = await Promise.all([
          Attendance.find({
            school_id: schoolId as string,
            type: "student",
            date: { $gte: startOfDay, $lte: endOfDay },
          })
            .select("class_id records.status date")
            .lean(),
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

        const classStats = allClasses.map((cls) => {
          const attDoc = attendanceRecords.find(
            (r) => r.class_id?.toString() === cls._id.toString()
          );

          let present = 0;
          let absent = 0;
          let late = 0;
          let leave = 0;
          let halfDay = 0;

          if (attDoc && attDoc.records) {
            attDoc.records.forEach((rec: any) => {
              const status = rec.status?.toLowerCase();
              if (status === "present") present++;
              else if (status === "absent") absent++;
              else if (status === "late") late++;
              else if (status === "leave") leave++;
              else if (status === "half_day") halfDay++;
            });
          }

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
            isMarked: !!attDoc,
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

        const [attendanceRecords, allClasses, studentCounts] = await Promise.all([
          Attendance.find({
            school_id: schoolId as string,
            type: "student",
            date: { $gte: startDate, $lte: endDate },
          })
            .select("class_id records.status date")
            .lean(),
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

        const monthlyStats = allClasses.map((cls: any) => {
          const classAttDocs = attendanceRecords.filter(
            (r: any) => r.class_id?.toString() === cls._id.toString()
          );

          const workingDays = classAttDocs.length;
          let totalPresent = 0;
          let totalAbsent = 0;
          let totalRecords = 0;

          classAttDocs.forEach((doc: any) => {
            if (doc.records) {
              doc.records.forEach((rec: any) => {
                const status = rec.status?.toLowerCase();
                totalRecords++;
                if (["present", "late", "half_day"].includes(status)) {
                  totalPresent++;
                } else if (status === "absent") {
                  totalAbsent++;
                }
              });
            }
          });

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
