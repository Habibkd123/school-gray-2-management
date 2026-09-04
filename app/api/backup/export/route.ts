import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Student, Teacher, FeePayment, SalaryPayment, Attendance, Result, School } from "@/lib/models";
import { generatePDFBuffer, PDFBackupOptions } from "@/lib/utils/pdfGenerator";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { module = "students", action = "download", email, academicYear } = body;

    let options: PDFBackupOptions = {
      title: "Data Backup Report",
      headers: [],
      rows: [],
    };

    let filename = `Backup_${module}_${Date.now()}.pdf`;

    // Fetch School metadata for Header if available
    const school = await School.findOne({}).lean();
    const schoolName = school?.name || "School Management System";
    options.schoolName = schoolName;

    switch (module) {
      case "students": {
        options.title = "Student Directory Backup Report";
        options.subtitle = academicYear ? `Academic Year: ${academicYear}` : "All Active & Inactive Students";
        options.headers = ["Roll No", "Admission No", "Student Name", "Class", "Gender", "Phone", "Status"];

        const query: any = {};
        if (academicYear) query.academic_year = academicYear;

        const students = await Student.find(query).populate("class_id", "name grade").sort({ admission_number: 1 }).lean();

        let totalMale = 0;
        let totalFemale = 0;
        let activeCount = 0;

        options.rows = students.map((s: any) => {
          const name = s.first_name || s.last_name ? `${s.first_name || ""} ${s.last_name || ""}`.trim() : (s.name || "N/A");
          const className = s.class_id?.name || s.class_id?.grade || "N/A";
          const gender = s.gender || "-";
          if (gender.toLowerCase().startsWith("m")) totalMale++;
          if (gender.toLowerCase().startsWith("f")) totalFemale++;

          const status = s.status || "Active";
          if (status.toLowerCase() === "active") activeCount++;

          return [
            s.roll_number || s.roll_no || "-",
            s.admission_number || s.admission_no || "-",
            name,
            className,
            gender,
            s.phone || s.contact_number || s.emergency_contact || "-",
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
        options.headers = ["Emp ID", "Teacher Name", "Designation", "Qualification", "Phone", "Basic Salary", "Status"];

        const teachers = await Teacher.find({}).sort({ employee_id: 1 }).lean();

        let totalActive = 0;
        let totalSalary = 0;

        options.rows = teachers.map((t: any) => {
          const name = t.first_name || t.last_name ? `${t.first_name || ""} ${t.last_name || ""}`.trim() : (t.name || "N/A");
          const status = t.status || "Active";
          if (status.toLowerCase() === "active") totalActive++;
          
          const sal = Number(t.basic_salary || t.salary || 0);
          totalSalary += sal;

          return [
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
        options.headers = ["Receipt No", "Student Name", "Payment Method", "Transaction Date", "Remarks", "Amount Paid"];

        const payments = await FeePayment.find({}).populate("student_id", "first_name last_name name").sort({ transaction_date: -1 }).limit(200).lean();

        let totalCollection = 0;

        options.rows = payments.map((p: any) => {
          const st = p.student_id;
          const studentName = st ? (st.first_name || st.last_name ? `${st.first_name || ""} ${st.last_name || ""}`.trim() : (st.name || "N/A")) : "N/A";
          const amount = Number(p.amount_paid || 0);
          totalCollection += amount;

          const dateStr = p.transaction_date ? new Date(p.transaction_date).toLocaleDateString("en-IN") : "-";

          return [
            p.receipt_number || "-",
            studentName,
            p.payment_method || "Cash",
            dateStr,
            p.remarks || "-",
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
        options.headers = ["Voucher No", "Teacher Name", "Month / Year", "Basic", "Allowances", "Deductions", "Net Paid"];

        const salaryLogs = await SalaryPayment.find({}).populate("teacher_id", "first_name last_name name employee_id").sort({ payment_date: -1 }).limit(200).lean();

        let totalNetSalary = 0;

        options.rows = salaryLogs.map((s: any) => {
          const t = s.teacher_id;
          const teacherName = t ? (t.first_name || t.last_name ? `${t.first_name || ""} ${t.last_name || ""}`.trim() : (t.name || "N/A")) : "N/A";
          
          const netPaid = Number(s.net_salary || s.amount_paid || 0);
          totalNetSalary += netPaid;

          const monthYear = s.month && s.year ? `${s.month} ${s.year}` : s.payment_month || "-";

          return [
            s.voucher_number || s.receipt_number || "-",
            teacherName,
            monthYear,
            s.basic_salary ? `Rs. ${s.basic_salary}` : "-",
            s.allowances ? `Rs. ${s.allowances}` : "0",
            s.deductions ? `Rs. ${s.deductions}` : "0",
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
        options.headers = ["Date", "Attendance Type", "Academic Year", "Total Marked", "Present", "Absent", "Leave"];

        const attendanceLogs = await Attendance.find({}).sort({ date: -1 }).limit(150).lean();

        let totalPresent = 0;
        let totalAbsent = 0;

        options.rows = attendanceLogs.map((a: any) => {
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

          return [
            dateStr,
            (a.type || "student").toUpperCase(),
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
        options.headers = ["Student Name", "Exam Name", "Subject", "Marks Obtained", "Total Marks", "Grade", "Status"];

        const results = await Result.find({})
          .populate("student_id", "first_name last_name name")
          .populate("exam_id", "name")
          .populate("subject_id", "name")
          .sort({ createdAt: -1 })
          .limit(200)
          .lean();

        let passCount = 0;

        options.rows = results.map((r: any) => {
          const st = r.student_id;
          const studentName = st ? (st.first_name || st.last_name ? `${st.first_name || ""} ${st.last_name || ""}`.trim() : (st.name || "N/A")) : "N/A";
          const examName = r.exam_id?.name || "Exam";
          const subjectName = r.subject_id?.name || "Subject";
          
          const isPass = r.is_pass ?? (Number(r.marks_obtained || 0) >= Number(r.passing_marks || 33));
          if (isPass) passCount++;

          return [
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
        options.headers = ["System Module", "Total Active Records", "Key Metric / Financial Summary", "Status"];

        const [studentCount, teacherCount, feePayments, salaryPayments, attendanceCount, examCount] = await Promise.all([
          Student.countDocuments({}),
          Teacher.countDocuments({}),
          FeePayment.find({}).lean(),
          SalaryPayment.find({}).lean(),
          Attendance.countDocuments({}),
          Result.countDocuments({}),
        ]);

        const totalFeesCollected = feePayments.reduce((acc, p: any) => acc + Number(p.amount_paid || 0), 0);
        const totalSalaryPaid = salaryPayments.reduce((acc, s: any) => acc + Number(s.net_salary || s.amount_paid || 0), 0);

        options.rows = [
          ["Students Management", studentCount, `${studentCount} Enrolled Students`, "Active"],
          ["Faculty & Staff", teacherCount, `${teacherCount} Teachers & Staff`, "Active"],
          ["Student Fees Collection", feePayments.length, `Rs. ${totalFeesCollected.toLocaleString("en-IN")} Total Collected`, "Active"],
          ["Teacher Salary Payroll", salaryPayments.length, `Rs. ${totalSalaryPaid.toLocaleString("en-IN")} Total Paid`, "Active"],
          ["Attendance Logs", attendanceCount, `${attendanceCount} Daily Attendance Sheets`, "Active"],
          ["Examination Results", examCount, `${examCount} Grade & Result Entries`, "Active"],
        ];

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

    // Generate the PDF Buffer
    const pdfBuffer = await generatePDFBuffer(options);

    // If action is EMAIL
    if (action === "email") {
      if (!email || !email.includes("@")) {
        return NextResponse.json({ success: false, error: "Valid email address is required." }, { status: 400 });
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
    return NextResponse.json({ success: false, error: error.message || "Server Error" }, { status: 500 });
  }
}
