import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISalaryPayment extends Document {
  school_id: mongoose.Types.ObjectId;
  teacher_id: mongoose.Types.ObjectId;
  salary_period: string; // YYYY-MM
  start_date?: Date;
  end_date?: Date;
  monthly_salary: number;
  working_days: number;
  present_days: number;
  absent_days: number;
  late_days?: number;
  half_days?: number;
  leave_days?: number;
  unpaid_leaves?: number;
  suggested_deduction: number;
  payable_amount?: number;
  bonus?: number;
  deduction?: number;
  overtime_amount?: number;
  tax_deduction?: number;
  final_salary: number;
  payment_date?: Date;
  payment_method?: "Cash" | "Bank Transfer" | "Cheque";
  receipt_number: string;
  remarks?: string;
  status: "Draft" | "Approved" | "Paid";
  calculation_type: string; // "Monthly" or "Day Wise"
  generated_by?: mongoose.Types.ObjectId;
  approved_by?: mongoose.Types.ObjectId;
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
    late_days: { type: Number, default: 0 },
    half_days: { type: Number, default: 0 },
    leave_days: { type: Number, default: 0 },
    unpaid_leaves: { type: Number, default: 0 },
    suggested_deduction: { type: Number, required: true, min: 0 },
    payable_amount: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    deduction: { type: Number, default: 0 },
    overtime_amount: { type: Number, default: 0 },
    tax_deduction: { type: Number, default: 0 },
    final_salary: { type: Number, required: true, min: 0 },
    payment_date: { type: Date },
    payment_method: { type: String, enum: ["Cash", "Bank Transfer", "Cheque"], default: "Bank Transfer" },
    receipt_number: { type: String, required: true, unique: true },
    remarks: { type: String, trim: true },
    status: { type: String, enum: ["Draft", "Approved", "Paid"], default: "Draft" },
    calculation_type: { type: String, enum: ["Monthly", "Day Wise"], default: "Monthly" },
    generated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);


salaryPaymentSchema.index({ school_id: 1, teacher_id: 1, salary_period: 1 }, { unique: true });

const SalaryPayment: Model<ISalaryPayment> =
  mongoose.models.SalaryPayment || mongoose.model<ISalaryPayment>("SalaryPayment", salaryPaymentSchema);

export default SalaryPayment;
