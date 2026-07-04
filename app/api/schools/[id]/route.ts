import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import School from "@/lib/models/School";
import User from "@/lib/models/User";
import mongoose from "mongoose";
import { requireAuth } from "@/lib/utils/auth";

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
  } catch (error: any) {
    console.error("[SCHOOL GET ERROR]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch school" },
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

    await school.save();

    return NextResponse.json({
      success: true,
      message: "School updated successfully",
      data: school,
    });
  } catch (error: any) {
    console.error("[SCHOOL UPDATE ERROR]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update school" },
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

    return NextResponse.json({
      success: true,
      message: "School deleted successfully",
    });
  } catch (error: any) {
    console.error("[SCHOOL DELETE ERROR]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete school" },
      { status: 500 }
    );
  }
}
