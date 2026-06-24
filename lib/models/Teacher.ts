import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITeacher extends Document {
  school_id: mongoose.Types.ObjectId;
  user_id?: mongoose.Types.ObjectId;
  class_id?: mongoose.Types.ObjectId;
  class_ids?: mongoose.Types.ObjectId[];
  name: string;
  employee_id?: string;
  gender?: "male" | "female" | "other";
  dob?: Date;
  phone?: string;
  email?: string;
  address?: string;
  photo_url?: string;
  blood_group?: string;
  qualification?: string;
  subject_specialization?: string;
  experience_years: number;
  join_date: Date;
  languages?: string[];
  training_details?: string[];
  aadhaar_front_url?: string;
  aadhaar_back_url?: string;
  is_active: boolean;

  // Family Info
  father_name?: string;
  mother_name?: string;
  marital_status?: string;

  // Previous Experience Info
  previous_school_name?: string;
  previous_school_address?: string;
  previous_school_phone?: string;

  // Additional Address
  permanent_address?: string;

  // Custom IDs
  pan_number?: string;
  notes?: string;

  // Payroll / Work Details
  epf_no?: string;
  basic_salary?: number;
  contract_type?: string;
  work_shift?: string;
  work_location?: string;
  date_of_leaving?: Date;

  // Leave Entitlements
  medical_leaves?: number;
  casual_leaves?: number;
  maternity_leaves?: number;
  sick_leaves?: number;

  // Bank Info
  account_name?: string;
  account_number?: string;
  bank_name?: string;
  ifsc_code?: string;
  branch_name?: string;

  // Transport Info
  transport_route?: string;
  transport_vehicle?: string;
  transport_pickup_point?: string;

  // Hostel Info
  hostel_name?: string;
  hostel_room_no?: string;

  // Social Links
  facebook_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
  youtube_url?: string;
  twitter_url?: string;

  // File Uploads
  resume_url?: string;
  joining_letter_url?: string;
}

const teacherSchema = new Schema<ITeacher>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    class_id: { type: mongoose.Schema.Types.ObjectId, ref: "Class", default: null },
    class_ids: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }], default: [] },
    name: { type: String, required: true, trim: true },
    employee_id: { type: String, trim: true },
    gender: { type: String, enum: ["male", "female", "other"] },
    dob: { type: Date },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },
    photo_url: { type: String, default: null },
    blood_group: { type: String, trim: true },
    qualification: { type: String, trim: true },
    subject_specialization: { type: String, trim: true },
    experience_years: { type: Number, default: 0 },
    join_date: { type: Date, default: Date.now },
    languages: { type: [String], default: [] },
    training_details: { type: [String], default: [] },
    aadhaar_front_url: { type: String, trim: true },
    aadhaar_back_url: { type: String, trim: true },
    is_active: { type: Boolean, default: true },

    // Family Info
    father_name: { type: String, trim: true },
    mother_name: { type: String, trim: true },
    marital_status: { type: String, trim: true },

    // Previous Experience Info
    previous_school_name: { type: String, trim: true },
    previous_school_address: { type: String, trim: true },
    previous_school_phone: { type: String, trim: true },

    // Additional Address
    permanent_address: { type: String, trim: true },

    // Custom IDs
    pan_number: { type: String, trim: true },
    notes: { type: String, trim: true },

    // Payroll / Work Details
    epf_no: { type: String, trim: true },
    basic_salary: { type: Number, default: 0 },
    contract_type: { type: String, trim: true },
    work_shift: { type: String, trim: true },
    work_location: { type: String, trim: true },
    date_of_leaving: { type: Date },

    // Leave Entitlements
    medical_leaves: { type: Number, default: 10 },
    casual_leaves: { type: Number, default: 12 },
    maternity_leaves: { type: Number, default: 10 },
    sick_leaves: { type: Number, default: 10 },

    // Bank Info
    account_name: { type: String, trim: true },
    account_number: { type: String, trim: true },
    bank_name: { type: String, trim: true },
    ifsc_code: { type: String, trim: true },
    branch_name: { type: String, trim: true },

    // Transport Info
    transport_route: { type: String, trim: true },
    transport_vehicle: { type: String, trim: true },
    transport_pickup_point: { type: String, trim: true },

    // Hostel Info
    hostel_name: { type: String, trim: true },
    hostel_room_no: { type: String, trim: true },

    // Social Links
    facebook_url: { type: String, trim: true },
    instagram_url: { type: String, trim: true },
    linkedin_url: { type: String, trim: true },
    youtube_url: { type: String, trim: true },
    twitter_url: { type: String, trim: true },

    // File Uploads
    resume_url: { type: String, default: null },
    joining_letter_url: { type: String, default: null },
  },
  { timestamps: true }
);

teacherSchema.index({ school_id: 1, employee_id: 1 }, { unique: true, sparse: true });

if (mongoose.models && mongoose.models.Teacher) {
  const registeredSchema = mongoose.models.Teacher.schema;
  if (!registeredSchema.paths.class_ids) {
    delete mongoose.models.Teacher;
    if ((mongoose.connection as any).models && (mongoose.connection as any).models.Teacher) {
      delete (mongoose.connection as any).models.Teacher;
    }
  }
}

const Teacher: Model<ITeacher> =
  mongoose.models.Teacher || mongoose.model<ITeacher>("Teacher", teacherSchema);

export default Teacher;
