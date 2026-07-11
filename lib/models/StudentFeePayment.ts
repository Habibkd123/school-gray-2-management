import mongoose, { Document, Schema, Model } from "mongoose";

export interface IFeeBreakdownItem {
  name: string;
  amount_paid: number;
}

export interface IStudentFeePayment extends Document {
  school_id: mongoose.Types.ObjectId;
  student_id: mongoose.Types.ObjectId;
  receipt_number: string;
  amount_paid: number;
  payment_date: Date;
  payment_method: "Cash" | "Cheque" | "Bank Transfer" | "Online" | "UPI";
  remarks?: string;
  start_date: Date;
  end_date: Date;
  collection_type: "Monthly" | "Day Wise";
  fee_breakdown?: IFeeBreakdownItem[];
  discount?: number;
  fine?: number;
  scholarship?: number;
  waiver?: number;
  adjustment?: number;
  round_off?: number;
  collected_by?: mongoose.Types.ObjectId | string | null;
  createdAt: Date;
  updatedAt: Date;
}

const studentFeePaymentSchema = new Schema<IStudentFeePayment>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    receipt_number: { type: String, required: true, unique: true },
    // Fix HIGH-4: min 0.01 — prevents ₹0 payment records at schema level
    amount_paid: { type: Number, required: true, min: 0.01 },
    payment_date: { type: Date, default: Date.now },
    // Fix HIGH-3: "UPI" added as a valid enum value — no more silent remapping to "Online"
    payment_method: { type: String, enum: ["Cash", "Cheque", "Bank Transfer", "Online", "UPI"], required: true },
    remarks: { type: String, trim: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    collection_type: { type: String, enum: ["Monthly", "Day Wise"], default: "Monthly", required: true },
    fee_breakdown: [
      {
        name: { type: String, required: true },
        amount_paid: { type: Number, required: true }
      }
    ],
    discount: { type: Number, default: 0 },
    fine: { type: Number, default: 0 },
    scholarship: { type: Number, default: 0 },
    waiver: { type: Number, default: 0 },
    adjustment: { type: Number, default: 0 },
    round_off: { type: Number, default: 0 },
    collected_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

// Fast receipt history lookups: "show me all payments for student X, newest first"
studentFeePaymentSchema.index({ school_id: 1, student_id: 1, createdAt: -1 });
// Fast payment-date range queries for reporting
studentFeePaymentSchema.index({ school_id: 1, payment_date: -1 });

const StudentFeePayment: Model<IStudentFeePayment> =
  mongoose.models.StudentFeePayment || mongoose.model<IStudentFeePayment>("StudentFeePayment", studentFeePaymentSchema);
export default StudentFeePayment;

