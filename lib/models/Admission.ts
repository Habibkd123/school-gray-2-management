import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAdmission extends Document {
  school_id: mongoose.Types.ObjectId;
  application_no: string;
  status: "New" | "Under Review" | "Documents Pending" | "Interview Scheduled" | "Approved" | "Rejected" | "Admission Completed" | "Cancelled";
  academic_year: string;
  class_id: mongoose.Types.ObjectId;
  student_name: string;
  first_name?: string;
  last_name?: string;
  gender: "male" | "female" | "other";
  dob: Date;
  blood_group?: string;
  prev_school?: string;
  prev_class?: string;
  father_name?: string;
  mother_name?: string;
  guardian_name?: string;
  guardian_relation?: string;
  guardian_occupation?: string;
  phone: string;
  alt_phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pin_code?: string;
  emergency_contact?: string;
  remarks?: string;
  photo?: { name: string; url: string } | null;
  birth_certificate?: { name: string; url: string } | null;
  transfer_certificate?: { name: string; url: string } | null;
  aadhaar?: { name: string; url: string } | null;
  report_card?: { name: string; url: string } | null;
  other_documents?: { name: string; url: string } | null;
  rejection_reason?: string;
  interview_date?: Date;
  internal_notes: Array<{
    note: string;
    author: string;
    date: Date;
  }>;
  status_history: Array<{
    status: string;
    updated_by: string;
    date: Date;
    remarks?: string;
  }>;
  submission_date: Date;
  ip_address?: string;
}

const fileSubSchema = new Schema(
  {
    name: { type: String, trim: true },
    url: { type: String, trim: true },
  },
  { _id: false }
);

const admissionSchema = new Schema<IAdmission>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    application_no: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: [
        "New",
        "Under Review",
        "Documents Pending",
        "Interview Scheduled",
        "Approved",
        "Rejected",
        "Admission Completed",
        "Cancelled",
      ],
      default: "New",
      index: true,
    },
    academic_year: { type: String, required: true, index: true },
    class_id: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    student_name: { type: String, required: true, trim: true },
    first_name: { type: String, trim: true },
    last_name: { type: String, trim: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    dob: { type: Date, required: true },
    blood_group: { type: String, trim: true },
    prev_school: { type: String, trim: true },
    prev_class: { type: String, trim: true },
    father_name: { type: String, trim: true },
    mother_name: { type: String, trim: true },
    guardian_name: { type: String, trim: true },
    guardian_relation: { type: String, trim: true },
    guardian_occupation: { type: String, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    alt_phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true, index: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    pin_code: { type: String, trim: true },
    emergency_contact: { type: String, trim: true },
    remarks: { type: String, trim: true },
    photo: { type: fileSubSchema, default: null },
    birth_certificate: { type: fileSubSchema, default: null },
    transfer_certificate: { type: fileSubSchema, default: null },
    aadhaar: { type: fileSubSchema, default: null },
    report_card: { type: fileSubSchema, default: null },
    other_documents: { type: fileSubSchema, default: null },
    rejection_reason: { type: String, trim: true },
    interview_date: { type: Date, default: null },
    internal_notes: [
      {
        note: { type: String, required: true, trim: true },
        author: { type: String, required: true, trim: true },
        date: { type: Date, default: Date.now },
      },
    ],
    status_history: [
      {
        status: { type: String, required: true },
        updated_by: { type: String, required: true },
        date: { type: Date, default: Date.now },
        remarks: { type: String, trim: true },
      },
    ],
    submission_date: { type: Date, default: Date.now, index: true },
    ip_address: { type: String, trim: true },
  },
  { timestamps: true }
);

admissionSchema.index(
  { student_name: "text", first_name: "text", last_name: "text", application_no: "text", guardian_name: "text" },
  { name: "admission_text_search_v1" }
);

const Admission: Model<IAdmission> =
  mongoose.models.Admission || mongoose.model<IAdmission>("Admission", admissionSchema);

export default Admission;
