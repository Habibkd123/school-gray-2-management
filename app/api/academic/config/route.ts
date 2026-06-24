import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import School from "@/lib/models/School";
import { requireAuth } from "@/lib/utils/auth";

// GET — fetch academic config for the school
export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "accountant", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const school = await School.findById(schoolId).select("academic_config").lean();
    if (!school) {
      return NextResponse.json({ success: false, message: "School not found" }, { status: 404 });
    }

    const config = (school as any).academic_config ?? { enable_streams: false, enable_sections: false };
    return NextResponse.json({ success: true, data: config });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}

// PUT — update academic config (admin only)
export async function PUT(req: NextRequest) {
  const { schoolId, role, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { enable_streams, enable_sections } = body;

    const update: Record<string, boolean> = {};
    if (typeof enable_streams === "boolean") update["academic_config.enable_streams"] = enable_streams;
    if (typeof enable_sections === "boolean") update["academic_config.enable_sections"] = enable_sections;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, message: "No valid fields to update" }, { status: 400 });
    }

    const school = await School.findByIdAndUpdate(
      schoolId,
      { $set: update },
      { new: true, runValidators: true }
    ).select("academic_config").lean();

    if (!school) {
      return NextResponse.json({ success: false, message: "School not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: (school as any).academic_config });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
