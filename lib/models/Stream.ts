import mongoose, { Document, Model, Schema } from "mongoose";

export interface IStream extends Document {
  school_id: mongoose.Types.ObjectId;
  name: string;
  status: "Active" | "Inactive";
  createdAt: Date;
  updatedAt: Date;
}

const streamSchema = new Schema<IStream>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

streamSchema.index({ school_id: 1, name: 1 }, { unique: true });

const Stream: Model<IStream> =
  mongoose.models.Stream || mongoose.model<IStream>("Stream", streamSchema);

export default Stream;
