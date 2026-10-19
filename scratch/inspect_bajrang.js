const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const BAJRANG_SCHOOL_ID = "6ab333f5c76c479dba790075";

async function inspectAndBackup() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const schoolObjId = new mongoose.Types.ObjectId(BAJRANG_SCHOOL_ID);
  
  // Collections to clear
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
    "salarypayments"
  ];
  
  console.log(`Checking records for Bajrang School (${BAJRANG_SCHOOL_ID})...\n`);
  const backupData = {
    school_id: BAJRANG_SCHOOL_ID,
    timestamp: new Date().toISOString(),
    collections: {}
  };

  for (const colName of collections) {
    try {
      const col = db.collection(colName);
      // School ID can be stored as ObjectId or string
      const docs = await col.find({
        $or: [
          { school_id: schoolObjId },
          { school_id: BAJRANG_SCHOOL_ID }
        ]
      }).toArray();
      
      console.log(`${colName}: ${docs.length} records`);
      backupData.collections[colName] = docs;
    } catch (err) {
      console.log(`${colName}: collection not found or error (${err.message})`);
    }
  }

  // Also check student and teacher users
  const userCol = db.collection("users");
  const studentTeacherUsers = await userCol.find({
    $or: [{ school_id: schoolObjId }, { school_id: BAJRANG_SCHOOL_ID }],
    role: { $in: ["student", "teacher", "parent"] }
  }).toArray();
  console.log(`users (students, teachers, parents): ${studentTeacherUsers.length} records`);
  backupData.collections["users"] = studentTeacherUsers;

  // Save backup to scratch/bajrang_pre_clear_backup.json
  const backupPath = path.join(__dirname, "bajrang_pre_clear_backup.json");
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  console.log(`\nSafety backup saved to: ${backupPath}`);
  
  process.exit(0);
}

inspectAndBackup().catch(console.error);
