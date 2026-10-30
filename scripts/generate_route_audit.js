const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file === 'route.ts' || file === 'route.js') {
      results.push(fullPath);
    }
  });
  return results;
}

const appDir = path.join(process.cwd(), 'app');
const routes = walk(path.join(appDir, 'api'));

const inventory = [];

routes.forEach(filePath => {
  const normPath = filePath.split(path.sep).join('/');
  const relPath = normPath.substring(normPath.indexOf('app/api/'));
  const endpoint = '/' + relPath.replace('/route.ts', '').replace('/route.js', '').replace('app/', '');
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find exported methods
  const methods = [];
  const methodRegex = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(/g;
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    methods.push(match[1]);
  }

  // Find requireAuth roles
  const authMatch = content.match(/requireAuth\s*\(\s*\w+\s*,\s*\[([^\]]*)\]/);
  const roles = authMatch ? authMatch[1].split(',').map(r => r.trim().replace(/['"]/g, '')) : [];

  const isPublic = content.includes('requireAuth') ? false : (endpoint.includes('/public/') || endpoint.includes('/auth/login') || endpoint.includes('/auth/refresh') || endpoint.includes('/landing') || endpoint.includes('/contact'));

  // Extract module name: e.g. /api/students/[id] -> students
  const parts = endpoint.split('/'); // ['', 'api', 'students', ...]
  const mod = parts[2] || 'root';

  const isDynamic = endpoint.includes('[');

  inventory.push({
    filePath: relPath,
    endpoint,
    module: mod,
    isDynamic,
    methods,
    roles,
    isPublic,
  });
});

console.log(`Discovered ${inventory.length} route files.`);
let totalHandlers = 0;
inventory.forEach(i => totalHandlers += i.methods.length);
console.log(`Discovered ${totalHandlers} HTTP method handlers.`);

fs.writeFileSync('route_inventory_full.json', JSON.stringify(inventory, null, 2));

// Summary by module
const moduleSummary = {};
inventory.forEach(item => {
  if (!moduleSummary[item.module]) {
    moduleSummary[item.module] = { routes: 0, handlers: 0, methods: {} };
  }
  moduleSummary[item.module].routes++;
  moduleSummary[item.module].handlers += item.methods.length;
  item.methods.forEach(m => {
    moduleSummary[item.module].methods[m] = (moduleSummary[item.module].methods[m] || 0) + 1;
  });
});

console.log('\n--- Module Summary ---');
Object.keys(moduleSummary).sort().forEach(mod => {
  const s = moduleSummary[mod];
  console.log(`${mod}: ${s.routes} routes, ${s.handlers} handlers (${JSON.stringify(s.methods)})`);
});
