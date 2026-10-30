import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Attendance, ClassTest, ClassTestMark, Timetable } from "@/lib/models/index";
import Student from "@/lib/models/Student";
import Teacher from "@/lib/models/Teacher";
import Class from "@/lib/models/Class";
import { requireAuth } from "@/lib/utils/auth";
import { sendCompressedJson } from "@/lib/compression";
import mongoose from "mongoose";

// Server-side in-memory caching & in-flight deduplication
const _classReportServerCache = new Map<string, { data: any; expiresAt: number }>();
const _classReportInFlight = new Map<string, Promise<any>>();
const CLASS_REPORT_CACHE_TTL = 60_000;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: classId } = await params;
  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return NextResponse.json({ success: false, message: "Invalid class ID" }, { status: 400 });
  }

  const authResult = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (authResult.error) return authResult.error;
  const { schoolId, role, userId } = authResult;

  if (role === "student" || role === "parent") {
    return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 });
  }

  if (role === "teacher") {
    await connectToDatabase();
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

    const hasAccess = teacherClassIds.some((id: any) => id.toString() === classId);
    if (!hasAccess) {
      return NextResponse.json({ success: false, message: "You are not assigned to this class" }, { status: 403 });
    }
  }

  try {
    const url = new URL(req.url);
    const dateStr = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
    const monthStr = url.searchParams.get("month") || new Date().toISOString().slice(0, 7); // YYYY-MM

    const cacheKey = `class_rep_${schoolId}_${classId}_${dateStr}_${monthStr}`;

    const cached = _classReportServerCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return sendCompressedJson(req, cached.data, {
        cacheControl: "private, max-age=30, stale-while-revalidate=60",
      });
    }

    const existingInFlight = _classReportInFlight.get(cacheKey);
    if (existingInFlight) {
      try {
        const payload = await existingInFlight;
        return sendCompressedJson(req, payload, {
          cacheControl: "private, max-age=30, stale-while-revalidate=60",
        });
      } catch (e) {
        // Fall through to retry on error
      }
    }

    const fetchPromise = (async () => {
      await connectToDatabase();

      // 1. Fetch Class Details
      const cls = await Class.findOne({ _id: classId, school_id: schoolId }).populate("class_teacher_id", "name").lean() as any;
      if (!cls) {
        return null;
      }

      // 2. Fetch Students and Gender Split (via aggregation — eliminates loading student docs into Node.js)
      const targetDate = new Date(dateStr);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      const [year, month] = monthStr.split("-").map(Number);
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

      const classObjectId = new mongoose.Types.ObjectId(classId);
      const schoolObjectId = new mongoose.Types.ObjectId(schoolId as string);

      // Concurrently fetch demographics, daily attendance, monthly attendance agg, and class tests
      const [genderAggResult, dailyAtt, monthlyAggResult, classTests] = await Promise.all([
        Student.aggregate([
          {
            $match: {
              school_id: schoolObjectId,
              class_id: classObjectId,
              is_active: true,
            },
          },
          {
            $group: {
              _id:   null,
              total: { $sum: 1 },
              boys:  { $sum: { $cond: [{ $eq: [{ $toLower: "$gender" }, "male"] }, 1, 0] } },
              girls: { $sum: { $cond: [{ $eq: [{ $toLower: "$gender" }, "female"] }, 1, 0] } },
            },
          },
        ]),
        Attendance.findOne({
          school_id: schoolId as string,
          type: "student",
          class_id: classId,
          date: { $gte: startOfDay, $lte: endOfDay },
        }).select("records.status").lean(),
        Attendance.aggregate([
          {
            $match: {
              school_id: schoolObjectId,
              type: "student",
              class_id: classObjectId,
              date: { $gte: startOfMonth, $lte: endOfMonth },
            },
          },
          { $unwind: "$records" },
          {
            $group: {
              _id:            null,
              totalRecords:   { $sum: 1 },
              monthlyPresent: {
                $sum: { $cond: [{ $in: [{ $toLower: "$records.status" }, ["present", "late", "half_day"]] }, 1, 0] },
              },
              dates: { $addToSet: "$date" },
            },
          },
          {
            $project: {
              totalRecords: 1,
              monthlyPresent: 1,
              workingDays: { $size: "$dates" },
            },
          },
        ]),
        ClassTest.find({ class_id: classId, school_id: schoolId })
          .populate("subject_id", "name")
          .sort({ test_date: -1 })
          .lean(),
      ]);

      const genderStats = genderAggResult[0];
      const totalStudents    = genderStats?.total || 0;
      const boysCount        = genderStats?.boys  || 0;
      const girlsCount       = genderStats?.girls || 0;
      const otherGenderCount = totalStudents - boysCount - girlsCount;

      // 3. Daily Attendance stats
      let present = 0;
      let absent = 0;
      let late = 0;
      let leave = 0;
      let halfDay = 0;

      if (dailyAtt && dailyAtt.records) {
        dailyAtt.records.forEach((rec: any) => {
          const status = rec.status?.toLowerCase();
          if (status === "present") present++;
          else if (status === "absent") absent++;
          else if (status === "late") late++;
          else if (status === "leave") leave++;
          else if (status === "half_day") halfDay++;
        });
      }

      const dailyRate = (present + absent + late + leave + halfDay) > 0
        ? Math.round(((present + late + halfDay * 0.5) / (present + absent + late + leave + halfDay)) * 100)
        : 0;

      // 4. Monthly Attendance stats
      const monthlyStats = monthlyAggResult[0];
      const monthlyTotalRecords = monthlyStats?.totalRecords || 0;
      const monthlyPresent      = monthlyStats?.monthlyPresent || 0;
      const workingDays         = monthlyStats?.workingDays || 0;

      const monthlyRate = monthlyTotalRecords > 0
        ? Math.round((monthlyPresent / monthlyTotalRecords) * 100)
        : 0;

      // 5. Test Performance for Class (aggregated at DB level by test_id)
      const testIds = classTests.map((t: any) => t._id);
      const marksAgg = testIds.length > 0
        ? await ClassTestMark.aggregate([
            {
              $match: {
                test_id: { $in: testIds.map((tid: any) => new mongoose.Types.ObjectId(tid.toString())) },
              },
            },
            {
              $group: {
                _id:               "$test_id",
                totalMarksEntered: { $sum: 1 },
                totalScore:        { $sum: "$marks_obtained" },
                passCount:         { $sum: { $cond: ["$is_pass", 1, 0] } },
              },
            },
          ])
        : [];

      const marksSummaryByTest = new Map<string, any>();
      marksAgg.forEach((m: any) => {
        if (m._id) marksSummaryByTest.set(m._id.toString(), m);
      });

      const formattedTests = classTests.map((test: any) => {
        const stats = marksSummaryByTest.get(test._id.toString());
        const totalMarksEntered = stats?.totalMarksEntered || 0;
        const totalScore = stats?.totalScore || 0;
        const passCount = stats?.passCount || 0;

        const classAverage = totalMarksEntered > 0
          ? parseFloat((totalScore / totalMarksEntered).toFixed(1))
          : 0;

        const classAveragePercent = totalMarksEntered > 0 && test.total_marks > 0
          ? Math.round((classAverage / test.total_marks) * 100)
          : 0;

        const passRate = totalMarksEntered > 0
          ? Math.round((passCount / totalMarksEntered) * 100)
          : 0;

        return {
          testId: test._id,
          title: test.title,
          subject: test.subject_id?.name || "N/A",
          testDate: test.test_date,
          totalMarks: test.total_marks,
          passingMarks: test.passing_marks,
          status: test.status,
          averageScore: classAverage,
          averagePercentage: classAveragePercent,
          passRate,
        };
      });

      const overallClassAveragePercent = formattedTests.length > 0
        ? Math.round(formattedTests.reduce((acc, t) => acc + t.averagePercentage, 0) / formattedTests.length)
        : 0;

      return {
        success: true,
        data: {
          profile: {
            id: cls._id,
            name: cls.name,
            section: cls.section,
            classTeacherName: cls.class_teacher_id?.name || "—",
            capacity: cls.capacity || 40,
            totalStudents,
          },
          demographics: {
            total: totalStudents,
            boys: boysCount,
            girls: girlsCount,
            other: otherGenderCount,
          },
          dailyAttendance: {
            date: dateStr,
            present,
            absent,
            late,
            leave,
            halfDay,
            rate: dailyRate,
            isMarked: !!dailyAtt,
          },
          monthlyAttendance: {
            month: monthStr,
            workingDays,
            rate: monthlyRate,
          },
          tests: {
            list: formattedTests,
            overallAveragePercentage: overallClassAveragePercent,
            totalCreated: classTests.length,
          },
        },
      };
    })();

    _classReportInFlight.set(cacheKey, fetchPromise);

    try {
      const payload = await fetchPromise;
      if (!payload) {
        return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 });
      }
      _classReportServerCache.set(cacheKey, {
        data: payload,
        expiresAt: Date.now() + CLASS_REPORT_CACHE_TTL,
      });
      return sendCompressedJson(req, payload, {
        cacheControl: "private, max-age=30, stale-while-revalidate=60",
      });
    } finally {
      _classReportInFlight.delete(cacheKey);
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal server error" }, { status: 500 });
  }
}
