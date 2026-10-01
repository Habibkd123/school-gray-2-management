import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import School from "@/lib/models/School";
import { getSubdomainHost } from "@/lib/utils/subdomain";

import mongoose from "mongoose";

/**
 * GET /api/public/school-info?subdomain=bajrang
 * GET /api/public/school-info?school_id=6a2790ea0d99d9775d96be6a
 * GET /api/public/school-info?custom_domain=www.bajrangschool.com
 *
 * Public endpoint — no auth required.
 * Returns school info + SEO meta_config for login page & layout metadata.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId     = searchParams.get("school_id")?.trim();
    const subdomain    = searchParams.get("subdomain")?.toLowerCase().trim();
    const customDomain = searchParams.get("custom_domain")?.toLowerCase().trim();

    if (!subdomain && !customDomain && !schoolId) {
      return NextResponse.json(
        { success: false, message: "subdomain, custom_domain or school_id is required" },
        { status: 400 }
      );
    }

    await connectDB();

    let query: Record<string, any> = { is_active: true };
    if (schoolId && mongoose.isValidObjectId(schoolId)) {
      query._id = schoolId;
    } else if (subdomain) {
      query.$or = [{ subdomain }, { slug: subdomain }];
    } else if (customDomain) {
      query.custom_domain = customDomain;
    } else {
      return NextResponse.json(
        { success: false, message: "Invalid query parameter provided." },
        { status: 400 }
      );
    }

    const school = await School.findOne(query)
      .select("_id name subtitle logo_url subdomain custom_domain meta_config")
      .lean();

    if (!school) {
      return NextResponse.json(
        { success: false, message: "School not found for this domain." },
        { status: 404 }
      );
    }

    const meta = (school as any).meta_config ?? {};
    const sub         = (school as any).subdomain || subdomain || "";
    const host        = (school as any).custom_domain || getSubdomainHost(sub, false);
    const siteUrl     = `https://${host}`;

    return NextResponse.json({
      success: true,
      data: {
        id:       (school as any)._id,
        name:     (school as any).name?.trim(),
        subtitle: (school as any).subtitle?.trim(),
        logo_url: (school as any).logo_url,
        subdomain:(school as any).subdomain,
        // SEO metadata
        meta: {
          title:          meta.meta_title       || `${(school as any).name} | Portal`,
          description:    meta.meta_description || `Official ERP portal of ${(school as any).name}.`,
          keywords:       meta.meta_keywords    || `${(school as any).name}, school portal, myschoollife`,
          og_image:       meta.og_image         || (school as any).logo_url || "",
          og_type:        meta.og_type          || "website",
          twitter_handle: meta.twitter_handle   || "",
          canonical_url:  meta.canonical_url    || `${siteUrl}/login`,
          favicon_url:    meta.favicon_url      || "",
        },
      },
    });
  } catch (error) {
    console.error("[SCHOOL-INFO ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
