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
    amount_paid: { type: Number, required: true, min: 0 },
    payment_date: { type: Date, default: Date.now },
    payment_method: { type: String, enum: ["Cash", "Cheque", "Bank Transfer", "Online"], required: true },
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

const StudentFeePayment: Model<IStudentFeePayment> =
  mongoose.models.StudentFeePayment || mongoose.model<IStudentFeePayment>("StudentFeePayment", studentFeePaymentSchema);
export default StudentFeePayment;

