const mongoose = require("mongoose");
require("dotenv").config();

async function inspectSchools() {
  await mongoose.connect(process.env.MONGODB_URI);
  const schools = await mongoose.connection.collection("schools").find({}).toArray();
  for (const s of schools) {
    console.log(`ID: ${s._id.toString()} | Name: ${s.name} | Subdomain/Slug: ${s.subdomain || s.slug}`);
  }
  process.exit(0);
}

inspectSchools().catch(console.error);
