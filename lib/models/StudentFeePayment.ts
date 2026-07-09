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
  payment_method: "Cash" | "Cheque" | "Bank Transfer" | "Online";
  remarks?: string;
  start_date: Date;
  end_date: Date;
  collection_type: "Monthly" | "Day Wise";
  fee_breakdown?: IFeeBreakdownItem[];
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
    ]
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

