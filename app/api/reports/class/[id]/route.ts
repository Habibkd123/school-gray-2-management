import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Attendance, ClassTest, ClassTestMark } from "@/lib/models/index";
import Student from "@/lib/models/Student";
import Class from "@/lib/models/Class";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: classId } = await params;
  const authResult = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (authResult.error) return authResult.error;
  const { schoolId } = authResult;

  try {
    await connectToDatabase();

    // 1. Fetch Class Details
    const cls = await Class.findOne({ _id: classId, school_id: schoolId }).populate("class_teacher_id", "name").lean() as any;
    if (!cls) {
      return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 });
    }

    // 2. Fetch Students and Gender Split
    const students = await Student.find({ class_id: classId, school_id: schoolId, is_active: true }).select("gender").lean();
    const totalStudents = students.length;
    const boysCount = students.filter((s) => s.gender?.toLowerCase() === "male").length;
    const girlsCount = students.filter((s) => s.gender?.toLowerCase() === "female").length;
    const otherGenderCount = totalStudents - boysCount - girlsCount;

    // 3. Daily Attendance for Class
    const url = new URL(req.url);
    const dateStr = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
    const targetDate = new Date(dateStr);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const dailyAtt = await Attendance.findOne({
      school_id: schoolId as string,
      type: "student",
      class_id: classId,
      date: { $gte: startOfDay, $lte: endOfDay }
    }).select("records.status").lean();

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

    // 4. Monthly Attendance Rate for Class
    const monthStr = url.searchParams.get("month") || new Date().toISOString().slice(0, 7); // YYYY-MM
    const [year, month] = monthStr.split("-").map(Number);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const monthlyAttDocs = await Attendance.find({
      school_id: schoolId as string,
      type: "student",
      class_id: classId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    }).select("records.status").lean();

    let monthlyTotalRecords = 0;
    let monthlyPresent = 0;

    monthlyAttDocs.forEach((doc) => {
      if (doc.records) {
        doc.records.forEach((rec: any) => {
          monthlyTotalRecords++;
          if (["present", "late", "half_day"].includes(rec.status?.toLowerCase())) {
            monthlyPresent++;
          }
        });
      }
    });

    const monthlyRate = monthlyTotalRecords > 0
      ? Math.round((monthlyPresent / monthlyTotalRecords) * 100)
      : 0;

    // 5. Test Performance for Class
    const classTests = await ClassTest.find({ class_id: classId, school_id: schoolId })
      .populate("subject_id", "name")
      .sort({ test_date: -1 })
      .lean();

    const testIds = classTests.map((t: any) => t._id);
    const allMarks = testIds.length > 0
      ? await ClassTestMark.find({ test_id: { $in: testIds } }).select("test_id marks_obtained").lean()
      : [];

    const marksByTest = new Map<string, any[]>();
    allMarks.forEach((m: any) => {
      const tid = m.test_id?.toString();
      if (!marksByTest.has(tid)) marksByTest.set(tid, []);
      marksByTest.get(tid)!.push(m);
    });

    const formattedTests = classTests.map((test: any) => {
      const marks = marksByTest.get(test._id.toString()) || [];
      const totalMarksEntered = marks.length;

      let totalScore = 0;
      let passCount = 0;

      marks.forEach((m: any) => {
        totalScore += m.marks_obtained || 0;
        if (m.marks_obtained >= (test.passing_marks || 0)) {
          passCount++;
        }
      });

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
        passRate
      };
    });

    const overallClassAveragePercent = formattedTests.length > 0
      ? Math.round(formattedTests.reduce((acc, t) => acc + t.averagePercentage, 0) / formattedTests.length)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          id: cls._id,
          name: cls.name,
          section: cls.section,
          classTeacherName: cls.class_teacher_id?.name || "—",
          capacity: cls.capacity || 40,
          totalStudents
        },
        demographics: {
          total: totalStudents,
          boys: boysCount,
          girls: girlsCount,
          other: otherGenderCount
        },
        dailyAttendance: {
          date: dateStr,
          present,
          absent,
          late,
          leave,
          halfDay,
          rate: dailyRate,
          isMarked: !!dailyAtt
        },
        monthlyAttendance: {
          month: monthStr,
          workingDays: monthlyAttDocs.length,
          rate: monthlyRate
        },
        tests: {
          list: formattedTests,
          overallAveragePercentage: overallClassAveragePercent,
          totalCreated: classTests.length
        }
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal server error" }, { status: 500 });
  }
}
