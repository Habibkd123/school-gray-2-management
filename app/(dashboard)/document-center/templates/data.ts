export interface DocumentCategory {
  id: string;
  name: string;
  type: "student" | "teacher";
}

export const CATEGORIES: DocumentCategory[] = [
  { id: "bonafide", name: "Bonafide Certificate", type: "student" },
  { id: "transfer", name: "Transfer Certificate (TC)", type: "student" },
  { id: "character", name: "Character Certificate", type: "student" },
  { id: "study", name: "Study Certificate", type: "student" },
  { id: "experience", name: "Experience Certificate", type: "teacher" },
  { id: "salary", name: "Salary Slip", type: "teacher" },
  { id: "id-card", name: "ID Card", type: "student" },
  { id: "report-card", name: "Report Card", type: "student" },
];

export interface VisualTemplate {
  id: string;
  categoryId: string;
  name: string;
  thumbnailBg: string;
  getHtml: (data: any, schoolName: string) => string;
}

export const TEMPLATES: VisualTemplate[] = [
  // ─── BONAFIDE CERTIFICATE ───────────────────────────────────────────────────
  {
    id: "bonafide-classic",
    categoryId: "bonafide",
    name: "Classic Border",
    thumbnailBg: "bg-amber-50 border-amber-200",
    getHtml: (data, schoolName) => `
      <div style="border: 8px solid #b45309; padding: 40px; text-align: center; height: 100%; box-sizing: border-box; background: white; font-family: serif;">
        <h1 style="color: #b45309; margin-bottom: 5px; font-size: 28px; text-transform: uppercase;">${schoolName}</h1>
        <h2 style="font-size: 20px; font-weight: normal; margin-top: 0; margin-bottom: 40px; text-decoration: underline;">BONAFIDE CERTIFICATE</h2>
        
        <p style="font-size: 18px; line-height: 2; text-align: justify;">
          This is to certify that <strong><span contenteditable="true">${data.name || "Student Name"}</span></strong>, 
          Son/Daughter of <strong><span contenteditable="true">${data.father_name || "Father Name"}</span></strong>, 
          is a bonafide student of this institution.
        </p>
        <p style="font-size: 18px; line-height: 2; text-align: justify;">
          He/She is studying in Class <strong><span contenteditable="true">${data.class || "Class"}</span></strong>, 
          bearing Admission No. <strong><span contenteditable="true">${data.admission_no || "Admission No"}</span></strong> 
          for the academic year <strong><span contenteditable="true">${new Date().getFullYear()} - ${new Date().getFullYear() + 1}</span></strong>.
        </p>
        <p style="font-size: 18px; line-height: 2; text-align: justify;">
          To the best of our knowledge, he/she bears a good moral character.
        </p>
        
        <div style="margin-top: 80px; display: flex; justify-content: space-between;">
          <div style="text-align: left;">
            <p>Date: <span contenteditable="true">${data.date}</span></p>
            <p>Place: <span contenteditable="true">____________</span></p>
          </div>
          <div style="text-align: center;">
            <p style="margin-bottom: 60px;">&nbsp;</p>
            <p style="border-top: 1px solid #000; padding-top: 5px; width: 200px;">Principal Signature</p>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "bonafide-modern",
    categoryId: "bonafide",
    name: "Modern Blue",
    thumbnailBg: "bg-blue-50 border-blue-200",
    getHtml: (data, schoolName) => `
      <div style="border: 2px solid #1e3a8a; padding: 40px; text-align: center; height: 100%; box-sizing: border-box; background: white; font-family: sans-serif; position: relative;">
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 10px; background-color: #1e3a8a;"></div>
        <h1 style="color: #1e3a8a; margin-top: 20px; font-size: 26px; font-weight: bold;">${schoolName}</h1>
        <h3 style="color: #64748b; margin-top: 0; font-weight: normal; text-transform: uppercase; letter-spacing: 2px;">Bonafide Certificate</h3>
        
        <div style="margin-top: 50px; text-align: left; padding: 0 40px;">
          <p style="font-size: 16px; line-height: 1.8; color: #334155;">
            This is to certify that Mr./Ms. <strong style="color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px;"><span contenteditable="true">${data.name || "Student Name"}</span></strong>, 
            child of <strong style="color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px;"><span contenteditable="true">${data.father_name || "Father Name"}</span></strong>, 
            is a bonafide student of our school.
          </p>
          <p style="font-size: 16px; line-height: 1.8; color: #334155;">
            Currently enrolled in Grade <strong style="color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px;"><span contenteditable="true">${data.class || "Class"}</span></strong>, 
            Admission No. <strong style="color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px;"><span contenteditable="true">${data.admission_no || "Admission No"}</span></strong>.
          </p>
          <p style="font-size: 16px; line-height: 1.8; color: #334155; margin-top: 20px;">
            Issued on: <span contenteditable="true">${data.date}</span>
          </p>
        </div>
        
        <div style="position: absolute; bottom: 40px; right: 60px; text-align: center;">
          <p style="font-weight: bold; color: #1e3a8a; margin-bottom: 5px; margin-top: 60px;">Authorized Signatory</p>
          <p style="font-size: 12px; color: #64748b;">${schoolName}</p>
        </div>
      </div>
    `
  },

  // ─── TRANSFER CERTIFICATE (TC) ──────────────────────────────────────────────
  {
    id: "tc-standard",
    categoryId: "transfer",
    name: "Standard Format",
    thumbnailBg: "bg-slate-50 border-slate-200",
    getHtml: (data, schoolName) => `
      <div style="border: 4px double #333; padding: 30px; height: 100%; box-sizing: border-box; background: white; font-family: serif;">
        <h1 style="text-align: center; font-size: 24px; margin-bottom: 5px; text-transform: uppercase;">${schoolName}</h1>
        <h2 style="text-align: center; font-size: 18px; margin-top: 0; margin-bottom: 30px; text-decoration: underline;">TRANSFER CERTIFICATE</h2>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 16px;">
          <tbody>
            <tr><td style="padding: 8px 0; width: 40%;">1. Name of Pupil:</td><td style="border-bottom: 1px dashed #999;"><span contenteditable="true">${data.name || ""}</span></td></tr>
            <tr><td style="padding: 8px 0;">2. Father's/Guardian's Name:</td><td style="border-bottom: 1px dashed #999;"><span contenteditable="true">${data.father_name || ""}</span></td></tr>
            <tr><td style="padding: 8px 0;">3. Mother's Name:</td><td style="border-bottom: 1px dashed #999;"><span contenteditable="true">${data.mother_name || ""}</span></td></tr>
            <tr><td style="padding: 8px 0;">4. Nationality:</td><td style="border-bottom: 1px dashed #999;"><span contenteditable="true">Indian</span></td></tr>
            <tr><td style="padding: 8px 0;">5. Date of Birth:</td><td style="border-bottom: 1px dashed #999;"><span contenteditable="true">${data.dob || ""}</span></td></tr>
            <tr><td style="padding: 8px 0;">6. Class in which studying:</td><td style="border-bottom: 1px dashed #999;"><span contenteditable="true">${data.class || ""}</span></td></tr>
            <tr><td style="padding: 8px 0;">7. Admission No.:</td><td style="border-bottom: 1px dashed #999;"><span contenteditable="true">${data.admission_no || ""}</span></td></tr>
            <tr><td style="padding: 8px 0;">8. General Conduct:</td><td style="border-bottom: 1px dashed #999;"><span contenteditable="true">Good</span></td></tr>
            <tr><td style="padding: 8px 0;">9. Date of application for TC:</td><td style="border-bottom: 1px dashed #999;"><span contenteditable="true">${data.date}</span></td></tr>
            <tr><td style="padding: 8px 0;">10. Date of issue of TC:</td><td style="border-bottom: 1px dashed #999;"><span contenteditable="true">${data.date}</span></td></tr>
            <tr><td style="padding: 8px 0;">11. Reason for leaving:</td><td style="border-bottom: 1px dashed #999;"><span contenteditable="true">Parents' Request</span></td></tr>
          </tbody>
        </table>
        
        <div style="margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <p style="border-top: 1px solid #000; padding-top: 5px; width: 150px; text-align: center;">Prepared By</p>
          </div>
          <div>
            <p style="border-top: 1px solid #000; padding-top: 5px; width: 150px; text-align: center;">Checked By</p>
          </div>
          <div>
            <p style="border-top: 1px solid #000; padding-top: 5px; width: 150px; text-align: center;">Principal Seal & Signature</p>
          </div>
        </div>
      </div>
    `
  },

  // ─── REPORT CARD ────────────────────────────────────────────────────────────
  {
    id: "report-standard",
    categoryId: "report-card",
    name: "Term Report",
    thumbnailBg: "bg-emerald-50 border-emerald-200",
    getHtml: (data, schoolName) => `
      <div style="border: 2px solid #000; padding: 20px; height: 100%; box-sizing: border-box; background: white; font-family: sans-serif;">
        <h1 style="text-align: center; margin: 0; font-size: 22px; text-transform: uppercase;">${schoolName}</h1>
        <h2 style="text-align: center; margin: 5px 0 20px; font-size: 16px; font-weight: normal; background-color: #f1f5f9; padding: 5px;">ANNUAL STATEMENT OF MARKS</h2>
        
        <table style="width: 100%; margin-bottom: 20px; font-size: 14px;">
          <tr>
            <td style="padding: 4px;"><strong>Student Name:</strong> <span contenteditable="true">${data.name || ""}</span></td>
            <td style="padding: 4px; text-align: right;"><strong>Class/Sec:</strong> <span contenteditable="true">${data.class || ""}</span></td>
          </tr>
          <tr>
            <td style="padding: 4px;"><strong>Admission No:</strong> <span contenteditable="true">${data.admission_no || ""}</span></td>
            <td style="padding: 4px; text-align: right;"><strong>Roll No:</strong> <span contenteditable="true">${data.roll_no || ""}</span></td>
          </tr>
          <tr>
            <td style="padding: 4px;"><strong>Father's Name:</strong> <span contenteditable="true">${data.father_name || ""}</span></td>
            <td style="padding: 4px; text-align: right;"><strong>DOB:</strong> <span contenteditable="true">${data.dob || ""}</span></td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: center;" border="1">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="padding: 8px; text-align: left;" rowspan="2">Subjects</th>
              <th style="padding: 8px;" colspan="3">Term 1 (100)</th>
              <th style="padding: 8px;" colspan="3">Term 2 (100)</th>
              <th style="padding: 8px;" colspan="3">Final Total (200)</th>
            </tr>
            <tr style="background-color: #f8fafc; font-size: 12px;">
              <th style="padding: 4px;">Marks</th><th style="padding: 4px;">%</th><th style="padding: 4px;">Grade</th>
              <th style="padding: 4px;">Marks</th><th style="padding: 4px;">%</th><th style="padding: 4px;">Grade</th>
              <th style="padding: 4px;">Marks</th><th style="padding: 4px;">%</th><th style="padding: 4px;">Grade</th>
            </tr>
          </thead>
          <tbody contenteditable="true">
            <tr>
              <td style="padding: 8px; text-align: left;">English</td>
              <td>75</td><td>75%</td><td>B1</td>
              <td>82</td><td>82%</td><td>A2</td>
              <td>157</td><td>78.5%</td><td>B1</td>
            </tr>
            <tr>
              <td style="padding: 8px; text-align: left;">Hindi / Regional</td>
              <td>88</td><td>88%</td><td>A2</td>
              <td>91</td><td>91%</td><td>A1</td>
              <td>179</td><td>89.5%</td><td>A2</td>
            </tr>
            <tr>
              <td style="padding: 8px; text-align: left;">Mathematics</td>
              <td>95</td><td>95%</td><td>A1</td>
              <td>98</td><td>98%</td><td>A1</td>
              <td>193</td><td>96.5%</td><td>A1</td>
            </tr>
            <tr>
              <td style="padding: 8px; text-align: left;">Science</td>
              <td>84</td><td>84%</td><td>A2</td>
              <td>89</td><td>89%</td><td>A2</td>
              <td>173</td><td>86.5%</td><td>A2</td>
            </tr>
            <tr>
              <td style="padding: 8px; text-align: left;">Social Science</td>
              <td>78</td><td>78%</td><td>B1</td>
              <td>85</td><td>85%</td><td>A2</td>
              <td>163</td><td>81.5%</td><td>B1</td>
            </tr>
            <tr style="font-weight: bold; background-color: #f1f5f9;">
              <td style="padding: 8px; text-align: left;">GRAND TOTAL</td>
              <td>420</td><td>84%</td><td>A2</td>
              <td>445</td><td>89%</td><td>A2</td>
              <td>865</td><td>86.5%</td><td>A2</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 50px; display: flex; justify-content: space-between; font-size: 14px;">
          <div><p>Class Teacher</p></div>
          <div><p>Principal</p></div>
          <div><p>Parents</p></div>
        </div>
      </div>
    `
  },

  // ─── ID CARD ────────────────────────────────────────────────────────────────
  {
    id: "id-vertical",
    categoryId: "id-card",
    name: "Vertical Badge",
    thumbnailBg: "bg-indigo-50 border-indigo-200",
    getHtml: (data, schoolName) => `
      <div style="width: 2.125in; height: 3.375in; border: 1px solid #ccc; border-radius: 8px; overflow: hidden; font-family: sans-serif; position: relative; background: white; margin: 0 auto; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
        <div style="background-color: #4f46e5; color: white; padding: 12px 8px; text-align: center;">
          <h3 style="margin: 0; font-size: 12px; line-height: 1.2;">${schoolName}</h3>
        </div>
        
        <div style="text-align: center; margin-top: 15px;">
          <div style="width: 80px; height: 90px; background-color: #e2e8f0; border: 2px solid #4f46e5; border-radius: 4px; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 10px;">
            ${data.photo_url ? `<img src="${data.photo_url}" style="width: 100%; height: 100%; object-fit: cover;" />` : "PHOTO"}
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 10px; padding: 0 10px;">
          <h2 style="margin: 0; font-size: 14px; color: #1e293b;"><span contenteditable="true">${data.name || "Student Name"}</span></h2>
          <p style="margin: 2px 0 0; font-size: 11px; color: #64748b; font-weight: bold;"><span contenteditable="true">Class: ${data.class || ""}</span></p>
        </div>
        
        <div style="margin-top: 15px; padding: 0 15px; font-size: 10px; color: #334155; line-height: 1.5;">
          <p style="margin: 0;"><strong>DOB:</strong> <span contenteditable="true">${data.dob || ""}</span></p>
          <p style="margin: 0;"><strong>Adm No:</strong> <span contenteditable="true">${data.admission_no || ""}</span></p>
          <p style="margin: 0;"><strong>Blood Group:</strong> <span contenteditable="true">${data.blood_group || "O+"}</span></p>
          <p style="margin: 0;"><strong>Contact:</strong> <span contenteditable="true">${data.parent_contact || "1234567890"}</span></p>
        </div>
        
        <div style="position: absolute; bottom: 0; width: 100%; background-color: #f1f5f9; padding: 5px 0; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 8px; color: #64748b;">Principal Signature</p>
        </div>
      </div>
    `
  },

  // ─── SALARY SLIP ────────────────────────────────────────────────────────────
  {
    id: "salary-standard",
    categoryId: "salary",
    name: "Standard Payslip",
    thumbnailBg: "bg-teal-50 border-teal-200",
    getHtml: (data, schoolName) => `
      <div style="border: 1px solid #000; padding: 20px; height: 100%; box-sizing: border-box; background: white; font-family: sans-serif;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 20px;">${schoolName}</h1>
          <h2 style="margin: 5px 0 0; font-size: 14px; font-weight: normal;">PAYSLIP FOR THE MONTH OF <span contenteditable="true">${new Date().toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase()}</span></h2>
        </div>
        
        <table style="width: 100%; margin-bottom: 20px; font-size: 12px;">
          <tr>
            <td style="padding: 4px; width: 15%;"><strong>Emp Name:</strong></td>
            <td style="padding: 4px; width: 35%; border-bottom: 1px dotted #ccc;"><span contenteditable="true">${data.name || ""}</span></td>
            <td style="padding: 4px; width: 15%;"><strong>Emp ID:</strong></td>
            <td style="padding: 4px; width: 35%; border-bottom: 1px dotted #ccc;"><span contenteditable="true">${data.employee_id || ""}</span></td>
          </tr>
          <tr>
            <td style="padding: 4px;"><strong>Designation:</strong></td>
            <td style="padding: 4px; border-bottom: 1px dotted #ccc;"><span contenteditable="true">${data.designation || ""}</span></td>
            <td style="padding: 4px;"><strong>Department:</strong></td>
            <td style="padding: 4px; border-bottom: 1px dotted #ccc;"><span contenteditable="true">${data.department || ""}</span></td>
          </tr>
          <tr>
            <td style="padding: 4px;"><strong>DOJ:</strong></td>
            <td style="padding: 4px; border-bottom: 1px dotted #ccc;"><span contenteditable="true">${data.join_date || ""}</span></td>
            <td style="padding: 4px;"><strong>Bank A/C:</strong></td>
            <td style="padding: 4px; border-bottom: 1px dotted #ccc;"><span contenteditable="true">XXXXXXXXX</span></td>
          </tr>
        </table>
        
        <div style="display: flex; gap: 20px;">
          <table style="width: 50%; border-collapse: collapse; font-size: 12px;" border="1">
            <thead style="background-color: #f1f5f9;">
              <tr><th style="padding: 6px; text-align: left;">Earnings</th><th style="padding: 6px; text-align: right;">Amount (Rs.)</th></tr>
            </thead>
            <tbody contenteditable="true">
              <tr><td style="padding: 6px;">Basic Pay</td><td style="padding: 6px; text-align: right;">15000.00</td></tr>
              <tr><td style="padding: 6px;">HRA</td><td style="padding: 6px; text-align: right;">3000.00</td></tr>
              <tr><td style="padding: 6px;">Conveyance</td><td style="padding: 6px; text-align: right;">1000.00</td></tr>
              <tr><td style="padding: 6px;">Medical Allow.</td><td style="padding: 6px; text-align: right;">500.00</td></tr>
              <tr><td style="padding: 6px;">Special Allow.</td><td style="padding: 6px; text-align: right;">2500.00</td></tr>
              <tr><td style="padding: 6px; border-bottom: 0;">&nbsp;</td><td style="padding: 6px; border-bottom: 0;"></td></tr>
            </tbody>
            <tfoot>
              <tr style="font-weight: bold; background-color: #f8fafc;">
                <td style="padding: 6px;">Gross Earnings</td><td style="padding: 6px; text-align: right;">22000.00</td>
              </tr>
            </tfoot>
          </table>
          
          <table style="width: 50%; border-collapse: collapse; font-size: 12px;" border="1">
            <thead style="background-color: #f1f5f9;">
              <tr><th style="padding: 6px; text-align: left;">Deductions</th><th style="padding: 6px; text-align: right;">Amount (Rs.)</th></tr>
            </thead>
            <tbody contenteditable="true">
              <tr><td style="padding: 6px;">PF</td><td style="padding: 6px; text-align: right;">1800.00</td></tr>
              <tr><td style="padding: 6px;">Professional Tax</td><td style="padding: 6px; text-align: right;">200.00</td></tr>
              <tr><td style="padding: 6px;">TDS</td><td style="padding: 6px; text-align: right;">0.00</td></tr>
              <tr><td style="padding: 6px;">Loan Recovery</td><td style="padding: 6px; text-align: right;">0.00</td></tr>
              <tr><td style="padding: 6px;">Other Deductions</td><td style="padding: 6px; text-align: right;">0.00</td></tr>
              <tr><td style="padding: 6px; border-bottom: 0;">&nbsp;</td><td style="padding: 6px; border-bottom: 0;"></td></tr>
            </tbody>
            <tfoot>
              <tr style="font-weight: bold; background-color: #f8fafc;">
                <td style="padding: 6px;">Total Deductions</td><td style="padding: 6px; text-align: right;">2000.00</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div style="margin-top: 20px; font-size: 14px; border: 1px solid #000; padding: 10px; background-color: #f8fafc;">
          <strong>Net Pay: Rs. <span contenteditable="true">20000.00</span></strong>
        </div>
        
        <div style="margin-top: 50px; font-size: 12px; color: #666; text-align: center;">
          This is a computer generated document and does not require a signature.
        </div>
      </div>
    `
  }
];
