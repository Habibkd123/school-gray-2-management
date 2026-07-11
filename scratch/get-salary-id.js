const dotenv = require("dotenv");
const mongoose = require("mongoose");
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not found");
  process.exit(1);
}

mongoose.connect(MONGODB_URI).then(async () => {
  console.log("Connected to MongoDB");
  const db = mongoose.connection.db;
  const salarypayments = await db.collection("salarypayments").find({}).limit(5).toArray();
  console.log("Salaries:");
  salarypayments.forEach(s => {
    console.log(`ID: ${s._id}, Period: ${s.salary_period}, Status: ${s.status}`);
  });
  mongoose.connection.close();
}).catch(err => {
  console.error("Error connecting:", err);
});
