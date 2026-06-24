import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { SubjectMaster } from "@/lib/models/index";
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
    const { name, subject_code, description, status } = await req.json();
    const update: any = {};
    if (name?.trim()) update.name = name.trim();
    if (subject_code !== undefined) update.subject_code = subject_code?.trim().toUpperCase() || undefined;
    if (description !== undefined) update.description = description?.trim() || undefined;
    if (status) update.status = status;

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
    const subject = await SubjectMaster.findOneAndDelete({ _id: id, school_id: schoolId });
    if (!subject) return NextResponse.json({ success: false, message: "Subject not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Subject deleted" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
