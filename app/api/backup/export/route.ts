import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Student, Teacher, SalaryPayment, Attendance, Result, School, FeePayment } from "@/lib/models";
import StudentFeePayment from "@/lib/models/StudentFeePayment";
import { generatePDFBuffer, PDFBackupOptions } from "@/lib/utils/pdfGenerator";
import { sendEmail } from "@/lib/email";
import { requireAuth } from "@/lib/utils/auth";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const auth = requireAuth(req, ["school_admin", "super_admin"]);
    if (auth.error) {
      return auth.error;
    }
    const { user, schoolId } = auth;

    const body = await req.json().catch(() => ({}));
    const {
      module = "students",
      action = "download",
      email,
      academicYear,
      school_id,
    } = body;

    // Resolve tenant school scope
    const effectiveSchoolId =
      user.role === "super_admin"
        ? (school_id && school_id !== "all" ? school_id : user.school_id || null)
        : schoolId;

    let options: PDFBackupOptions = {
      title: "Data Backup Report",
      headers: [],
      rows: [],
    };

    let filename = `Backup_${module}_${Date.now()}.pdf`;

    // Fetch School metadata for Header
    let schoolDoc: any = null;
    if (effectiveSchoolId) {
      schoolDoc = await School.findById(effectiveSchoolId).lean();
    } else {
      schoolDoc = await School.findOne({}).lean();
    }
    const schoolName = schoolDoc?.name || "School Management System";
    options.schoolName = schoolName;

    // Base query filter scoped to tenant school
    const baseFilter: any = effectiveSchoolId ? { school_id: effectiveSchoolId } : {};

    switch (module) {
      case "students": {
        options.title = "Student Directory Backup Report";
        options.subtitle =
          academicYear && academicYear !== "all"
            ? `Academic Year: ${academicYear}`
            : "All Active & Inactive Students";
        options.headers = [
          "S.No",
          "Roll No",
          "Admission No",
          "Student Name",
          "Class",
          "Gender",
          "Phone",
          "Status",
        ];
        options.columnWidths = [32, 50, 68, 130, 60, 48, 87, 60];

        const query: any = { ...baseFilter };
        if (academicYear && academicYear !== "all") {
          const cleanYear = academicYear.trim();
          const variations = [
            cleanYear,
            cleanYear.replace("-", " - "),
            cleanYear.replace("-", " / "),
            cleanYear.replace("-", "/"),
          ];
          query.$or = [
            { academic_year: { $in: variations } },
            { academic_year: { $exists: false } },
            { academic_year: null },
            { academic_year: "" },
          ];
        }

        const students = await Student.find(query)
          .populate("class_id", "name section grade")
          .lean();

        if (students.length === 0) {
          return NextResponse.json({
            success: false,
            noData: true,
            message: "No students found in the system for this selection.",
          });
        }

        // Sort alphabetically by Student Name (A to Z)
        students.sort((a: any, b: any) => {
          const nameA = (a.name || `${a.first_name || ""} ${a.last_name || ""}`).trim();
          const nameB = (b.name || `${b.first_name || ""} ${b.last_name || ""}`).trim();
          return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
        });

        let totalMale = 0;
        let totalFemale = 0;
        let activeCount = 0;

        options.rows = students.map((s: any, idx: number) => {
          const name = (s.name || `${s.first_name || ""} ${s.last_name || ""}`).trim() || "N/A";
          const className = s.class_id
            ? `${s.class_id.name || ""}${s.class_id.section ? " (" + s.class_id.section + ")" : ""}`.trim() ||
              s.class_id.grade ||
              "N/A"
            : "N/A";
          const rawGender = s.gender || "-";
          const gender =
            rawGender.length > 1
              ? rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase()
              : rawGender;

          if (rawGender.toLowerCase().startsWith("m")) totalMale++;
          if (rawGender.toLowerCase().startsWith("f")) totalFemale++;

          const status = s.status || (s.is_active !== false ? "Active" : "Inactive");
          if (status.toLowerCase() === "active") activeCount++;

          return [
            idx + 1,
            s.roll_no || s.roll_number || "-",
            s.admission_no || s.admission_number || "-",
            name,
            className,
            gender,
            s.phone || s.guardian_phone || s.emergency_contact || "-",
            status,
          ];
        });

        options.summaryCards = [
          { label: "Total Students", value: students.length },
          { label: "Male", value: totalMale },
          { label: "Female", value: totalFemale },
          { label: "Active Status", value: activeCount },
        ];
        filename = `Students_Backup_${Date.now()}.pdf`;
        break;
      }

      case "teachers": {
        options.title = "Faculty & Staff Backup Report";
        options.subtitle = "Teacher Profiles & Employment Data";
        options.headers = [
          "S.No",
          "Emp ID",
          "Teacher Name",
          "Designation",
          "Qualification",
          "Phone",
          "Basic Salary",
          "Status",
        ];
        options.columnWidths = [32, 58, 130, 80, 75, 75, 55, 30];

        const teachers = await Teacher.find({ ...baseFilter }).lean();

        if (teachers.length === 0) {
          return NextResponse.json({
            success: false,
            noData: true,
            message: "No faculty or staff records found for this school.",
          });
        }

        // Sort alphabetically by Teacher Name (A to Z)
        teachers.sort((a: any, b: any) => {
          const nameA = (a.name || `${a.first_name || ""} ${a.last_name || ""}`).trim();
          const nameB = (b.name || `${b.first_name || ""} ${b.last_name || ""}`).trim();
          return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
        });

        let totalActive = 0;
        let totalSalary = 0;

        options.rows = teachers.map((t: any, idx: number) => {
          const name = (t.name || `${t.first_name || ""} ${t.last_name || ""}`).trim() || "N/A";
          const status = t.status || (t.is_active !== false ? "Active" : "Inactive");
          if (status.toLowerCase() === "active") totalActive++;

          const sal = Number(t.basic_salary || t.salary || 0);
          totalSalary += sal;

          return [
            idx + 1,
            t.employee_id || t.emp_id || "-",
            name,
            t.designation || "Teacher",
            t.qualification || "-",
            t.phone || t.contact_number || "-",
            sal > 0 ? `Rs. ${sal.toLocaleString("en-IN")}` : "-",
            status,
          ];
        });

        options.summaryCards = [
          { label: "Total Faculty", value: teachers.length },
          { label: "Active Staff", value: totalActive },
          { label: "Total Monthly Salary", value: `Rs. ${totalSalary.toLocaleString("en-IN")}` },
        ];
        filename = `Teachers_Backup_${Date.now()}.pdf`;
        break;
      }

      case "student_fees": {
        options.title = "Student Fee Collection Backup";
        options.subtitle = "Fee Payment Transactions & Receipts";
        options.headers = [
          "S.No",
          "Receipt No",
          "Student Name",
          "Payment Method",
          "Date",
          "Remarks",
          "Amount Paid",
        ];
        options.columnWidths = [32, 78, 140, 70, 70, 75, 70];

        // Query StudentFeePayment (primary), with FeePayment fallback
        let payments: any[] = await StudentFeePayment.find({ ...baseFilter })
          .populate("student_id", "first_name last_name name roll_no admission_no")
          .sort({ payment_date: -1, createdAt: -1 })
          .limit(1000)
          .lean();

        if (payments.length === 0) {
          payments = await FeePayment.find({ ...baseFilter })
            .populate("student_id", "first_name last_name name roll_no admission_no")
            .sort({ createdAt: -1 })
            .limit(1000)
            .lean();
        }

        if (payments.length === 0) {
          return NextResponse.json({
            success: false,
            noData: true,
            message: "No fee payment records found. Fee collection transactions will appear here once fees are collected.",
          });
        }

        // Sort alphabetically by Student Name (A to Z)
        payments.sort((a: any, b: any) => {
          const stA = a.student_id;
          const stB = b.student_id;
          const nameA = (stA ? (stA.name || `${stA.first_name || ""} ${stA.last_name || ""}`).trim() : "").toLowerCase();
          const nameB = (stB ? (stB.name || `${stB.first_name || ""} ${stB.last_name || ""}`).trim() : "").toLowerCase();
          return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
        });

        let totalCollection = 0;

        options.rows = payments.map((p: any, idx: number) => {
          const st = p.student_id;
          const studentName = st
            ? ((st.name || `${st.first_name || ""} ${st.last_name || ""}`).trim() || "N/A")
            : "N/A";
          const amount = Number(p.amount_paid || 0);
          totalCollection += amount;

          const paymentDate = p.payment_date || p.transaction_date || p.createdAt;
          const dateStr = paymentDate ? new Date(paymentDate).toLocaleDateString("en-IN") : "-";

          return [
            idx + 1,
            p.receipt_number || "-",
            studentName,
            p.payment_method || "Cash",
            dateStr,
            p.remarks || (p.collection_type ? `${p.collection_type}` : "-"),
            `Rs. ${amount.toLocaleString("en-IN")}`,
          ];
        });

        options.summaryCards = [
          { label: "Total Transactions", value: payments.length },
          { label: "Total Fee Collected", value: `Rs. ${totalCollection.toLocaleString("en-IN")}` },
        ];
        filename = `Student_Fees_Backup_${Date.now()}.pdf`;
        break;
      }

      case "teacher_fees": {
        options.title = "Teacher Salary Disbursement Backup";
        options.subtitle = "Staff Salary Records & Payment History";
        options.headers = [
          "S.No",
          "Voucher No",
          "Teacher Name",
          "Month / Period",
          "Basic",
          "Allowances",
          "Deductions",
          "Net Paid",
        ];
        options.columnWidths = [32, 68, 130, 75, 55, 55, 55, 65];

        const salaryLogs = await SalaryPayment.find({ ...baseFilter })
          .populate("teacher_id", "first_name last_name name employee_id")
          .sort({ payment_date: -1, createdAt: -1 })
          .limit(1000)
          .lean();

        if (salaryLogs.length === 0) {
          return NextResponse.json({
            success: false,
            noData: true,
            message: "No salary disbursement records found. Salary vouchers will appear here after processing payroll.",
          });
        }

        // Sort alphabetically by Teacher Name (A to Z)
        salaryLogs.sort((a: any, b: any) => {
          const tA = a.teacher_id;
          const tB = b.teacher_id;
          const nameA = (tA ? (tA.name || `${tA.first_name || ""} ${tA.last_name || ""}`).trim() : "").toLowerCase();
          const nameB = (tB ? (tB.name || `${tB.first_name || ""} ${tB.last_name || ""}`).trim() : "").toLowerCase();
          return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
        });

        let totalNetSalary = 0;

        options.rows = salaryLogs.map((s: any, idx: number) => {
          const t = s.teacher_id;
          const teacherName = t
            ? ((t.name || `${t.first_name || ""} ${t.last_name || ""}`).trim() || "N/A")
            : "N/A";

          const netPaid = Number(s.final_salary ?? s.payable_amount ?? s.net_salary ?? s.amount_paid ?? 0);
          totalNetSalary += netPaid;

          const monthYear = s.salary_period || (s.month && s.year ? `${s.month} ${s.year}` : s.payment_month || "-");
          const basicSal = Number(s.monthly_salary ?? s.basic_salary ?? 0);
          const allowances = Number((s.bonus || 0) + (s.overtime_amount || 0) || s.allowances || 0);
          const deductions = Number(
            (s.deduction || 0) + (s.tax_deduction || 0) + (s.suggested_deduction || 0) || s.deductions || 0
          );

          return [
            idx + 1,
            s.receipt_number || s.voucher_number || "-",
            teacherName,
            monthYear,
            basicSal > 0 ? `Rs. ${basicSal.toLocaleString("en-IN")}` : "-",
            allowances > 0 ? `Rs. ${allowances.toLocaleString("en-IN")}` : "0",
            deductions > 0 ? `Rs. ${deductions.toLocaleString("en-IN")}` : "0",
            `Rs. ${netPaid.toLocaleString("en-IN")}`,
          ];
        });

        options.summaryCards = [
          { label: "Disbursement Logs", value: salaryLogs.length },
          { label: "Total Salary Paid", value: `Rs. ${totalNetSalary.toLocaleString("en-IN")}` },
        ];
        filename = `Teacher_Salaries_Backup_${Date.now()}.pdf`;
        break;
      }

      case "attendance": {
        options.title = "Attendance Summary Backup Report";
        options.subtitle = "Student & Faculty Daily Attendance Records";
        options.headers = [
          "S.No",
          "Date",
          "Attendance Scope",
          "Academic Year",
          "Total Marked",
          "Present",
          "Absent",
          "Leave",
        ];
        options.columnWidths = [32, 70, 95, 75, 65, 65, 65, 68];

        const query: any = { ...baseFilter };
        if (academicYear && academicYear !== "all") {
          query.academic_year = academicYear;
        }

        const attendanceLogs = await Attendance.find(query)
          .populate("class_id", "name section")
          .sort({ date: -1 })
          .limit(500)
          .lean();

        if (attendanceLogs.length === 0) {
          return NextResponse.json({
            success: false,
            noData: true,
            message: "No attendance records found. Daily attendance logs will appear here once attendance is marked.",
          });
        }

        attendanceLogs.sort((a: any, b: any) => {
          const typeA = (a.type || "student").toLowerCase();
          const typeB = (b.type || "student").toLowerCase();
          if (typeA !== typeB) return typeA.localeCompare(typeB);
          return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
        });

        let totalPresent = 0;
        let totalAbsent = 0;

        options.rows = attendanceLogs.map((a: any, idx: number) => {
          const records = a.records || [];
          let present = 0;
          let absent = 0;
          let leave = 0;

          records.forEach((r: any) => {
            const st = (r.status || "").toLowerCase();
            if (st === "present") present++;
            else if (st === "absent") absent++;
            else leave++;
          });

          totalPresent += present;
          totalAbsent += absent;

          const dateStr = a.date ? new Date(a.date).toLocaleDateString("en-IN") : "-";
          const scopeLabel =
            a.type === "teacher"
              ? "Faculty / Staff"
              : a.class_id
              ? `Class ${a.class_id.name || ""}${a.class_id.section ? " (" + a.class_id.section + ")" : ""}`
              : "Student";

          return [
            idx + 1,
            dateStr,
            scopeLabel,
            a.academic_year || "-",
            records.length,
            present,
            absent,
            leave,
          ];
        });

        options.summaryCards = [
          { label: "Attendance Logs", value: attendanceLogs.length },
          { label: "Total Present Logs", value: totalPresent },
          { label: "Total Absent Logs", value: totalAbsent },
        ];
        filename = `Attendance_Backup_${Date.now()}.pdf`;
        break;
      }

      case "exams": {
        options.title = "Examination & Results Backup Report";
        options.subtitle = "Academic Performance Records";
        options.headers = [
          "S.No",
          "Student Name",
          "Exam Name",
          "Subject",
          "Marks",
          "Max Marks",
          "Grade",
          "Status",
        ];
        options.columnWidths = [32, 130, 85, 85, 48, 55, 45, 55];

        const results = await Result.find({ ...baseFilter })
          .populate("student_id", "first_name last_name name")
          .populate("exam_id", "name")
          .populate("subject_id", "name")
          .sort({ createdAt: -1 })
          .limit(1000)
          .lean();

        if (results.length === 0) {
          return NextResponse.json({
            success: false,
            noData: true,
            message: "No exam results found. Results will appear here after exams are conducted and marks are entered.",
          });
        }

        // Sort alphabetically by Student Name (A to Z)
        results.sort((a: any, b: any) => {
          const stA = a.student_id;
          const stB = b.student_id;
          const nameA = (stA ? (stA.name || `${stA.first_name || ""} ${stA.last_name || ""}`).trim() : "").toLowerCase();
          const nameB = (stB ? (stB.name || `${stB.first_name || ""} ${stB.last_name || ""}`).trim() : "").toLowerCase();
          return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
        });

        let passCount = 0;

        options.rows = results.map((r: any, idx: number) => {
          const st = r.student_id;
          const studentName = st
            ? ((st.name || `${st.first_name || ""} ${st.last_name || ""}`).trim() || "N/A")
            : "N/A";
          const examName = r.exam_id?.name || "Exam";
          const subjectName = r.subject_id?.name || "Subject";

          const isPass = r.is_pass ?? (Number(r.marks_obtained || 0) >= Number(r.passing_marks || 33));
          if (isPass) passCount++;

          return [
            idx + 1,
            studentName,
            examName,
            subjectName,
            r.marks_obtained ?? 0,
            r.total_marks ?? 100,
            r.grade || "-",
            isPass ? "PASS" : "FAIL",
          ];
        });

        options.summaryCards = [
          { label: "Result Records", value: results.length },
          { label: "Passed Count", value: passCount },
          { label: "Failed Count", value: results.length - passCount },
        ];
        filename = `Exam_Results_Backup_${Date.now()}.pdf`;
        break;
      }

      case "full_backup":
      default: {
        options.title = "Full School System Executive Backup Summary";
        options.subtitle = "System-Wide Overview & Count Statistics";
        options.headers = [
          "S.No",
          "System Module",
          "Total Active Records",
          "Key Metric / Financial Summary",
          "Status",
        ];
        options.columnWidths = [35, 140, 90, 210, 60];

        const [
          studentCount,
          teacherCount,
          studentFeePayments,
          salaryPayments,
          attendanceCount,
          examCount,
        ] = await Promise.all([
          Student.countDocuments({ ...baseFilter }),
          Teacher.countDocuments({ ...baseFilter }),
          StudentFeePayment.find({ ...baseFilter }).lean(),
          SalaryPayment.find({ ...baseFilter }).lean(),
          Attendance.countDocuments({ ...baseFilter }),
          Result.countDocuments({ ...baseFilter }),
        ]);

        const totalFeesCollected = (studentFeePayments as any[]).reduce(
          (acc, p) => acc + Number(p.amount_paid || 0),
          0
        );
        const totalSalaryPaid = (salaryPayments as any[]).reduce(
          (acc, s) => acc + Number(s.final_salary ?? s.payable_amount ?? s.net_salary ?? s.amount_paid ?? 0),
          0
        );

        const modules = [
          {
            name: "Attendance Logs",
            count: attendanceCount,
            summary: `${attendanceCount} Daily Attendance Sheets`,
            status: attendanceCount > 0 ? "Active" : "No Data",
          },
          {
            name: "Examination Results",
            count: examCount,
            summary: `${examCount} Grade & Result Entries`,
            status: examCount > 0 ? "Active" : "No Data",
          },
          {
            name: "Faculty & Staff",
            count: teacherCount,
            summary: `${teacherCount} Teachers & Staff`,
            status: teacherCount > 0 ? "Active" : "No Data",
          },
          {
            name: "Student Fees Collection",
            count: studentFeePayments.length,
            summary: `Rs. ${totalFeesCollected.toLocaleString("en-IN")} Collected`,
            status: studentFeePayments.length > 0 ? "Active" : "No Data",
          },
          {
            name: "Students Management",
            count: studentCount,
            summary: `${studentCount} Enrolled Students`,
            status: studentCount > 0 ? "Active" : "No Data",
          },
          {
            name: "Teacher Salary Payroll",
            count: salaryPayments.length,
            summary: `Rs. ${totalSalaryPaid.toLocaleString("en-IN")} Paid`,
            status: salaryPayments.length > 0 ? "Active" : "No Data",
          },
        ];

        // Sort modules alphabetically (A to Z)
        modules.sort((a, b) => a.name.localeCompare(b.name));

        const totalAllModules =
          studentCount +
          teacherCount +
          studentFeePayments.length +
          salaryPayments.length +
          attendanceCount +
          examCount;

        if (totalAllModules === 0) {
          return NextResponse.json({
            success: false,
            noData: true,
            message:
              "No data found in any module. Please add students, teachers, or records first before generating a full backup.",
          });
        }

        options.rows = modules.map((m, idx) => [
          idx + 1,
          m.name,
          m.count,
          m.summary,
          m.status,
        ]);

        options.summaryCards = [
          { label: "Total Students", value: studentCount },
          { label: "Total Staff", value: teacherCount },
          { label: "Total Revenue", value: `Rs. ${totalFeesCollected.toLocaleString("en-IN")}` },
          { label: "Total Payroll", value: `Rs. ${totalSalaryPaid.toLocaleString("en-IN")}` },
        ];
        filename = `Full_System_Backup_${Date.now()}.pdf`;
        break;
      }
    }

    // ── Generate the PDF Buffer ──────────────────────────────────
    const pdfBuffer = await generatePDFBuffer(options);

    // If action is EMAIL
    if (action === "email") {
      if (!email || !email.includes("@")) {
        return NextResponse.json(
          { success: false, error: "Valid email address is required." },
          { status: 400 }
        );
      }

      const emailSent = await sendEmail({
        to: email,
        subject: `[School Backup] ${options.title} - ${new Date().toLocaleDateString("en-IN")}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0284c7; margin-top: 0;">School System Data Backup</h2>
            <p>Hello,</p>
            <p>Please find attached the official PDF backup document for <strong>${options.title}</strong>.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;"><strong>School:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;">${options.schoolName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;"><strong>Module:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;">${options.title}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;"><strong>Generated Date:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;">${new Date().toLocaleString("en-IN")}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;"><strong>Total Records:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #cbd5e1;">${options.rows.length}</td>
              </tr>
            </table>
            <p style="color: #64748b; font-size: 12px;">This is an automated system backup email sent from your School Management Dashboard.</p>
          </div>
        `,
        attachments: [
          {
            filename,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      });

      if (!emailSent) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to send email. Please verify SMTP host and credentials in settings/.env.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Backup PDF sent successfully to ${email}`,
      });
    }

    // Default action: DOWNLOAD
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Error generating backup PDF:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Server Error" },
      { status: 500 }
    );
  }
}
