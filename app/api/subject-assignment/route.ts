import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { SubjectAssignment, SubjectMaster } from "@/lib/models/index";
import Stream from "@/lib/models/Stream";
import Class from "@/lib/models/Class";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

// GET — list subject assignments
export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "accountant", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const class_id = url.searchParams.get("class_id");
    const stream_id = url.searchParams.get("stream_id");
    const academic_year = url.searchParams.get("academic_year");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, parseInt(url.searchParams.get("limit") || "50"));

    const query: any = { school_id: schoolId };
    if (class_id && mongoose.Types.ObjectId.isValid(class_id)) query.class_id = class_id;
    if (stream_id && mongoose.Types.ObjectId.isValid(stream_id)) query.stream_id = stream_id;
    if (academic_year) query.academic_year = academic_year;

    const total = await SubjectAssignment.countDocuments(query);
    const assignments = await SubjectAssignment.find(query)
      .populate("class_id", "name class_code section")
      .populate("stream_id", "name")
      .populate("subject_master_id", "name subject_code")
      .sort({ "class_id.name": 1 })
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

// POST — create subject assignment
export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const { academic_year, class_id, stream_id, subject_master_id } = await req.json();

    if (!academic_year?.trim() || !class_id || !subject_master_id) {
      return NextResponse.json(
        { success: false, message: "academic_year, class_id, and subject_master_id are required" },
        { status: 400 }
      );
    }

    // Validate references
    const cls = await Class.findOne({ _id: class_id, school_id: schoolId }).lean();
    if (!cls) return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 });

    const subject = await SubjectMaster.findOne({ _id: subject_master_id, school_id: schoolId }).lean();
    if (!subject) return NextResponse.json({ success: false, message: "Subject not found" }, { status: 404 });

    const isHigherClass = cls.name.startsWith("Class 11") || cls.name.startsWith("Class 12");
    let finalStreamId = undefined;

    if (isHigherClass && stream_id) {
      const stream = await Stream.findOne({ _id: stream_id, school_id: schoolId }).lean();
      if (!stream) return NextResponse.json({ success: false, message: "Stream not found" }, { status: 404 });
      finalStreamId = stream_id;
    }

    const assignment = await SubjectAssignment.create({
      school_id: String(schoolId),
      academic_year: academic_year.trim(),
      class_id,
      ...(finalStreamId ? { stream_id: finalStreamId } : {}),
      subject_master_id,
    });

    const populated = await SubjectAssignment.findById((assignment as any)._id)
      .populate("class_id", "name class_code section")
      .populate("stream_id", "name")
      .populate("subject_master_id", "name subject_code")
      .lean();

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json(
        { success: false, message: "This subject is already assigned to this class/stream for the selected year" },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
