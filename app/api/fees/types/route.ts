import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { FeeType } from "@/lib/models";
import { requireAuth } from "@/lib/utils/auth";
import { sendCompressedJson } from "@/lib/compression";

export async function GET(req: NextRequest) {
  try {
    const { schoolId, error } = requireAuth(req);
    if (error) return error;

    await connectDB();
    const types = await FeeType.find({ school_id: schoolId }).sort({ name: 1 }).lean();
    return sendCompressedJson(req, { success: true, data: { types } }, { cacheControl: "private, no-cache" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
    if (error) return error;

    const body = await req.json();
    await connectDB();
    const type = await FeeType.create({ ...body, school_id: schoolId as string });
    return NextResponse.json({ success: true, data: { type } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

