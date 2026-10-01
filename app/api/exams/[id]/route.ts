import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Exam } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";
import { invalidateExamsCache } from "../route";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });

  try {
    await connectToDatabase();
    const body = await req.json();
    const exam = await Exam.findOneAndUpdate(
      { _id: id, school_id: schoolId },
      { $set: body },
      { new: true }
    );
    if (!exam) return NextResponse.json({ success: false, message: "Exam not found" }, { status: 404 });
    invalidateExamsCache(schoolId);
    return NextResponse.json({ success: true, data: exam });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });

  try {
    await connectToDatabase();
    const exam = await Exam.findOneAndDelete({ _id: id, school_id: schoolId });
    if (!exam) return NextResponse.json({ success: false, message: "Exam not found" }, { status: 404 });
    invalidateExamsCache(schoolId);
    return NextResponse.json({ success: true, message: "Exam deleted" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
