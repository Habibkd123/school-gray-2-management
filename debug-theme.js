/**
 * Quick debug script to check if school theme is saved in DB
 * Run: node debug-theme.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const SCHOOL_ID = process.env.NEXT_PUBLIC_SCHOOL_ID || '6a2790ea0d99d9775d96be6a';

async function debugTheme() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected\n');

    const db = mongoose.connection.db;
    const school = await db.collection('schools').findOne(
      { _id: new mongoose.Types.ObjectId(SCHOOL_ID) }
    );

    if (!school) {
      console.log('❌ School not found with ID:', SCHOOL_ID);
      process.exit(1);
    }

    console.log('✓ School found:', school.name);
    console.log('\ntheme_config in DB:');
    console.log(JSON.stringify(school.theme_config, null, 2));
    console.log('\nlogo_url in DB:', school.logo_url);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

debugTheme();
