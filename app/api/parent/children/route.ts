import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import connectDB from "@/lib/db";
import Student from "@/lib/models/Student";
import { Parent } from "@/lib/models";
import Class from "@/lib/models/Class";

export async function GET(request: NextRequest) {
  try {
    const { user, schoolId, error } = requireAuth(request, ["parent"]);
    if (error) return error;

    await connectDB();

    // Ensure Class model is loaded for population
    if (!Class) {
      console.warn("Class model not loaded");
    }

    const parent = await Parent.findOne({ user_id: user.user_id, school_id: schoolId });
    if (!parent) {
      return NextResponse.json({ success: false, message: "Parent profile not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const academic_year = url.searchParams.get("academic_year");

    const query: any = {
      school_id: schoolId,
      parent_id: parent._id,
      is_active: true,
    };

    if (academic_year) {
      const classes = await Class.find({ academic_year, school_id: schoolId }).select("_id").lean();
      const classIds = classes.map(c => c._id);
      query.class_id = { $in: classIds };
    }

    // Find students where parent_id matches
    const children = await Student.find(query)
      .populate("class_id", "name section")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: children,
    });
  } catch (error: any) {
    console.error("Error fetching parent's children:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch children" },
      { status: 500 }
    );
  }
}
