const mongoose = require("mongoose");
require("dotenv").config({ path: ".env" });

const MONGO_URI = process.env.MONGODB_URI;

async function main() {
  await mongoose.connect(MONGO_URI);
  const ClassSchema = new mongoose.Schema({}, { strict: false });
  const Class = mongoose.models.Class || mongoose.model("Class", ClassSchema);
  
  const SectionSchema = new mongoose.Schema({}, { strict: false });
  const Section = mongoose.models.Section || mongoose.model("Section", SectionSchema);

  const StreamSchema = new mongoose.Schema({}, { strict: false });
  const Stream = mongoose.models.Stream || mongoose.model("Stream", StreamSchema);

  const sections = await Section.find({}).lean();
  console.log("Sections in DB:", sections.map(s => `${s.name} (${s.status}, School: ${s.school_id})`));

  const streams = await Stream.find({}).lean();
  console.log("Streams in DB:", streams.map(s => `${s.name} (${s.status}, School: ${s.school_id})`));

  const classes = await Class.find({ school_id: "6a2790ea0d99d9775d96be6a" }).lean();
  console.log("Classes for school 6a2790ea0d99d9775d96be6a:", classes.map(c => `${c.name} - '${c.section}'`));

  process.exit(0);
}

main().catch(console.error);
