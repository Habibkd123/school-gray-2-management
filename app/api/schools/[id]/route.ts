import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import School from "@/lib/models/School";
import User from "@/lib/models/User";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/utils/auth";
import { invalidateSchoolThemeCache } from "@/lib/themes/getSchoolTheme";
import { invalidateSchoolSlugCache } from "@/lib/themes/resolveSchool";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function resolveSchoolId(id: string): Promise<string | null> {
  if (mongoose.isValidObjectId(id)) {
    return id;
  }
  await connectDB();
  const school = await School.findOne({ slug: id.toLowerCase() }).select("_id").lean();
  return school ? school._id.toString() : null;
}

// GET /api/schools/[id] - Fetch a single school
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request, ["super_admin"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;

  try {
    await connectDB();
    const schoolId = await resolveSchoolId(id);
    if (!schoolId) {
      return NextResponse.json(
        { success: false, message: "School not found" },
        { status: 404 }
      );
    }
    const school = await School.findById(schoolId);
    if (!school) {
      return NextResponse.json(
        { success: false, message: "School not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: school });
  } catch (error: unknown) {
    console.error("[SCHOOL GET ERROR]", error);
    const message = error instanceof Error ? error.message : "Failed to fetch school";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

// PUT /api/schools/[id] - Update school details/status
export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request, ["super_admin"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;

  try {
    await connectDB();
    const schoolId = await resolveSchoolId(id);
    if (!schoolId) {
      return NextResponse.json(
        { success: false, message: "School not found" },
        { status: 404 }
      );
    }
    const body = await request.json();

    const school = await School.findById(schoolId);
    if (!school) {
      return NextResponse.json(
        { success: false, message: "School not found" },
        { status: 404 }
      );
    }

    // Toggle status or update fields
    if (body.name !== undefined) school.name = body.name.trim();
    if (body.address !== undefined) school.address = body.address.trim();
    if (body.phone !== undefined) school.phone = body.phone.trim();
    if (body.email !== undefined) school.email = body.email.toLowerCase().trim();
    if (body.is_active !== undefined) school.is_active = !!body.is_active;
    if (body.timezone !== undefined) school.timezone = body.timezone.trim();

    if (body.subdomain !== undefined) {
      const rawSub = body.subdomain ? body.subdomain.toLowerCase().trim() : "";
      if (rawSub) {
        if (!/^[a-z0-9-]+$/.test(rawSub)) {
          return NextResponse.json(
            { success: false, message: "Subdomain can only contain lowercase letters, numbers, and hyphens." },
            { status: 400 }
          );
        }
        const existingSub = await School.findOne({
          subdomain: rawSub,
          _id: { $ne: school._id },
        }).lean();
        if (existingSub) {
          return NextResponse.json(
            { success: false, message: `Subdomain '${rawSub}' is already in use by another school.` },
            { status: 409 }
          );
        }
        school.subdomain = rawSub;
      } else {
        school.subdomain = undefined;
      }
    }

    if (body.custom_domain !== undefined) {
      const rawDom = body.custom_domain ? body.custom_domain.toLowerCase().trim() : "";
      school.custom_domain = rawDom || undefined;
    }

    // Update SEO & Meta Config
    if (body.meta_config !== undefined && typeof body.meta_config === "object") {
      const allowed = [
        "meta_title",
        "meta_description",
        "meta_keywords",
        "og_image",
        "og_type",
        "twitter_handle",
        "canonical_url",
        "favicon_url",
        "google_site_verification",
        "google_analytics_id",
      ];
      const existing = (school.meta_config as any) || {};
      const updatedMeta: Record<string, string> = { ...existing };
      for (const key of allowed) {
        if (body.meta_config[key] !== undefined) {
          updatedMeta[key] = typeof body.meta_config[key] === "string" ? body.meta_config[key].trim() : body.meta_config[key];
        }
      }
      school.meta_config = updatedMeta as any;
    }

    await school.save();

    invalidateSchoolThemeCache(schoolId);
    invalidateSchoolSlugCache();
    if (school.slug) {
      invalidateSchoolThemeCache(school.slug);
    }
    if (school.subdomain) {
      invalidateSchoolThemeCache(school.subdomain);
    }
    if (school.custom_domain) {
      invalidateSchoolThemeCache(school.custom_domain);
    }

    return NextResponse.json({
      success: true,
      message: "School updated successfully",
      data: school,
    });
  } catch (error: unknown) {
    console.error("[SCHOOL UPDATE ERROR]", error);
    const message = error instanceof Error ? error.message : "Failed to update school";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}

// DELETE /api/schools/[id] - Remove a school (blocked if users are assigned)
export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request, ["super_admin"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;

  try {
    await connectDB();
    const schoolId = await resolveSchoolId(id);
    if (!schoolId) {
      return NextResponse.json(
        { success: false, message: "School not found" },
        { status: 404 }
      );
    }

    const school = await School.findById(schoolId);
    if (!school) {
      return NextResponse.json(
        { success: false, message: "School not found" },
        { status: 404 }
      );
    }

    const linkedUsers = await User.countDocuments({ school_id: schoolId });
    if (linkedUsers > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot delete school: ${linkedUsers} user(s) are still assigned. Suspend the school or remove users first.`,
        },
        { status: 409 }
      );
    }

    await School.findByIdAndDelete(schoolId);

    invalidateSchoolThemeCache(schoolId);
    if (school.slug) {
      invalidateSchoolSlugCache(school.slug);
      invalidateSchoolThemeCache(school.slug);
    }

    return NextResponse.json({
      success: true,
      message: "School deleted successfully",
    });
  } catch (error: unknown) {
    console.error("[SCHOOL DELETE ERROR]", error);
    const message = error instanceof Error ? error.message : "Failed to delete school";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
