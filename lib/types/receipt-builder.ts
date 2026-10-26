export interface ReceiptConfig {
  template_id: string;
  template_name: string;
  paper_size: "A4" | "A5" | "POS-80mm";
  layout_mode: "single" | "dual" | "triple" | "side_by_side";
  primary_color: string; // hex code or preset name
  font_family: "sans" | "serif" | "mono";

  // Header & Branding
  show_logo: boolean;
  logo_position: "left" | "center" | "right";
  logo_size: "small" | "medium" | "large" | "xl";
  custom_logo_url: string;

  show_school_name: boolean;
  school_name_custom: string;
  show_subtitle: boolean;
  school_subtitle_custom: string;
  show_address: boolean;
  address_custom: string;
  show_contact: boolean;
  contact_custom: string;
  email_custom: string;
  show_affiliation: boolean;
  affiliation_text: string;
  udise_or_reg_no: string;
  receipt_title: string;
  show_copy_badge: boolean;
  copy_labels: string[]; // e.g. ["Student Copy", "School Copy"]
  copy_label_primary: string;
  copy_label_secondary: string;


  // Student & Receipt Metadata Fields
  meta_layout: "grid-2" | "grid-3" | "dashed-list";
  show_student_name: boolean;
  show_admission_no: boolean;
  show_roll_no: boolean;
  show_class: boolean;
  show_father_name: boolean;
  show_mother_name: boolean;
  show_phone: boolean;
  show_receipt_no: boolean;
  show_payment_date: boolean;
  show_payment_method: boolean;
  show_academic_session: boolean;
  show_billing_range: boolean;
  show_transaction_id: boolean;

  // Fee Table Columns
  table_theme: "clean" | "bordered" | "striped" | "minimal";
  table_density: "compact" | "normal" | "spacious";
  show_serial_no: boolean;
  show_fee_head: boolean;
  show_total_amount: boolean;
  show_paid_before: boolean;
  show_discount: boolean;
  show_paid_now: boolean;
  show_total_paid: boolean;
  show_outstanding: boolean;
  show_status_badge: boolean;

  // Summary & Totals
  show_subtotal: boolean;
  show_discount_total: boolean;
  show_net_paid: boolean;
  show_total_balance: boolean;
  show_amount_in_words: boolean;
  show_payment_remarks: boolean;

  // Footer & Signatures
  show_cashier_sign: boolean;
  cashier_sign_label: string;
  show_principal_sign: boolean;
  principal_sign_label: string;
  show_parent_sign: boolean;
  parent_sign_label: string;
  show_seal_stamp: boolean;
  show_disclaimer: boolean;
  disclaimer_text: string;
}

export const DEFAULT_RECEIPT_CONFIG: ReceiptConfig = {
  template_id: "standard_7col",
  template_name: "Standard 7-Column Comprehensive Ledger",
  paper_size: "A4",
  layout_mode: "single",
  primary_color: "#0f172a", // Classic Slate / Dark Navy
  font_family: "sans",

  // Header & Branding
  show_logo: true,
  logo_position: "left",
  logo_size: "medium",
  custom_logo_url: "",
  show_school_name: true,
  school_name_custom: "",
  show_subtitle: true,
  school_subtitle_custom: "",
  show_address: true,
  address_custom: "",
  show_contact: true,
  contact_custom: "",
  email_custom: "",
  show_affiliation: true,
  affiliation_text: "Recognised & Affiliated by Dept. of Education",
  udise_or_reg_no: "",
  receipt_title: "FEES PAYMENT RECEIPT",
  show_copy_badge: true,
  copy_labels: ["Student Copy", "School Copy"],
  copy_label_primary: "STUDENT COPY",
  copy_label_secondary: "OFFICE COPY",


  // Metadata Fields
  meta_layout: "grid-2",
  show_student_name: true,
  show_admission_no: true,
  show_roll_no: true,
  show_class: true,
  show_father_name: true,
  show_mother_name: false,
  show_phone: true,
  show_receipt_no: true,
  show_payment_date: true,
  show_payment_method: true,
  show_academic_session: true,
  show_billing_range: true,
  show_transaction_id: true,

  // Fee Table Columns
  table_theme: "bordered",
  table_density: "normal",
  show_serial_no: false,
  show_fee_head: true,
  show_total_amount: true,
  show_paid_before: false,
  show_discount: true,
  show_paid_now: true,
  show_total_paid: false,
  show_outstanding: false,
  show_status_badge: false,

  // Summary & Totals
  show_subtotal: true,
  show_discount_total: true,
  show_net_paid: true,
  show_total_balance: true,
  show_amount_in_words: true,
  show_payment_remarks: true,

  // Footer & Signatures
  show_cashier_sign: true,
  cashier_sign_label: "Cashier / Accounts Officer",
  show_principal_sign: true,
  principal_sign_label: "Principal / Authority",
  show_parent_sign: false,
  parent_sign_label: "Parent / Guardian Signature",
  show_seal_stamp: true,
  show_disclaimer: true,
  disclaimer_text: "Note: Fees once paid is strictly non-refundable. Please preserve this computer generated receipt for all future official verifications.",
};

export interface ReceiptPresetDefinition {
  id: string;
  name: string;
  badge: string;
  description: string;
  config: Partial<ReceiptConfig>;
}

export const RECEIPT_PRESETS: ReceiptPresetDefinition[] = [
  {
    id: "bajrang_dual_slip",
    name: "Official School Counter Slip (Single Copy)",
    badge: "Official Paper Match",
    description: "Exact 1-to-1 match of Bajrang Shikshan Sansthan's official paper receipt with Fee Details table and Authorised Signature.",
    config: {
      template_id: "bajrang_dual_slip",
      template_name: "Official School Counter Slip (Single Copy)",
      paper_size: "A4",
      layout_mode: "single",
      primary_color: "#0f172a",
      meta_layout: "dashed-list",
      table_theme: "bordered",
      table_density: "compact",
      show_copy_badge: true,
      copy_label_primary: "OFFICE COPY",
      copy_label_secondary: "SCHOOL COPY",
      copy_labels: ["OFFICE COPY", "SCHOOL COPY"],
      show_fee_head: true,
      show_total_amount: true,
      show_discount: true,
      show_paid_now: true,
      show_outstanding: false,
      show_status_badge: false,
      show_subtotal: true,
      show_discount_total: true,
      show_net_paid: true,
      show_total_balance: true,
      show_amount_in_words: true,
      show_payment_remarks: true,
      show_cashier_sign: false,
      show_seal_stamp: false,
      show_principal_sign: true,
      principal_sign_label: "Authorised Signature",
      show_disclaimer: false,
    },
  },
  {
    id: "standard_7col",
    name: "Standard 7-Column Ledger",
    badge: "Official & Audit Ready",
    description: "Detailed itemized breakdown showing Total Fee, Prior Payments, Current Paid, Balance Due, and Status.",
    config: {
      template_id: "standard_7col",
      template_name: "Standard 7-Column Comprehensive Ledger",
      paper_size: "A4",
      layout_mode: "single",
      meta_layout: "grid-2",
      table_theme: "bordered",
      table_density: "normal",
      show_serial_no: false,
      show_fee_head: true,
      show_total_amount: true,
      show_paid_before: true,
      show_discount: false,
      show_paid_now: true,
      show_total_paid: true,
      show_outstanding: true,
      show_status_badge: true,
      show_subtotal: true,
      show_discount_total: true,
      show_net_paid: true,
      show_total_balance: true,
    },
  },
  {
    id: "compact_3col",
    name: "Compact 3-Column Cash Slip",
    badge: "Fast Counter Collection",
    description: "Streamlined slip without past balances or complex tables. Ideal for fast single-installment receipts.",
    config: {
      template_id: "compact_3col",
      template_name: "Compact 3-Column Fast Cash Slip",
      paper_size: "A4",
      layout_mode: "single",
      meta_layout: "grid-2",
      table_theme: "clean",
      table_density: "compact",
      show_serial_no: true,
      show_fee_head: true,
      show_total_amount: false,
      show_paid_before: false,
      show_discount: false,
      show_paid_now: true,
      show_total_paid: false,
      show_outstanding: false,
      show_status_badge: true,
      show_subtotal: false,
      show_discount_total: false,
      show_net_paid: true,
      show_total_balance: false,
    },
  },
  {
    id: "standard_4col",
    name: "Standard 4-Column Due Ledger",
    badge: "Balanced & Clear",
    description: "Shows Fee Head, Total Annual Fee, Current Payment, and Remaining Dues for clean parent communication.",
    config: {
      template_id: "standard_4col",
      template_name: "Standard 4-Column Due Ledger",
      paper_size: "A4",
      layout_mode: "single",
      meta_layout: "grid-2",
      table_theme: "bordered",
      table_density: "normal",
      show_serial_no: false,
      show_fee_head: true,
      show_total_amount: true,
      show_paid_before: false,
      show_discount: false,
      show_paid_now: true,
      show_total_paid: false,
      show_outstanding: true,
      show_status_badge: true,
      show_subtotal: true,
      show_discount_total: false,
      show_net_paid: true,
      show_total_balance: true,
    },
  },
  {
    id: "dual_copy_a4",
    name: "Dual Copy (Student + Office) A4",
    badge: "Perforated 2-in-1",
    description: "Prints two identical slips on a single A4 page with a perforated cut line (Student Copy + Office Copy).",
    config: {
      template_id: "dual_copy_a4",
      template_name: "Dual Copy A4 Cut-Sheet",
      paper_size: "A4",
      layout_mode: "dual",
      meta_layout: "grid-2",
      table_theme: "bordered",
      table_density: "compact",
      show_copy_badge: true,
      copy_labels: ["STUDENT COPY", "OFFICE COPY"],
      show_serial_no: false,
      show_fee_head: true,
      show_total_amount: true,
      show_paid_before: true,
      show_discount: false,
      show_paid_now: true,
      show_total_paid: true,
      show_outstanding: true,
      show_status_badge: true,
    },
  },
  {
    id: "minimal_a5",
    name: "Minimal A5 Fee Voucher",
    badge: "Compact Half-Sheet",
    description: "Designed specifically for A5 paper or half-letter printouts with centered branding and clean layout.",
    config: {
      template_id: "minimal_a5",
      template_name: "Minimal A5 Fee Voucher",
      paper_size: "A5",
      layout_mode: "single",
      meta_layout: "dashed-list",
      logo_position: "center",
      table_theme: "clean",
      table_density: "compact",
      show_serial_no: true,
      show_fee_head: true,
      show_total_amount: true,
      show_paid_before: false,
      show_discount: false,
      show_paid_now: true,
      show_total_paid: false,
      show_outstanding: true,
      show_status_badge: false,
      show_subtotal: true,
      show_net_paid: true,
      show_total_balance: true,
    },
  },
  {
    id: "pos_80mm",
    name: "80mm POS Thermal Slip",
    badge: "Thermal Receipt",
    description: "Continuous roll thermal slip with monospaced numbers, dashed borders, and compact summary.",
    config: {
      template_id: "pos_80mm",
      template_name: "80mm POS Thermal Slip",
      paper_size: "POS-80mm",
      layout_mode: "single",
      font_family: "mono",
      meta_layout: "dashed-list",
      logo_position: "center",
      logo_size: "small",
      table_theme: "minimal",
      table_density: "compact",
      show_serial_no: true,
      show_fee_head: true,
      show_total_amount: false,
      show_paid_before: false,
      show_discount: false,
      show_paid_now: true,
      show_total_paid: false,
      show_outstanding: true,
      show_status_badge: false,
      show_seal_stamp: false,
      show_parent_sign: false,
    },
  },
];

export interface ReceiptItemData {
  sno?: number;
  head: string;
  total: number;
  paidBefore: number;
  discount: number;
  paidNow: number;
  totalPaid: number;
  outstanding: number;
  status: string;
}

export interface ReceiptTotalsData {
  grossFee: number;
  paidBeforeTotal: number;
  discountTotal: number;
  paidNowTotal: number;
  totalPaidOverall: number;
  balanceDue: number;
  amountInWords: string;
  remarks?: string;
}

export interface ReceiptStudentData {
  name: string;
  admissionNo: string;
  rollNo?: string;
  className?: string;
  section?: string;
  fatherName?: string;
  motherName?: string;
  phone?: string;
}

export interface ReceiptData {
  receiptNo: string;
  date: string;
  time?: string;
  session?: string;
  billingRange?: string;
  paymentMethod?: string;
  transactionId?: string;
  student: ReceiptStudentData;
  items: ReceiptItemData[];
  totals: ReceiptTotalsData;
}
