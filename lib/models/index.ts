import mongoose, { Document, Model, Schema } from "mongoose";
// Ensure Class model is registered before any schema that uses ref: "Class"
import Class from "./Class";
export { Class };

// ─── Subject ──────────────────────────────────────────────────────
export interface ISubject extends Document {
  school_id: mongoose.Types.ObjectId;
  class_id: mongoose.Types.ObjectId;
  name: string;
  code?: string;
  type: "theory" | "practical" | "both";
  full_marks: number;
  pass_marks: number;
}

const subjectSchema = new Schema<ISubject>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    class_id: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    type: { type: String, enum: ["theory", "practical", "both"], default: "theory" },
    full_marks: { type: Number, default: 100 },
    pass_marks: { type: Number, default: 33 },
  },
  { timestamps: true }
);

subjectSchema.index({ school_id: 1, class_id: 1, name: 1 }, { unique: true });

// ─── Teacher Assignment ─────────────────────────────────────────────
export interface ITeacherAssignment extends Document {
  school_id: mongoose.Types.ObjectId;
  academic_year: string;
  teacher_id: mongoose.Types.ObjectId;
  class_id: mongoose.Types.ObjectId;
  stream_id?: mongoose.Types.ObjectId;
  section_id?: mongoose.Types.ObjectId;
  subject_master_id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const teacherAssignmentSchema = new Schema<ITeacherAssignment>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    academic_year: { type: String, required: true, trim: true },
    teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    class_id: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    stream_id: { type: mongoose.Schema.Types.ObjectId, ref: "Stream", default: null },
    section_id: { type: mongoose.Schema.Types.ObjectId, ref: "Section", default: null },
    subject_master_id: { type: mongoose.Schema.Types.ObjectId, ref: "SubjectMaster", required: true },
  },
  { timestamps: true }
);

teacherAssignmentSchema.index(
  { school_id: 1, academic_year: 1, class_id: 1, stream_id: 1, section_id: 1, subject_master_id: 1 },
  { unique: true }
);

// ─── Syllabus ──────────────────────────────────────────────────────
export interface ISyllabusChapter {
  chapter_no: number;
  chapter_name: string;
  description?: string;
  start_date: Date;
  target_date: Date;
  status: "Not Started" | "In Progress" | "Completed";
}

export interface ISyllabus extends Document {
  school_id: mongoose.Types.ObjectId;
  teacher_assignment_id: mongoose.Types.ObjectId;
  chapters: ISyllabusChapter[];
  createdAt: Date;
  updatedAt: Date;
}

const syllabusChapterSchema = new Schema(
  {
    chapter_no: { type: Number, required: true },
    chapter_name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    start_date: { type: Date, required: true },
    target_date: { type: Date, required: true },
    status: { type: String, enum: ["Not Started", "In Progress", "Completed"], default: "Not Started" },
  },
  { _id: true }
);

const syllabusSchema = new Schema<ISyllabus>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    teacher_assignment_id: { type: mongoose.Schema.Types.ObjectId, ref: "TeacherAssignment", required: true, unique: true },
    chapters: [syllabusChapterSchema],
  },
  { timestamps: true }
);

// ─── Timetable ────────────────────────────────────────────────────
export interface ITimetable extends Document {
  school_id: mongoose.Types.ObjectId;
  class_id: mongoose.Types.ObjectId;
  subject_id: mongoose.Types.ObjectId;
  teacher_id: mongoose.Types.ObjectId;
  day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";
  start_time: string;
  end_time: string;
  period_no?: number;
  room?: string;
  academic_year?: string;
}

const timetableSchema = new Schema<ITimetable>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    class_id: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    subject_id: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    day: { type: String, enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"], required: true },
    start_time: { type: String, required: true },
    end_time: { type: String, required: true },
    period_no: { type: Number },
    room: { type: String, trim: true },
    academic_year: { type: String },
  },
  { timestamps: true }
);

// ─── Attendance ───────────────────────────────────────────────────
const attendanceRecordSchema = new Schema(
  {
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    status: { type: String, enum: ["present", "absent", "leave", "late", "half_day", "holiday"], required: true },
    note: { type: String, trim: true, default: null },
  },
  { _id: false }
);

export interface IAttendance extends Document {
  school_id: mongoose.Types.ObjectId;
  academic_year: string;
  class_id?: mongoose.Types.ObjectId;
  stream_id?: mongoose.Types.ObjectId;
  section_id?: mongoose.Types.ObjectId;
  marked_by: mongoose.Types.ObjectId;
  date: Date;
  type: "student" | "teacher";
  records: Array<{ student_id?: mongoose.Types.ObjectId; teacher_id?: mongoose.Types.ObjectId; status: string; note?: string }>;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    academic_year: { type: String, required: true },
    class_id: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: function (this: any) { return this.type === "student"; } },
    stream_id: { type: mongoose.Schema.Types.ObjectId, ref: "Stream", default: null },
    section_id: { type: mongoose.Schema.Types.ObjectId, ref: "Section", default: null },
    marked_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    type: { type: String, enum: ["student", "teacher"], default: "student" },
    records: [attendanceRecordSchema],
  },
  { timestamps: true }
);

attendanceSchema.index(
  { school_id: 1, academic_year: 1, class_id: 1, stream_id: 1, section_id: 1, date: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: "student" } }
);

attendanceSchema.index(
  { school_id: 1, academic_year: 1, date: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: "teacher" } }
);

// ─── Homework ─────────────────────────────────────────────────────
export interface IHomework extends Document {
  school_id: mongoose.Types.ObjectId;
  class_id: mongoose.Types.ObjectId;
  subject_id: mongoose.Types.ObjectId;
  teacher_id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  assigned_date: Date;
  due_date: Date;
  attachment_url?: string;
  submissions: Array<{
    student_id: mongoose.Types.ObjectId;
    content: string;
    submitted_at: Date;
    grade?: string;
    feedback?: string;
  }>;
}

const homeworkSubmissionSchema = new Schema(
  {
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    content: { type: String, required: true },
    submitted_at: { type: Date, default: Date.now },
    grade: { type: String, default: null },
    feedback: { type: String, default: null },
  },
  { _id: false }
);

const homeworkSchema = new Schema<IHomework>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    class_id: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    subject_id: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    assigned_date: { type: Date, default: Date.now },
    due_date: { type: Date, required: true },
    attachment_url: { type: String, default: null },
    submissions: [homeworkSubmissionSchema],
  },
  { timestamps: true }
);

// ─── Notice ───────────────────────────────────────────────────────
export interface INotice extends Document {
  school_id: mongoose.Types.ObjectId;
  created_by: mongoose.Types.ObjectId;
  title: string;
  content: string;
  target_audience: "all" | "students" | "teachers" | "parents" | "staff" | "librarian" | "accountant";
  target_classes?: mongoose.Types.ObjectId[];
  is_published: boolean;
  publish_date: Date;
  expiry_date?: Date;
  attachment_url?: string;
}

const noticeSchema = new Schema<INotice>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    target_audience: { type: String, enum: ["all", "students", "teachers", "parents", "staff", "librarian", "accountant", "target_audience"], default: "all" },
    target_classes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
    is_published: { type: Boolean, default: true },
    publish_date: { type: Date, default: Date.now },
    expiry_date: { type: Date, default: null },
    attachment_url: { type: String, default: null },
  },
  { timestamps: true }
);

// ─── Fees ─────────────────────────────────────────────────────────
export interface IFeesStructure extends Document {
  school_id: mongoose.Types.ObjectId;
  class_id: mongoose.Types.ObjectId;
  name: string;
  amount: number;
  frequency: "monthly" | "quarterly" | "half_yearly" | "annually" | "one_time";
  due_day: number;
  late_fee: number;
  academic_year: string;
  is_active: boolean;
}

const feesStructureSchema = new Schema<IFeesStructure>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    class_id: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    frequency: { type: String, enum: ["monthly", "quarterly", "half_yearly", "annually", "one_time"], default: "monthly" },
    due_day: { type: Number, min: 1, max: 31, default: 10 },
    late_fee: { type: Number, default: 0 },
    academic_year: { type: String, required: true },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);



// ─── Grade ─────────────────────────────────────────────────────────
export interface IGrade extends Document {
  school_id: mongoose.Types.ObjectId;
  grade_name: string;
  marks_from: number;
  marks_upto: number;
  grade_points: number;
  status: "Active" | "Inactive";
  description?: string;
}

const gradeSchema = new Schema<IGrade>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    grade_name: { type: String, required: true, trim: true },
    marks_from: { type: Number, required: true },
    marks_upto: { type: Number, required: true },
    grade_points: { type: Number, required: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

gradeSchema.index({ school_id: 1, grade_name: 1 }, { unique: true });

// ─── Holiday ───────────────────────────────────────────────────────
export interface IHoliday extends Document {
  school_id: mongoose.Types.ObjectId;
  display_id: string;
  title: string;
  date: Date;
  description?: string;
  status: "Active" | "Inactive";
}

const holidaySchema = new Schema<IHoliday>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    display_id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

holidaySchema.index({ school_id: 1, title: 1, date: 1 }, { unique: true });

// ─── Leave Type ────────────────────────────────────────────────────
export interface ILeaveType extends Document {
  school_id: mongoose.Types.ObjectId;
  leave_type: string;
  status: "Active" | "Inactive";
}

const leaveTypeSchema = new Schema<ILeaveType>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    leave_type: { type: String, required: true, trim: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

leaveTypeSchema.index({ school_id: 1, leave_type: 1 }, { unique: true });

// ─── Exam & Result ────────────────────────────────────────────────
export interface IExam extends Document {
  school_id: mongoose.Types.ObjectId;
  class_id: mongoose.Types.ObjectId;
  name: string;
  type: "unit_test" | "mid_term" | "pre_board" | "annual" | "other";
  academic_year: string;
  start_date?: Date;
  end_date?: Date;
  is_published: boolean;
}

const examSchema = new Schema<IExam>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    class_id: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["unit_test", "mid_term", "pre_board", "annual", "other"], default: "other" },
    academic_year: { type: String, required: true },
    start_date: { type: Date },
    end_date: { type: Date },
    is_published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export interface IResult extends Document {
  school_id: mongoose.Types.ObjectId;
  exam_id: mongoose.Types.ObjectId;
  student_id: mongoose.Types.ObjectId;
  subject_id: mongoose.Types.ObjectId;
  marks_obtained: number;
  total_marks: number;
  passing_marks?: number;
  grade?: string;
  is_pass?: boolean;
  remarks?: string;
  entered_by?: mongoose.Types.ObjectId;
}

const resultSchema = new Schema<IResult>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    exam_id: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    subject_id: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    marks_obtained: { type: Number, required: true, min: 0 },
    total_marks: { type: Number, required: true },
    passing_marks: { type: Number },
    grade: { type: String, trim: true },
    is_pass: { type: Boolean },
    remarks: { type: String, trim: true },
    entered_by: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
  },
  { timestamps: true }
);

resultSchema.index({ school_id: 1, exam_id: 1, student_id: 1, subject_id: 1 }, { unique: true });

// ─── Leave Request ────────────────────────────────────────────────
export interface ILeaveRequest extends Document {
  school_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  leave_type: "sick" | "casual" | "emergency" | "other";
  from_date: Date;
  to_date: Date;
  total_days?: number;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  approved_by?: mongoose.Types.ObjectId;
  approved_at?: Date;
  admin_note?: string;
}

const leaveRequestSchema = new Schema<ILeaveRequest>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    leave_type: { type: String, enum: ["sick", "casual", "emergency", "other"], required: true },
    from_date: { type: Date, required: true },
    to_date: { type: Date, required: true },
    total_days: { type: Number },
    reason: { type: String, trim: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approved_at: { type: Date, default: null },
    admin_note: { type: String, trim: true },
  },
  { timestamps: true }
);

// ─── Room ─────────────────────────────────────────────────────────
export interface IRoom extends Document {
  school_id: mongoose.Types.ObjectId;
  room_no: string;
  capacity: number;
  is_active: boolean;
}

const roomSchema = new Schema<IRoom>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    room_no: { type: String, required: true, trim: true },
    capacity: { type: Number, default: 40 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

roomSchema.index({ school_id: 1, room_no: 1 }, { unique: true });

// ─── Export all models (with cache check for Next.js hot reload) ──
export const Subject: Model<ISubject> = mongoose.models.Subject || mongoose.model("Subject", subjectSchema);
export const TeacherAssignment: Model<ITeacherAssignment> = mongoose.models.TeacherAssignment || mongoose.model("TeacherAssignment", teacherAssignmentSchema);
export const Syllabus: Model<ISyllabus> =
  mongoose.models.Syllabus && Object.keys(mongoose.models.Syllabus.schema.paths).includes("teacher_assignment_id")
    ? (mongoose.models.Syllabus as Model<ISyllabus>)
    : (() => {
        delete mongoose.models.Syllabus;
        return mongoose.model<ISyllabus>("Syllabus", syllabusSchema);
      })();
export const Timetable: Model<ITimetable> = mongoose.models.Timetable || mongoose.model("Timetable", timetableSchema);
export const Attendance: Model<IAttendance> = mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);
export const Homework: Model<IHomework> = mongoose.models.Homework || mongoose.model("Homework", homeworkSchema);
export const Notice: Model<INotice> = mongoose.models.Notice || mongoose.model("Notice", noticeSchema);
export const FeesStructure: Model<IFeesStructure> = mongoose.models.FeesStructure || mongoose.model("FeesStructure", feesStructureSchema);

export const Exam: Model<IExam> = mongoose.models.Exam || mongoose.model("Exam", examSchema);
export const Result: Model<IResult> = mongoose.models.Result || mongoose.model("Result", resultSchema);
export const LeaveRequest: Model<ILeaveRequest> = mongoose.models.LeaveRequest || mongoose.model("LeaveRequest", leaveRequestSchema);
export const Room: Model<IRoom> = mongoose.models.Room || mongoose.model("Room", roomSchema);
export const Grade: Model<IGrade> = mongoose.models.Grade || mongoose.model("Grade", gradeSchema);
export const Holiday: Model<IHoliday> = mongoose.models.Holiday || mongoose.model("Holiday", holidaySchema);
export const LeaveType: Model<ILeaveType> = mongoose.models.LeaveType || mongoose.model("LeaveType", leaveTypeSchema);
export const Parent: Model<any> = mongoose.models.Parent || require("./Parent").default;

// ─── Subject Master (school-scoped catalog) ────────────────────────
export interface ISubjectMaster extends Document {
  school_id: mongoose.Types.ObjectId;
  name: string;
  subject_code?: string;
  description?: string;
  status: "Active" | "Inactive";
  createdAt: Date;
  updatedAt: Date;
}

const subjectMasterSchema = new Schema<ISubjectMaster>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    name: { type: String, required: true, trim: true },
    subject_code: { type: String, trim: true, uppercase: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

subjectMasterSchema.index({ school_id: 1, name: 1 }, { unique: true });

export const SubjectMaster: Model<ISubjectMaster> =
  mongoose.models.SubjectMaster || mongoose.model<ISubjectMaster>("SubjectMaster", subjectMasterSchema);

// ─── Subject Assignment (Class + optional Stream → Subject) ────────
export interface ISubjectAssignment extends Document {
  school_id: mongoose.Types.ObjectId;
  academic_year: string;
  class_id: mongoose.Types.ObjectId;
  stream_id?: mongoose.Types.ObjectId;
  subject_master_id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const subjectAssignmentSchema = new Schema<ISubjectAssignment>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    academic_year: { type: String, required: true },
    class_id: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    stream_id: { type: mongoose.Schema.Types.ObjectId, ref: "Stream", default: null },
    subject_master_id: { type: mongoose.Schema.Types.ObjectId, ref: "SubjectMaster", required: true },
  },
  { timestamps: true }
);

// Prevent duplicate assignments
subjectAssignmentSchema.index(
  { school_id: 1, academic_year: 1, class_id: 1, stream_id: 1, subject_master_id: 1 },
  { unique: true }
);

export const SubjectAssignment: Model<ISubjectAssignment> =
  mongoose.models.SubjectAssignment || mongoose.model<ISubjectAssignment>("SubjectAssignment", subjectAssignmentSchema);


// ─── Transport Management ─────────────────────────────────────────
export interface IBus extends Document {
  school_id: mongoose.Types.ObjectId;
  busNumber: string;
  busModel: string;
  driverName: string;
  driverPhone: string;
  capacity: number;
  assignedRoute: string;
  status: "Active" | "Inactive";
  registrationNo: string;
}

const busSchema = new Schema<IBus>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    busNumber: { type: String, required: true, trim: true },
    busModel: { type: String, trim: true },
    driverName: { type: String, trim: true },
    driverPhone: { type: String, trim: true },
    capacity: { type: Number, required: true, default: 40 },
    assignedRoute: { type: String, default: "Not Assigned" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    registrationNo: { type: String, trim: true },
  },
  { timestamps: true }
);

busSchema.index({ school_id: 1, busNumber: 1 }, { unique: true });

export interface IRoute extends Document {
  school_id: mongoose.Types.ObjectId;
  routeName: string;
  startPoint: string;
  endPoint: string;
  stops: Array<{ name: string; time: string }>;
  assignedBus: string;
  morningTime: string;
  eveningTime: string;
  status: "Active" | "Inactive";
}

const routeSchema = new Schema<IRoute>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    routeName: { type: String, required: true, trim: true },
    startPoint: { type: String, trim: true },
    endPoint: { type: String, trim: true },
    stops: [{ name: String, time: String }],
    assignedBus: { type: String, default: "Not Assigned" },
    morningTime: { type: String, trim: true },
    eveningTime: { type: String, trim: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

routeSchema.index({ school_id: 1, routeName: 1 }, { unique: true });

export interface ITransportAllocation extends Document {
  school_id: mongoose.Types.ObjectId;
  student_id: mongoose.Types.ObjectId;
  route_id: mongoose.Types.ObjectId;
  bus_id: mongoose.Types.ObjectId;
  pickupStop: string;
  status: "Active" | "Inactive";
}

const transportAllocationSchema = new Schema<ITransportAllocation>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    route_id: { type: mongoose.Schema.Types.ObjectId, ref: "Route", required: true },
    bus_id: { type: mongoose.Schema.Types.ObjectId, ref: "Bus", required: true },
    pickupStop: { type: String, trim: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

transportAllocationSchema.index({ school_id: 1, student_id: 1 }, { unique: true });

export const Bus: Model<IBus> = mongoose.models.Bus || mongoose.model("Bus", busSchema);
export const Route: Model<IRoute> = mongoose.models.Route || mongoose.model("Route", routeSchema);
export const TransportAllocation: Model<ITransportAllocation> = mongoose.models.TransportAllocation || mongoose.model("TransportAllocation", transportAllocationSchema);

// ─── FEES MANAGEMENT ──────────────────────────────────────────────

export interface IFeeGroup extends Document {
  school_id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const feeGroupSchema = new Schema<IFeeGroup>({
  school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
}, { timestamps: true });

export interface IFeeType extends Document {
  school_id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const feeTypeSchema = new Schema<IFeeType>({
  school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
}, { timestamps: true });

export interface IFeeMaster extends Document {
  school_id: mongoose.Types.ObjectId;
  fee_group_id: mongoose.Types.ObjectId;
  fee_type_id: mongoose.Types.ObjectId;
  amount: number;
  due_date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const feeMasterSchema = new Schema<IFeeMaster>({
  school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
  fee_group_id: { type: mongoose.Schema.Types.ObjectId, ref: "FeeGroup", required: true },
  fee_type_id: { type: mongoose.Schema.Types.ObjectId, ref: "FeeType", required: true },
  amount: { type: Number, required: true, min: 0 },
  due_date: { type: Date, required: true },
}, { timestamps: true });

export interface IFeeAllocation extends Document {
  school_id: mongoose.Types.ObjectId;
  student_id: mongoose.Types.ObjectId;
  fee_group_id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const feeAllocationSchema = new Schema<IFeeAllocation>({
  school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  fee_group_id: { type: mongoose.Schema.Types.ObjectId, ref: "FeeGroup", required: true },
}, { timestamps: true });

// Prevent duplicate assignment of the same group to the same student
feeAllocationSchema.index({ student_id: 1, fee_group_id: 1 }, { unique: true });

export interface IFeePayment extends Document {
  school_id: mongoose.Types.ObjectId;
  student_id: mongoose.Types.ObjectId;
  fee_master_id: mongoose.Types.ObjectId;
  amount_paid: number;
  payment_method: "Cash" | "Cheque" | "Bank Transfer" | "Online";
  transaction_date: Date;
  receipt_number: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const feePaymentSchema = new Schema<IFeePayment>({
  school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  fee_master_id: { type: mongoose.Schema.Types.ObjectId, ref: "FeeMaster", required: true },
  amount_paid: { type: Number, required: true, min: 1 },
  payment_method: { type: String, enum: ["Cash", "Cheque", "Bank Transfer", "Online"], required: true },
  transaction_date: { type: Date, default: Date.now },
  receipt_number: { type: String, required: true, unique: true },
  remarks: { type: String, trim: true },
}, { timestamps: true });

export const FeeGroup: Model<IFeeGroup> = mongoose.models.FeeGroup || mongoose.model("FeeGroup", feeGroupSchema);
export const FeeType: Model<IFeeType> = mongoose.models.FeeType || mongoose.model("FeeType", feeTypeSchema);
export const FeeMaster: Model<IFeeMaster> = mongoose.models.FeeMaster || mongoose.model("FeeMaster", feeMasterSchema);
export const FeeAllocation: Model<IFeeAllocation> = mongoose.models.FeeAllocation || mongoose.model("FeeAllocation", feeAllocationSchema);
export const FeePayment: Model<IFeePayment> = mongoose.models.FeePayment || mongoose.model("FeePayment", feePaymentSchema);
export const RolePermission: Model<any> = mongoose.models.RolePermission || require("./RolePermission").default;
