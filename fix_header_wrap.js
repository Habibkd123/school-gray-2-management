const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('page.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'app', '(dashboard)'));
let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // 1. Change <div className="flex items-center gap-3"> to include flex-wrap
  // We'll specifically look for this pattern near "Students List" or similar header titles, 
  // but doing it generally for this specific class might be okay.
  // Actually, better to target the exact combinations.
  content = content.replace(/className="flex items-center gap-3"/g, 'className="flex flex-wrap items-center gap-3"');
  content = content.replace(/className="flex items-center gap-2"/g, 'className="flex flex-wrap items-center gap-2"');

  // 2. Add whitespace-nowrap to the span elements to prevent text squishing
  // All Time / selectedDateRange
  content = content.replace(/<span>\{selectedDateRange\}<\/span>/g, '<span className="whitespace-nowrap">{selectedDateRange}</span>');
  
  // Filter
  content = content.replace(/<span>Filter<\/span>/g, '<span className="whitespace-nowrap">Filter</span>');

  // Sort by A-Z
  content = content.replace(/<span>Sort by A-Z<\/span>/g, '<span className="whitespace-nowrap">Sort by A-Z</span>');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
    console.log('Modified:', file);
  }
});

console.log('Total files modified:', modifiedCount);
