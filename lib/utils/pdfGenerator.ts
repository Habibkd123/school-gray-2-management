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
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      // Header Section
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

      // Separator Line
      doc.moveTo(30, doc.y).lineTo(565, doc.y).strokeColor("#cbd5e1").lineWidth(1).stroke();
      doc.moveDown(0.6);

      // Summary Cards (if provided)
      if (options.summaryCards && options.summaryCards.length > 0) {
        const cardCount = Math.min(options.summaryCards.length, 4);
        const cardWidth = (535 - (cardCount - 1) * 8) / cardCount;
        let startX = 30;
        const cardY = doc.y;
        const cardHeight = 36;

        options.summaryCards.slice(0, 4).forEach((card) => {
          doc.rect(startX, cardY, cardWidth, cardHeight).fillAndStroke("#f8fafc", "#e2e8f0");
          doc.fillColor("#64748b").fontSize(7).font("Helvetica-Bold").text(card.label.toUpperCase(), startX + 4, cardY + 5, {
            width: cardWidth - 8,
            align: "center",
          });
          doc.fillColor("#0f172a").fontSize(11).font("Helvetica-Bold").text(String(card.value), startX + 4, cardY + 18, {
            width: cardWidth - 8,
            align: "center",
          });
          startX += cardWidth + 8;
        });

        doc.y = cardY + cardHeight + 12;
      }

      // Data Table Section
      const tableTop = doc.y;
      const colCount = options.headers.length;
      const tableWidth = 535;
      const colWidth = tableWidth / colCount;

      // Table Header
      const headerHeight = 20;
      doc.rect(30, tableTop, tableWidth, headerHeight).fill("#1e293b");

      let currentX = 30;
      doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold");
      options.headers.forEach((header) => {
        doc.text(header, currentX + 3, tableTop + 5, {
          width: colWidth - 6,
          align: "left",
          height: 10,
          ellipsis: true,
        });
        currentX += colWidth;
      });

      let currentY = tableTop + headerHeight;
      const rowHeight = 18;

      doc.font("Helvetica").fontSize(8);

      options.rows.forEach((row, rowIndex) => {
        // Page Overflow Check
        if (currentY + rowHeight > 780) {
          doc.addPage();
          currentY = 30;
          
          // Repeat Table Header
          doc.rect(30, currentY, tableWidth, headerHeight).fill("#1e293b");
          let hX = 30;
          doc.fillColor("#ffffff").fontSize(8).font("Helvetica-Bold");
          options.headers.forEach((header) => {
            doc.text(header, hX + 3, currentY + 5, {
              width: colWidth - 6,
              align: "left",
              height: 10,
              ellipsis: true,
            });
            hX += colWidth;
          });
          currentY += headerHeight;
          doc.font("Helvetica").fontSize(8);
        }

        // Row background
        if (rowIndex % 2 === 1) {
          doc.rect(30, currentY, tableWidth, rowHeight).fill("#f8fafc");
        } else {
          doc.rect(30, currentY, tableWidth, rowHeight).fill("#ffffff");
        }

        let rX = 30;
        doc.fillColor("#334155");
        row.forEach((cell) => {
          doc.text(String(cell ?? "-"), rX + 3, currentY + 4, {
            width: colWidth - 6,
            align: "left",
            height: 10,
            ellipsis: true,
          });
          rX += colWidth;
        });

        // Bottom border
        doc.moveTo(30, currentY + rowHeight).lineTo(565, currentY + rowHeight).strokeColor("#e2e8f0").lineWidth(0.5).stroke();

        currentY += rowHeight;
      });

      // Footer with Page Numbers
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fillColor("#94a3b8").fontSize(8).font("Helvetica").text(`Page ${i + 1} of ${range.count}`, 30, 805, {
          align: "center",
          width: 535,
        });
        doc.text("Confidential • School Management System Backup", 30, 805, { align: "left" });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
