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

  // 1. Page Titles
  // Matches <h1 className="text-3xl font-bold text-white mb-3"> or <h1 className="text-2xl font-bold flex items-center gap-2">
  // We want to replace the typography/color parts with 'page-title'
  content = content.replace(/className="([^"]*(?:text-2xl|text-3xl|text-\[32px\]|text-4xl)[^"]*)"/g, (match, classList) => {
    // If it's a page title or major heading
    if (classList.includes('font-bold') || classList.includes('font-extrabold') || classList.includes('font-semibold')) {
        let newClasses = classList
            .replace(/\b(text-[234]xl|text-\[32px\])\b/g, '')
            .replace(/\b(font-bold|font-extrabold|font-semibold)\b/g, '')
            .replace(/\b(text-slate-900|text-white|dark:text-white|text-foreground|text-zinc-900|dark:text-zinc-50)\b/g, '')
            .replace(/\s+/g, ' ').trim();
        
        // Let's decide if it's a page-title or section-title based on the original size
        let isPageTitle = classList.includes('text-3xl') || classList.includes('text-4xl') || classList.includes('text-[32px]');
        let finalClass = isPageTitle ? 'page-title' : 'section-title';

        // Add back other layout classes
        if (newClasses) finalClass = `${finalClass} ${newClasses}`;
        return `className="${finalClass}"`;
    }
    return match;
  });

  // 2. Card Titles
  // text-lg font-semibold or text-[18px]
  content = content.replace(/className="([^"]*(?:text-lg|text-\[18px\]|text-\[17px\])[^"]*)"/g, (match, classList) => {
    if (classList.includes('font-semibold') || classList.includes('font-medium')) {
        let newClasses = classList
            .replace(/\b(text-lg|text-\[18px\]|text-\[17px\])\b/g, '')
            .replace(/\b(font-semibold|font-medium)\b/g, '')
            .replace(/\b(text-slate-900|text-white|dark:text-white|text-foreground|text-zinc-900|dark:text-zinc-50)\b/g, '')
            .replace(/\s+/g, ' ').trim();
        
        let finalClass = `card-title`;
        if (newClasses) finalClass = `${finalClass} ${newClasses}`;
        return `className="${finalClass}"`;
    }
    return match;
  });

  // 3. Card Subtitles (13px, font-medium, slate-500)
  // text-sm text-slate-500 or text-muted-foreground
  content = content.replace(/className="([^"]*(?:text-sm|text-\[13px\])[^"]*(?:text-slate-500|text-gray-500|text-muted-foreground)[^"]*)"/g, (match, classList) => {
     let newClasses = classList
         .replace(/\b(text-sm|text-\[13px\])\b/g, '')
         .replace(/\b(font-medium)\b/g, '')
         .replace(/\b(text-slate-500|text-gray-500|text-muted-foreground|dark:text-slate-400)\b/g, '')
         .replace(/\s+/g, ' ').trim();
     
     let finalClass = `card-subtitle`;
     if (newClasses) finalClass = `${finalClass} ${newClasses}`;
     return `className="${finalClass}"`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Refactored typography in: ${filePath}`);
  }
}

console.log("Starting typography refactor...");
walkDir('./app', processFile);
console.log("Done.");
