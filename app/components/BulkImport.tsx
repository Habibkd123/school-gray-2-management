"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  Upload, Download, AlertCircle, CheckCircle, ArrowLeft,
  Loader2, RefreshCw, FileText, Info, Check, Play, Trash2
} from "lucide-react";

import { getAuthHeaders } from "@/lib/utils/session";
import { useClasses } from "@/app/hooks/useClasses";
import { PrintService } from "@/app/lib/print-service";

interface BulkImportProps {
  module: "students" | "teachers";
  title: string;
  sampleHeaders: string[];
  sampleData: string[][];
  validateUrl: string;
  importUrl: string;
  backUrl: string;
  /** Optional: API URL that returns a pre-filled .xlsx template from the database */
  templateUrl?: string;
}

export default function BulkImport({
  module,
  title,
  sampleHeaders,
  sampleData,
  validateUrl,
  importUrl,
  backUrl,
  templateUrl,
}: BulkImportProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load classes dynamically
  const { classes: apiClasses } = useClasses({ filterByYear: true });

  // States
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [validatedRows, setValidatedRows] = useState<any[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [validationError, setValidationError] = useState("");
  const [importResult, setImportResult] = useState<{
    successCount: number;
    failedCount: number;
    failures: Array<{ row: string; error: string }>;
  } | null>(null);

  // Credentials for successfully imported students (students module only)
  const [importedCredentials, setImportedCredentials] = useState<Array<{
    studentName: string;
    admissionNo: string;
    className: string;
    section: string;
    studentUsername: string;
    studentPassword: string;
    parentUsername: string;
    parentPassword: string;
  }>>([]);

  const getDynamicSampleData = () => {
    const data = sampleData.map(r => [...r]);

    if (apiClasses && apiClasses.length > 0) {
      if (module === "students") {
        const classIdx = sampleHeaders.findIndex(h => h.toLowerCase().trim().replace("*", "") === "class");
        const sectionIdx = sampleHeaders.findIndex(h => h.toLowerCase().trim().replace("*", "") === "section");

        if (classIdx !== -1) {
          // Use first class for Aarav Sharma (row 0)
          data[0][classIdx] = apiClasses[0].name;
          if (sectionIdx !== -1) {
            data[0][sectionIdx] = apiClasses[0].section || "";
          }

          // Use second class (if exists) or same class for Ananya Patel (row 1)
          const secondClass = apiClasses[1] || apiClasses[0];
          data[1][classIdx] = secondClass.name;
          if (sectionIdx !== -1) {
            data[1][sectionIdx] = secondClass.section || "";
          }
        }
      } else if (module === "teachers") {
        const assignedClassIdx = sampleHeaders.findIndex(h => {
          const cleanH = h.toLowerCase().trim().replace("*", "");
          return cleanH.includes("assigned class") || cleanH.includes("classes");
        });
        if (assignedClassIdx !== -1) {
          // Format first class
          const firstClassStr = apiClasses[0].section ? `${apiClasses[0].name} - ${apiClasses[0].section}` : apiClasses[0].name;
          // Format second class
          const secondClass = apiClasses[1];
          const secondClassStr = secondClass ? (secondClass.section ? `, ${secondClass.name} - ${secondClass.section}` : `, ${secondClass.name}`) : "";
          
          data[0][assignedClassIdx] = `${firstClassStr}${secondClassStr}`;
          if (data[1]) {
            data[1][assignedClassIdx] = firstClassStr;
          }
        }
      }
    }
    return data;
  };

  const downloadCSVTemplate = () => {
    const cleanHeaders = sampleHeaders.map(h => h.replace("*", ""));
    const data = getDynamicSampleData();
    const csvContent = "data:text/csv;charset=utf-8,"
      + [cleanHeaders.join(","), ...data.map(r => r.map(v => `"${(v || "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${module}_import_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadExcelTemplate = () => {
    const cleanHeaders = sampleHeaders.map(h => h.replace("*", ""));
    const data = getDynamicSampleData();
    const ws = XLSX.utils.aoa_to_sheet([cleanHeaders, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${module}_import_template.xlsx`);
  };

  /**
   * Download a live template generated from the database (preferred).
   * Falls back to the client-side Excel generation if no templateUrl is provided.
   */
  const downloadLatestTemplate = async () => {
    if (templateUrl) {
      try {
        const res = await fetch(templateUrl, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error("Failed to fetch template");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${module}_import_template.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch {
        // Fallback to client-side generation
        downloadExcelTemplate();
      }
    } else {
      downloadExcelTemplate();
    }
  };

  const validateRows = async (rowsToValidate: any[]) => {
    try {
      setIsValidating(true);
      const res = await fetch(validateUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ rows: rowsToValidate })
      });
      const result = await res.json();
      if (result.success) {
        setValidatedRows(result.data);
        const validIndices = new Set<number>();
        result.data.forEach((r: any) => {
          if (r.isValid) {
            validIndices.add(r.index);
          }
        });
        setSelectedIndices(validIndices);
      } else {
        setValidationError(result.message || "Failed to validate records on backend.");
      }
    } catch (err: any) {
      setValidationError("Connection error: " + err.message);
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    processFile(uploadedFile);
  };

  const processFile = (uploadedFile: File) => {
    setFile(uploadedFile);
    setValidationError("");
    setValidatedRows([]);
    setRawRows([]);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setIsParsing(true);
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const jsonRows = XLSX.utils.sheet_to_json<any>(worksheet);
        const sheetRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (jsonRows.length === 0 || sheetRows.length === 0) {
          setValidationError("The uploaded spreadsheet is empty.");
          return;
        }

        const ALIAS_MAP: Record<string, string[]> = {
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
          "subject specialization": ["subject specialization", "subject", "specialization", "subject_specialization"]
        };

        const headers = sheetRows[0].map((h: any) => String(h || "").toLowerCase().trim());
        const missingRequired: string[] = [];

        sampleHeaders.forEach(sh => {
          if (sh.endsWith("*")) {
            const cleanH = sh.replace("*", "").toLowerCase().trim();
            const aliases = ALIAS_MAP[cleanH] || [cleanH];
            const isPresent = headers.some(h => 
              aliases.some(alias => h.includes(alias) || alias.includes(h))
            );
            if (!isPresent) {
              missingRequired.push(sh.replace("*", ""));
            }
          }
        });

        if (missingRequired.length > 0) {
          setValidationError(`Missing required column headers: ${missingRequired.map(h => `"${h}"`).join(", ")}`);
          return;
        }

        setRawRows(jsonRows);
        await validateRows(jsonRows);
      } catch (err: any) {
        setValidationError("Failed to read file: " + err.message);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleImport = async () => {
    if (selectedIndices.size === 0) return;
    setIsImporting(true);
    setImportProgress(0);

    const rowsToImport = validatedRows
      .filter(r => selectedIndices.has(r.index))
      .map(r => r.data);

    const totalRows = rowsToImport.length;
    let importedCount = 0;
    let failedCount = 0;
    const failures: any[] = [];

    const batchSize = 10;
    for (let i = 0; i < totalRows; i += batchSize) {
      const batch = rowsToImport.slice(i, i + batchSize);
      try {
        const res = await fetch(importUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ rows: batch })
        });
        const result = await res.json();
        if (result.success) {
          importedCount += result.data.successCount;
          failedCount += result.data.failedCount;
          if (result.data.failures) {
            failures.push(...result.data.failures);
          }
        } else {
          failedCount += batch.length;
          failures.push({
            row: `Batch ${Math.floor(i / batchSize) + 1}`,
            error: result.message || "Failed to save batch"
          });
        }
      } catch (err: any) {
        failedCount += batch.length;
        failures.push({
          row: `Batch ${Math.floor(i / batchSize) + 1}`,
          error: err.message || "Network error"
        });
      }
      const progress = Math.min(100, Math.round(((i + batch.length) / totalRows) * 100));
      setImportProgress(progress);
    }

    setImportResult({
      successCount: importedCount,
      failedCount,
      failures
    });
    setIsImporting(false);

    // Generate credentials for successfully imported students
    if (module === "students") {
      // Track which row indices failed
      const failedRowNames = new Set(failures.map(f => f.row));

      // We go batch by batch — instead re-derive from validatedRows which were selected
      // Build credentials from all selected rows (failures will be a subset)
      const successfulRows: typeof importedCredentials = [];

      for (const vRow of validatedRows.filter(r => selectedIndices.has(r.index))) {
        const data = vRow.data;
        // Skip rows that failed (matched by name or admission_no)
        const rowIdentifier = data.name || data.admission_no || "Unknown row";
        if (failedRowNames.has(rowIdentifier)) continue;

        // Replicate the server-side username generation logic
        const schoolSlug = (process.env.NEXT_PUBLIC_SCHOOL_SLUG || "school").replace(/[\s-]+/g, "");
        const firstName = (data.name || "").trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
        let dobDay = "";
        if (data.dob) {
          const d = new Date(data.dob);
          if (!isNaN(d.getTime())) dobDay = String(d.getDate());
        }
        const studentUsername = `${firstName}${dobDay}.${schoolSlug}.myschoollife`;

        // Compute student password
        let studentPassword = "student123";
        if (data.dob) {
          const dateObj = new Date(data.dob);
          if (!isNaN(dateObj.getTime())) {
            const day = String(dateObj.getDate()).padStart(2, "0");
            const month = String(dateObj.getMonth() + 1).padStart(2, "0");
            const yy = dateObj.getFullYear().toString().slice(-2);
            studentPassword = `${day}${month}${yy}`;
          }
        }

        // Parent credentials
        const parentUsername = data.guardian_email || "";
        const parentPassword = parentUsername ? "parent123" : "";

        successfulRows.push({
          studentName: data.name || "",
          admissionNo: data.admission_no || "",
          className: data.classNameStr ? data.classNameStr.split(" \u2014 ")[0].trim() : "",
          section: data.classNameStr && data.classNameStr.includes(" \u2014 ") ? data.classNameStr.split(" \u2014 ")[1].trim() : "",
          studentUsername,
          studentPassword,
          parentUsername,
          parentPassword,
        });
      }

      setImportedCredentials(successfulRows);
    }
  };

  const toggleSelectRow = (index: number) => {
    const updated = new Set(selectedIndices);
    if (updated.has(index)) {
      updated.delete(index);
    } else {
      updated.add(index);
    }
    setSelectedIndices(updated);
  };

  const toggleSelectAll = () => {
    const validRows = validatedRows.filter(r => r.isValid);
    const allSelected = validRows.every(r => selectedIndices.has(r.index));
    const updated = new Set(selectedIndices);

    validRows.forEach(r => {
      if (allSelected) {
        updated.delete(r.index);
      } else {
        updated.add(r.index);
      }
    });
    setSelectedIndices(updated);
  };

  const resetForm = () => {
    setFile(null);
    setRawRows([]);
    setValidatedRows([]);
    setSelectedIndices(new Set());
    setValidationError("");
    setImportResult(null);
    setImportedCredentials([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Credentials Download Functions ---
  const downloadCredentialsCSV = () => {
    if (importedCredentials.length === 0) return;
    const headers = ["Student Name", "Admission Number", "Class", "Section", "Username", "Password", "Parent Username", "Parent Password"];
    const rows = importedCredentials.map(c => [
      c.studentName, c.admissionNo, c.className, c.section,
      c.studentUsername, c.studentPassword, c.parentUsername, c.parentPassword
    ]);
    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `student_credentials_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadCredentialsPDF = () => {
    if (importedCredentials.length === 0) return;

    const win = window.open("", "_blank");
    if (!win) return;

    const tableRows = importedCredentials.map((c, i) => `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${i + 1}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600">${c.studentName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#6366f1;font-weight:700">${c.admissionNo}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${c.className}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${c.section}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:12px">${c.studentUsername}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-weight:700;color:#dc2626">${c.studentPassword}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:12px">${c.parentUsername || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-weight:700;color:#2563eb">${c.parentPassword || '—'}</td>
      </tr>
    `).join("");

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Student Credentials</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; padding: 20px; }
          h1 { font-size: 20px; color: #0f172a; margin-bottom: 4px; }
          p { color: #64748b; font-size: 12px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1e293b; color: white; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
          @media print { body { padding: 0; } button { display: none; } }
        </style>
      </head>
      <body>
        <h1>Student Login Credentials</h1>
        <p>Generated on ${new Date().toLocaleString()} &mdash; ${importedCredentials.length} record(s)</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Student Name</th>
              <th>Admission No</th>
              <th>Class</th>
              <th>Section</th>
              <th>Student Username</th>
              <th>Student Password</th>
              <th>Parent Username</th>
              <th>Parent Password</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <br/>
        <button onclick="PrintService.print('printable-area', { pageSize: 'A4' })" style="padding:8px 20px;background:#1e293b;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px">Print / Save as PDF</button>
      </body>
      </html>
    `);
    win.document.close();
  };

  const validRowsCount = validatedRows.filter(r => r.isValid).length;
  const invalidRowsCount = validatedRows.length - validRowsCount;

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[var(--sidebar-bg)] min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h1>
          <div className="card-subtitle flex items-center gap-2 text-[13px] mt-1">
            <span>Dashboard</span>
            <span>/</span>
            <Link href={backUrl} className="hover:text-primary">Management</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Bulk Import</span>
          </div>
        </div>
        <Link
          href={backUrl}
          className="flex items-center gap-2 px-3.5 py-2 border border-border bg-white dark:bg-slate-900 text-[13px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to List</span>
        </Link>
      </div>

      {!file && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          {/* Instructions and templates */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow space-y-4">
              <h2 className="text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                <span>Import Guidelines</span>
              </h2>
              <ul className="text-[13px] text-slate-600 dark:text-slate-400 space-y-2.5 list-disc pl-4">
                <li>Download the <strong>Latest Template</strong> — it contains the exact class and section names from your database.</li>
                <li>Columns with an asterisk (<span className="text-rose-500 font-bold">*</span>) are mandatory.</li>
                <li>Dates should be formatted as <span className="font-semibold text-slate-800 dark:text-slate-300">YYYY-MM-DD</span>.</li>
                <li>Avoid spaces or special characters in Admission No values.</li>
                <li>Class names are matched flexibly — <span className="font-semibold text-slate-800 dark:text-slate-300">"10"</span>, <span className="font-semibold text-slate-800 dark:text-slate-300">"Class 10"</span>, and <span className="font-semibold text-slate-800 dark:text-slate-300">"Grade 10"</span> all map to the same class. Sections are case-insensitive.</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-5 card-shadow space-y-4">
              <h2 className="text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-primary" />
                <span>Templates</span>
              </h2>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={downloadLatestTemplate}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-primary hover:bg-[var(--primary-hover)] text-[13px] font-semibold text-white rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Download Latest Template (Excel)
                  </span>
                  <Download className="w-3.5 h-3.5" />
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={downloadCSVTemplate}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-[12px] font-medium text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Download CSV Template
                  </span>
                  <Download className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Upload Box Area */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-10 card-shadow flex flex-col items-center justify-center border-dashed border-2 hover:border-primary/50 transition-colors min-h-[300px]">
              <Upload className="w-12 h-12 text-slate-400 mb-4" />
              <h3 className="text-[16px] font-bold text-slate-800 dark:text-slate-200 mb-2">Upload spreadsheet</h3>
              <p className="card-subtitle text-[13px] mb-6 text-center max-w-sm">
                Drag and drop your spreadsheet (.xlsx, .csv) here or browse files on your computer.
              </p>
              <input
                type="file"
                accept=".csv, .xlsx"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2.5 bg-primary text-white text-[13px] font-semibold hover:bg-[var(--primary-hover)] rounded-lg transition-colors cursor-pointer"
              >
                Choose File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parsing & Validating State */}
      {(isParsing || isValidating) && (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-10 card-shadow flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <h3 className="text-[15px] font-semibold text-slate-700 dark:text-slate-300">
            {isParsing ? "Reading spreadsheet file..." : "Validating columns and checking for duplicates..."}
          </h3>
        </div>
      )}

      {/* Validation Error Screen */}
      {validationError && (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-8 card-shadow space-y-6 text-left">
          <div className="flex items-start gap-3.5 text-rose-500">
            <AlertCircle className="w-6.5 h-6.5 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <h3 className="text-[16px] font-bold">Parsing Validation Error</h3>
              <p className="text-[13.5px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                {validationError}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-5 border border-border space-y-3.5">
            <h4 className="text-[13.5px] font-bold text-slate-800 dark:text-slate-200">Expected Column Headers for Import:</h4>
            <div className="flex flex-wrap gap-2">
              {sampleHeaders.map((sh, idx) => {
                const isMandatory = sh.endsWith("*");
                const cleanName = sh.replace("*", "");
                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold ${
                      isMandatory
                        ? "bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30"
                        : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-800"
                    }`}
                  >
                    <span>{cleanName}</span>
                    {isMandatory && <span className="text-rose-500 font-bold">*</span>}
                  </span>
                );
              })}
            </div>
            <p className="text-[11.5px] text-slate-500 mt-1">
              Note: Red-bordered items marked with <span className="text-rose-500 font-bold">*</span> are required columns.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={resetForm}
              className="flex items-center gap-2 px-4.5 py-2.5 border border-border bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-[13px] font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Upload Different File</span>
            </button>
            <button
              onClick={downloadLatestTemplate}
              className="flex items-center gap-2 px-4.5 py-2.5 bg-primary text-white hover:bg-[var(--primary-hover)] rounded-lg text-[13px] font-semibold transition-colors cursor-pointer shadow-sm animate-pulse"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Latest Template</span>
            </button>
          </div>
        </div>
      )}

      {/* Validation Preview and Grid */}
      {file && !isParsing && !isValidating && !validationError && !importResult && !isImporting && (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden text-left space-y-4">
          <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-[16px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span>Import Preview ({file.name})</span>
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-[12px] text-slate-500 mt-1">
                <span>Total records: <span className="font-bold text-slate-700 dark:text-slate-300">{validatedRows.length}</span></span>
                <span>•</span>
                <span className="text-emerald-600 font-medium">Valid rows: {validRowsCount}</span>
                <span>•</span>
                <span className="text-rose-600 font-medium">Invalid rows: {invalidRowsCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={resetForm}
                className="px-4 py-2 border border-border bg-white dark:bg-slate-800 text-[13px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
              >
                Change File
              </button>
              <button
                onClick={handleImport}
                disabled={selectedIndices.size === 0}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-white text-[13px] font-semibold hover:bg-[var(--primary-hover)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Import {selectedIndices.size} Selected</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[450px]">
            <table className="erp-table">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-border text-[12px] text-slate-500 uppercase font-semibold">
                  <th className="px-5 py-3 text-center w-12">
                    <input
                      type="checkbox"
                      checked={validatedRows.filter(r => r.isValid).length > 0 && validatedRows.filter(r => r.isValid).every(r => selectedIndices.has(r.index))}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 w-4 h-4 accent-primary cursor-pointer"
                    />
                  </th>
                  <th className="px-5 py-3 text-left w-16">Row</th>
                  <th className="px-5 py-3 text-left w-28">Status</th>
                  <th className="px-5 py-3 text-left">Details</th>
                  <th className="px-5 py-3 text-left">Validation Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[13px]">
                {validatedRows.map((row) => (
                  <tr
                    key={row.index}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${!row.isValid ? "bg-rose-50/40 dark:bg-rose-500/5" : ""}`}
                  >
                    <td className="px-5 py-3.5 text-center">
                      <input
                        type="checkbox"
                        disabled={!row.isValid}
                        checked={selectedIndices.has(row.index)}
                        onChange={() => toggleSelectRow(row.index)}
                        className="rounded border-slate-300 w-4 h-4 accent-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      />
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono">#{row.index + 1}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${row.isValid ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${row.isValid ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {row.isValid ? "Valid" : "Invalid"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{row.data.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                        ID: <span className="text-primary font-bold">{row.data.admission_no || row.data.employee_id}</span>
                        {row.data.classNameStr && ` | Class: ${row.data.classNameStr}`}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {row.isValid ? (
                        <span className="text-slate-400 italic">No issues</span>
                      ) : (
                        <div className="space-y-1">
                          {row.errors.map((err: string, i: number) => (
                            <div key={i} className="flex items-center gap-1.5 text-[12.5px] text-rose-600 dark:text-rose-400 font-semibold leading-tight">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{err}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Importing Progress state view */}
      {isImporting && (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl p-10 card-shadow flex flex-col items-center justify-center min-h-[300px] text-center space-y-5">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <div className="space-y-2">
            <h3 className="text-[16px] font-bold text-slate-800 dark:text-slate-200">Importing records in progress...</h3>
            <p className="card-subtitle text-[13px]">Please do not close this tab or navigate away.</p>
          </div>
          <div className="w-full max-w-md bg-slate-100 dark:bg-slate-800 rounded-full h-3.5 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300 rounded-full"
              style={{ width: `${importProgress}%` }}
            />
          </div>
          <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">{importProgress}% Completed</span>
        </div>
      )}

      {/* Import summary results Dashboard */}
      {importResult && (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-xl card-shadow overflow-hidden text-left space-y-6 p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
            <div>
              <h2 className="text-[18px] font-bold text-slate-900 dark:text-white">Import Process Finished</h2>
              <p className="card-subtitle text-[13px] mt-0.5">Summary of bulk spreadsheet import results.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/30 rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-[13px] text-emerald-800 dark:text-emerald-400 font-semibold uppercase tracking-wide">Successfully Imported</p>
                <h3 className="page-title text-emerald-600 dark:text-emerald-400 mt-1">{importResult.successCount}</h3>
              </div>
              <Check className="w-10 h-10 text-emerald-500/20" />
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900/30 rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="text-[13px] text-rose-800 dark:text-rose-400 font-semibold uppercase tracking-wide">Failed to Save</p>
                <h3 className="page-title text-rose-600 dark:text-rose-400 mt-1">{importResult.failedCount}</h3>
              </div>
              <AlertCircle className="w-10 h-10 text-rose-500/20" />
            </div>
          </div>

          {importResult.failures.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[15px] font-bold text-slate-800 dark:text-slate-200">Failure Error Logs</h3>
              <div className="border border-border rounded-xl overflow-hidden max-h-[250px] overflow-y-auto">
                <table className="erp-table text-[13px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-border text-[12px] text-slate-500 font-semibold uppercase">
                      <th className="px-4 py-2.5 text-left w-1/3">Row/Record</th>
                      <th className="px-4 py-2.5 text-left">Error Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {importResult.failures.map((f, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">{f.row}</td>
                        <td className="px-4 py-2.5 text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{f.error}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Credentials Download — students module only */}
          {module === "students" && importedCredentials.length > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/30 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h3 className="text-[14px] font-bold text-emerald-800 dark:text-emerald-400">Download Student Credentials</h3>
              </div>
              <p className="text-[12px] text-emerald-700 dark:text-emerald-400 font-medium">
                Credentials file for <strong>{importedCredentials.length}</strong> successfully imported student(s). Contains usernames and passwords for students and parents.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={downloadCredentialsCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download CSV
                </button>
                <button
                  onClick={downloadCredentialsPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-[13px] font-semibold rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Download / Print PDF
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              onClick={resetForm}
              className="px-5 py-2.5 border border-border bg-white dark:bg-slate-800 text-[13px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
            >
              Import Another File
            </button>
            <button
              onClick={() => router.push(backUrl)}
              className="px-5 py-2.5 bg-primary text-white text-[13px] font-semibold hover:bg-[var(--primary-hover)] rounded-lg cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
