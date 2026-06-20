const fs = require('fs');
const path = require('path');

const dirs = [
  'about', 'about/history', 'about/vision-mission', 'about/management', 'about/infrastructure',
  'academics', 'academics/curriculum', 'academics/faculty', 'academics/class-structure', 'academics/calendar',
  'admissions', 'admissions/apply', 'admissions/fee-structure', 'admissions/documents', 'admissions/online-form',
  'student-life', 'student-life/sports', 'student-life/cultural', 'student-life/clubs', 'student-life/achievements',
  'news', 'news/announcements', 'news/circulars', 'news/results',
  'gallery', 'gallery/photos', 'gallery/videos',
  'contact'
];

dirs.forEach(dir => {
  const fullPath = path.join(__dirname, 'app', '(website)', dir, 'page.tsx');
  if (!fs.existsSync(fullPath)) {
    // Generate simple React component name
    const componentName = dir.split(/[\/\-]/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('') + 'Page';
      
    const content = `import React from 'react';

export default function ${componentName}() {
  return (
    <div className="py-20 px-4 md:px-8 max-w-7xl mx-auto min-h-[60vh]">
      <h1 className="text-4xl font-bold mb-6 capitalize">${dir.replace(/-/g, ' ').replace(/\//g, ' > ')}</h1>
      <p className="text-gray-600 mb-8">This is the placeholder page for the ${dir} section.</p>
      <div className="p-8 bg-gray-50 border border-gray-200 rounded-2xl">
        <p className="text-gray-500">Content for this section will be added here soon.</p>
      </div>
    </div>
  );
}
`;
    fs.writeFileSync(fullPath, content);
  }
});
console.log('Pages created successfully.');
