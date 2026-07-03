import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Class, { computeSortWeight } from "@/lib/models/Class";
import { requireAuth } from "@/lib/utils/auth";

type RouteParams = { params: Promise<{ id: string }> };

// GET: Single class
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  const { id } = await params;

  try {
    await connectToDatabase();

    const cls = await Class.findOne({ _id: id, school_id: schoolId as string }).populate(
      "class_teacher_id",
      "name employee_id"
    );

    if (!cls) {
      return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: cls });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT: Update a class
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  const { id } = await params;

  try {
    await connectToDatabase();

    const body = await req.json();
    const { name, section, academic_year, class_teacher_id, capacity, class_code, status } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      updateData.name        = name.trim();
      updateData.sort_weight = computeSortWeight(name.trim());  // keep ordering in sync
    }
    if (section !== undefined)          updateData.section          = section.trim();
    if (academic_year !== undefined)    updateData.academic_year    = academic_year.trim();
    if (class_teacher_id !== undefined) updateData.class_teacher_id = class_teacher_id || null;
    if (capacity !== undefined)         updateData.capacity         = parseInt(capacity);
    if (class_code !== undefined)       updateData.class_code       = class_code?.trim().toUpperCase() || null;
    if (status !== undefined)           updateData.status           = status;

    const updated = await Class.findOneAndUpdate(
      { _id: id, school_id: schoolId as string },
      { $set: updateData },
      { new: true }
    ).populate("class_teacher_id", "name employee_id");

    if (!updated) {
      return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json(
        { success: false, message: "A class with this name, section, and academic year already exists" },
        { status: 409 }
      );
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE: Remove a class
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  const { id } = await params;

  try {
    await connectToDatabase();

    const deleted = await Class.findOneAndDelete({
      _id: id,
      school_id: schoolId as string,
    });

    if (!deleted) {
      return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Class deleted successfully" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
