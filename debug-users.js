/**
 * debug-users.js - Check users in DB and verify password
 * Run: node debug-users.js
 */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: ".env" });

const MONGO_URI = process.env.MONGODB_URI;
const MASTER_PASSWORD = "Master#2026";

const userSchema = new mongoose.Schema(
  {
    school_id:     { type: mongoose.Schema.Types.ObjectId, ref: "School", default: null },
    name:          { type: String },
    email:         { type: String },
    password_hash: { type: String, select: false },
    role:          { type: String },
    is_active:     { type: Boolean },
    must_change_password: { type: Boolean },
  },
  { timestamps: true }
);

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("✅  Connected!\n");

  const User = mongoose.models.User || mongoose.model("User", userSchema);

  // Get ALL users with password_hash
  const users = await User.find({}).select("+password_hash").lean();

  console.log(`Found ${users.length} users:\n`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  for (const u of users) {
    const passwordOk = u.password_hash ? await bcrypt.compare(MASTER_PASSWORD, u.password_hash) : false;
    const hasHash = u.password_hash ? u.password_hash.substring(0, 10) + "..." : "❌ NO HASH";

    console.log(`Name     : ${u.name}`);
    console.log(`Email    : ${u.email}`);
    console.log(`Role     : ${u.role}`);
    console.log(`School ID: ${u.school_id || "null (super_admin)"}`);
    console.log(`Active   : ${u.is_active}`);
    console.log(`Hash     : ${hasHash}`);
    console.log(`Pass OK? : ${passwordOk ? "✅ YES — Master#2026 works" : "❌ NO — password mismatch"}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }

  await mongoose.disconnect();
  console.log("\n🔌 Done.");
}

main().catch(err => { console.error("❌", err.message); process.exit(1); });
