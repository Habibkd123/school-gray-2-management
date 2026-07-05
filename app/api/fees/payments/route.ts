import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { StudentFeePayment, ClassFee, StudentFeeAssignment } from "@/lib/models/index";
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

    // Map database fields to standard schema details for response compatibility
    const mappedPayments = payments.map((p: any) => ({
      ...p,
      receipt_no: p.receipt_number,
      total_amount: p.amount_paid,
      payment_date: p.payment_date,
      start_date: p.start_date,
      end_date: p.end_date,
      collection_type: p.collection_type,
      status: "Success",
    }));

    return NextResponse.json({ success: true, data: { payments: mappedPayments } });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { role, schoolId, error } = requireAuth(req, ["school_admin", "super_admin", "accountant"]);
    if (error) return error;

    const body = await req.json();
    const { student_id, amount_paid, payment_method, remarks, payment_date, start_date, end_date, collection_type } = body;

    if (!student_id || amount_paid === undefined || !payment_method || !start_date || !end_date || !collection_type) {
      return NextResponse.json({ success: false, message: "Missing required fields (student_id, amount_paid, payment_method, start_date, end_date, collection_type)" }, { status: 400 });
    }

    if (new Date(end_date) < new Date(start_date)) {
      return NextResponse.json({ success: false, message: "End Date cannot be earlier than Start Date" }, { status: 400 });
    }

    await connectDB();

    // Verify student exists
    const student = await Student.findOne({ _id: student_id, school_id: schoolId })
      .populate("class_id", "name section")
      .lean();

    if (!student) {
      return NextResponse.json({ success: false, message: "Invalid Student record" }, { status: 400 });
    }

    // Prevent duplicate or overlapping fee collections for the same student
    const overlapping = await StudentFeePayment.findOne({
      school_id: schoolId,
      student_id: student_id,
      $or: [
        {
          start_date: { $lte: new Date(end_date) },
          end_date: { $gte: new Date(start_date) }
        }
      ]
    });

    if (overlapping) {
      return NextResponse.json({
        success: false,
        message: `Overlapping fee collection period detected: from ${new Date(overlapping.start_date).toLocaleDateString()} to ${new Date(overlapping.end_date).toLocaleDateString()}.`
      }, { status: 400 });
    }

    // Retrieve active fees: check StudentFeeAssignment override first, fallback to ClassFee
    const customDoc = await StudentFeeAssignment.findOne({
      school_id: schoolId,
      student_id: student._id
    }).lean();

    const classFeeDoc = await ClassFee.findOne({
      school_id: schoolId,
      class_id: student.class_id?._id || student.class_id
    }).lean();

    const finalFeeDoc = customDoc || classFeeDoc;
    const totalFees = finalFeeDoc ? finalFeeDoc.total_amount : 0;
    const feeBreakdown = finalFeeDoc ? finalFeeDoc.fee_types.filter(ft => ft.is_enabled) : [];

    // Create payment transaction record
    const payment = await StudentFeePayment.create({
      school_id: new mongoose.Types.ObjectId(schoolId as string),
      student_id: new mongoose.Types.ObjectId(student_id),
      receipt_number: generateReceiptNumber(),
      amount_paid: Number(amount_paid),
      payment_method,
      remarks: remarks || "",
      payment_date: payment_date ? new Date(payment_date) : new Date(),
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      collection_type,
    });

    // Query all student payments to calculate final totals and balance
    const allStudentPayments = await StudentFeePayment.find({
      school_id: schoolId,
      student_id: student._id
    }).lean();

    const totalPaid = allStudentPayments.reduce((sum, p) => sum + p.amount_paid, 0);
    const balanceAmount = Math.max(0, totalFees - totalPaid);

    const populatedPayment = {
      ...payment.toObject(),
      receipt_no: payment.receipt_number,
      total_amount: payment.amount_paid,
      payment_date: payment.payment_date,
      start_date: payment.start_date,
      end_date: payment.end_date,
      collection_type: payment.collection_type,
      status: "Success",
      student_id: student,
      fee_breakdown: feeBreakdown,
      totalFees,
      totalPaid,
      balanceAmount
    };

    return NextResponse.json({
      success: true,
      message: "Payment recorded successfully",
      data: { payment: populatedPayment }
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
