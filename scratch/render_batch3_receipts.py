import os
import subprocess

artifact_dir = r"C:\Users\habib\.gemini\antigravity-ide\brain\5baf4f47-1a19-4a0a-9213-88a5e2a1726e"
public_dir = r"c:\Users\habib\OneDrive\Documents\school-management\public\receipts"
os.makedirs(artifact_dir, exist_ok=True)
os.makedirs(public_dir, exist_ok=True)
chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

batch3_receipts = [
    # 1. SALARY ADVANCE DISBURSEMENT VOUCHER
    {
        "id": "receipt_salary_advance",
        "title": "Staff Salary Advance Disbursement Voucher",
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
  .badge { display: inline-block; padding: 4px 18px; background: #fff1f2; border: 1.5px solid #e11d48; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #e11d48; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 12px; margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .meta-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; }
  .meta-label { font-weight: 700; color: #64748b; }
  .meta-val { font-weight: 800; color: #0f172a; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; }
  th { background: #f1f5f9; padding: 8px 12px; font-weight: 800; text-align: left; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #334155; }
  td { padding: 9px 12px; border: 1px solid #e2e8f0; }
  .td-right { text-align: right; font-weight: 700; font-family: monospace; font-size: 12.5px; }
  .td-center { text-align: center; font-weight: 700; }

  .net-box { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #fff1f2; border: 1.5px solid #e11d48; border-radius: 8px; margin-bottom: 16px; }
  .net-label { font-size: 13px; font-weight: 800; color: #9f1239; }
  .net-val { font-size: 19px; font-weight: 900; color: #e11d48; font-family: monospace; }
  .words-text { font-size: 11px; color: #475569; font-style: italic; margin-bottom: 22px; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; }
  .sig-box { text-align: center; width: 170px; }
  .sig-line { border-top: 1.5px solid #64748b; padding-top: 5px; font-size: 11px; font-weight: 700; color: #334155; }
  .stamp { display: inline-block; width: 80px; height: 80px; border: 2.5px solid #e11d48; border-radius: 50%; color: #e11d48; font-size: 8px; font-weight: 800; text-align: center; padding-top: 18px; text-transform: uppercase; transform: rotate(-6deg); }
</style>
</head>
<body>
  <div class="doc">
    <div class="school-header">
      <div class="school-name">Bajrang Shikshan Sansthan</div>
      <div class="school-sub">Sec. Sch. Padu Khurd, Nagaur - 341021 (Raj.) | Staff Payroll Division</div>
    </div>

    <div class="badge-wrap">
      <span class="badge">Staff Salary Advance Disbursement & Recovery Voucher</span>
    </div>

    <div class="meta-grid">
      <div class="meta-row"><span class="meta-label">Staff Member Name:</span><span class="meta-val">Sunita Sharma</span></div>
      <div class="meta-row"><span class="meta-label">Voucher No:</span><span class="meta-val">BSS-ADV-2026-014</span></div>
      <div class="meta-row"><span class="meta-label">Employee ID:</span><span class="meta-val">EMP-112</span></div>
      <div class="meta-row"><span class="meta-label">Disbursement Date:</span><span class="meta-val">10 Oct 2026</span></div>
      <div class="meta-row"><span class="meta-label">Designation:</span><span class="meta-val">TGT - Science</span></div>
      <div class="meta-row"><span class="meta-label">Payment Mode:</span><span class="meta-val">Cash (Advance Desk)</span></div>
      <div class="meta-row"><span class="meta-label">Recovery Plan:</span><span class="meta-val">2 Equal Installments (Nov & Dec 2026)</span></div>
      <div class="meta-row"><span class="meta-label">Monthly Gross Pay:</span><span class="meta-val">₹22,000.00</span></div>
    </div>

    <!-- EXACT 4 COLUMNS ONLY -->
    <table>
      <thead>
        <tr>
          <th class="td-center" style="width: 50px;">S.No</th>
          <th>Advance Particulars / Reason for Emergency Request</th>
          <th>Salary Deduction Month</th>
          <th style="text-align: right; width: 140px;">Advance Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="td-center">1</td><td>Advance Installment 1 (Family Medical Emergency)</td><td>November 2026 Salary</td><td class="td-right">₹5,000.00</td></tr>
        <tr><td class="td-center">2</td><td>Advance Installment 2 (Family Medical Emergency)</td><td>December 2026 Salary</td><td class="td-right">₹5,000.00</td></tr>
      </tbody>
    </table>

    <div class="net-box">
      <span class="net-label">Total Salary Advance Disbursed:</span>
      <span class="net-val">₹10,000.00</span>
    </div>

    <div class="words-text">Amount in words: Ten Thousand Rupees Only (To be deducted from payroll in 2 installments).</div>

    <div class="sig-row">
      <div class="sig-box"><div class="sig-line">Employee Receiver Sign</div></div>
      <div class="sig-box"><div class="sig-line">Accountant / Cashier</div></div>
      <div class="stamp">BSS<br>Padu Khurd<br><b>ADVANCE</b><br>Disbursed</div>
      <div class="sig-box"><div class="sig-line">Principal / Manager</div></div>
    </div>
  </div>
</body>
</html>
        """
    },

    # 2. CANTEEN & CAFETERIA MEAL PLAN SUBSCRIPTION
    {
        "id": "receipt_canteen_meal",
        "title": "Canteen & Meal Plan Subscription Receipt",
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
  .badge { display: inline-block; padding: 4px 18px; background: #f0fdfa; border: 1.5px solid #0d9488; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0d9488; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 12px; margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .meta-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; }
  .meta-label { font-weight: 700; color: #64748b; }
  .meta-val { font-weight: 800; color: #0f172a; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; }
  th { background: #f1f5f9; padding: 8px 12px; font-weight: 800; text-align: left; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #334155; }
  td { padding: 9px 12px; border: 1px solid #e2e8f0; }
  .td-right { text-align: right; font-weight: 700; font-family: monospace; font-size: 12.5px; }
  .td-center { text-align: center; font-weight: 700; }

  .net-box { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #f0fdfa; border: 1.5px solid #0d9488; border-radius: 8px; margin-bottom: 16px; }
  .net-label { font-size: 13px; font-weight: 800; color: #115e59; }
  .net-val { font-size: 19px; font-weight: 900; color: #0d9488; font-family: monospace; }
  .words-text { font-size: 11px; color: #475569; font-style: italic; margin-bottom: 22px; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; }
  .sig-box { text-align: center; width: 180px; }
  .sig-line { border-top: 1.5px solid #64748b; padding-top: 5px; font-size: 11px; font-weight: 700; color: #334155; }
  .stamp { display: inline-block; width: 80px; height: 80px; border: 2.5px solid #0d9488; border-radius: 50%; color: #0d9488; font-size: 8px; font-weight: 800; text-align: center; padding-top: 18px; text-transform: uppercase; transform: rotate(5deg); }
</style>
</head>
<body>
  <div class="doc">
    <div class="school-header">
      <div class="school-name">Bajrang Shikshan Sansthan</div>
      <div class="school-sub">Sec. Sch. Padu Khurd, Nagaur - 341021 (Raj.) | School Cafeteria & Dining Services</div>
    </div>

    <div class="badge-wrap">
      <span class="badge">Student Cafeteria & Nutrition Meal Subscription Receipt</span>
    </div>

    <div class="meta-grid">
      <div class="meta-row"><span class="meta-label">Student Name:</span><span class="meta-val">Aman Verma</span></div>
      <div class="meta-row"><span class="meta-label">Pass / Card No:</span><span class="meta-val">BSS-CAN-2026-083</span></div>
      <div class="meta-row"><span class="meta-label">Class & Sec:</span><span class="meta-val">Class 7th - A</span></div>
      <div class="meta-row"><span class="meta-label">Subscription Date:</span><span class="meta-val">01 Oct 2026</span></div>
      <div class="meta-row"><span class="meta-label">Admission No:</span><span class="meta-val">ADM-2026-319</span></div>
      <div class="meta-row"><span class="meta-label">Meal Plan Type:</span><span class="meta-val">Hot Lunch + Evening Milk/Snack</span></div>
      <div class="meta-row"><span class="meta-label">Valid Duration:</span><span class="meta-val">01 Oct 2026 – 31 Dec 2026 (3 Months)</span></div>
      <div class="meta-row"><span class="meta-label">Payment Mode:</span><span class="meta-val">UPI / Online</span></div>
    </div>

    <!-- EXACT 4 COLUMNS ONLY -->
    <table>
      <thead>
        <tr>
          <th class="td-center" style="width: 50px;">S.No</th>
          <th>Cafeteria Meal Plan Description</th>
          <th>Monthly Period</th>
          <th style="text-align: right; width: 140px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="td-center">1</td><td>Wholesome Vegetarian Hot Lunch (Daily 1:00 PM)</td><td>October 2026</td><td class="td-right">₹1,100.00</td></tr>
        <tr><td class="td-center">2</td><td>Wholesome Vegetarian Hot Lunch (Daily 1:00 PM)</td><td>November 2026</td><td class="td-right">₹1,100.00</td></tr>
        <tr><td class="td-center">3</td><td>Wholesome Vegetarian Hot Lunch (Daily 1:00 PM)</td><td>December 2026</td><td class="td-right">₹1,100.00</td></tr>
        <tr><td class="td-center">4</td><td>Smart Meal RFID Card Issuance Fee</td><td>One-Time</td><td class="td-right">₹150.00</td></tr>
      </tbody>
    </table>

    <div class="net-box">
      <span class="net-label">Total Meal Subscription Fee Received:</span>
      <span class="net-val">₹3,450.00</span>
    </div>

    <div class="words-text">Amount in words: Three Thousand Four Hundred Fifty Rupees Only.</div>

    <div class="sig-row">
      <div class="sig-box"><div class="sig-line">Parent / Student Signature</div></div>
      <div class="stamp">BSS<br>Padu Khurd<br><b>MEAL PASS</b><br>Active</div>
      <div class="sig-box"><div class="sig-line">Cafeteria In-charge</div></div>
    </div>
  </div>
</body>
</html>
        """
    },

    # 3. LABORATORY DAMAGE & BREAKAGE COMPENSATION RECEIPT
    {
        "id": "receipt_lab_breakage",
        "title": "Lab Damage & Equipment Replacement Receipt",
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
  .badge { display: inline-block; padding: 4px 18px; background: #fff7ed; border: 1.5px solid #ea580c; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #ea580c; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 12px; margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .meta-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; }
  .meta-label { font-weight: 700; color: #64748b; }
  .meta-val { font-weight: 800; color: #0f172a; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; }
  th { background: #f1f5f9; padding: 8px 12px; font-weight: 800; text-align: left; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #334155; }
  td { padding: 9px 12px; border: 1px solid #e2e8f0; }
  .td-right { text-align: right; font-weight: 700; font-family: monospace; font-size: 12.5px; }
  .td-center { text-align: center; font-weight: 700; }

  .net-box { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #fff7ed; border: 1.5px solid #ea580c; border-radius: 8px; margin-bottom: 16px; }
  .net-label { font-size: 13px; font-weight: 800; color: #9a3412; }
  .net-val { font-size: 19px; font-weight: 900; color: #ea580c; font-family: monospace; }
  .words-text { font-size: 11px; color: #475569; font-style: italic; margin-bottom: 22px; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; }
  .sig-box { text-align: center; width: 180px; }
  .sig-line { border-top: 1.5px solid #64748b; padding-top: 5px; font-size: 11px; font-weight: 700; color: #334155; }
  .stamp { display: inline-block; width: 80px; height: 80px; border: 2.5px solid #ea580c; border-radius: 50%; color: #ea580c; font-size: 8px; font-weight: 800; text-align: center; padding-top: 18px; text-transform: uppercase; transform: rotate(-8deg); }
</style>
</head>
<body>
  <div class="doc">
    <div class="school-header">
      <div class="school-name">Bajrang Shikshan Sansthan</div>
      <div class="school-sub">Sec. Sch. Padu Khurd, Nagaur - 341021 (Raj.) | Science & Computer Laboratories</div>
    </div>

    <div class="badge-wrap">
      <span class="badge">Laboratory Apparatus Damage & Breakage Compensation Receipt</span>
    </div>

    <div class="meta-grid">
      <div class="meta-row"><span class="meta-label">Student Name:</span><span class="meta-val">Vivek Suthar</span></div>
      <div class="meta-row"><span class="meta-label">Slip No:</span><span class="meta-val">BSS-LAB-2026-027</span></div>
      <div class="meta-row"><span class="meta-label">Class & Roll:</span><span class="meta-val">Class 10th &bull; Roll No: 31</span></div>
      <div class="meta-row"><span class="meta-label">Date of Incident:</span><span class="meta-val">18 Nov 2026</span></div>
      <div class="meta-row"><span class="meta-label">Admission No:</span><span class="meta-val">ADM-2026-144</span></div>
      <div class="meta-row"><span class="meta-label">Laboratory Wing:</span><span class="meta-val">Senior Chemistry Lab</span></div>
      <div class="meta-row"><span class="meta-label">Supervising Teacher:</span><span class="meta-val">R. K. Meena (PGT Chemistry)</span></div>
      <div class="meta-row"><span class="meta-label">Payment Mode:</span><span class="meta-val">Cash (Lab Counter)</span></div>
    </div>

    <!-- EXACT 4 COLUMNS ONLY -->
    <table>
      <thead>
        <tr>
          <th class="td-center" style="width: 50px;">S.No</th>
          <th>Damaged Apparatus / Equipment Description</th>
          <th class="td-center" style="width: 80px;">Qty Damaged</th>
          <th style="text-align: right; width: 140px;">Replacement Cost</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="td-center">1</td><td>Borosilicate 250ml Glass Conical Flask (Broken during titration)</td><td class="td-center">1 Pc</td><td class="td-right">₹180.00</td></tr>
        <tr><td class="td-center">2</td><td>Graduated Glass Burette 50ml with PTFE Stopcock</td><td class="td-center">1 Pc</td><td class="td-right">₹320.00</td></tr>
      </tbody>
    </table>

    <div class="net-box">
      <span class="net-label">Total Replacement Fee Received:</span>
      <span class="net-val">₹500.00</span>
    </div>

    <div class="words-text">Amount in words: Five Hundred Rupees Only (Clearance granted for lab record).</div>

    <div class="sig-row">
      <div class="sig-box"><div class="sig-line">Student Depositor Signature</div></div>
      <div class="stamp">BSS<br>Padu Khurd<br><b>LAB DUES</b><br>Cleared</div>
      <div class="sig-box"><div class="sig-line">Lab Assistant / In-charge</div></div>
    </div>
  </div>
</body>
</html>
        """
    },

    # 4. DONATION & CHARITABLE TRUST 80G RECEIPT
    {
        "id": "receipt_charity_donation",
        "title": "Donation & Trust Grant 80G Tax Receipt",
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
  .badge { display: inline-block; padding: 4px 18px; background: #fefce8; border: 1.5px solid #854d0e; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #854d0e; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 12px; margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .meta-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; }
  .meta-label { font-weight: 700; color: #64748b; }
  .meta-val { font-weight: 800; color: #0f172a; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; }
  th { background: #f1f5f9; padding: 8px 12px; font-weight: 800; text-align: left; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #334155; }
  td { padding: 9px 12px; border: 1px solid #e2e8f0; }
  .td-right { text-align: right; font-weight: 700; font-family: monospace; font-size: 12.5px; }
  .td-center { text-align: center; font-weight: 700; }

  .net-box { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #fefce8; border: 1.5px solid #854d0e; border-radius: 8px; margin-bottom: 16px; }
  .net-label { font-size: 13px; font-weight: 800; color: #713f12; }
  .net-val { font-size: 19px; font-weight: 900; color: #854d0e; font-family: monospace; }
  .words-text { font-size: 11px; color: #475569; font-style: italic; margin-bottom: 22px; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; }
  .sig-box { text-align: center; width: 180px; }
  .sig-line { border-top: 1.5px solid #64748b; padding-top: 5px; font-size: 11px; font-weight: 700; color: #334155; }
  .stamp { display: inline-block; width: 80px; height: 80px; border: 2.5px solid #854d0e; border-radius: 50%; color: #854d0e; font-size: 8px; font-weight: 800; text-align: center; padding-top: 18px; text-transform: uppercase; transform: rotate(-5deg); }
</style>
</head>
<body>
  <div class="doc">
    <div class="school-header">
      <div class="school-name">Bajrang Shikshan Sansthan Trust</div>
      <div class="school-sub">Padu Khurd, Nagaur - 341021 (Raj.) | Registered Society & Charitable Trust</div>
      <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Exempted u/s 80G(5)(vi) of Income Tax Act 1961 &bull; PAN: AAATB4810M</div>
    </div>

    <div class="badge-wrap">
      <span class="badge">Charitable Educational Donation & CSR Contribution Receipt</span>
    </div>

    <div class="meta-grid">
      <div class="meta-row"><span class="meta-label">Donor / Trust Name:</span><span class="meta-val">Seth Brijlal Memorial Trust</span></div>
      <div class="meta-row"><span class="meta-label">Receipt No:</span><span class="meta-val">BSS-DON-2026-009</span></div>
      <div class="meta-row"><span class="meta-label">Donor PAN:</span><span class="meta-val">AAATB9821K</span></div>
      <div class="meta-row"><span class="meta-label">Donation Date:</span><span class="meta-val">15 Dec 2026</span></div>
      <div class="meta-row"><span class="meta-label">Address:</span><span class="meta-val">Merta City, Nagaur (Raj.)</span></div>
      <div class="meta-row"><span class="meta-label">Payment Mode:</span><span class="meta-val">NEFT / Bank Transfer</span></div>
      <div class="meta-row"><span class="meta-label">Transaction UTR:</span><span class="meta-val">PUNBN26350192841</span></div>
      <div class="meta-row"><span class="meta-label">Tax Exemption:</span><span class="meta-val">Eligible for 50% IT Deduction u/s 80G</span></div>
    </div>

    <!-- EXACT 3 COLUMNS ONLY -->
    <table>
      <thead>
        <tr>
          <th class="td-center" style="width: 50px;">S.No</th>
          <th>Charitable Educational Project / Fund Allocation</th>
          <th style="text-align: right; width: 150px;">Donated Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="td-center">1</td><td>Underprivileged Rural Students Scholarship Corpus Fund</td><td class="td-right">₹15,000.00</td></tr>
        <tr><td class="td-center">2</td><td>Smart Digital Classroom Projector & Hardware Support</td><td class="td-right">₹10,000.00</td></tr>
      </tbody>
    </table>

    <div class="net-box">
      <span class="net-label">Total Donation Received with Sincere Gratitude:</span>
      <span class="net-val">₹25,000.00</span>
    </div>

    <div class="words-text">Amount in words: Twenty Five Thousand Rupees Only.</div>

    <div class="sig-row">
      <div class="sig-box"><div class="sig-line">Donor Representative Signature</div></div>
      <div class="stamp">BSS TRUST<br>Padu Khurd<br><b>80G EXEMPT</b><br>Received</div>
      <div class="sig-box"><div class="sig-line">Treasurer / President</div></div>
    </div>
  </div>
</body>
</html>
        """
    },

    # 5. SUMMER CAMP & SPECIAL SKILL WORKSHOP RECEIPT
    {
        "id": "receipt_summer_camp",
        "title": "Summer Camp & Skill Workshop Receipt",
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
  .badge { display: inline-block; padding: 4px 18px; background: #faf5ff; border: 1.5px solid #9333ea; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #9333ea; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 12px; margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .meta-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; }
  .meta-label { font-weight: 700; color: #64748b; }
  .meta-val { font-weight: 800; color: #0f172a; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; }
  th { background: #f1f5f9; padding: 8px 12px; font-weight: 800; text-align: left; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #334155; }
  td { padding: 9px 12px; border: 1px solid #e2e8f0; }
  .td-right { text-align: right; font-weight: 700; font-family: monospace; font-size: 12.5px; }
  .td-center { text-align: center; font-weight: 700; }

  .net-box { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #faf5ff; border: 1.5px solid #9333ea; border-radius: 8px; margin-bottom: 16px; }
  .net-label { font-size: 13px; font-weight: 800; color: #7e22ce; }
  .net-val { font-size: 19px; font-weight: 900; color: #9333ea; font-family: monospace; }
  .words-text { font-size: 11px; color: #475569; font-style: italic; margin-bottom: 22px; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; }
  .sig-box { text-align: center; width: 180px; }
  .sig-line { border-top: 1.5px solid #64748b; padding-top: 5px; font-size: 11px; font-weight: 700; color: #334155; }
  .stamp { display: inline-block; width: 80px; height: 80px; border: 2.5px solid #9333ea; border-radius: 50%; color: #9333ea; font-size: 8px; font-weight: 800; text-align: center; padding-top: 18px; text-transform: uppercase; transform: rotate(6deg); }
</style>
</head>
<body>
  <div class="doc">
    <div class="school-header">
      <div class="school-name">Bajrang Shikshan Sansthan</div>
      <div class="school-sub">Sec. Sch. Padu Khurd, Nagaur - 341021 (Raj.) | Youth Development & Hobby Wing</div>
    </div>

    <div class="badge-wrap">
      <span class="badge">Summer Creative Camp & Robotics Workshop Fee Receipt</span>
    </div>

    <div class="meta-grid">
      <div class="meta-row"><span class="meta-label">Student Name:</span><span class="meta-val">Rohan Saini</span></div>
      <div class="meta-row"><span class="meta-label">Reg Slip No:</span><span class="meta-val">BSS-SMP-2026-052</span></div>
      <div class="meta-row"><span class="meta-label">Class & Age:</span><span class="meta-val">Class 6th &bull; 11 Years</span></div>
      <div class="meta-row"><span class="meta-label">Date:</span><span class="meta-val">15 May 2026</span></div>
      <div class="meta-row"><span class="meta-label">Camp Duration:</span><span class="meta-val">21 Days (20 May – 10 Jun 2026)</span></div>
      <div class="meta-row"><span class="meta-label">Batch Timing:</span><span class="meta-val">Morning 8:00 AM – 11:30 AM</span></div>
      <div class="meta-row"><span class="meta-label">Admission No:</span><span class="meta-val">ADM-2026-381</span></div>
      <div class="meta-row"><span class="meta-label">Payment Mode:</span><span class="meta-val">Cash (Camp Counter)</span></div>
    </div>

    <!-- EXACT 4 COLUMNS ONLY -->
    <table>
      <thead>
        <tr>
          <th class="td-center" style="width: 50px;">S.No</th>
          <th>Skill Activity / Workshop Enrolled</th>
          <th>Instructor / Batch</th>
          <th style="text-align: right; width: 140px;">Activity Fee</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="td-center">1</td><td>STEM Robotics & Basic Coding Workshop</td><td>Batch A (Lab 2)</td><td class="td-right">₹1,200.00</td></tr>
        <tr><td class="td-center">2</td><td>Self-Defense Martial Arts (Taekwondo)</td><td>Sports Ground</td><td class="td-right">₹600.00</td></tr>
        <tr><td class="td-center">3</td><td>Fine Arts & Canvas Oil Painting Material Kit</td><td>Art Studio</td><td class="td-right">₹400.00</td></tr>
      </tbody>
    </table>

    <div class="net-box">
      <span class="net-label">Total Summer Camp Fee Paid:</span>
      <span class="net-val">₹2,200.00</span>
    </div>

    <div class="words-text">Amount in words: Two Thousand Two Hundred Rupees Only.</div>

    <div class="sig-row">
      <div class="sig-box"><div class="sig-line">Parent Signature</div></div>
      <div class="stamp">BSS<br>Padu Khurd<br><b>REGISTERED</b><br>Summer Camp</div>
      <div class="sig-box"><div class="sig-line">Camp Director / Coach</div></div>
    </div>
  </div>
</body>
</html>
        """
    },

    # 6. ANNUAL MAINTENANCE CONTRACT (AMC) VENDOR VOUCHER
    {
        "id": "receipt_amc_vendor",
        "title": "Vendor AMC & Facility Maintenance Payment Voucher",
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
  .badge { display: inline-block; padding: 4px 18px; background: #f8fafc; border: 1.5px solid #475569; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 12px; margin-bottom: 20px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .meta-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; }
  .meta-label { font-weight: 700; color: #64748b; }
  .meta-val { font-weight: 800; color: #0f172a; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 18px; }
  th { background: #f1f5f9; padding: 8px 12px; font-weight: 800; text-align: left; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #334155; }
  td { padding: 9px 12px; border: 1px solid #e2e8f0; }
  .td-right { text-align: right; font-weight: 700; font-family: monospace; font-size: 12.5px; }
  .td-center { text-align: center; font-weight: 700; }

  .net-box { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #f8fafc; border: 1.5px solid #475569; border-radius: 8px; margin-bottom: 16px; }
  .net-label { font-size: 13px; font-weight: 800; color: #1e293b; }
  .net-val { font-size: 19px; font-weight: 900; color: #0f172a; font-family: monospace; }
  .words-text { font-size: 11px; color: #475569; font-style: italic; margin-bottom: 22px; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; }
  .sig-box { text-align: center; width: 170px; }
  .sig-line { border-top: 1.5px solid #64748b; padding-top: 5px; font-size: 11px; font-weight: 700; color: #334155; }
  .stamp { display: inline-block; width: 80px; height: 80px; border: 2.5px solid #475569; border-radius: 50%; color: #475569; font-size: 8px; font-weight: 800; text-align: center; padding-top: 18px; text-transform: uppercase; transform: rotate(-5deg); }
</style>
</head>
<body>
  <div class="doc">
    <div class="school-header">
      <div class="school-name">Bajrang Shikshan Sansthan</div>
      <div class="school-sub">Sec. Sch. Padu Khurd, Nagaur - 341021 (Raj.) | Office of Estate & Facilities</div>
    </div>

    <div class="badge-wrap">
      <span class="badge">Vendor Annual Maintenance Contract (AMC) Disbursement Voucher</span>
    </div>

    <div class="meta-grid">
      <div class="meta-row"><span class="meta-label">Vendor Service Provider:</span><span class="meta-val">Apex Security & Infotech Systems</span></div>
      <div class="meta-row"><span class="meta-label">Voucher No:</span><span class="meta-val">BSS-AMC-2026-038</span></div>
      <div class="meta-row"><span class="meta-label">GSTIN / Tax ID:</span><span class="meta-val">08AABCA1234F1Z8</span></div>
      <div class="meta-row"><span class="meta-label">Voucher Date:</span><span class="meta-val">31 Oct 2026</span></div>
      <div class="meta-row"><span class="meta-label">Contract Order Ref:</span><span class="meta-val">PO-BSS-2026-AMC-10</span></div>
      <div class="meta-row"><span class="meta-label">Payment Mode:</span><span class="meta-val">Bank Transfer (NEFT/RTGS)</span></div>
      <div class="meta-row"><span class="meta-label">Service Period:</span><span class="meta-val">Q3 Installment (Oct – Dec 2026)</span></div>
      <div class="meta-row"><span class="meta-label">Passed By:</span><span class="meta-val">Principal / Estate Officer</span></div>
    </div>

    <!-- EXACT 4 COLUMNS ONLY -->
    <table>
      <thead>
        <tr>
          <th class="td-center" style="width: 50px;">S.No</th>
          <th>Annual Maintenance Service Scope</th>
          <th>Equipment / Location</th>
          <th style="text-align: right; width: 140px;">Billed Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="td-center">1</td><td>Campus CCTV Surveillance & NVR System AMC</td><td>32 Cameras (Building A & B)</td><td class="td-right">₹4,500.00</td></tr>
        <tr><td class="td-center">2</td><td>Commercial RO Water Plant Filter & Membrane Service</td><td>Central RO Plant (500 LPH)</td><td class="td-right">₹2,800.00</td></tr>
        <tr><td class="td-center">3</td><td>Biometric Attendance Machine Cloud Sync AMC</td><td>Staff Biometric Terminal</td><td class="td-right">₹1,200.00</td></tr>
      </tbody>
    </table>

    <div class="net-box">
      <span class="net-label">Net AMC Installment Paid:</span>
      <span class="net-val">₹8,500.00</span>
    </div>

    <div class="words-text">Amount in words: Eight Thousand Five Hundred Rupees Only.</div>

    <div class="sig-row">
      <div class="sig-box"><div class="sig-line">Vendor Authorized Receiver</div></div>
      <div class="sig-box"><div class="sig-line">Estate Manager / Verified</div></div>
      <div class="stamp">BSS<br>Padu Khurd<br><b>AMC BILL</b><br>Passed</div>
      <div class="sig-box"><div class="sig-line">Principal / Treasurer</div></div>
    </div>
  </div>
</body>
</html>
        """
    }
]

for r in batch3_receipts:
    html_file = f"scratch/{r['id']}.html"
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(r["html"])
    
    out_artifact = os.path.join(artifact_dir, f"{r['id']}.png")
    out_public = os.path.join(public_dir, f"{r['id']}.png")
    html_url = "file:///" + os.path.abspath(html_file).replace("\\", "/")
    
    cmd = [
        chrome_path,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--device-scale-factor=2",
        f"--window-size={r['width']},{r['height']}",
        f"--screenshot={out_artifact}",
        html_url
    ]
    subprocess.run(cmd, check=True)
    # copy also to public dir
    import shutil
    shutil.copyfile(out_artifact, out_public)
    print(f"Generated and copied {r['id']}: True")

print("All Batch 3 receipts successfully generated!")
