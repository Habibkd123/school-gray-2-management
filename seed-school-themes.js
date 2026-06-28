/**
 * seed-school-themes.js
 * Run: node seed-school-themes.js
 *
 * Assigns per-school theme presets:
 *   modern-school      → cbse_saffron (My School Life brand)
 *   greenwood-academy  → navy_blue
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: ".env" });

const MONGO_URI = process.env.MONGODB_URI;

const PRESETS = {
  cbse_saffron: {
    preset: "cbse_saffron",
    colors: {
      primary: "#F59E0B",
      primary_hover: "#D97706",
      background: "#F8FAFC",
      foreground: "#0F172A",
      sidebar_bg: "#0F172A",
      border_color: "#E2E8F0",
      card_bg: "#FFFFFF",
      success: "#10B981",
      danger: "#EF4444",
      warning: "#F59E0B",
      info: "#3B82F6",
      muted_text: "#68718a",
      section_alt: "#FFF7E6",
    },
  },
  navy_blue: {
    preset: "navy_blue",
    colors: {
      primary: "#1E3A5F",
      primary_hover: "#162C47",
      background: "#FFFFFF",
      foreground: "#231F20",
      sidebar_bg: "#0F2336",
      border_color: "#E0E0E0",
      card_bg: "#F5F5F5",
      success: "#1FC16B",
      danger: "#DC3545",
      warning: "#FFD700",
      info: "#0088CC",
      muted_text: "#5C5D5D",
      section_alt: "#F0F4F9",
    },
  },
};

const ASSIGNMENTS = [
  { slug: "modern-school", preset: "cbse_saffron", label: "Modern School (My School Life)" },
  { slug: "greenwood-academy", preset: "navy_blue", label: "Greenwood Academy" },
];

const schoolSchema = new mongoose.Schema(
  {
    name: String,
    slug: String,
    theme_config: {
      preset: String,
      colors: mongoose.Schema.Types.Mixed,
    },
  },
  { strict: false }
);

async function main() {
  if (!MONGO_URI) {
    console.error("MONGODB_URI not found in .env");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  const School = mongoose.models.School || mongoose.model("School", schoolSchema);

  console.log("Seeding school themes...\n");

  for (const item of ASSIGNMENTS) {
    const theme = PRESETS[item.preset];
    const result = await School.findOneAndUpdate(
      { slug: item.slug },
      { $set: { theme_config: theme } },
      { new: true }
    );

    if (result) {
      console.log(`  ${item.label} (${item.slug}) → ${item.preset}`);
    } else {
      console.warn(`  School not found: ${item.slug}`);
    }
  }

  console.log("\nDone.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
