"use client";

import React, { useState, useRef } from "react";
import {
  Receipt,
  Printer,
  Save,
  RotateCcw,
  Sparkles,
  Sliders,
  FileText,
  Layers,
  Palette,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Scissors,
  Check,
  ChevronDown,
  Layout,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  Eye,
  Settings2,
  Building2,
  Phone,
  Mail,
  MapPin,
  Image as ImageIcon,
  Award,
  Tag,
  Undo2,
  Upload,
  Trash2,
  Loader2,
} from "lucide-react";

import { useReceiptConfig } from "@/app/hooks/useReceiptConfig";
import { useUpload } from "@/app/hooks/useUpload";
import {
  RECEIPT_PRESETS,
  ReceiptConfig,
} from "@/lib/types/receipt-builder";
import { BajrangSlipCard } from "@/app/components/receipts/DynamicReceiptDocument";


// Sample mock data for realistic preview rendering
const MOCK_RECEIPT_DATA = {
  receiptNo: "REC-2026-0891",
  date: "25 Oct 2026",
  time: "11:45 AM",
  session: "2026-2027",
  billingRange: "Quarter 3 (Oct - Dec 2026)",
  paymentMethod: "UPI / Google Pay",
  transactionId: "UPI/392819827361",
  student: {
    name: "Rahul Sharma",
    admissionNo: "BSS-2024-042",
    rollNo: "14",
    className: "Class 10th",
    section: "A",
    fatherName: "Shri Mukesh Sharma",
    motherName: "Smt. Sunita Sharma",
    phone: "+91 98290 12345",
  },
  items: [
    {
      sno: 1,
      head: "Tuition Fee",
      total: 600,
      paidBefore: 0,
      discount: 100,
      paidNow: 500,
      totalPaid: 500,
      outstanding: 0,
      status: "Paid",
    },
    {
      sno: 2,
      head: "Previous Fee",
      total: 3000,
      paidBefore: 0,
      discount: 0,
      paidNow: 3000,
      totalPaid: 3000,
      outstanding: 0,
      status: "Paid",
    },
  ],
  totals: {
    grossFee: 3600,
    paidBeforeTotal: 0,
    discountTotal: 100,
    paidNowTotal: 3500,
    totalPaidOverall: 3500,
    balanceDue: 0,
    amountInWords: "Three Thousand Five Hundred Rupees Only",
    remarks: "Received with thanks.",
  },
};

type ActiveSection =
  | "presets"
  | "paper"
  | "header"
  | "student"
  | "columns"
  | "summary"
  | "footer";

export default function ReceiptBuilder() {
  const {
    config,
    schoolInfo,
    isLoading,
    isSaving,
    saveStatus,
    isDirty,
    updateConfig,
    updateField,
    loadPreset,
    resetToDefault,
    saveConfig,
  } = useReceiptConfig();

  const [activeSection, setActiveSection] = useState<ActiveSection>("presets");
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading: isUploadingLogo, uploadFile } = useUpload();

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Instant local preview for immediate responsive feedback
    const localPreviewUrl = URL.createObjectURL(file);
    updateField("custom_logo_url", localPreviewUrl);

    // Upload to server / Cloudinary
    const uploadedUrl = await uploadFile(file);
    if (uploadedUrl) {
      updateField("custom_logo_url", uploadedUrl);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };


  // Trigger clean print via an invisible iframe (No duplicate popup window, no stuck state)
  const handleTestPrint = () => {
    if (!previewRef.current) return;

    // Remove any previously created print iframe
    const existingFrame = document.getElementById("__receipt_test_print_frame__");
    if (existingFrame) {
      existingFrame.remove();
    }

    const iframe = document.createElement("iframe");
    iframe.id = "__receipt_test_print_frame__";
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.style.visibility = "hidden";
    iframe.style.zIndex = "-9999";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const pageStyles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map((el) => el.outerHTML)
      .join("\n");

    const printContent = previewRef.current.innerHTML;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${schoolName} - ${config.receipt_title || "Fee Receipt"}</title>
          ${pageStyles}
          <style>
            @page {
              size: ${config.layout_mode === "side_by_side" ? "A4 landscape" : config.paper_size === "A5" ? "A5 portrait" : config.paper_size === "POS-80mm" ? "80mm auto" : "A4 portrait"};
              margin: ${config.layout_mode === "side_by_side" || config.template_id === "bajrang_dual_slip" ? "4mm" : config.paper_size === "POS-80mm" ? "3mm" : "6mm"};
            }
            body {
              font-family: ${
                config.font_family === "mono"
                  ? "monospace"
                  : config.font_family === "serif"
                  ? "Georgia, serif"
                  : "system-ui, -apple-system, sans-serif"
              };
              color: #0f172a !important;
              background: #fff !important;
              margin: 0;
              padding: 4px;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            * { box-sizing: border-box; }
            .receipt-branding-box {
              display: flex !important;
              visibility: visible !important;
            }
            .receipt-branding-box * {
              visibility: visible !important;
            }
            div[class*="header"] {
              display: revert !important;
            }
            .receipt-logo-container {
              overflow: hidden !important;
              flex-shrink: 0 !important;
              display: flex !important;
            }
            .receipt-logo-img {
              display: block !important;
              object-fit: contain !important;
            }
            table { border-collapse: collapse !important; width: 100% !important; table-layout: fixed !important; }
            .cut-line {
              border-top: 1.5px dashed #94a3b8;
              margin: 16px 0;
              text-align: center;
              font-size: 10px;
              color: #64748b;
              position: relative;
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: center; width: 100%; padding: 12px 0;">${printContent}</div>
        </body>
      </html>
    `);
    doc.close();

    // Small timeout to allow stylesheets inside iframe to parse, then print cleanly
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Print error:", err);
      } finally {
        setTimeout(() => {
          iframe.remove();
        }, 1500);
      }
    }, 250);
  };


  const schoolName = config.school_name_custom || schoolInfo.name || "Bajrang Shikshan Sansthan Secondary School";
  const schoolSubtitle = config.school_subtitle_custom || schoolInfo.subtitle || "Padu Khurd | Padu Kurd (Nagaur)";
  const schoolAddress = config.address_custom || schoolInfo.address || "Padu Khurd, Nagaur, Rajasthan";
  const schoolContact = config.contact_custom || schoolInfo.phone || "+91 98765 43210";
  const schoolEmail = config.email_custom || "";
  const schoolLogo = config.custom_logo_url || schoolInfo.logo_url || "";
  const schoolUdise = config.udise_or_reg_no || "";
  const primaryCopyLabel = config.copy_label_primary || config.copy_labels?.[0] || "STUDENT COPY";
  const secondaryCopyLabel = config.copy_label_secondary || config.copy_labels?.[1] || "OFFICE / SCHOOL COPY";

  return (
    <div className="space-y-6 text-left">
      {/* ── Top Header Bar ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="p-2 bg-primary/10 text-primary rounded-xl">
              <Sliders className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Dynamic Receipt Builder & Layout Designer
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {config.template_name}
            </span>
            {isDirty && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Unsaved Changes
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Configure receipt position, paper size (A4 / A5 / POS), columns, student info fields, logo placement, and dual-slip copy options in real time.
          </p>
        </div>

        {/* Action Buttons: Neatly aligned in 1 single horizontal row */}
        <div className="shrink-0 flex items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={resetToDefault}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Reset to default template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          <button
            type="button"
            onClick={handleTestPrint}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Open test print dialog"
          >
            <Printer className="w-3.5 h-3.5" />
            Test Print
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={saveConfig}
            className="px-4.5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>

      {/* ── Status Feedback Alert ─────────────────────────────────────── */}
      {saveStatus && (
        <div
          className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all ${
            saveStatus.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
          }`}
        >
          {saveStatus.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{saveStatus.message}</span>
        </div>
      )}

      {/* ── Main Two-Column Studio Layout ─────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ── LEFT PANE: Configuration Controls (5 Cols) ──────────────── */}
        <div className="xl:col-span-5 space-y-4">
          {/* Section Navigation Pills */}
          <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-2 shadow-2xs flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: "presets", label: "Presets", icon: Sparkles },
              { id: "paper", label: "Paper & Color", icon: Palette },
              { id: "header", label: "Header & Logo", icon: AlignCenter },
              { id: "student", label: "Student Info", icon: FileText },
              { id: "columns", label: "Fee Columns", icon: Layers },
              { id: "summary", label: "Summary", icon: Receipt },
              { id: "footer", label: "Sign & Footer", icon: CheckCircle2 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id as ActiveSection)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Section 1: Presets & Quick Catalog */}
          {activeSection === "presets" && (
            <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Quick Ready-to-Use Presets
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Click any preset to apply layout, columns, and structure instantly.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {RECEIPT_PRESETS.map((p) => {
                  const isSelected = config.template_id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => loadPreset(p.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between text-left group ${
                        isSelected
                          ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs"
                          : "border-border hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9.5px] font-black uppercase tracking-wider text-primary">
                            {p.badge}
                          </span>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                              <Check className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                          {p.name}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Paper: {p.config.paper_size || "A4"}</span>
                        <span className="font-semibold text-primary group-hover:underline">Apply Preset →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Paper & Styling */}
          {activeSection === "paper" && (
            <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-5 shadow-xs space-y-5">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Paper Format & Layout Mode
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Select paper sheet dimension and single or dual voucher copy format.
                </p>
              </div>

              {/* Paper Size */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Paper Size / Slip Medium
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "A4", label: "A4 Full Sheet", sub: "210 × 297 mm" },
                    { id: "A5", label: "A5 Half Sheet", sub: "148 × 210 mm" },
                    { id: "POS-80mm", label: "80mm POS Roll", sub: "Thermal Slip" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateField("paper_size", item.id as any)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        config.paper_size === item.id
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                          : "border-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                      }`}
                    >
                      <div className="text-xs">{item.label}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{item.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout Mode (Copies) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Print Copies per Sheet
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "single", label: "Single Copy", sub: "1 Slip per Page" },
                    { id: "side_by_side", label: "Dual Side-by-Side", sub: "School + Office (A4 Land.)" },
                    { id: "dual", label: "Dual Copy Vertical", sub: "Top & Bottom (Cut Line)" },
                    { id: "triple", label: "Challan 3-Part", sub: "Bank + School + Student" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateField("layout_mode", item.id as any)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        config.layout_mode === item.id
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                          : "border-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                      }`}
                    >
                      <div className="text-xs">{item.label}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{item.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Branding Accent Color
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { color: "#0f172a", name: "Slate Navy" },
                    { color: "#1e3a8a", name: "Royal Blue" },
                    { color: "#065f46", name: "Emerald Forest" },
                    { color: "#4c1d95", name: "Deep Purple" },
                    { color: "#831843", name: "Wine Maroon" },
                    { color: "#18181b", name: "Monochrome Black" },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => updateField("primary_color", c.color)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center ${
                        config.primary_color === c.color
                          ? "scale-110 border-primary ring-2 ring-primary/30"
                          : "border-white dark:border-slate-800"
                      }`}
                      style={{ backgroundColor: c.color }}
                      title={c.name}
                    >
                      {config.primary_color === c.color && (
                        <Check className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={config.primary_color || "#0f172a"}
                    onChange={(e) => updateField("primary_color", e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-border"
                    title="Custom hex color"
                  />
                  <span className="text-[11px] font-mono text-slate-500">
                    {config.primary_color}
                  </span>
                </div>
              </div>

              {/* Font Family */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Typography Style
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "sans", label: "Modern Sans", font: "font-sans" },
                    { id: "serif", label: "Formal Serif", font: "font-serif" },
                    { id: "mono", label: "Thermal Mono", font: "font-mono" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateField("font_family", item.id as any)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        config.font_family === item.id
                          ? "border-primary bg-primary/10 text-primary font-bold"
                          : "border-border text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className={`text-xs ${item.font}`}>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Header & Branding (Editable Custom Data) */}
          {activeSection === "header" && (
            <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Header & School Branding
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Receipt par aane wala school name, branch, address, contact, affiliation, logo aur custom text yaha se change karein.
                </p>
              </div>

              {/* 1. School Name & Subtitle Card */}
              <div className="p-3.5 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    School Name & Subtitle
                  </span>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.show_school_name}
                      onChange={(e) => updateField("show_school_name", e.target.checked)}
                      className="w-3.5 h-3.5 accent-primary rounded cursor-pointer"
                    />
                    <span>Show Name</span>
                  </label>
                </div>

                {config.show_school_name && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        School Name on Receipt
                      </label>
                      {config.school_name_custom && (
                        <button
                          type="button"
                          onClick={() => updateField("school_name_custom", "")}
                          className="text-[10px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Undo2 className="w-3 h-3" /> Reset to Profile Default
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={config.school_name_custom}
                      onChange={(e) => updateField("school_name_custom", e.target.value)}
                      placeholder={schoolInfo.name || "Bajrang Shikshan Sansthan Secondary School"}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-border rounded-xl text-xs outline-none focus:border-primary font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                {/* Subtitle / Branch */}
                <div className="pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between mb-1">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.show_subtitle}
                        onChange={(e) => updateField("show_subtitle", e.target.checked)}
                        className="w-3.5 h-3.5 accent-primary rounded cursor-pointer"
                      />
                      <span>Branch / Subtitle / Tagline</span>
                    </label>
                    {config.school_subtitle_custom && (
                      <button
                        type="button"
                        onClick={() => updateField("school_subtitle_custom", "")}
                        className="text-[10px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Undo2 className="w-3 h-3" /> Reset
                      </button>
                    )}
                  </div>
                  {config.show_subtitle && (
                    <input
                      type="text"
                      value={config.school_subtitle_custom}
                      onChange={(e) => updateField("school_subtitle_custom", e.target.value)}
                      placeholder={schoolInfo.subtitle || "Padu Khurd | Padu Kurd (Nagaur)"}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-xs outline-none focus:border-primary"
                    />
                  )}
                </div>
              </div>

              {/* 2. Address Line Card */}
              <div className="p-3.5 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    Campus Address Line
                  </span>
                  <input
                    type="checkbox"
                    checked={config.show_address}
                    onChange={(e) => updateField("show_address", e.target.checked)}
                    className="w-3.5 h-3.5 accent-primary rounded cursor-pointer"
                  />
                </div>

                {config.show_address && (
                  <div>
                    <input
                      type="text"
                      value={config.address_custom}
                      onChange={(e) => updateField("address_custom", e.target.value)}
                      placeholder={schoolInfo.address || "Padu Khurd, Nagaur, Rajasthan"}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-xs outline-none focus:border-primary"
                    />
                    <div className="text-[10px] text-slate-400 mt-1">
                      Leave empty to automatically use school profile address.
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Contact & Email Card */}
              <div className="p-3.5 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    Contact, Phone & Email
                  </span>
                  <input
                    type="checkbox"
                    checked={config.show_contact}
                    onChange={(e) => updateField("show_contact", e.target.checked)}
                    className="w-3.5 h-3.5 accent-primary rounded cursor-pointer"
                  />
                </div>

                {config.show_contact && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Phone / Helpline Numbers
                      </label>
                      <input
                        type="text"
                        value={config.contact_custom}
                        onChange={(e) => updateField("contact_custom", e.target.value)}
                        placeholder={schoolInfo.phone || "+91 98765 43210"}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-xs outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Email / Official Website
                      </label>
                      <input
                        type="text"
                        value={config.email_custom}
                        onChange={(e) => updateField("email_custom", e.target.value)}
                        placeholder="info@school.com • schoollife.in"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-xs outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Affiliation, Board & U-DISE Code Card */}
              <div className="p-3.5 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    Affiliation & Board / Registration Code
                  </span>
                  <input
                    type="checkbox"
                    checked={config.show_affiliation}
                    onChange={(e) => updateField("show_affiliation", e.target.checked)}
                    className="w-3.5 h-3.5 accent-primary rounded cursor-pointer"
                  />
                </div>

                {config.show_affiliation && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Affiliation / Recognition Text
                      </label>
                      <input
                        type="text"
                        value={config.affiliation_text}
                        onChange={(e) => updateField("affiliation_text", e.target.value)}
                        placeholder="Recognised & Affiliated by Dept. of Education, Rajasthan"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-xs outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        School Code / U-DISE / Registration No
                      </label>
                      <input
                        type="text"
                        value={config.udise_or_reg_no}
                        onChange={(e) => updateField("udise_or_reg_no", e.target.value)}
                        placeholder="School Code: 261405 • U-DISE: 08123456789"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-xs outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Logo & Alignment Card */}
              <div className="p-3.5 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                    School Logo & Placement
                  </span>
                  <input
                    type="checkbox"
                    checked={config.show_logo}
                    onChange={(e) => updateField("show_logo", e.target.checked)}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                </div>

                {config.show_logo && (
                  <div className="space-y-3 pt-1">
                    {/* Alignment */}
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Logo Position Alignment
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "left", label: "Left", icon: AlignLeft },
                          { id: "center", label: "Center", icon: AlignCenter },
                          { id: "right", label: "Right", icon: AlignRight },
                        ].map((pos) => {
                          const Icon = pos.icon;
                          return (
                            <button
                              key={pos.id}
                              type="button"
                              onClick={() => updateField("logo_position", pos.id as any)}
                              className={`p-1.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer ${
                                config.logo_position === pos.id
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {pos.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Size */}
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Logo Size on Slip
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: "small", label: "Small (50px)" },
                          { id: "medium", label: "Medium (75px)" },
                          { id: "large", label: "Large (95px)" },
                          { id: "xl", label: "XL (120px)" },
                        ].map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => updateField("logo_size", s.id as any)}
                            className={`p-1.5 rounded-lg border text-[10.5px] font-bold text-center cursor-pointer transition-colors ${
                              config.logo_size === s.id
                                ? "border-primary bg-primary/10 text-primary shadow-xs"
                                : "border-border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>


                    {/* Direct Logo Upload Area */}
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />

                      <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                        Upload Receipt Logo Image
                      </label>

                      {/* Upload Box / Card */}
                      <div className="p-3 rounded-xl border border-dashed border-border bg-white dark:bg-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {schoolLogo ? (
                            <div className="w-12 h-12 rounded-lg border border-border bg-slate-50 dark:bg-slate-900 p-1 flex items-center justify-center shrink-0">
                              <img
                                src={schoolLogo}
                                alt="Current Logo"
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}

                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                              {config.custom_logo_url
                                ? "Custom Receipt Logo Uploaded"
                                : schoolInfo.logo_url
                                ? "Using School Profile Logo"
                                : "No Logo Uploaded Yet"}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              PNG, JPG, WebP, SVG (Recommended 200×200px)
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                          <button
                            type="button"
                            disabled={isUploadingLogo}
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {isUploadingLogo ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5" />
                                {schoolLogo ? "Change Logo" : "Upload Logo"}
                              </>
                            )}
                          </button>

                          {config.custom_logo_url && (
                            <button
                              type="button"
                              onClick={() => updateField("custom_logo_url", "")}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="Reset to default school profile logo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Reset
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Optional URL input fallback */}
                      <div className="mt-2.5">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          Or Paste External Logo URL:
                        </label>
                        <input
                          type="text"
                          value={config.custom_logo_url}
                          onChange={(e) => updateField("custom_logo_url", e.target.value)}
                          placeholder={schoolInfo.logo_url || "https://example.com/logo.png"}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-xs outline-none focus:border-primary text-slate-700 dark:text-slate-300"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>


              {/* 6. Receipt Title & Copy Labels Card */}
              <div className="p-3.5 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-500" />
                  Receipt Title Banner & Copy Labels
                </span>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Receipt Banner Heading
                  </label>
                  <input
                    type="text"
                    value={config.receipt_title}
                    onChange={(e) => updateField("receipt_title", e.target.value)}
                    placeholder="FEES PAYMENT RECEIPT"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-border rounded-xl text-xs outline-none focus:border-primary font-bold"
                  />
                </div>

                <div className="pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.show_copy_badge}
                        onChange={(e) => updateField("show_copy_badge", e.target.checked)}
                        className="w-3.5 h-3.5 accent-primary rounded cursor-pointer"
                      />
                      <span>Show Slip Copy Badges</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      (Dual / 2-Copy mode only)
                    </span>
                  </div>

                  {config.show_copy_badge && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          Primary Slip Label
                        </label>
                        <input
                          type="text"
                          value={config.copy_label_primary}
                          onChange={(e) => updateField("copy_label_primary", e.target.value)}
                          placeholder="STUDENT COPY"
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-xs outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          Secondary Slip Label (Dual Copy)
                        </label>
                        <input
                          type="text"
                          value={config.copy_label_secondary}
                          onChange={(e) => updateField("copy_label_secondary", e.target.value)}
                          placeholder="OFFICE / SCHOOL COPY"
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-border rounded-xl text-xs outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* Section 4: Student & Details Metadata */}
          {activeSection === "student" && (
            <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Student & Receipt Metadata Layout
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Select how student particulars and receipt numbers appear.
                </p>
              </div>

              {/* Layout mode */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Information Layout Grid
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "grid-2", label: "2 Columns Grid", desc: "Left & Right" },
                    { id: "grid-3", label: "3 Columns Grid", desc: "Compact 3-Way" },
                    { id: "dashed-list", label: "Dashed List", desc: "Clean Row List" },
                  ].map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => updateField("meta_layout", l.id as any)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        config.meta_layout === l.id
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                          : "border-border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="text-xs">{l.label}</div>
                      <div className="text-[9.5px] opacity-75 mt-0.5">{l.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles for each field */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  Toggle Fields on Slip
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "show_student_name", label: "Student Name" },
                    { key: "show_admission_no", label: "Admission Number" },
                    { key: "show_roll_no", label: "Roll Number" },
                    { key: "show_class", label: "Class & Section" },
                    { key: "show_father_name", label: "Father's Name" },
                    { key: "show_mother_name", label: "Mother's Name" },
                    { key: "show_phone", label: "Phone Number" },
                    { key: "show_receipt_no", label: "Receipt Number" },
                    { key: "show_payment_date", label: "Payment Date" },
                    { key: "show_payment_method", label: "Payment Mode (Cash/UPI)" },
                    { key: "show_academic_session", label: "Academic Session" },
                    { key: "show_billing_range", label: "Billing Term / Quarter" },
                    { key: "show_transaction_id", label: "UPI / Transaction Ref" },
                  ].map((field) => (
                    <label
                      key={field.key}
                      className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={!!config[field.key as keyof ReceiptConfig]}
                        onChange={(e) => updateField(field.key as any, e.target.checked)}
                        className="w-3.5 h-3.5 accent-primary rounded"
                      />
                      <span>{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Fee Table Columns */}
          {activeSection === "columns" && (
            <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Fee Breakdown Table Columns
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Select which financial columns appear in the central ledger table.
                </p>
              </div>

              {/* Table Theme & Density */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Table Border Style
                  </label>
                  <select
                    value={config.table_theme}
                    onChange={(e) => updateField("table_theme", e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-border rounded-xl text-xs outline-none focus:border-primary"
                  >
                    <option value="bordered">Bordered Grid (Official)</option>
                    <option value="clean">Clean Minimalist</option>
                    <option value="striped">Zebra Striped Rows</option>
                    <option value="minimal">Open Air (No Outlines)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Row Density
                  </label>
                  <select
                    value={config.table_density}
                    onChange={(e) => updateField("table_density", e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-border rounded-xl text-xs outline-none focus:border-primary"
                  >
                    <option value="compact">Compact (Saves Paper)</option>
                    <option value="normal">Normal Standard</option>
                    <option value="spacious">Spacious (Large Font)</option>
                  </select>
                </div>
              </div>

              {/* Column Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Active Table Columns
                </div>
                {[
                  {
                    key: "show_serial_no",
                    label: "S.No (#)",
                    desc: "Sequential row index counter",
                  },
                  {
                    key: "show_fee_head",
                    label: "Fee type (Mandatory)",
                    desc: "Tuition Fee, Previous Fee, etc. (Always included in receipt)",
                    required: true,
                  },
                  {
                    key: "show_total_amount",
                    label: "Due Amount (Rs.)",
                    desc: "Annual or gross payable due amount for this head",
                  },
                  {
                    key: "show_paid_before",
                    label: "Paid Before (Rs.)",
                    desc: "Past advance installments already deposited",
                  },
                  {
                    key: "show_discount",
                    label: "Discount (Rs.)",
                    desc: "Scholarship or concession discount applied",
                  },
                  {
                    key: "show_paid_now",
                    label: "Paid (Rs.)",
                    desc: "Immediate amount being collected in this receipt",
                  },
                  {
                    key: "show_total_paid",
                    label: "Cumulative Total Paid",
                    desc: "Sum of prior payments and current payment",
                  },
                  {
                    key: "show_outstanding",
                    label: "Outstanding / Balance Due",
                    desc: "Remaining unpaid fee after this receipt",
                  },
                  {
                    key: "show_status_badge",
                    label: "Status Badge (Paid / Partial)",
                    desc: "Clear visual pill tag for audit",
                  },
                ].map((col: any) => {
                  const isChecked = col.required ? true : !!config[col.key as keyof ReceiptConfig];
                  return (
                    <label
                      key={col.key}
                      className={`flex items-start gap-2.5 p-2 rounded-xl border transition-colors ${
                        col.required
                          ? "bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 cursor-default"
                          : isChecked
                          ? "bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 cursor-pointer"
                          : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30 opacity-60 cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={col.required}
                        onChange={(e) => {
                          if (!col.required) updateField(col.key as any, e.target.checked);
                        }}
                        className="w-4 h-4 mt-0.5 accent-primary rounded disabled:opacity-60"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{col.label}</span>
                          {col.required && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 rounded">
                              Required
                            </span>
                          )}
                        </div>
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                          {col.desc}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 6: Summary & Totals */}
          {activeSection === "summary" && (
            <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Summary Box & Amount in Words
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Configure the bottom financial summary card and verification text.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  {
                    key: "show_subtotal",
                    label: "Show Gross Total",
                    desc: "Total fee sum of all item rows",
                  },
                  {
                    key: "show_discount_total",
                    label: "Show Total Discount / Concession",
                    desc: "Deduction row if any concession is applied",
                  },
                  {
                    key: "show_net_paid",
                    label: "Show Net Amount Paid Now",
                    desc: "Primary highlighted collected amount",
                  },
                  {
                    key: "show_total_balance",
                    label: "Show Remaining Balance Due",
                    desc: "Prominent balance reminder box for parents",
                  },
                  {
                    key: "show_amount_in_words",
                    label: "Amount in Words",
                    desc: "e.g., 'Ten Thousand Two Hundred Fifty Rupees Only'",
                  },
                  {
                    key: "show_payment_remarks",
                    label: "Show Cashier Remarks / Notes",
                    desc: "Custom remarks like 'Next due date 10 Dec'",
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-start gap-2.5 p-2 rounded-xl border border-border/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!config[item.key as keyof ReceiptConfig]}
                      onChange={(e) => updateField(item.key as any, e.target.checked)}
                      className="w-4 h-4 mt-0.5 accent-primary rounded"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.label}
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                        {item.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Section 7: Signatures & Footer */}
          {activeSection === "footer" && (
            <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Signatures & Footer Disclaimer
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Authority sign lines, school stamp box, and non-refundable terms notice.
                </p>
              </div>

              {/* Cashier Sign */}
              <div className="space-y-1.5 p-3 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Cashier / Accountant Signature Line
                  </span>
                  <input
                    type="checkbox"
                    checked={config.show_cashier_sign}
                    onChange={(e) => updateField("show_cashier_sign", e.target.checked)}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                </div>
                {config.show_cashier_sign && (
                  <input
                    type="text"
                    value={config.cashier_sign_label}
                    onChange={(e) => updateField("cashier_sign_label", e.target.value)}
                    placeholder="Cashier / Accounts Officer"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-border rounded-lg text-xs outline-none focus:border-primary"
                  />
                )}
              </div>

              {/* Principal Sign */}
              <div className="space-y-1.5 p-3 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Principal / Authority Signature Line
                  </span>
                  <input
                    type="checkbox"
                    checked={config.show_principal_sign}
                    onChange={(e) => updateField("show_principal_sign", e.target.checked)}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                </div>
                {config.show_principal_sign && (
                  <input
                    type="text"
                    value={config.principal_sign_label}
                    onChange={(e) => updateField("principal_sign_label", e.target.value)}
                    placeholder="Principal / Authorized Signatory"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-border rounded-lg text-xs outline-none focus:border-primary"
                  />
                )}
              </div>

              {/* Parent Sign */}
              <div className="space-y-1.5 p-3 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Parent / Depositor Signature Line
                  </span>
                  <input
                    type="checkbox"
                    checked={config.show_parent_sign}
                    onChange={(e) => updateField("show_parent_sign", e.target.checked)}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                </div>
                {config.show_parent_sign && (
                  <input
                    type="text"
                    value={config.parent_sign_label}
                    onChange={(e) => updateField("parent_sign_label", e.target.value)}
                    placeholder="Parent / Guardian Signature"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-border rounded-lg text-xs outline-none focus:border-primary"
                  />
                )}
              </div>

              {/* Seal Stamp */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Official School Seal / Stamp Box
                  </div>
                  <div className="text-[10.5px] text-slate-500">
                    Includes a designated round stamp outline for physical stamping
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.show_seal_stamp}
                  onChange={(e) => updateField("show_seal_stamp", e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
              </div>

              {/* Disclaimer */}
              <div className="space-y-1.5 p-3 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Legal Disclaimer Note
                  </span>
                  <input
                    type="checkbox"
                    checked={config.show_disclaimer}
                    onChange={(e) => updateField("show_disclaimer", e.target.checked)}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                </div>
                {config.show_disclaimer && (
                  <textarea
                    rows={2}
                    value={config.disclaimer_text}
                    onChange={(e) => updateField("disclaimer_text", e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-border rounded-lg text-xs outline-none focus:border-primary resize-none"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANE: Realistic Live Slip Preview Sheet (7 Cols) ──── */}
        <div className="xl:col-span-7 space-y-3 sticky top-4">
          {/* Preview Bar */}
          <div className="bg-slate-100 dark:bg-slate-800/70 border border-border rounded-2xl px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                Interactive Live Preview Sheet
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white dark:bg-slate-900 border border-border text-slate-600 dark:text-slate-300">
                {config.paper_size} • {config.layout_mode.toUpperCase()}
              </span>
            </div>

            <div className="text-[11px] text-slate-500 font-mono">
              Auto-updating
            </div>
          </div>

          {/* Paper Canvas Container */}
          <div
            className="bg-slate-200/80 dark:bg-slate-950 p-4 md:p-6 rounded-2xl border border-border/80 overflow-x-auto max-h-[82vh] overflow-y-auto shadow-inner"
            style={{
              fontFamily:
                config.font_family === "mono"
                  ? "ui-monospace, monospace"
                  : config.font_family === "serif"
                  ? "Georgia, Cambria, serif"
                  : "system-ui, -apple-system, sans-serif",
            }}
          >
            {/* The printable document reference */}
            <div
              ref={previewRef}
              id="printable-receipt-builder"
              className="space-y-6 mx-auto transition-all"
              style={{
                maxWidth:
                  config.template_id === "bajrang_dual_slip" || config.template_id === "bajrang_official_slip"
                    ? "640px"
                    : config.layout_mode === "side_by_side"
                    ? "1020px"
                    : config.paper_size === "POS-80mm"
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
              {config.template_id === "bajrang_dual_slip" || config.template_id === "bajrang_official_slip" ? (
                <div className="w-full max-w-[620px] mx-auto">
                  <BajrangSlipCard
                    schoolName={schoolName}
                    schoolSubtitle={schoolSubtitle}
                    schoolAddress={schoolAddress}
                    schoolContact={schoolContact}
                    schoolEmail={schoolEmail}
                    schoolLogo={schoolLogo}
                    copyLabel={config.copy_label_primary || "OFFICE COPY"}
                    receiptData={MOCK_RECEIPT_DATA as any}
                    primaryColor={config.primary_color}
                  />
                </div>
              ) : (
                <>
                  {/* Slip 1: Primary Copy (e.g. Student Copy) */}
                  <SingleSlipSheet
                    config={config}
                    schoolName={schoolName}
                    schoolSubtitle={schoolSubtitle}
                    schoolAddress={schoolAddress}
                    schoolContact={schoolContact}
                    schoolEmail={schoolEmail}
                    schoolLogo={schoolLogo}
                    schoolUdise={schoolUdise}
                    copyLabel={config.layout_mode === "single" ? "" : primaryCopyLabel}
                  />

                  {/* Perforated Cut Line for Dual or Triple Copy */}
                  {config.layout_mode !== "single" && (
                    <div className="relative py-2 flex items-center justify-center cut-line">
                      <div className="w-full border-t border-dashed border-slate-400 dark:border-slate-600" />
                      <span className="absolute bg-slate-200 dark:bg-slate-950 print:bg-white px-3 text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Scissors className="w-3.5 h-3.5" />
                        Cut Along This Line For Records
                      </span>
                    </div>
                  )}

                  {/* Slip 2: Secondary Copy (e.g. Office Copy) */}
                  {config.layout_mode !== "single" && (
                    <SingleSlipSheet
                      config={config}
                      schoolName={schoolName}
                      schoolSubtitle={schoolSubtitle}
                      schoolAddress={schoolAddress}
                      schoolContact={schoolContact}
                      schoolEmail={schoolEmail}
                      schoolLogo={schoolLogo}
                      schoolUdise={schoolUdise}
                      copyLabel={secondaryCopyLabel}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SUB-COMPONENT: Individual Slip Sheet ───────────────────────────────
function SingleSlipSheet({
  config,
  schoolName,
  schoolSubtitle,
  schoolAddress,
  schoolContact,
  schoolEmail,
  schoolLogo,
  schoolUdise,
  copyLabel,
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
              {MOCK_RECEIPT_DATA.receiptNo}
            </span>
          </div>
        )}

        {config.show_payment_date && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Date & Time:</span>
            <span className="font-semibold text-slate-800">
              {MOCK_RECEIPT_DATA.date} ({MOCK_RECEIPT_DATA.time})
            </span>
          </div>
        )}

        {config.show_student_name && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Student Name:</span>
            <span className="font-black text-slate-900">
              {MOCK_RECEIPT_DATA.student.name}
            </span>
          </div>
        )}

        {config.show_admission_no && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Admission No:</span>
            <span className="font-mono font-bold text-slate-800">
              {MOCK_RECEIPT_DATA.student.admissionNo}
            </span>
          </div>
        )}

        {config.show_class && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Class / Section:</span>
            <span className="font-bold text-slate-800">
              {MOCK_RECEIPT_DATA.student.className} - {MOCK_RECEIPT_DATA.student.section}
            </span>
          </div>
        )}

        {config.show_roll_no && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Roll No:</span>
            <span className="font-bold text-slate-800">
              {MOCK_RECEIPT_DATA.student.rollNo}
            </span>
          </div>
        )}

        {config.show_father_name && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Father's Name:</span>
            <span className="font-semibold text-slate-800">
              {MOCK_RECEIPT_DATA.student.fatherName}
            </span>
          </div>
        )}

        {config.show_mother_name && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Mother's Name:</span>
            <span className="font-semibold text-slate-800">
              {MOCK_RECEIPT_DATA.student.motherName}
            </span>
          </div>
        )}

        {config.show_academic_session && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Session:</span>
            <span className="font-semibold text-slate-800">
              {MOCK_RECEIPT_DATA.session}
            </span>
          </div>
        )}

        {config.show_billing_range && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Billing Period:</span>
            <span className="font-bold text-slate-800">
              {MOCK_RECEIPT_DATA.billingRange}
            </span>
          </div>
        )}

        {config.show_payment_method && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Payment Mode:</span>
            <span className="font-bold text-emerald-700">
              {MOCK_RECEIPT_DATA.paymentMethod}
            </span>
          </div>
        )}

        {config.show_transaction_id && (
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
            <span className="text-slate-500 font-medium">Transaction ID:</span>
            <span className="font-mono text-[10px] text-slate-700">
              {MOCK_RECEIPT_DATA.transactionId}
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

        return (
          <div className="mb-4 overflow-x-auto">
            <table
              className="w-full text-[11px] border border-slate-300 divide-y divide-slate-300"
              style={{ width: "100%", tableLayout: "fixed" }}
            >
              <thead>
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
                    <th className={densityPadding} style={{ width: showDiscount ? "44%" : "54%" }}>
                      Fee type
                    </th>
                  )}
                  {showTotalAmount && (
                    <th className={`text-right ${densityPadding}`} style={{ width: "20%" }}>
                      Due Amount (Rs.)
                    </th>
                  )}
                  {showPaidBefore && (
                    <th className={`text-right ${densityPadding}`} style={{ width: "16%" }}>
                      Paid Before (Rs.)
                    </th>
                  )}
                  {showDiscount && (
                    <th className={`text-right ${densityPadding}`} style={{ width: "16%" }}>
                      Discount (Rs.)
                    </th>
                  )}
                  {showPaidNow && (
                    <th className={`text-right font-black ${densityPadding}`} style={{ width: "20%" }}>
                      Paid (Rs.)
                    </th>
                  )}
                  {showTotalPaid && (
                    <th className={`text-right ${densityPadding}`} style={{ width: "16%" }}>
                      Total Paid (Rs.)
                    </th>
                  )}
                  {showOutstanding && (
                    <th className={`text-right ${densityPadding}`} style={{ width: "16%" }}>
                      Balance Due (Rs.)
                    </th>
                  )}
                  {showStatusBadge && (
                    <th className={`text-center w-16 ${densityPadding}`} style={{ width: "10%" }}>Status</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {MOCK_RECEIPT_DATA.items.map((row, idx) => (
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
                        {row.sno}
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
          if (MOCK_RECEIPT_DATA.totals.balanceDue > 0) {
            showTotalBalance = true;
          }
        }

        const hasLeftSummary = (showAmountInWords && Boolean(MOCK_RECEIPT_DATA.totals.amountInWords)) || (showRemarks && Boolean(MOCK_RECEIPT_DATA.totals.remarks));
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
              {showAmountInWords && (
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                    Amount in Words:
                  </span>
                  <span className="font-black text-slate-900 italic">
                    {MOCK_RECEIPT_DATA.totals.amountInWords}
                  </span>
                </div>
              )}

              {showRemarks && (
                <div className="text-[10.5px] text-slate-600">
                  <span className="font-bold text-slate-800">Note / Remarks: </span>
                  {MOCK_RECEIPT_DATA.totals.remarks}
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
                      ₹{MOCK_RECEIPT_DATA.totals.grossFee.toLocaleString()}
                    </span>
                  </div>
                )}

                {showDiscountTotal && (
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-slate-600">Total Concession:</span>
                    <span className="font-mono text-emerald-600 font-bold">₹0.00</span>
                  </div>
                )}

                {showNetPaid && (
                  <div
                    className="flex items-center justify-between px-3 py-2 text-white font-black"
                    style={{ backgroundColor: config.primary_color || "#0f172a" }}
                  >
                    <span>NET AMOUNT PAID NOW:</span>
                    <span className="font-mono text-sm">
                      ₹{MOCK_RECEIPT_DATA.totals.paidNowTotal.toLocaleString()}
                    </span>
                  </div>
                )}

                {showTotalBalance && (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-amber-50 text-amber-900 font-bold">
                    <span>Remaining Balance Due:</span>
                    <span className="font-mono">
                      ₹{MOCK_RECEIPT_DATA.totals.balanceDue.toLocaleString()}
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
            {showDisclaimer && (
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
