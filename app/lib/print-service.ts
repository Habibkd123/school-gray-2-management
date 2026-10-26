/**
 * ─── PrintService ───────────────────────────────────────────────────────────
 * Centralized print engine for the School ERP.
 *
 * Usage:
 *   import { PrintService } from "@/app/lib/print-service";
 *
 *   PrintService.print("printable-receipt");
 *   PrintService.print("printable-payslip", { pageSize: "A4", watermark: "PAID" });
 *   PrintService.printElement(divElement, { pageSize: "A4-landscape" });
 *
 * Every Print button in the ERP must use this service instead of window.print() directly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type PrintPageSize =
  | "A4"
  | "A4-landscape"
  | "A5"
  | "A5-landscape"
  | "Letter"
  | "Letter-landscape"
  | "id-card"
  | "thermal";

export type PrintWatermark =
  | "PAID"
  | "UNPAID"
  | "DRAFT"
  | "CONFIDENTIAL"
  | "COPY"
  | "ORIGINAL"
  | "CANCELLED"
  | string;

export interface PrintOptions {
  /** Page size preset. Default: "A4" */
  pageSize?: PrintPageSize;
  /** Page margin. Default: "12mm". Use "0mm" for ID cards, "5mm" for receipts. */
  margin?: string;
  /** Optional watermark text printed diagonally across the page. */
  watermark?: PrintWatermark;
  /** Sets the document title shown in the browser print dialog. */
  title?: string;
  /** If true, will not validate that the element has visible content. Default: false */
  skipValidation?: boolean;
}

// ── Page size mappings ────────────────────────────────────────────────────────

const PAGE_SIZE_CSS: Record<PrintPageSize, string> = {
  "A4":              "210mm 297mm",
  "A4-landscape":    "297mm 210mm",
  "A5":              "148mm 210mm",
  "A5-landscape":    "210mm 148mm",
  "Letter":          "216mm 279mm",
  "Letter-landscape":"279mm 216mm",
  "id-card":         "85.6mm 54mm",
  "thermal":         "80mm auto",
};

// ── Internal state ────────────────────────────────────────────────────────────

let _styleEl: HTMLStyleElement | null = null;
let _cleanupFn: (() => void) | null = null;
let _isPrinting = false;

// ── Helpers ───────────────────────────────────────────────────────────────────

function injectPageStyle(options: PrintOptions): HTMLStyleElement {
  // Remove any existing injected style
  if (_styleEl) {
    _styleEl.remove();
    _styleEl = null;
  }

  const size = options.pageSize ?? "A4";
  const margin = options.margin ?? "12mm";
  const cssSize = PAGE_SIZE_CSS[size] ?? PAGE_SIZE_CSS["A4"];

  const css = `
    @media print {
      @page {
        size: ${cssSize};
        margin: ${margin};
      }
    }
  `;

  const el = document.createElement("style");
  el.id = "__print-service-page-style__";
  el.textContent = css;
  document.head.appendChild(el);
  _styleEl = el;
  return el;
}

function setWatermark(watermark?: PrintWatermark) {
  if (watermark) {
    document.body.dataset.watermark = watermark;
  } else {
    delete document.body.dataset.watermark;
  }
}

function cleanup(zone: HTMLElement) {
  // Remove data-print-zone from element
  zone.removeAttribute("data-print-zone");
  
  // Remove data-print-path from ancestors
  let curr: HTMLElement | null = zone.parentElement;
  while (curr && curr !== document.body) {
    curr.removeAttribute("data-print-path");
    curr = curr.parentElement;
  }

  // Remove body flags
  delete document.body.dataset.printing;
  delete document.body.dataset.watermark;
  // Remove injected style
  if (_styleEl) {
    _styleEl.remove();
    _styleEl = null;
  }
  // Restore document title
  if (document.body.dataset.originalTitle) {
    document.title = document.body.dataset.originalTitle;
    delete document.body.dataset.originalTitle;
  }
  _isPrinting = false;
  _cleanupFn = null;
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateElement(el: HTMLElement, skipValidation: boolean): string | null {
  if (skipValidation) return null;

  // Check element has visible text content or images
  const text = el.textContent?.trim() ?? "";
  const images = el.querySelectorAll("img").length;
  if (text.length === 0 && images === 0) {
    return "Nothing to print: the printable area appears to be empty.";
  }

  // Check for unresolved template variables
  const unresolvedVars = text.match(/\{\{[^}]+\}\}/g);
  if (unresolvedVars && unresolvedVars.length > 0) {
    return `Document contains unresolved variables: ${unresolvedVars.slice(0, 3).join(", ")}. Please wait for data to load.`;
  }

  return null; // valid
}

// ── Core print function ───────────────────────────────────────────────────────

function doPrint(zone: HTMLElement, options: PrintOptions) {
  if (_isPrinting) {
    console.warn("[PrintService] Print already in progress, ignoring duplicate call.");
    return;
  }
  _isPrinting = true;

  // Validate
  const validationError = validateElement(zone, options.skipValidation ?? false);
  if (validationError) {
    _isPrinting = false;
    alert(`⚠️ Cannot Print\n\n${validationError}`);
    return;
  }

  const size = options.pageSize ?? "A4";
  const margin = options.margin ?? (size === "thermal" ? "2mm" : "8mm");
  const cssSize = PAGE_SIZE_CSS[size] ?? PAGE_SIZE_CSS["A4"];

  // Create an isolated hidden iframe for printing
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.zIndex = "-9999";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    _isPrinting = false;
    iframe.remove();
    window.print();
    return;
  }

  // Collect all styles and stylesheet links from parent document
  const headStyles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
    .map((el) => el.outerHTML)
    .join("\n");

  const watermarkHtml = options.watermark
    ? `<div style="position:fixed;top:40%;left:15%;transform:rotate(-35deg);font-size:72px;font-weight:900;color:rgba(0,0,0,0.06);z-index:9999;pointer-events:none;text-transform:uppercase;">${options.watermark}</div>`
    : "";

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${options.title || document.title || "Print Document"}</title>
  ${headStyles}
  <style>
    @media print {
      @page {
        size: ${cssSize};
        margin: ${margin};
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #0f172a !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .print\\:hidden, .no-print {
        display: none !important;
      }
      table {
        width: 100% !important;
        border-collapse: collapse !important;
        table-layout: fixed !important;
      }
    }
    body {
      margin: 0;
      padding: 8px;
      background: #ffffff !important;
      color: #0f172a !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  </style>
</head>
<body class="bg-white">
  ${watermarkHtml}
  ${zone.outerHTML}
</body>
</html>`);
  doc.close();

  const cleanupIframe = () => {
    if (document.body.contains(iframe)) {
      iframe.remove();
    }
    _isPrinting = false;
  };

  iframe.contentWindow?.addEventListener("afterprint", cleanupIframe, { once: true });

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("[PrintService] Error during iframe print:", e);
    }
    setTimeout(cleanupIframe, 3000);
  }, 350);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Print an element by its DOM ID.
 *
 * @param elementId - The `id` of the printable container element
 * @param options   - Optional print configuration
 */
function printById(elementId: string, options: PrintOptions = {}) {
  const el = document.getElementById(elementId);
  if (!el) {
    alert(`⚠️ Print Error\n\nPrintable element "#${elementId}" not found in the page.\nPlease ensure the document is fully loaded.`);
    return;
  }
  doPrint(el, options);
}

/**
 * Print a DOM element directly.
 *
 * @param element - The HTMLElement to print
 * @param options - Optional print configuration
 */
function printElement(element: HTMLElement, options: PrintOptions = {}) {
  if (!element) {
    alert("⚠️ Print Error\n\nNo printable element provided.");
    return;
  }
  doPrint(element, options);
}

/**
 * Cancel any in-progress print (rarely needed, provided for completeness).
 */
function cancelPrint() {
  if (_cleanupFn) {
    _cleanupFn();
  }
}

// ── Exported singleton ────────────────────────────────────────────────────────

export const PrintService = {
  /** Print element by ID */
  print: printById,
  /** Print element directly */
  printElement,
  /** Cancel in-progress print */
  cancel: cancelPrint,
};

export default PrintService;
