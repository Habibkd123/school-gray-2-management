import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { StudentFeePayment } from "@/lib/models/index";
import Student from "@/lib/models/Student";
import Parent from "@/lib/models/Parent";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

// Generate unique receipt numbers
function generateReceiptNumber() {
  const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `REC-${dateStr}-${rand}`;
}

export async function GET(req: NextRequest) {
  try {
    const { schoolId, role, userId, error } = requireAuth(req);
    if (error) return error;

    const url = new URL(req.url);
    const student_id = url.searchParams.get("student_id");

    const query: any = { school_id: new mongoose.Types.ObjectId(schoolId as string) };

    await connectDB();

    if (role === "student") {
      const studentProfile = await Student.findOne({ school_id: schoolId, user_id: userId }).select("_id").lean();
      if (!studentProfile) {
        return NextResponse.json({ success: true, data: { payments: [] } });
      }
      query.student_id = studentProfile._id;
    } else if (role === "parent") {
      const parent = await Parent.findOne({ user_id: userId, school_id: schoolId }).select("_id").lean();
      if (!parent) {
        return NextResponse.json({ success: true, data: { payments: [] } });
      }
      const children = await Student.find({ school_id: schoolId, parent_id: parent._id }).select("_id").lean();
      const childIds = children.map((c: any) => c._id.toString());
      if (student_id) {
        if (!childIds.includes(student_id)) {
          return NextResponse.json({ success: false, message: "Access denied to student record" }, { status: 403 });
        }
        query.student_id = new mongoose.Types.ObjectId(student_id);
      } else {
        query.student_id = { $in: childIds.map(id => new mongoose.Types.ObjectId(id)) };
      }
    } else {
      if (student_id) {
        query.student_id = new mongoose.Types.ObjectId(student_id);
      }
    }

    const payments = await StudentFeePayment.find(query)
      .populate({
        path: "student_id",
        select: "name admission_no roll_no class_id",
        populate: { path: "class_id", select: "name section" }
      })
      .sort({ payment_date: -1 })
      .lean();

    return NextResponse.json({ success: true, data: { payments } });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin", "accountant"]);
    if (error) return error;

    const body = await req.json();
    const { student_id, amount_paid, payment_method, remarks, payment_date, start_date, end_date, collection_type, fee_breakdown } = body;

    if (!student_id || amount_paid === undefined || !payment_method || !start_date || !end_date) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    await connectDB();

    // Verify student exists
    const student = await Student.findOne({ _id: student_id, school_id: schoolId }).lean();
    if (!student) {
      return NextResponse.json({ success: false, message: "Invalid Student record" }, { status: 400 });
    }

    const receiptNumber = generateReceiptNumber();
    const transactionDate = payment_date ? new Date(payment_date) : new Date();

    const payment = await StudentFeePayment.create({
      school_id: new mongoose.Types.ObjectId(schoolId as string),
      student_id: new mongoose.Types.ObjectId(student_id),
      receipt_number: receiptNumber,
      amount_paid: Number(amount_paid),
      payment_date: transactionDate,
      payment_method,
      remarks: remarks || "",
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      collection_type: collection_type || "Monthly",
      fee_breakdown: fee_breakdown || []
    });

    const populatedPayment = await StudentFeePayment.findById(payment._id)
      .populate("student_id", "name admission_no class_id")
      .lean();

    return NextResponse.json({
      success: true,
      message: "Payment recorded successfully",
      data: { payment: populatedPayment }
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
