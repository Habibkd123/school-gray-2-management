import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Syllabus, SubjectMaster } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

/**
 * GET /api/syllabus-by-class?class_id=...&subject_name=...
 * Finds the Syllabus for a given class+subject, then returns its chapters.
 * Used by the homework form to cascade: Class → Subject → Syllabus → Chapter.
 */
export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin", "student", "parent"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const class_id = url.searchParams.get("class_id");
    const subject_name = url.searchParams.get("subject_name");

    if (!class_id || !mongoose.Types.ObjectId.isValid(class_id)) {
      return NextResponse.json({ success: false, message: "Valid class_id is required" }, { status: 400 });
    }

    if (!subject_name?.trim()) {
      return NextResponse.json({ success: false, message: "subject_name is required" }, { status: 400 });
    }

    // Find the SubjectMaster whose name matches (case-insensitive)
    const subjectMaster = await SubjectMaster.findOne({
      school_id: schoolId,
      name: { $regex: new RegExp(`^${subject_name.trim()}$`, "i") },
    }).lean();

    if (!subjectMaster) {
      return NextResponse.json({ success: true, data: { chapters: [] } });
    }

    // Fetch the syllabus for this class + subject combination directly
    const syllabus = await Syllabus.findOne({
      school_id: schoolId,
      class_id,
      subject_master_id: subjectMaster._id
    }).lean();

    if (!syllabus) {
      return NextResponse.json({ success: true, data: { chapters: [] } });
    }

    // Format nodes to legacy flat chapters array for cascading compatibility
    const chapters = (syllabus.nodes || []).map((n: any, idx: number) => ({
      _id: n.id || String(idx),
      chapter_no: idx + 1,
      chapter_name: n.title,
      description: n.description || "",
      status: "Not Started"
    }));

    return NextResponse.json({
      success: true,
      data: {
        _id: String(syllabus._id),
        chapters
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
