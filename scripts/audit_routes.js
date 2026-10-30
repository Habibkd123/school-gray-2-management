const fs = require('fs');
const inv = JSON.parse(fs.readFileSync('route_inventory.json', 'utf8'));

const moduleMap = {};
inv.forEach(item => {
  // endpoint looks like '/api/students' or 'api/students'
  const clean = item.endpoint.startsWith('/') ? item.endpoint.slice(1) : item.endpoint;
  const parts = clean.split('/'); // ['api', 'students', ...]
  const mod = parts[1] || 'root';
  if (!moduleMap[mod]) moduleMap[mod] = [];
  moduleMap[mod].push(item);
});

console.log('Modules breakdown:');
let totalRoutes = 0;
let totalHandlers = 0;
Object.keys(moduleMap).sort().forEach(m => {
  const count = moduleMap[m].length;
  const handlers = moduleMap[m].reduce((sum, i) => sum + i.methods.length, 0);
  totalRoutes += count;
  totalHandlers += handlers;
  console.log(`- ${m}: ${count} routes, ${handlers} handlers`);
});
console.log(`Total: ${totalRoutes} routes, ${totalHandlers} handlers`);
