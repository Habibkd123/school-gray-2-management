import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { FeeMaster, FeePayment } from "@/lib/models";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid fee master ID" }, { status: 400 });
    }
    const body = await req.json();
    await connectDB();
    const master = await FeeMaster.findOneAndUpdate(
      { _id: id, school_id: schoolId },
      body,
      { new: true, runValidators: true }
    )
      .populate("fee_group_id", "name description")
      .populate("fee_type_id", "name description");
      
    if (!master) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: { master } });
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
      return NextResponse.json({ success: false, message: "Invalid fee master ID" }, { status: 400 });
    }
    await connectDB();
    
    // Check if master is used in any payments
    const paymentCount = await FeePayment.countDocuments({ fee_master_id: id });
    if (paymentCount > 0) {
      return NextResponse.json({ success: false, message: "Cannot delete fee master because there are payments recorded against it." }, { status: 400 });
    }

    const master = await FeeMaster.findOneAndDelete({ _id: id, school_id: schoolId });
    if (!master) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}


