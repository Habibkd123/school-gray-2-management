import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Parent, Class } from "@/lib/models";
import Student from "@/lib/models/Student";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

// ─── GET /api/parents — List all parents ──────────────────────────────
export async function GET(request: NextRequest) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limitParam = searchParams.get("limit");
    const isAll = limitParam === "all";
    const limit = isAll ? 100000 : parseInt(limitParam || "10");
    const academic_year = searchParams.get("academic_year");
    const class_id = searchParams.get("class_id");
    const section = searchParams.get("section");
    const student_id = searchParams.get("student_id");
    const guardian_type = searchParams.get("guardian_type");
    const status = searchParams.get("status");

    const filter: Record<string, any> = { school_id: schoolId };

    // Search mapping (Part 4)
    if (search) {
      const studentFilter: any = {
        school_id: schoolId,
        $or: [
          { name: { $regex: search, $options: "i" } },
          { father_name: { $regex: search, $options: "i" } },
          { mother_name: { $regex: search, $options: "i" } },
          { guardian_name: { $regex: search, $options: "i" } },
          { admission_no: { $regex: search, $options: "i" } },
        ]
      };
      const matchingStudents = await Student.find(studentFilter).select("parent_id").lean();
      const parentIdsFromStudents = matchingStudents.map(s => s.parent_id).filter(Boolean);

      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { _id: { $in: parentIdsFromStudents } }
      ];
    }

    // Student relational filtering (Part 3)
    const studentFilter: any = { school_id: schoolId };
    let hasStudentFilter = false;

    if (academic_year && academic_year !== "all") {
      studentFilter.academic_year = academic_year;
      hasStudentFilter = true;
    }
    if (class_id && class_id !== "all") {
      studentFilter.class_id = new mongoose.Types.ObjectId(class_id);
      hasStudentFilter = true;
    }
    if (section && section !== "all") {
      const sectionClasses = await mongoose.model("Class").find({
        school_id: schoolId,
        section: { $regex: new RegExp(`^${section}$`, "i") }
      }).select("_id").lean();
      studentFilter.class_id = { $in: sectionClasses.map(c => c._id) };
      hasStudentFilter = true;
    }
    if (student_id && student_id !== "all") {
      studentFilter._id = new mongoose.Types.ObjectId(student_id);
      hasStudentFilter = true;
    }

    if (hasStudentFilter) {
      const matchingStudents = await Student.find(studentFilter).select("parent_id").lean();
      const parentIds = matchingStudents.map(s => s.parent_id).filter(Boolean);
      if (filter._id) {
        filter._id = { $and: [filter._id, { $in: parentIds }] };
      } else {
        filter._id = { $in: parentIds };
      }
    }

    if (guardian_type && guardian_type !== "all") {
      filter.relation = { $regex: `^${guardian_type}$`, $options: "i" };
    }

    if (status && status !== "all") {
      filter.is_active = status.toLowerCase() === "active";
    }

    const total = await Parent.countDocuments(filter);
    const skip = isAll ? 0 : (page - 1) * limit;

    const parents = await Parent.find(filter)
      .populate("user_id", "name email role is_active plain_password")
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const parentIds = parents.map((p: any) => p._id);
    const childrenQuery: any = { parent_id: { $in: parentIds }, school_id: schoolId };

    const allChildren = await Student.find(childrenQuery)
      .populate("class_id", "name section")
      .lean();

    const childrenByParent: Record<string, any[]> = {};
    for (const child of allChildren) {
      const pid = String((child as any).parent_id);
      if (!childrenByParent[pid]) childrenByParent[pid] = [];
      childrenByParent[pid].push(child);
    }

    const parentsWithChildren = parents.map((parent: any) => ({
      ...parent,
      children: childrenByParent[String(parent._id)] ?? [],
    }));

    return NextResponse.json({
      success: true,
      data: {
        parents: parentsWithChildren,
        pagination: {
          totalItems: total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          limit,
        }
      },
    });
  } catch (err) {
    console.error("[GET /api/parents]", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch parents" },
      { status: 500 }
    );
  }
}

// ─── POST /api/parents — Create new parent ────────────────────────────
export async function POST(request: NextRequest) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectDB();
    const body = await request.json();

    const { name, phone, email, relation, photo_url, occupation, address, children_ids } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, message: "Parent name is required" },
        { status: 400 }
      );
    }

    // If email is provided, create a User account first
    let userId = null;
    if (email?.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      // Check if user already exists
      const existingUser = await User.findOne({ email: normalizedEmail, school_id: schoolId });
      if (existingUser) {
        userId = existingUser._id;
      } else {
        const newUser = await User.create({
          school_id: schoolId as string,
          name: name.trim(),
          email: normalizedEmail,
          role: "parent",
          password_hash: "Parent@123", 
          plain_password: "Parent@123",
        });
        userId = newUser._id;
      }
    }

    // Create the parent
    const parent = await Parent.create({
      school_id: schoolId as string,
      user_id: userId,
      name: name.trim(),
      phone: phone?.trim(),
      email: email?.trim().toLowerCase(),
      relation: relation?.trim(),
      photo_url,
      occupation: occupation?.trim(),
      address: address?.trim(),
      is_active: true,
    });

    // Link children
    if (Array.isArray(children_ids) && children_ids.length > 0) {
      await Student.updateMany(
        { _id: { $in: children_ids }, school_id: schoolId },
        { $set: { parent_id: parent._id } }
      );
    }

    const children = await Student.find({ parent_id: parent._id })
      .populate("class_id", "name section")
      .lean();

    return NextResponse.json(
      { success: true, message: "Parent created successfully", data: { ...parent.toJSON(), children } },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("[POST /api/parents]", err);
    return NextResponse.json(
      { success: false, message: "Failed to create parent" },
      { status: 500 }
    );
  }
}
