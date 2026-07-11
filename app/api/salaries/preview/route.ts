import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Attendance } from "@/lib/models/index";
import Teacher from "@/lib/models/Teacher";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const teacherId = url.searchParams.get("teacher_id");
    const startDateParam = url.searchParams.get("start_date");
    const endDateParam = url.searchParams.get("end_date");
    const period = url.searchParams.get("period"); // YYYY-MM format

    if (!teacherId) {
      return NextResponse.json(
        { success: false, message: "teacher_id is required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return NextResponse.json(
        { success: false, message: "Invalid teacher ID" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Verify teacher exists and belongs to the school
    const teacher = await Teacher.findOne({
      _id: teacherId,
      school_id: schoolId,
    });

    if (!teacher) {
      return NextResponse.json(
        { success: false, message: "Teacher not found" },
        { status: 404 }
      );
    }

    const monthlySalary = teacher.basic_salary || 0;

    let startDate: Date;
    let endDate: Date;
    let periodLabel: string;

    if (period) {
      const [yearStr, monthStr] = period.split("-");
      const year = parseInt(yearStr);
      const month = parseInt(monthStr) - 1; // 0-indexed month
      if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
        return NextResponse.json(
          { success: false, message: "Invalid period format. Use YYYY-MM." },
          { status: 400 }
        );
      }
      startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
      periodLabel = period;
    } else if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam + "T00:00:00.000Z");
      endDate = new Date(endDateParam + "T23:59:59.999Z");
      periodLabel = `${startDateParam} to ${endDateParam}`;
    } else {
      // Fallback to current month YYYY-MM
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
      periodLabel = `${year}-${String(month + 1).padStart(2, "0")}`;
    }

    // Query Attendance documents in range
    const attendanceDocs = await Attendance.find({
      school_id: schoolId,
      type: "teacher",
      date: { $gte: startDate, $lte: endDate },
    });

    let attendanceRecordsCount = 0;
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let leaveDays = 0;
    let holidayDays = 0;

    attendanceDocs.forEach((doc) => {
      const record = doc.records.find(
        (r: any) => r.teacher_id && r.teacher_id.toString() === teacherId
      );

      if (record) {
        attendanceRecordsCount++;
        const status = record.status.toLowerCase();
        if (status === "present") {
          presentDays++;
        } else if (status === "absent") {
          absentDays++;
        } else if (status === "late") {
          lateDays++;
          presentDays++; // Counts as present
        } else if (status === "half_day") {
          halfDays++;
          presentDays += 0.5;
          absentDays += 0.5;
        } else if (status === "leave") {
          leaveDays++;
          presentDays++; // Counts as paid leave
        } else if (status === "holiday") {
          holidayDays++;
          presentDays++; // Paid holiday
        }
      }
    });

    // Total Calendar Days in range (standard 30 or actual count)
    const diffTime = endDate.getTime() - startDate.getTime();
    const totalDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);

    // If no attendance marked, default to full working/present days so teacher gets full salary
    const finalWorkingDays = attendanceRecordsCount > 0 ? attendanceRecordsCount : totalDays;
    const finalPresentDays = attendanceRecordsCount > 0 ? presentDays : totalDays;
    const finalAbsentDays = attendanceRecordsCount > 0 ? absentDays : 0;

    // Daily Salary Rate (basic / 30)
    const dailySalary = Math.round((monthlySalary / 30) * 100) / 100;

    // Suggested Deduction based on absences and half days
    const suggestedDeduction = Math.round((finalAbsentDays * dailySalary) * 100) / 100;

    // Net payable
    const totalPayableAmount = Math.max(0, Math.round((monthlySalary - suggestedDeduction) * 100) / 100);

    return NextResponse.json({
      success: true,
      data: {
        teacherId: teacher._id,
        teacherName: teacher.name,
        employeeId: teacher.employee_id || "EMP-N/A",
        monthlySalary,
        salaryPeriod: periodLabel,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        totalDays,
        workingDays: finalWorkingDays,
        presentDays: finalPresentDays,
        absentDays: finalAbsentDays,
        lateDays,
        halfDays,
        leaveDays,
        holidayDays,
        dailySalary,
        suggestedDeduction,
        totalPayableAmount,
        hasAttendance: attendanceRecordsCount > 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
