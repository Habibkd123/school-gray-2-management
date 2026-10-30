import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Bus, Route, TransportAllocation } from "@/lib/models";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";
import { invalidateBusesCache } from "../route";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "super_admin", "teacher"]);
  if (error) return error;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    await connectDB();
    const bus = await Bus.findOne({ _id: id, school_id: schoolId }).lean();
    if (!bus) {
      return NextResponse.json({ success: false, error: "Bus not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: bus });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    if (body.capacity !== undefined && (isNaN(Number(body.capacity)) || Number(body.capacity) <= 0)) {
      return NextResponse.json({ success: false, error: "Capacity must be a positive number" }, { status: 400 });
    }

    await connectDB();

    const oldBus = await Bus.findOne({ _id: id, school_id: schoolId }).lean();
    if (!oldBus) {
      return NextResponse.json({ success: false, error: "Bus not found" }, { status: 404 });
    }

    if (body.busNumber && body.busNumber.trim() !== oldBus.busNumber) {
      const duplicate = await Bus.findOne({
        school_id: schoolId,
        busNumber: body.busNumber.trim(),
        _id: { $ne: id },
      });
      if (duplicate) {
        return NextResponse.json({ success: false, error: "Bus number already exists" }, { status: 400 });
      }
    }

    const updated = await Bus.findOneAndUpdate(
      { _id: id, school_id: schoolId },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, error: "Bus not found" }, { status: 404 });
    }

    if (oldBus.assignedRoute !== updated.assignedRoute) {
      if (oldBus.assignedRoute && oldBus.assignedRoute !== "Not Assigned") {
        await Route.findOneAndUpdate(
          { school_id: schoolId, routeName: oldBus.assignedRoute, assignedBus: oldBus.busNumber },
          { assignedBus: "Not Assigned" }
        );
      }
      if (updated.assignedRoute && updated.assignedRoute !== "Not Assigned") {
        await Bus.updateMany(
          { school_id: schoolId, _id: { $ne: id }, assignedRoute: updated.assignedRoute },
          { assignedRoute: "Not Assigned" }
        );
        await Route.findOneAndUpdate(
          { school_id: schoolId, routeName: updated.assignedRoute },
          { assignedBus: updated.busNumber }
        );
      }
    }

    if (oldBus.busNumber !== updated.busNumber && updated.assignedRoute && updated.assignedRoute !== "Not Assigned") {
      await Route.findOneAndUpdate(
        { school_id: schoolId, routeName: updated.assignedRoute },
        { assignedBus: updated.busNumber }
      );
    }

    invalidateBusesCache(schoolId as string);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: "Bus number already exists" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    await connectDB();

    // Check for active allocation dependencies
    const activeAllocations = await TransportAllocation.countDocuments({ school_id: schoolId, bus_id: id });
    if (activeAllocations > 0) {
      return NextResponse.json({
        success: false,
        error: "Cannot delete bus with active student allocations. Remove or reassign allocations first."
      }, { status: 400 });
    }

    const deleted = await Bus.findOneAndDelete({ _id: id, school_id: schoolId });
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Bus not found" }, { status: 404 });
    }

    if (deleted.assignedRoute && deleted.assignedRoute !== "Not Assigned") {
      await Route.findOneAndUpdate(
        { school_id: schoolId, routeName: deleted.assignedRoute, assignedBus: deleted.busNumber },
        { assignedBus: "Not Assigned" }
      );
    }

    invalidateBusesCache(schoolId as string);

    return NextResponse.json({ success: true, data: deleted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
