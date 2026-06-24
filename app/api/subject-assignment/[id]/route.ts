import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { SubjectAssignment } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;
  try {
    await connectToDatabase();
    const assignment = await SubjectAssignment.findOneAndDelete({ _id: id, school_id: schoolId });
    if (!assignment) return NextResponse.json({ success: false, message: "Assignment not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Assignment removed" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
