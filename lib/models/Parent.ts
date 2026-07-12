import mongoose, { Document, Model, Schema } from "mongoose";

export interface IParent extends Document {
  school_id: mongoose.Types.ObjectId;
  user_id?: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;
  relation?: string;
  photo_url?: string;
  occupation?: string;
  address?: string;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const parentSchema = new Schema<IParent>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    relation: { type: String, trim: true },
    photo_url: { type: String, default: null },
    occupation: { type: String, trim: true },
    address: { type: String, trim: true },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

parentSchema.index({ school_id: 1, name: 1 }, { name: "parent_school_name_v1" });
parentSchema.index({ email: 1 }, { name: "parent_email_v1" });
parentSchema.index({ phone: 1 }, { name: "parent_phone_v1" });
parentSchema.index({ user_id: 1 }, { name: "parent_user_id_v1" });

const Parent: Model<IParent> =
  mongoose.models.Parent || mongoose.model<IParent>("Parent", parentSchema);

export default Parent;
