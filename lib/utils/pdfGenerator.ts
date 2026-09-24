import PDFDocument from "pdfkit";

export interface PDFBackupOptions {
  schoolName?: string;
  title: string;
  subtitle?: string;
  summaryCards?: Array<{ label: string; value: string | number }>;
  headers: string[];
  columnWidths?: number[];
  rows: (string | number)[][];
  generatedAt?: Date;
}

export async function generatePDFBuffer(options: PDFBackupOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: "A4", bufferPages: true });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end",  () => resolve(Buffer.concat(buffers)));
      doc.on("error",(err) => reject(err));

      const PAGE_WIDTH   = 535; // usable width (A4 595 - 2×30 margin)
      const PAGE_BOTTOM  = 780; // stop before footer zone (footer is at 819)
      const ROW_HEIGHT   = 18;
      const HEADER_H     = 20;

      // ── Page Header helper ─────────────────────────────────────
      const drawPageHeader = () => {
        const schoolName = options.schoolName || "School Management System";
        doc.fillColor("#1e293b").fontSize(18).font("Helvetica-Bold").text(schoolName, { align: "center", lineBreak: false });
        doc.moveDown(0.2);
        doc.fillColor("#0284c7").fontSize(13).font("Helvetica-Bold").text(options.title, { align: "center", lineBreak: false });
        if (options.subtitle) {
          doc.fillColor("#64748b").fontSize(9).font("Helvetica").text(options.subtitle, { align: "center", lineBreak: false });
        }
        const dateStr = (options.generatedAt || new Date()).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        });
        doc.fontSize(8).fillColor("#94a3b8").text(`Generated on: ${dateStr}`, { align: "right", lineBreak: false });
        doc.moveDown(0.4);

        // Separator
        doc.moveTo(30, doc.y).lineTo(565, doc.y).strokeColor("#cbd5e1").lineWidth(1).stroke();
        doc.moveDown(0.6);
      };

      // ── Column Widths helper ───────────────────────────────────
      const colCount = options.headers.length;
      const getColWidths = (): number[] => {
        if (options.columnWidths && options.columnWidths.length === colCount) {
          const sum = options.columnWidths.reduce((a, b) => a + b, 0);
          return options.columnWidths.map((w) => (w / sum) * PAGE_WIDTH);
        }
        if (options.headers[0] === "S.No" && colCount > 1) {
          const snoW = 32;
          const remW = (PAGE_WIDTH - snoW) / (colCount - 1);
          return [snoW, ...Array(colCount - 1).fill(remW)];
        }
        return Array(colCount).fill(PAGE_WIDTH / colCount);
      };

      const colWidths = getColWidths();

      // ── Table header helper ────────────────────────────────────
      const drawTableHeader = (y: number) => {
        doc.rect(30, y, PAGE_WIDTH, HEADER_H).fill("#1e293b");
        let cx = 30;
        doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold");
        options.headers.forEach((h, colIdx) => {
          const w = colWidths[colIdx];
          const align = colIdx === 0 && h === "S.No" ? "center" : "left";
          doc.text(h, cx + 3, y + 6, {
            width: w - 6,
            height: 10,
            ellipsis: true,
            align,
            lineBreak: false,
          });
          cx += w;
        });
        return y + HEADER_H;
      };

      // ── Page 1 header ──────────────────────────────────────────
      drawPageHeader();

      // ── Summary Cards ──────────────────────────────────────────
      if (options.summaryCards && options.summaryCards.length > 0) {
        const cardCount = Math.min(options.summaryCards.length, 4);
        const cardW     = (PAGE_WIDTH - (cardCount - 1) * 8) / cardCount;
        let   cardX     = 30;
        const cardY     = doc.y;
        const cardH     = 36;

        options.summaryCards.slice(0, 4).forEach((card) => {
          doc.rect(cardX, cardY, cardW, cardH).fillAndStroke("#f8fafc", "#e2e8f0");
          doc.fillColor("#64748b").fontSize(7).font("Helvetica-Bold")
             .text(card.label.toUpperCase(), cardX + 4, cardY + 5, { width: cardW - 8, align: "center", lineBreak: false });
          doc.fillColor("#0f172a").fontSize(11).font("Helvetica-Bold")
             .text(String(card.value), cardX + 4, cardY + 18, { width: cardW - 8, align: "center", lineBreak: false });
          cardX += cardW + 8;
        });

        doc.y = cardY + cardH + 12;
      }

      // ── Data Table ─────────────────────────────────────────────
      // Filter out rows where every cell is empty / dash / 0
      const meaningfulRows = options.rows.filter((row) =>
        row.some((cell, cIdx) => {
          if (cIdx === 0 && options.headers[0] === "S.No") return false;
          const s = String(cell ?? "").trim();
          return s !== "" && s !== "-" && s !== "0" && s !== "Rs. 0" && s !== "0.00";
        })
      );

      // Re-serialize S.No strictly (1, 2, 3... N)
      if (options.headers[0] === "S.No") {
        meaningfulRows.forEach((r, idx) => {
          r[0] = idx + 1;
        });
      }

      if (meaningfulRows.length === 0) {
        doc.moveDown(1);
        doc.fillColor("#94a3b8").fontSize(11).font("Helvetica").text("No records to display.", { align: "center" });
        doc.end();
        return;
      }

      let currentY = drawTableHeader(doc.y);

      doc.font("Helvetica").fontSize(8);

      meaningfulRows.forEach((row, rowIndex) => {
        // ── Page overflow → new page with repeated table header ──
        if (currentY + ROW_HEIGHT > PAGE_BOTTOM) {
          doc.addPage();
          // Compact page-continuation header
          doc.fillColor("#64748b").fontSize(8).font("Helvetica")
             .text(`${options.title} (continued)`, 30, 20, { align: "left", width: PAGE_WIDTH, lineBreak: false });
          currentY = drawTableHeader(36);
          doc.font("Helvetica").fontSize(8);
        }

        // Alternating row background
        const rowBg = rowIndex % 2 === 1 ? "#f8fafc" : "#ffffff";
        doc.rect(30, currentY, PAGE_WIDTH, ROW_HEIGHT).fill(rowBg);

        let rx = 30;
        doc.fillColor("#334155");
        row.forEach((cell, colIdx) => {
          const w = colWidths[colIdx];
          const align = colIdx === 0 && options.headers[0] === "S.No" ? "center" : "left";
          doc.text(String(cell ?? "-"), rx + 3, currentY + 5, {
            width: w - 6,
            height: 10,
            ellipsis: true,
            align,
            lineBreak: false,
          });
          rx += w;
        });

        // Row bottom border
        doc
          .moveTo(30, currentY + ROW_HEIGHT)
          .lineTo(565, currentY + ROW_HEIGHT)
          .strokeColor("#e2e8f0")
          .lineWidth(0.5)
          .stroke();

        currentY += ROW_HEIGHT;
      });

      // ── Footer: page numbers on every page (No blank pages!) ───
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        // CRITICAL FIX: Temporarily disable bottom margin so footer coordinate
        // does not trigger PDFKit's internal auto-addPage check
        const oldBottomMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;

        const footerY = doc.page.height - 22;
        const halfW   = PAGE_WIDTH / 2;

        doc.fillColor("#94a3b8").fontSize(8).font("Helvetica");

        // Left: confidential label
        doc.text(
          `Confidential • ${options.schoolName || "School Management System"}`,
          30, footerY,
          { width: halfW, lineBreak: false }
        );

        // Right: page number
        doc.text(
          `Page ${i - range.start + 1} of ${range.count}`,
          30 + halfW, footerY,
          { width: halfW, align: "right", lineBreak: false }
        );

        doc.page.margins.bottom = oldBottomMargin;
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
