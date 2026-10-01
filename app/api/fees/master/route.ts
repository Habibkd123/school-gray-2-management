import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { FeeMaster } from "@/lib/models";
import { requireAuth } from "@/lib/utils/auth";
import { sendCompressedJson } from "@/lib/compression";

export async function GET(req: NextRequest) {
  try {
    const { schoolId, error } = requireAuth(req);
    if (error) return error;

    const url = new URL(req.url);
    const fee_group_id = url.searchParams.get("fee_group_id");

    const query: any = { school_id: schoolId };
    if (fee_group_id) query.fee_group_id = fee_group_id;

    await connectDB();
    const masters = await FeeMaster.find(query)
      .populate("fee_group_id", "name description")
      .populate("fee_type_id", "name description")
      .sort({ createdAt: -1 })
      .lean();

    return sendCompressedJson(req, { success: true, data: { masters } }, { cacheControl: "private, no-cache" });
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
    const master = await FeeMaster.create({ ...body, school_id: schoolId as string });
    const populatedMaster = await FeeMaster.findById(master._id)
      .populate("fee_group_id", "name description")
      .populate("fee_type_id", "name description");
      
    return NextResponse.json({ success: true, data: { master: populatedMaster } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

