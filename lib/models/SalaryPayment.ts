import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISalaryPayment extends Document {
  school_id: mongoose.Types.ObjectId;
  teacher_id: mongoose.Types.ObjectId;
  salary_period: string; // YYYY-MM or date range description
  start_date?: Date;
  end_date?: Date;
  monthly_salary: number;
  working_days: number;
  present_days: number;
  absent_days: number;
  suggested_deduction: number;
  final_salary: number;
  payment_date: Date;
  receipt_number: string;
  remarks?: string;
  status: "Paid";
  calculation_type: string; // "Monthly" or "Day Wise"
  createdAt: Date;
  updatedAt: Date;
}

const salaryPaymentSchema = new Schema<ISalaryPayment>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true, index: true },
    salary_period: { type: String, required: true, index: true }, 
    start_date: { type: Date },
    end_date: { type: Date },
    monthly_salary: { type: Number, required: true, min: 0 },
    working_days: { type: Number, required: true, min: 0 },
    present_days: { type: Number, required: true, min: 0 },
    absent_days: { type: Number, required: true, min: 0 },
    suggested_deduction: { type: Number, required: true, min: 0 },
    final_salary: { type: Number, required: true, min: 0 },
    payment_date: { type: Date, required: true, default: Date.now },
    receipt_number: { type: String, required: true, unique: true },
    remarks: { type: String, trim: true },
    status: { type: String, enum: ["Paid"], default: "Paid" },
    calculation_type: { type: String, enum: ["Monthly", "Day Wise"], default: "Monthly" }
  },
  { timestamps: true }
);

salaryPaymentSchema.index({ school_id: 1, teacher_id: 1, salary_period: 1 }, { unique: true });

const SalaryPayment: Model<ISalaryPayment> =
  mongoose.models.SalaryPayment || mongoose.model<ISalaryPayment>("SalaryPayment", salaryPaymentSchema);

export default SalaryPayment;
