import mongoose, { Document, Model, Schema } from "mongoose";

export type DocumentType =
  | "report_card"
  | "fee_receipt"
  | "salary_slip"
  | "bonafide"
  | "transfer_cert"
  | "character_cert"
  | "appointment_letter"
  | "experience_letter"
  | "circular"
  | "notice"
  | "custom";

export type ReferenceModule =
  | "exam"
  | "fees"
  | "salary"
  | "student"
  | "teacher"
  | "school"
  | "custom";

export type GeneratedDocStatus = "pending" | "generated" | "failed";

export interface IGeneratedDocument extends Document {
  school_id: mongoose.Types.ObjectId;
  document_type: DocumentType;
  template_id: string;               // template store ID (from local store or DB future)
  title: string;                     // human-readable title
  generated_by: mongoose.Types.ObjectId; // User who triggered generation
  generated_for?: mongoose.Types.ObjectId; // Optional: student / teacher ID
  generated_for_name?: string;       // Denormalized name for quick display
  reference_module: ReferenceModule;
  reference_id?: string;             // Source record ID (payment._id, exam._id, etc.)
  variable_snapshot: Record<string, string>; // Resolved values at generation time
  pdf_url?: string;                  // Future: if we store PDF in object storage
  status: GeneratedDocStatus;
  is_downloaded: boolean;
  is_printed: boolean;
  bulk_batch_id?: string;            // Groups a class-wide bulk generation together
  pages: number;                     // Page count (from builder)
  createdAt: Date;
  updatedAt: Date;
}

const generatedDocumentSchema = new Schema<IGeneratedDocument>(
  {
    school_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    document_type: {
      type: String,
      enum: [
        "report_card", "fee_receipt", "salary_slip", "bonafide",
        "transfer_cert", "character_cert", "appointment_letter",
        "experience_letter", "circular", "notice", "custom",
      ],
      required: true,
    },
    template_id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    generated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    generated_for: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    generated_for_name: { type: String, trim: true, default: "" },
    reference_module: {
      type: String,
      enum: ["exam", "fees", "salary", "student", "teacher", "school", "custom"],
      required: true,
    },
    reference_id: { type: String, default: null },
    variable_snapshot: { type: Map, of: String, default: {} },
    pdf_url: { type: String, default: null },
    status: {
      type: String,
      enum: ["pending", "generated", "failed"],
      default: "generated",
    },
    is_downloaded: { type: Boolean, default: false },
    is_printed:    { type: Boolean, default: false },
    bulk_batch_id: { type: String, default: null },
    pages: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// Indexes for common queries
generatedDocumentSchema.index({ school_id: 1, document_type: 1, createdAt: -1 });
generatedDocumentSchema.index({ school_id: 1, generated_for: 1, createdAt: -1 });
generatedDocumentSchema.index({ school_id: 1, reference_module: 1, createdAt: -1 });
generatedDocumentSchema.index({ school_id: 1, bulk_batch_id: 1 });
generatedDocumentSchema.index({ school_id: 1, generated_by: 1, createdAt: -1 });

export const GeneratedDocument: Model<IGeneratedDocument> =
  mongoose.models.GeneratedDocument ||
  mongoose.model<IGeneratedDocument>("GeneratedDocument", generatedDocumentSchema);

export default GeneratedDocument;
