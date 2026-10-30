import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import School from "@/lib/models/School";
import { requireAuth } from "@/lib/utils/auth";
import { validate } from "@/lib/utils/validate";

import Student from "@/lib/models/Student";
import Teacher from "@/lib/models/Teacher";
import Class from "@/lib/models/Class";
import User from "@/lib/models/User";

// GET /api/schools - List all schools for Super Admin
export async function GET(request: NextRequest) {
  const auth = requireAuth(request, ["super_admin"]);
  if (auth.error) return auth.error;

  try {
    await connectDB();
    const schools = await School.find({}).sort({ createdAt: -1 }).lean();

    // Aggregate counts for students, teachers, and classes per school in parallel
    const [studentCounts, teacherCounts, classCounts] = await Promise.all([
      Student.aggregate([{ $group: { _id: "$school_id", count: { $sum: 1 } } }]),
      Teacher.aggregate([{ $group: { _id: "$school_id", count: { $sum: 1 } } }]),
      Class.aggregate([{ $group: { _id: "$school_id", count: { $sum: 1 } } }]),
    ]);

    const enrichedSchools = schools.map((s: any) => {
      const sId = s._id.toString();
      const studentsCount = studentCounts.find((c: any) => c._id && c._id.toString() === sId)?.count || 0;
      const teachersCount = teacherCounts.find((c: any) => c._id && c._id.toString() === sId)?.count || 0;
      const classesCount = classCounts.find((c: any) => c._id && c._id.toString() === sId)?.count || 0;
      return {
        ...s,
        studentsCount,
        teachersCount,
        classesCount,
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedSchools,
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

    // Check slug format and uniqueness
    const slug = body.slug.toLowerCase().trim();
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { success: false, message: "Slug can only contain lowercase letters, numbers, and hyphens." },
        { status: 400 }
      );
    }
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

    // ─── Automated School Admin Account Creation ───────────────────
    const adminEmail = (body.admin_email || `admin@${slug}.com`).toLowerCase().trim();
    const adminName = (body.admin_name || `${body.name.trim()} Admin`).trim();
    const rawAdminPassword = body.admin_password || "Master#2026";
    const adminUsername = `admin.${slug}.myschoollife`;

    // Check if an admin with this email exists for this school
    let adminUser = await User.findOne({ email: adminEmail, school_id: school._id });
    if (!adminUser) {
      adminUser = await User.create({
        school_id: school._id,
        name: adminName,
        email: adminEmail,
        username: adminUsername,
        password_hash: rawAdminPassword, // pre-save bcrypt hook hashes this
        plain_password: rawAdminPassword, // set for initial handover
        role: "school_admin",
        is_active: true,
        must_change_password: true,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "School and administrator created successfully",
        data: {
          school,
          admin_user: {
            id: adminUser._id,
            name: adminUser.name,
            email: adminUser.email,
            username: adminUser.username,
            temporary_password: rawAdminPassword,
            must_change_password: adminUser.must_change_password,
          },
        },
      },
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
