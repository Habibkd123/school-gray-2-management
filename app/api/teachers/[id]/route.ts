import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Teacher from "@/lib/models/Teacher";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

type RouteParams = { params: Promise<{ id: string }> };

// GET: Fetch a single teacher by ID
export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  const { schoolId, role, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) {
    console.log("[GET /api/teachers/[id]] auth error:", error);
    return error;
  }

  const { id } = await params;
  console.log("[GET /api/teachers/[id]] id:", id, "schoolId:", schoolId, "role:", role);

  try {

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log("[GET /api/teachers/[id]] invalid ID:", id);
      return NextResponse.json({ success: false, message: "Invalid teacher ID" }, { status: 400 });
    }

    await connectToDatabase();
    
    const query: any = { _id: id };
    if (role !== "super_admin") {
      query.school_id = schoolId;
    }

    const teacher = await Teacher.findOne(query)
      .populate("user_id", "name email role is_active plain_password")
      .populate("class_id", "name section")
      .populate("class_ids", "name section");

    console.log("[GET /api/teachers/[id]] query result:", teacher);

    if (!teacher) {
      console.log("[GET /api/teachers/[id]] teacher not found in DB for id:", id, "schoolId:", schoolId);
      return NextResponse.json({ success: false, message: "Teacher not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: teacher });
  } catch (error: any) {
    console.error("[GET /api/teachers/[id]] handler caught error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update a teacher
export async function PUT(
  req: NextRequest,
  { params }: RouteParams
) {
  const { schoolId, role, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  const { id } = await params;

  try {

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid teacher ID" }, { status: 400 });
    }

    await connectToDatabase();

    const body = await req.json();

    if (body.phone?.trim()) {
      const normalizedPhone = body.phone.trim();
      const existingPhone = await Teacher.findOne({ phone: normalizedPhone, school_id: schoolId, _id: { $ne: id } });
      if (existingPhone) {
        return NextResponse.json({ success: false, message: "A teacher with this mobile number already exists in this school" }, { status: 409 });
      }
    }

    // Check if updating password
    if (body.password) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
      if (body.password.length < 8 || !passwordRegex.test(body.password)) {
        return NextResponse.json({
          success: false,
          message: "Validation failed",
          errors: [
            {
              field: "new_password",
              message: "new_password must contain uppercase, lowercase, and a number"
            }
          ]
        }, { status: 400 });
      }

      const query: any = { _id: id };
      if (role !== "super_admin") {
        query.school_id = schoolId;
      }
      const teacher = await Teacher.findOne(query);
      if (!teacher) {
        return NextResponse.json({ success: false, message: "Teacher not found" }, { status: 404 });
      }

      if (teacher.user_id) {
        const user = await User.findById(teacher.user_id);
        if (user) {
          user.password_hash = body.password;
          user.plain_password = body.password;
          await user.save();
        }
      }
    }

    // Sync class_ids and class_id in update payload
    if (body.class_ids) {
      body.class_id = Array.isArray(body.class_ids) && body.class_ids.length > 0 ? body.class_ids[0] : null;
    } else if (body.class_id) {
      body.class_ids = [body.class_id];
    }

    const query: any = { _id: id };
    if (role !== "super_admin") {
      query.school_id = schoolId;
    }

    const teacher = await Teacher.findOneAndUpdate(
      query,
      { $set: body },
      { new: true, runValidators: true }
    ).populate("class_id", "name section")
     .populate("class_ids", "name section");

    if (!teacher) {
      return NextResponse.json({ success: false, message: "Teacher not found" }, { status: 404 });
    }

    // If class_id is updated, optionally set this teacher as the class teacher of that class
    const classIdToSet = body.class_id || (Array.isArray(body.class_ids) && body.class_ids.length > 0 ? body.class_ids[0] : null);
    if (classIdToSet) {
      await mongoose.model("Class").findOneAndUpdate(
        { _id: classIdToSet, school_id: teacher.school_id },
        { class_teacher_id: teacher._id }
      );
    }

    return NextResponse.json({ success: true, data: teacher });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Employee ID already in use" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a teacher (or soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: RouteParams
) {
  const { schoolId, role, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  const { id } = await params;

  try {

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid teacher ID" }, { status: 400 });
    }

    await connectToDatabase();

    const query: any = { _id: id };
    if (role !== "super_admin") {
      query.school_id = schoolId;
    }

    const teacher = await Teacher.findOneAndDelete(query);

    if (!teacher) {
      return NextResponse.json({ success: false, message: "Teacher not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Teacher deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
