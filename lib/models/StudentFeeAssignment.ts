import mongoose, { Document, Schema, Model } from "mongoose";

export interface IStudentFeeItem {
  name: string;
  amount: number;
  frequency?: "One Time" | "Monthly" | "Quarterly" | "Half Yearly" | "Yearly";
  is_mandatory?: boolean;
  is_enabled: boolean;
}

export interface IStudentFeeAssignment extends Document {
  school_id: mongoose.Types.ObjectId;
  student_id: mongoose.Types.ObjectId;
  academic_year: string;
  fee_types: IStudentFeeItem[];
  total_amount: number;
  createdAt: Date;
  updatedAt: Date;
}

const studentFeeAssignmentSchema = new Schema<IStudentFeeAssignment>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, unique: true },
    academic_year: { type: String, required: true },
    fee_types: [
      {
        name: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
        frequency: { type: String, enum: ["One Time", "Monthly", "Quarterly", "Half Yearly", "Yearly"], default: "Monthly" },
        is_mandatory: { type: Boolean, default: true },
        is_enabled: { type: Boolean, default: true },
      },
    ],
    total_amount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

// Student fee ledger: "show fee assignment for student X in year Y"
studentFeeAssignmentSchema.index({ school_id: 1, student_id: 1, academic_year: 1 }, { name: "fee_assignment_school_student_year_v1" });
// Year-level listing for fee reports
studentFeeAssignmentSchema.index({ school_id: 1, academic_year: 1 }, { name: "fee_assignment_school_year_v1" });

const StudentFeeAssignment: Model<IStudentFeeAssignment> =
  mongoose.models.StudentFeeAssignment || mongoose.model<IStudentFeeAssignment>("StudentFeeAssignment", studentFeeAssignmentSchema);
export default StudentFeeAssignment;

