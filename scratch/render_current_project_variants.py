import os
import subprocess
import shutil

artifact_dir = r"C:\Users\habib\.gemini\antigravity-ide\brain\5baf4f47-1a19-4a0a-9213-88a5e2a1726e"
public_dir = r"c:\Users\habib\OneDrive\Documents\school-management\public\receipts"
os.makedirs(artifact_dir, exist_ok=True)
os.makedirs(public_dir, exist_ok=True)
chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

current_variants = [
    # ── VARIANT 1: FULL COMPLETE LEDGER (ALL 7 COLUMNS + COMPLETE AUDIT & CONCESSIONS) ──
    {
        "id": "receipt_current_v1_full_ledger",
        "title": "Current Template • Full 7-Column Ledger (Max Details)",
        "width": 880,
        "height": 980,
        "html": """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #ffffff; padding: 25px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #0f172a; }
  .doc { border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 26px 30px; background: #ffffff; max-width: 830px; margin: 0 auto; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
  .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
  .title { font-size: 21px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; }
  .subtitle { font-size: 12px; font-weight: 700; color: #334155; margin-top: 2px; }
  .address { font-size: 11px; color: #64748b; margin-top: 1px; }
  .badge-wrap { text-align: center; margin: 10px 0 14px 0; }
  .badge { display: inline-block; padding: 3.5px 18px; background: #f8fafc; border: 1.5px solid #0f172a; border-radius: 20px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; font-size: 11.5px; margin-bottom: 16px; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .meta-item { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; }
  .meta-lbl { font-weight: 700; color: #64748b; }
  .meta-val { font-weight: 800; color: #0f172a; }

  table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 14px; }
  th { background: #f1f5f9; padding: 7px 10px; font-weight: 800; border: 1px solid #cbd5e1; font-size: 10.5px; text-transform: uppercase; color: #334155; }
  td { padding: 7px 10px; border: 1px solid #e2e8f0; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .font-mono { font-family: monospace; font-weight: 700; font-size: 12px; }
  .status-paid { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
  .status-partial { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }

  .concession-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; font-size: 11.5px; margin-bottom: 12px; }
  .concession-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding: 2px 0; color: #475569; }
  .net-row { display: flex; justify-content: space-between; align-items: center; padding-top: 6px; font-weight: 900; color: #0f172a; font-size: 13px; }
  .net-val { font-size: 18px; color: #16a34a; font-family: monospace; }

  .audit-row { display: flex; justify-content: space-between; font-size: 10.5px; color: #64748b; padding: 6px 0; border-top: 1px dashed #cbd5e1; margin-bottom: 18px; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 28px; }
  .sig-box { text-align: center; width: 180px; }
  .sig-line { border-top: 1.5px solid #64748b; padding-top: 5px; font-size: 11px; font-weight: 700; color: #334155; }
  .stamp { display: inline-block; width: 85px; height: 85px; border: 2.5px solid #4338ca; border-radius: 50%; color: #4338ca; font-size: 8px; font-weight: 800; text-align: center; padding-top: 18px; text-transform: uppercase; transform: rotate(-6deg); }
</style>
</head>
<body>
  <div class="doc">
    <div class="header">
      <div class="title">Bajrang Shikshan Sansthan</div>
      <div class="subtitle">Sec. Sch. Padu Khurd, Nagaur - 341021 (Raj.)</div>
      <div class="address">Ph: 01582-264567 | Email: info@bajrangschool.com | Affiliation: RJ-NAG-2005-081</div>
    </div>

    <div class="badge-wrap">
      <span class="badge">Fees Payment Receipt &bull; Official Copy (Full Ledger)</span>
    </div>

    <div class="meta-grid">
      <div class="meta-item"><span class="meta-lbl">Student Name:</span><span class="meta-val">Aryan Sharma</span></div>
      <div class="meta-item"><span class="meta-lbl">Receipt Number:</span><span class="meta-val" style="color:#d2232a;">BSS-REC-2026-0412</span></div>
      <div class="meta-item"><span class="meta-lbl">Admission No:</span><span class="meta-val">ADM-2026-104</span></div>
      <div class="meta-item"><span class="meta-lbl">Payment Date:</span><span class="meta-val">23 Oct 2026</span></div>
      <div class="meta-item"><span class="meta-lbl">Class & Section:</span><span class="meta-val">Class 10th - Section A</span></div>
      <div class="meta-item"><span class="meta-lbl">Payment Method:</span><span class="meta-val">Cash / Window</span></div>
      <div class="meta-item"><span class="meta-lbl">Billing Range:</span><span class="meta-val font-mono">01 Apr 2026 – 31 Dec 2026</span></div>
      <div class="meta-item"><span class="meta-lbl">Academic Year:</span><span class="meta-val">2026-2027</span></div>
    </div>

    <!-- FULL 7-COLUMN TABLE -->
    <table>
      <thead>
        <tr>
          <th>Fee Head</th>
          <th class="text-right">Total Fee</th>
          <th class="text-right">Paid Before</th>
          <th class="text-right" style="color: #0284c7;">Paid Now</th>
          <th class="text-right">Total Paid</th>
          <th class="text-right" style="color: #dc2626;">Outstanding</th>
          <th class="text-center">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Tuition Fees</td>
          <td class="text-right font-mono">₹18,000.00</td>
          <td class="text-right font-mono">₹12,000.00</td>
          <td class="text-right font-mono" style="color: #0284c7; font-weight:800;">₹4,500.00</td>
          <td class="text-right font-mono">₹16,500.00</td>
          <td class="text-right font-mono" style="color: #dc2626;">₹1,500.00</td>
          <td class="text-center"><span class="status-partial">Partial</span></td>
        </tr>
        <tr>
          <td>Computer Lab Fees</td>
          <td class="text-right font-mono">₹2,400.00</td>
          <td class="text-right font-mono">₹1,600.00</td>
          <td class="text-right font-mono" style="color: #0284c7; font-weight:800;">₹800.00</td>
          <td class="text-right font-mono">₹2,400.00</td>
          <td class="text-right font-mono" style="color: #16a34a;">₹0.00</td>
          <td class="text-center"><span class="status-paid">Paid</span></td>
        </tr>
        <tr>
          <td>Exam & Assessment Fees</td>
          <td class="text-right font-mono">₹1,500.00</td>
          <td class="text-right font-mono">₹1,000.00</td>
          <td class="text-right font-mono" style="color: #0284c7; font-weight:800;">₹500.00</td>
          <td class="text-right font-mono">₹1,500.00</td>
          <td class="text-right font-mono" style="color: #16a34a;">₹0.00</td>
          <td class="text-center"><span class="status-paid">Paid</span></td>
        </tr>
      </tbody>
    </table>

    <div class="concession-box">
      <div class="concession-row"><span>Approved Scholarship / Merit Concession:</span><span class="font-mono text-emerald-600">- ₹500.00</span></div>
      <div class="concession-row"><span>Sibling / Special Fee Waiver:</span><span class="font-mono text-emerald-600">- ₹0.00</span></div>
      <div class="concession-row"><span>Late Payment Surcharge / Fine:</span><span class="font-mono text-rose-600">+ ₹0.00</span></div>
      <div class="net-row">
        <span>Total Net Amount Paid In This Transaction:</span>
        <span class="net-val">₹5,800.00</span>
      </div>
    </div>

    <div class="audit-row">
      <span>Collected By: <strong style="color:#0f172a;">Ramesh Kumar (Authorized Cashier)</strong></span>
      <span>Computer Generated Official Fee Receipt &bull; Student Account Ledger Audited</span>
    </div>

    <div class="sig-row">
      <div class="sig-box"><div class="sig-line">Depositor Signature</div></div>
      <div class="stamp">BSS<br>Padu Khurd<br><b>PAID</b><br>Fee Desk</div>
      <div class="sig-box"><div class="sig-line">Authorized Cashier</div></div>
    </div>
  </div>
</body>
</html>
        """
    },

    # ── VARIANT 2: COMPACT / LIMITED 3 COLUMNS (QUICK COUNTER FORMAT) ──
    {
        "id": "receipt_current_v2_compact_3col",
        "title": "Current Template • Compact 3-Column Slip (Limited Columns)",
        "width": 840,
        "height": 780,
        "html": """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #ffffff; padding: 25px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; }
  .doc { border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 24px 28px; background: #ffffff; max-width: 780px; margin: 0 auto; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
  .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
  .title { font-size: 20px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
  .subtitle { font-size: 12px; font-weight: 700; color: #475569; margin-top: 2px; }
  .badge-wrap { text-align: center; margin: 10px 0 14px 0; }
  .badge { display: inline-block; padding: 3px 16px; background: #f8fafc; border: 1.5px solid #0f172a; border-radius: 20px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; color: #0f172a; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; font-size: 11.5px; margin-bottom: 16px; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .meta-item { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 2px; }
  .meta-lbl { font-weight: 700; color: #64748b; }
  .meta-val { font-weight: 800; color: #0f172a; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
  th { background: #f1f5f9; padding: 8px 12px; font-weight: 800; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #334155; }
  td { padding: 8px 12px; border: 1px solid #e2e8f0; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .font-mono { font-family: monospace; font-weight: 700; }

  .net-box { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #ecfdf5; border: 1.5px solid #10b981; border-radius: 8px; margin-bottom: 16px; }
  .net-lbl { font-size: 13px; font-weight: 800; color: #065f46; }
  .net-val { font-size: 20px; font-weight: 900; color: #047857; font-family: monospace; }
  .words-text { font-size: 11px; color: #475569; font-style: italic; margin-bottom: 24px; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 32px; }
  .sig-box { text-align: center; width: 180px; }
  .sig-line { border-top: 1.5px solid #64748b; padding-top: 5px; font-size: 11px; font-weight: 700; color: #334155; }
  .stamp { display: inline-block; width: 80px; height: 80px; border: 2.5px solid #10b981; border-radius: 50%; color: #10b981; font-size: 8px; font-weight: 800; text-align: center; padding-top: 18px; text-transform: uppercase; transform: rotate(-5deg); }
</style>
</head>
<body>
  <div class="doc">
    <div class="header">
      <div class="title">Bajrang Shikshan Sansthan</div>
      <div class="subtitle">Sec. Sch. Padu Khurd, Nagaur - 341021 (Raj.) | Fast Counter Slip</div>
    </div>

    <div class="badge-wrap">
      <span class="badge">Fee Payment Slip &bull; Student Copy (3-Column Fast Slip)</span>
    </div>

    <div class="meta-grid">
      <div class="meta-item"><span class="meta-lbl">Student Name:</span><span class="meta-val">Aryan Sharma</span></div>
      <div class="meta-item"><span class="meta-lbl">Receipt No:</span><span class="meta-val">BSS-REC-0412</span></div>
      <div class="meta-item"><span class="meta-lbl">Admission No:</span><span class="meta-val">ADM-2026-104</span></div>
      <div class="meta-item"><span class="meta-lbl">Date:</span><span class="meta-val">23 Oct 2026</span></div>
      <div class="meta-item"><span class="meta-lbl">Class & Section:</span><span class="meta-val">Class 10th - A</span></div>
      <div class="meta-item"><span class="meta-lbl">Payment Mode:</span><span class="meta-val">Cash</span></div>
    </div>

    <!-- STRICTLY 3 COLUMNS -->
    <table>
      <thead>
        <tr>
          <th class="text-center" style="width: 50px;">S.No</th>
          <th>Fee Particulars Head</th>
          <th class="text-right" style="width: 150px;">Amount Paid Now</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="text-center">1</td><td>Tuition Fees (Term 2 Installment)</td><td class="text-right font-mono">₹4,500.00</td></tr>
        <tr><td class="text-center">2</td><td>Computer Lab Practical Charge</td><td class="text-right font-mono">₹800.00</td></tr>
        <tr><td class="text-center">3</td><td>Term Examination & Papers Fee</td><td class="text-right font-mono">₹500.00</td></tr>
      </tbody>
    </table>

    <div class="net-box">
      <span class="net-lbl">Net Cash Received at Counter:</span>
      <span class="net-val">₹5,800.00</span>
    </div>

    <div class="words-text">Rupees in words: Five Thousand Eight Hundred Rupees Only.</div>

    <div class="sig-row">
      <div class="sig-box"><div class="sig-line">Depositor Signature</div></div>
      <div class="stamp">BSS<br>Padu Khurd<br><b>RECEIVED</b><br>Cash Desk</div>
      <div class="sig-box"><div class="sig-line">Cashier Signature</div></div>
    </div>
  </div>
</body>
</html>
        """
    },

    # ── VARIANT 3: STANDARD 4 COLUMNS (HEAD, TOTAL, PAID, REMAINING DUE) ──
    {
        "id": "receipt_current_v3_standard_4col",
        "title": "Current Template • Standard 4-Column Ledger (Due Balance)",
        "width": 860,
        "height": 840,
        "html": """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #ffffff; padding: 25px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; }
  .doc { border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 26px 30px; background: #ffffff; max-width: 800px; margin: 0 auto; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
  .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
  .title { font-size: 20px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
  .subtitle { font-size: 12px; font-weight: 700; color: #475569; margin-top: 2px; }
  .badge-wrap { text-align: center; margin: 10px 0 14px 0; }
  .badge { display: inline-block; padding: 3.5px 18px; background: #f8fafc; border: 1.5px solid #0f172a; border-radius: 20px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; color: #0f172a; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; font-size: 11.5px; margin-bottom: 16px; padding: 11px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .meta-item { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 2.5px; }
  .meta-lbl { font-weight: 700; color: #64748b; }
  .meta-val { font-weight: 800; color: #0f172a; }

  table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 16px; }
  th { background: #f1f5f9; padding: 8px 12px; font-weight: 800; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #334155; }
  td { padding: 8px 12px; border: 1px solid #e2e8f0; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .font-mono { font-family: monospace; font-weight: 700; }

  .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  .sum-card-paid { background: #ecfdf5; border: 1.5px solid #10b981; border-radius: 8px; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; }
  .sum-card-due { background: #fef2f2; border: 1.5px solid #ef4444; border-radius: 8px; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; }

  .words-text { font-size: 11px; color: #475569; font-style: italic; margin-bottom: 24px; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 32px; }
  .sig-box { text-align: center; width: 180px; }
  .sig-line { border-top: 1.5px solid #64748b; padding-top: 5px; font-size: 11px; font-weight: 700; color: #334155; }
  .stamp { display: inline-block; width: 80px; height: 80px; border: 2.5px solid #0284c7; border-radius: 50%; color: #0284c7; font-size: 8px; font-weight: 800; text-align: center; padding-top: 18px; text-transform: uppercase; transform: rotate(5deg); }
</style>
</head>
<body>
  <div class="doc">
    <div class="header">
      <div class="title">Bajrang Shikshan Sansthan</div>
      <div class="subtitle">Sec. Sch. Padu Khurd, Nagaur - 341021 (Raj.) | Accounts Office</div>
    </div>

    <div class="badge-wrap">
      <span class="badge">Fee Payment Receipt &bull; 4-Column Balance Ledger</span>
    </div>

    <div class="meta-grid">
      <div class="meta-item"><span class="meta-lbl">Student Name:</span><span class="meta-val">Aryan Sharma</span></div>
      <div class="meta-item"><span class="meta-lbl">Receipt Number:</span><span class="meta-val">BSS-REC-0412</span></div>
      <div class="meta-item"><span class="meta-lbl">Admission No:</span><span class="meta-val">ADM-2026-104</span></div>
      <div class="meta-item"><span class="meta-lbl">Payment Date:</span><span class="meta-val">23 Oct 2026</span></div>
      <div class="meta-item"><span class="meta-lbl">Class & Section:</span><span class="meta-val">Class 10th - A</span></div>
      <div class="meta-item"><span class="meta-lbl">Payment Mode:</span><span class="meta-val">Cash</span></div>
      <div class="meta-item"><span class="meta-lbl">Academic Session:</span><span class="meta-val">2026-2027</span></div>
      <div class="meta-item"><span class="meta-lbl">Next Due Date:</span><span class="meta-val font-mono">10 Jan 2027</span></div>
    </div>

    <!-- EXACT 4 COLUMNS -->
    <table>
      <thead>
        <tr>
          <th>Fee Head Particulars</th>
          <th class="text-right" style="width: 140px;">Total Annual Fee</th>
          <th class="text-right" style="width: 140px; color:#0284c7;">Paid Now</th>
          <th class="text-right" style="width: 140px; color:#dc2626;">Remaining Due</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Tuition Fees (Secondary Section)</td>
          <td class="text-right font-mono">₹18,000.00</td>
          <td class="text-right font-mono" style="color:#0284c7;">₹4,500.00</td>
          <td class="text-right font-mono" style="color:#dc2626;">₹1,500.00</td>
        </tr>
        <tr>
          <td>Computer & Digital Lab Fund</td>
          <td class="text-right font-mono">₹2,400.00</td>
          <td class="text-right font-mono" style="color:#0284c7;">₹800.00</td>
          <td class="text-right font-mono" style="color:#16a34a;">₹0.00</td>
        </tr>
        <tr>
          <td>Term Assessment & Exam Charge</td>
          <td class="text-right font-mono">₹1,500.00</td>
          <td class="text-right font-mono" style="color:#0284c7;">₹500.00</td>
          <td class="text-right font-mono" style="color:#16a34a;">₹0.00</td>
        </tr>
      </tbody>
    </table>

    <div class="summary-grid">
      <div class="sum-card-paid">
        <span style="font-size:12px; font-weight:800; color:#065f46;">Amount Paid In This Slip:</span>
        <span style="font-size:17px; font-weight:900; color:#047857; font-family:monospace;">₹5,800.00</span>
      </div>
      <div class="sum-card-due">
        <span style="font-size:12px; font-weight:800; color:#991b1b;">Net Balance Remaining Due:</span>
        <span style="font-size:17px; font-weight:900; color:#dc2626; font-family:monospace;">₹1,500.00</span>
      </div>
    </div>

    <div class="words-text">Amount in words: Five Thousand Eight Hundred Rupees Only.</div>

    <div class="sig-row">
      <div class="sig-box"><div class="sig-line">Depositor Signature</div></div>
      <div class="stamp">BSS<br>Padu Khurd<br><b>LEDGER</b><br>Updated</div>
      <div class="sig-box"><div class="sig-line">Authorized Cashier</div></div>
    </div>
  </div>
</body>
</html>
        """
    },

    # ── VARIANT 4: MINIMAL SUMMARY CARD (KAM DETAILS / HIGH-LEVEL) ──
    {
        "id": "receipt_current_v4_summary_minimal",
        "title": "Current Template • Minimal Summary Card (Kam Details)",
        "width": 820,
        "height": 720,
        "html": """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #ffffff; padding: 25px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; }
  .doc { border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 24px 28px; background: #ffffff; max-width: 740px; margin: 0 auto; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
  .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; }
  .title { font-size: 19px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
  .subtitle { font-size: 11.5px; font-weight: 700; color: #475569; margin-top: 1px; }

  .summary-banner { display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: #ffffff; border-radius: 8px; padding: 12px 18px; margin: 12px 0 16px 0; }
  .banner-left { font-size: 13px; font-weight: 800; letter-spacing: 0.5px; }
  .banner-right { font-size: 11px; background: #10b981; padding: 3px 12px; border-radius: 20px; font-weight: 800; text-transform: uppercase; }

  .meta-simple { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; font-size: 12px; margin-bottom: 16px; }
  .meta-col { display: flex; flex-direction: column; gap: 4px; }
  .meta-col span:first-child { color: #64748b; font-weight: 600; font-size: 10.5px; text-transform: uppercase; }
  .meta-col span:last-child { color: #0f172a; font-weight: 800; font-size: 12.5px; }

  .simple-list { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 16px; font-size: 12px; }
  .list-row { display: flex; justify-content: space-between; padding: 9px 14px; border-bottom: 1px solid #f1f5f9; }
  .list-row:nth-child(even) { background: #f8fafc; }
  .list-row:last-child { border-bottom: none; font-weight: 800; background: #f1f5f9; }

  .big-net { display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; background: #ecfdf5; border: 1.5px solid #10b981; border-radius: 8px; margin-bottom: 20px; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; }
  .sig-box { text-align: center; width: 160px; }
  .sig-line { border-top: 1.5px solid #64748b; padding-top: 5px; font-size: 10.5px; font-weight: 700; color: #334155; }
</style>
</head>
<body>
  <div class="doc">
    <div class="header">
      <div class="title">Bajrang Shikshan Sansthan</div>
      <div class="subtitle">Sec. Sch. Padu Khurd, Nagaur - 341021 (Raj.)</div>
    </div>

    <div class="summary-banner">
      <div class="banner-left">FEE PAYMENT SUMMARY RECEIPT</div>
      <div class="banner-right">PAID IN FULL</div>
    </div>

    <div class="meta-simple">
      <div class="meta-col"><span>Student Name</span><span>Aryan Sharma</span></div>
      <div class="meta-col"><span>Admission No</span><span>ADM-2026-104</span></div>
      <div class="meta-col"><span>Class</span><span>10th - A</span></div>
      <div class="meta-col"><span>Receipt No</span><span>BSS-REC-0412</span></div>
      <div class="meta-col"><span>Date</span><span>23 Oct 2026</span></div>
    </div>

    <!-- MINIMAL 2-ROW SUMMARY LIST -->
    <div class="simple-list">
      <div class="list-row"><span>Academic Tuition & Digital Learning Fees</span><span style="font-family:monospace; font-weight:700;">₹4,500.00</span></div>
      <div class="list-row"><span>Computer Science Lab Practice Fee</span><span style="font-family:monospace; font-weight:700;">₹800.00</span></div>
      <div class="list-row"><span>Quarterly Assessment & Examination Charge</span><span style="font-family:monospace; font-weight:700;">₹500.00</span></div>
      <div class="list-row"><span>Gross Total Fee Paid</span><span style="font-family:monospace; font-weight:800; color:#0f172a;">₹5,800.00</span></div>
    </div>

    <div class="big-net">
      <span style="font-size:13px; font-weight:800; color:#065f46;">Net Payment Received (Cash):</span>
      <span style="font-size:20px; font-weight:900; color:#047857; font-family:monospace;">₹5,800.00</span>
    </div>

    <div class="sig-row">
      <div class="sig-box"><div class="sig-line">Depositor Signature</div></div>
      <div style="font-size:10px; color:#64748b; font-style:italic;">Computer Verified Copy &bull; No physical seal required</div>
      <div class="sig-box"><div class="sig-line">Cashier Signature</div></div>
    </div>
  </div>
</body>
</html>
        """
    },

    # ── VARIANT 5: COMPREHENSIVE ANNUAL AUDIT LEDGER (EXTRA / MAXIMUM DETAILS) ──
    {
        "id": "receipt_current_v5_annual_audit_max",
        "title": "Current Template • Comprehensive Annual Audit Ledger (Max Details)",
        "width": 900,
        "height": 1050,
        "html": """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #ffffff; padding: 25px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #0f172a; }
  .doc { border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 26px 30px; background: #ffffff; max-width: 850px; margin: 0 auto; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
  .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
  .title { font-size: 21px; font-weight: 900; text-transform: uppercase; color: #0f172a; }
  .subtitle { font-size: 12px; font-weight: 700; color: #334155; margin-top: 2px; }
  .address { font-size: 10.5px; color: #64748b; margin-top: 1px; }
  .badge-wrap { text-align: center; margin: 10px 0 14px 0; }
  .badge { display: inline-block; padding: 3.5px 18px; background: #f8fafc; border: 1.5px solid #0f172a; border-radius: 20px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; color: #0f172a; }

  .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 16px; font-size: 11px; margin-bottom: 16px; padding: 11px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .meta-item { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 2px; }
  .meta-lbl { font-weight: 700; color: #64748b; }
  .meta-val { font-weight: 800; color: #0f172a; }

  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 14px; }
  th { background: #f1f5f9; padding: 7px 8px; font-weight: 800; border: 1px solid #cbd5e1; font-size: 10px; text-transform: uppercase; color: #334155; }
  td { padding: 6.5px 8px; border: 1px solid #e2e8f0; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .font-mono { font-family: monospace; font-weight: 700; font-size: 11.5px; }

  .history-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 14px; font-size: 10.5px; margin-bottom: 12px; color: #475569; }
  .history-title { font-weight: 800; color: #0f172a; margin-bottom: 4px; text-transform: uppercase; font-size: 10px; }

  .concession-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 14px; font-size: 11px; margin-bottom: 12px; }
  .concession-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding: 2px 0; color: #475569; }
  .net-row { display: flex; justify-content: space-between; align-items: center; padding-top: 5px; font-weight: 900; color: #0f172a; font-size: 12.5px; }
  .net-val { font-size: 18px; color: #16a34a; font-family: monospace; }

  .audit-bar { display: flex; justify-content: space-between; font-size: 10px; color: #64748b; padding: 5px 0; border-top: 1px dashed #cbd5e1; margin-bottom: 16px; }

  .sig-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; }
  .sig-box { text-align: center; width: 170px; }
  .sig-line { border-top: 1.5px solid #64748b; padding-top: 4px; font-size: 10.5px; font-weight: 700; color: #334155; }
  .stamp { display: inline-block; width: 80px; height: 80px; border: 2.5px solid #4338ca; border-radius: 50%; color: #4338ca; font-size: 8px; font-weight: 800; text-align: center; padding-top: 16px; text-transform: uppercase; transform: rotate(-5deg); }
</style>
</head>
<body>
  <div class="doc">
    <div class="header">
      <div class="title">Bajrang Shikshan Sansthan</div>
      <div class="subtitle">Sec. Sch. Padu Khurd, Nagaur - 341021 (Raj.)</div>
      <div class="address">Ph: 01582-264567 | Reg: RJ-NAG-2005-081 | CBSE/RBSE Board Code: 1230045</div>
    </div>

    <div class="badge-wrap">
      <span class="badge">Comprehensive Annual Fee Audit Ledger &bull; Master Accounts Copy</span>
    </div>

    <div class="meta-grid">
      <div class="meta-item"><span class="meta-lbl">Student Name:</span><span class="meta-val">Aryan Sharma</span></div>
      <div class="meta-item"><span class="meta-lbl">Receipt No:</span><span class="meta-val" style="color:#d2232a;">BSS-REC-2026-0412</span></div>
      <div class="meta-item"><span class="meta-lbl">Date:</span><span class="meta-val">23 Oct 2026</span></div>
      
      <div class="meta-item"><span class="meta-lbl">Admission No:</span><span class="meta-val">ADM-2026-104</span></div>
      <div class="meta-item"><span class="meta-lbl">Father Name:</span><span class="meta-val">Suresh Kumar Sharma</span></div>
      <div class="meta-item"><span class="meta-lbl">Payment Mode:</span><span class="meta-val">Cash (Counter #1)</span></div>

      <div class="meta-item"><span class="meta-lbl">Class & Section:</span><span class="meta-val">Class 10th - A</span></div>
      <div class="meta-item"><span class="meta-lbl">Guardian Mobile:</span><span class="meta-val">9876543210</span></div>
      <div class="meta-item"><span class="meta-lbl">Academic Session:</span><span class="meta-val">2026-2027</span></div>
    </div>

    <!-- 7 FEE HEADS WITH FULL ANNUAL LEDGER COLUMNS -->
    <table>
      <thead>
        <tr>
          <th>Fee Head Category</th>
          <th class="text-center" style="width: 80px;">Frequency</th>
          <th class="text-right" style="width: 90px;">Annual Fee</th>
          <th class="text-right" style="width: 90px;">Paid Before</th>
          <th class="text-right" style="width: 90px; color:#0284c7;">Paid Now</th>
          <th class="text-right" style="width: 90px;">Total Paid</th>
          <th class="text-right" style="width: 90px; color:#dc2626;">Outstanding</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Tuition Fees (Regular Classroom Instruction)</td>
          <td class="text-center">Monthly</td>
          <td class="text-right font-mono">₹18,000.00</td>
          <td class="text-right font-mono">₹12,000.00</td>
          <td class="text-right font-mono" style="color:#0284c7;">₹4,500.00</td>
          <td class="text-right font-mono">₹16,500.00</td>
          <td class="text-right font-mono" style="color:#dc2626;">₹1,500.00</td>
        </tr>
        <tr>
          <td>Computer Lab & Smart Class Usage</td>
          <td class="text-center">Monthly</td>
          <td class="text-right font-mono">₹2,400.00</td>
          <td class="text-right font-mono">₹1,600.00</td>
          <td class="text-right font-mono" style="color:#0284c7;">₹800.00</td>
          <td class="text-right font-mono">₹2,400.00</td>
          <td class="text-right font-mono" style="color:#16a34a;">₹0.00</td>
        </tr>
        <tr>
          <td>Examination, Papers & Report Card Fund</td>
          <td class="text-center">Quarterly</td>
          <td class="text-right font-mono">₹1,500.00</td>
          <td class="text-right font-mono">₹1,000.00</td>
          <td class="text-right font-mono" style="color:#0284c7;">₹500.00</td>
          <td class="text-right font-mono">₹1,500.00</td>
          <td class="text-right font-mono" style="color:#16a34a;">₹0.00</td>
        </tr>
        <tr>
          <td>Library Book Bank & Reading Room Service</td>
          <td class="text-center">Yearly</td>
          <td class="text-right font-mono">₹600.00</td>
          <td class="text-right font-mono">₹600.00</td>
          <td class="text-right font-mono" style="color:#0284c7;">₹0.00</td>
          <td class="text-right font-mono">₹600.00</td>
          <td class="text-right font-mono" style="color:#16a34a;">₹0.00</td>
        </tr>
        <tr>
          <td>Sports Meet, Games & Physical Education</td>
          <td class="text-center">Yearly</td>
          <td class="text-right font-mono">₹500.00</td>
          <td class="text-right font-mono">₹500.00</td>
          <td class="text-right font-mono" style="color:#0284c7;">₹0.00</td>
          <td class="text-right font-mono">₹500.00</td>
          <td class="text-right font-mono" style="color:#16a34a;">₹0.00</td>
        </tr>
        <tr style="background:#f8fafc; font-weight:800;">
          <td>Total Academic Billing Summary</td>
          <td class="text-center">—</td>
          <td class="text-right font-mono">₹23,000.00</td>
          <td class="text-right font-mono">₹15,700.00</td>
          <td class="text-right font-mono" style="color:#0284c7;">₹5,800.00</td>
          <td class="text-right font-mono">₹21,500.00</td>
          <td class="text-right font-mono" style="color:#dc2626;">₹1,500.00</td>
        </tr>
      </tbody>
    </table>

    <!-- PRIOR INSTALLMENTS AUDIT TRAIL -->
    <div class="history-box">
      <div class="history-title">Prior Installment Audit Trail (Academic Year 2026-2027):</div>
      <div>&bull; 10 Apr 2026: <strong>₹6,200.00</strong> (Receipt #BSS-REC-0014) &bull; 14 Jul 2026: <strong>₹5,500.00</strong> (Receipt #BSS-REC-0198) &bull; 08 Sep 2026: <strong>₹4,000.00</strong> (Receipt #BSS-REC-0284)</div>
    </div>

    <div class="concession-box">
      <div class="concession-row"><span>Approved Merit Scholarship Concession:</span><span class="font-mono text-emerald-600">- ₹500.00</span></div>
      <div class="concession-row"><span>Late Fee / Overdue Penalty:</span><span class="font-mono text-rose-600">+ ₹0.00</span></div>
      <div class="net-row">
        <span>Current Transaction Payment Total:</span>
        <span class="net-val">₹5,800.00</span>
      </div>
    </div>

    <div class="audit-bar">
      <span>Collected By: <strong>Ramesh Kumar (Authorized Cashier)</strong></span>
      <span>System Audit Ref: <strong>AUD-BSS-2026-0412-OK</strong></span>
      <span>Ledger Status: <strong>Verified & Locked</strong></span>
    </div>

    <div class="sig-row">
      <div class="sig-box"><div class="sig-line">Depositor Signature</div></div>
      <div class="sig-box"><div class="sig-line">Accounts Clerk</div></div>
      <div class="stamp">BSS<br>Padu Khurd<br><b>AUDITED</b><br>Master Ledger</div>
      <div class="sig-box"><div class="sig-line">Principal / Secretary</div></div>
    </div>
  </div>
</body>
</html>
        """
    }
]

for r in current_variants:
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
    shutil.copyfile(out_artifact, out_public)
    print(f"Generated & copied {r['id']}: True")

print("All 5 current project receipt variants successfully generated!")
