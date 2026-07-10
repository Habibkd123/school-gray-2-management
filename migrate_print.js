const fs = require('fs');
const path = require('path');

const files = [
  "app/demo.html",
  "app/components/ui/EnhancedTable.tsx",
  "app/components/BulkImport.tsx",
  "app/(dashboard)/reports/fees-report/page.tsx",
  "app/(dashboard)/reports/merit-list/page.tsx",
  "app/(dashboard)/reports/finance/page.tsx",
  "app/(dashboard)/reports/teacher-report/page.tsx",
  "app/(dashboard)/reports/student-report/page.tsx",
  "app/(dashboard)/reports/attendance-report/page.tsx",
  "app/(dashboard)/reports/class-report/page.tsx",
  "app/(dashboard)/reports/daily-attendance/page.tsx",
  "app/(dashboard)/fees-collection/collect-fees/page.tsx",
  "app/(dashboard)/fees/[studentId]/page.tsx",
  "app/(dashboard)/examination/exam-results/page.tsx",
  "app/(dashboard)/document-center/templates/page.tsx",
  "app/(dashboard)/attendance/student/page.tsx",
  "app/(dashboard)/attendance/teacher/[teacherId]/page.tsx",
  "app/(dashboard)/attendance/student/[studentId]/page.tsx",
  "app/(dashboard)/assessments/[classId]/[assessmentId]/results/page.tsx",
  "app/(dashboard)/assessments/[classId]/page.tsx"
];

const basePath = process.cwd();

function addImport(content) {
  if (content.includes('PrintService') || content.includes('PrintButton')) {
    return content;
  }
  const importRegex = /(import [^\n]+from "[^\n]+";\r?\n)(?!import)/;
  const match = content.match(importRegex);
  if (match) {
    return content.slice(0, match.index + match[0].length) + 'import { PrintService } from "@/app/lib/print-service";\n' + content.slice(match.index + match[0].length);
  }
  return content;
}

files.forEach(relPath => {
  const fullPath = path.join(basePath, relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`NOT FOUND: ${relPath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;

  if (content.includes('window.print()') && !relPath.endsWith('.html')) {
    content = addImport(content);
    changed = true;
  }

  if (content.includes('window.print()')) {
    let containerId = 'printable-area';
    if (relPath.includes('reports')) containerId = 'printable-area';
    if (relPath.includes('exam-results')) containerId = 'printable-report-card';
    if (relPath.includes('templates')) containerId = 'doc-builder-wrapper';
    if (relPath.includes('fees')) containerId = 'printable-receipt';
    
    // Check if the file has specific ID defined in the code
    if (content.includes('id="printable-report"')) containerId = 'printable-report';
    if (content.includes('id="printable-receipt"')) containerId = 'printable-receipt';
    if (content.includes('id="printable-payslip"')) containerId = 'printable-payslip';
    
    content = content.replace(/window\.print\(\)/g, `PrintService.print('${containerId}', { pageSize: 'A4' })`);
    changed = true;
  }

  const knownIds = [
    'printable-receipt', 'printable-payslip', 'printable-salary-report', 
    'printable-report-card', 'printable-area', 'doc-builder-wrapper', 'printable-report'
  ];
  knownIds.forEach(id => {
    const idRegex = new RegExp(`id="${id}"(?!\\s+data-print-zone)`, 'g');
    if (idRegex.test(content)) {
      content = content.replace(idRegex, `id="${id}" data-print-zone="true"`);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated: ${relPath}`);
  }
});
