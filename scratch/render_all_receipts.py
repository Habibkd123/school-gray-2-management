import os
import subprocess

artifact_dir = r"C:\Users\habib\.gemini\antigravity-ide\brain\5baf4f47-1a19-4a0a-9213-88a5e2a1726e"
os.makedirs(artifact_dir, exist_ok=True)
chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

receipts = [
    # 1. SALARY SLIP / PAY VOUCHER
    {
        "id": "receipt_salary_slip",
        "title": "Staff Salary Slip",
        "width": 840,
        "height": 920,
        "html": """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #ffffff; padding: 30px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #0f172a; }
  .doc { border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 28px 32px; background: #ffffff; max-width: 780px; margin: 0 auto; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
  .school-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px; }
  .school-name { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; }
  .school-sub { font-size: 12px; font-weight: 700; color: #475569; margin-top: 2px; }
  .school-addr { font-size: 11px; color: #64748b; margin-top: 1px; }
  .badge-wrap { text-align: center; margin: 12px 0 16px 0; }
  .badge { display: inline-block; padding: 4px 18px; background: #f8fafc; border: 1.5px solid #0f172a; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; }
  
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 12px; margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .meta-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; }
  .meta-label { font-weight: 700; color: #64748b; }
  .meta-val { font-weight: 800; color: #0f172a; }

  .tables-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  th { background: #f1f5f9; padding: 7px 10px; font-weight: 800; text-align: left; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #334155; }
  td { padding: 7px 10px; border: 1px solid #e2e8f0; }
  .td-right { text-align: right; font-weight: 700; font-family: monospace; font-size: 12px; }
  .total-row { background: #f8fafc; font-weight: 800; }

  .net-box { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #ecfdf5; border: 1.5px solid #10b981; border-radius: 8px; margin-bottom: 18px; }
  .net-label { font-size: 13px; font-weight: 800; color: #065f46; }
  .net-val { font-size: 20px; font-weight: 900; color: #047857; font-family: monospace; }
  
  .words-text { font-size: 11px; color: #475569; font-style: italic; margin-bottom: 22px; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; padding-top: 10px; }
  .sig-box { text-align: center; width: 180px; }
  .sig-line { border-top: 1.5px solid #64748b; padding-top: 5px; font-size: 11px; font-weight: 700; color: #334155; }
  .stamp { display: inline-block; width: 85px; height: 85px; border: 2.5px solid #4338ca; border-radius: 50%; color: #4338ca; font-size: 8px; font-weight: 800; text-align: center; padding-top: 18px; text-transform: uppercase; transform: rotate(-8deg); }
</style>
</head>
<body>
  <div class="doc">
    <div class="school-header">
      <div class="school-name">Bajrang Shikshan Sansthan</div>
      <div class="school-sub">Sec. Sch. Padu Khurd, Nagaur - 341021 (Raj.)</div>
      <div class="school-addr">Ph: 01582-264567 | Affiliation / Reg. No: RJ-NAG-2005-081</div>
    </div>

    <div class="badge-wrap">
      <span class="badge">Staff Salary Slip &bull; September 2026</span>
    </div>

    <div class="meta-grid">
      <div class="meta-row"><span class="meta-label">Employee Name:</span><span class="meta-val">Vikram Singh Rathore</span></div>
      <div class="meta-row"><span class="meta-label">Slip No:</span><span class="meta-val">BSS-SAL-2026-09</span></div>
      <div class="meta-row"><span class="meta-label">Employee ID:</span><span class="meta-val">EMP-104</span></div>
      <div class="meta-row"><span class="meta-label">Pay Date:</span><span class="meta-val">30 Sep 2026</span></div>
      <div class="meta-row"><span class="meta-label">Designation:</span><span class="meta-val">PGT - Mathematics</span></div>
      <div class="meta-row"><span class="meta-label">Pay Method:</span><span class="meta-val">Bank Transfer (SBI)</span></div>
      <div class="meta-row"><span class="meta-label">Days Worked:</span><span class="meta-val">26 Days (Present: 25 | Leave: 1)</span></div>
      <div class="meta-row"><span class="meta-label">A/C Number:</span><span class="meta-val">XXXXXX4812</span></div>
    </div>

    <div class="tables-wrap">
      <!-- EXACT 2 COLUMNS FOR EARNINGS -->
      <table>
        <thead>
          <tr>
            <th>Earnings Head</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Basic Salary</td><td class="td-right">₹24,000.00</td></tr>
          <tr><td>Dearness Allowance (DA)</td><td class="td-right">₹4,800.00</td></tr>
          <tr><td>House Rent Allowance (HRA)</td><td class="td-right">₹3,200.00</td></tr>
          <tr><td>Conveyance Allowance</td><td class="td-right">₹1,500.00</td></tr>
          <tr class="total-row"><td>Gross Earnings</td><td class="td-right" style="color: #0369a1;">₹33,500.00</td></tr>
        </tbody>
      </table>

      <!-- EXACT 2 COLUMNS FOR DEDUCTIONS -->
      <table>
        <thead>
          <tr>
            <th>Deduction Head</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Provident Fund (EPF)</td><td class="td-right">₹1,800.00</td></tr>
          <tr><td>Professional Tax</td><td class="td-right">₹200.00</td></tr>
          <tr><td>TDS / Income Tax</td><td class="td-right">₹1,000.00</td></tr>
          <tr><td>Salary Advance Adj.</td><td class="td-right">₹0.00</td></tr>
          <tr class="total-row"><td>Total Deductions</td><td class="td-right" style="color: #b91c1c;">₹3,000.00</td></tr>
        </tbody>
      </table>
    </div>

    <div class="net-box">
      <span class="net-label">Net Salary Disbursed (In Hand):</span>
      <span class="net-val">₹30,500.00</span>
    </div>

    <div class="words-text">Amount in words: Thirty Thousand Five Hundred Rupees Only.</div>

    <div class="sig-row">
      <div class="sig-box">
        <div class="sig-line">Employee Signature</div>
      </div>
      <div class="stamp">
        BSS<br>Padu Khurd<br><b>PAID</b><br>Accounts
      </div>
      <div class="sig-box">
        <div class="sig-line">Principal / Accounts Head</div>
      </div>
    </div>
  </div>
</body>
</html>
        """
    },

    # 2. STUDENT ADMISSION & REGISTRATION RECEIPT
    {
        "id": "receipt_admission",
        "title": "Student Admission Receipt",
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
  .badge { display: inline-block; padding: 4px 18px; background: #fdf2f8; border: 1.5px solid #be185d; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #be185d; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 12px; margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .meta-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; }
  .meta-label { font-weight: 700; color: #64748b; }
  .meta-val { font-weight: 800; color: #0f172a; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; }
  th { background: #f1f5f9; padding: 8px 12px; font-weight: 800; text-align: left; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #334155; }
  td { padding: 9px 12px; border: 1px solid #e2e8f0; }
  .td-right { text-align: right; font-weight: 700; font-family: monospace; font-size: 12.5px; }
  .td-center { text-align: center; font-weight: 700; width: 60px; }

  .net-box { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #fdf2f8; border: 1.5px solid #be185d; border-radius: 8px; margin-bottom: 16px; }
  .net-label { font-size: 13px; font-weight: 800; color: #9d174d; }
  .net-val { font-size: 19px; font-weight: 900; color: #be185d; font-family: monospace; }
  .words-text { font-size: 11px; color: #475569; font-style: italic; margin-bottom: 22px; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; }
  .sig-box { text-align: center; width: 180px; }
  .sig-line { border-top: 1.5px solid #64748b; padding-top: 5px; font-size: 11px; font-weight: 700; color: #334155; }
  .stamp { display: inline-block; width: 80px; height: 80px; border: 2.5px solid #be185d; border-radius: 50%; color: #be185d; font-size: 8px; font-weight: 800; text-align: center; padding-top: 18px; text-transform: uppercase; transform: rotate(5deg); }
</style>
</head>
<body>
  <div class="doc">
    <div class="school-header">
      <div class="school-name">Bajrang Shikshan Sansthan</div>
      <div class="school-sub">Sec. Sch. Padu Khurd, Nagaur - 341021 (Raj.) | Ph: 01582-264567</div>
    </div>

    <div class="badge-wrap">
      <span class="badge">Official Admission & Registration Fee Receipt</span>
    </div>

    <div class="meta-grid">
      <div class="meta-row"><span class="meta-label">Student Name:</span><span class="meta-val">Pooja Choudhary</span></div>
      <div class="meta-row"><span class="meta-label">Receipt No:</span><span class="meta-val">BSS-ADM-2026-088</span></div>
      <div class="meta-row"><span class="meta-label">Father's Name:</span><span class="meta-val">Rameshwar Choudhary</span></div>
      <div class="meta-row"><span class="meta-label">Admission Date:</span><span class="meta-val">15 Apr 2026</span></div>
      <div class="meta-row"><span class="meta-label">Admitted Class:</span><span class="meta-val">Class 1st - Section A</span></div>
      <div class="meta-row"><span class="meta-label">Payment Mode:</span><span class="meta-val">Cash / Desk Counter</span></div>
      <div class="meta-row"><span class="meta-label">Admission No:</span><span class="meta-val">ADM-2026-402</span></div>
      <div class="meta-row"><span class="meta-label">Session:</span><span class="meta-val">2026-2027</span></div>
    </div>

    <!-- EXACT 3 COLUMNS ONLY -->
    <table>
      <thead>
        <tr>
          <th class="td-center">S.No</th>
          <th>Admission Fee Particulars</th>
          <th style="text-align: right; width: 140px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="td-center">1</td><td>Prospectus & Application Registration Form</td><td class="td-right">₹500.00</td></tr>
        <tr><td class="td-center">2</td><td>One-Time Admission Processing Fee</td><td class="td-right">₹3,000.00</td></tr>
        <tr><td class="td-center">3</td><td>Refundable Caution Money (Security Deposit)</td><td class="td-right">₹2,000.00</td></tr>
        <tr><td class="td-center">4</td><td>Student ID Card & Diary / Handbook Fee</td><td class="td-right">₹350.00</td></tr>
        <tr><td class="td-center">5</td><td>Development & Infrastructure Fund</td><td class="td-right">₹1,500.00</td></tr>
      </tbody>
    </table>

    <div class="net-box">
      <span class="net-label">Total Admission Amount Paid:</span>
      <span class="net-val">₹7,350.00</span>
    </div>

    <div class="words-text">Amount in words: Seven Thousand Three Hundred Fifty Rupees Only.</div>

    <div class="sig-row">
      <div class="sig-box"><div class="sig-line">Parent / Guardian Signature</div></div>
      <div class="stamp">BSS<br>Padu Khurd<br><b>ADMISSION</b><br>Confirmed</div>
      <div class="sig-box"><div class="sig-line">Admission In-charge</div></div>
    </div>
  </div>
</body>
</html>
        """
    },

    # 3. TRANSPORT / BUS FEE RECEIPT
    {
        "id": "receipt_transport",
        "title": "School Transport Fee Receipt",
        "width": 840,
        "height": 820,
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
  .badge { display: inline-block; padding: 4px 18px; background: #eff6ff; border: 1.5px solid #2563eb; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #2563eb; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 12px; margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .meta-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; }
  .meta-label { font-weight: 700; color: #64748b; }
  .meta-val { font-weight: 800; color: #0f172a; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; }
  th { background: #f1f5f9; padding: 8px 12px; font-weight: 800; text-align: left; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #334155; }
  td { padding: 9px 12px; border: 1px solid #e2e8f0; }
  .td-right { text-align: right; font-weight: 700; font-family: monospace; font-size: 12.5px; }
  .td-center { text-align: center; font-weight: 700; }

  .net-box { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #eff6ff; border: 1.5px solid #2563eb; border-radius: 8px; margin-bottom: 16px; }
  .net-label { font-size: 13px; font-weight: 800; color: #1e40af; }
  .net-val { font-size: 19px; font-weight: 900; color: #2563eb; font-family: monospace; }
  .words-text { font-size: 11px; color: #475569; font-style: italic; margin-bottom: 22px; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; }
  .sig-box { text-align: center; width: 180px; }
  .sig-line { border-top: 1.5px solid #64748b; padding-top: 5px; font-size: 11px; font-weight: 700; color: #334155; }
  .stamp { display: inline-block; width: 80px; height: 80px; border: 2.5px solid #2563eb; border-radius: 50%; color: #2563eb; font-size: 8px; font-weight: 800; text-align: center; padding-top: 18px; text-transform: uppercase; transform: rotate(-6deg); }
</style>
</head>
<body>
  <div class="doc">
    <div class="school-header">
      <div class="school-name">Bajrang Shikshan Sansthan</div>
      <div class="school-sub">Sec. Sch. Padu Khurd, Nagaur - 341021 (Raj.) | Transport Division</div>
    </div>

    <div class="badge-wrap">
      <span class="badge">School Conveyance & Bus Fee Pass Receipt</span>
    </div>

    <div class="meta-grid">
      <div class="meta-row"><span class="meta-label">Student Name:</span><span class="meta-val">Karan Prajapat</span></div>
      <div class="meta-row"><span class="meta-label">Pass / Receipt No:</span><span class="meta-val">BSS-BUS-2026-114</span></div>
      <div class="meta-row"><span class="meta-label">Class & Section:</span><span class="meta-val">8th - B</span></div>
      <div class="meta-row"><span class="meta-label">Issue Date:</span><span class="meta-val">02 Oct 2026</span></div>
      <div class="meta-row"><span class="meta-label">Assigned Route:</span><span class="meta-val">Route No. 3 (Padu Kalan to Khurd)</span></div>
      <div class="meta-row"><span class="meta-label">Vehicle Reg No:</span><span class="meta-val">RJ-21-PA-4019 (Bus #2)</span></div>
      <div class="meta-row"><span class="meta-label">Pick-up / Drop Stop:</span><span class="meta-val">Main Bus Stand, Padu Kalan</span></div>
      <div class="meta-row"><span class="meta-label">Payment Mode:</span><span class="meta-val">UPI / Online</span></div>
    </div>

    <!-- EXACT 4 COLUMNS ONLY -->
    <table>
      <thead>
        <tr>
          <th class="td-center" style="width: 50px;">S.No</th>
          <th>Coverage Period / Month</th>
          <th>Bus Stop & Route</th>
          <th style="text-align: right; width: 130px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="td-center">1</td><td>October 2026</td><td>Main Bus Stand (Route #3)</td><td class="td-right">₹900.00</td></tr>
        <tr><td class="td-center">2</td><td>November 2026</td><td>Main Bus Stand (Route #3)</td><td class="td-right">₹900.00</td></tr>
        <tr><td class="td-center">3</td><td>December 2026</td><td>Main Bus Stand (Route #3)</td><td class="td-right">₹900.00</td></tr>
      </tbody>
    </table>

    <div class="net-box">
      <span class="net-label">Total Bus Fee Paid (Term 2):</span>
      <span class="net-val">₹2,700.00</span>
    </div>

    <div class="words-text">Amount in words: Two Thousand Seven Hundred Rupees Only.</div>

    <div class="sig-row">
      <div class="sig-box"><div class="sig-line">Depositor Signature</div></div>
      <div class="stamp">BSS<br>Padu Khurd<br><b>BUS PASS</b><br>Valid</div>
      <div class="sig-box"><div class="sig-line">Transport Officer</div></div>
    </div>
  </div>
</body>
</html>
        """
    },

    # 4. LIBRARY & BOOKSTORE SALE RECEIPT
    {
        "id": "receipt_bookstore",
        "title": "School Books & Uniform Receipt",
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
  .badge { display: inline-block; padding: 4px 18px; background: #fffbeb; border: 1.5px solid #d97706; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #d97706; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 12px; margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .meta-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; }
  .meta-label { font-weight: 700; color: #64748b; }
  .meta-val { font-weight: 800; color: #0f172a; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; }
  th { background: #f1f5f9; padding: 8px 12px; font-weight: 800; text-align: left; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #334155; }
  td { padding: 8px 12px; border: 1px solid #e2e8f0; }
  .td-right { text-align: right; font-weight: 700; font-family: monospace; font-size: 12px; }
  .td-center { text-align: center; font-weight: 700; }

  .net-box { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #fffbeb; border: 1.5px solid #d97706; border-radius: 8px; margin-bottom: 16px; }
  .net-label { font-size: 13px; font-weight: 800; color: #92400e; }
  .net-val { font-size: 19px; font-weight: 900; color: #d97706; font-family: monospace; }
  .words-text { font-size: 11px; color: #475569; font-style: italic; margin-bottom: 22px; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; }
  .sig-box { text-align: center; width: 180px; }
  .sig-line { border-top: 1.5px solid #64748b; padding-top: 5px; font-size: 11px; font-weight: 700; color: #334155; }
  .stamp { display: inline-block; width: 80px; height: 80px; border: 2.5px solid #d97706; border-radius: 50%; color: #d97706; font-size: 8px; font-weight: 800; text-align: center; padding-top: 18px; text-transform: uppercase; transform: rotate(7deg); }
</style>
</head>
<body>
  <div class="doc">
    <div class="school-header">
      <div class="school-name">Bajrang Shikshan Sansthan</div>
      <div class="school-sub">Sec. Sch. Padu Khurd, Nagaur - 341021 (Raj.) | Book Store & Uniform Desk</div>
    </div>

    <div class="badge-wrap">
      <span class="badge">School Book Store & Stationery Sale Receipt</span>
    </div>

    <div class="meta-grid">
      <div class="meta-row"><span class="meta-label">Student Name:</span><span class="meta-val">Mohit Sen</span></div>
      <div class="meta-row"><span class="meta-label">Bill / Cash Memo No:</span><span class="meta-val">BSS-STR-2026-319</span></div>
      <div class="meta-row"><span class="meta-label">Class:</span><span class="meta-val">Class 9th</span></div>
      <div class="meta-row"><span class="meta-label">Date:</span><span class="meta-val">10 Jul 2026</span></div>
      <div class="meta-row"><span class="meta-label">Admission No:</span><span class="meta-val">ADM-2026-194</span></div>
      <div class="meta-row"><span class="meta-label">Payment Mode:</span><span class="meta-val">Cash</span></div>
    </div>

    <!-- EXACT 5 STANDARD RETAIL COLUMNS -->
    <table>
      <thead>
        <tr>
          <th class="td-center" style="width: 50px;">S.No</th>
          <th>Item Description</th>
          <th class="td-center" style="width: 70px;">Qty</th>
          <th style="text-align: right; width: 110px;">Rate</th>
          <th style="text-align: right; width: 120px;">Total Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="td-center">1</td><td>NCERT Class 9th Textbook Set (Complete)</td><td class="td-center">1 Set</td><td class="td-right">₹1,250.00</td><td class="td-right">₹1,250.00</td></tr>
        <tr><td class="td-center">2</td><td>School Customized Notebooks (Pack of 12)</td><td class="td-center">1 Pk</td><td class="td-right">₹480.00</td><td class="td-right">₹480.00</td></tr>
        <tr><td class="td-center">3</td><td>School Uniform Set (Shirt + Trouser + Tie)</td><td class="td-center">2 Sets</td><td class="td-right">₹900.00</td><td class="td-right">₹1,800.00</td></tr>
        <tr><td class="td-center">4</td><td>School Belt & House Badge</td><td class="td-center">1 Set</td><td class="td-right">₹150.00</td><td class="td-right">₹150.00</td></tr>
      </tbody>
    </table>

    <div class="net-box">
      <span class="net-label">Grand Total Paid:</span>
      <span class="net-val">₹3,680.00</span>
    </div>

    <div class="words-text">Amount in words: Three Thousand Six Hundred Eighty Rupees Only.</div>

    <div class="sig-row">
      <div class="sig-box"><div class="sig-line">Customer / Student Signature</div></div>
      <div class="stamp">BSS<br>Padu Khurd<br><b>PAID</b><br>Store Counter</div>
      <div class="sig-box"><div class="sig-line">Store In-charge</div></div>
    </div>
  </div>
</body>
</html>
        """
    },

    # 5. PETTY CASH & SCHOOL EXPENSE PAYMENT VOUCHER
    {
        "id": "receipt_petty_cash",
        "title": "School Expense Voucher",
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
  .badge { display: inline-block; padding: 4px 18px; background: #faf5ff; border: 1.5px solid #7e22ce; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #7e22ce; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 12px; margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .meta-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; }
  .meta-label { font-weight: 700; color: #64748b; }
  .meta-val { font-weight: 800; color: #0f172a; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; }
  th { background: #f1f5f9; padding: 8px 12px; font-weight: 800; text-align: left; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #334155; }
  td { padding: 9px 12px; border: 1px solid #e2e8f0; }
  .td-right { text-align: right; font-weight: 700; font-family: monospace; font-size: 12.5px; }
  .td-center { text-align: center; font-weight: 700; }

  .net-box { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #faf5ff; border: 1.5px solid #7e22ce; border-radius: 8px; margin-bottom: 16px; }
  .net-label { font-size: 13px; font-weight: 800; color: #6b21a8; }
  .net-val { font-size: 19px; font-weight: 900; color: #7e22ce; font-family: monospace; }
  .words-text { font-size: 11px; color: #475569; font-style: italic; margin-bottom: 22px; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; }
  .sig-box { text-align: center; width: 170px; }
  .sig-line { border-top: 1.5px solid #64748b; padding-top: 5px; font-size: 11px; font-weight: 700; color: #334155; }
  .stamp { display: inline-block; width: 80px; height: 80px; border: 2.5px solid #7e22ce; border-radius: 50%; color: #7e22ce; font-size: 8px; font-weight: 800; text-align: center; padding-top: 18px; text-transform: uppercase; transform: rotate(-5deg); }
</style>
</head>
<body>
  <div class="doc">
    <div class="school-header">
      <div class="school-name">Bajrang Shikshan Sansthan</div>
      <div class="school-sub">Sec. Sch. Padu Khurd, Nagaur - 341021 (Raj.) | Accounts Office</div>
    </div>

    <div class="badge-wrap">
      <span class="badge">Debit / Petty Cash Payment Voucher</span>
    </div>

    <div class="meta-grid">
      <div class="meta-row"><span class="meta-label">Paid To (Payee):</span><span class="meta-val">Shree Ram Electric & Hardware</span></div>
      <div class="meta-row"><span class="meta-label">Voucher No:</span><span class="meta-val">BSS-VCH-2026-074</span></div>
      <div class="meta-row"><span class="meta-label">Debit Account Head:</span><span class="meta-val">School Maintenance & Repairs</span></div>
      <div class="meta-row"><span class="meta-label">Date:</span><span class="meta-val">21 Oct 2026</span></div>
      <div class="meta-row"><span class="meta-label">Passed By:</span><span class="meta-val">Principal / Secretary</span></div>
      <div class="meta-row"><span class="meta-label">Payment Mode:</span><span class="meta-val">Cash (Petty Cash Register)</span></div>
    </div>

    <!-- EXACT 3 COLUMNS ONLY -->
    <table>
      <thead>
        <tr>
          <th class="td-center" style="width: 50px;">S.No</th>
          <th>Expense Item Description / Bill Particulars</th>
          <th style="text-align: right; width: 140px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="td-center">1</td><td>LED Tube lights & Wire roll for Science Lab (Bill #412)</td><td class="td-right">₹1,450.00</td></tr>
        <tr><td class="td-center">2</td><td>Electrician Labor Charges (Repair in Room 8 & 9)</td><td class="td-right">₹600.00</td></tr>
        <tr><td class="td-center">3</td><td>Water Cooler tap replacement & pipe fitting</td><td class="td-right">₹350.00</td></tr>
      </tbody>
    </table>

    <div class="net-box">
      <span class="net-label">Total Expense Amount Disbursed:</span>
      <span class="net-val">₹2,400.00</span>
    </div>

    <div class="words-text">Amount in words: Two Thousand Four Hundred Rupees Only.</div>

    <div class="sig-row">
      <div class="sig-box"><div class="sig-line">Payee / Receiver Signature</div></div>
      <div class="sig-box"><div class="sig-line">Accountant / Prepared By</div></div>
      <div class="stamp">BSS<br>Padu Khurd<br><b>EXPENSE</b><br>Passed</div>
      <div class="sig-box"><div class="sig-line">Sanctioning Authority</div></div>
    </div>
  </div>
</body>
</html>
        """
    }
]

for r in receipts:
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

print("All receipts successfully rendered!")
