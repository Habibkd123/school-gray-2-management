import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISection extends Document {
  school_id: mongoose.Types.ObjectId;
  name: string;
  status: "Active" | "Inactive";
  createdAt: Date;
  updatedAt: Date;
}

const sectionSchema = new Schema<ISection>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

sectionSchema.index({ school_id: 1, name: 1 }, { unique: true });

const Section: Model<ISection> =
  mongoose.models.Section || mongoose.model<ISection>("Section", sectionSchema);

export default Section;
