import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Syllabus } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

type RouteParams = { params: Promise<{ id: string }> };

// GET: Fetch a single syllabus by ID
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin", "student", "parent"]);
  if (error) return error;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid Syllabus ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const syllabus = await Syllabus.findOne({ _id: id, school_id: schoolId })
      .populate("class_id", "name section")
      .populate("subject_id", "name code type");

    if (!syllabus) {
      return NextResponse.json({ success: false, message: "Syllabus not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: syllabus });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal Server Error" }, { status: 500 });
  }
}

// PUT: Update a syllabus by ID
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid Syllabus ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const body = await req.json();

    // Prevent overriding school_id
    delete body.school_id;

    const updated = await Syllabus.findOneAndUpdate(
      { _id: id, school_id: schoolId },
      { $set: body },
      { new: true, runValidators: true }
    )
      .populate("class_id", "name section")
      .populate("subject_id", "name code type");

    if (!updated) {
      return NextResponse.json({ success: false, message: "Syllabus not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: Delete a syllabus by ID
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid Syllabus ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const deleted = await Syllabus.findOneAndDelete({ _id: id, school_id: schoolId });
    if (!deleted) {
      return NextResponse.json({ success: false, message: "Syllabus not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Syllabus deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal Server Error" }, { status: 500 });
  }
}
