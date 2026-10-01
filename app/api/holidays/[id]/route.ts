import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Holiday } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import { invalidateHolidaysCache } from "../route";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  const { id } = await params;

  try {
    await connectToDatabase();
    const body = await req.json();
    
    if (body.date) {
      body.date = new Date(body.date);
    }

    const holiday = await Holiday.findOneAndUpdate(
      { _id: id, school_id: schoolId },
      { $set: body },
      { new: true, runValidators: true }
    );
    if (!holiday) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    invalidateHolidaysCache(schoolId);
    return NextResponse.json({ success: true, data: holiday });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ success: false, message: "Holiday on this date with this title already exists" }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  const { id } = await params;

  try {
    await connectToDatabase();
    const holiday = await Holiday.findOneAndDelete({ _id: id, school_id: schoolId });
    if (!holiday) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    invalidateHolidaysCache(schoolId);
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
