import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Student from "@/lib/models/Student";
import { Parent } from "@/lib/models";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET /api/students/[id] — Single student detail ───────────────
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { schoolId, role, userId, error } = requireAuth(request, ["school_admin", "teacher", "super_admin", "student", "parent"]);
  if (error) return error;

  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid student ID" },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const student = await Student.findOne({ _id: id, school_id: schoolId })
      .populate("class_id", "name section")
      .populate("user_id", "name email role is_active")
      .populate({
        path: "parent_id",
        select: "name phone email relation photo_url user_id",
        populate: {
          path: "user_id",
          select: "name email role is_active"
        }
      })
      .lean();

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    // Role-based access checks
    if (role === "student") {
      const studentUserId = (student as any).user_id;
      const sUserId = typeof studentUserId === "object" && studentUserId ? (studentUserId._id || studentUserId).toString() : studentUserId?.toString();
      if (sUserId !== userId) {
        return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 });
      }
    } else if (role === "parent") {
      const parentDoc = await Parent.findOne({ user_id: userId, school_id: schoolId }).select("_id").lean();
      const studentParentId = (student as any).parent_id;
      const sParentId = typeof studentParentId === "object" && studentParentId ? (studentParentId._id || studentParentId).toString() : studentParentId?.toString();
      if (!parentDoc || sParentId !== parentDoc._id.toString()) {
        return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 });
      }
    }

    return NextResponse.json({ success: true, data: student });
  } catch (err) {
    console.error("[GET /api/students/[id]]", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch student" },
      { status: 500 }
    );
  }
}

// ─── PUT /api/students/[id] — Update student ──────────────────────
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "super_admin"]);
  if (error) return error;

  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid student ID" },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const body = await request.json();

    // Only allow safe fields to be updated
    const allowedFields = [
      "name", "class_id", "roll_no", "gender", "dob", "blood_group",
      "address", "phone", "guardian_name", "guardian_phone",
      "guardian_relation", "guardian_email", "admission_no",
      "academic_year", "photo_url", "is_active",
      "religion", "caste", "category", "mother_tongue", "languages",
      "prev_school_name", "prev_school_address", "bank_name", "bank_branch",
      "bank_ifsc", "allergies", "medications", "medical_notes", "house",
      "medical_cert", "migration_cert", "transfer_cert", "birth_cert"
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (updateData.dob) {
      updateData.dob = new Date(updateData.dob as string);
    }

    // Auto-link or create/update Parent
    const { guardian_name, guardian_phone, guardian_email, guardian_relation } = body;
    const guardian_photo = body.guardian_photo; // new field

    if (guardian_name?.trim()) {
      const existingParent = await Parent.findOne({
        school_id: schoolId,
        name: guardian_name.trim(),
        $or: [
          { phone: guardian_phone?.trim() || "never-match-this" },
          { email: guardian_email?.trim().toLowerCase() || "never-match-this" }
        ]
      });

      if (existingParent) {
        updateData.parent_id = existingParent._id;
        // Optionally update photo
        if (guardian_photo && !existingParent.photo_url) {
          existingParent.photo_url = guardian_photo;
          await existingParent.save();
        }
      } else {
        const newParent = await Parent.create({
          school_id: schoolId as string,
          name: guardian_name.trim(),
          phone: guardian_phone?.trim(),
          email: guardian_email?.trim().toLowerCase(),
          relation: guardian_relation?.trim(),
          photo_url: guardian_photo,
          is_active: true,
        });
        updateData.parent_id = newParent._id;
      }
    }

    // Roll number class-level uniqueness check on update
    const existingStudent = await Student.findOne({ _id: id, school_id: schoolId });
    if (!existingStudent) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    const targetClassId = updateData.class_id || existingStudent.class_id;
    const targetRollNo = updateData.roll_no !== undefined ? (updateData.roll_no as string) : existingStudent.roll_no;

    if (targetRollNo && (targetRollNo as string).trim()) {
      const duplicateRollNo = await Student.findOne({
        school_id: schoolId,
        class_id: targetClassId,
        roll_no: (targetRollNo as string).trim(),
        _id: { $ne: id }
      });
      if (duplicateRollNo) {
        return NextResponse.json(
          { success: false, message: "Roll number already exists in this class" },
          { status: 409 }
        );
      }
    }

    const student = await Student.findOneAndUpdate(
      { _id: id, school_id: schoolId },
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("class_id", "name section");

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Student updated successfully",
      data: student,
    });
  } catch (err: unknown) {
    console.error("[PUT /api/students/[id]]", err);
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json(
        { success: false, message: "Roll number already exists in this class" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Failed to update student" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/students/[id] — Soft delete (is_active = false) ──
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "super_admin"]);
  if (error) return error;

  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid student ID" },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    // Soft delete — is_active = false (data preserve rehta hai)
    const student = await Student.findOneAndUpdate(
      { _id: id, school_id: schoolId },
      { $set: { is_active: false } },
      { new: true }
    );

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Student deactivated successfully",
    });
  } catch (err) {
    console.error("[DELETE /api/students/[id]]", err);
    return NextResponse.json(
      { success: false, message: "Failed to delete student" },
      { status: 500 }
    );
  }
}
