// ─── Variable Definitions — Document Builder Phase-4 ─────────────────────────
// All built-in variable categories and their variables.
// No dependency on any ERP module.

export interface VariableDefinition {
  key: string;          // e.g. "student.name"
  label: string;        // e.g. "Student Name"
  category: string;     // e.g. "Student"
  categoryId: string;   // e.g. "student"
  description: string;
  previewValue: string; // sample value shown in preview mode
  dataType: "text" | "number" | "date" | "image" | "boolean";
}

export interface VariableCategory {
  id: string;
  label: string;
  icon: string;         // emoji icon
  color: string;        // accent color
  variables: VariableDefinition[];
}

// ─── All Variable Categories ──────────────────────────────────────────────────

export const VARIABLE_CATEGORIES: VariableCategory[] = [
  {
    id: "student",
    label: "Student",
    icon: "🎓",
    color: "#2563EB",
    variables: [
      { key: "student.name",             label: "Student Name",        category: "Student", categoryId: "student", description: "Full name of the student",                   previewValue: "Rahul Sharma",              dataType: "text"   },
      { key: "student.admission_number", label: "Admission Number",    category: "Student", categoryId: "student", description: "Unique admission identifier",                previewValue: "ADM-2024-0042",             dataType: "text"   },
      { key: "student.roll_number",      label: "Roll Number",         category: "Student", categoryId: "student", description: "Roll number in the class",                   previewValue: "23",                        dataType: "number" },
      { key: "student.gender",           label: "Gender",              category: "Student", categoryId: "student", description: "Gender of the student",                      previewValue: "Male",                      dataType: "text"   },
      { key: "student.dob",              label: "Date of Birth",       category: "Student", categoryId: "student", description: "Student's date of birth",                    previewValue: "12 March 2010",             dataType: "date"   },
      { key: "student.blood_group",      label: "Blood Group",         category: "Student", categoryId: "student", description: "Blood group",                                previewValue: "B+",                        dataType: "text"   },
      { key: "student.phone",            label: "Phone",               category: "Student", categoryId: "student", description: "Contact phone number",                       previewValue: "+91 98765 43210",           dataType: "text"   },
      { key: "student.email",            label: "Email",               category: "Student", categoryId: "student", description: "Email address",                              previewValue: "rahul@example.com",         dataType: "text"   },
      { key: "student.photo",            label: "Photo",               category: "Student", categoryId: "student", description: "Student passport photo",                     previewValue: "/sample-student.jpg",       dataType: "image"  },
      { key: "student.address",          label: "Address",             category: "Student", categoryId: "student", description: "Residential address",                        previewValue: "12, MG Road, Bengaluru",    dataType: "text"   },
      { key: "student.class",            label: "Class",               category: "Student", categoryId: "student", description: "Class / Grade enrolled in",                  previewValue: "10",                        dataType: "text"   },
      { key: "student.section",          label: "Section",             category: "Student", categoryId: "student", description: "Section of the class",                       previewValue: "A",                         dataType: "text"   },
      { key: "student.house",            label: "House",               category: "Student", categoryId: "student", description: "House name",                                 previewValue: "Blue House",                dataType: "text"   },
      { key: "student.transport",        label: "Transport",           category: "Student", categoryId: "student", description: "Transport route / mode",                     previewValue: "Route 5 — Bus",             dataType: "text"   },
      { key: "student.aadhaar",          label: "Aadhaar",             category: "Student", categoryId: "student", description: "Aadhaar card number",                        previewValue: "XXXX-XXXX-4321",            dataType: "text"   },
      { key: "student.religion",         label: "Religion",            category: "Student", categoryId: "student", description: "Religion",                                   previewValue: "Hindu",                     dataType: "text"   },
      { key: "student.category",         label: "Category",            category: "Student", categoryId: "student", description: "Social category (General / OBC / SC / ST)", previewValue: "General",                   dataType: "text"   },
      { key: "student.nationality",      label: "Nationality",         category: "Student", categoryId: "student", description: "Nationality",                                previewValue: "Indian",                    dataType: "text"   },
    ],
  },
  {
    id: "parent",
    label: "Parent",
    icon: "👨‍👩‍👧",
    color: "#0891B2",
    variables: [
      { key: "parent.father_name",        label: "Father Name",         category: "Parent", categoryId: "parent", description: "Father's full name",          previewValue: "Suresh Sharma",       dataType: "text" },
      { key: "parent.mother_name",        label: "Mother Name",         category: "Parent", categoryId: "parent", description: "Mother's full name",          previewValue: "Sunita Sharma",       dataType: "text" },
      { key: "parent.guardian_name",      label: "Guardian Name",       category: "Parent", categoryId: "parent", description: "Guardian's name",             previewValue: "Suresh Sharma",       dataType: "text" },
      { key: "parent.guardian_phone",     label: "Guardian Phone",      category: "Parent", categoryId: "parent", description: "Guardian's phone number",     previewValue: "+91 98765 43210",     dataType: "text" },
      { key: "parent.guardian_email",     label: "Guardian Email",      category: "Parent", categoryId: "parent", description: "Guardian's email address",    previewValue: "suresh@example.com",  dataType: "text" },
      { key: "parent.guardian_occupation",label: "Guardian Occupation", category: "Parent", categoryId: "parent", description: "Occupation of the guardian",  previewValue: "Engineer",            dataType: "text" },
    ],
  },
  {
    id: "teacher",
    label: "Teacher",
    icon: "👩‍🏫",
    color: "#059669",
    variables: [
      { key: "teacher.name",        label: "Teacher Name",  category: "Teacher", categoryId: "teacher", description: "Full name of the teacher",     previewValue: "Mrs. Priya Kapoor",    dataType: "text" },
      { key: "teacher.employee_id", label: "Employee ID",   category: "Teacher", categoryId: "teacher", description: "Employee identification number", previewValue: "EMP-2021-007",         dataType: "text" },
      { key: "teacher.designation", label: "Designation",   category: "Teacher", categoryId: "teacher", description: "Job title",                     previewValue: "Senior Teacher",       dataType: "text" },
      { key: "teacher.department",  label: "Department",    category: "Teacher", categoryId: "teacher", description: "Department / Subject area",     previewValue: "Science",              dataType: "text" },
      { key: "teacher.qualification",label: "Qualification",category: "Teacher", categoryId: "teacher", description: "Educational qualifications",    previewValue: "M.Sc., B.Ed.",         dataType: "text" },
      { key: "teacher.email",       label: "Email",         category: "Teacher", categoryId: "teacher", description: "Official email address",        previewValue: "priya@school.edu",     dataType: "text" },
      { key: "teacher.phone",       label: "Phone",         category: "Teacher", categoryId: "teacher", description: "Contact number",               previewValue: "+91 87654 32109",      dataType: "text" },
      { key: "teacher.joining_date",label: "Joining Date",  category: "Teacher", categoryId: "teacher", description: "Date of joining the school",   previewValue: "01 August 2018",       dataType: "date" },
    ],
  },
  {
    id: "school",
    label: "School",
    icon: "🏫",
    color: "#7C3AED",
    variables: [
      { key: "school.logo",              label: "School Logo",        category: "School", categoryId: "school", description: "Official school logo image",        previewValue: "/school-logo.png",              dataType: "image"  },
      { key: "school.name",              label: "School Name",        category: "School", categoryId: "school", description: "Official name of the school",       previewValue: "Sunrise Public School",         dataType: "text"   },
      { key: "school.address",           label: "Address",            category: "School", categoryId: "school", description: "School's full postal address",      previewValue: "123, Knowledge Park, Delhi",    dataType: "text"   },
      { key: "school.phone",             label: "Phone",              category: "School", categoryId: "school", description: "School contact number",             previewValue: "+91 11 2345 6789",              dataType: "text"   },
      { key: "school.email",             label: "Email",              category: "School", categoryId: "school", description: "Official school email",             previewValue: "info@sunriseschool.edu",        dataType: "text"   },
      { key: "school.website",           label: "Website",            category: "School", categoryId: "school", description: "School website URL",               previewValue: "www.sunriseschool.edu",         dataType: "text"   },
      { key: "school.affiliation_number",label: "Affiliation Number", category: "School", categoryId: "school", description: "CBSE / Board affiliation number",  previewValue: "2730142",                       dataType: "text"   },
      { key: "school.board",             label: "Board",              category: "School", categoryId: "school", description: "Examination board",                previewValue: "CBSE",                          dataType: "text"   },
      { key: "school.principal_name",    label: "Principal Name",     category: "School", categoryId: "school", description: "Name of the principal",            previewValue: "Dr. Anand Verma",               dataType: "text"   },
    ],
  },
  {
    id: "academic",
    label: "Academic",
    icon: "📚",
    color: "#D97706",
    variables: [
      { key: "academic.year",        label: "Academic Year",   category: "Academic", categoryId: "academic", description: "Current academic year",          previewValue: "2024–25",    dataType: "text" },
      { key: "academic.session",     label: "Session",         category: "Academic", categoryId: "academic", description: "Term / semester name",           previewValue: "Term I",     dataType: "text" },
      { key: "academic.class",       label: "Class",           category: "Academic", categoryId: "academic", description: "Class / Grade of the document",  previewValue: "10",         dataType: "text" },
      { key: "academic.section",     label: "Section",         category: "Academic", categoryId: "academic", description: "Section of the class",           previewValue: "A",          dataType: "text" },
      { key: "academic.roll_number", label: "Roll Number",     category: "Academic", categoryId: "academic", description: "Class roll number",              previewValue: "23",         dataType: "number"},
      { key: "academic.house",       label: "House",           category: "Academic", categoryId: "academic", description: "House name (sports / academic)", previewValue: "Blue House", dataType: "text" },
    ],
  },
  {
    id: "exam",
    label: "Exam",
    icon: "📝",
    color: "#DC2626",
    variables: [
      { key: "exam.name",        label: "Exam Name",    category: "Exam", categoryId: "exam", description: "Name of the examination",         previewValue: "Annual Examination 2025",  dataType: "text"   },
      { key: "exam.date",        label: "Exam Date",    category: "Exam", categoryId: "exam", description: "Date of the examination",         previewValue: "15 March 2025",            dataType: "date"   },
      { key: "exam.result_date", label: "Result Date",  category: "Exam", categoryId: "exam", description: "Date of result declaration",      previewValue: "10 April 2025",            dataType: "date"   },
      { key: "exam.grade",       label: "Grade",        category: "Exam", categoryId: "exam", description: "Grade achieved",                  previewValue: "A+",                       dataType: "text"   },
      { key: "exam.percentage",  label: "Percentage",   category: "Exam", categoryId: "exam", description: "Overall percentage",              previewValue: "92.5%",                    dataType: "number" },
      { key: "exam.rank",        label: "Rank",         category: "Exam", categoryId: "exam", description: "Class rank",                      previewValue: "3",                        dataType: "number" },
      { key: "exam.remarks",     label: "Remarks",      category: "Exam", categoryId: "exam", description: "Examiner remarks / comments",    previewValue: "Excellent performance",    dataType: "text"   },
    ],
  },

  {
    id: "fees",
    label: "Fees",
    icon: "💰",
    color: "#7C3AED",
    variables: [
      { key: "fees.amount",         label: "Fee Amount",     category: "Fees", categoryId: "fees", description: "Total fee amount",            previewValue: "₹45,000",          dataType: "number" },
      { key: "fees.paid",           label: "Paid Amount",    category: "Fees", categoryId: "fees", description: "Amount paid so far",          previewValue: "₹30,000",          dataType: "number" },
      { key: "fees.pending",        label: "Pending Amount", category: "Fees", categoryId: "fees", description: "Amount remaining to be paid", previewValue: "₹15,000",          dataType: "number" },
      { key: "fees.due_date",       label: "Due Date",       category: "Fees", categoryId: "fees", description: "Fee payment due date",        previewValue: "30 June 2025",     dataType: "date"   },
      { key: "fees.receipt_number", label: "Receipt Number", category: "Fees", categoryId: "fees", description: "Receipt / challan number",   previewValue: "RCP-2025-00123",   dataType: "text"   },
    ],
  },
  {
    id: "salary",
    label: "Salary",
    icon: "💼",
    color: "#059669",
    variables: [
      { key: "salary.basic",       label: "Basic Salary",   category: "Salary", categoryId: "salary", description: "Basic salary component",       previewValue: "₹35,000",          dataType: "number" },
      { key: "salary.allowances",  label: "Allowances",     category: "Salary", categoryId: "salary", description: "Total allowances",             previewValue: "₹8,500",           dataType: "number" },
      { key: "salary.deductions",  label: "Deductions",     category: "Salary", categoryId: "salary", description: "Total deductions",             previewValue: "₹4,200",           dataType: "number" },
      { key: "salary.net",         label: "Net Salary",     category: "Salary", categoryId: "salary", description: "Net salary after deductions",  previewValue: "₹39,300",          dataType: "number" },
      { key: "salary.payment_date",label: "Payment Date",   category: "Salary", categoryId: "salary", description: "Date of salary disbursement",  previewValue: "28 June 2025",     dataType: "date"   },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: "⚙️",
    color: "#64748B",
    variables: [
      { key: "system.today",           label: "Today's Date",    category: "System", categoryId: "system", description: "Current date (auto-filled)",      previewValue: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }), dataType: "date"   },
      { key: "system.time",            label: "Current Time",    category: "System", categoryId: "system", description: "Current time (auto-filled)",      previewValue: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),              dataType: "text"   },
      { key: "system.current_user",    label: "Current User",    category: "System", categoryId: "system", description: "Logged-in user name",             previewValue: "Admin",                                                                                    dataType: "text"   },
      { key: "system.generated_by",   label: "Generated By",    category: "System", categoryId: "system", description: "Name of the document generator",  previewValue: "School ERP",                                                                               dataType: "text"   },
      { key: "system.generated_date", label: "Generated Date",  category: "System", categoryId: "system", description: "Date the document was generated", previewValue: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }), dataType: "date"   },
      { key: "system.document_number",label: "Document Number", category: "System", categoryId: "system", description: "Auto-generated document number",  previewValue: "DOC-2025-00042",                                                                           dataType: "text"   },
    ],
  },
];

// ─── All variables as a flat map for quick lookup ─────────────────────────────
export const VARIABLE_MAP: Map<string, VariableDefinition> = new Map(
  VARIABLE_CATEGORIES.flatMap((cat) => cat.variables.map((v) => [v.key, v]))
);

/** Find a variable definition by key. Returns undefined if not found (custom variable or unknown). */
export function findVariable(key: string): VariableDefinition | undefined {
  return VARIABLE_MAP.get(key);
}

/** Replace all {{key}} patterns in a string with their preview values. */
export function resolvePreviewValues(text: string, customVars?: Record<string, string>): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmed = key.trim();
    const builtIn = VARIABLE_MAP.get(trimmed);
    if (builtIn) return builtIn.previewValue;
    if (customVars?.[trimmed]) return customVars[trimmed];
    return match; // leave unresolved as-is
  });
}
