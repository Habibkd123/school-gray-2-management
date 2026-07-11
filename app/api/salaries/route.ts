import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { SalaryPayment, Attendance } from "@/lib/models/index";
import Teacher from "@/lib/models/Teacher";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

// Helper: Calculate payroll fields dynamically
async function calculatePayrollForTeacher(teacher: any, period: string, schoolId: string) {
  const [yearStr, monthStr] = period.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1;
  const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  
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
      (r: any) => r.teacher_id && r.teacher_id.toString() === teacher._id.toString()
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
        presentDays++;
      } else if (status === "half_day") {
        halfDays++;
        presentDays += 0.5;
        absentDays += 0.5;
      } else if (status === "leave") {
        leaveDays++;
        presentDays++;
      } else if (status === "holiday") {
        holidayDays++;
        presentDays++;
      }
    }
  });

  const diffTime = endDate.getTime() - startDate.getTime();
  const totalDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);

  const finalWorkingDays = attendanceRecordsCount > 0 ? attendanceRecordsCount : totalDays;
  const finalPresentDays = attendanceRecordsCount > 0 ? presentDays : totalDays;
  const finalAbsentDays = attendanceRecordsCount > 0 ? absentDays : 0;

  const monthlySalary = teacher.basic_salary || 0;
  const dailySalary = Math.round((monthlySalary / 30) * 100) / 100;
  const suggestedDeduction = Math.round((finalAbsentDays * dailySalary) * 100) / 100;
  const payableAmount = Math.max(0, Math.round((monthlySalary - suggestedDeduction) * 100) / 100);

  return {
    working_days: finalWorkingDays,
    present_days: finalPresentDays,
    absent_days: finalAbsentDays,
    late_days: lateDays,
    half_days: halfDays,
    leave_days: leaveDays,
    holiday_days: holidayDays,
    suggested_deduction: suggestedDeduction,
    payable_amount: payableAmount,
    final_salary: payableAmount,
    start_date: startDate,
    end_date: endDate
  };
}

// GET: Fetch salary history or reports
export async function GET(req: NextRequest) {
  const { schoolId, role, userId, error } = requireAuth(req, ["school_admin", "super_admin", "teacher"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const teacherId = url.searchParams.get("teacher_id");
    const period = url.searchParams.get("period"); // format YYYY-MM
    const year = url.searchParams.get("year"); // e.g. "2026"
    const startDateParam = url.searchParams.get("start_date");
    const endDateParam = url.searchParams.get("end_date");
    const statusParam = url.searchParams.get("status");
    
    await connectToDatabase();

    let query: any = { school_id: schoolId };

    // Security check: Teachers can only view their own salary history
    if (role === "teacher") {
      const teacher = await Teacher.findOne({ user_id: userId, school_id: schoolId }).select("_id").lean();
      if (!teacher) {
        return NextResponse.json({
          success: true,
          data: { payments: [], summary: { totalPaid: 0, totalPending: 0, pendingCount: 0, count: 0 } }
        });
      }
      query.teacher_id = teacher._id;
    } else if (teacherId) {
      if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        return NextResponse.json({ success: false, message: "Invalid teacher ID" }, { status: 400 });
      }
      query.teacher_id = teacherId;
    }

    if (startDateParam && endDateParam) {
      const s = new Date(startDateParam + "T00:00:00.000Z");
      const e = new Date(endDateParam + "T23:59:59.999Z");
      query.payment_date = { $gte: s, $lte: e };
    } else if (period) {
      query.salary_period = period;
    } else if (year) {
      query.salary_period = new RegExp(`^${year}-`);
    }

    if (statusParam && statusParam !== "all") {
      query.status = statusParam;
    }

    const payments = await SalaryPayment.find(query)
      .populate("teacher_id", "name employee_id basic_salary subject department qualification designation")
      .sort({ salary_period: -1, payment_date: -1 });

    // Aggregate reports summary
    let totalPaid = 0;
    payments.forEach(p => {
      if (p.status === "Paid") {
        totalPaid += p.final_salary || 0;
      }
    });

    // Calculate Pending/Draft Salary for the selected period
    let totalPending = 0;
    let pendingCount = 0;

    if (role !== "teacher" && (period || (startDateParam && endDateParam))) {
      // Find all active teachers with configured salary (basic_salary > 0)
      const allTeachers = await Teacher.find({
        school_id: schoolId,
        is_active: true,
        basic_salary: { $gt: 0 }
      });

      const paidTeacherIds = new Set(
        payments
          .filter(p => p.status === "Paid")
          .map(p => p.teacher_id ? (p.teacher_id as any)._id?.toString() || p.teacher_id.toString() : "")
      );

      allTeachers.forEach(t => {
        if (!paidTeacherIds.has(t._id.toString())) {
          totalPending += t.basic_salary || 0;
          pendingCount++;
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        payments,
        summary: {
          totalPaid,
          totalPending,
          pendingCount,
          count: payments.length
        }
      }
    });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Process salary generation / disbursement
export async function POST(req: NextRequest) {
  const { schoolId, userId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const body = await req.json();

    // Check if bulk generation
    if (body.bulk) {
      const { salary_period, teacher_ids, department, designation, action, payment_method } = body;

      if (!salary_period) {
        return NextResponse.json({ success: false, message: "Salary period (YYYY-MM) is required" }, { status: 400 });
      }

      if (action === "approve") {
        const approveQuery: any = { school_id: schoolId, salary_period, status: "Draft" };
        if (teacher_ids && Array.isArray(teacher_ids) && teacher_ids.length > 0) {
          approveQuery.teacher_id = { $in: teacher_ids };
        }
        const result = await SalaryPayment.updateMany(approveQuery, {
          status: "Approved",
          approved_by: new mongoose.Types.ObjectId(userId)
        });
        return NextResponse.json({
          success: true,
          message: `Successfully approved ${result.modifiedCount} payroll records.`
        });
      }

      if (action === "pay") {
        const payQuery: any = { school_id: schoolId, salary_period, status: { $in: ["Draft", "Approved"] } };
        if (teacher_ids && Array.isArray(teacher_ids) && teacher_ids.length > 0) {
          payQuery.teacher_id = { $in: teacher_ids };
        }
        const result = await SalaryPayment.updateMany(payQuery, {
          status: "Paid",
          payment_date: new Date(),
          payment_method: payment_method || "Bank Transfer",
          approved_by: new mongoose.Types.ObjectId(userId)
        });
        return NextResponse.json({
          success: true,
          message: `Successfully paid/disbursed ${result.modifiedCount} payroll records.`
        });
      }

      // Build teacher filter query for Draft Generation
      const teacherFilter: any = { school_id: schoolId, is_active: true, basic_salary: { $gt: 0 } };
      if (teacher_ids && Array.isArray(teacher_ids) && teacher_ids.length > 0) {
        teacherFilter._id = { $in: teacher_ids };
      }
      if (department && department !== "all") {
        teacherFilter.department = department;
      }
      if (designation && designation !== "all") {
        teacherFilter.designation = designation;
      }

      const eligibleTeachers = await Teacher.find(teacherFilter);
      if (eligibleTeachers.length === 0) {
        return NextResponse.json({ success: false, message: "No active teachers found matching filters." }, { status: 404 });
      }

      // Find existing payments for this period
      const existingPayments = await SalaryPayment.find({
        school_id: schoolId,
        salary_period
      }).select("teacher_id").lean();

      const existingTeacherIds = new Set(existingPayments.map(p => p.teacher_id.toString()));

      let generatedCount = 0;
      for (const teacher of eligibleTeachers) {
        // Skip if already generated or paid
        if (existingTeacherIds.has(teacher._id.toString())) {
          continue;
        }

        const stats = await calculatePayrollForTeacher(teacher, salary_period, schoolId as string);

        const randCode = Math.floor(1000 + Math.random() * 9000);
        const receipt_number = `SAL-${salary_period.replace(/[^a-zA-Z0-9]/g, "")}-${randCode}`;

        const payment = new SalaryPayment({
          school_id: new mongoose.Types.ObjectId(schoolId as string),
          teacher_id: teacher._id,
          salary_period,
          start_date: stats.start_date,
          end_date: stats.end_date,
          monthly_salary: teacher.basic_salary,
          working_days: stats.working_days,
          present_days: stats.present_days,
          absent_days: stats.absent_days,
          late_days: stats.late_days,
          half_days: stats.half_days,
          leave_days: stats.leave_days,
          holiday_days: stats.holiday_days,
          suggested_deduction: stats.suggested_deduction,
          payable_amount: stats.payable_amount,
          final_salary: stats.final_salary,
          receipt_number,
          status: "Draft",
          calculation_type: "Monthly",
          generated_by: new mongoose.Types.ObjectId(userId)
        });

        await payment.save();
        generatedCount++;
      }

      return NextResponse.json({
        success: true,
        message: `Successfully generated draft payroll for ${generatedCount} teachers.`
      });
    }

    // Single Payment / Disbursement
    const {
      teacher_id,
      salary_period,
      start_date,
      end_date,
      monthly_salary,
      working_days,
      present_days,
      absent_days,
      late_days,
      half_days,
      leave_days,
      holiday_days,
      suggested_deduction,
      payable_amount,
      bonus,
      deduction,
      overtime_amount,
      tax_deduction,
      final_salary,
      payment_date,
      payment_method,
      remarks,
      calculation_type,
      status
    } = body;

    // Validation
    if (!teacher_id || !salary_period || monthly_salary === undefined || final_salary === undefined) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(teacher_id)) {
      return NextResponse.json({ success: false, message: "Invalid teacher ID" }, { status: 400 });
    }

    // Verify teacher exists
    const teacher = await Teacher.findOne({ _id: teacher_id, school_id: schoolId });
    if (!teacher) {
      return NextResponse.json({ success: false, message: "Teacher not found" }, { status: 404 });
    }

    // Check if duplicate payout exists
    const existingPayment = await SalaryPayment.findOne({
      school_id: schoolId,
      teacher_id: teacher_id,
      salary_period: salary_period
    });

    if (existingPayment) {
      if (existingPayment.status === "Paid") {
        return NextResponse.json(
          { success: false, message: `Salary for ${salary_period} has already been paid for this employee.` },
          { status: 409 }
        );
      } else {
        // If draft exists, update it to Paid
        existingPayment.status = status || "Paid";
        existingPayment.payment_date = payment_date ? new Date(payment_date) : new Date();
        existingPayment.payment_method = payment_method || "Bank Transfer";
        existingPayment.remarks = remarks || "";
        existingPayment.bonus = Number(bonus) || 0;
        existingPayment.deduction = Number(deduction) || 0;
        existingPayment.overtime_amount = Number(overtime_amount) || 0;
        existingPayment.tax_deduction = Number(tax_deduction) || 0;
        existingPayment.final_salary = Number(final_salary);
        existingPayment.approved_by = new mongoose.Types.ObjectId(userId);

        await existingPayment.save();

        return NextResponse.json({
          success: true,
          message: "Salary paid successfully",
          data: existingPayment
        });
      }
    }

    // Generate unique receipt number
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const receipt_number = `SAL-${salary_period.replace(/[^a-zA-Z0-9]/g, "")}-${randCode}`;

    // Create payment
    const payment = new SalaryPayment({
      school_id: new mongoose.Types.ObjectId(schoolId as string),
      teacher_id: new mongoose.Types.ObjectId(teacher_id),
      salary_period,
      start_date: start_date ? new Date(start_date) : undefined,
      end_date: end_date ? new Date(end_date) : undefined,
      monthly_salary,
      working_days: Number(working_days) || 0,
      present_days: Number(present_days) || 0,
      absent_days: Number(absent_days) || 0,
      late_days: Number(late_days) || 0,
      half_days: Number(half_days) || 0,
      leave_days: Number(leave_days) || 0,
      holiday_days: Number(holiday_days) || 0,
      suggested_deduction: Number(suggested_deduction) || 0,
      payable_amount: Number(payable_amount) || 0,
      bonus: Number(bonus) || 0,
      deduction: Number(deduction) || 0,
      overtime_amount: Number(overtime_amount) || 0,
      tax_deduction: Number(tax_deduction) || 0,
      final_salary: Number(final_salary) || 0,
      payment_date: payment_date ? new Date(payment_date) : new Date(),
      payment_method: payment_method || "Bank Transfer",
      receipt_number,
      remarks: remarks || "",
      status: status || "Paid",
      calculation_type: calculation_type || "Monthly",
      generated_by: new mongoose.Types.ObjectId(userId),
      approved_by: status === "Paid" ? new mongoose.Types.ObjectId(userId) : undefined
    });

    await payment.save();

    return NextResponse.json({
      success: true,
      message: "Salary paid successfully",
      data: payment
    });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
