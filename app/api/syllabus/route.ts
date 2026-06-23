import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Syllabus } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

// GET: Fetch all syllabus documents, optionally filtered by class_id or subject_id
export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin", "student", "parent"]);
  if (error) return error;

  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("class_id");
    const subjectId = searchParams.get("subject_id");

    const query: any = { school_id: schoolId };
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      query.class_id = classId;
    }
    if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
      query.subject_id = subjectId;
    }

    const syllabi = await Syllabus.find(query)
      .populate("class_id", "name section")
      .populate("subject_id", "name code type")
      .lean();

    return NextResponse.json({ success: true, data: syllabi });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal Server Error" }, { status: 500 });
  }
}

// POST: Create a syllabus for a class + subject
export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();

    const body = await req.json();
    const { class_id, subject_id, chapters } = body;

    if (!class_id || !mongoose.Types.ObjectId.isValid(class_id)) {
      return NextResponse.json({ success: false, message: "Valid Class ID is required" }, { status: 400 });
    }
    if (!subject_id || !mongoose.Types.ObjectId.isValid(subject_id)) {
      return NextResponse.json({ success: false, message: "Valid Subject ID is required" }, { status: 400 });
    }

    // Check if syllabus already exists for this class + subject combination
    const existing = await Syllabus.findOne({ school_id: schoolId, class_id, subject_id });
    if (existing) {
      return NextResponse.json({ success: false, message: "Syllabus already exists for this class and subject. Please update the existing one." }, { status: 409 });
    }

    const syllabus = await Syllabus.create({
      school_id: schoolId as string,
      class_id,
      subject_id,
      chapters: Array.isArray(chapters) ? chapters : [],
    });

    const populated = await Syllabus.findById(syllabus._id)
      .populate("class_id", "name section")
      .populate("subject_id", "name code type");

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal Server Error" }, { status: 500 });
  }
}
