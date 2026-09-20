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

interface CacheEntry {
  data: ResolvedSchoolTheme | null;
  expiresAt: number;
}

// In-memory cache for school themes (TTL: 5 minutes)
const THEME_CACHE_TTL_MS = 5 * 60 * 1000;
const themeCache = new Map<string, CacheEntry>();

/** Invalidate cached theme for a specific school ID/slug or all schools */
export function invalidateSchoolThemeCache(schoolIdOrSlug?: string): void {
  if (!schoolIdOrSlug) {
    themeCache.clear();
    return;
  }
  const key = schoolIdOrSlug.trim().toLowerCase();
  themeCache.delete(key);
  for (const [k, entry] of themeCache.entries()) {
    if (
      entry.data &&
      (entry.data.school_id.toLowerCase() === key ||
       entry.data.school_slug.toLowerCase() === key)
    ) {
      themeCache.delete(k);
    }
  }
}

export async function getSchoolThemeById(schoolId: string): Promise<ResolvedSchoolTheme | null> {
  if (!schoolId) return null;

  const cacheKey = schoolId.trim().toLowerCase();
  const cached = themeCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  await connectDB();
  let school;
  if (mongoose.isValidObjectId(schoolId)) {
    school = await School.findById(schoolId).lean();
  } else {
    school = await School.findOne({ slug: schoolId.toLowerCase() }).lean();
  }
  if (!school) {
    // Cache negative lookup briefly (60s) to prevent spamming DB for non-existent IDs
    themeCache.set(cacheKey, { data: null, expiresAt: now + 60 * 1000 });
    return null;
  }

  const theme = resolveThemeConfig(school.theme_config as ThemeConfig | undefined);

  const resolved: ResolvedSchoolTheme = {
    school_id: school._id.toString(),
    school_name: school.name,
    school_subtitle: school.subtitle || "Public School",
    school_slug: school.slug,
    logo_url: school.logo_url ?? null,
    theme,
    css_vars: themeColorsToCssVars(theme.colors),
  };

  const expiresAt = now + THEME_CACHE_TTL_MS;
  themeCache.set(cacheKey, { data: resolved, expiresAt });
  themeCache.set(resolved.school_id.toLowerCase(), { data: resolved, expiresAt });
  if (resolved.school_slug) {
    themeCache.set(resolved.school_slug.toLowerCase(), { data: resolved, expiresAt });
  }

  return resolved;
}
