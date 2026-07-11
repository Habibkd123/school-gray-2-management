import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { SubjectMaster, SubjectAssignment, TeacherAssignment } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "accountant", "super_admin"]);
  if (error) return error;
  try {
    await connectToDatabase();
    const subject = await SubjectMaster.findOne({ _id: id, school_id: schoolId }).lean();
    if (!subject) return NextResponse.json({ success: false, message: "Subject not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: subject });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;
  try {
    await connectToDatabase();
    const { name, subject_code, description, status, allowed_streams } = await req.json();
    const update: any = {};
    if (name?.trim()) update.name = name.trim();
    if (subject_code !== undefined) update.subject_code = subject_code?.trim().toUpperCase() || undefined;
    if (description !== undefined) update.description = description?.trim() || undefined;
    if (status) update.status = status;
    if (allowed_streams !== undefined) update.allowed_streams = Array.isArray(allowed_streams) ? allowed_streams : [];

    const subject = await SubjectMaster.findOneAndUpdate(
      { _id: id, school_id: schoolId },
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!subject) return NextResponse.json({ success: false, message: "Subject not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: subject });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ success: false, message: "A subject with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;
  try {
    await connectToDatabase();

    const subject = await SubjectMaster.findOne({ _id: id, school_id: schoolId });
    if (!subject) return NextResponse.json({ success: false, message: "Subject not found" }, { status: 404 });

    const [
      subjectAssignments,
      teacherAssignments
    ] = await Promise.all([
      SubjectAssignment.countDocuments({ school_id: schoolId, subject_master_id: id }),
      TeacherAssignment.countDocuments({ school_id: schoolId, subject_master_id: id, is_deleted: false })
    ]);

    const reasons: string[] = [];
    if (subjectAssignments > 0) reasons.push(`${subjectAssignments} Class-Subject Assignments`);
    if (teacherAssignments > 0) reasons.push(`${teacherAssignments} Teacher Assignments`);

    if (reasons.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `This subject catalog item cannot be deleted because it is in use by: ${reasons.join(", ")}. Please deactivate or archive it instead.`
        },
        { status: 409 }
      );
    }

    await SubjectMaster.deleteOne({ _id: id });
    return NextResponse.json({ success: true, message: "Subject deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
