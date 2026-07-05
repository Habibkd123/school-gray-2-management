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
    const period = url.searchParams.get("period"); // fallback format YYYY-MM

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

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam + "T00:00:00.000Z");
      endDate = new Date(endDateParam + "T23:59:59.999Z");
      periodLabel = `${startDateParam} to ${endDateParam}`;
    } else if (period) {
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
    } else {
      // Fallback to current month
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
      periodLabel = `${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`;
    }

    // Query Attendance documents in range
    const attendanceDocs = await Attendance.find({
      school_id: schoolId,
      type: "teacher",
      date: { $gte: startDate, $lte: endDate },
    });

    let workingDays = 0;
    let presentDays = 0;
    let absentDays = 0;

    attendanceDocs.forEach((doc) => {
      // Find the record for this teacher
      const record = doc.records.find(
        (r: any) => r.teacher_id && r.teacher_id.toString() === teacherId
      );

      if (record) {
        workingDays++;
        const status = record.status.toLowerCase();
        if (status === "present" || status === "late" || status === "holiday" || status === "leave") {
          presentDays++;
        } else if (status === "absent") {
          absentDays++;
        } else if (status === "half_day") {
          presentDays += 0.5;
          absentDays += 0.5;
        }
      }
    });

    const hasAttendance = workingDays > 0;

    // Daily Salary Calculation (Assumed standard 26 working days division for school payroll)
    const dailySalary = Math.round((monthlySalary / 26) * 100) / 100;
    
    // Payable days = present days
    const payableDays = presentDays;

    // Total Payable Amount = Daily Salary * Payable Days
    const totalPayableAmount = hasAttendance ? Math.round((dailySalary * payableDays) * 100) / 100 : 0;

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
        workingDays,
        presentDays,
        absentDays,
        dailySalary,
        payableDays,
        totalPayableAmount,
        hasAttendance,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
