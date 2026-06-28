import connectDB from "@/lib/db";
import { getSchoolThemeById } from "@/lib/themes/getSchoolTheme";
import { resolveThemeConfig, themeColorsToCssVars } from "@/lib/themes/presets";

/** Inject school theme CSS variables on first HTML paint (before client JS). */
export async function ServerThemeStyles() {
  const schoolId = process.env.NEXT_PUBLIC_SCHOOL_ID;
  if (!schoolId) {
    console.warn("[ServerThemeStyles] NEXT_PUBLIC_SCHOOL_ID not set");
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

  const block = Object.entries(cssVars)
    .map(([key, value]) => `${key}: ${value};`)
    .join("\n  ");

  return (
    <style
      id="school-theme-vars"
      dangerouslySetInnerHTML={{ __html: `:root {\n  ${block}\n}` }}
    />
  );
}
