import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Room } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

// GET: Fetch single room
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    await connectToDatabase();
    const room = await Room.findOne({ _id: id, school_id: schoolId }).lean();
    if (!room) {
      return NextResponse.json({ success: false, message: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: room });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT: Update a room
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    await connectToDatabase();
    const body = await req.json();

    if (body.capacity !== undefined) {
      const capNum = Number(body.capacity);
      if (isNaN(capNum) || capNum <= 0) {
        return NextResponse.json({ success: false, message: "Capacity must be a positive number" }, { status: 400 });
      }
    }

    if (body.room_no !== undefined) {
      if (typeof body.room_no !== "string" || !body.room_no.trim()) {
        return NextResponse.json({ success: false, message: "Room number cannot be empty" }, { status: 400 });
      }
      body.room_no = body.room_no.trim();
      const duplicate = await Room.findOne({
        school_id: schoolId,
        room_no: body.room_no,
        _id: { $ne: id },
      });
      if (duplicate) {
        return NextResponse.json({ success: false, message: "Room with this number already exists" }, { status: 409 });
      }
    }

    const room = await Room.findOneAndUpdate(
      { _id: id, school_id: schoolId },
      { $set: body },
      { new: true, runValidators: true }
    );
    if (!room) return NextResponse.json({ success: false, message: "Room not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: room });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json({ success: false, message: "Room with this number already exists" }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE: Delete a room
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    await connectToDatabase();
    const room = await Room.findOneAndDelete({ _id: id, school_id: schoolId });
    if (!room) return NextResponse.json({ success: false, message: "Room not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Room deleted" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
