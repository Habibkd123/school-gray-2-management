import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Bus, Route } from "@/lib/models";
import mongoose from "mongoose";
import { invalidateBusesCache } from "../route";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const oldBus = await Bus.findById(id);
    const updated = await Bus.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!updated) {
      return NextResponse.json({ success: false, error: "Bus not found" }, { status: 404 });
    }

    if (oldBus && oldBus.assignedRoute !== updated.assignedRoute) {
      if (oldBus.assignedRoute && oldBus.assignedRoute !== "Not Assigned") {
        await Route.findOneAndUpdate(
          { school_id: oldBus.school_id, routeName: oldBus.assignedRoute, assignedBus: oldBus.busNumber },
          { assignedBus: "Not Assigned" }
        );
      }
      if (updated.assignedRoute && updated.assignedRoute !== "Not Assigned") {
        await Bus.updateMany(
          { school_id: oldBus.school_id, _id: { $ne: id }, assignedRoute: updated.assignedRoute },
          { assignedRoute: "Not Assigned" }
        );
        await Route.findOneAndUpdate(
          { school_id: oldBus.school_id, routeName: updated.assignedRoute },
          { assignedBus: updated.busNumber }
        );
      }
    }

    if (oldBus && oldBus.busNumber !== updated.busNumber && updated.assignedRoute && updated.assignedRoute !== "Not Assigned") {
      await Route.findOneAndUpdate(
        { school_id: oldBus.school_id, routeName: updated.assignedRoute },
        { assignedBus: updated.busNumber }
      );
    }

    invalidateBusesCache();

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: "Bus number already exists" }, { status: 400 });
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

    const deleted = await Bus.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Bus not found" }, { status: 404 });
    }

    if (deleted.assignedRoute && deleted.assignedRoute !== "Not Assigned") {
      await Route.findOneAndUpdate(
        { school_id: deleted.school_id, routeName: deleted.assignedRoute, assignedBus: deleted.busNumber },
        { assignedBus: "Not Assigned" }
      );
    }

    invalidateBusesCache();

    return NextResponse.json({ success: true, data: deleted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
