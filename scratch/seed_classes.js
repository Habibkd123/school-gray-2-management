const mongoose = require("mongoose");
require("dotenv").config({ path: ".env" });

const MONGO_URI = process.env.MONGODB_URI;
const SCHOOL_ID = process.env.NEXT_PUBLIC_SCHOOL_ID || "6a2790ea0d99d9775d96be6a";
const ACADEMIC_YEAR = "2026-2027";

function computeSortWeight(name) {
  const n = (name || "").toLowerCase().trim();
  if (n.startsWith("nursery")) return 1;
  if (n.startsWith("lkg"))     return 2;
  if (n.startsWith("ukg"))     return 3;
  const m = n.match(/(?:class\s+|grade\s+|std\s+)?(\d+)/);
  if (m) return 10 + parseInt(m[1], 10);
  return 100;
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const ClassSchema = new mongoose.Schema({
    school_id: mongoose.Schema.Types.ObjectId,
    name: String,
    section: String,
    academic_year: String,
    capacity: Number,
    status: String,
    sort_weight: Number
  }, { strict: false });
  const Class = mongoose.models.Class || mongoose.model("Class", ClassSchema);

  const targetClasses = [
    "Nursery", "LKG", "UKG",
    "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
    "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
    "Class 11", "Class 12"
  ];

  console.log(`Seeding classes for school ${SCHOOL_ID} and year ${ACADEMIC_YEAR}...`);

  for (const name of targetClasses) {
    const existing = await Class.findOne({
      school_id: new mongoose.Types.ObjectId(SCHOOL_ID),
      name: name,
      academic_year: ACADEMIC_YEAR,
      section: ""
    });

    if (!existing) {
      const sort_weight = computeSortWeight(name);
      await Class.create({
        school_id: new mongoose.Types.ObjectId(SCHOOL_ID),
        name: name,
        section: "",
        academic_year: ACADEMIC_YEAR,
        capacity: 40,
        status: "Active",
        sort_weight: sort_weight
      });
      console.log(`✅ Created class: ${name}`);
    } else {
      console.log(`ℹ️ Class already exists: ${name}`);
    }
  }

  process.exit(0);
}

main().catch(console.error);
