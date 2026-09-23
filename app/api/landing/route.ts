import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import LandingContent from "@/lib/models/LandingContent";
import School from "@/lib/models/School";
import { requireAuth } from "@/lib/utils/auth";

// GET /api/landing — fetch this school's landing content
export async function GET(request: NextRequest) {
  const auth = requireAuth(request, ["school_admin", "super_admin", "teacher", "accountant"]);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const targetSchoolId = auth.schoolId || (auth.user?.role === "super_admin" ? (url.searchParams.get("school_id") || null) : null);

  if (!targetSchoolId) {
    return NextResponse.json({ success: false, message: "School ID not resolved" }, { status: 400 });
  }

  try {
    await connectDB();
    const doc = await LandingContent.findOne({ school_id: targetSchoolId }).lean();

    if (!doc) {
      // Return empty structure so client can render defaults
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({ success: true, data: doc });
  } catch (error: any) {
    console.error("[LANDING GET ERROR]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch landing content" },
      { status: 500 }
    );
  }
}

// PUT /api/landing — upsert the school's landing content
export async function PUT(request: NextRequest) {
  const auth = requireAuth(request, ["school_admin", "super_admin"]);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const body = await request.json();

    const targetSchoolId = auth.schoolId || (auth.user?.role === "super_admin" ? (body.school_id || null) : null);

    if (!targetSchoolId) {
      return NextResponse.json({ success: false, message: "School ID not resolved" }, { status: 400 });
    }

    // Strip _id and school_id from body to avoid conflicts
    const { _id, school_id, __v, createdAt, updatedAt, ...updateData } = body;

    const doc = await LandingContent.findOneAndUpdate(
      { school_id: targetSchoolId },
      { $set: updateData, school_id: targetSchoolId },
      { upsert: true, returnDocument: 'after', runValidators: false }
    );

    return NextResponse.json({ success: true, data: doc, message: "Saved successfully" });
  } catch (error: any) {
    console.error("[LANDING PUT ERROR]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save landing content" },
      { status: 500 }
    );
  }
}

// PATCH /api/landing — patch a single section (more efficient)
export async function PATCH(request: NextRequest) {
  const auth = requireAuth(request, ["school_admin", "super_admin"]);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const body = await request.json();
    const { section, data, school_id } = body as { section: string; data: Record<string, unknown>; school_id?: string };

    const targetSchoolId = auth.schoolId || (auth.user?.role === "super_admin" ? (school_id || null) : null);

    if (!targetSchoolId) {
      return NextResponse.json({ success: false, message: "School ID not resolved" }, { status: 400 });
    }

    if (!section || !data) {
      return NextResponse.json(
        { success: false, message: "section and data are required" },
        { status: 400 }
      );
    }

    // Build a partial update for just this section
    const setPayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      setPayload[`${section}.${key}`] = value;
    }

    // Also handle top-level array sections (e.g. news_notices)
    if (section === "news_notices" || section === "raw") {
      Object.assign(setPayload, data);
    }

    const doc = await LandingContent.findOneAndUpdate(
      { school_id: targetSchoolId },
      { $set: setPayload, $setOnInsert: { school_id: targetSchoolId } },
      { upsert: true, returnDocument: 'after', runValidators: false }
    );

    return NextResponse.json({ success: true, data: doc, message: "Section saved" });
  } catch (error: any) {
    console.error("[LANDING PATCH ERROR]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save section" },
      { status: 500 }
    );
  }
}
