import mongoose, { Document, Model, Schema } from "mongoose";

export interface IWhatsAppLog extends Document {
  school_id: mongoose.Types.ObjectId;
  student_id?: mongoose.Types.ObjectId | null;
  recipient_phone: string;
  recipient_name: string;
  recipient_type: "parent" | "student" | "teacher" | "staff" | "other";
  event_type:
    | "attendance_absent"
    | "attendance_late"
    | "fee_payment"
    | "fee_due_reminder"
    | "notice_broadcast"
    | "custom";
  message: string;
  provider: "meta_cloud" | "twilio" | "mock";
  provider_message_id?: string;
  status: "sent" | "delivered" | "failed" | "simulated";
  error_message?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const whatsAppLogSchema = new Schema<IWhatsAppLog>(
  {
    school_id: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    student_id: { type: Schema.Types.ObjectId, ref: "Student", index: true },
    recipient_phone: { type: String, required: true, trim: true, index: true },
    recipient_name: { type: String, required: true, trim: true },
    recipient_type: {
      type: String,
      enum: ["parent", "student", "teacher", "staff", "other"],
      default: "parent",
    },
    event_type: {
      type: String,
      enum: [
        "attendance_absent",
        "attendance_late",
        "fee_payment",
        "fee_due_reminder",
        "notice_broadcast",
        "custom",
      ],
      required: true,
      index: true,
    },
    message: { type: String, required: true },
    provider: { type: String, enum: ["meta_cloud", "twilio", "mock"], default: "mock" },
    provider_message_id: { type: String },
    status: {
      type: String,
      enum: ["sent", "delivered", "failed", "simulated"],
      default: "sent",
      index: true,
    },
    error_message: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

whatsAppLogSchema.index({ school_id: 1, createdAt: -1 });

const WhatsAppLog: Model<IWhatsAppLog> =
  mongoose.models.WhatsAppLog || mongoose.model<IWhatsAppLog>("WhatsAppLog", whatsAppLogSchema);

export default WhatsAppLog;
