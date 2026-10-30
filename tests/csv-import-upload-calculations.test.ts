import { describe, it, expect } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN ENGINES: CSV IMPORT & FILE UPLOADS LOGIC UNDER TEST
// ─────────────────────────────────────────────────────────────────────────────

/** Header alias dictionary matching the implementation in BulkImport.tsx */
export const ALIAS_MAP: Record<string, string[]> = {
  "admission no": ["admission no", "admission number", "admission_no", "adm no", "adm_no"],
  "student name": ["student name", "student_name", "name", "full name", "fullname"],
  "first name": ["first name", "firstname", "first_name"],
  "last name": ["last name", "lastname", "last_name"],
  "class": ["class", "grade", "class_name", "class name"],
  "section": ["section"],
  "guardian name": ["guardian name", "parent name", "guardian_name", "parent_name"],
  "guardian phone": ["guardian phone", "parent phone", "guardian_phone", "parent_phone"],
  "guardian relation": ["guardian relation", "parent relation", "guardian_relation", "parent_relation"],
  "academic year": ["academic year", "academic_year", "year"],
  "employee id": ["employee id", "employee_id", "emp id", "emp_id", "id"],
  "full name": ["full name", "name", "full_name", "teacher name", "teacher_name"],
  "subject specialization": ["subject specialization", "subject", "specialization", "subject_specialization"],
};

/** Normalizes class name (strips common prefixes and whitespace) */
export const normalizeClassName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/^class/, "")
    .replace(/^grade/, "")
    .trim();

/** Normalizes section name */
export const normalizeSectionName = (sec: string): string =>
  sec
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/^section/, "")
    .trim();

/** Resolves gender value */
export function resolveGender(raw?: string): { value?: "male" | "female" | "other"; error?: string } {
  if (!raw || !raw.trim()) return {};
  const g = raw.trim().toLowerCase();
  if (g.startsWith("m")) return { value: "male" };
  if (g.startsWith("f")) return { value: "female" };
  if (g.startsWith("o")) return { value: "other" };
  return { error: "Gender must be Male, Female, or Other." };
}

/** Parses and normalizes date of birth */
export function resolveDate(raw?: string): { iso?: string; error?: string } {
  if (!raw || !raw.trim()) return {};
  const d = new Date(raw.trim());
  if (isNaN(d.getTime())) {
    return { error: "Invalid date format (Expected YYYY-MM-DD)." };
  }
  return { iso: d.toISOString().split("T")[0] };
}

/** Validates email format */
export function validateEmail(email?: string): boolean {
  if (!email || !email.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Validates 10-digit mobile number, allowing optional +91 or country prefix */
export function validatePhone(phone?: string): boolean {
  if (!phone || !phone.trim()) return false;
  const digits = phone.trim().replace(/\D/g, "");
  const local10 = digits.length > 10 && digits.startsWith("91") ? digits.slice(2) : digits;
  return local10.length === 10;
}

/** Matches CSV headers against required sample headers using alias map */
export function findMissingHeaders(providedHeaders: string[], requiredHeaders: string[]): string[] {
  const normalizedProvided = providedHeaders.map(h => String(h || "").toLowerCase().trim());
  const missing: string[] = [];

  requiredHeaders.forEach(sh => {
    if (sh.endsWith("*")) {
      const cleanH = sh.replace("*", "").toLowerCase().trim();
      const aliases = ALIAS_MAP[cleanH] || [cleanH];
      const isPresent = normalizedProvided.some(h =>
        aliases.some(alias => h.includes(alias) || alias.includes(h))
      );
      if (!isPresent) {
        missing.push(sh.replace("*", ""));
      }
    }
  });

  return missing;
}

/** Generates student login username */
export function generateStudentLoginEmail(name: string, dob?: string, schoolSlug = "myschool"): string {
  const firstName = name.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
  let dobDay = "";
  if (dob) {
    const d = new Date(dob);
    if (!isNaN(d.getTime())) {
      dobDay = String(d.getDate());
    }
  }
  const slug = schoolSlug.replace(/[\s-]+/g, "");
  return `${firstName}${dobDay}.${slug}.myschoollife`;
}

/** Generates initial student password */
export function generateStudentPassword(dob?: string): string {
  if (dob) {
    const d = new Date(dob);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const yy = d.getFullYear().toString().slice(-2);
      return `${day}${month}${yy}`;
    }
  }
  return "student123";
}

/** Generates teacher login username */
export function generateTeacherLoginEmail(name: string, dob?: string, schoolSlug = "myschool"): string {
  const firstName = name.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
  let dobDay = "";
  if (dob) {
    const d = new Date(dob);
    if (!isNaN(d.getTime())) {
      dobDay = String(d.getDate());
    }
  }
  const slug = schoolSlug.replace(/[\s-]+/g, "");
  return `${firstName}${dobDay}.${slug}.myschoollife`;
}

/** Detects in-file and database admission duplicates */
export function checkDuplicateAdmissionNo(
  admissionNo: string,
  seenInFile: Set<string>,
  existingInDb: Set<string>
): { error?: string } {
  const normalized = admissionNo.trim().toLowerCase();
  if (existingInDb.has(normalized)) {
    return { error: `Admission number '${admissionNo}' already exists in database.` };
  }
  if (seenInFile.has(normalized)) {
    return { error: `Duplicate admission number '${admissionNo}' in import file.` };
  }
  seenInFile.add(normalized);
  return {};
}

/** Splits rows into import batches */
export function batchArray<T>(items: T[], batchSize = 10): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/** File upload security validation */
export function validateUploadFile(file: { name: string; size: number; type: string }): {
  valid: boolean;
  statusCode?: number;
  message?: string;
} {
  if (!file) return { valid: false, statusCode: 400, message: "No file provided" };
  if (file.size === 0) return { valid: false, statusCode: 400, message: "File cannot be empty" };

  const fileName = file.name || "";
  if (fileName.includes("../") || fileName.includes("..\\") || fileName.includes("\0")) {
    return { valid: false, statusCode: 400, message: "Malicious filename detected" };
  }

  const dangerousExtensions = /\.(exe|bat|cmd|sh|php|pl|cgi|py|js|vbs|msi|dll|scr)$/i;
  if (dangerousExtensions.test(fileName)) {
    return { valid: false, statusCode: 400, message: "Executable or script files are strictly prohibited" };
  }

  const allowedTypes = [
    "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
    "image/x-icon", "image/svg+xml", "application/pdf",
    "video/mp4", "video/webm", "video/ogg", "video/quicktime",
  ];
  const isIco = fileName.toLowerCase().endsWith(".ico");
  if (!allowedTypes.includes(file.type) && !isIco) {
    return { valid: false, statusCode: 400, message: "Invalid file type" };
  }

  const isVideo = file.type.startsWith("video/");
  const maxSize = isVideo ? 25 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, statusCode: 400, message: `File too large. Maximum size is ${isVideo ? "25MB" : "5MB"}` };
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE: CSV IMPORT & FILE UPLOAD ENGINES
// ─────────────────────────────────────────────────────────────────────────────

describe("CSV Import & File Upload Calculations Engine", () => {
  // ── 1. HEADER ALIAS RESOLUTION & VALIDATION ──
  describe("1. Header Alias Resolution & Normalization", () => {
    const requiredStudentHeaders = [
      "Admission No*", "Student Name*", "Class*", "Section*",
      "Guardian Name*", "Guardian Phone*", "Guardian Relation*", "Academic Year*"
    ];

    it("accepts exact standard headers", () => {
      const headers = [
        "Admission No*", "Roll No", "Student Name*", "Class*", "Section*",
        "Gender", "DOB", "Primary Phone", "Email", "Address",
        "Guardian Name*", "Guardian Phone*", "Guardian Email", "Guardian Relation*",
        "Academic Year*", "Aadhaar No"
      ];
      const missing = findMissingHeaders(headers, requiredStudentHeaders);
      expect(missing).toHaveLength(0);
    });

    it("matches header aliases (e.g. 'Adm No' for 'Admission No', 'Parent Name' for 'Guardian Name')", () => {
      const aliasHeaders = [
        "Adm_No", "Name", "Grade", "Section",
        "Parent Name", "Parent Phone", "Parent Relation", "Year"
      ];
      const missing = findMissingHeaders(aliasHeaders, requiredStudentHeaders);
      expect(missing).toHaveLength(0);
    });

    it("detects missing mandatory headers and returns human-readable error names", () => {
      const incompleteHeaders = ["Student Name", "Roll No", "Gender"];
      const missing = findMissingHeaders(incompleteHeaders, requiredStudentHeaders);
      expect(missing).toContain("Admission No");
      expect(missing).toContain("Class");
      expect(missing).toContain("Guardian Name");
      expect(missing).toContain("Guardian Phone");
      expect(missing).toContain("Academic Year");
    });

    it("handles teacher bulk import headers with alias matching", () => {
      const requiredTeacherHeaders = ["Employee ID*", "Full Name*", "Subject Specialization*"];
      const headers = ["Emp ID", "Teacher Name", "Specialization", "Qualification", "Phone"];
      const missing = findMissingHeaders(headers, requiredTeacherHeaders);
      expect(missing).toHaveLength(0);
    });
  });

  // ── 2. CLASS & SECTION NORMALIZATION ──
  describe("2. Class Name and Section Normalization", () => {
    it("collapses variations of class names to canonical tokens", () => {
      expect(normalizeClassName("Class 10")).toBe("10");
      expect(normalizeClassName("Grade 10")).toBe("10");
      expect(normalizeClassName("  class   10 ")).toBe("10");
      expect(normalizeClassName("10")).toBe("10");
      expect(normalizeClassName("Grade 12 - Science")).toBe("12-science");
    });

    it("collapses variations of section names", () => {
      expect(normalizeSectionName("Section A")).toBe("a");
      expect(normalizeSectionName("A")).toBe("a");
      expect(normalizeSectionName("  Section   B ")).toBe("b");
      expect(normalizeSectionName("")).toBe("");
    });
  });

  // ── 3. FIELD FORMAT VALIDATIONS ──
  describe("3. Field Normalization & Parsing", () => {
    it("resolves gender accurately with edge casing", () => {
      expect(resolveGender("Male").value).toBe("male");
      expect(resolveGender("m").value).toBe("male");
      expect(resolveGender("FEMALE").value).toBe("female");
      expect(resolveGender("f").value).toBe("female");
      expect(resolveGender("Other").value).toBe("other");
      expect(resolveGender("Alien").error).toBeDefined();
      expect(resolveGender("").value).toBeUndefined();
    });

    it("parses valid dates and returns ISO YYYY-MM-DD", () => {
      const res = resolveDate("2015-04-01");
      expect(res.iso).toBe("2015-04-01");
      expect(res.error).toBeUndefined();

      const invalid = resolveDate("not-a-date");
      expect(invalid.error).toBeDefined();
    });

    it("validates 10-digit telephone numbers strictly", () => {
      expect(validatePhone("9876543210")).toBe(true);
      expect(validatePhone("+91 98765 43210")).toBe(true); // 10 digits extracted
      expect(validatePhone("12345")).toBe(false);           // Too short
      expect(validatePhone("abcdefghij")).toBe(false);       // Non-digit
      expect(validatePhone("")).toBe(false);
    });

    it("validates email formatting", () => {
      expect(validateEmail("student@school.com")).toBe(true);
      expect(validateEmail("")).toBe(true); // Optional
      expect(validateEmail("invalid-email")).toBe(false);
      expect(validateEmail("missing@domain")).toBe(false);
    });
  });

  // ── 4. DUPLICATE DETECTION IN FILE & DATABASE ──
  describe("4. Duplicate Detection & In-Memory Indexing", () => {
    it("flags duplicate records within the same import file", () => {
      const seen = new Set<string>();
      const existingDb = new Set(["adm-100"]);

      const r1 = checkDuplicateAdmissionNo("ADM-201", seen, existingDb);
      expect(r1.error).toBeUndefined();

      const r2 = checkDuplicateAdmissionNo("ADM-201", seen, existingDb);
      expect(r2.error).toContain("Duplicate admission number 'ADM-201' in import file.");
    });

    it("flags collision with existing records in database", () => {
      const seen = new Set<string>();
      const existingDb = new Set(["adm-100", "adm-101"]);

      const res = checkDuplicateAdmissionNo("ADM-100", seen, existingDb);
      expect(res.error).toContain("already exists in database.");
    });
  });

  // ── 5. CREDENTIAL GENERATION FORMULAS ──
  describe("5. Credential Generation Formulas", () => {
    it("generates student username correctly from name and date of birth", () => {
      const username = generateStudentLoginEmail("Aarav Sharma", "2010-05-15", "myschool");
      expect(username).toBe("aarav15.myschool.myschoollife");
    });

    it("sanitizes multi-part student names and special characters in username", () => {
      const username = generateStudentLoginEmail("Mary-Jane O'Connor", "2012-10-08", "green-valley");
      expect(username).toBe("maryjane8.greenvalley.myschoollife");
    });

    it("generates student initial password from DOB (DDMMYY) or fallback", () => {
      const pwd = generateStudentPassword("2010-05-15");
      expect(pwd).toBe("150510");

      const fallback = generateStudentPassword(undefined);
      expect(fallback).toBe("student123");
    });

    it("generates teacher username with school slug", () => {
      const username = generateTeacherLoginEmail("Karan Malhotra", "1985-04-10", "myschool");
      expect(username).toBe("karan10.myschool.myschoollife");
    });
  });

  // ── 6. BATCHING & PARTIAL SUCCESS CALCULATIONS ──
  describe("6. Batching & Partial Success Calculations", () => {
    it("splits large record sets into batches of 10 for atomic processing", () => {
      const rows = Array.from({ length: 25 }, (_, i) => ({ id: i }));
      const batches = batchArray(rows, 10);
      expect(batches).toHaveLength(3);
      expect(batches[0]).toHaveLength(10);
      expect(batches[1]).toHaveLength(10);
      expect(batches[2]).toHaveLength(5);
    });

    it("computes partial success counters and aggregates failure records", () => {
      const batchResults = [
        { successCount: 10, failedCount: 0, failures: [] },
        { successCount: 8, failedCount: 2, failures: [{ row: "Row 15", error: "Duplicate Admission No" }, { row: "Row 18", error: "Class not found" }] },
      ];

      const totalSuccess = batchResults.reduce((acc, b) => acc + b.successCount, 0);
      const totalFailed = batchResults.reduce((acc, b) => acc + b.failedCount, 0);
      const allFailures = batchResults.flatMap(b => b.failures);

      expect(totalSuccess).toBe(18);
      expect(totalFailed).toBe(2);
      expect(allFailures).toHaveLength(2);
      expect(allFailures[0].error).toBe("Duplicate Admission No");
    });
  });

  // ── 7. FILE UPLOAD SECURITY, MIME & SIZE VALIDATIONS ──
  describe("7. File Upload Security & Storage Bounds", () => {
    it("rejects 0-byte empty files", () => {
      const res = validateUploadFile({ name: "empty.png", size: 0, type: "image/png" });
      expect(res.valid).toBe(false);
      expect(res.message).toMatch(/empty/i);
    });

    it("detects path traversal attempts in filename", () => {
      const res1 = validateUploadFile({ name: "../../etc/passwd", size: 1024, type: "image/png" });
      expect(res1.valid).toBe(false);
      expect(res1.message).toMatch(/malicious/i);

      const res2 = validateUploadFile({ name: "..\\system32\\cmd.exe", size: 1024, type: "image/png" });
      expect(res2.valid).toBe(false);
      expect(res2.message).toMatch(/malicious/i);

      const res3 = validateUploadFile({ name: "photo\0.png", size: 1024, type: "image/png" });
      expect(res3.valid).toBe(false);
      expect(res3.message).toMatch(/malicious/i);
    });

    it("rejects dangerous executable and script extensions", () => {
      const dangerousNames = [
        "payload.exe", "script.sh", "backdoor.php", "malware.bat",
        "virus.js", "macro.vbs", "exploit.py", "library.dll"
      ];
      for (const name of dangerousNames) {
        const res = validateUploadFile({ name, size: 2048, type: "application/octet-stream" });
        expect(res.valid).toBe(false);
        expect(res.message).toMatch(/executable or script/i);
      }
    });

    it("enforces 5MB maximum for standard images and PDF documents", () => {
      const validPdf = validateUploadFile({ name: "syllabus.pdf", size: 4 * 1024 * 1024, type: "application/pdf" });
      expect(validPdf.valid).toBe(true);

      const oversizedPdf = validateUploadFile({ name: "huge.pdf", size: 6 * 1024 * 1024, type: "application/pdf" });
      expect(oversizedPdf.valid).toBe(false);
      expect(oversizedPdf.message).toMatch(/too large/i);
    });

    it("allows up to 25MB for video files", () => {
      const validVideo = validateUploadFile({ name: "lecture.mp4", size: 20 * 1024 * 1024, type: "video/mp4" });
      expect(validVideo.valid).toBe(true);

      const oversizedVideo = validateUploadFile({ name: "movie.mp4", size: 30 * 1024 * 1024, type: "video/mp4" });
      expect(oversizedVideo.valid).toBe(false);
      expect(oversizedVideo.message).toMatch(/25MB/i);
    });
  });
});
