import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Room } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import { sendCompressedJson } from "@/lib/compression";

// GET: Fetch all rooms for the school
export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const rooms = await Room.find({ school_id: schoolId }).sort({ room_no: 1 }).lean();
    return sendCompressedJson(req, { success: true, data: { rooms } }, { cacheControl: "private, no-cache" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST: Create a new room
export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { room_no, capacity, is_active } = body;

    if (!room_no) {
      return NextResponse.json({ success: false, message: "Room number is required" }, { status: 400 });
    }

    const room = await Room.create({
      school_id: schoolId as string,
      room_no: room_no.trim(),
      capacity: capacity ? parseInt(capacity) : 40,
      is_active: is_active !== undefined ? is_active : true,
    });

    return NextResponse.json({ success: true, data: room }, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json({ success: false, message: "Room with this number already exists" }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
