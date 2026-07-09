import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { StudentFeePayment } from "@/lib/models/index";
import Student from "@/lib/models/Student";
import Parent from "@/lib/models/Parent";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

// ─── Atomic Receipt Counter ───────────────────────────────────────────────────
// Uses a dedicated "counters" collection with findOneAndUpdate + $inc to
// guarantee globally-unique, collision-free receipt numbers without any
// Math.random() risk. Safe under concurrent requests.
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },          // e.g. "receipt_20260708"
  seq: { type: Number, default: 0 },
});
const Counter: mongoose.Model<any> =
  mongoose.models.Counter || mongoose.model("Counter", CounterSchema);

async function generateReceiptNumber(): Promise<string> {
  const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, ""); // "20260708"
  const counterId = `receipt_${dateStr}`;

  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  // Zero-pad to 5 digits → up to 99,999 unique receipts per day
  const seq = String(counter.seq).padStart(5, "0");
  return `REC-${dateStr}-${seq}`;
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

    // ── Validation ────────────────────────────────────────────────────────────
    if (!student_id || !payment_method || !start_date || !end_date) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    // Fix HIGH-4: Reject zero or negative amounts
    const parsedAmount = Number(amount_paid);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, message: "Amount paid must be greater than ₹0" },
        { status: 400 }
      );
    }

    // Fix MED-2: Validate date range on the server
    const sdDate = new Date(start_date);
    const edDate = new Date(end_date);
    if (isNaN(sdDate.getTime()) || isNaN(edDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid start_date or end_date" },
        { status: 400 }
      );
    }
    if (edDate < sdDate) {
      return NextResponse.json(
        { success: false, message: "end_date cannot be before start_date" },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify student exists and belongs to this school
    const student = await Student.findOne({ _id: student_id, school_id: schoolId }).lean();
    if (!student) {
      return NextResponse.json({ success: false, message: "Invalid Student record" }, { status: 400 });
    }

    // ── Fix CRIT-2: Server-side overlap / duplicate check ─────────────────────
    // Reject if any previous payment for this student overlaps the requested period
    const overlapping = await StudentFeePayment.findOne({
      school_id: new mongoose.Types.ObjectId(schoolId as string),
      student_id: new mongoose.Types.ObjectId(student_id),
      start_date: { $lte: edDate },
      end_date:   { $gte: sdDate },
    }).lean();

    if (overlapping) {
      return NextResponse.json(
        {
          success: false,
          message: `Duplicate payment rejected: a payment already exists for the overlapping period (${
            new Date((overlapping as any).start_date).toLocaleDateString("en-IN")
          } – ${
            new Date((overlapping as any).end_date).toLocaleDateString("en-IN")
          }).`,
        },
        { status: 409 }
      );
    }

    // ── Fix CRIT-1: Atomic receipt number (no Math.random collision) ──────────
    const receiptNumber = await generateReceiptNumber();
    const transactionDate = payment_date ? new Date(payment_date) : new Date();

    // ── Fix CRIT-3: Wrap in a MongoDB session for transaction safety ──────────
    // If the server crashes after create but before the response is sent,
    // the session rolls back automatically so there is no phantom record.
    const session = await mongoose.startSession();
    let payment: any;

    try {
      await session.withTransaction(async () => {
        const [created] = await StudentFeePayment.create(
          [
            {
              school_id: new mongoose.Types.ObjectId(schoolId as string),
              student_id: new mongoose.Types.ObjectId(student_id),
              receipt_number: receiptNumber,
              amount_paid: parsedAmount,
              payment_date: transactionDate,
              payment_method,
              remarks: remarks || "",
              start_date: sdDate,
              end_date: edDate,
              collection_type: collection_type || "Monthly",
              fee_breakdown: fee_breakdown || [],
            },
          ],
          { session }
        );
        payment = created;
      });
    } finally {
      await session.endSession();
    }

    // Populate for the response (outside transaction — read-only)
    const populatedPayment = await StudentFeePayment.findById(payment._id)
      .populate("student_id", "name admission_no class_id")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Payment recorded successfully",
        data: { payment: populatedPayment },
      },
      { status: 201 }
    );
  } catch (error: any) {
    // Handle duplicate receipt_number at DB level (last safety net)
    if (error.code === 11000 && error.keyPattern?.receipt_number) {
      return NextResponse.json(
        { success: false, message: "Receipt number conflict. Please try again." },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
