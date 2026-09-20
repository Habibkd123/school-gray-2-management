import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Attendance, ClassTest, Homework, TeacherAssignment } from "@/lib/models/index";
import Teacher from "@/lib/models/Teacher";
import Class from "@/lib/models/Class";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: teacherId } = await params;
  const authResult = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (authResult.error) return authResult.error;
  const { schoolId } = authResult;

  try {
    await connectToDatabase();

    // 1. Fetch Teacher Profile
    const teacher = await Teacher.findOne({ _id: teacherId, school_id: schoolId }).lean() as any;
    if (!teacher) {
      return NextResponse.json({ success: false, message: "Teacher not found" }, { status: 404 });
    }

    // 2. Fetch Teacher Attendance Summary
    const attendanceDocs = await Attendance.find({
      school_id: schoolId as string,
      type: "teacher"
    })
      .select("records.teacher_id records.status date")
      .lean();

    let workingDays = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;
    let halfDayCount = 0;

    attendanceDocs.forEach((doc) => {
      if (doc.records) {
        const rec = doc.records.find(
          (r: any) => (r.teacher_id?._id || r.teacher_id)?.toString() === teacherId
        );
        if (rec) {
          workingDays++;
          const status = rec.status?.toLowerCase();
          if (status === "present") presentCount++;
          else if (status === "absent") absentCount++;
          else if (status === "late") lateCount++;
          else if (status === "leave") leaveCount++;
          else if (status === "half_day") halfDayCount++;
        }
      }
    });

    const attendanceRate = workingDays > 0
      ? Math.round(((presentCount + lateCount + halfDayCount * 0.5) / workingDays) * 100)
      : 0;

    // 3. Fetch Assigned Classes & Subjects
    const assignments = await TeacherAssignment.find({
      school_id: schoolId as string,
      teacher_id: teacherId
    })
      .populate("class_id", "name section")
      .populate("subject_master_id", "name subject_code")
      .lean();

    const formattedAssignments = assignments.map((a: any) => ({
      classId: a.class_id?._id || a.class_id,
      className: a.class_id?.name || "—",
      section: a.class_id?.section || "—",
      subjectName: a.subject_master_id?.name || "—",
      subjectCode: a.subject_master_id?.subject_code || ""
    }));

    // 4. Fetch Tests Created
    const tests = await ClassTest.find({
      school_id: schoolId as string,
      teacher_id: teacherId
    })
      .populate("class_id", "name section")
      .populate("subject_id", "name")
      .sort({ test_date: -1 })
      .lean();

    const formattedTests = tests.map((t: any) => ({
      testId: t._id,
      title: t.title,
      className: t.class_id?.name || "—",
      section: t.class_id?.section || "—",
      subject: t.subject_id?.name || "—",
      testDate: t.test_date,
      totalMarks: t.total_marks,
      passingMarks: t.passing_marks,
      status: t.status
    }));

    // 5. Fetch Homework Given
    const homeworks = await Homework.find({
      school_id: schoolId as string,
      teacher_id: teacherId
    })
      .populate("class_id", "name section")
      .populate("subject_id", "name")
      .sort({ due_date: -1 })
      .lean();

    const formattedHomeworks = homeworks.map((hw: any) => ({
      homeworkId: hw._id,
      title: hw.title,
      className: hw.class_id?.name || "—",
      section: hw.class_id?.section || "—",
      subject: hw.subject_id?.name || "—",
      assignedDate: hw.assigned_date,
      dueDate: hw.due_date,
      submissionsCount: hw.submissions?.length || 0,
      status: hw.status
    }));

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          id: teacher._id,
          employeeId: teacher.employee_id || "—",
          name: teacher.name,
          gender: teacher.gender || "—",
          email: teacher.email || "—",
          phone: teacher.phone || "—",
          qualification: teacher.qualification || "—",
          department: teacher.department || "—",
          joinDate: teacher.join_date || null,
          isActive: teacher.is_active !== false
        },
        attendance: {
          workingDays,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          leave: leaveCount,
          halfDay: halfDayCount,
          rate: attendanceRate
        },
        assignments: formattedAssignments,
        tests: {
          list: formattedTests,
          totalCreated: formattedTests.length
        },
        homework: {
          list: formattedHomeworks,
          totalGiven: formattedHomeworks.length
        }
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal server error" }, { status: 500 });
  }
}
