import os
import subprocess

artifact_dir = r"C:\Users\habib\.gemini\antigravity-ide\brain\5baf4f47-1a19-4a0a-9213-88a5e2a1726e"
os.makedirs(artifact_dir, exist_ok=True)
chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

new_receipts = [
    # 1. HOSTEL & MESS FEE RECEIPT
    {
        "id": "receipt_hostel_mess",
        "title": "Hostel & Mess Fee Receipt",
        "width": 840,
        "height": 840,
        "html": """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #ffffff; padding: 30px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; }
  .doc { border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 28px 32px; background: #ffffff; max-width: 780px; margin: 0 auto; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
  .school-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px; }
  .school-name { font-size: 20px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
  .school-sub { font-size: 12px; font-weight: 700; color: #475569; margin-top: 2px; }
  .badge-wrap { text-align: center; margin: 12px 0 16px 0; }
  .badge { display: inline-block; padding: 4px 18px; background: #ecfeff; border: 1.5px solid #0891b2; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0891b2; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 12px; margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .meta-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; }
  .meta-label { font-weight: 700; color: #64748b; }
  .meta-val { font-weight: 800; color: #0f172a; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; }
  th { background: #f1f5f9; padding: 8px 12px; font-weight: 800; text-align: left; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #334155; }
  td { padding: 9px 12px; border: 1px solid #e2e8f0; }
  .td-right { text-align: right; font-weight: 700; font-family: monospace; font-size: 12.5px; }
  .td-center { text-align: center; font-weight: 700; }

  .net-box { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #ecfeff; border: 1.5px solid #0891b2; border-radius: 8px; margin-bottom: 16px; }
  .net-label { font-size: 13px; font-weight: 800; color: #155e75; }
  .net-val { font-size: 19px; font-weight: 900; color: #0891b2; font-family: monospace; }
  .words-text { font-size: 11px; color: #475569; font-style: italic; margin-bottom: 22px; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; }
  .sig-box { text-align: center; width: 180px; }
  .sig-line { border-top: 1.5px solid #64748b; padding-top: 5px; font-size: 11px; font-weight: 700; color: #334155; }
  .stamp { display: inline-block; width: 80px; height: 80px; border: 2.5px solid #0891b2; border-radius: 50%; color: #0891b2; font-size: 8px; font-weight: 800; text-align: center; padding-top: 18px; text-transform: uppercase; transform: rotate(-5deg); }
</style>
</head>
<body>
  <div class="doc">
    <div class="school-header">
      <div class="school-name">Bajrang Shikshan Sansthan</div>
      <div class="school-sub">Sec. Sch. Padu Khurd, Nagaur - 341021 (Raj.) | Student Hostel & Boarding Division</div>
    </div>

    <div class="badge-wrap">
      <span class="badge">Hostel Accommodation & Dining Mess Fee Receipt</span>
    </div>

    <div class="meta-grid">
      <div class="meta-row"><span class="meta-label">Student Name:</span><span class="meta-val">Harshvardhan Singh</span></div>
      <div class="meta-row"><span class="meta-label">Receipt No:</span><span class="meta-val">BSS-HST-2026-042</span></div>
      <div class="meta-row"><span class="meta-label">Class:</span><span class="meta-val">10th - A</span></div>
      <div class="meta-row"><span class="meta-label">Date:</span><span class="meta-val">05 Oct 2026</span></div>
      <div class="meta-row"><span class="meta-label">Hostel Wing & Room:</span><span class="meta-val">Boys Wing B &bull; Room 12 (Bed-2)</span></div>
      <div class="meta-row"><span class="meta-label">Admission No:</span><span class="meta-val">ADM-2026-155</span></div>
      <div class="meta-row"><span class="meta-label">Billing Quarter:</span><span class="meta-val">Quarter 3 (Oct - Dec 2026)</span></div>
      <div class="meta-row"><span class="meta-label">Payment Mode:</span><span class="meta-val">Bank Transfer / UPI</span></div>
    </div>

    <!-- EXACT 4 COLUMNS ONLY -->
    <table>
      <thead>
        <tr>
          <th class="td-center" style="width: 50px;">S.No</th>
          <th>Hostel Facility Particulars</th>
          <th>Billing Duration</th>
          <th style="text-align: right; width: 140px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="td-center">1</td><td>Boarding Room Rent & Furnishing Charge</td><td>3 Months (Oct - Dec)</td><td class="td-right">₹6,000.00</td></tr>
        <tr><td class="td-center">2</td><td>Student Dining Hall & Daily Mess Charges</td><td>3 Months (Breakfast/Lunch/Dinner)</td><td class="td-right">₹9,000.00</td></tr>
        <tr><td class="td-center">3</td><td>Hostel Generator, Electricity & RO Water</td><td>Quarterly</td><td class="td-right">₹1,200.00</td></tr>
        <tr><td class="td-center">4</td><td>Laundry & Linen Sanitization Service</td><td>Quarterly</td><td class="td-right">₹800.00</td></tr>
      </tbody>
    </table>

    <div class="net-box">
      <span class="net-label">Total Hostel & Mess Amount Received:</span>
      <span class="net-val">₹17,000.00</span>
    </div>

    <div class="words-text">Amount in words: Seventeen Thousand Rupees Only.</div>

    <div class="sig-row">
      <div class="sig-box"><div class="sig-line">Student / Guardian Signature</div></div>
      <div class="stamp">BSS<br>Padu Khurd<br><b>HOSTEL</b><br>Fee Paid</div>
      <div class="sig-box"><div class="sig-line">Hostel Warden / Accounts</div></div>
    </div>
  </div>
</body>
</html>
        """
    },

    # 2. EXAMINATION & BOARD REGISTRATION RECEIPT
    {
        "id": "receipt_exam_board",
        "title": "Examination & Board Fee Slip",
        "width": 840,
        "height": 800,
        "html": """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #ffffff; padding: 30px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; }
  .doc { border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 28px 32px; background: #ffffff; max-width: 780px; margin: 0 auto; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
  .school-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px; }
  .school-name { font-size: 20px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
  .school-sub { font-size: 12px; font-weight: 700; color: #475569; margin-top: 2px; }
  .badge-wrap { text-align: center; margin: 12px 0 16px 0; }
  .badge { display: inline-block; padding: 4px 18px; background: #fef2f2; border: 1.5px solid #dc2626; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #dc2626; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 12px; margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .meta-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; }
  .meta-label { font-weight: 700; color: #64748b; }
  .meta-val { font-weight: 800; color: #0f172a; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; }
  th { background: #f1f5f9; padding: 8px 12px; font-weight: 800; text-align: left; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #334155; }
  td { padding: 9px 12px; border: 1px solid #e2e8f0; }
  .td-right { text-align: right; font-weight: 700; font-family: monospace; font-size: 12.5px; }
  .td-center { text-align: center; font-weight: 700; }

  .net-box { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #fef2f2; border: 1.5px solid #dc2626; border-radius: 8px; margin-bottom: 16px; }
  .net-label { font-size: 13px; font-weight: 800; color: #991b1b; }
  .net-val { font-size: 19px; font-weight: 900; color: #dc2626; font-family: monospace; }
  .words-text { font-size: 11px; color: #475569; font-style: italic; margin-bottom: 22px; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; }
  .sig-box { text-align: center; width: 180px; }
  .sig-line { border-top: 1.5px solid #64748b; padding-top: 5px; font-size: 11px; font-weight: 700; color: #334155; }
  .stamp { display: inline-block; width: 80px; height: 80px; border: 2.5px solid #dc2626; border-radius: 50%; color: #dc2626; font-size: 8px; font-weight: 800; text-align: center; padding-top: 18px; text-transform: uppercase; transform: rotate(4deg); }
</style>
</head>
<body>
  <div class="doc">
    <div class="school-header">
      <div class="school-name">Bajrang Shikshan Sansthan</div>
      <div class="school-sub">Sec. Sch. Padu Khurd, Nagaur - 341021 (Raj.) | Office of Examination Controller</div>
    </div>

    <div class="badge-wrap">
      <span class="badge">Board Registration & Annual Examination Fee Receipt</span>
    </div>

    <div class="meta-grid">
      <div class="meta-row"><span class="meta-label">Student Name:</span><span class="meta-val">Neha Gurjar</span></div>
      <div class="meta-row"><span class="meta-label">Challan / Slip No:</span><span class="meta-val">BSS-EXM-2026-209</span></div>
      <div class="meta-row"><span class="meta-label">Class & Roll No:</span><span class="meta-val">Class 10th &bull; Roll No: 28</span></div>
      <div class="meta-row"><span class="meta-label">Date:</span><span class="meta-val">12 Nov 2026</span></div>
      <div class="meta-row"><span class="meta-label">Admission No:</span><span class="meta-val">ADM-2026-092</span></div>
      <div class="meta-row"><span class="meta-label">Board / Council:</span><span class="meta-val">RBSE Secondary Board Exam 2027</span></div>
      <div class="meta-row"><span class="meta-label">Examination Category:</span><span class="meta-val">Regular Candidate</span></div>
      <div class="meta-row"><span class="meta-label">Payment Mode:</span><span class="meta-val">Cash (Exam Counter)</span></div>
    </div>

    <!-- EXACT 3 COLUMNS ONLY -->
    <table>
      <thead>
        <tr>
          <th class="td-center" style="width: 50px;">S.No</th>
          <th>Examination & Registration Fee Particulars</th>
          <th style="text-align: right; width: 140px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="td-center">1</td><td>RBSE 10th Board Official Enrolment & Registration Fee</td><td class="td-right">₹650.00</td></tr>
        <tr><td class="td-center">2</td><td>Main Theory Examination & Center Surcharge Fee</td><td class="td-right">₹400.00</td></tr>
        <tr><td class="td-center">3</td><td>Science & Computer Practical Examination Material Fee</td><td class="td-right">₹250.00</td></tr>
        <tr><td class="td-center">4</td><td>Pre-Board Mock Exam & Answer Sheet Evaluation Fee</td><td class="td-right">₹200.00</td></tr>
      </tbody>
    </table>

    <div class="net-box">
      <span class="net-label">Total Examination Fee Paid:</span>
      <span class="net-val">₹1,500.00</span>
    </div>

    <div class="words-text">Amount in words: One Thousand Five Hundred Rupees Only.</div>

    <div class="sig-row">
      <div class="sig-box"><div class="sig-line">Candidate / Student Signature</div></div>
      <div class="stamp">BSS<br>Padu Khurd<br><b>EXAM FORM</b><br>Accepted</div>
      <div class="sig-box"><div class="sig-line">Controller of Examination</div></div>
    </div>
  </div>
</body>
</html>
        """
    },

    # 3. CAUTION MONEY REFUND VOUCHER (OUTFLOW)
    {
        "id": "receipt_caution_refund",
        "title": "Caution Money Refund Voucher",
        "width": 840,
        "height": 840,
        "html": """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #ffffff; padding: 30px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; }
  .doc { border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 28px 32px; background: #ffffff; max-width: 780px; margin: 0 auto; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
  .school-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px; }
  .school-name { font-size: 20px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
  .school-sub { font-size: 12px; font-weight: 700; color: #475569; margin-top: 2px; }
  .badge-wrap { text-align: center; margin: 12px 0 16px 0; }
  .badge { display: inline-block; padding: 4px 18px; background: #ecfdf5; border: 1.5px solid #059669; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #059669; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 12px; margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .meta-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; }
  .meta-label { font-weight: 700; color: #64748b; }
  .meta-val { font-weight: 800; color: #0f172a; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; }
  th { background: #f1f5f9; padding: 8px 12px; font-weight: 800; text-align: left; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #334155; }
  td { padding: 9px 12px; border: 1px solid #e2e8f0; }
  .td-right { text-align: right; font-weight: 700; font-family: monospace; font-size: 12.5px; }
  .td-center { text-align: center; font-weight: 700; }

  .net-box { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #ecfdf5; border: 1.5px solid #059669; border-radius: 8px; margin-bottom: 16px; }
  .net-label { font-size: 13px; font-weight: 800; color: #065f46; }
  .net-val { font-size: 19px; font-weight: 900; color: #059669; font-family: monospace; }
  .words-text { font-size: 11px; color: #475569; font-style: italic; margin-bottom: 22px; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; }
  .sig-box { text-align: center; width: 170px; }
  .sig-line { border-top: 1.5px solid #64748b; padding-top: 5px; font-size: 11px; font-weight: 700; color: #334155; }
  .stamp { display: inline-block; width: 80px; height: 80px; border: 2.5px solid #059669; border-radius: 50%; color: #059669; font-size: 8px; font-weight: 800; text-align: center; padding-top: 18px; text-transform: uppercase; transform: rotate(-8deg); }
</style>
</head>
<body>
  <div class="doc">
    <div class="school-header">
      <div class="school-name">Bajrang Shikshan Sansthan</div>
      <div class="school-sub">Sec. Sch. Padu Khurd, Nagaur - 341021 (Raj.) | Student Accounts & Clearance</div>
    </div>

    <div class="badge-wrap">
      <span class="badge">Caution Money (Security Deposit) Refund Disbursement Voucher</span>
    </div>

    <div class="meta-grid">
      <div class="meta-row"><span class="meta-label">Student Name:</span><span class="meta-val">Ravi Kumar Meghwal</span></div>
      <div class="meta-row"><span class="meta-label">Refund Voucher No:</span><span class="meta-val">BSS-REF-2026-019</span></div>
      <div class="meta-row"><span class="meta-label">Last Class Passed:</span><span class="meta-val">Class 10th (Passout 2026)</span></div>
      <div class="meta-row"><span class="meta-label">Disbursement Date:</span><span class="meta-val">28 Jun 2026</span></div>
      <div class="meta-row"><span class="meta-label">Admission No:</span><span class="meta-val">ADM-2023-018</span></div>
      <div class="meta-row"><span class="meta-label">TC Certificate No:</span><span class="meta-val">TC-2026-104</span></div>
      <div class="meta-row"><span class="meta-label">No Dues Certificate:</span><span class="meta-val">Clear (Library &bull; Lab &bull; Sports)</span></div>
      <div class="meta-row"><span class="meta-label">Disbursement Mode:</span><span class="meta-val">Cheque / Direct Transfer</span></div>
    </div>

    <!-- EXACT 4 COLUMNS ONLY -->
    <table>
      <thead>
        <tr>
          <th class="td-center" style="width: 50px;">S.No</th>
          <th>Deposit Particulars & Clearance Details</th>
          <th>Status / Receipt Ref</th>
          <th style="text-align: right; width: 140px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="td-center">1</td><td>Original Caution Money Deposited at Admission</td><td>BSS-REC-2023-112</td><td class="td-right">₹2,000.00</td></tr>
        <tr><td class="td-center">2</td><td>Less: Library Book Overdue Charges / Loss</td><td>No Dues Verified</td><td class="td-right">(-) ₹0.00</td></tr>
        <tr><td class="td-center">3</td><td>Less: Science Lab Glassware / Equipment Breakage</td><td>No Dues Verified</td><td class="td-right">(-) ₹0.00</td></tr>
        <tr><td class="td-center">4</td><td>Less: Sports Kit / Uniform Pending Return</td><td>No Dues Verified</td><td class="td-right">(-) ₹0.00</td></tr>
      </tbody>
    </table>

    <div class="net-box">
      <span class="net-label">Net Caution Money Amount Refunded:</span>
      <span class="net-val">₹2,000.00</span>
    </div>

    <div class="words-text">Amount in words: Two Thousand Rupees Only (Full refund released upon school clearance).</div>

    <div class="sig-row">
      <div class="sig-box"><div class="sig-line">Student / Guardian Receiver Sign</div></div>
      <div class="sig-box"><div class="sig-line">Accountant / Cashier</div></div>
      <div class="stamp">BSS<br>Padu Khurd<br><b>REFUNDED</b><br>Cleared</div>
      <div class="sig-box"><div class="sig-line">Headmaster / Principal</div></div>
    </div>
  </div>
</body>
</html>
        """
    },

    # 4. CERTIFICATE ISSUANCE FEE RECEIPT
    {
        "id": "receipt_certificate",
        "title": "Certificate Fee Receipt",
        "width": 840,
        "height": 780,
        "html": """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #ffffff; padding: 30px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; }
  .doc { border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 28px 32px; background: #ffffff; max-width: 780px; margin: 0 auto; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
  .school-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px; }
  .school-name { font-size: 20px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
  .school-sub { font-size: 12px; font-weight: 700; color: #475569; margin-top: 2px; }
  .badge-wrap { text-align: center; margin: 12px 0 16px 0; }
  .badge { display: inline-block; padding: 4px 18px; background: #fdf4ff; border: 1.5px solid #c026d3; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #c026d3; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 12px; margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .meta-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; }
  .meta-label { font-weight: 700; color: #64748b; }
  .meta-val { font-weight: 800; color: #0f172a; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; }
  th { background: #f1f5f9; padding: 8px 12px; font-weight: 800; text-align: left; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #334155; }
  td { padding: 9px 12px; border: 1px solid #e2e8f0; }
  .td-right { text-align: right; font-weight: 700; font-family: monospace; font-size: 12.5px; }
  .td-center { text-align: center; font-weight: 700; }

  .net-box { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #fdf4ff; border: 1.5px solid #c026d3; border-radius: 8px; margin-bottom: 16px; }
  .net-label { font-size: 13px; font-weight: 800; color: #86198f; }
  .net-val { font-size: 19px; font-weight: 900; color: #c026d3; font-family: monospace; }
  .words-text { font-size: 11px; color: #475569; font-style: italic; margin-bottom: 22px; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; }
  .sig-box { text-align: center; width: 180px; }
  .sig-line { border-top: 1.5px solid #64748b; padding-top: 5px; font-size: 11px; font-weight: 700; color: #334155; }
  .stamp { display: inline-block; width: 80px; height: 80px; border: 2.5px solid #c026d3; border-radius: 50%; color: #c026d3; font-size: 8px; font-weight: 800; text-align: center; padding-top: 18px; text-transform: uppercase; transform: rotate(6deg); }
</style>
</head>
<body>
  <div class="doc">
    <div class="school-header">
      <div class="school-name">Bajrang Shikshan Sansthan</div>
      <div class="school-sub">Sec. Sch. Padu Khurd, Nagaur - 341021 (Raj.) | Student Records & Registry</div>
    </div>

    <div class="badge-wrap">
      <span class="badge">Official Certificate & Document Issuance Fee Receipt</span>
    </div>

    <div class="meta-grid">
      <div class="meta-row"><span class="meta-label">Student Name:</span><span class="meta-val">Anjali Sharma</span></div>
      <div class="meta-row"><span class="meta-label">Receipt No:</span><span class="meta-val">BSS-DOC-2026-061</span></div>
      <div class="meta-row"><span class="meta-label">Father's Name:</span><span class="meta-val">Mukesh Sharma</span></div>
      <div class="meta-row"><span class="meta-label">Date:</span><span class="meta-val">19 Aug 2026</span></div>
      <div class="meta-row"><span class="meta-label">Class:</span><span class="meta-val">Class 9th</span></div>
      <div class="meta-row"><span class="meta-label">Admission No:</span><span class="meta-val">ADM-2025-081</span></div>
      <div class="meta-row"><span class="meta-label">Purpose / Reason:</span><span class="meta-val">Father Transfer / Admission Abroad</span></div>
      <div class="meta-row"><span class="meta-label">Payment Mode:</span><span class="meta-val">Cash (Office Counter)</span></div>
    </div>

    <!-- EXACT 4 COLUMNS ONLY -->
    <table>
      <thead>
        <tr>
          <th class="td-center" style="width: 50px;">S.No</th>
          <th>Certificate / Document Requested</th>
          <th class="td-center" style="width: 100px;">Copies</th>
          <th style="text-align: right; width: 140px;">Fee Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="td-center">1</td><td>Transfer Certificate (TC - Original Counterfoil Copy)</td><td class="td-center">1 Original</td><td class="td-right">₹150.00</td></tr>
        <tr><td class="td-center">2</td><td>Character & Conduct Certificate</td><td class="td-center">1 Copy</td><td class="td-right">₹50.00</td></tr>
        <tr><td class="td-center">3</td><td>Bonafide Student Certificate (English Medium Format)</td><td class="td-center">2 Copies</td><td class="td-right">₹100.00</td></tr>
        <tr><td class="td-center">4</td><td>Duplicate Annual Report Card / Marksheet Copy</td><td class="td-center">1 Copy</td><td class="td-right">₹100.00</td></tr>
      </tbody>
    </table>

    <div class="net-box">
      <span class="net-label">Total Document Issuance Fee Paid:</span>
      <span class="net-val">₹400.00</span>
    </div>

    <div class="words-text">Amount in words: Four Hundred Rupees Only.</div>

    <div class="sig-row">
      <div class="sig-box"><div class="sig-line">Applicant / Student Signature</div></div>
      <div class="stamp">BSS<br>Padu Khurd<br><b>ISSUED</b><br>Registry</div>
      <div class="sig-box"><div class="sig-line">Office Superintendent / Clerk</div></div>
    </div>
  </div>
</body>
</html>
        """
    },

    # 5. ANNUAL SPORTS & EDUCATIONAL TOUR RECEIPT
    {
        "id": "receipt_tour_event",
        "title": "Tour & Event Fee Receipt",
        "width": 840,
        "height": 800,
        "html": """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #ffffff; padding: 30px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; }
  .doc { border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 28px 32px; background: #ffffff; max-width: 780px; margin: 0 auto; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
  .school-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px; }
  .school-name { font-size: 20px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
  .school-sub { font-size: 12px; font-weight: 700; color: #475569; margin-top: 2px; }
  .badge-wrap { text-align: center; margin: 12px 0 16px 0; }
  .badge { display: inline-block; padding: 4px 18px; background: #fefce8; border: 1.5px solid #ca8a04; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #ca8a04; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 12px; margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .meta-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; }
  .meta-label { font-weight: 700; color: #64748b; }
  .meta-val { font-weight: 800; color: #0f172a; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; }
  th { background: #f1f5f9; padding: 8px 12px; font-weight: 800; text-align: left; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #334155; }
  td { padding: 9px 12px; border: 1px solid #e2e8f0; }
  .td-right { text-align: right; font-weight: 700; font-family: monospace; font-size: 12.5px; }
  .td-center { text-align: center; font-weight: 700; }

  .net-box { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #fefce8; border: 1.5px solid #ca8a04; border-radius: 8px; margin-bottom: 16px; }
  .net-label { font-size: 13px; font-weight: 800; color: #854d0e; }
  .net-val { font-size: 19px; font-weight: 900; color: #ca8a04; font-family: monospace; }
  .words-text { font-size: 11px; color: #475569; font-style: italic; margin-bottom: 22px; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; }
  .sig-box { text-align: center; width: 180px; }
  .sig-line { border-top: 1.5px solid #64748b; padding-top: 5px; font-size: 11px; font-weight: 700; color: #334155; }
  .stamp { display: inline-block; width: 80px; height: 80px; border: 2.5px solid #ca8a04; border-radius: 50%; color: #ca8a04; font-size: 8px; font-weight: 800; text-align: center; padding-top: 18px; text-transform: uppercase; transform: rotate(-6deg); }
</style>
</head>
<body>
  <div class="doc">
    <div class="school-header">
      <div class="school-name">Bajrang Shikshan Sansthan</div>
      <div class="school-sub">Sec. Sch. Padu Khurd, Nagaur - 341021 (Raj.) | Activity & Excursion Wing</div>
    </div>

    <div class="badge-wrap">
      <span class="badge">Educational Excursion Tour & Annual Sports Meet Receipt</span>
    </div>

    <div class="meta-grid">
      <div class="meta-row"><span class="meta-label">Student Name:</span><span class="meta-val">Deepak Bishnoi</span></div>
      <div class="meta-row"><span class="meta-label">Event Slip No:</span><span class="meta-val">BSS-ACT-2026-118</span></div>
      <div class="meta-row"><span class="meta-label">Class & Section:</span><span class="meta-val">Class 9th - A</span></div>
      <div class="meta-row"><span class="meta-label">Date:</span><span class="meta-val">14 Dec 2026</span></div>
      <div class="meta-row"><span class="meta-label">Tour Destination:</span><span class="meta-val">Jaipur Science City & Amer Fort (3 Days)</span></div>
      <div class="meta-row"><span class="meta-label">Admission No:</span><span class="meta-val">ADM-2026-210</span></div>
      <div class="meta-row"><span class="meta-label">House / Team:</span><span class="meta-val">Tagore House (Yellow)</span></div>
      <div class="meta-row"><span class="meta-label">Payment Mode:</span><span class="meta-val">UPI / Cash</span></div>
    </div>

    <!-- EXACT 3 COLUMNS ONLY -->
    <table>
      <thead>
        <tr>
          <th class="td-center" style="width: 50px;">S.No</th>
          <th>Activity / Excursion Tour Particulars</th>
          <th style="text-align: right; width: 140px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="td-center">1</td><td>3-Day Educational Tour Bus Travel, Hotel Stay & Meals</td><td class="td-right">₹2,800.00</td></tr>
        <tr><td class="td-center">2</td><td>Science Park & Historical Monuments Entry Tickets</td><td class="td-right">₹350.00</td></tr>
        <tr><td class="td-center">3</td><td>Annual Sports Meet Official Jersey Kit & Registration</td><td class="td-right">₹450.00</td></tr>
      </tbody>
    </table>

    <div class="net-box">
      <span class="net-label">Total Tour & Event Contribution Paid:</span>
      <span class="net-val">₹3,600.00</span>
    </div>

    <div class="words-text">Amount in words: Three Thousand Six Hundred Rupees Only.</div>

    <div class="sig-row">
      <div class="sig-box"><div class="sig-line">Parent / Student Signature</div></div>
      <div class="stamp">BSS<br>Padu Khurd<br><b>TOUR</b><br>Approved</div>
      <div class="sig-box"><div class="sig-line">Activity Coordinator / Teacher</div></div>
    </div>
  </div>
</body>
</html>
        """
    },

    # 6. GUEST FACULTY & EXAMINER REMUNERATION VOUCHER (OUTFLOW)
    {
        "id": "receipt_guest_remuneration",
        "title": "Guest Examiner Remuneration Voucher",
        "width": 840,
        "height": 840,
        "html": """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #ffffff; padding: 30px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; }
  .doc { border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 28px 32px; background: #ffffff; max-width: 780px; margin: 0 auto; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
  .school-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px; }
  .school-name { font-size: 20px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
  .school-sub { font-size: 12px; font-weight: 700; color: #475569; margin-top: 2px; }
  .badge-wrap { text-align: center; margin: 12px 0 16px 0; }
  .badge { display: inline-block; padding: 4px 18px; background: #f0fdf4; border: 1.5px solid #16a34a; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #16a34a; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 12px; margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .meta-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; }
  .meta-label { font-weight: 700; color: #64748b; }
  .meta-val { font-weight: 800; color: #0f172a; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; }
  th { background: #f1f5f9; padding: 8px 12px; font-weight: 800; text-align: left; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #334155; }
  td { padding: 9px 12px; border: 1px solid #e2e8f0; }
  .td-right { text-align: right; font-weight: 700; font-family: monospace; font-size: 12.5px; }
  .td-center { text-align: center; font-weight: 700; }

  .net-box { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #f0fdf4; border: 1.5px solid #16a34a; border-radius: 8px; margin-bottom: 16px; }
  .net-label { font-size: 13px; font-weight: 800; color: #15803d; }
  .net-val { font-size: 19px; font-weight: 900; color: #16a34a; font-family: monospace; }
  .words-text { font-size: 11px; color: #475569; font-style: italic; margin-bottom: 22px; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; }
  .sig-box { text-align: center; width: 170px; }
  .sig-line { border-top: 1.5px solid #64748b; padding-top: 5px; font-size: 11px; font-weight: 700; color: #334155; }
  .stamp { display: inline-block; width: 80px; height: 80px; border: 2.5px solid #16a34a; border-radius: 50%; color: #16a34a; font-size: 8px; font-weight: 800; text-align: center; padding-top: 18px; text-transform: uppercase; transform: rotate(-7deg); }
</style>
</head>
<body>
  <div class="doc">
    <div class="school-header">
      <div class="school-name">Bajrang Shikshan Sansthan</div>
      <div class="school-sub">Sec. Sch. Padu Khurd, Nagaur - 341021 (Raj.) | Office of Finance & Accounts</div>
    </div>

    <div class="badge-wrap">
      <span class="badge">Guest Lecturer & External Examiner Remuneration Voucher</span>
    </div>

    <div class="meta-grid">
      <div class="meta-row"><span class="meta-label">Payee Expert Name:</span><span class="meta-val">Dr. Satish Chandra Sharma</span></div>
      <div class="meta-row"><span class="meta-label">Voucher No:</span><span class="meta-val">BSS-REM-2026-031</span></div>
      <div class="meta-row"><span class="meta-label">Designation / Institute:</span><span class="meta-val">Associate Professor, Govt. PG College</span></div>
      <div class="meta-row"><span class="meta-label">Voucher Date:</span><span class="meta-val">24 Feb 2026</span></div>
      <div class="meta-row"><span class="meta-label">Nature of Assignment:</span><span class="meta-val">External Board Science Practical Evaluator</span></div>
      <div class="meta-row"><span class="meta-label">Subject / Discipline:</span><span class="meta-val">Physics & Chemistry Practicals</span></div>
      <div class="meta-row"><span class="meta-label">Disbursement Mode:</span><span class="meta-val">Cash / Immediate Honorarium</span></div>
      <div class="meta-row"><span class="meta-label">PAN Number:</span><span class="meta-val">ABCPS9281D</span></div>
    </div>

    <!-- EXACT 5 RELEVANT COLUMNS ONLY -->
    <table>
      <thead>
        <tr>
          <th class="td-center" style="width: 50px;">S.No</th>
          <th>Duty / Session Description</th>
          <th class="td-center" style="width: 80px;">Days/Batches</th>
          <th style="text-align: right; width: 120px;">Rate / Session</th>
          <th style="text-align: right; width: 130px;">Total Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="td-center">1</td><td>Science Practical Lab Evaluation (Batch A & B)</td><td class="td-center">2 Days</td><td class="td-right">₹1,500.00</td><td class="td-right">₹3,000.00</td></tr>
        <tr><td class="td-center">2</td><td>Oral Viva-Voce Assessment (72 Students)</td><td class="td-center">72 Students</td><td class="td-right">₹25.00</td><td class="td-right">₹1,800.00</td></tr>
        <tr><td class="td-center">3</td><td>Local Conveyance / Travel Allowance (TA)</td><td class="td-center">2 Days</td><td class="td-right">₹500.00</td><td class="td-right">₹1,000.00</td></tr>
      </tbody>
    </table>

    <div class="net-box">
      <span class="net-label">Total Honorarium & TA Disbursed:</span>
      <span class="net-val">₹5,800.00</span>
    </div>

    <div class="words-text">Amount in words: Five Thousand Eight Hundred Rupees Only.</div>

    <div class="sig-row">
      <div class="sig-box"><div class="sig-line">Expert / Payee Signature</div></div>
      <div class="sig-box"><div class="sig-line">Exam In-charge</div></div>
      <div class="stamp">BSS<br>Padu Khurd<br><b>HONORARIUM</b><br>Paid</div>
      <div class="sig-box"><div class="sig-line">Principal / Sanctioned By</div></div>
    </div>
  </div>
</body>
</html>
        """
    }
]

for r in new_receipts:
    html_file = f"scratch/{r['id']}.html"
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(r["html"])
    
    out_img = os.path.join(artifact_dir, f"{r['id']}.png")
    html_url = "file:///" + os.path.abspath(html_file).replace("\\", "/")
    
    cmd = [
        chrome_path,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--device-scale-factor=2",
        f"--window-size={r['width']},{r['height']}",
        f"--screenshot={out_img}",
        html_url
    ]
    subprocess.run(cmd, check=True)
    print(f"Generated {r['id']}: {os.path.exists(out_img)} ({os.path.getsize(out_img)} bytes)")

print("All 6 new receipts successfully rendered!")
