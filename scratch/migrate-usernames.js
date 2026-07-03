/**
 * scratch/migrate-usernames.js
 * Migration script to bulk generate or correct usernames for all users.
 * This runs offline and avoids N+1 database queries by pre-fetching school details.
 *
 * Usage: node scratch/migrate-usernames.js
 */

require("dotenv").config({ path: ".env" });
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not defined in .env");
  process.exit(1);
}

// Inline username generation logic to match lib/utils/username.ts
function generateUsername(email, schoolSlug) {
  const cleanedEmail = email.toLowerCase().trim();
  const domain = "myschoollife";
  
  if (cleanedEmail.endsWith(`.${domain}`)) {
    return cleanedEmail;
  }

  const localPart = email.split("@")[0].toLowerCase().trim().replace(/[^a-z0-9.]/g, "");

  if (schoolSlug) {
    const slug = schoolSlug.toLowerCase().trim().replace(/[^a-z0-9.]/g, "");
    if (localPart === slug) {
      return `${slug}.${domain}`;
    }
    if (localPart.endsWith(`.${slug}`)) {
      return `${localPart}.${domain}`;
    }
    return `${localPart}.${slug}.${domain}`;
  }

  return `${localPart}.${domain}`;
}

async function run() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log("✅ Connected to MongoDB.");

  // Register models if not already registered
  const schoolSchema = new mongoose.Schema({}, { strict: false });
  const School = mongoose.models.School || mongoose.model("School", schoolSchema, "schools");

  const userSchema = new mongoose.Schema({
    email: String,
    username: String,
    school_id: mongoose.Schema.Types.ObjectId,
    role: String
  }, { strict: false });
  const User = mongoose.models.User || mongoose.model("User", userSchema, "users");

  console.log("🏫 Fetching schools...");
  const schools = await School.find({}, "slug").lean();
  const schoolMap = new Map(schools.map(s => [s._id.toString(), s.slug]));
  console.log(`✅ Loaded ${schoolMap.size} schools.`);

  console.log("👤 Fetching all users...");
  const users = await User.find({});
  console.log(`✅ Found ${users.length} users.`);

  let migrationCount = 0;
  for (const user of users) {
    if (!user.email) continue;
    const schoolIdStr = user.school_id ? user.school_id.toString() : null;
    const schoolSlug = schoolIdStr ? schoolMap.get(schoolIdStr) : null;
    const targetUsername = generateUsername(user.email, schoolSlug);

    if (!user.username || user.username !== targetUsername) {
      console.log(`  Updating ${user.email}: "${user.username || ''}" ➔ "${targetUsername}"`);
      user.username = targetUsername;
      await User.updateOne({ _id: user._id }, { $set: { username: targetUsername } });
      migrationCount++;
    }
  }

  console.log(`🎉 Bulk username migration completed. Updated ${migrationCount} users.`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
