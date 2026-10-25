"use client";

import React, { useState, useMemo } from "react";
import {
  Receipt,
  Search,
  ExternalLink,
  Download,
  Eye,
  CheckCircle2,
  FileText,
  CreditCard,
  Users,
  Wallet,
  Sparkles,
  X,
  Printer,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";

interface ReceiptItem {
  id: string;
  title: string;
  category: "fees" | "student" | "staff" | "accounts";
  categoryLabel: string;
  codeRef?: string;
  isProjectActive?: boolean;
  columnsCount: string;
  columnsList: string[];
  description: string;
  imageSrc: string;
  purpose: string;
  primaryColor: string;
}

const ALL_RECEIPTS: ReceiptItem[] = [
  // ── 1. CURRENT PROJECT FEE RECEIPT VARIATIONS (5 COPIES) ──────────
  {
    id: "receipt_current_v1_full_ledger",
    title: "Current Template 1 • Full 7-Column Ledger (Full Details)",
    category: "fees",
    categoryLabel: "Current Template",
    codeRef: "app/(dashboard)/fees/[studentId]/page.tsx",
    isProjectActive: true,
    columnsCount: "Full 7 Columns",
    columnsList: ["Fee Head", "Total Fee", "Paid Before", "Paid Now", "Total Paid", "Outstanding", "Status"],
    description: "Complete itemized ledger breakdown with full columns, status badges (Paid/Partial), and concession calculations.",
    imageSrc: "/receipts/receipt_current_v1_full_ledger.png",
    purpose: "Standard official computerized receipt for complete accounting and audit compliance.",
    primaryColor: "emerald",
  },
  {
    id: "receipt_current_v2_compact_3col",
    title: "Current Template 2 • Compact 3-Column Slip (Limited Columns)",
    category: "fees",
    categoryLabel: "Current Template",
    codeRef: "app/(dashboard)/fees/[studentId]/page.tsx",
    isProjectActive: true,
    columnsCount: "Limited 3 Columns",
    columnsList: ["S.No", "Fee Particulars Head", "Amount Paid Now"],
    description: "Simplified slip with only essential columns for quick cash window billing without prior balance clutter.",
    imageSrc: "/receipts/receipt_current_v2_compact_3col.png",
    purpose: "Fast counter collection when only the immediate payment amount needs to be shown.",
    primaryColor: "sky",
  },
  {
    id: "receipt_current_v3_standard_4col",
    title: "Current Template 3 • Standard 4-Column Due Ledger",
    category: "fees",
    categoryLabel: "Current Template",
    codeRef: "app/(dashboard)/fees/[studentId]/page.tsx",
    isProjectActive: true,
    columnsCount: "Standard 4 Columns",
    columnsList: ["Fee Head Particulars", "Total Annual Fee", "Paid Now", "Remaining Due"],
    description: "Balanced format showing annual fee, current payment, remaining dues, and next due date reminder.",
    imageSrc: "/receipts/receipt_current_v3_standard_4col.png",
    purpose: "Clear parent billing showing both current payment and remaining pending dues.",
    primaryColor: "blue",
  },
  {
    id: "receipt_current_v4_summary_minimal",
    title: "Current Template 4 • Minimal Summary Card (Kam Details)",
    category: "fees",
    categoryLabel: "Current Template",
    codeRef: "app/(dashboard)/fees/[studentId]/page.tsx",
    isProjectActive: true,
    columnsCount: "Minimal 2 Rows",
    columnsList: ["Academic Summary", "Net Amount Paid", "Paid in Full Badge"],
    description: "High-level summary card with minimum details, dark status banner, and gross net total.",
    imageSrc: "/receipts/receipt_current_v4_summary_minimal.png",
    purpose: "Concise receipt when detailed breakups are unnecessary and a quick payment proof suffices.",
    primaryColor: "slate",
  },
  {
    id: "receipt_current_v5_annual_audit_max",
    title: "Current Template 5 • Comprehensive Annual Audit Ledger (Max Details)",
    category: "fees",
    categoryLabel: "Current Template",
    codeRef: "app/(dashboard)/fees/[studentId]/page.tsx",
    isProjectActive: true,
    columnsCount: "Maximum 7 Heads + Audit",
    columnsList: ["Fee Head", "Frequency", "Annual Fee", "Paid Before", "Paid Now", "Total Paid", "Outstanding"],
    description: "Master accounts ledger with 7 fee heads, prior installment history log, 3-column metadata, and audit trail bar.",
    imageSrc: "/receipts/receipt_current_v5_annual_audit_max.png",
    purpose: "Annual financial audits, final school clearance, and detailed parent ledger printouts.",
    primaryColor: "indigo",
  },
  {
    id: "bss_dual_receipt",
    title: "Current Template • Dual-Copy A4 Printout (Half Cut)",
    category: "fees",
    categoryLabel: "Current Template",
    codeRef: "app/(dashboard)/fees/[studentId]/page.tsx",
    isProjectActive: true,
    columnsCount: "Dual Copy Cut-Line",
    columnsList: ["STUDENT COPY", "OFFICE COPY", "✂ CUT ALONG THIS LINE ✂", "Fee Structure"],
    description: "Official computerized A4 printout with Student Copy and Office Copy on one sheet with cut line.",
    imageSrc: "/receipts/bss_dual_receipt_clean.jpg",
    purpose: "Physical counter printing where one copy is given to student and one kept for office records.",
    primaryColor: "emerald",
  },
  {
    id: "bss_bank_challan",
    title: "3-Part Bank Fee Challan Voucher",
    category: "fees",
    categoryLabel: "Fee Collection",
    columnsCount: "3 Slips (Triplicate)",
    columnsList: ["Bank Copy", "School Copy", "Student Copy", "Cash Notes Denomination Counter"],
    description: "Perforated 3-part bank deposit challan voucher (SBI Padu Khurd Branch) with currency denomination table.",
    imageSrc: "/receipts/bss_bank_challan_clean.jpg",
    purpose: "For direct bank deposits by parents at the school bank branch counter.",
    primaryColor: "blue",
  },
  {
    id: "bss_portal_receipt",
    title: "Student & Parent Portal E-Receipt",
    category: "fees",
    categoryLabel: "Fee Collection",
    codeRef: "app/student/(portal)/fees/page.tsx",
    isProjectActive: true,
    columnsCount: "2 Columns (Fees | Price)",
    columnsList: ["Fee Head / List", "Price / Amount"],
    description: "Fintech-grade modern digital receipt with instant verification dynamic QR code, UPI reference, and transaction badge.",
    imageSrc: "/receipts/bss_portal_receipt_clean.jpg",
    purpose: "Downloadable digital PDF invoice for student & parent online login portal.",
    primaryColor: "indigo",
  },
  {
    id: "bss_vintage_slip",
    title: "Traditional Bilingual Receipt Book Slip",
    category: "fees",
    categoryLabel: "Fee Collection",
    columnsCount: "Particulars & Amount",
    columnsList: ["Fee Particulars", "Amount in Figures", "Amount in Words"],
    description: "Heritage carbonless physical receipt booklet slip with torn counterfoil stub, red sequential number, and Hindi/English headers.",
    imageSrc: "/receipts/bss_vintage_slip_clean.jpg",
    purpose: "Manual receipt issuance and offline cashier paper book records.",
    primaryColor: "pink",
  },

  // ── 2. STUDENT & PARENT RECEIPTS ─────────────────────────────────
  {
    id: "receipt_admission",
    title: "Student Admission & Registration Receipt",
    category: "student",
    categoryLabel: "Student & Parent",
    columnsCount: "3 Columns",
    columnsList: ["S.No", "Admission Fee Particulars", "Amount"],
    description: "New session admission fee confirmation receipt including prospectus, processing fee, and development fund.",
    imageSrc: "/receipts/receipt_admission.png",
    purpose: "Confirmation of new admission and one-time enrollment charges.",
    primaryColor: "rose",
  },
  {
    id: "receipt_transport",
    title: "School Conveyance & Bus Pass Receipt",
    category: "student",
    categoryLabel: "Student & Parent",
    columnsCount: "4 Columns",
    columnsList: ["S.No", "Coverage Period / Month", "Bus Stop & Route", "Amount"],
    description: "Transport service registration pass with assigned route, stop, vehicle number, and quarterly fee breakdown.",
    imageSrc: "/receipts/receipt_transport.png",
    purpose: "Issuance of student transport admit pass and conveyance fee tracking.",
    primaryColor: "sky",
  },
  {
    id: "receipt_hostel_mess",
    title: "Hostel Accommodation & Dining Mess Receipt",
    category: "student",
    categoryLabel: "Student & Parent",
    columnsCount: "4 Columns",
    columnsList: ["S.No", "Hostel Facility Particulars", "Billing Duration", "Amount"],
    description: "Quarterly boarding room rent, dining hall mess charges, generator electricity, and laundry fee slip.",
    imageSrc: "/receipts/receipt_hostel_mess.png",
    purpose: "Residential student hostel fees and mess food collection.",
    primaryColor: "cyan",
  },
  {
    id: "receipt_exam_board",
    title: "Board Registration & Examination Slip",
    category: "student",
    categoryLabel: "Student & Parent",
    columnsCount: "3 Columns",
    columnsList: ["S.No", "Examination & Registration Fee Particulars", "Amount"],
    description: "RBSE Board examination registration, theory exam surcharge, and practical lab material fee voucher.",
    imageSrc: "/receipts/receipt_exam_board.png",
    purpose: "Board examination form submission and practical fee acknowledgment.",
    primaryColor: "red",
  },
  {
    id: "receipt_bookstore",
    title: "Book Store & School Uniform Cash Memo",
    category: "student",
    categoryLabel: "Student & Parent",
    columnsCount: "5 Columns",
    columnsList: ["S.No", "Item Description", "Qty", "Rate", "Total Amount"],
    description: "Itemized retail cash memo for NCERT book sets, customized notebooks, uniform sets, and school belts/badges.",
    imageSrc: "/receipts/receipt_bookstore.png",
    purpose: "School tuck shop, book counter, and uniform store sale invoices.",
    primaryColor: "amber",
  },
  {
    id: "receipt_certificate",
    title: "Certificate & Document Issuance Fee Receipt",
    category: "student",
    categoryLabel: "Student & Parent",
    codeRef: "lib/models/GeneratedDocument.ts",
    isProjectActive: true,
    columnsCount: "4 Columns",
    columnsList: ["S.No", "Certificate / Document Requested", "Copies", "Fee Amount"],
    description: "Official processing fee receipt for Transfer Certificate (TC), Bonafide Certificate, and Character Certificates.",
    imageSrc: "/receipts/receipt_certificate.png",
    purpose: "Tracking administrative certificate requests and duplicate document fees.",
    primaryColor: "fuchsia",
  },
  {
    id: "receipt_tour_event",
    title: "Educational Tour & Sports Meet Receipt",
    category: "student",
    categoryLabel: "Student & Parent",
    columnsCount: "3 Columns",
    columnsList: ["S.No", "Activity / Excursion Tour Particulars", "Amount"],
    description: "Participation contribution for multi-day educational excursion tour, monuments entry, and sports meet jersey kit.",
    imageSrc: "/receipts/receipt_tour_event.png",
    purpose: "Extracurricular activities, picnics, excursions, and sports day events.",
    primaryColor: "yellow",
  },

  // ── 3. STAFF & TEACHER (PAYROLL & OUTFLOW) ───────────────────────
  {
    id: "receipt_salary_slip",
    title: "Monthly Staff Salary Slip / Pay Voucher",
    category: "staff",
    categoryLabel: "Staff & Payroll",
    codeRef: "app/salary/print/[id]/page.tsx",
    isProjectActive: true,
    columnsCount: "2 + 2 Columns",
    columnsList: ["Earnings Head | Amount", "Deduction Head | Amount", "Attendance Summary", "Net Disbursed"],
    description: "Comprehensive monthly teacher & staff salary payslip with Basic, DA, HRA, EPF, Tax, and net salary in hand.",
    imageSrc: "/receipts/receipt_salary_slip.png",
    purpose: "Monthly employee payroll disbursement and tax compliance record.",
    primaryColor: "emerald",
  },
  {
    id: "receipt_salary_advance",
    title: "Staff Salary Advance Disbursement Voucher",
    category: "staff",
    categoryLabel: "Staff & Payroll",
    columnsCount: "4 Columns",
    columnsList: ["S.No", "Advance Particulars / Reason", "Salary Deduction Month", "Advance Amount"],
    description: "Emergency salary advance disbursement voucher with recovery terms and installment schedule.",
    imageSrc: "/receipts/receipt_salary_advance.png",
    purpose: "Staff emergency advance release and scheduled payroll deduction tracking.",
    primaryColor: "rose",
  },
  {
    id: "receipt_guest_remuneration",
    title: "Guest Faculty & Examiner Remuneration Voucher",
    category: "staff",
    categoryLabel: "Staff & Payroll",
    columnsCount: "5 Columns",
    columnsList: ["S.No", "Duty / Session Description", "Days/Batches", "Rate / Session", "Total Amount"],
    description: "Honorarium disbursement voucher for external board examiners, viva evaluators, and guest guest lecturers.",
    imageSrc: "/receipts/receipt_guest_remuneration.png",
    purpose: "Payment of honorarium, TA, and evaluation fees to outside academic experts.",
    primaryColor: "green",
  },

  // ── MORE STUDENT RECEIPTS ─────────────────────────────────────────
  {
    id: "receipt_canteen_meal",
    title: "Canteen & Meal Plan Subscription Receipt",
    category: "student",
    categoryLabel: "Student & Parent",
    columnsCount: "4 Columns",
    columnsList: ["S.No", "Cafeteria Meal Plan Description", "Monthly Period", "Amount"],
    description: "Student cafeteria hot lunch, nutrition meal plan subscription, and smart RFID dining pass receipt.",
    imageSrc: "/receipts/receipt_canteen_meal.png",
    purpose: "School cafeteria meal pass registration and monthly nutrition plan billing.",
    primaryColor: "teal",
  },
  {
    id: "receipt_lab_breakage",
    title: "Laboratory Apparatus Damage & Breakage Receipt",
    category: "student",
    categoryLabel: "Student & Parent",
    columnsCount: "4 Columns",
    columnsList: ["S.No", "Damaged Apparatus / Description", "Qty Damaged", "Replacement Cost"],
    description: "Apparatus breakage compensation receipt for Physics, Chemistry, Biology, and Computer Labs.",
    imageSrc: "/receipts/receipt_lab_breakage.png",
    purpose: "Lab equipment damage recovery and student science lab dues clearance.",
    primaryColor: "orange",
  },
  {
    id: "receipt_summer_camp",
    title: "Summer Creative Camp & Robotics Workshop Receipt",
    category: "student",
    categoryLabel: "Student & Parent",
    columnsCount: "4 Columns",
    columnsList: ["S.No", "Skill Activity / Workshop", "Instructor / Batch", "Activity Fee"],
    description: "Enrollment fee receipt for summer vacation workshops including STEM Robotics, Taekwondo, and Canvas Painting.",
    imageSrc: "/receipts/receipt_summer_camp.png",
    purpose: "Special hobby classes, summer camps, and creative workshops enrollment.",
    primaryColor: "purple",
  },

  // ── 4. SCHOOL ACCOUNTS & CLEARANCE ───────────────────────────────
  {
    id: "receipt_caution_refund",
    title: "Caution Money (Security Deposit) Refund Voucher",
    category: "accounts",
    categoryLabel: "Accounts & Clearance",
    columnsCount: "4 Columns",
    columnsList: ["S.No", "Deposit Particulars & Clearance Details", "Status / Receipt Ref", "Amount"],
    description: "Disbursement voucher releasing original refundable caution deposit after verification of Library, Lab, and Sports clearance.",
    imageSrc: "/receipts/receipt_caution_refund.png",
    purpose: "Clearance and refund disbursement when student leaves school with Transfer Certificate (TC).",
    primaryColor: "emerald",
  },
  {
    id: "receipt_charity_donation",
    title: "Donation & Trust Grant 80G Tax Receipt",
    category: "accounts",
    categoryLabel: "Accounts & Clearance",
    columnsCount: "3 Columns",
    columnsList: ["S.No", "Charitable Project / Fund Allocation", "Donated Amount"],
    description: "Charitable educational donation receipt eligible for 50% income tax exemption u/s 80G(5)(vi).",
    imageSrc: "/receipts/receipt_charity_donation.png",
    purpose: "Patron donations, scholarship corpus funds, and CSR educational grants acknowledgment.",
    primaryColor: "amber",
  },
  {
    id: "receipt_amc_vendor",
    title: "Vendor AMC & Facility Maintenance Voucher",
    category: "accounts",
    categoryLabel: "Accounts & Clearance",
    columnsCount: "4 Columns",
    columnsList: ["S.No", "Maintenance Service Scope", "Equipment / Location", "Billed Amount"],
    description: "Quarterly disbursement voucher for CCTV camera maintenance, RO water plant service, and biometric cloud sync.",
    imageSrc: "/receipts/receipt_amc_vendor.png",
    purpose: "Campus facilities Annual Maintenance Contract (AMC) payment disbursement.",
    primaryColor: "slate",
  },
  {
    id: "receipt_petty_cash",
    title: "School Petty Cash & Maintenance Expense Voucher",
    category: "accounts",
    categoryLabel: "Accounts & Clearance",
    columnsCount: "3 Columns",
    columnsList: ["S.No", "Expense Item Description / Bill Particulars", "Amount"],
    description: "Daily petty cash voucher for electrical repairs, lab consumables, plumbing fittings, and minor campus maintenance.",
    imageSrc: "/receipts/receipt_petty_cash.png",
    purpose: "Cashier daily cash register reconciliation and operational expense audit trail.",
    primaryColor: "purple",
  },
];

export default function ReceiptSettingsTab() {
  const [selectedCategory, setSelectedCategory] = useState<"all" | "fees" | "student" | "staff" | "accounts">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModalItem, setActiveModalItem] = useState<ReceiptItem | null>(null);

  // Filtered receipts
  const filteredReceipts = useMemo(() => {
    return ALL_RECEIPTS.filter((r) => {
      const matchesCategory = selectedCategory === "all" || r.category === selectedCategory;
      const matchesQuery =
        !searchQuery.trim() ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.columnsCount.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [selectedCategory, searchQuery]);

  const counts = useMemo(() => {
    return {
      all: ALL_RECEIPTS.length,
      fees: ALL_RECEIPTS.filter((r) => r.category === "fees").length,
      student: ALL_RECEIPTS.filter((r) => r.category === "student").length,
      staff: ALL_RECEIPTS.filter((r) => r.category === "staff").length,
      accounts: ALL_RECEIPTS.filter((r) => r.category === "accounts").length,
    };
  }, []);

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner / Summary */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-primary/10 text-primary rounded-xl">
              <Receipt className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Receipt & Voucher Templates</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {ALL_RECEIPTS.length} Standard Formats
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            School Management System me use hone wali sabhi official fee receipts, payroll vouchers, admission confirmation slips, aur clearance records ke standardized templates.
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-border rounded-xl text-xs outline-none focus:border-primary transition-all text-slate-800 dark:text-slate-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            selectedCategory === "all"
              ? "bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900"
              : "bg-white dark:bg-slate-900 border border-border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          All Templates <span className="text-[10px] opacity-75 font-mono">({counts.all})</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory("fees")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            selectedCategory === "fees"
              ? "bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900"
              : "bg-white dark:bg-slate-900 border border-border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" /> Fee Collection <span className="text-[10px] opacity-75 font-mono">({counts.fees})</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory("student")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            selectedCategory === "student"
              ? "bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900"
              : "bg-white dark:bg-slate-900 border border-border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Student & Parent <span className="text-[10px] opacity-75 font-mono">({counts.student})</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory("staff")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            selectedCategory === "staff"
              ? "bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900"
              : "bg-white dark:bg-slate-900 border border-border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <Wallet className="w-3.5 h-3.5" /> Staff & Payroll <span className="text-[10px] opacity-75 font-mono">({counts.staff})</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory("accounts")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            selectedCategory === "accounts"
              ? "bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900"
              : "bg-white dark:bg-slate-900 border border-border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Accounts & Clearance <span className="text-[10px] opacity-75 font-mono">({counts.accounts})</span>
        </button>
      </div>

      {/* Grid of Receipts */}
      {filteredReceipts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-12 text-center text-slate-400 text-xs font-bold">
          Koi template match nahi hua. Search filter reset karein.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {filteredReceipts.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-border rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col group text-left"
            >
              {/* Image Preview Container */}
              <div
                onClick={() => setActiveModalItem(item)}
                className="relative bg-slate-100 dark:bg-slate-800 aspect-4/3 overflow-hidden cursor-pointer flex items-center justify-center border-b border-border p-3"
              >
                <img
                  src={item.imageSrc}
                  alt={item.title}
                  className="w-full h-full object-contain drop-shadow-sm group-hover:scale-102 transition-transform duration-300"
                  loading="lazy"
                />

                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold backdrop-blur-2xs">
                  <Eye className="w-4 h-4" /> Full View Preview
                </div>

                {/* Active in Project Tag */}
                {item.isProjectActive && (
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Live In Project
                  </span>
                )}

                {/* Columns Pill */}
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                  {item.columnsCount}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
                      {item.categoryLabel}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug mb-1.5">
                    {item.title}
                  </h3>

                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">
                    {item.description}
                  </p>

                  {/* Columns tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {item.columnsList.map((col, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="pt-3 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModalItem(item)}
                    className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Details
                  </button>

                  <a
                    href={item.imageSrc}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 border border-border hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    title="Open Image in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FULL PREVIEW MODAL */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 md:p-5 border-b border-border flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                    {activeModalItem.categoryLabel}
                  </span>
                  {activeModalItem.isProjectActive && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Live in Project
                    </span>
                  )}
                </div>
                <h2 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                  {activeModalItem.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={activeModalItem.imageSrc}
                  download={`${activeModalItem.id}.png`}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
                <button
                  type="button"
                  onClick={() => setActiveModalItem(null)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 md:p-6 overflow-y-auto space-y-5 flex-1">
              {/* High-res image display */}
              <div className="bg-slate-100 dark:bg-slate-950/60 p-4 rounded-xl border border-border flex items-center justify-center">
                <img
                  src={activeModalItem.imageSrc}
                  alt={activeModalItem.title}
                  className="max-h-[550px] w-auto object-contain rounded-lg shadow-sm"
                />
              </div>

              {/* Details breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-slate-800 dark:text-slate-200">Standard Purpose:</div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {activeModalItem.purpose}
                  </p>
                  {activeModalItem.codeRef && (
                    <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 font-mono">
                      Integrated in: {activeModalItem.codeRef}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-slate-800 dark:text-slate-200">Configured Columns ({activeModalItem.columnsCount}):</div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeModalItem.columnsList.map((col, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-[10.5px] font-semibold text-slate-700 dark:text-slate-200"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
