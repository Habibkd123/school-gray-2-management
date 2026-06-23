import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Parent } from "@/lib/models";
import Student from "@/lib/models/Student";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";
import User from "@/lib/models/User";

// ─── GET /api/parents/[id] — Get a single parent ──────────────────────
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "super_admin", "teacher"]);
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Invalid parent ID" }, { status: 400 });
    }

    const parent = await Parent.findOne({ _id: id, school_id: schoolId })
      .populate("user_id", "name email role is_active plain_password")
      .lean();

    if (!parent) {
      return NextResponse.json({ success: false, message: "Parent not found" }, { status: 404 });
    }

    const children = await Student.find({ parent_id: parent._id, school_id: schoolId })
      .populate("class_id", "name section")
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        ...parent,
        children
      }
    });
  } catch (err) {
    console.error("[GET /api/parents/[id]]", err);
    return NextResponse.json({ success: false, message: "Failed to fetch parent" }, { status: 500 });
  }
}

// ─── PUT /api/parents/[id] — Update a parent ──────────────────────────
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const parent = await Parent.findOneAndUpdate(
      { _id: id, school_id: schoolId },
      { $set: body },
      { new: true }
    );

    if (!parent) {
      return NextResponse.json({ success: false, message: "Parent not found" }, { status: 404 });
    }

    const children = await Student.find({ parent_id: parent._id })
      .populate("class_id", "name section")
      .lean();

    return NextResponse.json({ success: true, message: "Parent updated", data: { ...parent.toJSON(), children } });
  } catch (err) {
    console.error("[PUT /api/parents/[id]]", err);
    return NextResponse.json({ success: false, message: "Failed to update parent" }, { status: 500 });
  }
}

// ─── DELETE /api/parents/[id] — Delete a parent ───────────────────────
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectDB();
    const { id } = await params;

    const parent = await Parent.findOneAndDelete({ _id: id, school_id: schoolId });
    if (!parent) {
      return NextResponse.json({ success: false, message: "Parent not found" }, { status: 404 });
    }

    // Remove parent_id from associated students
    await Student.updateMany(
      { parent_id: id, school_id: schoolId },
      { $set: { parent_id: null } }
    );

    return NextResponse.json({ success: true, message: "Parent deleted successfully" });
  } catch (err) {
    console.error("[DELETE /api/parents/[id]]", err);
    return NextResponse.json({ success: false, message: "Failed to delete parent" }, { status: 500 });
  }
}
