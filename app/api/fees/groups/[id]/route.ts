import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { FeeGroup, FeeMaster, FeeAllocation } from "@/lib/models";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid fee group ID" }, { status: 400 });
    }
    const body = await req.json();
    await connectDB();
    const group = await FeeGroup.findOneAndUpdate(
      { _id: id, school_id: schoolId },
      body,
      { new: true, runValidators: true }
    );
    if (!group) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: { group } });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid fee group ID" }, { status: 400 });
    }
    await connectDB();
    
    // Check if group is used
    const masterCount = await FeeMaster.countDocuments({ fee_group_id: id });
    const allocCount = await FeeAllocation.countDocuments({ fee_group_id: id });
    if (masterCount > 0 || allocCount > 0) {
      return NextResponse.json({ success: false, message: "Cannot delete group because it has linked master records or student allocations." }, { status: 400 });
    }

    const group = await FeeGroup.findOneAndDelete({ _id: id, school_id: schoolId });
    if (!group) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}


