const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  if (!fs.existsSync(dir)) return filelist;
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      if (fs.statSync(dirFile).isDirectory()) {
        filelist = walkSync(dirFile, filelist);
      } else {
        if (dirFile.endsWith('.tsx') || dirFile.endsWith('.jsx')) {
          filelist.push(dirFile);
        }
      }
    } catch (err) {
      // ignore
    }
  });
  return filelist;
};

const files = walkSync(path.join(__dirname, 'app')).concat(walkSync(path.join(__dirname, 'components')));
let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Regex to match className="..." or className={...}
  // This is a bit tricky, but we can match bg-white, bg-slate-50 etc. 
  // We'll replace globally: if we see bg-white, and we don't see dark:bg- nearby in the same string.
  
  // A safer approach: process line by line, find className strings.
  const lines = content.split('\n');
  let newLines = lines.map(line => {
    // simple regex to find className="something" or className={`something`}
    return line.replace(/(className=(?:\{`|["']))([^"'}]+)(["'`\}])/g, (match, prefix, classString, suffix) => {
      let classes = classString.split(/\s+/);
      
      const hasDarkBg = classes.some(c => c.startsWith('dark:bg-'));
      const hasDarkText = classes.some(c => c.startsWith('dark:text-'));
      const hasDarkBorder = classes.some(c => c.startsWith('dark:border-'));

      let newClasses = [...classes];

      if (!hasDarkBg) {
        if (classes.includes('bg-white')) newClasses.push('dark:bg-slate-900');
        else if (classes.includes('bg-slate-50')) newClasses.push('dark:bg-slate-800/50');
        else if (classes.includes('bg-gray-50')) newClasses.push('dark:bg-slate-800/50');
        else if (classes.includes('bg-[#F8FAFC]')) newClasses.push('dark:bg-slate-800/50');
        else if (classes.includes('bg-slate-100')) newClasses.push('dark:bg-slate-800');
      }

      if (!hasDarkText) {
        if (classes.includes('text-slate-900')) newClasses.push('dark:text-white');
        else if (classes.includes('text-slate-800')) newClasses.push('dark:text-slate-100');
        else if (classes.includes('text-slate-700')) newClasses.push('dark:text-slate-200');
        else if (classes.includes('text-slate-600')) newClasses.push('dark:text-slate-300');
        else if (classes.includes('text-gray-900')) newClasses.push('dark:text-white');
      }

      if (!hasDarkBorder) {
        if (classes.includes('border-slate-200')) newClasses.push('dark:border-slate-800');
        else if (classes.includes('border-gray-200')) newClasses.push('dark:border-slate-800');
        else if (classes.includes('border-slate-100')) newClasses.push('dark:border-slate-800/50');
      }

      // Reconstruct
      return prefix + newClasses.join(' ') + suffix;
    });
  });

  const newContent = newLines.join('\n');
  if (newContent !== originalContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    modifiedCount++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Total files modified: ${modifiedCount}`);
