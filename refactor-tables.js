const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      if (f !== 'node_modules' && f !== '.next') {
        walkDir(dirPath, callback);
      }
    } else {
      callback(dirPath);
    }
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  // We look for <table className="..."> and add erp-table if missing,
  // while removing redundant classes like w-full, border-collapse, text-left, text-[12px], text-[13px]
  content = content.replace(/<table\s+className="([^"]+)"/g, (match, classList) => {
    if (!classList.includes('erp-table') && !classList.includes('doc-table') && !classList.includes('ms-table')) {
        let newClasses = classList
            .replace(/\b(w-full|text-left|border-collapse|text-\[12px\]|text-\[13px\]|text-sm)\b/g, '')
            .replace(/\s+/g, ' ').trim();
        
        let finalClass = `erp-table`;
        if (newClasses) finalClass = `${finalClass} ${newClasses}`;
        return `<table className="${finalClass}"`;
    }
    return match;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Refactored tables in: ${filePath}`);
  }
}

console.log("Starting tables refactor...");
walkDir('./app', processFile);
console.log("Done.");
