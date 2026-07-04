const fs = require('fs');
const path = require('path');

const projectRoot = 'c:\\Users\\habib\\OneDrive\\Documents\\school-management';
const apiDir = path.join(projectRoot, 'app', 'api');

function getFilesRecursively(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = getFilesRecursively(apiDir);
console.log(`Found ${files.length} source files under app/api. Scanning...`);

let issuesFound = 0;

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // We check if the file references mongoose models or queries but doesn't connectDB
  const hasDbQueries = content.includes('.find(') || 
                       content.includes('.findOne(') || 
                       content.includes('.findById(') || 
                       content.includes('.create(') || 
                       content.includes('.updateOne(') || 
                       content.includes('.updateMany(') || 
                       content.includes('.deleteOne(') || 
                       content.includes('.deleteMany(') || 
                       content.includes('.countDocuments(') || 
                       content.includes('.findOneAndUpdate(') || 
                       content.includes('.findOneAndDelete(') || 
                       content.includes('.aggregate(');
                       
  if (hasDbQueries) {
    // Check if connectDB or connectToDatabase is called
    const hasConnectDB = content.includes('connectDB(') || content.includes('connectToDatabase(');
    if (!hasConnectDB) {
      console.log(`❌ VULNERABLE: ${path.relative(projectRoot, filePath)} queries database but doesn't call connectDB() or connectToDatabase()!`);
      issuesFound++;
    } else {
      // Check if connection is called before the query
      let connectIndex = content.indexOf('connectDB(');
      if (connectIndex === -1) {
        connectIndex = content.indexOf('connectToDatabase(');
      }
      
      const queryMethods = ['.find(', '.findOne(', '.findById(', '.create(', '.updateOne(', '.updateMany(', '.deleteOne(', '.deleteMany(', '.countDocuments(', '.findOneAndUpdate(', '.findOneAndDelete(', '.aggregate('];
      let earliestQueryIndex = Infinity;
      let earliestQueryMethod = '';
      
      queryMethods.forEach(method => {
        const idx = content.indexOf(method);
        if (idx !== -1 && idx < earliestQueryIndex) {
          earliestQueryIndex = idx;
          earliestQueryMethod = method;
        }
      });
      
      if (earliestQueryIndex < connectIndex) {
        console.log(`⚠️ POTENTIAL ORDER ISSUE: ${path.relative(projectRoot, filePath)} first query (${earliestQueryMethod}) appears before connection call in source text!`);
        issuesFound++;
      }
    }
  }
});

console.log(`\nScan complete. Found ${issuesFound} potential issues.`);
