import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Grade } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import { sendCompressedJson } from "@/lib/compression";

export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin", "teacher"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const grades = await Grade.find({ school_id: schoolId }).sort({ grade_points: -1 });
    return sendCompressedJson(req, { success: true, data: grades }, { cacheControl: "private, no-cache" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { grade_name, marks_from, marks_upto, grade_points, status, description } = body;

    if (!grade_name || marks_from === undefined || marks_upto === undefined || grade_points === undefined) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const grade = await Grade.create({
      school_id: schoolId as string,
      grade_name: grade_name.trim(),
      marks_from: Number(marks_from),
      marks_upto: Number(marks_upto),
      grade_points: Number(grade_points),
      status: status || "Active",
      description: description?.trim(),
    });

    return NextResponse.json({ success: true, data: grade }, { status: 201 });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ success: false, message: "Grade with this name already exists" }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
