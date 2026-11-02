import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISecurityOTP extends Document {
  school_id: mongoose.Types.ObjectId;
  purpose: "fee_collection" | "general_security";
  target_id?: string;
  otp_code: string;
  phone: string;
  metadata?: Record<string, any>;
  expires_at: Date;
  is_used: boolean;
  used_at?: Date;
  created_at: Date;
}

const securityOTPSchema = new Schema<ISecurityOTP>(
  {
    school_id: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    purpose: { type: String, required: true, default: "fee_collection" },
    target_id: { type: String, index: true },
    otp_code: { type: String, required: true },
    phone: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    expires_at: { type: Date, required: true, expires: 0 },
    is_used: { type: Boolean, default: false },
    used_at: { type: Date },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

securityOTPSchema.index({ school_id: 1, target_id: 1, is_used: 1 });

const SecurityOTP: Model<ISecurityOTP> =
  mongoose.models.SecurityOTP || mongoose.model<ISecurityOTP>("SecurityOTP", securityOTPSchema);

export default SecurityOTP;
