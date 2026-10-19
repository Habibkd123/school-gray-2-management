const mongoose = require("mongoose");
require("dotenv").config();

const BAJRANG_SCHOOL_ID = "6ab333f5c76c479dba790075";

async function clearBajrangData() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const schoolObjId = new mongoose.Types.ObjectId(BAJRANG_SCHOOL_ID);
  
  const filter = {
    $or: [
      { school_id: schoolObjId },
      { school_id: BAJRANG_SCHOOL_ID }
    ]
  };

  const collections = [
    "students",
    "teachers",
    "classes",
    "sections",
    "subjects",
    "subjectassignments",
    "teacherassignments",
    "attendances",
    "exams",
    "results",
    "classtests",
    "homeworks",
    "timetables",
    "syllabuses",
    "studentfeepayments",
    "studentfeeassignments",
    "classfees",
    "salarypayments",
    "parents"
  ];

  console.log(`Clearing records for Bajrang School (${BAJRANG_SCHOOL_ID})...\n`);

  for (const colName of collections) {
    try {
      const col = db.collection(colName);
      const res = await col.deleteMany(filter);
      console.log(`Deleted from ${colName}: ${res.deletedCount} records`);
    } catch (err) {
      console.log(`Error deleting from ${colName}: ${err.message}`);
    }
  }

  // Delete only student, teacher, and parent user logins (KEEP school_admin and super_admin!)
  try {
    const userCol = db.collection("users");
    const res = await userCol.deleteMany({
      $or: [{ school_id: schoolObjId }, { school_id: BAJRANG_SCHOOL_ID }],
      role: { $in: ["student", "teacher", "parent"] }
    });
    console.log(`Deleted user logins (student/teacher/parent): ${res.deletedCount} records`);
  } catch (err) {
    console.log(`Error deleting users: ${err.message}`);
  }

  console.log("\n✅ All student, teacher, academic, and attendance data for Bajrang School has been cleared cleanly!");
  process.exit(0);
}

clearBajrangData().catch(console.error);
