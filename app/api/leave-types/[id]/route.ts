import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { LeaveType } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";
import { invalidateLeaveTypesCache } from "../route";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin", "teacher", "student"]);
  if (error) return error;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const leaveType = await LeaveType.findOne({ _id: id, school_id: schoolId }).lean();
    if (!leaveType) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: leaveType });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

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
    
    const leaveType = await LeaveType.findOneAndUpdate(
      { _id: id, school_id: schoolId },
      { $set: body },
      { new: true, runValidators: true }
    );
    if (!leaveType) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    invalidateLeaveTypesCache(schoolId);
    return NextResponse.json({ success: true, data: leaveType });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ success: false, message: "Leave type with this name already exists" }, { status: 400 });
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
    const leaveType = await LeaveType.findOneAndDelete({ _id: id, school_id: schoolId });
    if (!leaveType) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    invalidateLeaveTypesCache(schoolId);
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
