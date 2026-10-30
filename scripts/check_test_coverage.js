const fs = require('fs');
const path = require('path');

const inventory = JSON.parse(fs.readFileSync('route_inventory_full.json', 'utf8'));

// Scan tests directory
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.test.ts') || file.endsWith('.test.js')) {
      results.push(fullPath);
    }
  });
  return results;
}

const testFiles = walk(path.join(process.cwd(), 'tests'));
console.log(`Found ${testFiles.length} test files.`);

// Read all test contents
const testContents = testFiles.map(tf => ({
  file: path.relative(process.cwd(), tf).replace(/\\/g, '/'),
  content: fs.readFileSync(tf, 'utf8'),
}));

// Check each handler in inventory
let testedHandlersCount = 0;
let untestedHandlersCount = 0;

inventory.forEach(item => {
  item.handlerStatus = {};
  
  // Clean endpoint path to search for import
  // e.g. "@/app/api/students/route" or "@/app/api/students/[id]/route"
  const importSuffix = item.endpoint + '/route';
  const altImportSuffix = item.endpoint;

  item.methods.forEach(method => {
    let isTested = false;
    let matchingTestFile = null;

    for (const tf of testContents) {
      if (tf.content.includes(importSuffix) || tf.content.includes(altImportSuffix)) {
        // Check if method is imported or called, e.g. "GET as", "POST as", "deleteRouteById", etc.
        // Or if the method keyword appears near the import
        if (
          tf.content.includes(method) ||
          tf.content.toLowerCase().includes(method.toLowerCase())
        ) {
          isTested = true;
          matchingTestFile = tf.file;
          break;
        }
      }
    }

    item.handlerStatus[method] = {
      tested: isTested,
      testFile: matchingTestFile,
    };

    if (isTested) testedHandlersCount++;
    else untestedHandlersCount++;
  });
});

console.log(`Total Handlers: ${testedHandlersCount + untestedHandlersCount}`);
console.log(`Tested Handlers: ${testedHandlersCount}`);
console.log(`Untested Handlers: ${untestedHandlersCount}`);

fs.writeFileSync('route_coverage_audit.json', JSON.stringify(inventory, null, 2));

const untestedRoutes = inventory.filter(i => {
  return Object.values(i.handlerStatus).some(h => !h.tested);
});

console.log(`\nRoutes with untested handlers: ${untestedRoutes.length}`);
untestedRoutes.forEach((r, idx) => {
  const untestedMethods = Object.keys(r.handlerStatus).filter(m => !r.handlerStatus[m].tested);
  console.log(`${idx + 1}. ${r.endpoint} -> [${untestedMethods.join(', ')}] (Roles: ${r.roles.join(', ') || 'public'})`);
});
