import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Route, Bus, TransportAllocation } from "@/lib/models";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";
import { invalidateRoutesCache } from "../route";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "super_admin", "teacher"]);
  if (error) return error;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    await connectDB();
    const route = await Route.findOne({ _id: id, school_id: schoolId }).lean();
    if (!route) {
      return NextResponse.json({ success: false, error: "Route not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: route });
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
    await connectDB();

    const oldRoute = await Route.findOne({ _id: id, school_id: schoolId }).lean();
    if (!oldRoute) {
      return NextResponse.json({ success: false, error: "Route not found" }, { status: 404 });
    }

    if (body.routeName && body.routeName.trim() !== oldRoute.routeName) {
      const duplicate = await Route.findOne({
        school_id: schoolId,
        routeName: body.routeName.trim(),
        _id: { $ne: id },
      });
      if (duplicate) {
        return NextResponse.json({ success: false, error: "Route name already exists" }, { status: 400 });
      }
    }

    const updated = await Route.findOneAndUpdate(
      { _id: id, school_id: schoolId },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, error: "Route not found" }, { status: 404 });
    }

    if (oldRoute.assignedBus !== updated.assignedBus) {
      if (oldRoute.assignedBus && oldRoute.assignedBus !== "Not Assigned") {
        await Bus.findOneAndUpdate(
          { school_id: schoolId, busNumber: oldRoute.assignedBus, assignedRoute: oldRoute.routeName },
          { assignedRoute: "Not Assigned" }
        );
      }
      if (updated.assignedBus && updated.assignedBus !== "Not Assigned") {
        await Route.updateMany(
          { school_id: schoolId, _id: { $ne: id }, assignedBus: updated.assignedBus },
          { assignedBus: "Not Assigned" }
        );
        await Bus.findOneAndUpdate(
          { school_id: schoolId, busNumber: updated.assignedBus },
          { assignedRoute: updated.routeName }
        );
      }
    }

    if (oldRoute.routeName !== updated.routeName && updated.assignedBus && updated.assignedBus !== "Not Assigned") {
      await Bus.findOneAndUpdate(
        { school_id: schoolId, busNumber: updated.assignedBus },
        { assignedRoute: updated.routeName }
      );
    }

    invalidateRoutesCache(schoolId as string);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: "Route name already exists" }, { status: 400 });
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
    const activeAllocations = await TransportAllocation.countDocuments({ school_id: schoolId, route_id: id });
    if (activeAllocations > 0) {
      return NextResponse.json({
        success: false,
        error: "Cannot delete route with active student allocations. Remove or reassign allocations first."
      }, { status: 400 });
    }

    const deleted = await Route.findOneAndDelete({ _id: id, school_id: schoolId });
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Route not found" }, { status: 404 });
    }

    if (deleted.assignedBus && deleted.assignedBus !== "Not Assigned") {
      await Bus.findOneAndUpdate(
        { school_id: schoolId, busNumber: deleted.assignedBus, assignedRoute: deleted.routeName },
        { assignedRoute: "Not Assigned" }
      );
    }

    invalidateRoutesCache(schoolId as string);

    return NextResponse.json({ success: true, data: deleted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
