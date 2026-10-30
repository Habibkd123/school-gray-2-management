import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { FeeType, FeeMaster } from "@/lib/models";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid fee type ID" }, { status: 400 });
    }
    const body = await req.json();
    await connectDB();
    const type = await FeeType.findOneAndUpdate(
      { _id: id, school_id: schoolId },
      body,
      { new: true, runValidators: true }
    );
    if (!type) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: { type } });
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
      return NextResponse.json({ success: false, message: "Invalid fee type ID" }, { status: 400 });
    }
    await connectDB();
    
    // Check if type is used
    const masterCount = await FeeMaster.countDocuments({ fee_type_id: id });
    if (masterCount > 0) {
      return NextResponse.json({ success: false, message: "Cannot delete type because it has linked master records." }, { status: 400 });
    }

    const type = await FeeType.findOneAndDelete({ _id: id, school_id: schoolId });
    if (!type) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}


