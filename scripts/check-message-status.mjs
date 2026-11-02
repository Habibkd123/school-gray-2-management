import fs from 'fs';

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

const token = env.WHATSAPP_API_TOKEN;
const msgId = 'wamid.HBgMOTE3ODUxOTc0NjI1FQIAERgSMDUzRkVGN0QwREVEMTIyNkMzAA==';

async function check() {
  // Query Graph API for message status
  const res = await fetch(`https://graph.facebook.com/v20.0/${msgId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log('Message detail from Meta:', JSON.stringify(data, null, 2));
}

check();
