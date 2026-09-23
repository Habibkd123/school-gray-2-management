import connectDB from "@/lib/db";
import { getSchoolThemeById } from "@/lib/themes/getSchoolTheme";
import { resolveThemeConfig, themeColorsToCssVars } from "@/lib/themes/presets";
import { headers } from "next/headers";
import { resolveSchoolIdServer } from "@/lib/themes/resolveSchool";

/** Inject school theme CSS variables on first HTML paint (before client JS). */
export async function ServerThemeStyles() {
  let schoolId: string | null = null;
  try {
    const headersList = await headers();
    schoolId = await resolveSchoolIdServer(headersList);
  } catch {
    // headers() not available in static environments — skip theme injection
  }

  if (!schoolId) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[ServerThemeStyles] schoolId not resolved — visit bajrang.localhost:3000 (or ?subdomain=bajrang) to test a school theme"
      );
    }
    return null;
  }

  let cssVars: Record<string, string> | null = null;

  try {
    await connectDB();
    const resolved = await getSchoolThemeById(schoolId);
    if (resolved) {
      cssVars = resolved.css_vars;
      console.log(`[ServerThemeStyles] ✓ Loaded theme for school: ${resolved.school_name}`);
    }
  } catch (err) {
    console.error("[ServerThemeStyles] DB error:", err instanceof Error ? err.message : String(err));
  }

  if (!cssVars) {
    console.warn("[ServerThemeStyles] Falling back to navy_blue defaults");
    cssVars = themeColorsToCssVars(resolveThemeConfig(null).colors);
  }

  // Skip background/foreground — hardcoded in globals.css for forced light mode
  const SKIP_IN_LIGHT_MODE = new Set(["--background", "--foreground"]);
  const block = Object.entries(cssVars)
    .filter(([key]) => !SKIP_IN_LIGHT_MODE.has(key))
    .map(([key, value]) => `${key}: ${value};`)
    .join("\n  ");

  return (
    <style
      id="school-theme-vars"
      dangerouslySetInnerHTML={{ __html: `:root {\n  ${block}\n}` }}
    />
  );
}
