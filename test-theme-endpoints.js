/**
 * Test public and auth theme endpoints
 * Run: node test-theme-endpoints.js
 */
require('dotenv').config();
const http = require('http');

const BASE_URL = 'http://localhost:3000';
const SCHOOL_ID = process.env.NEXT_PUBLIC_SCHOOL_ID || '6a2790ea0d99d9775d96be6a';

async function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Invalid JSON: ${data}`));
        }
      });
    });
    req.on('error', reject);
  });
}

async function test() {
  try {
    console.log('Testing theme endpoints...\n');

    console.log('1️⃣ GET /api/public/theme');
    const publicTheme = await fetchJson(`${BASE_URL}/api/public/theme`);
    console.log(JSON.stringify(publicTheme, null, 2));
    console.log('\n' + '='.repeat(60) + '\n');

    console.log('2️⃣ GET /api/schools/[id]/theme (needs auth token)');
    console.log('(Skipping — need valid token. Check in browser console)\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  process.exit(0);
}

test();
