import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { TransportAllocation, Route, Bus } from "@/lib/models";
import Student from "@/lib/models/Student";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";
import { invalidateAllocationsCache } from "../route";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "super_admin", "teacher"]);
  if (error) return error;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    await connectDB();
    const allocation = await TransportAllocation.findOne({ _id: id, school_id: schoolId })
      .populate("student_id", "name admission_no class_id")
      .populate("route_id", "routeName")
      .populate("bus_id", "busNumber")
      .lean();

    if (!allocation) {
      return NextResponse.json({ success: false, error: "Allocation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: allocation });
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

    const existing = await TransportAllocation.findOne({ _id: id, school_id: schoolId });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Allocation not found" }, { status: 404 });
    }

    // Reference validation if route_id is provided
    if (body.route_id !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(body.route_id)) {
        return NextResponse.json({ success: false, error: "Invalid route_id" }, { status: 400 });
      }
      const routeExists = await Route.findOne({ _id: body.route_id, school_id: schoolId }).lean();
      if (!routeExists) {
        return NextResponse.json({ success: false, error: "Route not found in this school" }, { status: 404 });
      }
    }

    // Reference and capacity validation if bus_id is provided
    const targetBusId = body.bus_id !== undefined ? body.bus_id : existing.bus_id;
    const targetStatus = body.status !== undefined ? body.status : existing.status;

    if (body.bus_id !== undefined && body.bus_id !== null) {
      if (!mongoose.Types.ObjectId.isValid(body.bus_id)) {
        return NextResponse.json({ success: false, error: "Invalid bus_id" }, { status: 400 });
      }
      const busDoc = await Bus.findOne({ _id: body.bus_id, school_id: schoolId }).lean();
      if (!busDoc) {
        return NextResponse.json({ success: false, error: "Bus not found in this school" }, { status: 404 });
      }

      if (targetStatus === "Active") {
        const activeCount = await TransportAllocation.countDocuments({
          school_id: schoolId,
          bus_id: body.bus_id,
          status: "Active",
          _id: { $ne: id },
        });

        if (activeCount >= busDoc.capacity) {
          return NextResponse.json({
            success: false,
            error: `Bus capacity exceeded. Maximum capacity is ${busDoc.capacity}`,
          }, { status: 400 });
        }
      }
    } else if (body.status === "Active" && targetBusId) {
      // Re-activating allocation on existing bus
      const busDoc = await Bus.findOne({ _id: targetBusId, school_id: schoolId }).lean();
      if (busDoc) {
        const activeCount = await TransportAllocation.countDocuments({
          school_id: schoolId,
          bus_id: targetBusId,
          status: "Active",
          _id: { $ne: id },
        });

        if (activeCount >= busDoc.capacity) {
          return NextResponse.json({
            success: false,
            error: `Bus capacity exceeded. Maximum capacity is ${busDoc.capacity}`,
          }, { status: 400 });
        }
      }
    }

    const payload = { ...body };
    if (payload.bus_id === "") {
      payload.bus_id = null;
    }

    const updated = await TransportAllocation.findOneAndUpdate(
      { _id: id, school_id: schoolId },
      { $set: payload },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, error: "Allocation not found" }, { status: 404 });
    }

    invalidateAllocationsCache(schoolId as string);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: "Allocation conflict" }, { status: 409 });
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

    const deleted = await TransportAllocation.findOneAndDelete({ _id: id, school_id: schoolId });
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Allocation not found" }, { status: 404 });
    }

    invalidateAllocationsCache(schoolId as string);

    return NextResponse.json({ success: true, data: deleted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
