import mongoose, { Document, Model, Schema } from "mongoose";

export interface IStudent extends Document {
  school_id: mongoose.Types.ObjectId;
  user_id?: mongoose.Types.ObjectId;
  parent_id?: mongoose.Types.ObjectId;
  class_id: mongoose.Types.ObjectId;
  name: string;
  roll_no?: string;
  gender?: "male" | "female" | "other";
  dob?: Date;
  blood_group?: string;
  email?: string;
  photo_url?: string;
  address?: string;
  phone?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_relation?: string;
  guardian_email?: string;
  admission_date: Date;
  admission_no?: string;
  academic_year?: string;
  is_active: boolean;
  religion?: string;
  caste?: string;
  category?: string;
  mother_tongue?: string;
  languages?: string[];
  prev_school_name?: string;
  prev_school_address?: string;
  bank_name?: string;
  bank_branch?: string;
  bank_ifsc?: string;
  allergies?: string[];
  medications?: string[];
  medical_notes?: string;
  house?: string;
  medical_cert?: { name: string; url: string } | null;
  migration_cert?: { name: string; url: string } | null;
  transfer_cert?: { name: string; url: string } | null;
  birth_cert?: { name: string; url: string } | null;
  father_name?: string;
  father_phone?: string;
  father_email?: string;
  father_occupation?: string;
  father_photo?: string;
  mother_name?: string;
  mother_phone?: string;
  mother_email?: string;
  mother_occupation?: string;
  mother_photo?: string;
  guardian_type?: string;
  guardian_occupation?: string;
  guardian_address?: string;
  guardian_photo?: string;
  permanent_address?: string;
  other_info?: string;
  aadhaar_no?: string;
}

const studentSchema = new Schema<IStudent>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: "Parent", default: null },
    class_id: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    name: { type: String, required: true, trim: true },
    roll_no: { type: String, trim: true },
    gender: { type: String, enum: ["male", "female", "other"] },
    dob: { type: Date },
    blood_group: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    photo_url: { type: String, default: null },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    aadhaar_no: { type: String, trim: true },
    guardian_name: { type: String, trim: true },
    guardian_phone: { type: String, trim: true },
    guardian_relation: { type: String, trim: true },
    guardian_email: { type: String, lowercase: true, trim: true },
    father_name: { type: String, trim: true },
    father_phone: { type: String, trim: true },
    father_email: { type: String, lowercase: true, trim: true },
    father_occupation: { type: String, trim: true },
    father_photo: { type: String, default: null },
    mother_name: { type: String, trim: true },
    mother_phone: { type: String, trim: true },
    mother_email: { type: String, lowercase: true, trim: true },
    mother_occupation: { type: String, trim: true },
    mother_photo: { type: String, default: null },
    guardian_type: { type: String, trim: true },
    guardian_occupation: { type: String, trim: true },
    guardian_address: { type: String, trim: true },
    guardian_photo: { type: String, default: null },
    permanent_address: { type: String, trim: true },
    other_info: { type: String, trim: true },
    admission_date: { type: Date, default: Date.now },
    admission_no: { type: String, trim: true },
    academic_year: { type: String },
    is_active: { type: Boolean, default: true },
    religion: { type: String, trim: true },
    caste: { type: String, trim: true },
    category: { type: String, trim: true },
    mother_tongue: { type: String, trim: true },
    languages: [{ type: String, trim: true }],
    prev_school_name: { type: String, trim: true },
    prev_school_address: { type: String, trim: true },
    bank_name: { type: String, trim: true },
    bank_branch: { type: String, trim: true },
    bank_ifsc: { type: String, trim: true },
    allergies: [{ type: String, trim: true }],
    medications: [{ type: String, trim: true }],
    medical_notes: { type: String, trim: true },
    house: { type: String, trim: true },
    medical_cert: { type: { name: String, url: String }, default: null },
    migration_cert: { type: { name: String, url: String }, default: null },
    transfer_cert: { type: { name: String, url: String }, default: null },
    birth_cert: { type: { name: String, url: String }, default: null },
  },
  { timestamps: true }
);

studentSchema.index({ school_id: 1, class_id: 1, roll_no: 1 });
studentSchema.index({ school_id: 1, name: 1 });
studentSchema.index({ name: 1 });
studentSchema.index({ parent_id: 1 });
studentSchema.index({ user_id: 1 });

const Student: Model<IStudent> =
  mongoose.models.Student || mongoose.model<IStudent>("Student", studentSchema);

export default Student;
