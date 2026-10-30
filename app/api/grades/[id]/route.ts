import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Grade } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const body = await req.json();
    const grade = await Grade.findOneAndUpdate(
      { _id: id, school_id: schoolId },
      { $set: body },
      { new: true, runValidators: true }
    );
    if (!grade) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: grade });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ success: false, message: "Grade with this name already exists" }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const grade = await Grade.findOneAndDelete({ _id: id, school_id: schoolId });
    if (!grade) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
