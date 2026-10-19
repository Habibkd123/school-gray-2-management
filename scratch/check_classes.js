const mongoose = require("mongoose");
require("dotenv").config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const classes = await mongoose.connection.collection("classes").find({}).toArray();
  console.log("Total classes in DB:", classes.length);
  for (const c of classes) {
    console.log(`- ${c.name} (sec: '${c.section || ""}') | year: ${c.academic_year} | deleted: ${c.is_deleted} | school: ${c.school_id}`);
  }
  process.exit(0);
}

check().catch(console.error);
