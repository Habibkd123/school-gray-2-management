import School from "@/lib/models/School";
import mongoose from "mongoose";
import { resolveThemeConfig, themeColorsToCssVars, type ThemeConfig } from "@/lib/themes/presets";
import connectDB from "@/lib/db";


export interface ResolvedSchoolTheme {
  school_id: string;
  school_name: string;
  school_subtitle?: string;
  school_slug: string;
  logo_url: string | null;
  theme: ThemeConfig;
  css_vars: Record<string, string>;
}

export async function getSchoolThemeById(schoolId: string): Promise<ResolvedSchoolTheme | null> {
  await connectDB();
  let school;
  if (mongoose.isValidObjectId(schoolId)) {
    school = await School.findById(schoolId).lean();
  } else {
    school = await School.findOne({ slug: schoolId.toLowerCase() }).lean();
  }
  if (!school) return null;

  const theme = resolveThemeConfig(school.theme_config as ThemeConfig | undefined);

  return {
    school_id: school._id.toString(),
    school_name: school.name,
    school_subtitle: school.subtitle || "Public School",
    school_slug: school.slug,
    logo_url: school.logo_url ?? null,
    theme,
    css_vars: themeColorsToCssVars(theme.colors),
  };
}
