import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { SalaryPayment } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

type RouteParams = { params: Promise<{ id: string }> };

// GET: Fetch a single salary payment by ID
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { schoolId, role, userId, error } = requireAuth(req, ["school_admin", "super_admin", "teacher", "parent", "student"]);
  if (error) return error;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid payment ID" }, { status: 400 });
    }

    await connectToDatabase();

    const payment = await SalaryPayment.findOne({
      _id: id,
      school_id: schoolId
    }).populate("teacher_id", "name employee_id basic_salary subject department qualification designation");

    if (!payment) {
      return NextResponse.json({ success: false, message: "Salary slip not found" }, { status: 404 });
    }

    // Security check: teachers/students/parents can only see their own/child's salary slip
    if (role === "teacher") {
      const Teacher = mongoose.models.Teacher;
      const teacher = await Teacher.findOne({ user_id: userId, school_id: schoolId }).select("_id").lean();
      if (!teacher || payment.teacher_id._id.toString() !== teacher._id.toString()) {
        return NextResponse.json({ success: false, message: "Unauthorized access" }, { status: 403 });
      }
    } else if (role === "student" || role === "parent") {
      // Students and parents don't have access to see salary slips
      return NextResponse.json({ success: false, message: "Unauthorized access" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: payment
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Edit a salary payment (lock editing if Paid, unless transitioning to Approved/Draft/Cancel)
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { schoolId, userId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid payment ID" }, { status: 400 });
    }

    await connectToDatabase();
    const body = await req.json();

    const payment = await SalaryPayment.findOne({ _id: id, school_id: schoolId });
    if (!payment) {
      return NextResponse.json({ success: false, message: "Salary record not found" }, { status: 404 });
    }

    // Audit logs / status validations
    if (payment.status === "Paid" && body.status === "Paid") {
      return NextResponse.json({
        success: false,
        message: "Paid salary records cannot be modified directly. Please cancel the payment or record an adjustment."
      }, { status: 400 });
    }

    // Update fields
    const allowedFields = [
      "status", "working_days", "present_days", "absent_days", "late_days",
      "half_days", "leave_days", "holiday_days", "suggested_deduction",
      "payable_amount", "bonus", "deduction", "overtime_amount", "tax_deduction",
      "final_salary", "remarks", "payment_method", "payment_date"
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        (payment as any)[field] = body[field];
      }
    });

    if (body.status === "Paid") {
      payment.approved_by = new mongoose.Types.ObjectId(userId);
      if (!payment.payment_date) {
        payment.payment_date = new Date();
      }
    }

    await payment.save();

    return NextResponse.json({
      success: true,
      message: "Salary record updated successfully",
      data: payment
    });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a salary payment (acts as Cancel Payment for Paid records)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid payment ID" }, { status: 400 });
    }

    await connectToDatabase();

    const deleted = await SalaryPayment.findOneAndDelete({ _id: id, school_id: schoolId });
    if (!deleted) {
      return NextResponse.json({ success: false, message: "Salary record not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: deleted.status === "Paid" ? "Payment canceled and payroll record deleted." : "Payroll record deleted."
    });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
