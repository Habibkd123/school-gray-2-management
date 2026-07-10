"use client";

/**
 * ─── PrintButton ────────────────────────────────────────────────────────────
 * Universal, reusable print button for the School ERP.
 *
 * Usage:
 *   <PrintButton targetId="printable-receipt" />
 *   <PrintButton targetId="printable-payslip" label="Print Salary Slip" watermark="PAID" pageSize="A4" />
 *   <PrintButton targetId="printable-report-card" label="Print" disabled={isLoading} variant="icon" />
 *
 * Every Print button in the ERP must use this component.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import { Printer } from "lucide-react";
import { PrintService } from "@/app/lib/print-service";
import type { PrintPageSize, PrintWatermark } from "@/app/lib/print-service";

export interface PrintButtonProps {
  /** The `id` of the printable container element */
  targetId: string;
  /** Button label. Default: "Print / Save PDF" */
  label?: string;
  /** Page size preset. Default: "A4" */
  pageSize?: PrintPageSize;
  /** Page margin. Default: "12mm" */
  margin?: string;
  /** Optional watermark (PAID, DRAFT, CONFIDENTIAL…) */
  watermark?: PrintWatermark;
  /** Title shown in browser print dialog */
  title?: string;
  /** Disable the button while data is loading */
  disabled?: boolean;
  /** Skip content validation before printing */
  skipValidation?: boolean;
  /**
   * Button visual variant:
   * - "default" — filled dark button (primary action)
   * - "outline" — bordered button
   * - "icon"    — icon-only circle button
   * - "ghost"   — minimal text button
   */
  variant?: "default" | "outline" | "icon" | "ghost";
  /** Additional CSS classes */
  className?: string;
  /** Called just before print dialog opens */
  onBeforePrint?: () => void;
  /** Called after print dialog closes */
  onAfterPrint?: () => void;
}

const VARIANT_CLASSES: Record<string, string> = {
  default:
    "px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm",
  outline:
    "px-4 py-2 bg-white hover:bg-slate-50 border border-border text-slate-700 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
  icon:
    "p-2 bg-white hover:bg-slate-50 border border-border text-slate-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
  ghost:
    "px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
};

export function PrintButton({
  targetId,
  label = "Print / Save PDF",
  pageSize = "A4",
  margin = "12mm",
  watermark,
  title,
  disabled = false,
  skipValidation = false,
  variant = "default",
  className = "",
  onBeforePrint,
  onAfterPrint,
}: PrintButtonProps) {
  const handleClick = () => {
    if (disabled) return;
    onBeforePrint?.();

    // Register afterprint callback before calling print
    if (onAfterPrint) {
      window.addEventListener("afterprint", onAfterPrint, { once: true });
    }

    PrintService.print(targetId, {
      pageSize,
      margin,
      watermark,
      title,
      skipValidation,
    });
  };

  const variantClass = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.default;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={variant === "icon" ? label : undefined}
      className={`${variantClass} ${className}`.trim()}
    >
      <Printer className={variant === "icon" ? "w-4 h-4" : "w-4 h-4"} />
      {variant !== "icon" && <span>{label}</span>}
    </button>
  );
}

export default PrintButton;
