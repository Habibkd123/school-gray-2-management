const fs = require('fs');
const path = require('path');

const projectRoot = 'c:\\Users\\habib\\OneDrive\\Documents\\school-management';
const directoriesToScan = ['app', 'lib', 'pages', 'components'];

function getFilesRecursively(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
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

let files = [];
directoriesToScan.forEach(dir => {
  files = files.concat(getFilesRecursively(path.join(projectRoot, dir)));
});

console.log(`Found ${files.length} source files under scan directories. Scanning...`);

let issuesFound = 0;

// Regex patterns to identify Mongoose queries
const mongooseQueryRegexes = [
  /\b[A-Z][a-zA-Z0-9_]*\.findOne\(/,
  /\b[A-Z][a-zA-Z0-9_]*\.findById\(/,
  /\b[A-Z][a-zA-Z0-9_]*\.findOneAndUpdate\(/,
  /\b[A-Z][a-zA-Z0-9_]*\.findOneAndDelete\(/,
  /\b[A-Z][a-zA-Z0-9_]*\.countDocuments\(/,
  /\b[A-Z][a-zA-Z0-9_]*\.aggregate\(/,
  /\b[A-Z][a-zA-Z0-9_]*\.find\(/, // Capitalized .find(
  /\b[A-Z][a-zA-Z0-9_]*\.create\(/, // Capitalized .create(
  /\b[A-Z][a-zA-Z0-9_]*\.updateOne\(/,
  /\b[A-Z][a-zA-Z0-9_]*\.updateMany\(/,
  /\b[A-Z][a-zA-Z0-9_]*\.deleteOne\(/,
  /\b[A-Z][a-zA-Z0-9_]*\.deleteMany\(/,
  /mongoose\.model\([^)]+\)\.(find|findOne|findById|create|updateOne|updateMany|deleteOne|deleteMany|countDocuments|findOneAndUpdate|findOneAndDelete|aggregate)\(/,
];

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Skip client component files completely
  if (content.includes('"use client"') || content.includes("'use client'")) {
    return;
  }

  let hasDbQueries = false;
  let matchingPattern = '';
  
  for (const regex of mongooseQueryRegexes) {
    const match = content.match(regex);
    if (match) {
      hasDbQueries = true;
      matchingPattern = match[0];
      break;
    }
  }
                       
  if (hasDbQueries) {
    const hasConnectDB = content.includes('connectDB(') || content.includes('connectToDatabase(');
    if (!hasConnectDB) {
      console.log(`❌ VULNERABLE: ${path.relative(projectRoot, filePath)} queries database but doesn't call connectDB() or connectToDatabase()! (Matched: ${matchingPattern})`);
      issuesFound++;
    } else {
      // Check order
      let connectIndex = content.indexOf('connectDB(');
      if (connectIndex === -1) {
        connectIndex = content.indexOf('connectToDatabase(');
      }
      
      let earliestQueryIndex = Infinity;
      let earliestQueryMethod = '';
      
      for (const regex of mongooseQueryRegexes) {
        const match = content.match(regex);
        if (match && match.index < earliestQueryIndex) {
          earliestQueryIndex = match.index;
          earliestQueryMethod = match[0];
        }
      }
      
      if (earliestQueryIndex < connectIndex) {
        console.log(`⚠️ POTENTIAL ORDER ISSUE: ${path.relative(projectRoot, filePath)} first query (${earliestQueryMethod}) appears before connection call in source text!`);
        issuesFound++;
      }
    }
  }
});

console.log(`\nScan complete. Found ${issuesFound} potential issues.`);
