import mongoose, { Document, Model, Schema } from "mongoose";

// ─── Academic Config Sub-document ─────────────────────────────────
export interface IAcademicConfig {
  enable_streams: boolean;
  enable_sections: boolean;
}

// ─── School Interface ──────────────────────────────────────────────
export interface ISchool extends Document {
  name: string;
  slug: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone: string;
  is_active: boolean;
  academic_config: IAcademicConfig;
  createdAt: Date;
  updatedAt: Date;
}

const academicConfigSchema = new Schema<IAcademicConfig>(
  {
    enable_streams: { type: Boolean, default: false },
    enable_sections: { type: Boolean, default: false },
  },
  { _id: false }
);

const schoolSchema = new Schema<ISchool>(
  {
    name: { type: String, required: [true, "School name is required"], trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logo_url: { type: String, default: null },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    timezone: { type: String, default: "Asia/Kolkata" },
    is_active: { type: Boolean, default: true },
    academic_config: { type: academicConfigSchema, default: () => ({ enable_streams: false, enable_sections: false }) },
  },
  { timestamps: true }
);

const School: Model<ISchool> =
  mongoose.models.School || mongoose.model<ISchool>("School", schoolSchema);

export default School;
