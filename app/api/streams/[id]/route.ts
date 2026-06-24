import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Stream from "@/lib/models/Stream";
import { requireAuth } from "@/lib/utils/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "accountant", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const stream = await Stream.findOne({ _id: id, school_id: schoolId }).lean();
    if (!stream) return NextResponse.json({ success: false, message: "Stream not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: stream });
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
    const { name, status } = await req.json();
    const update: any = {};
    if (name?.trim()) update.name = name.trim();
    if (status) update.status = status;

    const stream = await Stream.findOneAndUpdate(
      { _id: id, school_id: schoolId },
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!stream) return NextResponse.json({ success: false, message: "Stream not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: stream });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ success: false, message: "A stream with this name already exists" }, { status: 409 });
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
    const stream = await Stream.findOneAndDelete({ _id: id, school_id: schoolId });
    if (!stream) return NextResponse.json({ success: false, message: "Stream not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Stream deleted" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
