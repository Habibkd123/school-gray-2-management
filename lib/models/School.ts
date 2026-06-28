import mongoose, { Document, Model, Schema } from "mongoose";
import type { ThemeConfig, ThemePreset } from "@/lib/themes/presets";
import { getPresetTheme } from "@/lib/themes/presets";

// ─── Academic Config Sub-document ─────────────────────────────────
export interface IAcademicConfig {
  enable_streams: boolean;
  enable_sections: boolean;
}

export interface IThemeConfig {
  preset: ThemePreset;
  colors: ThemeConfig["colors"];
}

// ─── School Interface ──────────────────────────────────────────────
export interface ISchool extends Document {
  name: string;
  subtitle?: string;
  slug: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone: string;
  is_active: boolean;
  academic_config: IAcademicConfig;
  theme_config: IThemeConfig;
  createdAt: Date;
  updatedAt: Date;
}

const academicConfigSchema = new Schema<IAcademicConfig>(
  {
    enable_streams: { type: Boolean, default: false },
    enable_sections: { type: Boolean, default: false },
  },
  { _id: false }
);

const defaultNavy = getPresetTheme("navy_blue");

const themeConfigSchema = new Schema<IThemeConfig>(
  {
    preset: {
      type: String,
      enum: ["cbse_saffron", "navy_blue", "custom"],
      default: "navy_blue",
    },
    colors: {
      primary: { type: String, default: defaultNavy.colors.primary },
      primary_hover: { type: String, default: defaultNavy.colors.primary_hover },
      background: { type: String, default: defaultNavy.colors.background },
      foreground: { type: String, default: defaultNavy.colors.foreground },
      sidebar_bg: { type: String, default: defaultNavy.colors.sidebar_bg },
      border_color: { type: String, default: defaultNavy.colors.border_color },
      card_bg: { type: String, default: defaultNavy.colors.card_bg },
      success: { type: String, default: defaultNavy.colors.success },
      danger: { type: String, default: defaultNavy.colors.danger },
      warning: { type: String, default: defaultNavy.colors.warning },
      info: { type: String, default: defaultNavy.colors.info },
      muted_text: { type: String, default: defaultNavy.colors.muted_text },
      section_alt: { type: String, default: defaultNavy.colors.section_alt },
    },
  },
  { _id: false }
);

const schoolSchema = new Schema<ISchool>(
  {
    name: { type: String, required: [true, "School name is required"], trim: true },
    subtitle: { type: String, default: "Public School", trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logo_url: { type: String, default: null },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    timezone: { type: String, default: "Asia/Kolkata" },
    is_active: { type: Boolean, default: true },
    academic_config: { type: academicConfigSchema, default: () => ({ enable_streams: false, enable_sections: false }) },
    theme_config: { type: themeConfigSchema, default: () => getPresetTheme("navy_blue") },
  },
  { timestamps: true }
);

const School: Model<ISchool> =
  mongoose.models.School || mongoose.model<ISchool>("School", schoolSchema);

export default School;
