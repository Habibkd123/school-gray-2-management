import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import School from "@/lib/models/School";
import { requireAuth } from "@/lib/utils/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PUT /api/schools/[id] - Update school details/status
export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = requireAuth(request, ["super_admin"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;

  try {
    await connectDB();
    const body = await request.json();

    const school = await School.findById(id);
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
