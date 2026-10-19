const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
require("dotenv").config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await mongoose.connection.collection("users").findOne({ email: "admin@school.com" });
  console.log("Admin user:", user ? user.email : "not found");
  
  const token = jwt.sign(
    { user_id: user._id.toString(), email: user.email, role: user.role, school_id: user.school_id ? user.school_id.toString() : null },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "1h" }
  );
  
  const res = await fetch("http://localhost:3000/api/classes?limit=all&include_stats=false", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const text = await res.text();
  console.log("API status:", res.status);
  console.log("API text response:", text);
  if (json.data?.classes) {
    json.data.classes.forEach(c => console.log(" -", c.name, c.section, c._id));
  }
  process.exit(0);
}

check().catch(console.error);
