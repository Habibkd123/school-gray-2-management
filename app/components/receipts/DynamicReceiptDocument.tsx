"use client";

import React from "react";
import { Scissors } from "lucide-react";
import {
  ReceiptConfig,
  ReceiptData,
  ReceiptItemData,
  DEFAULT_RECEIPT_CONFIG,
} from "@/lib/types/receipt-builder";
import { numberToWords } from "@/lib/utils/variable-resolver";

export interface DynamicReceiptSchoolInfo {
  name?: string | null;
  subtitle?: string | null;
  logo_url?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface DynamicReceiptDocumentProps {
  config?: ReceiptConfig;
  schoolInfo?: DynamicReceiptSchoolInfo;
  receiptData: ReceiptData;
  targetId?: string;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  forcedCopiesCount?: number; // overrides config.layout_mode if specified (e.g. from modal options)
  pageMode?: "single" | "separate";
}

/**
 * ─── DynamicReceiptDocument ───────────────────────────────────────────────
 * The unified, centralized receipt document component used by:
 * - Receipt Builder (live preview)
 * - Fees Collection counter (/fees-collection/collect-fees)
 * - Student Fees profile & Ledger (/fees/[studentId])
 * - Guardian fee receipt (/guardians/[id])
 * ─────────────────────────────────────────────────────────────────────────
 */
export default function DynamicReceiptDocument({
  config = DEFAULT_RECEIPT_CONFIG,
  schoolInfo = {},
  receiptData,
  targetId = "printable-receipt",
  containerRef,
  forcedCopiesCount,
  pageMode = "single",
}: DynamicReceiptDocumentProps) {
  const schoolName = config.school_name_custom || schoolInfo.name || "Bajrang Shikshan Sansthan Secondary School";
  const schoolSubtitle = config.school_subtitle_custom || schoolInfo.subtitle || "Padu Khurd | Padu Kurd (Nagaur)";
  const schoolAddress = config.address_custom || schoolInfo.address || "Padu Khurd, Nagaur, Rajasthan";
  const schoolContact = config.contact_custom || schoolInfo.phone || "+91 98765 43210";
  const schoolEmail = config.email_custom || schoolInfo.email || "";
  const schoolLogo = config.custom_logo_url || schoolInfo.logo_url || "";
  const schoolUdise = config.udise_or_reg_no || "";

  // ── TEMPLATE SPECIAL: Bajrang Official Counter Slip (Single Slip) ────────
  if (config.template_id === "bajrang_dual_slip" || config.template_id === "bajrang_official_slip") {
    return (
      <div
        ref={containerRef as any}
        id={targetId}
        data-print-zone="true"
        className="w-full max-w-[620px] mx-auto"
        style={{
          maxWidth: "620px",
          width: "100%",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <BajrangSlipCard
          schoolName={schoolName}
          schoolSubtitle={schoolSubtitle}
          schoolAddress={schoolAddress}
          schoolContact={schoolContact}
          schoolEmail={schoolEmail}
          schoolLogo={schoolLogo}
          copyLabel={config.copy_label_primary || "OFFICE COPY"}
          receiptData={receiptData}
          primaryColor={config.primary_color}
        />
      </div>
    );
  }

  const totalCopies =
    forcedCopiesCount !== undefined
      ? forcedCopiesCount
      : config.layout_mode === "triple"
      ? 3
      : config.layout_mode === "dual"
      ? 2
      : 1;

  const copyLabelsList: string[] = [];
  if (totalCopies === 1) {
    copyLabelsList.push(""); // hide label when single copy
  } else if (totalCopies === 2) {
    copyLabelsList.push(config.copy_label_primary || config.copy_labels?.[0] || "STUDENT COPY");
    copyLabelsList.push(config.copy_label_secondary || config.copy_labels?.[1] || "OFFICE / SCHOOL COPY");
  } else {
    copyLabelsList.push(config.copy_label_primary || config.copy_labels?.[0] || "STUDENT COPY");
    copyLabelsList.push(config.copy_label_secondary || config.copy_labels?.[1] || "OFFICE / SCHOOL COPY");
    copyLabelsList.push(config.copy_labels?.[2] || "BANK / AUDIT COPY");
  }

  return (
    <div
      ref={containerRef as any}
      id={targetId}
      data-print-zone="true"
      className="space-y-6 mx-auto transition-all"
      style={{
        maxWidth:
          config.paper_size === "POS-80mm"
            ? "320px"
            : config.paper_size === "A5"
            ? "560px"
            : "720px",
        fontFamily:
          config.font_family === "mono"
            ? "ui-monospace, monospace"
            : config.font_family === "serif"
            ? "Georgia, Cambria, serif"
            : "system-ui, -apple-system, sans-serif",
      }}
    >
      {copyLabelsList.map((label, idx) => {
        const isLast = idx === copyLabelsList.length - 1;

        return (
          <React.Fragment key={idx}>
            <div
              style={
                !isLast && pageMode === "separate"
                  ? { pageBreakAfter: "always", breakAfter: "page" }
                  : undefined
              }
            >
              <SingleSlipSheet
                config={config}
                schoolName={schoolName}
                schoolSubtitle={schoolSubtitle}
                schoolAddress={schoolAddress}
                schoolContact={schoolContact}
                schoolEmail={schoolEmail}
                schoolLogo={schoolLogo}
                schoolUdise={schoolUdise}
                copyLabel={label}
                receiptData={receiptData}
              />
            </div>

            {!isLast && (
              pageMode === "separate" ? (
                <div
                  className="receipt-page-break my-6 print:hidden flex items-center justify-center gap-3"
                  style={{ pageBreakAfter: "always", breakAfter: "page" }}
                >
                  <div className="flex-1 border-b-2 border-dashed border-indigo-200 dark:border-indigo-800" />
                  <span className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-full text-indigo-700 dark:text-indigo-300 font-sans text-xs font-bold tracking-wide flex items-center gap-2 shadow-2xs">
                    <span>📄 Page Break: Next Copy ({copyLabelsList[idx + 1]}) Prints on Page {idx + 2}</span>
                  </span>
                  <div className="flex-1 border-b-2 border-dashed border-indigo-200 dark:border-indigo-800" />
                </div>
              ) : (
                <div className="relative py-2 flex items-center justify-center cut-line">
                  <div className="w-full border-t border-dashed border-slate-400 dark:border-slate-600" />
                  <span className="absolute bg-slate-200 dark:bg-slate-950 print:bg-white px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5" />
                    Cut Along This Line For Records
                  </span>
                </div>
              )
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── SUB-COMPONENT: Individual Slip Sheet ───────────────────────────────
export function SingleSlipSheet({
  config,
  schoolName,
  schoolSubtitle,
  schoolAddress,
  schoolContact,
  schoolEmail,
  schoolLogo,
  schoolUdise,
  copyLabel,
  receiptData,
}: {
  config: ReceiptConfig;
  schoolName: string;
  schoolSubtitle: string;
  schoolAddress: string;
  schoolContact: string;
  schoolEmail: string;
  schoolLogo: string;
  schoolUdise: string;
  copyLabel: string;
  receiptData: ReceiptData;
}) {
  const isThermal = config.paper_size === "POS-80mm";
  const logoDimension =
    config.paper_size === "POS-80mm"
      ? (config.logo_size === "xl" ? 64 : config.logo_size === "large" ? 52 : config.logo_size === "small" ? 36 : 44)
      : (config.logo_size === "xl" ? 120 : config.logo_size === "large" ? 95 : config.logo_size === "small" ? 50 : 75);

  const densityPadding =
    config.table_density === "compact"
      ? "py-1 px-2"
      : config.table_density === "spacious"
      ? "py-2.5 px-3"
      : "py-1.5 px-2.5";

  return (
    <div
      className="bg-white text-slate-900 rounded-xl p-5 md:p-6 shadow-md border border-slate-300 text-left relative overflow-hidden print:shadow-none print:border print:border-slate-300 print:rounded-none"
      style={{
        fontSize: isThermal ? "11px" : "12px",
      }}
    >
      {/* Top Color Accent Bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5"
        style={{ backgroundColor: config.primary_color }}
      />

      {/* ── 1. HEADER SECTION ───────────────────────────────────────── */}
      <div
        className={`mb-4 pb-3 border-b border-slate-200 receipt-branding-box ${
          config.logo_position === "center"
            ? "receipt-branding-center"
            : config.logo_position === "right"
            ? "receipt-branding-right"
            : "receipt-branding-left"
        }`}
        style={{
          display: "flex",
          flexDirection:
            config.logo_position === "center"
              ? "column"
              : config.logo_position === "right"
              ? "row-reverse"
              : "row",
          alignItems: "center",
          justifyContent: config.logo_position === "center" ? "center" : "space-between",
          textAlign: config.logo_position === "center" ? "center" : "left",
          width: "100%",
          gap: config.logo_position === "center" ? "10px" : "16px",
          position: "relative",
        }}
      >
        {/* Logo */}
        {config.show_logo && (
          <div
            className="shrink-0 flex items-center justify-center receipt-logo-container"
            style={{
              width: `${logoDimension}px`,
              height: `${logoDimension}px`,
              maxWidth: `${logoDimension}px`,
              maxHeight: `${logoDimension}px`,
              minWidth: `${logoDimension}px`,
              minHeight: `${logoDimension}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {schoolLogo ? (
              <img
                src={schoolLogo}
                alt="Logo"
                width={logoDimension}
                height={logoDimension}
                className="receipt-logo-img object-contain"
                style={{
                  width: `${logoDimension}px`,
                  height: `${logoDimension}px`,
                  maxWidth: `${logoDimension}px`,
                  maxHeight: `${logoDimension}px`,
                  objectFit: "contain",
                  display: "block",
                }}
              />
            ) : (
              <div
                className="rounded-xl flex items-center justify-center font-black text-white"
                style={{
                  backgroundColor: config.primary_color,
                  width: `${logoDimension}px`,
                  height: `${logoDimension}px`,
                  fontSize: logoDimension > 50 ? "16px" : "12px",
                }}
              >
                {schoolName.substring(0, 3).toUpperCase() || "BSS"}
              </div>
            )}
          </div>
        )}

        {/* School Name & Subtitles */}
        <div
          className="flex-1"
          style={{
            flex: "1 1 auto",
            textAlign: config.logo_position === "center" ? "center" : "left",
            width: config.logo_position === "center" ? "100%" : "auto",
          }}
        >
          {config.show_school_name && (
            <h1
              className="text-base md:text-lg font-black tracking-tight uppercase"
              style={{ color: config.primary_color, margin: "0 0 2px 0" }}
            >
              {schoolName}
            </h1>
          )}

          {config.show_subtitle && schoolSubtitle && (
            <div className="text-[11px] font-bold text-slate-600 mt-0.5" style={{ margin: "2px 0" }}>
              {schoolSubtitle}
            </div>
          )}

          {config.show_affiliation && (config.affiliation_text || schoolUdise) && (
            <div
              className="text-[10px] text-slate-500 font-medium mt-0.5 flex items-center gap-2 flex-wrap"
              style={{
                justifyContent: config.logo_position === "center" ? "center" : "flex-start",
                margin: "2px 0",
              }}
            >
              {config.affiliation_text && <span>{config.affiliation_text}</span>}
              {schoolUdise && (
                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[9.5px] border border-slate-200">
                  {schoolUdise}
                </span>
              )}
            </div>
          )}

          <div
            className="flex items-center gap-3 text-[10px] text-slate-500 mt-1 flex-wrap"
            style={{
              justifyContent: config.logo_position === "center" ? "center" : "flex-start",
            }}
          >
            {config.show_address && schoolAddress && (
              <span>{schoolAddress}</span>
            )}
            {config.show_contact && schoolContact && (
              <span>• Phone: {schoolContact}</span>
            )}
            {config.show_contact && schoolEmail && (
              <span>• {schoolEmail}</span>
            )}
          </div>
        </div>

        {/* Copy Badge (Only shown when copyLabel is present e.g. Dual/Multi-slip mode) */}
        {config.show_copy_badge && Boolean(copyLabel) && (
          <div
            className="shrink-0"
            style={{
              position: config.logo_position === "center" ? "absolute" : "static",
              top: config.logo_position === "center" ? "0px" : "auto",
              right: config.logo_position === "center" ? "0px" : "auto",
              alignSelf: "flex-start",
              order: config.logo_position === "right" ? 2 : "auto",
            }}
          >
            <span
              className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider text-white border"
              style={{
                backgroundColor: config.primary_color,
                borderColor: config.primary_color,
              }}
            >
              {copyLabel}
            </span>
          </div>
        )}
      </div>

      {/* ── 2. RECEIPT TITLE BANNER ─────────────────────────────────── */}
      <div className="text-center my-3 relative">
        <div className="inline-block px-4 py-1 rounded-md border border-slate-300 font-black text-xs uppercase tracking-wider bg-slate-50 text-slate-800">
          {config.receipt_title || "FEES PAYMENT RECEIPT"}
        </div>
      </div>

      {/* ── 3. STUDENT & RECEIPT METADATA ───────────────────────────── */}
      <div
        className={`mb-4 p-3 rounded-lg border border-slate-200 bg-slate-50/70 text-[11px] ${
          config.meta_layout === "grid-3"
            ? "grid grid-cols-1 sm:grid-cols-3 gap-2"
            : config.meta_layout === "dashed-list"
            ? "space-y-1.5"
            : "grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5"
        }`}
      >
        {config.show_receipt_no && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Receipt No:</span>
            <span className="font-mono font-bold text-slate-900">
              {receiptData.receiptNo}
            </span>
          </div>
        )}

        {config.show_payment_date && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Date & Time:</span>
            <span className="font-semibold text-slate-800">
              {receiptData.date} {receiptData.time ? `(${receiptData.time})` : ""}
            </span>
          </div>
        )}

        {config.show_student_name && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Student Name:</span>
            <span className="font-black text-slate-900">
              {receiptData.student.name}
            </span>
          </div>
        )}

        {config.show_admission_no && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Admission No:</span>
            <span className="font-mono font-bold text-slate-800">
              {receiptData.student.admissionNo}
            </span>
          </div>
        )}

        {config.show_class && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Class / Section:</span>
            <span className="font-bold text-slate-800">
              {receiptData.student.className} {receiptData.student.section ? `- ${receiptData.student.section}` : ""}
            </span>
          </div>
        )}

        {config.show_roll_no && receiptData.student.rollNo && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Roll No:</span>
            <span className="font-bold text-slate-800">
              {receiptData.student.rollNo}
            </span>
          </div>
        )}

        {config.show_father_name && receiptData.student.fatherName && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Father's Name:</span>
            <span className="font-semibold text-slate-800">
              {receiptData.student.fatherName}
            </span>
          </div>
        )}

        {config.show_mother_name && receiptData.student.motherName && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Mother's Name:</span>
            <span className="font-semibold text-slate-800">
              {receiptData.student.motherName}
            </span>
          </div>
        )}

        {config.show_phone && receiptData.student.phone && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Contact Phone:</span>
            <span className="font-semibold text-slate-800 font-mono text-[10px]">
              {receiptData.student.phone}
            </span>
          </div>
        )}

        {config.show_academic_session && receiptData.session && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Session:</span>
            <span className="font-semibold text-slate-800">
              {receiptData.session}
            </span>
          </div>
        )}

        {config.show_billing_range && receiptData.billingRange && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Billing Period:</span>
            <span className="font-bold text-slate-800">
              {receiptData.billingRange}
            </span>
          </div>
        )}

        {config.show_payment_method && receiptData.paymentMethod && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Payment Mode:</span>
            <span className="font-bold text-emerald-700">
              {receiptData.paymentMethod}
            </span>
          </div>
        )}

        {config.show_transaction_id && receiptData.transactionId && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Transaction ID:</span>
            <span className="font-mono text-[10px] text-slate-700">
              {receiptData.transactionId}
            </span>
          </div>
        )}
      </div>

      {/* ── 4. FEE PARTICULARS TABLE ─────────────────────────────────── */}
      {(() => {
        // Core 4 columns matching user's exact specification:
        // Fee type | Due Amount (Rs.) | Discount (Rs.) | Paid (Rs.)
        const showFeeHead = true;
        const showTotalAmount = config.show_total_amount !== false;
        const showDiscount = config.show_discount !== false;
        const showPaidNow = config.show_paid_now !== false;
        const showPaidBefore = Boolean(config.show_paid_before);
        const showTotalPaid = Boolean(config.show_total_paid);
        const showOutstanding = Boolean(config.show_outstanding);
        const showStatusBadge = Boolean(config.show_status_badge);

        // Dynamically compute column widths so they ALWAYS sum to exactly 100% with no gaps or shrink
        const otherColsWidth =
          (config.show_serial_no ? 6 : 0) +
          (showTotalAmount ? 20 : 0) +
          (showPaidBefore ? 15 : 0) +
          (showDiscount ? 15 : 0) +
          (showPaidNow ? 20 : 0) +
          (showTotalPaid ? 15 : 0) +
          (showOutstanding ? 15 : 0) +
          (showStatusBadge ? 10 : 0);

        const feeHeadWidth = Math.max(25, 100 - otherColsWidth);

        return (
          <div className="mb-6 overflow-x-auto">
            <table
              className="w-full text-[11px] border border-slate-300 border-collapse divide-y divide-slate-300"
              style={{ width: "100%", tableLayout: "fixed" }}
            >
              <colgroup>
                {config.show_serial_no && <col style={{ width: "6%" }} />}
                {showFeeHead && <col style={{ width: `${feeHeadWidth}%` }} />}
                {showTotalAmount && <col style={{ width: "20%" }} />}
                {showPaidBefore && <col style={{ width: "15%" }} />}
                {showDiscount && <col style={{ width: "15%" }} />}
                {showPaidNow && <col style={{ width: "20%" }} />}
                {showTotalPaid && <col style={{ width: "15%" }} />}
                {showOutstanding && <col style={{ width: "15%" }} />}
                {showStatusBadge && <col style={{ width: "10%" }} />}
              </colgroup>
              <thead>
                {/* Fee Details Title Row matching user's exact specification */}
                <tr className="border-b border-slate-300 bg-slate-100 text-slate-800">
                  <th
                    colSpan={
                      (config.show_serial_no ? 1 : 0) +
                      (showFeeHead ? 1 : 0) +
                      (showTotalAmount ? 1 : 0) +
                      (showPaidBefore ? 1 : 0) +
                      (showDiscount ? 1 : 0) +
                      (showPaidNow ? 1 : 0) +
                      (showTotalPaid ? 1 : 0) +
                      (showOutstanding ? 1 : 0) +
                      (showStatusBadge ? 1 : 0)
                    }
                    className="py-1 text-center font-bold tracking-wide text-xs uppercase"
                  >
                    Fee Details
                  </th>
                </tr>
                <tr
                  className="text-left font-black"
                  style={{
                    backgroundColor: "#f8fafc",
                    color: "#1e293b",
                    borderBottom: "1.5px solid #cbd5e1",
                  }}
                >
                  {config.show_serial_no && (
                    <th className={`w-8 text-center ${densityPadding}`} style={{ width: "6%" }}>#</th>
                  )}
                  {showFeeHead && (
                    <th className={densityPadding} style={{ width: `${feeHeadWidth}%` }}>
                      Fee type
                    </th>
                  )}
                  {showTotalAmount && (
                    <th className={`text-right ${densityPadding}`} style={{ width: "20%" }}>
                      Due Amount (Rs.)
                    </th>
                  )}
                  {showPaidBefore && (
                    <th className={`text-right ${densityPadding}`} style={{ width: "15%" }}>
                      Paid Before (Rs.)
                    </th>
                  )}
                  {showDiscount && (
                    <th className={`text-right ${densityPadding}`} style={{ width: "15%" }}>
                      Discount (Rs.)
                    </th>
                  )}
                  {showPaidNow && (
                    <th className={`text-right font-black ${densityPadding}`} style={{ width: "20%" }}>
                      Paid (Rs.)
                    </th>
                  )}
                  {showTotalPaid && (
                    <th className={`text-right ${densityPadding}`} style={{ width: "15%" }}>
                      Total Paid (Rs.)
                    </th>
                  )}
                  {showOutstanding && (
                    <th className={`text-right ${densityPadding}`} style={{ width: "15%" }}>
                      Balance Due (Rs.)
                    </th>
                  )}
                  {showStatusBadge && (
                    <th className={`text-center w-16 ${densityPadding}`} style={{ width: "10%" }}>Status</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {receiptData.items.map((row, idx) => (
                  <tr
                    key={idx}
                    className={
                      config.table_theme === "striped" && idx % 2 === 1
                        ? "bg-slate-50/80"
                        : ""
                    }
                  >
                    {config.show_serial_no && (
                      <td className={`text-center font-mono text-slate-500 ${densityPadding}`}>
                        {row.sno ?? idx + 1}
                      </td>
                    )}
                    {showFeeHead && (
                      <td className={`font-bold text-slate-900 ${densityPadding}`}>
                        {row.head || "Tuition Fee"}
                      </td>
                    )}
                    {showTotalAmount && (
                      <td className={`text-right font-mono ${densityPadding}`}>
                        ₹{row.total.toLocaleString()}
                      </td>
                    )}
                    {showPaidBefore && (
                      <td className={`text-right font-mono text-slate-600 ${densityPadding}`}>
                        ₹{row.paidBefore.toLocaleString()}
                      </td>
                    )}
                    {showDiscount && (
                      <td className={`text-right font-mono text-emerald-600 font-bold ${densityPadding}`}>
                        ₹{row.discount.toLocaleString()}
                      </td>
                    )}
                    {showPaidNow && (
                      <td className={`text-right font-mono font-black text-slate-900 ${densityPadding}`}>
                        ₹{row.paidNow.toLocaleString()}
                      </td>
                    )}
                    {showTotalPaid && (
                      <td className={`text-right font-mono text-slate-700 ${densityPadding}`}>
                        ₹{row.totalPaid.toLocaleString()}
                      </td>
                    )}
                    {showOutstanding && (
                      <td className={`text-right font-mono font-bold ${row.outstanding > 0 ? "text-amber-700" : "text-emerald-700"} ${densityPadding}`}>
                        ₹{row.outstanding.toLocaleString()}
                      </td>
                    )}
                    {showStatusBadge && (
                      <td className={`text-center ${densityPadding}`}>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase ${
                            row.status === "Paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* ── 5. SUMMARY & TOTALS BOX (SIDE-BY-SIDE IN PRINT) ──────────── */}
      {(() => {
        let showSubtotal = Boolean(config.show_subtotal);
        let showDiscountTotal = Boolean(config.show_discount_total);
        let showNetPaid = Boolean(config.show_net_paid);
        let showTotalBalance = Boolean(config.show_total_balance);
        const showAmountInWords = config.show_amount_in_words !== false;
        const showRemarks = config.show_payment_remarks !== false;

        if (!showSubtotal && !showDiscountTotal && !showNetPaid && !showTotalBalance) {
          showNetPaid = true;
          if (receiptData.totals.balanceDue > 0) {
            showTotalBalance = true;
          }
        }

        const hasLeftSummary = (showAmountInWords && Boolean(receiptData.totals.amountInWords)) || (showRemarks && Boolean(receiptData.totals.remarks));
        const hasRightSummary = showSubtotal || showDiscountTotal || showNetPaid || showTotalBalance;

        if (!hasLeftSummary && !hasRightSummary) return null;

        return (
          <div
            className="mb-5 mt-2"
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              width: "100%",
              gap: "16px",
            }}
          >
            {/* Left Side: Amount in Words & Remarks */}
            <div style={{ flex: "1 1 56%", minWidth: 0 }} className="space-y-2 text-[11px]">
              {showAmountInWords && receiptData.totals.amountInWords && (
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                    Amount in Words:
                  </span>
                  <span className="font-black text-slate-900 italic">
                    {receiptData.totals.amountInWords}
                  </span>
                </div>
              )}

              {showRemarks && receiptData.totals.remarks && (
                <div className="text-[10.5px] text-slate-600">
                  <span className="font-bold text-slate-800">Note / Remarks: </span>
                  {receiptData.totals.remarks}
                </div>
              )}
            </div>

            {/* Right Side: Totals Calculation Card */}
            {hasRightSummary && (
              <div
                style={{ flex: "0 0 40%", minWidth: "220px" }}
                className="border border-slate-300 rounded-lg overflow-hidden text-[11.5px] bg-slate-50/60 divide-y divide-slate-200"
              >
                {showSubtotal && (
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-slate-600">Gross Total Fee:</span>
                    <span className="font-mono font-bold text-slate-800">
                      ₹{receiptData.totals.grossFee.toLocaleString()}
                    </span>
                  </div>
                )}

                {showDiscountTotal && (
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-slate-600">Total Concession:</span>
                    <span className="font-mono text-emerald-600 font-bold">
                      ₹{receiptData.totals.discountTotal.toLocaleString()}
                    </span>
                  </div>
                )}

                {showNetPaid && (
                  <div
                    className="flex items-center justify-between px-3 py-2 text-white font-black"
                    style={{ backgroundColor: config.primary_color || "#0f172a" }}
                  >
                    <span>NET AMOUNT PAID NOW:</span>
                    <span className="font-mono text-sm">
                      ₹{receiptData.totals.paidNowTotal.toLocaleString()}
                    </span>
                  </div>
                )}

                {showTotalBalance && (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-amber-50 text-amber-900 font-bold">
                    <span>Remaining Balance Due:</span>
                    <span className="font-mono">
                      ₹{receiptData.totals.balanceDue.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── 6. FOOTER SIGNATURES & STAMP (ALWAYS SINGLE ROW, NEVER WRAPPING) ── */}
      {(() => {
        const showCashierSign = config.show_cashier_sign ?? true;
        const showSealStamp = config.show_seal_stamp ?? true;
        const showParentSign = Boolean(config.show_parent_sign);
        const showPrincipalSign = config.show_principal_sign ?? true;
        const showDisclaimer = config.show_disclaimer !== false;

        return (
          <>
            {(showCashierSign || showSealStamp || showParentSign || showPrincipalSign) && (
              <div
                className="mt-8 pt-4 border-t border-slate-200 text-center"
                style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  width: "100%",
                  flexWrap: "nowrap",
                }}
              >
                {showCashierSign && (
                  <div style={{ width: "32%", textAlign: "center", flexShrink: 0 }}>
                    <div className="h-10 border-b border-dashed border-slate-400 mb-1.5" />
                    <div className="text-[10.5px] font-bold text-slate-800">
                      {config.cashier_sign_label || "Cashier / Accounts Officer"}
                    </div>
                  </div>
                )}

                {showSealStamp && (
                  <div style={{ width: "30%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-400 flex items-center justify-center text-[9px] font-black uppercase text-slate-400 leading-tight">
                      OFFICIAL<br />SEAL
                    </div>
                  </div>
                )}

                {showParentSign && (
                  <div style={{ width: "32%", textAlign: "center", flexShrink: 0 }}>
                    <div className="h-10 border-b border-dashed border-slate-400 mb-1.5" />
                    <div className="text-[10.5px] font-bold text-slate-800">
                      {config.parent_sign_label || "Depositor Signature"}
                    </div>
                  </div>
                )}

                {showPrincipalSign && (
                  <div style={{ width: "32%", textAlign: "center", flexShrink: 0 }}>
                    <div className="h-10 border-b border-dashed border-slate-400 mb-1.5" />
                    <div className="text-[10.5px] font-bold text-slate-800">
                      {config.principal_sign_label || "Principal / Authority"}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── 7. DISCLAIMER ───────────────────────────────────────────── */}
            {showDisclaimer && (config.disclaimer_text || "Note: Fees once paid is strictly non-refundable. Please preserve this computer generated receipt for all future official verifications.") && (
              <div className="mt-4 pt-2 text-[9.5px] text-slate-500 text-center leading-relaxed">
                {config.disclaimer_text || "Note: Fees once paid is strictly non-refundable. Please preserve this computer generated receipt for all future official verifications."}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

/**
 * ─── BajrangSlipCard ──────────────────────────────────────────────────────────
 * Exact replica component of Bajrang Shikshan Sansthan's official paper receipt:
 * - SCHOOL COPY (Left) / OFFICE COPY (Right) top corner
 * - Circular logo, school name, bus stand Padu Khurd, phone, email
 * - Receipt No.- | Date:-
 * - Student Name:- | Class:-
 * - Father's Name:- | SR.No.:-
 * - Installment Name:-
 * - Table: Fee Details (Fee type, Due Amount, Discount, Paid)
 * - Totals: Total Fees, Discount, Payable Fees, Total Dues, Paid Fees, Amount in Words, Mode
 * - Footer: Remark : | Authorised Signature
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function BajrangSlipCard({
  schoolName,
  schoolSubtitle,
  schoolAddress,
  schoolContact,
  schoolEmail,
  schoolLogo,
  copyLabel,
  receiptData,
  primaryColor,
}: {
  schoolName: string;
  schoolSubtitle: string;
  schoolAddress: string;
  schoolContact: string;
  schoolEmail: string;
  schoolLogo: string;
  copyLabel: string;
  receiptData: ReceiptData;
  primaryColor?: string;
}) {
  const gross = receiptData.totals.grossFee || 0;
  const discount = receiptData.totals.discountTotal || 0;
  const payable = Math.max(0, gross - discount);
  const paid = receiptData.totals.paidNowTotal || 0;
  const balance = receiptData.totals.balanceDue || Math.max(0, payable - paid);

  return (
    <div
      style={{
        boxSizing: "border-box",
        border: "1.5px solid #0f172a",
        borderRadius: "4px",
        padding: "16px 20px",
        maxWidth: "640px",
        width: "100%",
        margin: "0 auto",
        backgroundColor: "#ffffff",
        color: "#0f172a",
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: "12px",
        lineHeight: "1.35",
        textAlign: "left",
      }}
    >
      {/* ── Top Header with School Info and Copy Label ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px" }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: "top", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {schoolLogo ? (
                  <img
                    src={schoolLogo}
                    alt="Logo"
                    style={{
                      width: "56px",
                      height: "56px",
                      objectFit: "contain",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "50%",
                      border: "1.5px solid #0f172a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      fontSize: "13px",
                      color: primaryColor || "#0f172a",
                      flexShrink: 0,
                    }}
                  >
                    BSS
                  </div>
                )}
                <div>
                  <h1
                    style={{
                      fontSize: "15px",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      margin: "0 0 2px 0",
                      lineHeight: "1.2",
                      color: "#0f172a",
                    }}
                  >
                    {schoolName}
                  </h1>
                  <div style={{ fontSize: "11px", color: "#334155", fontWeight: 500 }}>
                    {schoolAddress || schoolSubtitle || "bus stand, Padu khurd"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#334155", fontWeight: 500 }}>
                    Ph.No.-{schoolContact || "9928194118"}
                  </div>
                  {schoolEmail && (
                    <div style={{ fontSize: "11px", color: "#334155", fontWeight: 500 }}>
                      {schoolEmail}
                    </div>
                  )}
                </div>
              </div>
            </td>
            <td style={{ verticalAlign: "top", textAlign: "right", whiteSpace: "nowrap" }}>
              <span
                style={{
                  fontWeight: 900,
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "#0f172a",
                  borderBottom: "1.5px solid #0f172a",
                  paddingBottom: "2px",
                  display: "inline-block",
                }}
              >
                {copyLabel}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Metadata Section ── */}
      <div
        style={{
          borderTop: "1px solid #64748b",
          borderBottom: "1px solid #64748b",
          padding: "6px 0",
          margin: "8px 0 12px 0",
          fontSize: "11.5px",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4px" }}>
          <tbody>
            <tr>
              <td style={{ textAlign: "left", width: "50%", padding: "1px 0" }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>Receipt No.- </span>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>{receiptData.receiptNo}</span>
              </td>
              <td style={{ textAlign: "right", width: "50%", padding: "1px 0" }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>Date:- </span>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>{receiptData.date}</span>
              </td>
            </tr>
            <tr>
              <td style={{ textAlign: "left", width: "50%", padding: "1px 0" }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>Student Name:- </span>
                <span style={{ fontWeight: 900, color: "#0f172a", textTransform: "uppercase" }}>{receiptData.student.name}</span>
              </td>
              <td style={{ textAlign: "right", width: "50%", padding: "1px 0" }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>Class:- </span>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>
                  {receiptData.student.className}
                  {receiptData.student.section ? `-${receiptData.student.section}` : ""}
                </span>
              </td>
            </tr>
            <tr>
              <td style={{ textAlign: "left", width: "50%", padding: "1px 0" }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>Father's Name:- </span>
                <span style={{ fontWeight: 700, color: "#0f172a", textTransform: "uppercase" }}>
                  {receiptData.student.fatherName || "—"}
                </span>
              </td>
              <td style={{ textAlign: "right", width: "50%", padding: "1px 0" }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>SR.No.:- </span>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>
                  {receiptData.student.admissionNo || "—"}
                </span>
              </td>
            </tr>
            <tr>
              <td colSpan={2} style={{ textAlign: "left", padding: "1px 0" }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>Installment Name:- </span>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>
                  {receiptData.billingRange || receiptData.session || "Annual Academic Fee"}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Fee Details Table ── */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          border: "1.5px solid #334155",
          marginTop: "10px",
          marginBottom: "14px",
          tableLayout: "fixed",
          fontSize: "11.5px",
        }}
      >
        <colgroup>
          <col style={{ width: "42%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "20%" }} />
        </colgroup>
        <thead>
          <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "1.5px solid #334155" }}>
            <th
              colSpan={4}
              style={{
                padding: "4px 8px",
                textAlign: "center",
                fontWeight: 700,
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "#0f172a",
              }}
            >
              Fee Details
            </th>
          </tr>
          <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1.5px solid #334155", textAlign: "left" }}>
            <th style={{ padding: "5px 8px", borderRight: "1px solid #64748b", fontWeight: 700, color: "#0f172a" }}>Fee type</th>
            <th style={{ padding: "5px 8px", borderRight: "1px solid #64748b", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>Due Amount (Rs.)</th>
            <th style={{ padding: "5px 8px", borderRight: "1px solid #64748b", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>Discount (Rs.)</th>
            <th style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>Paid (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          {receiptData.items.map((row, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #cbd5e1" }}>
              <td style={{ padding: "5px 8px", borderRight: "1px solid #cbd5e1", fontWeight: 500 }}>{row.head || "Tuition Fee"}</td>
              <td style={{ padding: "5px 8px", borderRight: "1px solid #cbd5e1", textAlign: "right" }}>{row.total || 0}</td>
              <td style={{ padding: "5px 8px", borderRight: "1px solid #cbd5e1", textAlign: "right" }}>{row.discount || 0}</td>
              <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700 }}>{row.paidNow || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Summary & Totals (Exact layout from user photo) ── */}
      <div style={{ fontSize: "11.5px", color: "#0f172a" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: "1px dashed #94a3b8", marginBottom: "6px" }}>
          <tbody>
            <tr>
              <td style={{ padding: "4px 0", textAlign: "left", width: "34%" }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>Total Fees : </span>
                <span style={{ fontWeight: 700 }}>Rs.{gross}</span>
              </td>
              <td style={{ padding: "4px 0", textAlign: "center", width: "33%" }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>Discount : </span>
                <span style={{ fontWeight: 700 }}>Rs.{discount}</span>
              </td>
              <td style={{ padding: "4px 0", textAlign: "right", width: "33%" }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>Payable Fees: </span>
                <span style={{ fontWeight: 700 }}>Rs.{payable}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: "100%", borderCollapse: "collapse", borderBottom: "1px dashed #94a3b8", marginBottom: "6px" }}>
          <tbody>
            <tr>
              <td style={{ padding: "4px 0", textAlign: "left", width: "50%" }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>Total Dues In This Receipt : </span>
                <span style={{ fontWeight: 700 }}>Rs.{balance}</span>
              </td>
              <td style={{ padding: "4px 0", textAlign: "right", width: "50%" }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>Paid Fees : </span>
                <span style={{ fontWeight: 700, color: "#0f172a" }}>Rs.{paid}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ borderBottom: "1px dashed #94a3b8", padding: "4px 0 6px 0", marginBottom: "6px" }}>
          <span style={{ fontWeight: 600, color: "#475569" }}>Amount In Words : </span>
          <span style={{ fontWeight: 700, fontStyle: "italic", color: "#0f172a" }}>
            Rs. {receiptData.totals.amountInWords || numberToWords(paid)}
          </span>
        </div>

        <div style={{ padding: "3px 0" }}>
          <span style={{ fontWeight: 600, color: "#475569" }}>Payment Mode: </span>
          <span style={{ fontWeight: 700, color: "#0f172a" }}>{receiptData.paymentMethod || "Cash"}</span>
        </div>
      </div>

      {/* ── Footer: Remark & Authorised Signature ── */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderTop: "1px solid #64748b", marginTop: "16px" }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: "bottom", padding: "10px 0 0 0", textAlign: "left", fontSize: "11.5px" }}>
              <span style={{ fontWeight: 700 }}>Remark : </span>
              <span>{receiptData.totals.remarks || ""}</span>
            </td>
            <td style={{ verticalAlign: "bottom", padding: "10px 0 0 0", textAlign: "right", width: "160px" }}>
              <div style={{ height: "24px" }} />
              <div style={{ borderTop: "1.5px solid #0f172a", paddingTop: "4px", fontWeight: 700, fontSize: "11.5px", textAlign: "center" }}>
                Authorised Signature
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * ─── formatPaymentReceiptToReceiptData ─────────────────────────────────────────
 * Converts any backend payment receipt document into the standard ReceiptData
 * structure consumed by DynamicReceiptDocument.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function formatPaymentReceiptToReceiptData(
  printedReceipt: any,
  student?: any
): ReceiptData {
  if (!printedReceipt) {
    return {
      receiptNo: "REC-001",
      date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      student: { name: student?.name || "Student", admissionNo: student?.admission_no || "" },
      items: [],
      totals: { grossFee: 0, paidBeforeTotal: 0, discountTotal: 0, paidNowTotal: 0, totalPaidOverall: 0, balanceDue: 0, amountInWords: "Zero Rupees Only" },
    };
  }

  // Handle array of receipt records (e.g. from collect-fees counter)
  if (Array.isArray(printedReceipt)) {
    if (printedReceipt.length === 0) {
      return formatPaymentReceiptToReceiptData(null, student);
    }
    const first = printedReceipt[0];
    const receiptNo = first.receipt_number || first.receipt_no || "REC-001";
    const paymentDate = first.transaction_date || first.payment_date || first.createdAt;
    const dateObj = paymentDate ? new Date(paymentDate) : new Date();
    const dateStr = dateObj.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timeStr = dateObj.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const activeStudent = student || first.student_id || {};

    const items: ReceiptItemData[] = printedReceipt.map((rec: any, idx: number) => {
      const headName =
        rec.fee_master_id?.fee_type_id?.name ||
        rec.fee_type ||
        rec.head ||
        rec.name ||
        "Tuition / Academic Fee";
      const groupName = rec.fee_master_id?.fee_group_id?.name;
      const displayHead = groupName ? `${headName} (${groupName})` : headName;
      const paid = Number(rec.amount_paid || rec.amount || 0);

      return {
        sno: idx + 1,
        head: displayHead,
        total: paid,
        paidBefore: 0,
        discount: Number(rec.discount || 0),
        paidNow: paid,
        totalPaid: paid,
        outstanding: 0,
        status: "Paid",
      };
    });

    const paidNowTotal = items.reduce((sum, it) => sum + it.paidNow, 0);

    return {
      receiptNo,
      date: dateStr,
      time: timeStr,
      session: first.academic_year || first.session || "2026-2027",
      billingRange: "",
      paymentMethod: first.payment_method || "Cash",
      transactionId: first.transaction_id || first.payment_reference || "",
      student: {
        name: activeStudent.name || "Student",
        admissionNo: activeStudent.admission_no || "",
        rollNo: activeStudent.roll_no ? String(activeStudent.roll_no) : "",
        className: activeStudent.class_id?.name || activeStudent.className || activeStudent.class_name || "",
        section: activeStudent.section_id?.name || activeStudent.section || activeStudent.section_name || activeStudent.class_id?.section || "",
        fatherName: activeStudent.guardian_id?.name || activeStudent.father_name || activeStudent.fatherName || "",
        motherName: activeStudent.mother_name || activeStudent.motherName || "",
        phone: activeStudent.phone || "",
      },
      items,
      totals: {
        grossFee: paidNowTotal,
        paidBeforeTotal: 0,
        discountTotal: 0,
        paidNowTotal,
        totalPaidOverall: paidNowTotal,
        balanceDue: 0,
        amountInWords: numberToWords(paidNowTotal),
        remarks: first.remarks || "",
      },
    };
  }

  const receiptNo =
    printedReceipt.receipt_number ||
    printedReceipt.receipt_no ||
    (printedReceipt._id ? `REC-${String(printedReceipt._id).slice(-6).toUpperCase()}` : "REC-001");

  const paymentDate = printedReceipt.payment_date || printedReceipt.transaction_date || printedReceipt.createdAt;
  const dateObj = paymentDate ? new Date(paymentDate) : new Date();
  const dateStr = dateObj.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const activeStudent =
    printedReceipt.student_id && typeof printedReceipt.student_id === "object"
      ? printedReceipt.student_id
      : student || {};

  const items: ReceiptItemData[] = (printedReceipt.fee_breakdown || []).map((item: any, idx: number) => {
    const config = (printedReceipt.feeTypesConfig || []).find((c: any) => c.name === item.name);
    const start = new Date(printedReceipt.start_date);
    const end = new Date(printedReceipt.end_date);
    let mult = 1;
    if (config && !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
      if (config.frequency !== "One Time") {
        const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
        switch (config.frequency) {
          case "Monthly": mult = Math.max(1, monthsDiff); break;
          case "Quarterly": mult = Math.max(1, Math.ceil(monthsDiff / 3)); break;
          case "Half Yearly": mult = Math.max(1, Math.ceil(monthsDiff / 6)); break;
          case "Yearly": mult = 1; break;
        }
      }
    }

    const totalAmount = config ? config.amount * mult : (item.totalAmount || item.amount || item.amount_paid || 0);
    let paidBefore = item.paidBefore || 0;
    if (printedReceipt.paymentsHistory && !item.paidBefore) {
      printedReceipt.paymentsHistory.forEach((p: any) => {
        if (p._id !== printedReceipt._id) {
          const match = p.fee_breakdown?.find((f: any) => f.name === item.name);
          if (match) paidBefore += match.amount_paid;
        }
      });
    }

    const paidNow = item.paidNow ?? item.amount_paid ?? 0;
    const totalPaid = item.totalPaid ?? (paidBefore + paidNow);
    const outstanding = item.outstanding ?? Math.max(0, totalAmount - totalPaid);

    let status = item.status || "Paid";
    if (totalAmount > 0) {
      if (totalPaid >= totalAmount) status = "Paid";
      else if (totalPaid > 0) status = "Partial";
      else status = "Pending";
    }

    const rowDiscount = Number(item.discount ?? (idx === 0 ? (printedReceipt.discount || printedReceipt.concession_amount || 0) : 0));
    return {
      sno: idx + 1,
      head: item.name || item.head || item.fee_type || "Tuition Fee",
      total: totalAmount,
      paidBefore,
      discount: rowDiscount,
      paidNow,
      totalPaid,
      outstanding,
      status,
    };
  });

  // If no items in breakdown, create a single fallback row from amount_paid
  if (items.length === 0) {
    const totalPaid = Number(printedReceipt.amount_paid || 0);
    const discount = Number(printedReceipt.discount || printedReceipt.concession_amount || 0);
    items.push({
      sno: 1,
      head: "Tuition Fee",
      total: totalPaid + discount,
      paidBefore: 0,
      discount,
      paidNow: totalPaid,
      totalPaid,
      outstanding: 0,
      status: "Paid",
    });
  }

  const grossFee = items.reduce((sum, it) => sum + (it.total || 0), 0);
  const paidBeforeTotal = items.reduce((sum, it) => sum + (it.paidBefore || 0), 0);
  const discountTotal = Number(printedReceipt.discount || printedReceipt.concession_amount || 0);
  const paidNowTotal = Number(printedReceipt.amount_paid || items.reduce((sum, it) => sum + it.paidNow, 0));
  const totalPaidOverall = paidBeforeTotal + paidNowTotal;
  const balanceDue = Math.max(0, grossFee - totalPaidOverall);

  return {
    receiptNo,
    date: dateStr,
    time: timeStr,
    session: printedReceipt.academic_year || printedReceipt.session || "2026-2027",
    billingRange:
      printedReceipt.start_date && printedReceipt.end_date
        ? `${new Date(printedReceipt.start_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })} – ${new Date(printedReceipt.end_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`
        : printedReceipt.billing_period || "",
    paymentMethod: printedReceipt.payment_method || "Cash",
    transactionId: printedReceipt.transaction_id || printedReceipt.payment_reference || "",
    student: {
      name: activeStudent.name || "Student",
      admissionNo: activeStudent.admission_no || "",
      rollNo: activeStudent.roll_no ? String(activeStudent.roll_no) : "",
      className: activeStudent.class_id?.name || activeStudent.className || activeStudent.class_name || "",
      section: activeStudent.section_id?.name || activeStudent.section || activeStudent.section_name || activeStudent.class_id?.section || "",
      fatherName: activeStudent.guardian_id?.name || activeStudent.father_name || activeStudent.fatherName || "",
      motherName: activeStudent.mother_name || activeStudent.motherName || "",
      phone: activeStudent.phone || "",
    },
    items,
    totals: {
      grossFee,
      paidBeforeTotal,
      discountTotal,
      paidNowTotal,
      totalPaidOverall,
      balanceDue,
      amountInWords: numberToWords(paidNowTotal),
      remarks: printedReceipt.remarks || "",
    },
  };
}

