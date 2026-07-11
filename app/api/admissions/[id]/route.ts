import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Admission } from "@/lib/models/index";
import Class from "@/lib/models/Class";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { schoolId, error } = requireAuth(req, ["school_admin"]);
  if (error) return error;
  if (!schoolId) return NextResponse.json({ success: false, message: "No school context" }, { status: 400 });

  try {
    await connectDB();
    void [Class.modelName];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid application ID" }, { status: 400 });
    }

    const admission = await Admission.findOne({ _id: id, school_id: schoolId })
      .populate("class_id", "name section stream")
      .lean();

    if (!admission) {
      return NextResponse.json({ success: false, message: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: admission });
  } catch (err: any) {
    console.error("[GET /api/admissions/[id]]", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { schoolId, error } = requireAuth(req, ["school_admin"]);
  if (error) return error;
  if (!schoolId) return NextResponse.json({ success: false, message: "No school context" }, { status: 400 });

  try {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid application ID" }, { status: 400 });
    }

    const admission = await Admission.findOne({ _id: id, school_id: schoolId });
    if (!admission) {
      return NextResponse.json({ success: false, message: "Application not found" }, { status: 404 });
    }

    const body = await req.json();
    const updateableFields = [
      "academic_year", "class_id", "student_name", "first_name", "last_name", "gender", "dob", "blood_group",
      "prev_school", "prev_class", "father_name", "mother_name", "guardian_name", "guardian_relation",
      "guardian_occupation", "phone", "alt_phone", "email", "address", "city", "state",
      "country", "pin_code", "emergency_contact", "remarks", "photo", "birth_certificate",
      "transfer_certificate", "aadhaar", "report_card", "other_documents"
    ];

    for (const field of updateableFields) {
      if (body[field] !== undefined) {
        (admission as any)[field] = body[field];
      }
    }

    await admission.save();

    return NextResponse.json({ success: true, data: admission });
  } catch (err: any) {
    console.error("[PUT /api/admissions/[id]]", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { schoolId, error } = requireAuth(req, ["school_admin"]);
  if (error) return error;
  if (!schoolId) return NextResponse.json({ success: false, message: "No school context" }, { status: 400 });

  try {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid application ID" }, { status: 400 });
    }

    const admission = await Admission.findOneAndDelete({ _id: id, school_id: schoolId });
    if (!admission) {
      return NextResponse.json({ success: false, message: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Application deleted successfully" });
  } catch (err: any) {
    console.error("[DELETE /api/admissions/[id]]", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
