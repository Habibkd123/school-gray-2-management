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

  // Convert arbitrary pixels [XXpx] for spacing to closest tailwind step
  // Available tailwind steps in multiples of 4:
  // 1 (4px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px), 8 (32px), 10 (40px), 12 (48px)
  const steps = [
    { px: 4, tw: '1' },
    { px: 8, tw: '2' },
    { px: 12, tw: '3' },
    { px: 16, tw: '4' },
    { px: 20, tw: '5' },
    { px: 24, tw: '6' },
    { px: 32, tw: '8' },
    { px: 40, tw: '10' },
    { px: 48, tw: '12' },
  ];

  function getClosestStep(pxValue) {
    let closest = steps[0];
    let minDiff = Math.abs(pxValue - steps[0].px);
    for (let step of steps) {
      let diff = Math.abs(pxValue - step.px);
      if (diff < minDiff) {
        minDiff = diff;
        closest = step;
      }
    }
    return closest.tw;
  }

  // Regex to match p-[10px], m-[15px], gap-[12px] etc
  content = content.replace(/\b(p|m|px|py|pt|pb|pl|pr|gap)-\[(\d+)px\]\b/g, (match, prefix, pxStr) => {
    let pxValue = parseInt(pxStr, 10);
    let step = getClosestStep(pxValue);
    return `${prefix}-${step}`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Refactored spacing in: ${filePath}`);
  }
}

console.log("Starting spacing refactor...");
walkDir('./app', processFile);
console.log("Done.");
