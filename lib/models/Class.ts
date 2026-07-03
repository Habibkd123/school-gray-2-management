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
  /** Numeric ordering weight: Nursery=1, LKG=2, UKG=3, Class 1=11 … Class 12=22, others=100 */
  sort_weight: number;
}

/**
 * Compute a numeric sort weight from a class name so MongoDB can sort
 * records at the DB level instead of loading everything into Node.js memory.
 *
 * Nursery=1, LKG=2, UKG=3, Class 1=11…Class 12=22, others=100
 */
export function computeSortWeight(name: string): number {
  const n = (name || "").toLowerCase().trim();
  if (n.startsWith("nursery")) return 1;
  if (n.startsWith("lkg"))     return 2;
  if (n.startsWith("ukg"))     return 3;
  const m = n.match(/(?:class\s+|grade\s+|std\s+)?(\d+)/);
  if (m) return 10 + parseInt(m[1], 10); // Class 1 → 11, Class 12 → 22
  return 100;
}

const classSchema = new Schema<IClass>(
  {
    school_id:        { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    name:             { type: String, required: true, trim: true },
    class_code:       { type: String, trim: true, uppercase: true },
    section:          { type: String, trim: true, default: "" },
    academic_year:    { type: String, required: true },
    class_teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", default: null },
    capacity:         { type: Number, default: 40 },
    status:           { type: String, enum: ["Active", "Inactive"], default: "Active" },
    sort_weight:      { type: Number, default: 100 },
  },
  { timestamps: true }
);

// Unique constraint on class identity
classSchema.index({ school_id: 1, name: 1, section: 1, academic_year: 1 }, { unique: true });
// Efficient DB-level ordering for list views
classSchema.index({ school_id: 1, sort_weight: 1, section: 1 });

const Class: Model<IClass> =
  mongoose.models.Class || mongoose.model<IClass>("Class", classSchema);

export default Class;
