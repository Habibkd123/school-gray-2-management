import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import School from "@/lib/models/School";
import { getSubdomainHost } from "@/lib/utils/subdomain";

/**
 * GET /api/public/school-info?subdomain=bajrang
 * GET /api/public/school-info?custom_domain=www.bajrangschool.com
 *
 * Public endpoint — no auth required.
 * Returns school info + SEO meta_config for login page & layout metadata.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subdomain    = searchParams.get("subdomain")?.toLowerCase().trim();
    const customDomain = searchParams.get("custom_domain")?.toLowerCase().trim();

    if (!subdomain && !customDomain) {
      return NextResponse.json(
        { success: false, message: "subdomain or custom_domain is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Build query — try subdomain first, then custom_domain
    const query = subdomain
      ? { subdomain, is_active: true }
      : { custom_domain: customDomain, is_active: true };

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
        name:     (school as any).name,
        subtitle: (school as any).subtitle,
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
