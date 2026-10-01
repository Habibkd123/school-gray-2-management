import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Route, Bus } from "@/lib/models";
import mongoose from "mongoose";
import { invalidateRoutesCache } from "../route";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const oldRoute = await Route.findById(id);
    const updated = await Route.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!updated) {
      return NextResponse.json({ success: false, error: "Route not found" }, { status: 404 });
    }

    if (oldRoute && oldRoute.assignedBus !== updated.assignedBus) {
      if (oldRoute.assignedBus && oldRoute.assignedBus !== "Not Assigned") {
        await Bus.findOneAndUpdate(
          { school_id: oldRoute.school_id, busNumber: oldRoute.assignedBus, assignedRoute: oldRoute.routeName },
          { assignedRoute: "Not Assigned" }
        );
      }
      if (updated.assignedBus && updated.assignedBus !== "Not Assigned") {
        await Route.updateMany(
          { school_id: oldRoute.school_id, _id: { $ne: id }, assignedBus: updated.assignedBus },
          { assignedBus: "Not Assigned" }
        );
        await Bus.findOneAndUpdate(
          { school_id: oldRoute.school_id, busNumber: updated.assignedBus },
          { assignedRoute: updated.routeName }
        );
      }
    }

    if (oldRoute && oldRoute.routeName !== updated.routeName && updated.assignedBus && updated.assignedBus !== "Not Assigned") {
      await Bus.findOneAndUpdate(
        { school_id: oldRoute.school_id, busNumber: updated.assignedBus },
        { assignedRoute: updated.routeName }
      );
    }

    invalidateRoutesCache();

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: "Route name already exists" }, { status: 400 });
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

    const deleted = await Route.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Route not found" }, { status: 404 });
    }

    if (deleted.assignedBus && deleted.assignedBus !== "Not Assigned") {
      await Bus.findOneAndUpdate(
        { school_id: deleted.school_id, busNumber: deleted.assignedBus, assignedRoute: deleted.routeName },
        { assignedRoute: "Not Assigned" }
      );
    }

    invalidateRoutesCache();

    return NextResponse.json({ success: true, data: deleted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
