import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Syllabus, TeacherAssignment } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

// GET — fetch syllabus for a specific teacher assignment
export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin", "student", "parent"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const teacher_assignment_id = url.searchParams.get("teacher_assignment_id");

    if (!teacher_assignment_id || !mongoose.Types.ObjectId.isValid(teacher_assignment_id)) {
      return NextResponse.json({ success: false, message: "Valid teacher_assignment_id is required" }, { status: 400 });
    }

    const syllabus = await Syllabus.findOne({ teacher_assignment_id, school_id: schoolId }).lean();
    
    return NextResponse.json({
      success: true,
      data: syllabus || { teacher_assignment_id, chapters: [] },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}

// POST — create or update a syllabus for a teacher assignment
export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const { teacher_assignment_id, chapters } = await req.json();

    if (!teacher_assignment_id || !mongoose.Types.ObjectId.isValid(teacher_assignment_id)) {
      return NextResponse.json({ success: false, message: "Valid teacher_assignment_id is required" }, { status: 400 });
    }

    // Verify the teacher assignment exists
    const assignmentExists = await TeacherAssignment.exists({ _id: teacher_assignment_id, school_id: schoolId });
    if (!assignmentExists) {
      return NextResponse.json({ success: false, message: "Teacher assignment not found" }, { status: 404 });
    }

    // Validate chapters array
    if (!Array.isArray(chapters)) {
      return NextResponse.json({ success: false, message: "chapters must be an array" }, { status: 400 });
    }

    for (const ch of chapters) {
      if (!ch.chapter_no || !ch.chapter_name || !ch.start_date || !ch.target_date) {
        return NextResponse.json({ success: false, message: "Each chapter requires chapter_no, chapter_name, start_date, and target_date" }, { status: 400 });
      }
    }

    // Upsert syllabus
    const updatedSyllabus = await Syllabus.findOneAndUpdate(
      { teacher_assignment_id, school_id: schoolId },
      { $set: { chapters } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, data: updatedSyllabus }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
