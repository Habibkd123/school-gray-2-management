import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { TeacherAssignment, Class } from "@/lib/models/index";
import Stream from "@/lib/models/Stream"; // register Stream model for populate
import Section from "@/lib/models/Section"; // register Section model for populate
import Teacher from "@/lib/models/Teacher"; // register Teacher model for populate
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

// Ensure models are registered and not tree-shaken by bundlers
const registerModels = () => {
  return [Stream.modelName, Section.modelName, Teacher.modelName];
};

// GET — list teacher assignments
export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "accountant", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    registerModels();
    const url = new URL(req.url);
    const class_id = url.searchParams.get("class_id");
    const stream_id = url.searchParams.get("stream_id");
    const section_id = url.searchParams.get("section_id");
    const teacher_id = url.searchParams.get("teacher_id");
    const academic_year = url.searchParams.get("academic_year");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, parseInt(url.searchParams.get("limit") || "50"));

    const query: any = { school_id: schoolId };
    if (class_id && mongoose.Types.ObjectId.isValid(class_id)) query.class_id = class_id;
    if (stream_id && mongoose.Types.ObjectId.isValid(stream_id)) query.stream_id = stream_id;
    if (section_id && mongoose.Types.ObjectId.isValid(section_id)) query.section_id = section_id;
    if (teacher_id && mongoose.Types.ObjectId.isValid(teacher_id)) query.teacher_id = teacher_id;
    if (academic_year) query.academic_year = academic_year;

    const total = await TeacherAssignment.countDocuments(query);
    const assignments = await TeacherAssignment.find(query)
      .populate("teacher_id", "name employee_id")
      .populate("class_id", "name class_code")
      .populate("stream_id", "name")
      .populate("section_id", "name")
      .populate("subject_master_id", "name subject_code")
      .sort({ "teacher_id.name": 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: { assignments, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}

// POST — create teacher assignment
export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    registerModels();
    const { academic_year, teacher_id, class_id, stream_id, section_id, subject_master_id } = await req.json();

    if (!academic_year?.trim() || !teacher_id || !class_id || !subject_master_id) {
      return NextResponse.json(
        { success: false, message: "academic_year, teacher_id, class_id, and subject_master_id are required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(teacher_id) || !mongoose.Types.ObjectId.isValid(class_id) || !mongoose.Types.ObjectId.isValid(subject_master_id)) {
      return NextResponse.json({ success: false, message: "Invalid IDs" }, { status: 400 });
    }

    const cls = await Class.findOne({ _id: class_id, school_id: schoolId }).lean();
    if (!cls) {
      return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 });
    }

    const isHigherClass = cls.name.startsWith("Class 11") || cls.name.startsWith("Class 12");
    const finalStreamId = isHigherClass ? (stream_id || null) : null;

    const newAssignment = new TeacherAssignment({
      school_id: schoolId,
      academic_year,
      teacher_id,
      class_id,
      stream_id: finalStreamId,
      section_id: section_id || null,
      subject_master_id,
    });

    await newAssignment.save();
    return NextResponse.json({ success: true, data: newAssignment }, { status: 201 });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json(
        { success: false, message: "This subject is already assigned to this specific teacher for this class/stream/section." },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
