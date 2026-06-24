import mongoose, { Document, Model, Schema } from "mongoose";

export interface IClass extends Document {
  school_id: mongoose.Types.ObjectId;
  name: string;
  class_code?: string;
  section: string;
  academic_year: string;
  class_teacher_id?: mongoose.Types.ObjectId;
  capacity: number;
  status: "Active" | "Inactive";
}

const classSchema = new Schema<IClass>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    name: { type: String, required: true, trim: true },
    class_code: { type: String, trim: true, uppercase: true },
    section: { type: String, trim: true, default: "" },
    academic_year: { type: String, required: true },
    class_teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", default: null },
    capacity: { type: Number, default: 40 },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

classSchema.index({ school_id: 1, name: 1, section: 1, academic_year: 1 }, { unique: true });

const Class: Model<IClass> =
  mongoose.models.Class || mongoose.model<IClass>("Class", classSchema);

export default Class;
