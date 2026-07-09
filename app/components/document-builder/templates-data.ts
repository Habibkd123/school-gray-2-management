// ─── Document Builder — Template Definitions ─────────────────────────────────

import type { TemplateDefinition, CanvasPage, DocumentElement } from "./types";
import { DEFAULT_TEXT_STYLE, DEFAULT_IMAGE_STYLE } from "./types";

function uid() {
  return Math.random().toString(36).slice(2);
}

// ─── Helpers to create default elements ──────────────────────────────────────

function heading(id: string, content: string, x: number, y: number, w: number, fontSize = 22): DocumentElement {
  return {
    id, type: "heading", x, y, width: w, height: 40, zIndex: 1, content,
    textStyle: { ...DEFAULT_TEXT_STYLE, fontSize, fontWeight: "bold", textAlign: "center", color: "#1E3A5F" },
  };
}

function subheading(id: string, content: string, x: number, y: number, w: number): DocumentElement {
  return {
    id, type: "subheading", x, y, width: w, height: 28, zIndex: 1, content,
    textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 13, fontWeight: "bold", textAlign: "center", color: "#5C5D5D" },
  };
}

function paragraph(id: string, content: string, x: number, y: number, w: number, h = 80): DocumentElement {
  return {
    id, type: "paragraph", x, y, width: w, height: h, zIndex: 1, content,
    textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 13, textAlign: "justify", color: "#231F20", lineHeight: 1.7 },
  };
}

function divider(id: string, y: number, w: number): DocumentElement {
  return {
    id, type: "divider", x: 40, y, width: w - 80, height: 2, zIndex: 1, content: "",
    textStyle: { ...DEFAULT_TEXT_STYLE, backgroundColor: "#1E3A5F", paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 },
  };
}

function logo(id: string, x: number, y: number): DocumentElement {
  return {
    id, type: "logo", x, y, width: 70, height: 70, zIndex: 2, content: "/logo.png",
    imageStyle: { ...DEFAULT_IMAGE_STYLE },
  };
}

// ─── Blank page ───────────────────────────────────────────────────────────────

function blankPage(): CanvasPage {
  return { id: uid(), elements: [] };
}

// ─── Bonafide Certificate ─────────────────────────────────────────────────────

function bonafidePage(): CanvasPage {
  const W = 714; // 794 - 2*40 padding
  return {
    id: uid(),
    elements: [
      logo(uid(), 362, 40),
      heading(uid(), "MY SCHOOL LIFE", 40, 40, W, 20),
      subheading(uid(), "Village Kherli, Tehsil Kota, District Kota, Rajasthan — Ph: +91 98765 43210", 40, 64, W),
      divider(uid(), 100, 794),
      heading(uid(), "BONAFIDE CERTIFICATE", 40, 116, W, 18),
      divider(uid(), 148, 794),
      paragraph(uid(),
        "This is to certify that <b>{{student_name}}</b>, Son/Daughter of <b>{{father_name}}</b> and <b>{{mother_name}}</b>, is a bonafide student of this school studying in Class <b>{{class}}</b> (Section <b>{{section}}</b>) during the academic session 2025–26.\n\nHis/Her date of birth as per school records is <b>__________</b>. His/Her conduct and character during the study period has been found to be satisfactory.\n\nThis certificate is issued on the request of the student/guardian for the purpose of <b>official use</b>.",
        40, 172, W, 180),
      {
        id: uid(), type: "paragraph", x: 40, y: 440, width: 220, height: 60, zIndex: 1,
        content: "________________\nClass Teacher",
        textStyle: { ...DEFAULT_TEXT_STYLE, textAlign: "center", fontSize: 12 },
      },
      {
        id: uid(), type: "paragraph", x: 280, y: 440, width: 220, height: 60, zIndex: 1,
        content: "________________\nExamination Controller",
        textStyle: { ...DEFAULT_TEXT_STYLE, textAlign: "center", fontSize: 12 },
      },
      {
        id: uid(), type: "paragraph", x: 520, y: 440, width: 220, height: 60, zIndex: 1,
        content: "________________\nPrincipal / Head Master",
        textStyle: { ...DEFAULT_TEXT_STYLE, textAlign: "center", fontSize: 12 },
      },
    ],
  };
}

// ─── Character Certificate ────────────────────────────────────────────────────

function characterPage(): CanvasPage {
  const W = 714;
  return {
    id: uid(),
    elements: [
      logo(uid(), 362, 40),
      heading(uid(), "MY SCHOOL LIFE", 40, 40, W, 20),
      subheading(uid(), "Village Kherli, Tehsil Kota, District Kota, Rajasthan", 40, 64, W),
      divider(uid(), 100, 794),
      heading(uid(), "CHARACTER CERTIFICATE", 40, 116, W, 18),
      divider(uid(), 148, 794),
      paragraph(uid(),
        "This is to certify that <b>{{student_name}}</b>, Son/Daughter of <b>{{father_name}}</b>, was a student of Class <b>{{class}}</b> in this school during the academic session 2019 to 2026.\n\nDuring his/her period of study, his/her moral character and conduct has been found to be excellent. He/She is disciplined, honest and respectful towards teachers and fellow students.\n\nWe wish him/her every success in future life.",
        40, 172, W, 160),
      {
        id: uid(), type: "paragraph", x: 40, y: 420, width: 220, height: 60, zIndex: 1,
        content: "________________\nClass Teacher",
        textStyle: { ...DEFAULT_TEXT_STYLE, textAlign: "center", fontSize: 12 },
      },
      {
        id: uid(), type: "paragraph", x: 520, y: 420, width: 220, height: 60, zIndex: 1,
        content: "________________\nPrincipal",
        textStyle: { ...DEFAULT_TEXT_STYLE, textAlign: "center", fontSize: 12 },
      },
    ],
  };
}

// ─── Transfer Certificate ─────────────────────────────────────────────────────

function tcPage(): CanvasPage {
  const W = 714;
  return {
    id: uid(),
    elements: [
      logo(uid(), 362, 40),
      heading(uid(), "MY SCHOOL LIFE", 40, 40, W, 20),
      subheading(uid(), "Village Kherli, Tehsil Kota, District Kota, Rajasthan", 40, 64, W),
      divider(uid(), 100, 794),
      heading(uid(), "TRANSFER CERTIFICATE", 40, 116, W, 18),
      divider(uid(), 148, 794),
      {
        id: uid(), type: "table", x: 40, y: 168, width: W, height: 480, zIndex: 1,
        tableData: {
          rows: 12, cols: 2, headerRow: false, cellPadding: 8, borderWidth: 1, borderColor: "#E0E0E0",
          cells: [
            ["Admission No.", "{{admission_number}}"],
            ["Student's Name", "{{student_name}}"],
            ["Father's Name", "{{father_name}}"],
            ["Mother's Name", "{{mother_name}}"],
            ["Nationality", "Indian"],
            ["Date of Birth", "__________"],
            ["Class Last Studied", "{{class}}"],
            ["Date of Admission", "__________"],
            ["Date of Leaving School", "__________"],
            ["Reason for Leaving School", "Parent's request"],
            ["Conduct", "Good"],
            ["Remarks", "No dues pending"],
          ],
        },
      },
    ],
  };
}

// ─── Notice — Modern ─────────────────────────────────────────────────────────

function noticeModernPage(): CanvasPage {
  const W = 714;
  return {
    id: uid(),
    elements: [
      {
        id: uid(), type: "paragraph", x: 40, y: 40, width: W, height: 48, zIndex: 1,
        content: "{{school_name}}",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 10, textAlign: "right", color: "#5C5D5D", letterSpacing: 2, fontWeight: "bold" },
      },
      divider(uid(), 52, 794),
      heading(uid(), "NOTICE", 40, 68, W, 28),
      {
        id: uid(), type: "paragraph", x: 40, y: 108, width: 200, height: 28, zIndex: 1,
        content: "Ref. No.: ___________",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 12, color: "#5C5D5D" },
      },
      {
        id: uid(), type: "paragraph", x: W - 120, y: 108, width: 200, height: 28, zIndex: 1,
        content: "Date: {{current_date}}",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 12, color: "#5C5D5D", textAlign: "right" },
      },
      heading(uid(), "Notice Title Goes Here", 40, 148, W, 16),
      paragraph(uid(),
        "All students, teachers and staff are hereby informed that...\n\nAdd notice content here. This is the body of the notice. You can format this text using the floating toolbar.",
        40, 184, W, 200),
      {
        id: uid(), type: "paragraph", x: 40, y: 440, width: W, height: 60, zIndex: 1,
        content: "________________\nPrincipal / Head Master",
        textStyle: { ...DEFAULT_TEXT_STYLE, textAlign: "right", fontSize: 12 },
      },
    ],
  };
}

// ─── Letter — Professional ────────────────────────────────────────────────────

function letterProfessionalPage(): CanvasPage {
  const W = 714;
  return {
    id: uid(),
    elements: [
      {
        id: uid(), type: "paragraph", x: 40, y: 40, width: W, height: 80, zIndex: 1,
        content: "{{school_name}}\nSchool Address, City — 000000\nPhone: +91 00000 00000 | Email: info@school.edu",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 12, textAlign: "right", color: "#1E3A5F", lineHeight: 1.6 },
      },
      divider(uid(), 128, 794),
      {
        id: uid(), type: "paragraph", x: 40, y: 148, width: 300, height: 28, zIndex: 1,
        content: "Date: {{current_date}}",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 12 },
      },
      {
        id: uid(), type: "paragraph", x: 40, y: 188, width: W, height: 80, zIndex: 1,
        content: "To,\nThe Recipient Name\nDesignation / Organization\nCity — 000000",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 13, lineHeight: 1.7 },
      },
      {
        id: uid(), type: "paragraph", x: 40, y: 280, width: W, height: 28, zIndex: 1,
        content: "Sub: [Subject of the Letter]",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 13, fontWeight: "bold" },
      },
      paragraph(uid(),
        "Dear Sir / Madam,\n\nThis is to inform you that...\n\n[Write the body of the letter here. Use the floating toolbar to format text.]\n\nYours faithfully,",
        40, 320, W, 220),
      {
        id: uid(), type: "paragraph", x: 40, y: 560, width: 250, height: 60, zIndex: 1,
        content: "________________\n{{school_name}}\nPrincipal",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 12, lineHeight: 1.6 },
      },
    ],
  };
}

// ─── Circular ─────────────────────────────────────────────────────────────────

function circularPage(): CanvasPage {
  const W = 714;
  return {
    id: uid(),
    elements: [
      logo(uid(), 362, 40),
      heading(uid(), "{{school_name}}", 40, 40, W, 20),
      subheading(uid(), "School Address, City — Rajasthan", 40, 64, W),
      divider(uid(), 100, 794),
      heading(uid(), "CIRCULAR", 40, 116, W, 18),
      {
        id: uid(), type: "paragraph", x: 40, y: 148, width: 250, height: 28, zIndex: 1,
        content: "Circular No.: ___________",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 12, color: "#5C5D5D" },
      },
      {
        id: uid(), type: "paragraph", x: W - 80, y: 148, width: 200, height: 28, zIndex: 1,
        content: "Date: {{current_date}}",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 12, color: "#5C5D5D", textAlign: "right" },
      },
      paragraph(uid(),
        "This circular is addressed to all students, parents, and staff members of {{school_name}}.\n\n[Write your circular content here. You can add formatting, change font sizes, and more using the floating toolbar that appears when you click on this text.]\n\nThis is issued for information and compliance of all concerned.",
        40, 192, W, 200),
      {
        id: uid(), type: "paragraph", x: 40, y: 440, width: W, height: 60, zIndex: 1,
        content: "________________\nPrincipal / Head Master",
        textStyle: { ...DEFAULT_TEXT_STYLE, textAlign: "right", fontSize: 12 },
      },
    ],
  };
}

// ─── Fee Receipt ──────────────────────────────────────────────────────────────

function feeReceiptPage(): CanvasPage {
  const W = 714;
  return {
    id: uid(),
    elements: [
      logo(uid(), 362, 40),
      heading(uid(), "{{school_name}}", 40, 40, W, 20),
      subheading(uid(), "School Address, City — Rajasthan", 40, 64, W),
      divider(uid(), 100, 794),
      heading(uid(), "FEE RECEIPT", 40, 116, W, 18),
      divider(uid(), 148, 794),
      {
        id: uid(), type: "table", x: 40, y: 168, width: W, height: 200, zIndex: 1,
        tableData: {
          rows: 5, cols: 2, headerRow: false, cellPadding: 10, borderWidth: 1, borderColor: "#E0E0E0",
          cells: [
            ["Receipt No.", "___________"],
            ["Student Name", "{{student_name}}"],
            ["Class / Section", "{{class}} / {{section}}"],
            ["Admission No.", "{{admission_number}}"],
            ["Date", "{{current_date}}"],
          ],
        },
      },
      {
        id: uid(), type: "table", x: 40, y: 380, width: W, height: 200, zIndex: 1,
        tableData: {
          rows: 4, cols: 3, headerRow: true, cellPadding: 10, borderWidth: 1, borderColor: "#E0E0E0",
          cells: [
            ["Fee Head", "Amount (₹)", "Remarks"],
            ["Tuition Fee", "0", ""],
            ["Other Charges", "0", ""],
            ["Total", "₹ 0", ""],
          ],
        },
      },
    ],
  };
}

// ─── Experience Certificate ───────────────────────────────────────────────────

function experiencePage(): CanvasPage {
  const W = 714;
  return {
    id: uid(),
    elements: [
      logo(uid(), 362, 40),
      heading(uid(), "{{school_name}}", 40, 40, W, 20),
      subheading(uid(), "School Address, City — Rajasthan", 40, 64, W),
      divider(uid(), 100, 794),
      heading(uid(), "EXPERIENCE CERTIFICATE", 40, 116, W, 18),
      divider(uid(), 148, 794),
      paragraph(uid(),
        "This is to certify that <b>{{teacher_name}}</b> has worked as a <b>[Designation]</b> in this school from <b>__________</b> to <b>__________</b>, a total duration of <b>__ years, __ months</b>.\n\nDuring this tenure, he/she taught <b>[Subject(s)]</b>.\n\nDuring his/her tenure, he/she has been sincere, hard-working and dedicated towards his/her duties. His/Her conduct has always been exemplary.\n\nWe wish him/her every success in all future endeavours.",
        40, 172, W, 200),
      {
        id: uid(), type: "paragraph", x: 40, y: 440, width: W, height: 60, zIndex: 1,
        content: "________________\nPrincipal / Head Master",
        textStyle: { ...DEFAULT_TEXT_STYLE, textAlign: "right", fontSize: 12 },
      },
    ],
  };
}

// ─── Report Card — Classic ────────────────────────────────────────────────────

function rcClassicPage(): CanvasPage {
  const W = 714;
  return {
    id: uid(),
    elements: [
      // Header background accent
      {
        id: uid(), type: "shape", x: 0, y: 0, width: 794, height: 120, zIndex: 0, content: "",
        textStyle: { ...DEFAULT_TEXT_STYLE, backgroundColor: "#1E3A5F", paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 },
      },
      // Logo
      { id: uid(), type: "logo", x: 40, y: 24, width: 72, height: 72, zIndex: 2, content: "/logo.png", imageStyle: { ...DEFAULT_IMAGE_STYLE } },
      // School name (white on dark header)
      {
        id: uid(), type: "heading", x: 124, y: 32, width: 506, height: 36, zIndex: 2, content: "{{school_name}}",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 20, fontWeight: "bold", textAlign: "left", color: "#FFFFFF" },
      },
      {
        id: uid(), type: "subheading", x: 124, y: 68, width: 506, height: 24, zIndex: 2, content: "ACADEMIC REPORT CARD",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 11, fontWeight: "bold", textAlign: "left", color: "rgba(255,255,255,0.7)", letterSpacing: 2 },
      },
      // Student info box
      {
        id: uid(), type: "table", x: 40, y: 140, width: W, height: 160, zIndex: 1,
        tableData: {
          rows: 4, cols: 4, headerRow: false, cellPadding: 8, borderWidth: 1, borderColor: "#E2E8F0",
          cells: [
            ["Student Name", "{{student_name}}", "Exam", "{{rc_exam_name}}"],
            ["Admission No.", "{{admission_number}}", "Academic Year", "{{rc_academic_year}}"],
            ["Class / Section", "{{class}} - {{section}}", "Roll Number", "{{roll_number}}"],
            ["Father's Name", "{{father_name}}", "Mother's Name", "{{mother_name}}"],
          ],
        },
      },
      // Marks table header
      {
        id: uid(), type: "heading", x: 40, y: 316, width: W, height: 28, zIndex: 1, content: "SUBJECT-WISE MARKS",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 11, fontWeight: "bold", color: "#1E3A5F", backgroundColor: "#EFF6FF", textAlign: "left", letterSpacing: 1.5, paddingLeft: 12 },
      },
      // Marks table (pre-filled via auto-fill logic)
      {
        id: uid(), type: "table", x: 40, y: 344, width: W, height: 240, zIndex: 1,
        tableData: {
          rows: 6, cols: 5, headerRow: true, cellPadding: 9, borderWidth: 1, borderColor: "#E2E8F0",
          cells: [
            ["Subject", "Max Marks", "Marks Obtained", "Grade", "Status"],
            ["[Subject 1]", "100", "{{rc_obtained_marks}}", "{{rc_grade}}", "{{rc_result_status}}"],
            ["[Subject 2]", "100", "--", "--", "--"],
            ["[Subject 3]", "100", "--", "--", "--"],
            ["[Subject 4]", "100", "--", "--", "--"],
            ["TOTAL", "{{rc_total_marks}}", "{{rc_obtained_marks}}", "{{rc_grade}}", "{{rc_result_status}}"],
          ],
        },
      },
      // Summary row
      {
        id: uid(), type: "table", x: 40, y: 600, width: W, height: 60, zIndex: 1,
        tableData: {
          rows: 1, cols: 4, headerRow: false, cellPadding: 10, borderWidth: 1, borderColor: "#E2E8F0",
          cells: [["Percentage: {{rc_percentage}}%", "Grade: {{rc_grade}}", "Rank: {{rc_rank}}", "Result: {{rc_result_status}}"]],
        },
      },
      // Remarks
      {
        id: uid(), type: "paragraph", x: 40, y: 676, width: W, height: 50, zIndex: 1, content: "Teacher Remarks: {{rc_teacher_remarks}}",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 12, color: "#334155" },
      },
      // Signatures
      {
        id: uid(), type: "paragraph", x: 40, y: 760, width: 200, height: 56, zIndex: 1,
        content: "________________________\nClass Teacher",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 11, textAlign: "center" },
      },
      {
        id: uid(), type: "paragraph", x: 280, y: 760, width: 200, height: 56, zIndex: 1,
        content: "________________________\nExam Controller",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 11, textAlign: "center" },
      },
      {
        id: uid(), type: "paragraph", x: 520, y: 760, width: 200, height: 56, zIndex: 1,
        content: "________________________\nPrincipal",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 11, textAlign: "center" },
      },
    ],
  };
}

// ─── Report Card — Modern ─────────────────────────────────────────────────────

function rcModernPage(): CanvasPage {
  const W = 714;
  return {
    id: uid(),
    elements: [
      // Top color bar
      {
        id: uid(), type: "shape", x: 0, y: 0, width: 794, height: 8, zIndex: 0, content: "",
        textStyle: { ...DEFAULT_TEXT_STYLE, backgroundColor: "#6366F1", paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 },
      },
      // School name
      {
        id: uid(), type: "heading", x: 40, y: 30, width: W, height: 36, zIndex: 1, content: "{{school_name}}",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 22, fontWeight: "bold", textAlign: "center", color: "#1E293B" },
      },
      {
        id: uid(), type: "subheading", x: 40, y: 66, width: W, height: 22, zIndex: 1, content: "STUDENT REPORT CARD • {{rc_academic_year}}",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 11, textAlign: "center", color: "#6366F1", letterSpacing: 2 },
      },
      divider(uid(), 96, 794),
      // Two-column info
      {
        id: uid(), type: "paragraph", x: 40, y: 114, width: 340, height: 120, zIndex: 1,
        content: "Student: {{student_name}}\nAdmission No: {{admission_number}}\nRoll No: {{roll_number}}\nFather: {{father_name}}",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 13, lineHeight: 1.9, color: "#1E293B" },
      },
      {
        id: uid(), type: "paragraph", x: 400, y: 114, width: 340, height: 120, zIndex: 1,
        content: "Class: {{class}} - {{section}}\nExam: {{rc_exam_name}}\nDate: {{current_date}}",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 13, lineHeight: 1.9, color: "#1E293B" },
      },
      divider(uid(), 248, 794),
      // Marks Table
      {
        id: uid(), type: "table", x: 40, y: 264, width: W, height: 260, zIndex: 1,
        tableData: {
          rows: 7, cols: 5, headerRow: true, cellPadding: 9, borderWidth: 1, borderColor: "#E2E8F0",
          cells: [
            ["Subject", "Max Marks", "Obtained", "Grade", "Result"],
            ["[Subject 1]", "100", "--", "--", "--"],
            ["[Subject 2]", "100", "--", "--", "--"],
            ["[Subject 3]", "100", "--", "--", "--"],
            ["[Subject 4]", "100", "--", "--", "--"],
            ["[Subject 5]", "100", "--", "--", "--"],
            ["AGGREGATE", "{{rc_total_marks}}", "{{rc_obtained_marks}}", "{{rc_grade}}", "{{rc_result_status}}"],
          ],
        },
      },
      // Score cards
      {
        id: uid(), type: "table", x: 40, y: 540, width: W, height: 56, zIndex: 1,
        tableData: {
          rows: 1, cols: 4, headerRow: false, cellPadding: 10, borderWidth: 1, borderColor: "#E2E8F0",
          cells: [["Percentage: {{rc_percentage}}%", "Grade: {{rc_grade}}", "Rank: {{rc_rank}}", "Result: {{rc_result_status}}"]],
        },
      },
      {
        id: uid(), type: "paragraph", x: 40, y: 614, width: W, height: 44, zIndex: 1,
        content: "Remarks: {{rc_teacher_remarks}}",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 12, color: "#475569" },
      },
      {
        id: uid(), type: "paragraph", x: 40, y: 780, width: 200, height: 52, zIndex: 1,
        content: "________________\nClass Teacher", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 11, textAlign: "center" },
      },
      {
        id: uid(), type: "paragraph", x: 520, y: 780, width: 200, height: 52, zIndex: 1,
        content: "________________\nPrincipal", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 11, textAlign: "center" },
      },
    ],
  };
}

// ─── Report Card — CBSE Style ─────────────────────────────────────────────────

function rcCBSEPage(): CanvasPage {
  const W = 714;
  return {
    id: uid(),
    elements: [
      logo(uid(), 362, 30),
      {
        id: uid(), type: "heading", x: 40, y: 28, width: W, height: 36, zIndex: 1, content: "{{school_name}}",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 20, fontWeight: "bold", textAlign: "center", color: "#1E3A5F" },
      },
      {
        id: uid(), type: "subheading", x: 40, y: 66, width: W, height: 20, zIndex: 1,
        content: "Affiliated to CBSE, New Delhi | Affil. No: XXXXXXXX",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 10, textAlign: "center", color: "#64748B" },
      },
      divider(uid(), 96, 794),
      {
        id: uid(), type: "heading", x: 40, y: 110, width: W, height: 28, zIndex: 1,
        content: "REPORT CARD — {{rc_academic_year}}",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 14, fontWeight: "bold", textAlign: "center", color: "#1E3A5F", letterSpacing: 1 },
      },
      divider(uid(), 148, 794),
      {
        id: uid(), type: "table", x: 40, y: 162, width: W, height: 140, zIndex: 1,
        tableData: {
          rows: 4, cols: 4, headerRow: false, cellPadding: 8, borderWidth: 1, borderColor: "#CBD5E1",
          cells: [
            ["Name of Student:", "{{student_name}}", "Admission No.:", "{{admission_number}}"],
            ["Class & Section:", "{{class}} - {{section}}", "Roll No.:", "{{roll_number}}"],
            ["Exam:", "{{rc_exam_name}}", "Session:", "{{rc_academic_year}}"],
            ["Father's Name:", "{{father_name}}", "Mother's Name:", "{{mother_name}}"],
          ],
        },
      },
      {
        id: uid(), type: "heading", x: 40, y: 318, width: W, height: 26, zIndex: 1, content: "ACADEMIC PERFORMANCE",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 11, fontWeight: "bold", color: "#1E3A5F", textAlign: "center", backgroundColor: "#DBEAFE", letterSpacing: 1 },
      },
      {
        id: uid(), type: "table", x: 40, y: 344, width: W, height: 280, zIndex: 1,
        tableData: {
          rows: 8, cols: 6, headerRow: true, cellPadding: 8, borderWidth: 1, borderColor: "#CBD5E1",
          cells: [
            ["Subject", "Max Marks", "Marks Obtained", "% Marks", "Grade", "Remarks"],
            ["[Subject 1]", "100", "--", "--", "--", ""],
            ["[Subject 2]", "100", "--", "--", "--", ""],
            ["[Subject 3]", "100", "--", "--", "--", ""],
            ["[Subject 4]", "100", "--", "--", "--", ""],
            ["[Subject 5]", "100", "--", "--", "--", ""],
            ["[Subject 6]", "100", "--", "--", "--", ""],
            ["TOTAL", "{{rc_total_marks}}", "{{rc_obtained_marks}}", "{{rc_percentage}}%", "{{rc_grade}}", "{{rc_result_status}}"],
          ],
        },
      },
      {
        id: uid(), type: "table", x: 40, y: 638, width: W, height: 52, zIndex: 1,
        tableData: {
          rows: 1, cols: 3, headerRow: false, cellPadding: 10, borderWidth: 1, borderColor: "#CBD5E1",
          cells: [["Overall Percentage: {{rc_percentage}}%", "Grade: {{rc_grade}}", "Result: {{rc_result_status}}"]],
        },
      },
      {
        id: uid(), type: "paragraph", x: 40, y: 710, width: W, height: 36, zIndex: 1,
        content: "Teacher's Remarks: {{rc_teacher_remarks}}",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 12, color: "#334155" },
      },
      {
        id: uid(), type: "paragraph", x: 40, y: 780, width: 180, height: 52, zIndex: 1,
        content: "________________\nClass Teacher", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 11, textAlign: "center" },
      },
      {
        id: uid(), type: "paragraph", x: 260, y: 780, width: 180, height: 52, zIndex: 1,
        content: "________________\nExam Incharge", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 11, textAlign: "center" },
      },
      {
        id: uid(), type: "paragraph", x: 480, y: 780, width: 200, height: 52, zIndex: 1,
        content: "________________\nPrincipal", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 11, textAlign: "center" },
      },
    ],
  };
}

// ─── Report Card — Primary School ───────────────────────────────────────────────

function rcPrimaryPage(): CanvasPage {
  const W = 714;
  return {
    id: uid(),
    elements: [
      // Top colorful soft bar
      {
        id: uid(), type: "shape", x: 0, y: 0, width: 794, height: 12, zIndex: 0, content: "",
        textStyle: { ...DEFAULT_TEXT_STYLE, backgroundColor: "#0D9488", paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 },
      },
      // Logo
      { id: uid(), type: "logo", x: 40, y: 32, width: 64, height: 64, zIndex: 1, content: "/logo.png", imageStyle: { ...DEFAULT_IMAGE_STYLE } },
      // School Name
      {
        id: uid(), type: "heading", x: 120, y: 32, width: 634, height: 36, zIndex: 1, content: "{{school_name}}",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 20, fontWeight: "bold", textAlign: "left", color: "#0F766E" },
      },
      {
        id: uid(), type: "subheading", x: 120, y: 68, width: 634, height: 22, zIndex: 1, content: "PRIMARY REPORT CARD • {{academic_year}}",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 10, fontWeight: "bold", textAlign: "left", color: "#0D9488", letterSpacing: 2 },
      },
      divider(uid(), 110, 794),
      // Student details in a soft card layout
      {
        id: uid(), type: "table", x: 40, y: 130, width: W, height: 130, zIndex: 1,
        tableData: {
          rows: 3, cols: 4, headerRow: false, cellPadding: 8, borderWidth: 1, borderColor: "#E2E8F0",
          cells: [
            ["Student Name:", "{{student_name}}", "Admission No:", "{{admission_number}}"],
            ["Class & Section:", "{{class}} - {{section}}", "Roll Number:", "{{roll_number}}"],
            ["Exam:", "{{exam_name}}", "Date:", "{{generated_date}}"],
          ],
        },
      },
      // Marks Section Heading
      {
        id: uid(), type: "heading", x: 40, y: 280, width: W, height: 26, zIndex: 1, content: "MY LEARNING PROGRESS",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 10, fontWeight: "bold", color: "#FFFFFF", backgroundColor: "#0D9488", textAlign: "center", letterSpacing: 2, paddingTop: 6 },
      },
      // Marks Table
      {
        id: uid(), type: "table", x: 40, y: 306, width: W, height: 200, zIndex: 1,
        tableData: {
          rows: 6, cols: 4, headerRow: true, cellPadding: 9, borderWidth: 1, borderColor: "#E2E8F0",
          cells: [
            ["Subject", "Max Marks", "Obtained Marks", "Grade"],
            ["[Subject 1]", "100", "--", "--"],
            ["[Subject 2]", "100", "--", "--"],
            ["[Subject 3]", "100", "--", "--"],
            ["[Subject 4]", "100", "--", "--"],
            ["TOTAL", "{{total_marks}}", "{{obtained_marks}}", "{{overall_grade}}"],
          ],
        },
      },
      // Score Cards - Primary styled
      {
        id: uid(), type: "table", x: 40, y: 530, width: W, height: 50, zIndex: 1,
        tableData: {
          rows: 1, cols: 3, headerRow: false, cellPadding: 10, borderWidth: 1, borderColor: "#2DD4BF",
          cells: [["Score: {{percentage}}%", "Grade: {{overall_grade}}", "Status: {{result_status}}"]],
        },
      },
      // Remarks Section
      {
        id: uid(), type: "paragraph", x: 40, y: 600, width: W, height: 50, zIndex: 1,
        content: "Teacher Remarks: {{teacher_remarks}}",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 12, color: "#1F2937" },
      },
      {
        id: uid(), type: "paragraph", x: 40, y: 660, width: W, height: 50, zIndex: 1,
        content: "Principal Remarks: {{principal_remarks}}",
        textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 12, color: "#1F2937" },
      },
      // Signatures
      {
        id: uid(), type: "paragraph", x: 40, y: 760, width: 150, height: 50, zIndex: 1,
        content: "________________\nClass Teacher", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 11, textAlign: "center" },
      },
      {
        id: uid(), type: "paragraph", x: 230, y: 760, width: 150, height: 50, zIndex: 1,
        content: "________________\nPrincipal", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 11, textAlign: "center" },
      },
      {
        id: uid(), type: "paragraph", x: 420, y: 760, width: 150, height: 50, zIndex: 1,
        content: "________________\nParent", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 11, textAlign: "center" },
      },
      {
        id: uid(), type: "paragraph", x: 600, y: 760, width: 150, height: 50, zIndex: 1,
        content: "[ School Seal ]", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 11, textAlign: "center", color: "#9CA3AF" },
      },
      // Bottom footer bar
      {
        id: uid(), type: "shape", x: 0, y: 1108, width: 794, height: 15, zIndex: 0, content: "",
        textStyle: { ...DEFAULT_TEXT_STYLE, backgroundColor: "#0F766E", paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 },
      },
    ],
  };
}

// ─── Template Registry ────────────────────────────────────────────────────────

export const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  // ── Report Card Templates ──────────────────────────────────────────────────
  {
    id: "rc-classic",
    categoryId: "report_card",
    name: "Classic Report Card",
    orientation: "portrait",
    pageSize: "A4",
    description: "Traditional report card with header band, info grid and signature footer",
    thumbnailBg: "linear-gradient(135deg, #1E3A5F 0%, #162C47 100%)",
    thumbnailAccent: "#FFD700",
    defaultPages: [rcClassicPage()],
  },
  {
    id: "rc-modern",
    categoryId: "report_card",
    name: "Modern Report Card",
    orientation: "portrait",
    pageSize: "A4",
    description: "Clean, contemporary layout with indigo accents and emoji score cards",
    thumbnailBg: "linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)",
    thumbnailAccent: "#A5B4FC",
    defaultPages: [rcModernPage()],
  },
  {
    id: "rc-cbse",
    categoryId: "report_card",
    name: "CBSE Style Report Card",
    orientation: "portrait",
    pageSize: "A4",
    description: "6-column subject table following CBSE report card format",
    thumbnailBg: "linear-gradient(135deg, #0F766E 0%, #0D5F57 100%)",
    thumbnailAccent: "#5EEAD4",
    defaultPages: [rcCBSEPage()],
  },
  {
    id: "rc-primary",
    categoryId: "report_card",
    name: "Primary School Report Card",
    orientation: "portrait",
    pageSize: "A4",
    description: "Soft, colorful layout with large grades and focus on teacher feedback",
    thumbnailBg: "linear-gradient(135deg, #0D9488 0%, #0F766E 100%)",
    thumbnailAccent: "#2DD4BF",
    defaultPages: [rcPrimaryPage()],
  },
  {
    id: "rc-blank",
    categoryId: "report_card",
    name: "Blank Report Card",
    orientation: "portrait",
    pageSize: "A4",
    description: "Empty canvas — build your own report card design from scratch",
    thumbnailBg: "linear-gradient(135deg, #475569 0%, #334155 100%)",
    thumbnailAccent: "#94A3B8",
    defaultPages: [blankPage()],
  },

  {
    id: "bonafide-classic",
    categoryId: "student",
    name: "Bonafide Certificate",
    orientation: "portrait",
    pageSize: "A4",
    description: "Classic enrollment proof with watermark and signature areas",
    thumbnailBg: "linear-gradient(135deg, #1E3A5F 0%, #162C47 100%)",
    thumbnailAccent: "#FFD700",
    defaultPages: [bonafidePage()],
  },
  {
    id: "character-classic",
    categoryId: "student",
    name: "Character Certificate",
    orientation: "portrait",
    pageSize: "A4",
    description: "Formal character and conduct certificate",
    thumbnailBg: "linear-gradient(135deg, #0f5132 0%, #084124 100%)",
    thumbnailAccent: "#b8860b",
    defaultPages: [characterPage()],
  },
  {
    id: "tc-classic",
    categoryId: "student",
    name: "Transfer Certificate",
    orientation: "portrait",
    pageSize: "A4",
    description: "TC with all required fields in tabular form",
    thumbnailBg: "linear-gradient(135deg, #6b1e2b 0%, #4a1520 100%)",
    thumbnailAccent: "#c9a227",
    defaultPages: [tcPage()],
  },
  {
    id: "student-blank",
    categoryId: "student",
    name: "Blank Layout",
    orientation: "portrait",
    pageSize: "A4",
    description: "Empty canvas — start from scratch",
    thumbnailBg: "linear-gradient(135deg, #475569 0%, #334155 100%)",
    thumbnailAccent: "#94a3b8",
    defaultPages: [blankPage()],
  },
  {
    id: "notice-modern",
    categoryId: "notice",
    name: "Modern Notice",
    orientation: "portrait",
    pageSize: "A4",
    description: "Clean, modern notice with bold title",
    thumbnailBg: "linear-gradient(135deg, #0e7490 0%, #0c5f75 100%)",
    thumbnailAccent: "#67e8f9",
    defaultPages: [noticeModernPage()],
  },
  {
    id: "notice-blank",
    categoryId: "notice",
    name: "Blank Notice",
    orientation: "portrait",
    pageSize: "A4",
    description: "Blank canvas for a notice",
    thumbnailBg: "linear-gradient(135deg, #475569 0%, #334155 100%)",
    thumbnailAccent: "#94a3b8",
    defaultPages: [blankPage()],
  },
  {
    id: "letter-professional",
    categoryId: "letter",
    name: "Professional Letter",
    orientation: "portrait",
    pageSize: "A4",
    description: "Formal professional letter with letterhead",
    thumbnailBg: "linear-gradient(135deg, #3730a3 0%, #2e27a0 100%)",
    thumbnailAccent: "#a5b4fc",
    defaultPages: [letterProfessionalPage()],
  },
  {
    id: "letter-blank",
    categoryId: "letter",
    name: "Blank Letter",
    orientation: "portrait",
    pageSize: "A4",
    description: "Blank canvas for a letter",
    thumbnailBg: "linear-gradient(135deg, #475569 0%, #334155 100%)",
    thumbnailAccent: "#94a3b8",
    defaultPages: [blankPage()],
  },
  {
    id: "circular-official",
    categoryId: "circular",
    name: "Official Circular",
    orientation: "portrait",
    pageSize: "A4",
    description: "Official school circular template",
    thumbnailBg: "linear-gradient(135deg, #92400e 0%, #78350f 100%)",
    thumbnailAccent: "#fbbf24",
    defaultPages: [circularPage()],
  },
  {
    id: "circular-blank",
    categoryId: "circular",
    name: "Blank Circular",
    orientation: "portrait",
    pageSize: "A4",
    description: "Blank canvas for a circular",
    thumbnailBg: "linear-gradient(135deg, #475569 0%, #334155 100%)",
    thumbnailAccent: "#94a3b8",
    defaultPages: [blankPage()],
  },
  {
    id: "fee-receipt",
    categoryId: "fees",
    name: "Fee Receipt",
    orientation: "portrait",
    pageSize: "A4",
    description: "Standard fee receipt with table",
    thumbnailBg: "linear-gradient(135deg, #4c1d95 0%, #3b1578 100%)",
    thumbnailAccent: "#c4b5fd",
    defaultPages: [feeReceiptPage()],
  },
  {
    id: "fees-blank",
    categoryId: "fees",
    name: "Blank Receipt",
    orientation: "portrait",
    pageSize: "A4",
    description: "Blank canvas for fees documents",
    thumbnailBg: "linear-gradient(135deg, #475569 0%, #334155 100%)",
    thumbnailAccent: "#94a3b8",
    defaultPages: [blankPage()],
  },
  {
    id: "experience-cert",
    categoryId: "teacher",
    name: "Experience Certificate",
    orientation: "portrait",
    pageSize: "A4",
    description: "Experience certificate for staff and teachers",
    thumbnailBg: "linear-gradient(135deg, #064e3b 0%, #043d2e 100%)",
    thumbnailAccent: "#6ee7b7",
    defaultPages: [experiencePage()],
  },
  {
    id: "teacher-blank",
    categoryId: "teacher",
    name: "Blank Layout",
    orientation: "portrait",
    pageSize: "A4",
    description: "Empty canvas for teacher documents",
    thumbnailBg: "linear-gradient(135deg, #475569 0%, #334155 100%)",
    thumbnailAccent: "#94a3b8",
    defaultPages: [blankPage()],
  },
  {
    id: "certificate-general",
    categoryId: "certificate",
    name: "General Certificate",
    orientation: "portrait",
    pageSize: "A4",
    description: "Generic award / achievement certificate",
    thumbnailBg: "linear-gradient(135deg, #78350f 0%, #5c2907 100%)",
    thumbnailAccent: "#fcd34d",
    defaultPages: [bonafidePage()],
  },
  {
    id: "certificate-blank",
    categoryId: "certificate",
    name: "Blank Certificate",
    orientation: "portrait",
    pageSize: "A4",
    description: "Blank canvas for a certificate",
    thumbnailBg: "linear-gradient(135deg, #475569 0%, #334155 100%)",
    thumbnailAccent: "#94a3b8",
    defaultPages: [blankPage()],
  },
  {
    id: "exam-blank",
    categoryId: "exam",
    name: "Blank Exam Doc",
    orientation: "portrait",
    pageSize: "A4",
    description: "Blank canvas for exam-related documents",
    thumbnailBg: "linear-gradient(135deg, #9f1239 0%, #7f0f2c 100%)",
    thumbnailAccent: "#fca5a5",
    defaultPages: [blankPage()],
  },
  {
    id: "blank-a4",
    categoryId: "blank",
    name: "Blank A4",
    orientation: "portrait",
    pageSize: "A4",
    description: "Completely empty A4 canvas",
    thumbnailBg: "linear-gradient(135deg, #475569 0%, #334155 100%)",
    thumbnailAccent: "#94a3b8",
    defaultPages: [blankPage()],
  },
];

export function getTemplatesForCategory(categoryId: string): TemplateDefinition[] {
  return TEMPLATE_DEFINITIONS.filter((t) => t.categoryId === categoryId);
}

export function getTemplate(id: string): TemplateDefinition | undefined {
  return TEMPLATE_DEFINITIONS.find((t) => t.id === id);
}
