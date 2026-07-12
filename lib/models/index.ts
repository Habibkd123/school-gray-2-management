import mongoose, { Document, Model, Schema } from "mongoose";
// Ensure Class model is registered before any schema that uses ref: "Class"
import Class from "./Class";
import Student from "./Student";
import _Parent from "./Parent";
import School from "./School";
import User from "./User";
import Stream from "./Stream";
import Section from "./Section";
import Teacher from "./Teacher";
import LandingContent from "./LandingContent";
import GeneratedDocument from "./GeneratedDocument";
import Admission from "./Admission";

export { Class, Student, School, User, Stream, Section, Teacher, LandingContent, GeneratedDocument, Admission };

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

subjectSchema.index({ school_id: 1, class_id: 1, name: 1 }, { unique: true, name: "subject_school_class_name_unique_v1" });

// ─── Class Group ───────────────────────────────────────────────────
export interface IClassGroup extends Document {
  school_id: mongoose.Types.ObjectId;
  name: string;
  academic_year: string;
  classes: Array<{
    class_id: mongoose.Types.ObjectId;
    stream_id?: mongoose.Types.ObjectId | null;
    section_id?: mongoose.Types.ObjectId | null;
  }>;
  sub_groups?: mongoose.Types.ObjectId[];
  status: "Active" | "Inactive";
  createdAt: Date;
  updatedAt: Date;
}

const classGroupSchema = new Schema<IClassGroup>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    name: { type: String, required: true, trim: true },
    academic_year: { type: String, required: true, trim: true },
    classes: [
      {
        class_id: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
        stream_id: { type: mongoose.Schema.Types.ObjectId, ref: "Stream", default: null },
        section_id: { type: mongoose.Schema.Types.ObjectId, ref: "Section", default: null },
      }
    ],
    sub_groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "ClassGroup", default: [] }],
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

classGroupSchema.index({ school_id: 1, academic_year: 1, name: 1 }, { unique: true, name: "class_group_school_year_name_unique_v1" });

// ─── Teacher Assignment ─────────────────────────────────────────────
export interface ITeacherAssignment extends Document {
  school_id: mongoose.Types.ObjectId;
  academic_year: string;
  teacher_id: mongoose.Types.ObjectId;
  class_id?: mongoose.Types.ObjectId;
  class_group_id?: mongoose.Types.ObjectId;
  stream_id?: mongoose.Types.ObjectId;
  section_id?: mongoose.Types.ObjectId;
  subject_master_id?: mongoose.Types.ObjectId | null;
  assignment_type: "Class Teacher" | "Subject Teacher" | "Co-Class Teacher" | "Temporary Teacher" | "Substitute Teacher";
  effective_date?: Date;
  status: "Active" | "Inactive";
  remarks?: string;
  is_deleted?: boolean;
  deleted_at?: Date | null;
  deleted_by?: mongoose.Types.ObjectId | null;
  created_by?: mongoose.Types.ObjectId | null;
  updated_by?: mongoose.Types.ObjectId | null;
  history?: Array<{
    action: string;
    changes?: string;
    updated_by: mongoose.Types.ObjectId;
    date: Date;
    remarks?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const teacherAssignmentSchema = new Schema<ITeacherAssignment>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    academic_year: { type: String, required: true, trim: true },
    teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    class_id: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: false, default: null },
    class_group_id: { type: mongoose.Schema.Types.ObjectId, ref: "ClassGroup", default: null },
    stream_id: { type: mongoose.Schema.Types.ObjectId, ref: "Stream", default: null },
    section_id: { type: mongoose.Schema.Types.ObjectId, ref: "Section", default: null },
    subject_master_id: { type: mongoose.Schema.Types.ObjectId, ref: "SubjectMaster", required: false, default: null },
    assignment_type: { 
      type: String, 
      enum: ["Class Teacher", "Subject Teacher", "Co-Class Teacher", "Temporary Teacher", "Substitute Teacher"], 
      required: true, 
      default: "Subject Teacher" 
    },
    effective_date: { type: Date, default: Date.now },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    remarks: { type: String, default: "" },
    is_deleted: { type: Boolean, default: false },
    deleted_at: { type: Date, default: null },
    deleted_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    history: [
      {
        action: { type: String, required: true },
        changes: { type: String, default: "" },
        updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        date: { type: Date, default: Date.now },
        remarks: { type: String, default: "" }
      }
    ]
  },
  { timestamps: true }
);

teacherAssignmentSchema.index(
  { school_id: 1, academic_year: 1, class_id: 1, stream_id: 1, section_id: 1, subject_master_id: 1, teacher_id: 1, assignment_type: 1 },
  { unique: true, partialFilterExpression: { is_deleted: false }, name: "teacher_assignment_unique_v3" }
);

teacherAssignmentSchema.index(
  { school_id: 1, academic_year: 1, class_group_id: 1, subject_master_id: 1 },
  { unique: true, partialFilterExpression: { class_group_id: { $gt: null }, is_deleted: false }, name: "teacher_assignment_group_unique_v2" }
);


// ─── Syllabus ──────────────────────────────────────────────────────
export interface ISyllabusResource {
  title: string;
  type: "file" | "youtube" | "drive" | "link";
  url: string;
}

export interface ISyllabusAttachment {
  filename: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
}

export interface ISyllabusNode {
  id: string;
  title: string;
  description?: string;
  type: "unit" | "chapter" | "topic" | "sub_topic" | "learning_outcome" | "resource" | "other";
  children?: ISyllabusNode[];
  resources?: ISyllabusResource[];
}

export interface ISyllabusHistoryEntry {
  version: number;
  title: string;
  description?: string;
  status: "Draft" | "Published" | "Archived";
  nodes: ISyllabusNode[];
  attachments: ISyllabusAttachment[];
  reference_links: string[];
  updated_by?: mongoose.Types.ObjectId | null;
  updated_at: Date;
  remarks?: string;
}

export interface ISyllabus extends Document {
  school_id: mongoose.Types.ObjectId;
  academic_year: string;
  class_id: mongoose.Types.ObjectId;
  section_id?: mongoose.Types.ObjectId | null;
  stream_id?: mongoose.Types.ObjectId | null;
  subject_master_id: mongoose.Types.ObjectId;
  teacher_id?: mongoose.Types.ObjectId | null;
  
  title: string;
  description?: string;
  version: number;
  status: "Draft" | "Published" | "Archived";
  publish_date?: Date | null;
  visibility: "Public" | "Internal" | "Restricted";
  
  attachments: ISyllabusAttachment[];
  reference_links: string[];
  nodes: ISyllabusNode[];
  
  history: ISyllabusHistoryEntry[];
  
  created_by?: mongoose.Types.ObjectId | null;
  updated_by?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const syllabusResourceSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ["file", "youtube", "drive", "link"], required: true },
    url: { type: String, required: true }
  },
  { _id: false }
);

const syllabusAttachmentSchema = new Schema(
  {
    filename: { type: String, required: true },
    file_url: { type: String, required: true },
    file_size: { type: Number },
    mime_type: { type: String }
  },
  { _id: false }
);

const syllabusNodeSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: { type: String, enum: ["unit", "chapter", "topic", "sub_topic", "learning_outcome", "resource", "other"], required: true },
    resources: [syllabusResourceSchema]
  },
  { _id: false }
);
syllabusNodeSchema.add({
  children: [syllabusNodeSchema]
});

const syllabusHistorySchema = new Schema(
  {
    version: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ["Draft", "Published", "Archived"], default: "Draft" },
    nodes: [syllabusNodeSchema],
    attachments: [syllabusAttachmentSchema],
    reference_links: [{ type: String }],
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updated_at: { type: Date, default: Date.now },
    remarks: { type: String }
  },
  { _id: false }
);

const syllabusSchema = new Schema<ISyllabus>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    academic_year: { type: String, required: true, index: true },
    class_id: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true, index: true },
    section_id: { type: mongoose.Schema.Types.ObjectId, ref: "Section", default: null, index: true },
    stream_id: { type: mongoose.Schema.Types.ObjectId, ref: "Stream", default: null, index: true },
    subject_master_id: { type: mongoose.Schema.Types.ObjectId, ref: "SubjectMaster", required: true, index: true },
    teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", default: null, index: true },
    
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    version: { type: Number, default: 1 },
    status: { type: String, enum: ["Draft", "Published", "Archived"], default: "Draft", index: true },
    publish_date: { type: Date, default: null },
    visibility: { type: String, enum: ["Public", "Internal", "Restricted"], default: "Public" },
    
    attachments: [syllabusAttachmentSchema],
    reference_links: [{ type: String }],
    nodes: [syllabusNodeSchema],
    
    history: [syllabusHistorySchema],
    
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

syllabusSchema.index({ school_id: 1, academic_year: 1, class_id: 1, section_id: 1, subject_master_id: 1 }, { name: "syllabus_unique_lookup" });

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
  status?: string;
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

timetableSchema.index({ school_id: 1, class_id: 1, day: 1, start_time: 1, end_time: 1 }, { name: "timetable_conflict_check" });
timetableSchema.index({ school_id: 1, teacher_id: 1, day: 1, start_time: 1, end_time: 1 }, { name: "teacher_conflict_check" });
timetableSchema.index({ school_id: 1, room: 1, day: 1, start_time: 1, end_time: 1 }, { name: "room_conflict_check" });

// ─── Attendance ───────────────────────────────────────────────────
const attendanceRecordSchema = new Schema(
  {
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    status: { type: String, enum: ["present", "absent", "leave", "late", "half_day", "holiday", "medical_leave", "official_duty"], required: true },
    note: { type: String, trim: true, default: null },
    check_in: { type: String, default: null },
    check_out: { type: String, default: null },
    working_hours: { type: Number, default: null },
    late_minutes: { type: Number, default: null },
  },
  { _id: false }
);

export interface IAttendanceHistoryChange {
  student_id: mongoose.Types.ObjectId;
  student_name: string;
  old_status: string;
  new_status: string;
  old_note?: string;
  new_note?: string;
}

export interface IAttendanceHistoryEntry {
  edited_by: mongoose.Types.ObjectId;
  edited_by_name: string;
  edited_at: Date;
  reason?: string;
  changes: IAttendanceHistoryChange[];
}

export interface IAttendance extends Document {
  school_id: mongoose.Types.ObjectId;
  academic_year: string;
  class_id?: mongoose.Types.ObjectId;
  stream_id?: mongoose.Types.ObjectId;
  section_id?: mongoose.Types.ObjectId;
  marked_by: mongoose.Types.ObjectId;
  date: Date;
  type: "student" | "teacher";
  records: Array<{
    student_id?: mongoose.Types.ObjectId;
    teacher_id?: mongoose.Types.ObjectId;
    status: string;
    note?: string;
    check_in?: string;
    check_out?: string;
    working_hours?: number;
    late_minutes?: number;
  }>;
  edit_history?: IAttendanceHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const attendanceHistoryChangeSchema = new Schema(
  {
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    student_name: { type: String, required: true },
    old_status: { type: String, required: true },
    new_status: { type: String, required: true },
    old_note: { type: String, default: "" },
    new_note: { type: String, default: "" },
  },
  { _id: false }
);

const attendanceHistorySchema = new Schema(
  {
    edited_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    edited_by_name: { type: String, required: true },
    edited_at: { type: Date, default: Date.now },
    reason: { type: String, default: "" },
    changes: [attendanceHistoryChangeSchema]
  },
  { _id: false }
);

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
    edit_history: { type: [attendanceHistorySchema], default: [] },
  },
  { timestamps: true }
);

attendanceSchema.index(
  { school_id: 1, academic_year: 1, class_id: 1, stream_id: 1, section_id: 1, date: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: "student" }, name: "attendance_student_unique_v1" }
);

attendanceSchema.index(
  { school_id: 1, academic_year: 1, date: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: "teacher" }, name: "attendance_teacher_unique_v1" }
);

// Fast date-range queries (dashboard stats, reports)
attendanceSchema.index({ school_id: 1, class_id: 1, date: 1 }, { name: "attendance_school_class_date_v1" });
attendanceSchema.index({ school_id: 1, type: 1, date: 1 }, { name: "attendance_school_type_date_v1" });

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
  status: 'draft' | 'published' | 'completed';
  submissions: Array<{
    student_id: mongoose.Types.ObjectId;
    content: string;
    submitted_at: Date;
    grade?: string;
    feedback?: string;
    remarks?: string;
  }>;
}

const homeworkSubmissionSchema = new Schema(
  {
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    content: { type: String, required: true },
    submitted_at: { type: Date, default: Date.now },
    grade: { type: String, default: null },
    feedback: { type: String, default: null },
    remarks: { type: String, default: null },
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
    status: { type: String, enum: ['draft', 'published', 'completed'], default: 'published' },
    submissions: [homeworkSubmissionSchema],
  },
  { timestamps: true }
);

homeworkSchema.index({ school_id: 1, class_id: 1, status: 1 }, { name: "homework_school_class_status_v1" });
homeworkSchema.index({ school_id: 1, teacher_id: 1 }, { name: "homework_school_teacher_v1" });
homeworkSchema.index({ school_id: 1, due_date: -1 }, { name: "homework_school_due_date_v1" });

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

noticeSchema.index({ school_id: 1, is_published: 1, publish_date: -1 }, { name: "notice_school_published_date_v1" });
noticeSchema.index({ school_id: 1, target_audience: 1, publish_date: -1 }, { name: "notice_school_audience_date_v1" });

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

// Fast fee structure lookup: "which fee heads exist for class X in year Y?"
feesStructureSchema.index({ school_id: 1, class_id: 1, academic_year: 1, is_active: 1 }, { name: "fees_structure_school_class_year_active_v1" });

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

gradeSchema.index({ school_id: 1, grade_name: 1 }, { unique: true, name: "grade_school_name_unique_v1" });

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

holidaySchema.index({ school_id: 1, title: 1, date: 1 }, { unique: true, name: "holiday_school_title_date_unique_v1" });

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

leaveTypeSchema.index({ school_id: 1, leave_type: 1 }, { unique: true, name: "leave_type_school_type_unique_v1" });

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
  description?: string;
  status?: "upcoming" | "ongoing" | "completed";
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
    description: { type: String, trim: true },
    status: { type: String, enum: ["upcoming", "ongoing", "completed"], default: "upcoming" },
  },
  { timestamps: true }
);

// Exam listing per class: "show me all exams for Class 10 in 2026-2027 that are active"
examSchema.index({ school_id: 1, class_id: 1, academic_year: 1, status: 1 }, { name: "exam_school_class_year_status_v1" });

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
  attendance_status?: "Present" | "Absent" | "Medical" | "Exempted";
  status: "draft" | "final";
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
    attendance_status: { type: String, enum: ["Present", "Absent", "Medical", "Exempted"], default: "Present" },
    status: { type: String, enum: ["draft", "final"], default: "final" },
    entered_by: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
  },
  { timestamps: true }
);

resultSchema.index({ school_id: 1, exam_id: 1, student_id: 1, subject_id: 1 }, { unique: true, name: "result_school_exam_student_subject_unique_v1" });
// Report card query: "get all results for student X across all exams in this year"
resultSchema.index({ school_id: 1, student_id: 1, exam_id: 1 }, { name: "result_school_student_exam_v1" });

// ─── Result Audit ──────────────────────────────────────────────────
export interface IResultAudit extends Document {
  school_id: mongoose.Types.ObjectId;
  result_id?: mongoose.Types.ObjectId;
  exam_id: mongoose.Types.ObjectId;
  student_id: mongoose.Types.ObjectId;
  subject_id: mongoose.Types.ObjectId;
  previous_marks?: number;
  new_marks?: number;
  previous_status?: string;
  new_status?: string;
  previous_attendance_status?: string;
  new_attendance_status?: string;
  action_type: "create" | "update" | "delete";
  reason?: string;
  changed_by: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const resultAuditSchema = new Schema<IResultAudit>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    result_id: { type: mongoose.Schema.Types.ObjectId, ref: "Result", default: null },
    exam_id: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    subject_id: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    previous_marks: { type: Number, default: 0 },
    new_marks: { type: Number, default: 0 },
    previous_status: { type: String, default: "draft" },
    new_status: { type: String, default: "final" },
    previous_attendance_status: { type: String, default: "Present" },
    new_attendance_status: { type: String, default: "Present" },
    action_type: { type: String, enum: ["create", "update", "delete"], required: true },
    reason: { type: String, default: "" },
    changed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

resultAuditSchema.index({ school_id: 1, exam_id: 1, student_id: 1, subject_id: 1 }, { name: "result_audit_school_exam_student_subject_v1" });

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

leaveRequestSchema.index({ school_id: 1, user_id: 1, status: 1 }, { name: "leave_request_school_user_status_v1" });
leaveRequestSchema.index({ school_id: 1, status: 1, createdAt: -1 }, { name: "leave_request_school_status_created_v1" });

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

roomSchema.index({ school_id: 1, room_no: 1 }, { unique: true, name: "room_school_no_unique_v1" });

// ─── Export all models (with cache check for Next.js hot reload) ──
export const Subject: Model<ISubject> = mongoose.models.Subject || mongoose.model("Subject", subjectSchema);
export const ClassGroup: Model<IClassGroup> = mongoose.models.ClassGroup || mongoose.model("ClassGroup", classGroupSchema);
export const TeacherAssignment: Model<ITeacherAssignment> =
  mongoose.models.TeacherAssignment && mongoose.models.TeacherAssignment.schema.indexes().some((idx: any) => idx[1]?.name === "teacher_assignment_unique_v3")
    ? (mongoose.models.TeacherAssignment as Model<ITeacherAssignment>)
    : (() => {
        delete mongoose.models.TeacherAssignment;
        if (mongoose.connection && (mongoose.connection as any).models && (mongoose.connection as any).models.TeacherAssignment) {
          delete (mongoose.connection as any).models.TeacherAssignment;
        }
        return mongoose.model<ITeacherAssignment>("TeacherAssignment", teacherAssignmentSchema);
      })();
export const Syllabus: Model<ISyllabus> =
  mongoose.models.Syllabus && Object.keys(mongoose.models.Syllabus.schema.paths).includes("nodes")
    ? (mongoose.models.Syllabus as Model<ISyllabus>)
    : (() => {
        delete mongoose.models.Syllabus;
        if (mongoose.connection && (mongoose.connection as any).models && (mongoose.connection as any).models.Syllabus) {
          delete (mongoose.connection as any).models.Syllabus;
        }
        return mongoose.model<ISyllabus>("Syllabus", syllabusSchema);
      })();
export const Timetable: Model<ITimetable> = mongoose.models.Timetable || mongoose.model("Timetable", timetableSchema);
export const Attendance: Model<IAttendance> = mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);
export const Homework: Model<IHomework> = mongoose.models.Homework || mongoose.model("Homework", homeworkSchema);
export const Notice: Model<INotice> = mongoose.models.Notice || mongoose.model("Notice", noticeSchema);
export const FeesStructure: Model<IFeesStructure> = mongoose.models.FeesStructure || mongoose.model("FeesStructure", feesStructureSchema);

export const Exam: Model<IExam> = mongoose.models.Exam || mongoose.model("Exam", examSchema);
export const Result: Model<IResult> =
  mongoose.models.Result && Object.keys(mongoose.models.Result.schema.paths).includes("attendance_status")
    ? (mongoose.models.Result as Model<IResult>)
    : (() => {
        delete mongoose.models.Result;
        return mongoose.model<IResult>("Result", resultSchema);
      })();
export const ResultAudit: Model<IResultAudit> = mongoose.models.ResultAudit || mongoose.model("ResultAudit", resultAuditSchema);
export const LeaveRequest: Model<ILeaveRequest> = mongoose.models.LeaveRequest || mongoose.model("LeaveRequest", leaveRequestSchema);
export const Room: Model<IRoom> = mongoose.models.Room || mongoose.model("Room", roomSchema);
export const Grade: Model<IGrade> = mongoose.models.Grade || mongoose.model("Grade", gradeSchema);
export const Holiday: Model<IHoliday> = mongoose.models.Holiday || mongoose.model("Holiday", holidaySchema);
export const LeaveType: Model<ILeaveType> = mongoose.models.LeaveType || mongoose.model("LeaveType", leaveTypeSchema);
export const Parent: Model<any> = mongoose.models.Parent || _Parent;

// ─── Subject Master (school-scoped catalog) ────────────────────────
export interface ISubjectMaster extends Document {
  school_id: mongoose.Types.ObjectId;
  name: string;
  subject_code?: string;
  description?: string;
  status: "Active" | "Inactive";
  allowed_streams: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const subjectMasterSchema = new Schema<ISubjectMaster>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    name: { type: String, required: true, trim: true },
    subject_code: { type: String, trim: true, uppercase: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ["Active", "Inactive", "Archived"], default: "Active" },
    allowed_streams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Stream", default: [] }],
  },
  { timestamps: true }
);

subjectMasterSchema.index({ school_id: 1, name: 1 }, { unique: true, name: "subject_master_school_name_unique_v1" });

export const SubjectMaster: Model<ISubjectMaster> =
  mongoose.models.SubjectMaster && mongoose.models.SubjectMaster.schema.paths.status?.options?.enum?.includes("Archived")
    ? (mongoose.models.SubjectMaster as Model<ISubjectMaster>)
    : (() => {
        delete mongoose.models.SubjectMaster;
        if (mongoose.connection && (mongoose.connection as any).models && (mongoose.connection as any).models.SubjectMaster) {
          delete (mongoose.connection as any).models.SubjectMaster;
        }
        return mongoose.model<ISubjectMaster>("SubjectMaster", subjectMasterSchema);
      })();

// ─── Subject Assignment (Class + optional Stream → Subject) ────────
export interface ISubjectAssignment extends Document {
  school_id: mongoose.Types.ObjectId;
  academic_year: string;
  class_id?: mongoose.Types.ObjectId;
  class_group_id?: mongoose.Types.ObjectId;
  stream_id?: mongoose.Types.ObjectId;
  subject_master_id: mongoose.Types.ObjectId;
  teacher_id?: mongoose.Types.ObjectId | null;
  weekly_periods?: number;
  description?: string;
  status: "Active" | "Inactive";
  created_by?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const subjectAssignmentSchema = new Schema<ISubjectAssignment>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    academic_year: { type: String, required: true },
    class_id: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: false, default: null },
    class_group_id: { type: mongoose.Schema.Types.ObjectId, ref: "ClassGroup", default: null },
    stream_id: { type: mongoose.Schema.Types.ObjectId, ref: "Stream", default: null },
    subject_master_id: { type: mongoose.Schema.Types.ObjectId, ref: "SubjectMaster", required: true },
    teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", default: null },
    weekly_periods: { type: Number, default: 0 },
    description: { type: String, default: "" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// Prevent duplicate assignments
subjectAssignmentSchema.index(
  { school_id: 1, academic_year: 1, class_id: 1, stream_id: 1, subject_master_id: 1 },
  { unique: true, name: "subject_assignment_unique_v1" }
);

subjectAssignmentSchema.index(
  { school_id: 1, academic_year: 1, class_group_id: 1, subject_master_id: 1 },
  { unique: true, partialFilterExpression: { class_group_id: { $gt: null } }, name: "subject_assignment_group_unique_v1" }
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

busSchema.index({ school_id: 1, busNumber: 1 }, { unique: true, name: "bus_school_number_unique_v1" });

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

routeSchema.index({ school_id: 1, routeName: 1 }, { unique: true, name: "route_school_name_unique_v1" });

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
    bus_id: { type: mongoose.Schema.Types.ObjectId, ref: "Bus", required: false, default: null },
    pickupStop: { type: String, trim: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

transportAllocationSchema.index({ school_id: 1, student_id: 1 }, { unique: true, name: "transport_allocation_school_student_unique_v1" });

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
  frequency: "One Time" | "Monthly" | "Quarterly" | "Half Yearly" | "Yearly";
  createdAt: Date;
  updatedAt: Date;
}

const feeMasterSchema = new Schema<IFeeMaster>({
  school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
  fee_group_id: { type: mongoose.Schema.Types.ObjectId, ref: "FeeGroup", required: true },
  fee_type_id: { type: mongoose.Schema.Types.ObjectId, ref: "FeeType", required: true },
  amount: { type: Number, required: true, min: 0 },
  due_date: { type: Date, required: true },
  frequency: { type: String, enum: ["One Time", "Monthly", "Quarterly", "Half Yearly", "Yearly"], default: "Monthly" },
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
feeAllocationSchema.index({ student_id: 1, fee_group_id: 1 }, { unique: true, name: "fee_allocation_student_group_unique_v1" });

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

feePaymentSchema.index({ school_id: 1, student_id: 1 }, { name: "fee_payment_school_student_v1" });
feePaymentSchema.index({ school_id: 1, transaction_date: -1 }, { name: "fee_payment_school_date_v1" });

export const FeeGroup: Model<IFeeGroup> = mongoose.models.FeeGroup || mongoose.model("FeeGroup", feeGroupSchema);
export const FeeType: Model<IFeeType> = mongoose.models.FeeType || mongoose.model("FeeType", feeTypeSchema);
export const FeeMaster: Model<IFeeMaster> = mongoose.models.FeeMaster || mongoose.model("FeeMaster", feeMasterSchema);
export const FeeAllocation: Model<IFeeAllocation> = mongoose.models.FeeAllocation || mongoose.model("FeeAllocation", feeAllocationSchema);
export const FeePayment: Model<IFeePayment> = mongoose.models.FeePayment || mongoose.model("FeePayment", feePaymentSchema);
export const RolePermission: Model<any> = mongoose.models.RolePermission || require("./RolePermission").default;

// ─── Class Test (Assessment Module) ──────────────────────────────────────────
// Completely independent from the Exam module. For regular class tests only.

export type ClassTestStatus = "draft" | "scheduled" | "ongoing" | "completed" | "published";

export interface IClassTest extends Document {
  school_id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  class_id: mongoose.Types.ObjectId;
  subject_id: mongoose.Types.ObjectId;
  teacher_id: mongoose.Types.ObjectId;
  test_date: Date;
  start_time: string;
  end_time: string;
  total_marks: number;
  passing_marks: number;
  chapter?: string;
  academic_year: string;
  status: ClassTestStatus;
  is_published: boolean;
  assessment_type?: string;
  createdAt: Date;
  updatedAt: Date;
}

const classTestSchema = new Schema<IClassTest>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    class_id: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    subject_id: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    test_date: { type: Date, required: true },
    start_time: { type: String, required: true, trim: true },
    end_time: { type: String, required: true, trim: true },
    total_marks: { type: Number, required: true, min: 1 },
    passing_marks: { type: Number, required: true, min: 0 },
    chapter: { type: String, trim: true, default: null },
    academic_year: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["draft", "scheduled", "ongoing", "completed", "published"],
      default: "scheduled",
    },
    is_published: { type: Boolean, default: false },
    assessment_type: { type: String, default: "Class Test" },
  },
  { timestamps: true }
);

classTestSchema.index({ school_id: 1, class_id: 1, test_date: 1 }, { name: "class_test_school_class_date_v1" });
classTestSchema.index({ school_id: 1, teacher_id: 1 }, { name: "class_test_school_teacher_v1" });

export const ClassTest: Model<IClassTest> =
  mongoose.models.ClassTest && Object.keys(mongoose.models.ClassTest.schema.paths).includes("assessment_type")
    ? (mongoose.models.ClassTest as Model<IClassTest>)
    : (() => {
        delete mongoose.models.ClassTest;
        return mongoose.model<IClassTest>("ClassTest", classTestSchema);
      })();

// ─── Class Test Mark (per-student marks entry) ───────────────────────────────

export interface IClassTestMark extends Document {
  school_id: mongoose.Types.ObjectId;
  test_id: mongoose.Types.ObjectId;
  student_id: mongoose.Types.ObjectId;
  marks_obtained: number;
  is_pass: boolean;
  rank?: number;
  remarks?: string;
  attendance_status?: "Present" | "Absent" | "Medical" | "Exempted";
  entered_by: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const classTestMarkSchema = new Schema<IClassTestMark>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    test_id: { type: mongoose.Schema.Types.ObjectId, ref: "ClassTest", required: true },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    marks_obtained: { type: Number, required: true, min: 0 },
    is_pass: { type: Boolean, required: true },
    rank: { type: Number, default: null },
    remarks: { type: String, trim: true, default: null },
    attendance_status: { type: String, enum: ["Present", "Absent", "Medical", "Exempted"], default: "Present" },
    entered_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

classTestMarkSchema.index({ test_id: 1, student_id: 1 }, { unique: true, name: "class_test_mark_test_student_unique_v1" });

export const ClassTestMark: Model<IClassTestMark> =
  mongoose.models.ClassTestMark && Object.keys(mongoose.models.ClassTestMark.schema.paths).includes("attendance_status")
    ? (mongoose.models.ClassTestMark as Model<IClassTestMark>)
    : (() => {
        delete mongoose.models.ClassTestMark;
        return mongoose.model<IClassTestMark>("ClassTestMark", classTestMarkSchema);
      })();

// ─── Class Test Mark Audit (auditing assessment modifications) ───────────────

export interface IClassTestMarkAudit extends Document {
  school_id: mongoose.Types.ObjectId;
  mark_id?: mongoose.Types.ObjectId;
  test_id: mongoose.Types.ObjectId;
  student_id: mongoose.Types.ObjectId;
  previous_marks?: number;
  new_marks?: number;
  previous_attendance_status?: string;
  new_attendance_status?: string;
  action_type: "create" | "update" | "delete";
  reason?: string;
  changed_by: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const classTestMarkAuditSchema = new Schema<IClassTestMarkAudit>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    mark_id: { type: mongoose.Schema.Types.ObjectId, ref: "ClassTestMark", default: null },
    test_id: { type: mongoose.Schema.Types.ObjectId, ref: "ClassTest", required: true },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    previous_marks: { type: Number, default: 0 },
    new_marks: { type: Number, default: 0 },
    previous_attendance_status: { type: String, default: "Present" },
    new_attendance_status: { type: String, default: "Present" },
    action_type: { type: String, enum: ["create", "update", "delete"], required: true },
    reason: { type: String, default: "" },
    changed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

classTestMarkAuditSchema.index({ school_id: 1, test_id: 1, student_id: 1 }, { name: "class_test_mark_audit_school_test_student_v1" });

export const ClassTestMarkAudit: Model<IClassTestMarkAudit> =
  mongoose.models.ClassTestMarkAudit || mongoose.model<IClassTestMarkAudit>("ClassTestMarkAudit", classTestMarkAuditSchema);

import SalaryPayment from "./SalaryPayment";
import ClassFee from "./ClassFee";
import StudentFeePayment from "./StudentFeePayment";
import StudentFeeAssignment from "./StudentFeeAssignment";
export { SalaryPayment, ClassFee, StudentFeePayment, StudentFeeAssignment };

// ─── Exam Schedule ───────────────────────────────────────────────

export interface IExamSchedule extends Document {
  school_id: mongoose.Types.ObjectId;
  exam_id: mongoose.Types.ObjectId;
  subject_id: mongoose.Types.ObjectId;
  date: Date;
  start_time: string;
  end_time: string;
  max_marks: number;
  passing_marks: number;
  room?: string;
  createdAt: Date;
  updatedAt: Date;
}

const examScheduleSchema = new Schema<IExamSchedule>(
  {
    school_id: { type: mongoose.Schema.Types.ObjectId, ref: "School", required: true, index: true },
    exam_id: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true, index: true },
    subject_id: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    date: { type: Date, required: true },
    start_time: { type: String, required: true },
    end_time: { type: String, required: true },
    max_marks: { type: Number, required: true, min: 0 },
    passing_marks: { type: Number, required: true, min: 0 },
    room: { type: String, trim: true, default: null }
  },
  { timestamps: true }
);

// Unique index to prevent duplicate schedules for the same exam, subject, and date
examScheduleSchema.index({ exam_id: 1, subject_id: 1, date: 1 }, { unique: true, name: "exam_schedule_exam_subject_date_unique_v1" });

export const ExamSchedule: Model<IExamSchedule> =
  mongoose.models.ExamSchedule || mongoose.model<IExamSchedule>("ExamSchedule", examScheduleSchema);

// ─── Re-export GeneratedDocument (used by the Document Generation Engine) ─────
import _GeneratedDocument from "./GeneratedDocument";
export { _GeneratedDocument as GeneratedDocumentModel };
