import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import LandingContent from "@/lib/models/LandingContent";
import { requireAuth } from "@/lib/utils/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/schools/[id]/landing — super admin fetch any school's landing content
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request, ["super_admin"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;

  try {
    await connectDB();
    const doc = await LandingContent.findOne({ school_id: id }).lean();
    return NextResponse.json({ success: true, data: doc ?? null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch landing content";
    console.error("[SCHOOL LANDING GET ERROR]", error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT /api/schools/[id]/landing — super admin upsert landing content
export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request, ["super_admin"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;

  try {
    await connectDB();
    const body = await request.json();
    const { _id, school_id, __v, createdAt, updatedAt, ...updateData } = body;

    const doc = await LandingContent.findOneAndUpdate(
      { school_id: id },
      { $set: updateData, school_id: id },
      { upsert: true, new: true, runValidators: false }
    );

    return NextResponse.json({
      success: true,
      data: doc,
      message: "Landing content saved successfully",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save landing content";
    console.error("[SCHOOL LANDING PUT ERROR]", error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PATCH /api/schools/[id]/landing — super admin patch a section
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request, ["super_admin"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;

  try {
    await connectDB();
    const body = await request.json();
    const { section, data } = body as { section: string; data: Record<string, unknown> };

    if (!section || !data) {
      return NextResponse.json(
        { success: false, message: "section and data are required" },
        { status: 400 }
      );
    }

    const setPayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      setPayload[`${section}.${key}`] = value;
    }

    if (section === "news_notices" || section === "raw") {
      Object.assign(setPayload, data);
    }

    const doc = await LandingContent.findOneAndUpdate(
      { school_id: id },
      { $set: setPayload, $setOnInsert: { school_id: id } },
      { upsert: true, new: true, runValidators: false }
    );

    return NextResponse.json({ success: true, data: doc, message: "Section saved" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save section";
    console.error("[SCHOOL LANDING PATCH ERROR]", error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
