import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Student from "@/lib/models/Student";
import { Parent } from "@/lib/models";
import User from "@/lib/models/User";
import Class from "@/lib/models/Class";
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

  // Retry once on cold-start connection failures (Vercel serverless)
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await connectDB();

      const student = await Student.findOne({ _id: id, school_id: schoolId })
        .populate("class_id", "name section")
        .populate("user_id", "name email role is_active plain_password")
        .populate({
          path: "parent_id",
          select: "name phone email relation photo_url user_id",
          populate: {
            path: "user_id",
            select: "name email role is_active plain_password"
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
      console.error(`[GET /api/students/[id]] attempt ${attempt}`, err);
      if (attempt < 2) {
        // Wait 1s before retrying (gives MongoDB time to establish connection)
        await new Promise((res) => setTimeout(res, 1000));
        continue;
      }
      return NextResponse.json(
        { success: false, message: "Failed to fetch student" },
        { status: 500 }
      );
    }
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
      "medical_cert", "migration_cert", "transfer_cert", "birth_cert",
      "father_name", "father_phone", "father_email", "father_occupation", "father_photo",
      "mother_name", "mother_phone", "mother_email", "mother_occupation", "mother_photo",
      "guardian_type", "guardian_occupation", "guardian_address", "guardian_photo",
      "permanent_address", "other_info", "aadhaar_no"
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
    const { guardian_name, guardian_phone, guardian_email, guardian_relation, guardian_occupation, guardian_address } = body;
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
        // Optionally update photo & other fields
        let needsSave = false;
        if (guardian_photo && !existingParent.photo_url) {
          existingParent.photo_url = guardian_photo;
          needsSave = true;
        }
        if (guardian_occupation && !existingParent.occupation) {
          existingParent.occupation = guardian_occupation.trim();
          needsSave = true;
        }
        if (guardian_address && !existingParent.address) {
          existingParent.address = guardian_address.trim();
          needsSave = true;
        }
        if (needsSave) {
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
          occupation: guardian_occupation?.trim(),
          address: guardian_address?.trim(),
          is_active: true,
        });
        updateData.parent_id = newParent._id;
      }
    }

    // Fetch existing student
    const existingStudent = await Student.findOne({ _id: id, school_id: schoolId });
    if (!existingStudent) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    // Admission number uniqueness validation
    if (updateData.admission_no !== undefined) {
      const admNo = (updateData.admission_no as string || "").trim();
      if (!admNo) {
        return NextResponse.json(
          { success: false, message: "Admission number is required" },
          { status: 400 }
        );
      }
      const duplicateAdmissionNo = await Student.findOne({
        school_id: schoolId,
        admission_no: admNo,
        _id: { $ne: id }
      });
      if (duplicateAdmissionNo) {
        return NextResponse.json(
          { success: false, message: "Admission number already exists" },
          { status: 409 }
        );
      }
      updateData.admission_no = admNo;
    }

    if (updateData.phone !== undefined) {
      const ph = (updateData.phone as string || "").trim();
      if (ph) {
        const duplicatePhone = await Student.findOne({
          school_id: schoolId,
          phone: ph,
          _id: { $ne: id }
        });
        if (duplicatePhone) {
          return NextResponse.json(
            { success: false, message: "Student mobile number already exists" },
            { status: 409 }
          );
        }
      }
      updateData.phone = ph;
    }
    if (updateData.class_id !== undefined) {
      const classIdStr = updateData.class_id as string;
      if (!classIdStr) {
        return NextResponse.json(
          { success: false, message: "Class selection is mandatory" },
          { status: 400 }
        );
      }

      const selectedClass = await Class.findOne({ _id: classIdStr, school_id: schoolId });
      if (!selectedClass) {
        return NextResponse.json(
          { success: false, message: "Selected class does not exist" },
          { status: 400 }
        );
      }

      const sectionsExistForClass = await Class.exists({
        school_id: schoolId,
        name: { $regex: new RegExp(`^${selectedClass.name}$`, "i") },
        section: { $ne: "" }
      });

      if (sectionsExistForClass && (!selectedClass.section || !selectedClass.section.trim())) {
        return NextResponse.json(
          { success: false, message: "Section selection is mandatory because sections exist for this class" },
          { status: 400 }
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
        { success: false, message: "A student with these unique details already exists" },
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
