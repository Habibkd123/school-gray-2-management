import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { SalaryPayment } from "@/lib/models/index";
import Teacher from "@/lib/models/Teacher";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

// GET: Fetch salary history or reports
export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const teacherId = url.searchParams.get("teacher_id");
    const period = url.searchParams.get("period"); // format YYYY-MM
    const year = url.searchParams.get("year"); // e.g. "2026"
    const startDateParam = url.searchParams.get("start_date");
    const endDateParam = url.searchParams.get("end_date");
    
    await connectToDatabase();

    // Case 1: Specific teacher history
    if (teacherId) {
      if (!mongoose.Types.ObjectId.isValid(teacherId)) {
        return NextResponse.json({ success: false, message: "Invalid teacher ID" }, { status: 400 });
      }
      
      const payments = await SalaryPayment.find({
        school_id: schoolId,
        teacher_id: teacherId
      }).sort({ salary_period: -1 });

      return NextResponse.json({
        success: true,
        data: payments
      });
    }

    // Case 2: Payout reports / lists filtered by date range, month/year or just year
    let query: any = { school_id: schoolId };
    if (startDateParam && endDateParam) {
      const s = new Date(startDateParam + "T00:00:00.000Z");
      const e = new Date(endDateParam + "T23:59:59.999Z");
      query.payment_date = { $gte: s, $lte: e };
    } else if (period) {
      query.salary_period = period;
    } else if (year) {
      query.salary_period = new RegExp(`^${year}-`);
    }

    const payments = await SalaryPayment.find(query)
      .populate("teacher_id", "name employee_id basic_salary subject department qualification designation")
      .sort({ payment_date: -1 });

    // Aggregate reports summary
    let totalPaid = 0;
    payments.forEach(p => {
      totalPaid += p.final_salary || 0;
    });

    // Calculate Pending Salary for the selected period
    let totalPending = 0;
    let pendingCount = 0;
    if (period || (startDateParam && endDateParam)) {
      // Find all active teachers with configured salary (basic_salary > 0)
      const allTeachers = await Teacher.find({
        school_id: schoolId,
        is_active: true,
        basic_salary: { $gt: 0 }
      });

      const paidTeacherIds = new Set(payments.map(p => p.teacher_id ? (p.teacher_id as any)._id?.toString() || p.teacher_id.toString() : ""));

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

// POST: Process salary disbursement
export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();

    const body = await req.json();
    const {
      teacher_id,
      salary_period,
      start_date,
      end_date,
      monthly_salary,
      working_days,
      present_days,
      absent_days,
      suggested_deduction,
      payable_amount,
      bonus,
      deduction,
      final_salary,
      payment_date,
      remarks,
      calculation_type
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

    // Date Range Validation
    if (start_date && end_date) {
      const sDate = new Date(start_date);
      const eDate = new Date(end_date);
      if (eDate < sDate) {
        return NextResponse.json(
          { success: false, message: "End Date cannot be earlier than Start Date" },
          { status: 400 }
        );
      }

      // Check if payout overlaps with an already paid period for this employee
      const overlappingPayment = await SalaryPayment.findOne({
        school_id: schoolId,
        teacher_id: teacher_id,
        start_date: { $lte: eDate },
        end_date: { $gte: sDate }
      });

      if (overlappingPayment) {
        return NextResponse.json(
          { success: false, message: `Salary payout overlaps with an already paid period (${overlappingPayment.salary_period}).` },
          { status: 409 }
        );
      }
    } else {
      // Fallback check if start_date/end_date not provided
      const existingPayment = await SalaryPayment.findOne({
        school_id: schoolId,
        teacher_id: teacher_id,
        salary_period: salary_period
      });

      if (existingPayment) {
        return NextResponse.json(
          { success: false, message: `Salary for ${salary_period} has already been paid for this employee.` },
          { status: 409 }
        );
      }
    }

    // Generate unique receipt number (alphanumeric clean)
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
      suggested_deduction: Number(suggested_deduction) || 0,
      payable_amount: Number(payable_amount) || Number(monthly_salary - suggested_deduction) || 0,
      bonus: Number(bonus) || 0,
      deduction: Number(deduction) || 0,
      final_salary: Number(final_salary) || 0,
      payment_date: payment_date ? new Date(payment_date) : new Date(),
      receipt_number,
      remarks: remarks || "",
      status: "Paid",
      calculation_type: calculation_type || "Monthly"
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
