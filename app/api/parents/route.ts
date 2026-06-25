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
    const search = searchParams.get("search");
    const academic_year = searchParams.get("academic_year");

    const filter: Record<string, any> = { school_id: schoolId };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (academic_year) {
      const classes = await Class.find({ academic_year, school_id: schoolId }).select("_id").lean();
      const classIds = classes.map(c => c._id);
      const students = await Student.find({ class_id: { $in: classIds }, school_id: schoolId }).select("parent_id").lean();
      const parentIdsInYear = students.map(s => s.parent_id).filter(Boolean);
      filter._id = { $in: parentIdsInYear };
    }

    const parents = await Parent.find(filter)
      .populate("user_id", "name email role is_active plain_password must_change_password")
      .sort({ name: 1 })
      .lean();
    
    const parentIds = parents.map((p: any) => p._id);
    const childrenQuery: any = { parent_id: { $in: parentIds } };

    if (academic_year) {
      const classes = await Class.find({ academic_year, school_id: schoolId }).select("_id").lean();
      const classIds = classes.map(c => c._id);
      childrenQuery.class_id = { $in: classIds };
    }

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
      data: parentsWithChildren,
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
