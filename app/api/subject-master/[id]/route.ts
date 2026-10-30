import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { SubjectMaster, SubjectAssignment, TeacherAssignment } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";
import { invalidateSubjectMasterCache } from "../route";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
  }

  const auth = requireAuth(req, ["school_admin", "teacher", "accountant", "super_admin"]);
  if (auth.error) return auth.error;
  const { schoolId, user } = auth;

  try {
    await connectToDatabase();
    const query: any = { _id: id };
    if (user.role !== "super_admin" && schoolId) {
      query.school_id = schoolId;
    }
    const subject = await SubjectMaster.findOne(query).lean();
    if (!subject) return NextResponse.json({ success: false, message: "Subject not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: subject });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
  }

  const auth = requireAuth(req, ["school_admin", "super_admin"]);
  if (auth.error) return auth.error;
  const { schoolId, user } = auth;

  try {
    await connectToDatabase();
    const { name, subject_code, description, status, allowed_streams } = await req.json();
    const update: any = {};
    if (name?.trim()) update.name = name.trim();
    if (subject_code !== undefined) update.subject_code = subject_code?.trim().toUpperCase() || undefined;
    if (description !== undefined) update.description = description?.trim() || undefined;
    if (status) update.status = status;
    if (allowed_streams !== undefined) update.allowed_streams = Array.isArray(allowed_streams) ? allowed_streams : [];

    const query: any = { _id: id };
    if (user.role !== "super_admin" && schoolId) {
      query.school_id = schoolId;
    }

    const subject = await SubjectMaster.findOneAndUpdate(
      query,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!subject) return NextResponse.json({ success: false, message: "Subject not found" }, { status: 404 });
    invalidateSubjectMasterCache(String(subject.school_id));
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
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
  }

  const auth = requireAuth(req, ["school_admin", "super_admin"]);
  if (auth.error) return auth.error;
  const { schoolId, user } = auth;

  try {
    await connectToDatabase();

    const query: any = { _id: id };
    if (user.role !== "super_admin" && schoolId) {
      query.school_id = schoolId;
    }

    const subject = await SubjectMaster.findOne(query);
    if (!subject) return NextResponse.json({ success: false, message: "Subject not found" }, { status: 404 });

    const targetSchoolId = subject.school_id;

    const [
      subjectAssignments,
      teacherAssignments
    ] = await Promise.all([
      SubjectAssignment.countDocuments({ school_id: targetSchoolId, subject_master_id: id }),
      TeacherAssignment.countDocuments({ school_id: targetSchoolId, subject_master_id: id, is_deleted: false })
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
    invalidateSubjectMasterCache(String(targetSchoolId));
    return NextResponse.json({ success: true, message: "Subject deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
