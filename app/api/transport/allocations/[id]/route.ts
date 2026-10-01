import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { TransportAllocation } from "@/lib/models";
import mongoose from "mongoose";
import { invalidateAllocationsCache } from "../route";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const payload = { ...body };
    if (!payload.bus_id) {
      payload.bus_id = null;
    }

    const updated = await TransportAllocation.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    if (!updated) {
      return NextResponse.json({ success: false, error: "Allocation not found" }, { status: 404 });
    }

    invalidateAllocationsCache();

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: "Allocation conflict" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const deleted = await TransportAllocation.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Allocation not found" }, { status: 404 });
    }

    invalidateAllocationsCache();

    return NextResponse.json({ success: true, data: deleted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
