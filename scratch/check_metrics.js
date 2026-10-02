const mongoose = require("mongoose");
require("dotenv").config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const cols = await db.listCollections().toArray();
  console.log("All Collections:", cols.map(c => c.name));

  const userCounts = await db.collection("users").aggregate([
    { $group: { _id: "$role", count: { $sum: 1 } } }
  ]).toArray();
  console.log("Users by role:", userCounts);

  const studentsCount = await db.collection("students").countDocuments();
  console.log("Total students:", studentsCount);

  // Student creation timeline by month
  const studentTimeline = await db.collection("students").aggregate([
    {
      $project: {
        yearMonth: {
          $dateToString: { format: "%Y-%m", date: { $ifNull: ["$createdAt", "$admission_date", new Date()] } }
        }
      }
    },
    { $group: { _id: "$yearMonth", count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  console.log("Student Timeline:", studentTimeline);

  // Users / Admins creation timeline
  const adminTimeline = await db.collection("users").aggregate([
    { $match: { role: { $in: ["school_admin", "super_admin"] } } },
    {
      $project: {
        yearMonth: {
          $dateToString: { format: "%Y-%m", date: { $ifNull: ["$createdAt", new Date()] } }
        }
      }
    },
    { $group: { _id: "$yearMonth", count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  console.log("Admin Timeline:", adminTimeline);

  // Fees collections
  const feeColNames = cols.map(c => c.name).filter(n => n.toLowerCase().includes("fee"));
  console.log("Fee collection names:", feeColNames);
  for (const name of feeColNames) {
    const count = await db.collection(name).countDocuments();
    const sample = await db.collection(name).find({}).limit(1).toArray();
    console.log(`Col ${name}: count ${count}`, sample);
  }

  // Salary collections
  const salColNames = cols.map(c => c.name).filter(n => n.toLowerCase().includes("sal"));
  console.log("Sal collection names:", salColNames);
  for (const name of salColNames) {
    const count = await db.collection(name).countDocuments();
    const sample = await db.collection(name).find({}).limit(1).toArray();
    console.log(`Col ${name}: count ${count}`, sample);
  }

  // Document collections
  const docColNames = cols.map(c => c.name).filter(n => n.toLowerCase().includes("doc"));
  console.log("Doc collection names:", docColNames);
  for (const name of docColNames) {
    const count = await db.collection(name).countDocuments();
    const sample = await db.collection(name).find({}).limit(1).toArray();
    console.log(`Col ${name}: count ${count}`, sample);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
