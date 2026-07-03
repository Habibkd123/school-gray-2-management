import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import School from "@/lib/models/School";
import User from "@/lib/models/User";
import { validate, validationErrorResponse } from "@/lib/utils/validate";

// ─── ONE-TIME SETUP ROUTE ─────────────────────────────────────────
// Is route ko sirf pehli baar chalao school + admin banana ke liye.
// Ek baar setup ho jane ke baad, is route ko disable kar do ya delete kar do.
//
// POST /api/setup
// Body: { name, slug, email, password, setup_key }
// setup_key = SETUP_SECRET_KEY from .env (security ke liye)

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // ─── Validate ─────────────────────────────────────────────────
    const errors = validate(body, {
      setup_key: { required: true },
      school_name: { required: true, minLength: 2, maxLength: 100 },
      school_slug: { required: true, minLength: 2, maxLength: 50 },
      admin_name: { required: true, minLength: 2 },
      admin_email: { required: true, isEmail: true },
      admin_password: {
        required: true,
        minLength: 8,
        match: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        matchMessage: "Password must have uppercase, lowercase, and number",
      },
    });

    if (errors.length > 0) return validationErrorResponse(errors);

    // ─── Secret key check ─────────────────────────────────────────
    const setupKey = process.env.SETUP_SECRET_KEY;
    if (!setupKey || body.setup_key !== setupKey) {
      return NextResponse.json(
        { success: false, message: "Invalid setup key. Set SETUP_SECRET_KEY in .env" },
        { status: 403 }
      );
    }

    // ─── Check if school already exists ──────────────────────────
    const existingSchool = await School.findOne({ slug: body.school_slug });
    if (existingSchool) {
      return NextResponse.json(
        {
          success: false,
          message: `School with slug '${body.school_slug}' already exists`,
          existing_school_id: existingSchool._id,
          hint: "Use this school_id in your .env as NEXT_PUBLIC_SCHOOL_ID",
        },
        { status: 409 }
      );
    }

    // ─── Create School ────────────────────────────────────────────
    const school = await School.create({
      name: body.school_name.trim(),
      slug: body.school_slug.toLowerCase().trim(),
      is_active: true,
    });

    // ─── Create School Admin ──────────────────────────────────────
    const admin = new User({
      school_id: school._id,
      name: body.admin_name.trim(),
      email: body.admin_email.toLowerCase().trim(),
      password_hash: body.admin_password, // pre-save hook will hash it
      role: "school_admin",
      is_active: true,
    });
    await admin.save();

    return NextResponse.json(
      {
        success: true,
        message: "✅ School setup complete!",
        next_steps: [
          `1. Copy school_id below`,
          `2. Paste it in .env as NEXT_PUBLIC_SCHOOL_ID=<school_id>`,
          `3. Restart the dev server: npm run dev`,
          `4. Login at /login with your admin email and password`,
        ],
        data: {
          school: {
            id: school._id,
            name: school.name,
            slug: school.slug,
          },
          admin: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[SETUP ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Setup failed. Check server logs." },
      { status: 500 }
    );
  }
}

// ─── GET: Check setup status ──────────────────────────────────────
export async function GET() {
  try {
    await connectDB();
    const schoolCount = await School.countDocuments();

    if (schoolCount === 0) {
      return NextResponse.json({
        success: true,
        status: "not_configured",
        message: "No school found. POST to /api/setup to create one.",
      });
    }

    const schools = await School.find({}, "name slug _id is_active").limit(10).lean();
    return NextResponse.json({
      success: true,
      status: "configured",
      schools: schools.map((s) => ({
        id: s._id,
        name: s.name,
        slug: s.slug,
        is_active: s.is_active,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Could not connect to database" },
      { status: 500 }
    );
  }
}
