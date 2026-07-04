import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import School from "@/lib/models/School";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/utils/auth";
import {
  getPresetTheme,
  PRESET_LABELS,
  type ThemePreset,
} from "@/lib/themes/presets";
import { getSchoolThemeById } from "@/lib/themes/getSchoolTheme";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const VALID_PRESETS: ThemePreset[] = ["cbse_saffron", "navy_blue", "emerald_green", "crimson_maroon", "modern_teal", "custom"];

async function resolveSchoolId(id: string): Promise<string | null> {
  if (mongoose.isValidObjectId(id)) {
    return id;
  }
  await connectDB();
  const school = await School.findOne({ slug: id.toLowerCase() }).select("_id").lean();
  return school ? school._id.toString() : null;
}

// GET /api/schools/[id]/theme
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request, ["super_admin"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;

  try {
    await connectDB();
    const schoolId = await resolveSchoolId(id);
    if (!schoolId) {
      return NextResponse.json({ success: false, message: "School not found" }, { status: 404 });
    }
    const resolved = await getSchoolThemeById(schoolId);
    if (!resolved) {
      return NextResponse.json({ success: false, message: "School not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...resolved,
        preset_labels: PRESET_LABELS,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch theme";
    console.error("[SCHOOL THEME GET ERROR]", error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT /api/schools/[id]/theme
export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request, ["super_admin"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;

  try {
    await connectDB();
    const schoolId = await resolveSchoolId(id);
    if (!schoolId) {
      return NextResponse.json({ success: false, message: "School not found" }, { status: 404 });
    }
    const body = await request.json();
    const school = await School.findById(schoolId);
    if (!school) {
      return NextResponse.json({ success: false, message: "School not found" }, { status: 404 });
    }

    const preset = body.preset as ThemePreset | undefined;
    if (preset && !VALID_PRESETS.includes(preset)) {
      return NextResponse.json({ success: false, message: "Invalid theme preset" }, { status: 400 });
    }

    const nextPreset = preset ?? school.theme_config?.preset ?? "navy_blue";
    const base = getPresetTheme(nextPreset === "custom" ? "navy_blue" : nextPreset);

    if (nextPreset !== "custom") {
      school.theme_config = getPresetTheme(nextPreset);
    } else {
      school.theme_config = {
        preset: "custom",
        colors: {
          ...base.colors,
          ...(body.colors || {}),
        },
      };
    }

    if (body.logo_url !== undefined) {
      school.logo_url = body.logo_url?.trim() || null;
    }

    await school.save();

    const resolved = await getSchoolThemeById(schoolId);
    return NextResponse.json({
      success: true,
      message: "Theme updated successfully",
      data: resolved,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update theme";
    console.error("[SCHOOL THEME PUT ERROR]", error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
