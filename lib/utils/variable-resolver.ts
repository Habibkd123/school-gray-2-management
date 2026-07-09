/**
 * variable-resolver.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Central utility that maps ERP data objects → flat Record<string, string>
 * for every variable key used in the Document Builder.
 *
 * Usage:
 *   const vars = resolveVariables({ student, class: classDoc, school, exam, results, payment, salary })
 *   // → { "student.name": "Rahul Sharma", "exam.percentage": "92%", ... }
 *
 * The resolved record is then encoded as base64 JSON and passed to the
 * builder via URL: /documents/builder/<id>?variables=<base64>
 *
 * The builder reads this on mount and replaces all variable elements.
 */

// ─── Context types (loosely typed to avoid deep model imports) ────────────────

export interface ResolverContext {
  student?:  Record<string, any>;        // IStudent + populated class_id
  teacher?:  Record<string, any>;        // ITeacher
  school?:   Record<string, any>;        // ISchool
  exam?:     Record<string, any>;        // IExam + populated class_id
  results?:  Record<string, any>[];      // IResult[] with subject populated
  payment?:  Record<string, any>;        // StudentFeePayment
  salary?:   Record<string, any>;        // SalaryPayment + teacher populated
  attendance?: { present: number; total: number; percentage: string };
  extra?:    Record<string, string>;     // Any additional overrides
}

// ─── Main helper functions ───────────────────────────────────────────────────

function fmt(val: any, fallback = ""): string {
  if (val === null || val === undefined || val === "" || val === "—" || val === "--") return fallback;
  return String(val);
}

function fmtDate(val: any, fallback = ""): string {
  if (!val) return fallback;
  try {
    return new Date(val).toLocaleDateString("en-IN", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch { return fallback; }
}

function fmtShortDate(val: any, fallback = ""): string {
  if (!val) return fallback;
  try {
    return new Date(val).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return fallback; }
}

function fmtCurrency(val: any, fallback = ""): string {
  if (val === null || val === undefined || val === "" || val === "—" || val === "--") return fallback;
  const n = Number(val);
  if (isNaN(n)) return fallback;
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtPercent(obtained: number, total: number): string {
  if (!total) return "";
  return `${((obtained / total) * 100).toFixed(2)}%`;
}

function capitalise(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ─── Main resolver ────────────────────────────────────────────────────────────

export function resolveVariables(ctx: ResolverContext): Record<string, string> {
  const now = new Date();
  const vars: Record<string, string> = {};

  // ── System variables ────────────────────────────────────────────────────────
  vars["system.date"]         = fmtDate(now);
  vars["system.date_short"]   = fmtShortDate(now);
  vars["system.time"]         = now.toLocaleTimeString("en-IN");
  vars["system.day"]          = now.toLocaleDateString("en-IN", { weekday: "long" });
  vars["system.month"]        = now.toLocaleDateString("en-IN", { month: "long" });
  vars["system.year"]         = String(now.getFullYear());
  vars["system.academic_year"] = ctx.student?.academic_year || ctx.exam?.academic_year || `${now.getFullYear()}-${now.getFullYear() + 1}`;

  // ── School variables (always populated, database or fallback mockup) ───────
  const s = ctx.school || {};
  vars["school.name"]          = fmt(s.name || "My School Life");
  vars["school.address"]       = fmt(s.address || "123 School Lane, Education City");
  vars["school.phone"]         = fmt(s.phone || s.contact_phone || "+91 98765 43210");
  vars["school.email"]         = fmt(s.email || s.contact_email || "info@myschoollife.edu");
  vars["school.website"]       = fmt(s.website || "www.myschoollife.edu");
  vars["school.principal"]     = fmt(s.principal_name || s.principal || "Dr. Rajesh Kumar");
  vars["school.affiliation"]   = fmt(s.affiliation_no || s.affiliation || "CBSE/AFF/2026");
  vars["school.establishment_year"] = fmt(s.established_year || s.establishment_year || "2015");
  vars["school.logo_url"]      = fmt(s.logo_url || s.logo || "/logo.png");
  vars["school.logo"]          = vars["school.logo_url"];
  vars["school.tagline"]       = fmt(s.tagline || "Nurturing Young Minds");
  vars["school.city"]          = fmt(s.city || "Education City");
  vars["school.state"]         = fmt(s.state || "Delhi");
  vars["school.pincode"]       = fmt(s.pincode || "110001");

  // ── Student variables ───────────────────────────────────────────────────────
  if (ctx.student) {
    const st = ctx.student;
    const cls = st.class_id;             // populated Class doc or null

    vars["student.name"]           = fmt(st.name);
    vars["student.first_name"]     = fmt(st.name?.split(" ")[0]);
    vars["student.admission_no"]   = fmt(st.admission_no);
    vars["student.admission_number"] = fmt(st.admission_no);
    vars["student.roll_no"]        = fmt(st.roll_no);
    vars["student.roll_number"]    = fmt(st.roll_no);
    vars["student.gender"]         = capitalise(fmt(st.gender));
    vars["student.dob"]            = fmtDate(st.dob);
    vars["student.dob_short"]      = fmtShortDate(st.dob);
    vars["student.blood_group"]    = fmt(st.blood_group);
    vars["student.phone"]          = fmt(st.phone);
    vars["student.email"]          = fmt(st.email);
    vars["student.address"]        = fmt(st.address);
    vars["student.photo_url"]      = fmt(st.photo_url);
    vars["student.photo"]          = fmt(st.photo_url);
    vars["student.academic_year"]  = fmt(st.academic_year);
    vars["student.religion"]       = fmt(st.religion);
    vars["student.category"]       = fmt(st.category);
    vars["student.aadhaar"]        = fmt(st.aadhaar_no);
    vars["student.house"]          = fmt(st.house);
    vars["student.admission_date"] = fmtDate(st.admission_date);
    vars["student.mother_tongue"]  = fmt(st.mother_tongue);

    vars["student.father_name"]    = fmt(st.father_name || st.guardian_name);
    vars["student.mother_name"]    = fmt(st.mother_name);
    vars["student.father_phone"]   = fmt(st.father_phone || st.guardian_phone);
    vars["student.mother_phone"]   = fmt(st.mother_phone);
    vars["student.father_occupation"] = fmt(st.father_occupation);
    vars["student.mother_occupation"] = fmt(st.mother_occupation);
    vars["student.guardian_name"]  = fmt(st.guardian_name);
    vars["student.guardian_phone"] = fmt(st.guardian_phone);
    vars["student.guardian_relation"] = fmt(st.guardian_relation);
    
    vars["parent.father_name"]          = vars["student.father_name"];
    vars["parent.mother_name"]          = vars["student.mother_name"];
    vars["parent.guardian_name"]        = vars["student.guardian_name"];
    vars["parent.guardian_phone"]       = vars["student.guardian_phone"];
    vars["parent.guardian_email"]       = fmt(st.guardian_email || st.email);
    vars["parent.guardian_occupation"]  = vars["student.father_occupation"];
    vars["parent.father_phone"]         = vars["student.father_phone"];
    vars["parent.mother_phone"]         = vars["student.mother_phone"];
    vars["parent.father_occupation"]    = vars["student.father_occupation"];
    vars["parent.mother_occupation"]    = vars["student.mother_occupation"];

    if (cls && typeof cls === "object") {
      vars["student.class"]   = fmt(cls.name);
      vars["student.section"] = fmt(cls.section);
      vars["student.class_section"] = `${fmt(cls.name)}${cls.section ? `-${cls.section}` : ""}`;
    } else {
      vars["student.class"]         = "";
      vars["student.section"]       = "";
      vars["student.class_section"] = "";
    }
  }

  // ── Teacher variables ───────────────────────────────────────────────────────
  if (ctx.teacher) {
    const t = ctx.teacher;
    vars["teacher.name"]             = fmt(t.name);
    vars["teacher.employee_id"]      = fmt(t.employee_id);
    vars["teacher.designation"]      = fmt(t.designation);
    vars["teacher.department"]       = fmt(t.department);
    vars["teacher.qualification"]    = fmt(t.qualification);
    vars["teacher.subject"]          = fmt(t.subject_specialization);
    vars["teacher.phone"]            = fmt(t.phone);
    vars["teacher.email"]            = fmt(t.email);
    vars["teacher.address"]          = fmt(t.address);
    vars["teacher.gender"]           = capitalise(fmt(t.gender));
    vars["teacher.dob"]              = fmtDate(t.dob);
    vars["teacher.join_date"]        = fmtDate(t.join_date);
    vars["teacher.experience"]       = `${fmt(t.experience_years)} years`;
    vars["teacher.photo_url"]        = fmt(t.photo_url);
    vars["teacher.basic_salary"]     = fmtCurrency(t.basic_salary);
    vars["teacher.contract_type"]    = fmt(t.contract_type);
    vars["teacher.pan_number"]       = fmt(t.pan_number);
    vars["teacher.epf_no"]           = fmt(t.epf_no);
    vars["teacher.bank_name"]        = fmt(t.bank_name);
    vars["teacher.account_number"]   = fmt(t.account_number);
    vars["teacher.ifsc_code"]        = fmt(t.ifsc_code);
    vars["teacher.father_name"]      = fmt(t.father_name);
    vars["teacher.aadhaar_front"]    = fmt(t.aadhaar_front_url);
  }

  // ── Exam / Result variables ─────────────────────────────────────────────────
  if (ctx.exam) {
    const e = ctx.exam;
    const cls = e.class_id;
    vars["exam.name"]          = fmt(e.name);
    vars["exam.type"]          = fmt(e.type);
    vars["exam.academic_year"] = fmt(e.academic_year);
    vars["exam.start_date"]    = fmtDate(e.start_date);
    vars["exam.end_date"]      = fmtDate(e.end_date);
    vars["exam.class"]         = cls && typeof cls === "object" ? fmt(cls.name) : "";
    vars["exam.section"]       = cls && typeof cls === "object" ? fmt(cls.section) : "";
    vars["exam.status"]        = fmt(e.status);
    
    vars["exam.date"]          = fmtDate(e.start_date);
    vars["exam.term"]          = fmt(e.type);
    vars["exam.session"]       = fmt(e.academic_year);
  }

  if (ctx.results && ctx.results.length > 0) {
    const results = ctx.results;
    let totalObtained = 0;
    let totalMaximum = 0;
    let allPass = true;

    results.forEach((r, i) => {
      const subj = r.subject_id && typeof r.subject_id === "object"
        ? r.subject_id
        : { name: `Subject ${i + 1}` };
      const idx = i + 1;
      vars[`result.subject_${idx}_name`]    = fmt(subj.name);
      vars[`result.subject_${idx}_obtained`] = fmt(r.marks_obtained);
      vars[`result.subject_${idx}_total`]   = fmt(r.total_marks);
      vars[`result.subject_${idx}_grade`]   = fmt(r.grade);
      vars[`result.subject_${idx}_status`]  = r.is_pass ? "Pass" : "Fail";
      totalObtained += Number(r.marks_obtained) || 0;
      totalMaximum  += Number(r.total_marks) || 0;
      if (!r.is_pass) allPass = false;
    });

    vars["exam.total_marks"]    = fmt(totalMaximum);
    vars["exam.obtained_marks"] = fmt(totalObtained);
    vars["exam.percentage"]     = fmtPercent(totalObtained, totalMaximum);
    vars["exam.result"]         = allPass ? "Pass" : "Fail";
    vars["exam.subject_count"]  = fmt(results.length);
    const overallGrade = results.find((r) => r.grade)?.grade || "";
    vars["exam.grade"]          = fmt(overallGrade);
    vars["exam.rank"]           = "";

    vars["subjects"]    = results.map((r) => r.subject_id && typeof r.subject_id === "object" ? r.subject_id.name : "").filter(Boolean).join(", ");
    vars["marks"]       = vars["exam.total_marks"];
    vars["obtained"]    = vars["exam.obtained_marks"];
    vars["grade"]       = vars["exam.grade"];
    vars["percentage"]  = vars["exam.percentage"];
    vars["rank"]        = vars["exam.rank"];
    vars["result"]      = vars["exam.result"];
  }

  // ── Attendance variables ────────────────────────────────────────────────────
  if (ctx.attendance) {
    const a = ctx.attendance;
    vars["attendance.present"]    = fmt(a.present);
    vars["attendance.total"]      = fmt(a.total);
    vars["attendance.percentage"] = fmt(a.percentage);
    vars["attendance.absent"]     = fmt(a.total - a.present);
  }

  // ── Fees / Payment variables ────────────────────────────────────────────────
  if (ctx.payment) {
    const p = ctx.payment;
    vars["fees.receipt_no"]     = fmt(p.receipt_number || p._id?.toString().slice(-8).toUpperCase());
    vars["fees.amount"]         = fmtCurrency(p.amount_paid || p.total_amount || p.amount);
    vars["fees.amount_raw"]     = fmt(p.amount_paid || p.amount);
    vars["fees.date"]           = fmtDate(p.payment_date || p.createdAt);
    vars["fees.date_short"]     = fmtShortDate(p.payment_date || p.createdAt);
    vars["fees.mode"]           = fmt(p.payment_mode || p.mode_of_payment);
    vars["fees.status"]         = fmt(p.status);
    vars["fees.balance"]        = fmtCurrency(p.balance || 0);
    vars["fees.fee_type"]       = fmt(p.fee_type || p.fee_type_id?.name || "");
    vars["fees.month"]          = fmt(p.fee_month || "");
    vars["fees.academic_year"]  = fmt(p.academic_year);
    vars["fees.remarks"]        = fmt(p.remarks);
    vars["fees.bank_reference"] = fmt(p.bank_reference || p.transaction_id);
    vars["fees.amount_words"]   = numberToWords(Number(p.amount_paid || p.amount || 0));
  }

  // ── Salary variables ────────────────────────────────────────────────────────
  if (ctx.salary) {
    const sal = ctx.salary;
    const teacherData = sal.teacher_id && typeof sal.teacher_id === "object"
      ? sal.teacher_id
      : ctx.teacher || {};

    vars["salary.receipt_no"]       = fmt(sal.receipt_number);
    vars["salary.period"]           = fmt(sal.salary_period);
    vars["salary.start_date"]       = fmtDate(sal.start_date);
    vars["salary.end_date"]         = fmtDate(sal.end_date);
    vars["salary.payment_date"]     = fmtDate(sal.payment_date);
    vars["salary.payment_date_short"] = fmtShortDate(sal.payment_date);
    vars["salary.basic"]            = fmtCurrency(sal.monthly_salary);
    vars["salary.working_days"]     = fmt(sal.working_days);
    vars["salary.present_days"]     = fmt(sal.present_days);
    vars["salary.absent_days"]      = fmt(sal.absent_days);
    vars["salary.deduction"]        = fmtCurrency(sal.deduction || sal.suggested_deduction || 0);
    vars["salary.bonus"]            = fmtCurrency(sal.bonus || 0);
    vars["salary.final_amount"]     = fmtCurrency(sal.final_salary);
    vars["salary.final_amount_words"] = numberToWords(Number(sal.final_salary || 0));
    vars["salary.remarks"]          = fmt(sal.remarks);
    vars["salary.status"]           = fmt(sal.status);
    vars["salary.calculation_type"] = fmt(sal.calculation_type);
    vars["salary.teacher_name"]     = fmt(teacherData.name || sal.teacher_name);
    vars["salary.employee_id"]      = fmt(teacherData.employee_id);
    vars["salary.designation"]      = fmt(teacherData.designation);
    vars["salary.department"]       = fmt(teacherData.department);
    vars["salary.bank_name"]        = fmt(teacherData.bank_name);
    vars["salary.account_number"]   = fmt(teacherData.account_number);
    vars["salary.ifsc_code"]        = fmt(teacherData.ifsc_code);
    vars["salary.pan_number"]       = fmt(teacherData.pan_number);
    vars["salary.epf_no"]           = fmt(teacherData.epf_no);
  }

  // ── Extra / Override ────────────────────────────────────────────────────────
  if (ctx.extra) {
    Object.assign(vars, ctx.extra);
  }

  // ── Mapping Mirrors & Suffix Mappings ──────────────────────────────────────
  // Copy dot keys to underscore keys and vice-versa to ensure 100% compatibility
  Object.keys(vars).forEach((key) => {
    if (key.includes(".")) {
      const underKey = key.replace(/\./g, "_");
      if (vars[underKey] === undefined) {
        vars[underKey] = vars[key];
      }
    } else if (key.includes("_")) {
      const dotKey = key.replace(/_/g, ".");
      if (vars[dotKey] === undefined) {
        vars[dotKey] = vars[key];
      }
    }
  });

  // Mirror specific suffix aliases
  const suffixMaps = [
    ["_number", "_no"],
    [".number", ".no"],
    [".number", "_no"],
    ["_number", ".no"],
    ["_no", "_number"],
    [".no", ".number"],
    [".no", "_number"],
    ["_no", ".number"],
  ];
  Object.keys(vars).forEach((key) => {
    suffixMaps.forEach(([from, to]) => {
      if (key.endsWith(from)) {
        const base = key.slice(0, -from.length);
        const altKey = base + to;
        if (vars[altKey] === undefined) {
          vars[altKey] = vars[key];
        }
      }
    });
  });

  return vars;
}

// ─── Helper: encode/decode for URL passing ────────────────────────────────────

export function encodeVariables(vars: Record<string, string>): string {
  return Buffer.from(JSON.stringify(vars)).toString("base64url");
}

export function decodeVariables(encoded: string): Record<string, string> {
  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
  } catch {
    return {};
  }
}

/** Client-safe version (browser has no Buffer) */
export function encodeVariablesClient(vars: Record<string, string>): string {
  return btoa(encodeURIComponent(JSON.stringify(vars)));
}

export function decodeVariablesClient(encoded: string): Record<string, string> {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded)));
  } catch {
    return {};
  }
}

// ─── Number → Indian words (for receipts) ────────────────────────────────────

const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function wordsUnder100(n: number): string {
  if (n < 20) return ones[n];
  return (tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "")).trim();
}

function wordsUnder1000(n: number): string {
  if (n < 100) return wordsUnder100(n);
  return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + wordsUnder100(n % 100) : "");
}

export function numberToWords(n: number): string {
  if (!n || isNaN(n)) return "Zero Rupees Only";
  n = Math.floor(n); // whole rupees only
  if (n === 0) return "Zero Rupees Only";

  const crore = Math.floor(n / 10_000_000);
  const lakh  = Math.floor((n % 10_000_000) / 100_000);
  const thou  = Math.floor((n % 100_000) / 1_000);
  const rest  = n % 1_000;

  let result = "";
  if (crore) result += wordsUnder1000(crore) + " Crore ";
  if (lakh)  result += wordsUnder1000(lakh)  + " Lakh ";
  if (thou)  result += wordsUnder1000(thou)  + " Thousand ";
  if (rest)  result += wordsUnder1000(rest)  + " ";
  return (result.trim() + " Rupees Only").replace(/\s+/g, " ");
}
