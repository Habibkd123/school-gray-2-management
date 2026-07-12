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
    status: { type: String, enum: ["Active", "Inactive", "Archived"], default: "Active" },
  },
  { timestamps: true }
);

streamSchema.index({ school_id: 1, name: 1 }, { unique: true, name: "stream_school_name_unique_v1" });

const Stream: Model<IStream> =
  mongoose.models.Stream && mongoose.models.Stream.schema.paths.status?.options?.enum?.includes("Archived")
    ? (mongoose.models.Stream as Model<IStream>)
    : (() => {
        delete mongoose.models.Stream;
        if (mongoose.connection && (mongoose.connection as any).models && (mongoose.connection as any).models.Stream) {
          delete (mongoose.connection as any).models.Stream;
        }
        return mongoose.model<IStream>("Stream", streamSchema);
      })();

export default Stream;
