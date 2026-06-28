import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getSchoolThemeById } from "@/lib/themes/getSchoolTheme";
import { resolveThemeConfig } from "@/lib/themes/presets";

// GET /api/public/theme — theme for public website (env-bound school)
export async function GET() {
  const schoolId = process.env.NEXT_PUBLIC_SCHOOL_ID;
  if (!schoolId) {
    return NextResponse.json(
      { success: false, message: "NEXT_PUBLIC_SCHOOL_ID is not configured" },
      { status: 500 }
    );
  }

  try {
    await connectDB();
    const resolved = await getSchoolThemeById(schoolId);
    if (!resolved) {
      const fallback = resolveThemeConfig(null);
      return NextResponse.json({
        success: true,
        data: {
          school_id: schoolId,
          school_name: "School",
          school_subtitle: "Public School",
          school_slug: "",
          logo_url: null,
          theme: fallback,
        },
      });
    }

    return NextResponse.json({ success: true, data: resolved });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch public theme";
    console.error("[PUBLIC THEME GET ERROR]", error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
