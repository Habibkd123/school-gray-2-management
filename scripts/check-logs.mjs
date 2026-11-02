import fs from 'fs';
import mongoose from 'mongoose';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

async function check() {
  await mongoose.connect(env.MONGODB_URI);
  const db = mongoose.connection.db;
  const latestLog = await db.collection('whatsapplogs').find({}).sort({ createdAt: -1 }).limit(1).toArray();
  console.log('Latest Log:', JSON.stringify(latestLog[0], null, 2));

  // Check Meta message status using Meta Graph API with that provider_message_id
  const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;
  const token = env.WHATSAPP_API_TOKEN;

  console.log('Checking Meta API Token & Phone...');
  // Query messages or phone info
  const phoneRes = await fetch(`https://graph.facebook.com/v20.0/${phoneId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const phoneData = await phoneRes.json();
  console.log('Phone details on Meta:', JSON.stringify(phoneData, null, 2));

  await mongoose.disconnect();
}
check();
