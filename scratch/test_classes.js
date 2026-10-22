const mongoose = require("mongoose");
require("dotenv").config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    const schoolId = new mongoose.Types.ObjectId("6ab333f5c76c479dba790075");
    
    // Check classes in DB
    const classes = await db.collection("classes").find({
      school_id: schoolId,
      is_deleted: { $ne: true },
      status: { $ne: "Archived" }
    }).toArray();

    console.log("Classes found in DB:", classes.length);
    console.log(classes.map(c => ({ _id: c._id.toString(), name: c.name, section: c.section })));

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}
run();
