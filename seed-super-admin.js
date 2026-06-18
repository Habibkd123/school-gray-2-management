/**
 * seed-super-admin.js
 * Run: node seed-super-admin.js
 *
 * Creates a Super Admin user in MongoDB.
 * Also updates ALL existing users' passwords to the master password.
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: ".env" });

const MONGO_URI = process.env.MONGODB_URI;

// ─── Super Admin Credentials ──────────────────────────────────────────────────
const SUPER_ADMIN_EMAIL    = "superadmin@myschoollife.com";
const SUPER_ADMIN_NAME     = "Super Admin";
const MASTER_PASSWORD      = "Master#2026";
// ─────────────────────────────────────────────────────────────────────────────

if (!MONGO_URI) {
  console.error("❌  MONGODB_URI not found in .env file");
  process.exit(1);
}

const userSchema = new mongoose.Schema(
  {
    school_id:           { type: mongoose.Schema.Types.ObjectId, ref: "School", default: null },
    name:                { type: String, required: true, trim: true },
    email:               { type: String, required: true, lowercase: true, trim: true },
    password_hash:       { type: String, required: true, select: false },
    role:                { type: String, required: true },
    is_active:           { type: Boolean, default: true },
    must_change_password:{ type: Boolean, default: false },
    last_login:          { type: Date, default: null },
  },
  { timestamps: true }
);

async function main() {
  console.log("\n🔌  Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("✅  Connected!\n");

  const User = mongoose.models.User || mongoose.model("User", userSchema);

  // ── 1. Hash master password ─────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash(MASTER_PASSWORD, 12);

  // ── 2. Upsert Super Admin user ──────────────────────────────────────────────
  const existing = await User.findOne({ email: SUPER_ADMIN_EMAIL });

  if (existing) {
    await User.updateOne(
      { email: SUPER_ADMIN_EMAIL },
      {
        $set: {
          name:                 SUPER_ADMIN_NAME,
          role:                 "super_admin",
          school_id:            null,
          is_active:            true,
          must_change_password: false,
          password_hash:        hashedPassword,
        },
      }
    );
    console.log("🔄  Super Admin already existed — password updated.");
  } else {
    await User.create({
      name:                 SUPER_ADMIN_NAME,
      email:                SUPER_ADMIN_EMAIL,
      password_hash:        hashedPassword,
      role:                 "super_admin",
      school_id:            null,
      is_active:            true,
      must_change_password: false,
    });
    console.log("🆕  Super Admin created successfully!");
  }

  // ── 3. Update ALL existing users' passwords to Master#2026 ─────────────────
  console.log("\n🔑  Updating master password for ALL existing users...");

  const allUsers = await User.find({}).select("_id email role");
  let updatedCount = 0;

  for (const u of allUsers) {
    await User.updateOne(
      { _id: u._id },
      { $set: { password_hash: hashedPassword, must_change_password: false } }
    );
    updatedCount++;
  }

  console.log(`✅  Master password applied to ${updatedCount} user(s).\n`);

  // ── 4. Print Summary ────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  SUPER ADMIN CREDENTIALS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Portal URL  : http://localhost:3000/super-admin`);
  console.log(`  Email       : ${SUPER_ADMIN_EMAIL}`);
  console.log(`  Password    : ${MASTER_PASSWORD}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  MASTER PASSWORD (All Portals)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Password    : ${MASTER_PASSWORD}`);
  console.log(`  Works on    : Admin, Teacher, Student, Parent`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  await mongoose.disconnect();
  console.log("🔌  Disconnected. Done!\n");
}

main().catch((err) => {
  console.error("❌  Error:", err.message);
  process.exit(1);
});
