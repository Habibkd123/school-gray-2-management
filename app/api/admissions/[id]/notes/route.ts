import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Admission } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { schoolId, userId, error } = requireAuth(req, ["school_admin"]);
  if (error) return error;
  if (!schoolId) return NextResponse.json({ success: false, message: "No school context" }, { status: 400 });

  try {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid application ID" }, { status: 400 });
    }

    const admission = await Admission.findOne({ _id: id, school_id: schoolId });
    if (!admission) {
      return NextResponse.json({ success: false, message: "Application not found" }, { status: 404 });
    }

    const body = await req.json();
    const { note } = body;

    if (!note?.trim()) {
      return NextResponse.json({ success: false, message: "Note content is required" }, { status: 400 });
    }

    admission.internal_notes.push({
      note: note.trim(),
      author: `Admin (User ID: ${userId})`,
      date: new Date(),
    });

    await admission.save();

    return NextResponse.json({ success: true, data: admission });
  } catch (err: any) {
    console.error("[POST /api/admissions/[id]/notes]", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
