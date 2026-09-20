import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Attendance } from "@/lib/models/index";
import Student from "@/lib/models/Student";
import Teacher from "@/lib/models/Teacher";
import Class from "@/lib/models/Class";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

// GET /api/reports/attendance
export async function GET(req: NextRequest) {
  const { schoolId, role, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const reportType = url.searchParams.get("type") || "daily"; // daily or monthly or teacher-recent
    const dateStr = url.searchParams.get("date"); // YYYY-MM-DD
    const monthStr = url.searchParams.get("month"); // YYYY-MM
    const classId = url.searchParams.get("classId");
    const sectionId = url.searchParams.get("sectionId");

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
          date: { $gte: startOfDay, $lte: endOfDay }
        }).select("class_id records.status date").lean(),
        Class.find(classQuery).select("_id name section").lean(),
        Student.aggregate([
          { $match: { school_id: new mongoose.Types.ObjectId(schoolId as string), is_active: true } },
          { $group: { _id: "$class_id", count: { $sum: 1 } } }
        ])
      ]);

      const countMap = new Map<string, number>();
      studentCounts.forEach((sc: any) => {
        if (sc._id) countMap.set(sc._id.toString(), sc.count);
      });

      const classStats = allClasses.map((cls) => {
        // Find marked attendance for this class
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

        // If no attendance was marked, count all as pending or default
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
          rate: totalMarked ? Math.round(((present + late + halfDay) / totalMarked) * 100) : 0
        };
      });

      return NextResponse.json({ success: true, data: classStats });
    }

    // 2. Monthly Attendance Report
    if (reportType === "monthly") {
      if (!monthStr) {
        return NextResponse.json({ success: false, message: "Month (YYYY-MM) parameter is required" }, { status: 400 });
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
          date: { $gte: startDate, $lte: endDate }
        }).select("class_id records.status date").lean(),
        Class.find(classQuery).select("_id name section").lean(),
        Student.aggregate([
          { $match: { school_id: new mongoose.Types.ObjectId(schoolId as string), is_active: true } },
          { $group: { _id: "$class_id", count: { $sum: 1 } } }
        ])
      ]);

      const countMap = new Map<string, number>();
      studentCounts.forEach((sc: any) => {
        if (sc._id) countMap.set(sc._id.toString(), sc.count);
      });

      const monthlyStats = allClasses.map((cls: any) => {
        // Filter attendance documents for this class
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
          rate: totalRecords ? Math.round((totalPresent / totalRecords) * 100) : 0
        };
      });

      return NextResponse.json({ success: true, data: monthlyStats });
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
          date: { $gte: sevenDaysAgo, $lte: today }
        }).select("date records.teacher_id records.status").sort({ date: 1 }).lean(),
        Teacher.find({ school_id: schoolId }).select("_id name employee_id").lean()
      ]);

      // Build map of date -> teacher status
      const teacherStats = allTeachers.map((teacher: any) => {
        const history: string[] = [];

        // For each of the last 7 days
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(today.getDate() - i);
          const dateKey = d.toDateString();

          // Find if attendance marked for this day
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
          history
        };
      });

      return NextResponse.json({ success: true, data: teacherStats });
    }

    return NextResponse.json({ success: false, message: "Invalid type parameter" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
