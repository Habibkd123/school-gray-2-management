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
    const teacher_id = url.searchParams.get("teacher_id");

    if (teacher_id && mongoose.Types.ObjectId.isValid(teacher_id)) {
      const assignments = await TeacherAssignment.find({ teacher_id, school_id: schoolId }).distinct("_id");
      const syllabi = await Syllabus.find({ teacher_assignment_id: { $in: assignments }, school_id: schoolId }).lean();
      return NextResponse.json({
        success: true,
        data: syllabi,
      });
    }

    if (!teacher_assignment_id) {
      const syllabi = await Syllabus.find({ school_id: schoolId }).lean();
      return NextResponse.json({
        success: true,
        data: syllabi,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(teacher_assignment_id)) {
      return NextResponse.json({ success: false, message: "Invalid teacher_assignment_id format" }, { status: 400 });
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

  let requestBody: any = null;

  try {
    await connectToDatabase();
    requestBody = await req.json();
    const { teacher_assignment_id, chapters } = requestBody;

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
      if (!ch.chapter_no || !ch.chapter_name) {
        return NextResponse.json({ success: false, message: "Each chapter requires chapter_no and chapter_name" }, { status: 400 });
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
    console.error("Syllabus save error:", err);
    
    // Check if duplicate key error on obsolete index (school_id_1_class_id_1_subject_id_1)
    if (err.code === 11000 && err.message?.includes("school_id_1_class_id_1_subject_id_1") && requestBody) {
      try {
        console.log("Obsolete syllabus unique index detected. Attempting to drop index...");
        await Syllabus.collection.dropIndex("school_id_1_class_id_1_subject_id_1");
        console.log("Successfully dropped obsolete syllabus index. Retrying save...");
        
        const { teacher_assignment_id, chapters } = requestBody;
        
        // Retry upsert
        const retrySyllabus = await Syllabus.findOneAndUpdate(
          { teacher_assignment_id, school_id: schoolId },
          { $set: { chapters } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        return NextResponse.json({ success: true, data: retrySyllabus }, { status: 200 });
      } catch (retryErr: any) {
        console.error("Failed to resolve obsolete index or retry save:", retryErr);
        return NextResponse.json({
          success: false,
          message: "Database index conflict: An obsolete index (school_id_1_class_id_1_subject_id_1) could not be resolved automatically. Please try again or contact support."
        }, { status: 500 });
      }
    }

    // Clean user message for other duplicate key issues
    if (err.code === 11000) {
      return NextResponse.json({
        success: false,
        message: "A database duplicate entry error occurred. Please make sure this syllabus doesn't already exist."
      }, { status: 400 });
    }

    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
