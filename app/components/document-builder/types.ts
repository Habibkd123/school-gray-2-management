// ─── Document Builder — Shared Types ───────────────────────────────────────

export type ElementType =
  | "heading"
  | "subheading"
  | "paragraph"
  | "image"
  | "logo"
  | "table"
  | "divider"
  | "horizontalLine"
  | "verticalLine"
  | "pageBreak"
  | "variable"
  | "shape";

export type DocumentStatus = "draft" | "published" | "archived";

export type PageSize = "A4" | "Letter" | "Legal";
export type PageOrientation = "portrait" | "landscape";

export interface TableCellSpan {
  rowspan?: number;
  colspan?: number;
  merged?: boolean;
  mergedInto?: [number, number]; // [row, col] coordinate of master cell
}

export interface TableData {
  rows: number;
  cols: number;
  headerRow: boolean;
  cellPadding: number;
  borderWidth: number;
  borderColor: string;
  cells: string[][];
  originalCells?: string[][]; // Holds original templates cells containing variables like {{student.name}}
  colWidths?: number[];       // Custom column widths in pixels
  rowHeights?: number[];      // Custom row heights in pixels
  spans?: TableCellSpan[][];  // Merge cell span structure: spans[r][c]
  cellStyles?: Record<string, string>[][]; // Custom cell style overrides: cellStyles[r][c] = { background, color, textAlign, fontWeight, fontStyle, textDecoration }
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textDecoration: "none" | "underline" | "line-through" | "underline line-through";
  textAlign: "left" | "center" | "right" | "justify";
  color: string;
  backgroundColor: string;
  letterSpacing: number;
  lineHeight: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  marginTop: number;
  marginBottom: number;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  boxShadow: string;
}

export interface ImageStyle {
  opacity: number;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  boxShadow: string;
  rotation: number;
  objectFit: "contain" | "cover" | "fill";
}

export interface VariableMeta {
  key: string;           // e.g. "student.name"
  label: string;         // e.g. "Student Name"
  category: string;      // e.g. "Student"
  categoryId: string;    // e.g. "student"
  previewValue: string;  // e.g. "Rahul Sharma"
  description?: string;
}

export interface DocumentElement {
  id: string;
  type: ElementType;
  x: number;          // px, from left of page
  y: number;          // px, from top of page
  width: number;      // px
  height: number;     // px
  zIndex: number;
  // content
  content?: string;   // text content / variable placeholder / image URL
  originalContent?: string; // Holds original template content containing variables like {{student.name}}
  textStyle?: TextStyle;
  imageStyle?: ImageStyle;
  tableData?: TableData;
  // variable-specific structured metadata (type === "variable")
  variableMeta?: VariableMeta;
  // meta
  locked?: boolean;
  visible?: boolean;
  // shape-specific
  shapeVariant?: "rectangle" | "circle" | "triangle";
}

export interface CanvasPage {
  id: string;
  elements: DocumentElement[];
}

export interface DocumentMeta {
  id: string;
  title: string;
  categoryId: string;
  templateId: string;
  status: DocumentStatus;
  pageSize: PageSize;
  orientation: PageOrientation;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  pages: CanvasPage[];
  // ERP Linkage Metadata
  recordId?: string;
  recordType?: string;
  recordName?: string;
  resolvedVariables?: Record<string, string>;
}

export interface DocumentCategory {
  id: string;
  name: string;
  icon: string;      // lucide icon name
  color: string;     // tailwind color class
  description?: string;
  isCustom?: boolean;
}

export interface TemplateDefinition {
  id: string;
  categoryId: string;
  name: string;
  orientation: PageOrientation;
  pageSize: PageSize;
  description: string;
  thumbnailBg: string;   // CSS gradient / color for thumbnail
  thumbnailAccent: string;
  defaultPages: CanvasPage[];
}

// ─── Template Meta (user-created + built-in templates) ───────────────────────

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  pageSize: PageSize;
  orientation: PageOrientation;
  pages: CanvasPage[];
  status: "draft" | "published" | "archived";
  favourite: boolean;
  thumbnail: string;        // base64 PNG or empty string
  version: string;          // e.g. "1.0"
  usageCount: number;
  isBuiltIn: boolean;       // built-in templates: read-only, can only duplicate
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;       // soft delete: if set → template is in trash
}

// ─── Default text style ──────────────────────────────────────────────────────

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: "Roboto, sans-serif",
  fontSize: 14,
  fontWeight: "normal",
  fontStyle: "normal",
  textDecoration: "none",
  textAlign: "left",
  color: "#1E3A5F",
  backgroundColor: "transparent",
  letterSpacing: 0,
  lineHeight: 1.5,
  paddingTop: 4,
  paddingRight: 8,
  paddingBottom: 4,
  paddingLeft: 8,
  marginTop: 0,
  marginBottom: 0,
  borderRadius: 0,
  borderWidth: 0,
  borderColor: "#E0E0E0",
  boxShadow: "none",
};

export const DEFAULT_IMAGE_STYLE: ImageStyle = {
  opacity: 1,
  borderRadius: 0,
  borderWidth: 0,
  borderColor: "#E0E0E0",
  boxShadow: "none",
  rotation: 0,
  objectFit: "contain",
};

// ─── Page dimensions (px at 96dpi) ──────────────────────────────────────────
export const PAGE_DIMENSIONS: Record<PageSize, Record<PageOrientation, { width: number; height: number }>> = {
  A4: {
    portrait:  { width: 794,  height: 1123 },
    landscape: { width: 1123, height: 794  },
  },
  Letter: {
    portrait:  { width: 816,  height: 1056 },
    landscape: { width: 1056, height: 816  },
  },
  Legal: {
    portrait:  { width: 816,  height: 1344 },
    landscape: { width: 1344, height: 816  },
  },
};


// ─── Variable placeholders ────────────────────────────────────────────────────
export const DOCUMENT_VARIABLES = [
  { key: "student_name", label: "Student Name" },
  { key: "father_name", label: "Father Name" },
  { key: "mother_name", label: "Mother Name" },
  { key: "admission_number", label: "Admission Number" },
  { key: "roll_number", label: "Roll Number" },
  { key: "class", label: "Class" },
  { key: "section", label: "Section" },
  { key: "teacher_name", label: "Teacher Name" },
  { key: "school_name", label: "School Name" },
  { key: "current_date", label: "Current Date" },
  { key: "current_time", label: "Current Time" },
  // ─── Report Card variables ─────────────────────────────────────────────────
  { key: "rc_exam_name", label: "Exam Name" },
  { key: "rc_academic_year", label: "Academic Year" },
  { key: "rc_student_photo", label: "Student Photo" },
  { key: "rc_percentage", label: "Percentage" },
  { key: "rc_grade", label: "Grade" },
  { key: "rc_rank", label: "Rank" },
  { key: "rc_result_status", label: "Result Status" },
  { key: "rc_total_marks", label: "Total Marks" },
  { key: "rc_obtained_marks", label: "Obtained Marks" },
  { key: "rc_teacher_remarks", label: "Teacher Remarks" },
  { key: "rc_principal_remarks", label: "Principal Remarks" },
  { key: "rc_principal_name", label: "Principal Name" },
  { key: "rc_published_date", label: "Published Date" },
  // ─── Flat variables (requested list) ───────────────────────────────────────
  { key: "school_logo", label: "School Logo" },
  { key: "student_photo", label: "Student Photo" },
  { key: "exam_name", label: "Exam Name" },
  { key: "academic_year", label: "Academic Year" },
  { key: "total_marks", label: "Total Marks" },
  { key: "obtained_marks", label: "Obtained Marks" },
  { key: "percentage", label: "Percentage" },
  { key: "overall_grade", label: "Overall Grade" },
  { key: "rank", label: "Rank" },
  { key: "result_status", label: "Result Status" },
  { key: "teacher_remarks", label: "Teacher Remarks" },
  { key: "principal_remarks", label: "Principal Remarks" },
  { key: "generated_date", label: "Generated Date" },
] as const;

// ─── Report Card data passed to Document Builder ──────────────────────────────
export interface ReportCardData {
  studentId: string;
  studentName: string;
  fatherName: string;
  motherName: string;
  admissionNumber: string;
  rollNumber: string;
  className: string;
  section: string;
  examName: string;
  academicYear: string;
  teacherName: string;
  principalName: string;
  schoolName: string;
  percentage: number;
  grade: string;
  rank: string;
  resultStatus: "Pass" | "Fail";
  totalMarks: number;
  obtainedMarks: number;
  attendance: string;
  teacherRemarks: string;
  principalRemarks: string;
  subjects: { name: string; maxMarks: number; marksObtained: number; grade: string; status: "Pass" | "Fail" }[];
  studentPhoto?: string;
  publishedDate?: string;
}
