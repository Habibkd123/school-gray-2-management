import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { requireAuth } from "@/lib/utils/auth";
import { getSchoolThemeById } from "@/lib/themes/getSchoolTheme";
import { resolveThemeConfig, themeColorsToCssVars } from "@/lib/themes/presets";

// GET /api/theme — theme for logged-in school (dashboard)
export async function GET(request: NextRequest) {
  const auth = requireAuth(request, [
    "super_admin",
    "school_admin",
    "teacher",
    "accountant",
    "student",
    "parent",
  ]);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    // Allow super_admin to request a specific school's theme via query param
    // e.g. GET /api/theme?school_id=6a279...
    if (auth.role === "super_admin") {
      const url = new URL(request.url);
      const requestedSchoolId = url.searchParams.get("school_id");

      // Priority: explicit query param -> env override -> generic fallback
      if (requestedSchoolId) {
        const resolved = await getSchoolThemeById(requestedSchoolId);
        if (resolved) return NextResponse.json({ success: true, data: resolved });
        return NextResponse.json({ success: false, message: "School not found" }, { status: 404 });
      }

      const envSchoolId = process.env.NEXT_PUBLIC_SCHOOL_ID;
      if (envSchoolId) {
        const resolvedEnv = await getSchoolThemeById(envSchoolId);
        if (resolvedEnv) return NextResponse.json({ success: true, data: resolvedEnv });
        return NextResponse.json({ success: false, message: "School not found" }, { status: 404 });
      }

      const fallback = resolveThemeConfig(null);
      return NextResponse.json({
        success: true,
        data: {
          school_id: null,
          school_name: "Super Admin",
          school_slug: "",
          logo_url: null,
          theme: fallback,
          css_vars: themeColorsToCssVars(fallback.colors),
        },
      });
    }

    const resolved = await getSchoolThemeById(auth.schoolId);
    if (!resolved) {
      return NextResponse.json({ success: false, message: "School not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: resolved });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch theme";
    console.error("[THEME GET ERROR]", error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
