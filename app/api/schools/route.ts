import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import School from "@/lib/models/School";
import { requireAuth } from "@/lib/utils/auth";
import { validate } from "@/lib/utils/validate";

// GET /api/schools - List all schools for Super Admin
export async function GET(request: NextRequest) {
  const auth = requireAuth(request, ["super_admin"]);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const schools = await School.find({}).sort({ createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      data: schools,
    });
  } catch (error: any) {
    console.error("[SCHOOLS GET ERROR]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch schools" },
      { status: 500 }
    );
  }
}

// POST /api/schools - Create a new school
export async function POST(request: NextRequest) {
  const auth = requireAuth(request, ["super_admin"]);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const body = await request.json();

    // Validate
    const errors = validate(body, {
      name: { required: true, minLength: 2, maxLength: 100 },
      slug: { required: true, minLength: 2, maxLength: 50 },
    });

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: errors[0].message, errors },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const slug = body.slug.toLowerCase().trim();
    const existing = await School.findOne({ slug }).lean();
    if (existing) {
      return NextResponse.json(
        { success: false, message: `School with slug '${slug}' already exists` },
        { status: 409 }
      );
    }

    // Process and validate subdomain
    const subdomain = body.subdomain
      ? body.subdomain.toLowerCase().trim()
      : slug.replace(/[^a-z0-9-]/g, "");

    if (subdomain) {
      if (!/^[a-z0-9-]+$/.test(subdomain)) {
        return NextResponse.json(
          { success: false, message: "Subdomain can only contain lowercase letters, numbers, and hyphens." },
          { status: 400 }
        );
      }
      const existingSub = await School.findOne({ subdomain }).lean();
      if (existingSub) {
        return NextResponse.json(
          { success: false, message: `Subdomain '${subdomain}' is already taken by another school.` },
          { status: 409 }
        );
      }
    }

    const customDomain = body.custom_domain ? body.custom_domain.toLowerCase().trim() : undefined;

    const school = await School.create({
      name: body.name.trim(),
      slug,
      subdomain: subdomain || undefined,
      custom_domain: customDomain,
      address: body.address?.trim() || "",
      phone: body.phone?.trim() || "",
      email: body.email?.toLowerCase().trim() || "",
      timezone: body.timezone || "Asia/Kolkata",
      is_active: body.is_active !== false,
    });

    return NextResponse.json(
      { success: true, message: "School created successfully", data: school },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[SCHOOLS POST ERROR]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create school" },
      { status: 500 }
    );
  }
}
