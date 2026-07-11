import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Class from "@/lib/models/Class";
import { requireAuth } from "@/lib/utils/auth";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectDB();

    // Fetch all active classes for the school
    const allClasses = await Class.find({ school_id: schoolId, status: "Active" })
      .sort({ name: 1, section: 1 })
      .lean();

    const headers = [
      "Admission No",
      "Roll No",
      "Student Name",
      "Class",
      "Section",
      "Gender",
      "DOB",
      "Primary Phone",
      "Email",
      "Address",
      "Guardian Name",
      "Guardian Phone",
      "Guardian Email",
      "Guardian Relation",
      "Academic Year",
      "Aadhaar No",
    ];

    // Build dynamic sample rows from first 2 real classes (fallback to placeholder)
    const sampleRows: string[][] = [];
    if (allClasses.length > 0) {
      const cls1 = allClasses[0];
      sampleRows.push([
        "ADM001", "1", "Sample Student", cls1.name, cls1.section || "",
        "Male", "2010-05-15", "9876543210", "", "123 Main Street",
        "Guardian Name", "9876543211", "", "Father", "2026-2027", "",
      ]);
      const cls2 = allClasses[1] || allClasses[0];
      sampleRows.push([
        "ADM002", "2", "Sample Student 2", cls2.name, cls2.section || "",
        "Female", "2010-08-22", "9876543220", "", "456 Oak Road",
        "Guardian Name 2", "9876543221", "", "Mother", "2026-2027", "",
      ]);
    }

    const templateData = [headers, ...sampleRows];
    const ws1 = XLSX.utils.aoa_to_sheet(templateData);

    // Highlight header row bold styling (best-effort with SheetJS community)
    ws1["!cols"] = headers.map(() => ({ wch: 18 }));

    // ── Sheet 2: Available Classes (reference) ────────────────────────
    const classSheetHeaders = ["Class Name", "Section", "Use exactly these values in the 'Class' and 'Section' columns"];
    const classRows = allClasses.map(c => [c.name, c.section || "", ""]);
    const ws2 = XLSX.utils.aoa_to_sheet([classSheetHeaders, ...classRows]);
    ws2["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 55 }];

    // ── Workbook ──────────────────────────────────────────────────────
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Student Import");
    XLSX.utils.book_append_sheet(wb, ws2, "Available Classes");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=\"student_import_template.xlsx\"",
      },
    });
  } catch (err: any) {
    console.error("[GET /api/students/import/template]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to generate template" },
      { status: 500 }
    );
  }
}
