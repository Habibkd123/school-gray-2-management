import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { TeacherAssignment, Syllabus } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

// DELETE — remove a teacher assignment
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    const params = await props.params;
    await connectToDatabase();

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    const deletedAssignment = await TeacherAssignment.findOneAndDelete({ _id: params.id, school_id: schoolId });

    if (!deletedAssignment) {
      return NextResponse.json({ success: false, message: "Teacher assignment not found" }, { status: 404 });
    }

    // Cascade delete the associated syllabus
    await Syllabus.deleteOne({ teacher_assignment_id: params.id, school_id: schoolId });

    return NextResponse.json({ success: true, message: "Teacher assignment and associated syllabus deleted" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
