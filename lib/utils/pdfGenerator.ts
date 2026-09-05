import PDFDocument from "pdfkit";

export interface PDFBackupOptions {
  schoolName?: string;
  title: string;
  subtitle?: string;
  summaryCards?: Array<{ label: string; value: string | number }>;
  headers: string[];
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
      const PAGE_BOTTOM  = 770; // stop before footer zone
      const ROW_HEIGHT   = 18;
      const HEADER_H     = 20;

      // ── Page Header helper ─────────────────────────────────────
      const drawPageHeader = () => {
        const schoolName = options.schoolName || "School Management System";
        doc.fillColor("#1e293b").fontSize(18).font("Helvetica-Bold").text(schoolName, { align: "center" });
        doc.moveDown(0.2);
        doc.fillColor("#0284c7").fontSize(13).font("Helvetica-Bold").text(options.title, { align: "center" });
        if (options.subtitle) {
          doc.fillColor("#64748b").fontSize(9).font("Helvetica").text(options.subtitle, { align: "center" });
        }
        const dateStr = (options.generatedAt || new Date()).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        });
        doc.fontSize(8).fillColor("#94a3b8").text(`Generated on: ${dateStr}`, { align: "right" });
        doc.moveDown(0.4);

        // Separator
        doc.moveTo(30, doc.y).lineTo(565, doc.y).strokeColor("#cbd5e1").lineWidth(1).stroke();
        doc.moveDown(0.6);
      };

      // ── Table header helper ────────────────────────────────────
      const colCount = options.headers.length;
      const colWidth = PAGE_WIDTH / colCount;

      const drawTableHeader = (y: number) => {
        doc.rect(30, y, PAGE_WIDTH, HEADER_H).fill("#1e293b");
        let cx = 30;
        doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold");
        options.headers.forEach((h) => {
          doc.text(h, cx + 3, y + 5, { width: colWidth - 6, height: 10, ellipsis: true });
          cx += colWidth;
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
             .text(card.label.toUpperCase(), cardX + 4, cardY + 5, { width: cardW - 8, align: "center" });
          doc.fillColor("#0f172a").fontSize(11).font("Helvetica-Bold")
             .text(String(card.value), cardX + 4, cardY + 18, { width: cardW - 8, align: "center" });
          cardX += cardW + 8;
        });

        doc.y = cardY + cardH + 12;
      }

      // ── Data Table ─────────────────────────────────────────────
      // Filter out rows where every cell is empty / dash / 0
      const meaningfulRows = options.rows.filter((row) =>
        row.some((cell) => {
          const s = String(cell ?? "").trim();
          return s !== "" && s !== "-" && s !== "0" && s !== "Rs. 0" && s !== "0.00";
        })
      );

      if (meaningfulRows.length === 0) {
        // Shouldn't reach here because API returns noData, but safety net
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
          // Compact page-continuation header (just title line, no full school header)
          doc.fillColor("#64748b").fontSize(8).font("Helvetica")
             .text(`${options.title}  (continued)`, 30, 20, { align: "left", width: PAGE_WIDTH });
          currentY = drawTableHeader(36);
          doc.font("Helvetica").fontSize(8);
        }

        // Alternating row background
        const rowBg = rowIndex % 2 === 1 ? "#f8fafc" : "#ffffff";
        doc.rect(30, currentY, PAGE_WIDTH, ROW_HEIGHT).fill(rowBg);

        let rx = 30;
        doc.fillColor("#334155");
        row.forEach((cell) => {
          doc.text(String(cell ?? "-"), rx + 3, currentY + 4, {
            width: colWidth - 6,
            height: 10,
            ellipsis: true,
          });
          rx += colWidth;
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

      // ── Footer: page numbers on every page ────────────────────
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const footerY = doc.page.height - 25;
        const halfW   = PAGE_WIDTH / 2;

        doc.fillColor("#94a3b8").fontSize(8).font("Helvetica");

        // Left: confidential label  — lineBreak:false prevents overflow → new page
        doc.text(
          `Confidential • ${options.schoolName || "School Management System"}`,
          30, footerY,
          { width: halfW, lineBreak: false }
        );

        // Right: page number  — explicit x so it doesn't stack below left text
        doc.text(
          `Page ${i - range.start + 1} of ${range.count}`,
          30 + halfW, footerY,
          { width: halfW, align: "right", lineBreak: false }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
