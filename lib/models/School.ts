import mongoose, { Document, Model, Schema } from "mongoose";
import type { ThemeConfig, ThemePreset } from "@/lib/themes/presets";
import { getPresetTheme } from "@/lib/themes/presets";

// ─── Academic Config Sub-document ─────────────────────────────────
export interface IAcademicConfig {
  enable_streams: boolean;
  enable_sections: boolean;
}

// ─── SEO / Meta Config Sub-document ───────────────────────────────
export interface IMetaConfig {
  meta_title?: string;       // e.g. "Bajrang Public School | Portal"
  meta_description?: string; // e.g. "Official portal of Bajrang Public School, Jaipur."
  meta_keywords?: string;    // comma-separated: "bajrang school, school jaipur, cbse school"
  og_image?: string;         // Open Graph image URL
  og_type?: string;          // default: "website"
  twitter_handle?: string;   // e.g. "@bajrangschool"
  canonical_url?: string;    // e.g. "https://bajrang.myschoollife.in"
  favicon_url?: string;      // custom favicon per school
}

// ─── Login Config Sub-document ─────────────────────────────────────
export interface ILoginConfig {
  disable_student_login: boolean;
  disable_teacher_login: boolean;
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
  subdomain?: string;       // e.g. "bajrang" → bajrang.myschoollife.in
  custom_domain?: string;   // e.g. "www.bajrangschool.com" (future)
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  timezone: string;
  is_active: boolean;
  academic_config: IAcademicConfig;
  theme_config: IThemeConfig;
  login_config: ILoginConfig;
  meta_config: IMetaConfig;
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
      enum: ["cbse_saffron", "navy_blue", "emerald_green", "crimson_maroon", "modern_teal", "custom"],
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

const loginConfigSchema = new Schema<ILoginConfig>(
  {
    disable_student_login: { type: Boolean, default: false },
    disable_teacher_login: { type: Boolean, default: false },
  },
  { _id: false }
);

const metaConfigSchema = new Schema<IMetaConfig>(
  {
    meta_title:       { type: String, trim: true, default: "" },
    meta_description: { type: String, trim: true, default: "" },
    meta_keywords:    { type: String, trim: true, default: "" }, // comma-separated
    og_image:         { type: String, default: "" },
    og_type:          { type: String, default: "website" },
    twitter_handle:   { type: String, trim: true, default: "" },
    canonical_url:    { type: String, trim: true, default: "" },
    favicon_url:      { type: String, default: "" },
  },
  { _id: false }
);

const schoolSchema = new Schema<ISchool>(
  {
    name: { type: String, required: [true, "School name is required"], trim: true },
    subtitle: { type: String, default: "Public School", trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // subdomain: unique short name for the school's URL (e.g. "bajrang" → bajrang.myschoollife.in)
    subdomain: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    // custom_domain: school's own domain (future feature, e.g. "www.bajrangschool.com")
    custom_domain: { type: String, sparse: true, lowercase: true, trim: true },
    logo_url: { type: String, default: null },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    timezone: { type: String, default: "Asia/Kolkata" },
    is_active: { type: Boolean, default: true },
    academic_config: { type: academicConfigSchema, default: () => ({ enable_streams: false, enable_sections: false }) },
    theme_config: { type: themeConfigSchema, default: () => getPresetTheme("navy_blue") },
    login_config: { type: loginConfigSchema, default: () => ({ disable_student_login: false, disable_teacher_login: false }) },
    meta_config: { type: metaConfigSchema, default: () => ({}) },
  },
  { timestamps: true }
);

// ─── Indexes for fast subdomain/domain lookups ────────────────────────────────
// autoIndex is disabled globally (db.ts) — these are declared for manual sync via SYNC_INDEXES=true
// subdomain & slug are already unique (implicit index); adding compound with is_active for query speed
schoolSchema.index({ subdomain: 1, is_active: 1 }, { sparse: true, name: "subdomain_active_idx" });
schoolSchema.index({ custom_domain: 1, is_active: 1 }, { sparse: true, name: "custom_domain_active_idx" });
schoolSchema.index({ slug: 1, is_active: 1 }, { name: "slug_active_idx" });


const School: Model<ISchool> =
  mongoose.models.School || mongoose.model<ISchool>("School", schoolSchema);

export default School;
