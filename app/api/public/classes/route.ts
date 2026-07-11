import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Class from "@/lib/models/Class";
import { resolveSchoolIdServer } from "@/lib/themes/resolveSchool";

export async function GET(req: NextRequest) {
  try {
    const schoolId = await resolveSchoolIdServer(req.headers, req.url);
    if (!schoolId) {
      return NextResponse.json({ success: false, message: "School not configured" }, { status: 400 });
    }

    await connectDB();
    const classes = await Class.find({ school_id: schoolId, status: "Active" })
      .select("_id name section stream")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ success: true, data: classes });
  } catch (err: any) {
    console.error("[GET /api/public/classes]", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
