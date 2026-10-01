import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import School from "@/lib/models/School";
import { requireAuth } from "@/lib/utils/auth";
import { invalidateSchoolSlugCache } from "@/lib/themes/resolveSchool";
import { sendCompressedJson } from "@/lib/compression";

// In-memory cache for school meta configs (TTL 60s)
const metaConfigCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60_000;

/**
 * GET /api/school/meta-config
 * Fetch school's SEO meta config.
 * Auth: school_admin or super_admin
 * Query Param: ?school_id=... (for super_admin)
 */
export async function GET(req: NextRequest) {
  const { user, schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  const url = new URL(req.url);
  const targetSchoolId = (user?.role === "super_admin" && url.searchParams.get("school_id"))
    ? url.searchParams.get("school_id")
    : schoolId;

  if (!targetSchoolId) {
    return NextResponse.json({ success: false, message: "School ID is required" }, { status: 400 });
  }

  const cached = metaConfigCache.get(targetSchoolId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return sendCompressedJson(req, { success: true, data: cached.data }, { cacheControl: "private, max-age=60" });
  }

  try {
    await connectDB();
    const school = await School.findById(targetSchoolId)
      .select("name subtitle subdomain slug custom_domain meta_config")
      .lean();

    if (!school) {
      return NextResponse.json({ success: false, message: "School not found" }, { status: 404 });
    }

    const meta = (school as any).meta_config ?? {};

    const data = {
      school_id:                (school as any)._id.toString(),
      school_name:              (school as any).name,
      subdomain:                (school as any).subdomain || "",
      meta_title:               meta.meta_title               || "",
      meta_description:         meta.meta_description         || "",
      meta_keywords:            meta.meta_keywords            || "",
      og_image:                 meta.og_image                 || "",
      og_type:                  meta.og_type                  || "website",
      twitter_handle:           meta.twitter_handle           || "",
      canonical_url:            meta.canonical_url            || "",
      favicon_url:              meta.favicon_url              || "",
      google_site_verification: meta.google_site_verification || "",
      google_analytics_id:      meta.google_analytics_id      || "",
    };

    metaConfigCache.set(targetSchoolId, { data, timestamp: Date.now() });
    return sendCompressedJson(req, { success: true, data }, { cacheControl: "private, max-age=60" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}

/**
 * PUT /api/school/meta-config
 * Update school's SEO meta config.
 * Auth: school_admin or super_admin
 * Body: { school_id?: string, meta_title, meta_description, ... }
 */
export async function PUT(req: NextRequest) {
  const { user, schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();

    const targetSchoolId = (user?.role === "super_admin" && body.school_id)
      ? body.school_id
      : schoolId;

    if (!targetSchoolId) {
      return NextResponse.json({ success: false, message: "School ID is required" }, { status: 400 });
    }

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

    const update: Record<string, string> = {};
    for (const key of allowed) {
      if (typeof body[key] === "string") {
        update[`meta_config.${key}`] = body[key].trim();
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, message: "No valid fields to update" }, { status: 400 });
    }

    const school = await School.findByIdAndUpdate(
      targetSchoolId,
      { $set: update },
      { new: true, runValidators: true }
    ).select("slug subdomain custom_domain meta_config").lean();

    if (!school) {
      return NextResponse.json({ success: false, message: "School not found" }, { status: 404 });
    }

    // Invalidate caches
    metaConfigCache.delete(targetSchoolId);
    invalidateSchoolSlugCache();

    return sendCompressedJson(req, {
      success: true,
      message: "SEO metadata updated successfully",
      data: (school as any).meta_config,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
