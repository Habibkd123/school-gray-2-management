// "use client";

// import React, { useState, useEffect } from "react";
// import { Printer, ArrowLeft } from "lucide-react";
// import { getAuthHeaders } from "@/lib/utils/session";
// import { PrintService } from "@/app/lib/print-service";

// interface PageProps {
//   params: Promise<{ id: string }>;
// }

// interface SalarySlipData {
//   _id: string;
//   receipt_number: string;
//   payment_date: string;
//   salary_period: string;
//   monthly_salary: number;
//   working_days: number;
//   present_days: number;
//   absent_days: number;
//   payable_amount?: number;
//   bonus?: number;
//   deduction?: number;
//   final_salary: number;
//   calculation_type?: string;
//   remarks?: string;
//   teacher_id?: {
//     name: string;
//     employee_id: string;
//     designation?: string;
//     department?: string;
//   };
// }

// export default function SalaryPrintPage({ params }: PageProps) {
//   const resolvedParams = React.use(params);
//   const id = resolvedParams.id;

//   const [slip, setSlip] = useState<SalarySlipData | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   // Fetch slip data
//   useEffect(() => {
//     async function fetchSlip() {
//       try {
//         const res = await fetch(`/api/salaries/${id}`, {
//           headers: getAuthHeaders(),
//         });
//         const data = await res.json();
//         if (res.ok && data.success) {
//           setSlip(data.data);
//         } else {
//           setError(data.message || "Failed to load salary slip.");
//         }
//       } catch (err) {
//         setError("An error occurred while fetching the salary slip.");
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchSlip();
//   }, [id]);

//   // Auto-print once data is ready — uses PrintService to apply correct print path isolation
//   useEffect(() => {
//     if (slip && !loading && !error) {
//       const timer = setTimeout(() => {
//         PrintService.print("printable-payslip", { pageSize: "A4" });
//       }, 600);
//       return () => clearTimeout(timer);
//     }
//   }, [slip, loading, error]);

//   // Helper formatting functions
//   const money = (val: number) => "₹ " + (val || 0).toLocaleString("en-IN");

//   const fmtDate = (d: string) => {
//     if (!d) return "—";
//     const date = new Date(d);
//     return isNaN(date.getTime()) ? d : date.toLocaleDateString("en-IN", {
//       day: "2-digit",
//       month: "short",
//       year: "numeric"
//     });
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-slate-50">
//         <div className="flex flex-col items-center gap-3">
//           <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
//           <p className="text-slate-500 text-sm font-semibold">Loading salary slip details...</p>
//         </div>
//       </div>
//     );
//   }

//   if (error || !slip) {
//     return (
//       <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
//         <div className="bg-white shadow-xl rounded-2xl p-8 max-w-md w-full text-center border border-gray-200">
//           <div className="text-rose-500 text-5xl mb-4">⚠️</div>
//           <h2 className="text-lg font-bold text-slate-800 mb-2">Slip Not Found</h2>
//           <p className="text-slate-500 text-xs mb-6">{error || "Could not retrieve the requested salary slip."}</p>
//           <button
//             onClick={() => window.close()}
//             className="w-full px-4 py-2.5 bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer"
//           >
//             Close Tab
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <>
//       {/*
//         Inline scoped print styles — override any global @media print rules
//         that target .flex / .w-full / .min-h-screen to avoid stripping layout.
//         This page is a dedicated print route so no PrintService isolation needed.
//       */}
//       <style>{`
//         @media print {
//           /* Hide the action bar on print */
//           #salary-print-actions { display: none !important; }

//           /* Reset the outer wrapper so it doesn't collapse */
//           #salary-print-outer {
//             display: block !important;
//             padding: 0 !important;
//             margin: 0 !important;
//             background: white !important;
//             min-height: initial !important;
//           }

//           /* Ensure the payslip renders with content */
//           #printable-payslip {
//             display: block !important;
//             width: 100% !important;
//             max-width: 100% !important;
//             padding: 24px !important;
//             margin: 0 auto !important;
//             box-shadow: none !important;
//             border: none !important;
//             border-radius: 0 !important;
//             background: white !important;
//             color: #0f172a !important;
//           }

//           /* Force all children visible */
//           #printable-payslip * {
//             color: #0f172a !important;
//             visibility: visible !important;
//           }

//           /* Preserve semantic colors */
//           #printable-payslip .text-emerald-600 { color: #059669 !important; }
//           #printable-payslip .text-rose-500    { color: #e11d48 !important; }

//           /* Table layout */
//           #printable-payslip table {
//             width: 100% !important;
//             border-collapse: collapse !important;
//           }
//         }
//       `}</style>

//       <div
//         id="salary-print-outer"
//         style={{ minHeight: "100vh", background: "#f1f5f9", padding: "32px 0", display: "flex", flexDirection: "column", alignItems: "center" }}
//       >
//         {/* Action Navigation Header – hidden during actual print via #salary-print-actions */}
//         <div
//           id="salary-print-actions"
//           style={{ width: "100%", maxWidth: "896px", background: "white", borderRadius: "12px", padding: "16px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
//         >
//           <button
//             onClick={() => window.close()}
//             style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: "700", color: "#475569", cursor: "pointer", background: "none", border: "none" }}
//           >
//             <ArrowLeft style={{ width: "16px", height: "16px" }} /> Close Print
//           </button>
//           <button
//             onClick={() => PrintService.print("printable-payslip", { pageSize: "A4" })}
//             style={{ padding: "8px 16px", background: "#1e3a5f", color: "white", fontSize: "12px", fontWeight: "700", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", border: "none" }}
//           >
//             <Printer style={{ width: "16px", height: "16px" }} /> Print Document
//           </button>
//         </div>

//         {/* Main Printable Document */}
//         <div
//           id="printable-payslip"
//           style={{ width: "100%", maxWidth: "896px", background: "white", borderRadius: "16px", padding: "48px", boxShadow: "0 20px 60px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0", fontFamily: "Georgia, serif", color: "#0f172a" }}
//         >
//           {/* School Header */}
//           <div style={{ textAlign: "center", marginBottom: "32px", borderBottom: "2px solid #1e293b", paddingBottom: "20px" }}>
//             <h1 style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px 0", fontFamily: "Georgia, serif" }}>
//               My School Life
//             </h1>
//             <p style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic", margin: "0 0 16px 0", fontFamily: "sans-serif" }}>
//               Professional School ERP Document Center
//             </p>
//             <div style={{ display: "inline-block", background: "#1e293b", color: "white", padding: "6px 20px", borderRadius: "999px", fontWeight: "700", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "sans-serif" }}>
//               Salary Disbursement Slip
//             </div>
//           </div>

//           {/* Teacher Details Grid */}
//           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 32px", marginBottom: "32px", fontSize: "12px", fontFamily: "sans-serif", color: "#334155" }}>
//             {[
//               ["Teacher Name:", slip.teacher_id?.name || "N/A"],
//               ["Employee ID:", slip.teacher_id?.employee_id || "N/A"],
//               ["Designation:", slip.teacher_id?.designation || "Teacher"],
//               ["Calculation Type:", slip.calculation_type || "Monthly"],
//             ].map(([label, value]) => (
//               <div key={label} style={{ display: "flex", borderBottom: "1px dashed #e2e8f0", paddingBottom: "4px" }}>
//                 <span style={{ fontWeight: "700", color: "#64748b", width: "128px", flexShrink: 0 }}>{label}</span>
//                 <span style={{ fontWeight: "700", color: "#0f172a" }}>{value}</span>
//               </div>
//             ))}
//             <div style={{ display: "flex", borderBottom: "1px dashed #e2e8f0", paddingBottom: "4px", gridColumn: "1 / -1" }}>
//               <span style={{ fontWeight: "700", color: "#64748b", width: "128px", flexShrink: 0 }}>Salary Period:</span>
//               <span style={{ fontWeight: "700", color: "#0f172a" }}>{slip.salary_period || "—"}</span>
//             </div>
//             <div style={{ display: "flex", borderBottom: "1px dashed #e2e8f0", paddingBottom: "4px" }}>
//               <span style={{ fontWeight: "700", color: "#64748b", width: "128px", flexShrink: 0 }}>Receipt Number:</span>
//               <span style={{ fontWeight: "700", color: "#0f172a", fontFamily: "monospace" }}>{slip.receipt_number}</span>
//             </div>
//             <div style={{ display: "flex", borderBottom: "1px dashed #e2e8f0", paddingBottom: "4px" }}>
//               <span style={{ fontWeight: "700", color: "#64748b", width: "128px", flexShrink: 0 }}>Payment Date:</span>
//               <span style={{ fontWeight: "700", color: "#0f172a" }}>{fmtDate(slip.payment_date)}</span>
//             </div>
//           </div>

//           {/* Attendance Summary */}
//           <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", marginBottom: "24px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px", textAlign: "center", fontFamily: "sans-serif" }}>
//             {[
//               { label: "Working Days", value: `${slip.working_days} days`, color: "#0f172a" },
//               { label: "Present Days", value: `${slip.present_days} days`, color: "#059669" },
//               { label: "Absent Days", value: `${slip.absent_days} days`, color: "#e11d48" },
//               { label: "Payable Days", value: `${slip.present_days} days`, color: "#059669" },
//               { label: "Disbursed Status", value: "Paid", color: "#059669" },
//             ].map(({ label, value, color }) => (
//               <div key={label}>
//                 <span style={{ fontSize: "9px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>{label}</span>
//                 <span style={{ fontSize: "14px", fontWeight: "700", color, marginTop: "4px", display: "block" }}>{value}</span>
//               </div>
//             ))}
//           </div>

//           {/* Ledger Table */}
//           <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden", marginBottom: "24px", fontFamily: "sans-serif" }}>
//             <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
//               <thead>
//                 <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
//                   <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: "700", color: "#334155" }}>Salary Component Description</th>
//                   <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: "700", color: "#334155" }}>Amount</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {[
//                   { label: "Monthly Contract Salary", value: money(slip.monthly_salary), color: "#0f172a" },
//                   { label: "Daily Salary Rate (Monthly ÷ 30)", value: money(Math.round((slip.monthly_salary / 30) * 100) / 100), color: "#0f172a" },
//                   { label: `Payable Days (Present Days)`, value: `${slip.present_days} days`, color: "#0f172a" },
//                 ].map(({ label, value, color }, i) => (
//                   <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
//                     <td style={{ padding: "12px 16px", color: "#334155" }}>{label}</td>
//                     <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "700", color, fontFamily: "monospace" }}>{value}</td>
//                   </tr>
//                 ))}
//                 <tr style={{ borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
//                   <td style={{ padding: "12px 16px", fontWeight: "700", color: "#334155" }}>Payable Amount (Auto Calculated)</td>
//                   <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "700", color: "#0f172a", fontFamily: "monospace" }}>
//                     {money(slip.payable_amount !== undefined ? slip.payable_amount : (slip.final_salary - (slip.bonus || 0) + (slip.deduction || 0)))}
//                   </td>
//                 </tr>
//                 <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
//                   <td style={{ padding: "12px 16px", fontWeight: "700", color: "#059669" }}>Bonus (+)</td>
//                   <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "700", color: "#059669", fontFamily: "monospace" }}>+{money(slip.bonus || 0)}</td>
//                 </tr>
//                 <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
//                   <td style={{ padding: "12px 16px", fontWeight: "700", color: "#e11d48" }}>Deduction (-)</td>
//                   <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "700", color: "#e11d48", fontFamily: "monospace" }}>-{money(slip.deduction || 0)}</td>
//                 </tr>
//                 <tr style={{ background: "#f1f5f9", borderTop: "1px solid #e2e8f0" }}>
//                   <td style={{ padding: "12px 16px", fontWeight: "700", color: "#0f172a" }}>Final Salary Paid</td>
//                   <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "900", color: "#1e3a5f", fontFamily: "monospace", fontSize: "14px" }}>{money(slip.final_salary)}</td>
//                 </tr>
//                 {slip.remarks && (
//                   <tr>
//                     <td colSpan={2} style={{ padding: "12px 16px", color: "#64748b", fontStyle: "italic" }}>Remarks: {slip.remarks}</td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>

//           {/* Summary Bar */}
//           <div style={{ background: "#1e293b", color: "white", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "48px", fontFamily: "sans-serif", fontSize: "11px" }}>
//             <div>
//               <span style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", letterSpacing: "0.05em" }}>Payable Amount</span>
//               <div style={{ fontWeight: "700", fontFamily: "monospace", marginTop: "2px" }}>
//                 {money(slip.payable_amount !== undefined ? slip.payable_amount : (slip.final_salary - (slip.bonus || 0) + (slip.deduction || 0)))}
//               </div>
//             </div>
//             <div style={{ width: "1px", height: "32px", background: "#334155" }} />
//             <div>
//               <span style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "700", color: "#34d399", letterSpacing: "0.05em" }}>Bonus</span>
//               <div style={{ fontWeight: "700", fontFamily: "monospace", color: "#34d399", marginTop: "2px" }}>+{money(slip.bonus || 0)}</div>
//             </div>
//             <div style={{ width: "1px", height: "32px", background: "#334155" }} />
//             <div>
//               <span style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "700", color: "#f87171", letterSpacing: "0.05em" }}>Deduction</span>
//               <div style={{ fontWeight: "700", fontFamily: "monospace", color: "#f87171", marginTop: "2px" }}>-{money(slip.deduction || 0)}</div>
//             </div>
//             <div style={{ width: "1px", height: "32px", background: "#334155" }} />
//             <div style={{ textAlign: "right" }}>
//               <span style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "700", color: "#34d399", letterSpacing: "0.05em" }}>Final Paid</span>
//               <div style={{ fontSize: "16px", fontWeight: "900", color: "#34d399", fontFamily: "monospace", marginTop: "2px" }}>{money(slip.final_salary)}</div>
//             </div>
//           </div>

//           {/* Signatures */}
//           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: "32px", marginTop: "64px", fontFamily: "sans-serif", fontSize: "12px", fontWeight: "700", color: "#0f172a" }}>
//             {["Prepared By", "Employee Signature", "Authorized Signature"].map((label) => (
//               <div key={label} style={{ textAlign: "center", width: "144px" }}>
//                 <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "6px" }}>{label}</div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }


"use client";

import React, { useState, useEffect, useRef } from "react";
import { Printer, ArrowLeft } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils/session";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface SalarySlipData {
  _id: string;
  receipt_number: string;
  payment_date: string;
  salary_period: string;
  monthly_salary: number;
  working_days: number;
  present_days: number;
  absent_days: number;
  payable_amount?: number;
  bonus?: number;
  deduction?: number;
  final_salary: number;
  calculation_type?: string;
  remarks?: string;
  teacher_id?: {
    name: string;
    employee_id: string;
    designation?: string;
    department?: string;
  };
}

export default function SalaryPrintPage({ params }: PageProps) {
  const resolvedParams = React.use(params);
  const id = resolvedParams.id;

  const [slip, setSlip] = useState<SalarySlipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printableRef = useRef<HTMLDivElement>(null);

  // Fetch slip data
  useEffect(() => {
    async function fetchSlip() {
      try {
        const res = await fetch(`/api/salaries/${id}`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setSlip(data.data);
        } else {
          setError(data.message || "Failed to load salary slip.");
        }
      } catch (err) {
        setError("An error occurred while fetching the salary slip.");
      } finally {
        setLoading(false);
      }
    }
    fetchSlip();
  }, [id]);

  // ---- DEDICATED PRINT FUNCTION (self-contained, no external PrintService) ----
  const printPayslip = () => {
    if (!printableRef.current) return;

    // Remove any leftover iframe from a previous print
    const existing = document.getElementById("salary-print-frame");
    if (existing) existing.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "salary-print-frame";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Salary Slip - ${slip?.receipt_number ?? ""}</title>
          <meta charset="utf-8" />
          <style>
            @page { size: A4; margin: 12mm; }
            * { box-sizing: border-box; }
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              font-family: Georgia, serif;
              color: #0f172a;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            table { width: 100%; border-collapse: collapse; }
          </style>
        </head>
        <body>${printableRef.current.outerHTML}</body>
      </html>
    `);
    doc.close();

    // Wait for iframe to fully load before printing
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        // Cleanup after print dialog is handled
        setTimeout(() => {
          iframe.remove();
        }, 1000);
      }, 200);
    };
  };

  // Auto-print once data is ready
  useEffect(() => {
    if (slip && !loading && !error) {
      const timer = setTimeout(() => {
        printPayslip();
      }, 600);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slip, loading, error]);

  // Helper formatting functions
  const money = (val: number) => "₹ " + (val || 0).toLocaleString("en-IN");

  const fmtDate = (d: string) => {
    if (!d) return "—";
    const date = new Date(d);
    return isNaN(date.getTime()) ? d : date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-semibold">Loading salary slip details...</p>
        </div>
      </div>
    );
  }

  if (error || !slip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="bg-white shadow-xl rounded-2xl p-8 max-w-md w-full text-center border border-gray-200">
          <div className="text-rose-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Slip Not Found</h2>
          <p className="text-slate-500 text-xs mb-6">{error || "Could not retrieve the requested salary slip."}</p>
          <button
            onClick={() => window.close()}
            className="w-full px-4 py-2.5 bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer"
          >
            Close Tab
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="salary-print-outer"
      style={{ minHeight: "100vh", background: "#f1f5f9", padding: "32px 0", display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      {/* Action Navigation Header */}
      <div
        id="salary-print-actions"
        style={{ width: "100%", maxWidth: "896px", background: "white", borderRadius: "12px", padding: "16px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
      >
        <button
          onClick={() => window.close()}
          style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: "700", color: "#475569", cursor: "pointer", background: "none", border: "none" }}
        >
          <ArrowLeft style={{ width: "16px", height: "16px" }} /> Close Print
        </button>
        <button
          onClick={printPayslip}
          style={{ padding: "8px 16px", background: "#1e3a5f", color: "white", fontSize: "12px", fontWeight: "700", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", border: "none" }}
        >
          <Printer style={{ width: "16px", height: "16px" }} /> Print Document
        </button>
      </div>

      {/* Main Printable Document */}
      <div
        id="printable-payslip"
        ref={printableRef}
        style={{ width: "100%", maxWidth: "896px", background: "white", borderRadius: "16px", padding: "48px", boxShadow: "0 20px 60px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0", fontFamily: "Georgia, serif", color: "#0f172a" }}
      >
        {/* School Header */}
        <div style={{ textAlign: "center", marginBottom: "32px", borderBottom: "2px solid #1e293b", paddingBottom: "20px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px 0", fontFamily: "Georgia, serif" }}>
            My School Life
          </h1>
          <p style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic", margin: "0 0 16px 0", fontFamily: "sans-serif" }}>
            Professional School ERP Document Center
          </p>
          <div style={{ display: "inline-block", background: "#1e293b", color: "white", padding: "6px 20px", borderRadius: "999px", fontWeight: "700", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "sans-serif" }}>
            Salary Disbursement Slip
          </div>
        </div>

        {/* Teacher Details Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 32px", marginBottom: "32px", fontSize: "12px", fontFamily: "sans-serif", color: "#334155" }}>
          {[
            ["Teacher Name:", slip.teacher_id?.name || "N/A"],
            ["Employee ID:", slip.teacher_id?.employee_id || "N/A"],
            ["Designation:", slip.teacher_id?.designation || "Teacher"],
            ["Calculation Type:", slip.calculation_type || "Monthly"],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", borderBottom: "1px dashed #e2e8f0", paddingBottom: "4px" }}>
              <span style={{ fontWeight: "700", color: "#64748b", width: "128px", flexShrink: 0 }}>{label}</span>
              <span style={{ fontWeight: "700", color: "#0f172a" }}>{value}</span>
            </div>
          ))}
          <div style={{ display: "flex", borderBottom: "1px dashed #e2e8f0", paddingBottom: "4px", gridColumn: "1 / -1" }}>
            <span style={{ fontWeight: "700", color: "#64748b", width: "128px", flexShrink: 0 }}>Salary Period:</span>
            <span style={{ fontWeight: "700", color: "#0f172a" }}>{slip.salary_period || "—"}</span>
          </div>
          <div style={{ display: "flex", borderBottom: "1px dashed #e2e8f0", paddingBottom: "4px" }}>
            <span style={{ fontWeight: "700", color: "#64748b", width: "128px", flexShrink: 0 }}>Receipt Number:</span>
            <span style={{ fontWeight: "700", color: "#0f172a", fontFamily: "monospace" }}>{slip.receipt_number}</span>
          </div>
          <div style={{ display: "flex", borderBottom: "1px dashed #e2e8f0", paddingBottom: "4px" }}>
            <span style={{ fontWeight: "700", color: "#64748b", width: "128px", flexShrink: 0 }}>Payment Date:</span>
            <span style={{ fontWeight: "700", color: "#0f172a" }}>{fmtDate(slip.payment_date)}</span>
          </div>
        </div>

        {/* Attendance Summary */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", marginBottom: "24px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px", textAlign: "center", fontFamily: "sans-serif" }}>
          {[
            { label: "Working Days", value: `${slip.working_days} days`, color: "#0f172a" },
            { label: "Present Days", value: `${slip.present_days} days`, color: "#059669" },
            { label: "Absent Days", value: `${slip.absent_days} days`, color: "#e11d48" },
            { label: "Payable Days", value: `${slip.present_days} days`, color: "#059669" },
            { label: "Disbursed Status", value: "Paid", color: "#059669" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <span style={{ fontSize: "9px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>{label}</span>
              <span style={{ fontSize: "14px", fontWeight: "700", color, marginTop: "4px", display: "block" }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Ledger Table */}
        <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden", marginBottom: "24px", fontFamily: "sans-serif" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: "700", color: "#334155" }}>Salary Component Description</th>
                <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: "700", color: "#334155" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Monthly Contract Salary", value: money(slip.monthly_salary), color: "#0f172a" },
                { label: "Daily Salary Rate (Monthly ÷ 30)", value: money(Math.round((slip.monthly_salary / 30) * 100) / 100), color: "#0f172a" },
                { label: `Payable Days (Present Days)`, value: `${slip.present_days} days`, color: "#0f172a" },
              ].map(({ label, value, color }, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 16px", color: "#334155" }}>{label}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "700", color, fontFamily: "monospace" }}>{value}</td>
                </tr>
              ))}
              <tr style={{ borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                <td style={{ padding: "12px 16px", fontWeight: "700", color: "#334155" }}>Payable Amount (Auto Calculated)</td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "700", color: "#0f172a", fontFamily: "monospace" }}>
                  {money(slip.payable_amount !== undefined ? slip.payable_amount : (slip.final_salary - (slip.bonus || 0) + (slip.deduction || 0)))}
                </td>
              </tr>
              <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "12px 16px", fontWeight: "700", color: "#059669" }}>Bonus (+)</td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "700", color: "#059669", fontFamily: "monospace" }}>+{money(slip.bonus || 0)}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "12px 16px", fontWeight: "700", color: "#e11d48" }}>Deduction (-)</td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "700", color: "#e11d48", fontFamily: "monospace" }}>-{money(slip.deduction || 0)}</td>
              </tr>
              <tr style={{ background: "#f1f5f9", borderTop: "1px solid #e2e8f0" }}>
                <td style={{ padding: "12px 16px", fontWeight: "700", color: "#0f172a" }}>Final Salary Paid</td>
                <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "900", color: "#1e3a5f", fontFamily: "monospace", fontSize: "14px" }}>{money(slip.final_salary)}</td>
              </tr>
              {slip.remarks && (
                <tr>
                  <td colSpan={2} style={{ padding: "12px 16px", color: "#64748b", fontStyle: "italic" }}>Remarks: {slip.remarks}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Bar */}
        <div style={{ background: "#1e293b", color: "white", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "48px", fontFamily: "sans-serif", fontSize: "11px" }}>
          <div>
            <span style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "700", color: "#94a3b8", letterSpacing: "0.05em" }}>Payable Amount</span>
            <div style={{ fontWeight: "700", fontFamily: "monospace", marginTop: "2px" }}>
              {money(slip.payable_amount !== undefined ? slip.payable_amount : (slip.final_salary - (slip.bonus || 0) + (slip.deduction || 0)))}
            </div>
          </div>
          <div style={{ width: "1px", height: "32px", background: "#334155" }} />
          <div>
            <span style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "700", color: "#34d399", letterSpacing: "0.05em" }}>Bonus</span>
            <div style={{ fontWeight: "700", fontFamily: "monospace", color: "#34d399", marginTop: "2px" }}>+{money(slip.bonus || 0)}</div>
          </div>
          <div style={{ width: "1px", height: "32px", background: "#334155" }} />
          <div>
            <span style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "700", color: "#f87171", letterSpacing: "0.05em" }}>Deduction</span>
            <div style={{ fontWeight: "700", fontFamily: "monospace", color: "#f87171", marginTop: "2px" }}>-{money(slip.deduction || 0)}</div>
          </div>
          <div style={{ width: "1px", height: "32px", background: "#334155" }} />
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "700", color: "#34d399", letterSpacing: "0.05em" }}>Final Paid</span>
            <div style={{ fontSize: "16px", fontWeight: "900", color: "#34d399", fontFamily: "monospace", marginTop: "2px" }}>{money(slip.final_salary)}</div>
          </div>
        </div>

        {/* Signatures */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: "32px", marginTop: "64px", fontFamily: "sans-serif", fontSize: "12px", fontWeight: "700", color: "#0f172a" }}>
          {["Prepared By", "Employee Signature", "Authorized Signature"].map((label) => (
            <div key={label} style={{ textAlign: "center", width: "144px" }}>
              <div style={{ borderTop: "1px solid #94a3b8", paddingTop: "6px" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}