import { NextResponse } from "next/server";

// GET /api/public/layout
// Fetches layout config from the central superadmin theme server
export async function GET() {
  const projectId = process.env.LAYOUT_PROJECT_ID;
  const apiKey = process.env.LAYOUT_API_KEY;
  const themeServer = process.env.LAYOUT_SERVER_URL || "http://localhost:4000";

  if (!projectId || !apiKey) {
    // Return empty/default layout if not configured
    return NextResponse.json({
      success: false,
      message: "Layout server not configured (LAYOUT_PROJECT_ID / LAYOUT_API_KEY missing)",
      layoutConfig: null,
    });
  }

  try {
    const res = await fetch(`${themeServer}/api/layout/${projectId}`, {
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`[Layout API] Theme server responded ${res.status}`);
      return NextResponse.json({ success: false, layoutConfig: null });
    }

    const json = await res.json();
    return NextResponse.json({
      success: true,
      layoutConfig: json.layoutConfig ?? null,
    });
  } catch (err) {
    console.error("[Layout API] Failed to fetch from theme server:", err);
    return NextResponse.json({ success: false, layoutConfig: null });
  }
}
