import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Admission } from "@/lib/models/index";
import Class from "@/lib/models/Class";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin"]);
  if (error) return error;
  if (!schoolId) return NextResponse.json({ success: false, message: "No school context" }, { status: 400 });

  try {
    await connectDB();
    void [Class.modelName];

    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "all";
    const classId = url.searchParams.get("class_id") || "all";
    const academicYear = url.searchParams.get("academic_year") || "all";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "10")));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { school_id: schoolId };

    if (status && status !== "all") {
      query.status = status;
    }
    if (classId && classId !== "all" && mongoose.Types.ObjectId.isValid(classId)) {
      query.class_id = classId;
    }
    if (academicYear && academicYear !== "all") {
      query.academic_year = academicYear;
    }

    if (search.trim()) {
      query.$or = [
        { application_no: { $regex: search, $options: "i" } },
        { student_name: { $regex: search, $options: "i" } },
        { first_name: { $regex: search, $options: "i" } },
        { last_name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { guardian_name: { $regex: search, $options: "i" } },
        { father_name: { $regex: search, $options: "i" } },
        { mother_name: { $regex: search, $options: "i" } },
      ];
    }

    const [admissions, total] = await Promise.all([
      Admission.find(query)
        .populate("class_id", "name section stream")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Admission.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: admissions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error("[GET /api/admissions]", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { schoolId, userId, error } = requireAuth(req, ["school_admin"]);
  if (error) return error;
  if (!schoolId) return NextResponse.json({ success: false, message: "No school context" }, { status: 400 });

  try {
    await connectDB();
    const body = await req.json();

    const {
      academic_year,
      class_id,
      student_name,
      gender,
      dob,
      blood_group,
      prev_school,
      prev_class,
      father_name,
      mother_name,
      guardian_name,
      guardian_relation,
      guardian_occupation,
      phone,
      alt_phone,
      email,
      address,
      city,
      state,
      country,
      pin_code,
      emergency_contact,
      remarks,
      photo,
      birth_certificate,
      transfer_certificate,
      aadhaar,
      report_card,
      other_documents,
    } = body;

    if (!academic_year) return NextResponse.json({ success: false, message: "Academic year is required" }, { status: 400 });
    if (!class_id) return NextResponse.json({ success: false, message: "Applying class is required" }, { status: 400 });
    if (!student_name?.trim()) return NextResponse.json({ success: false, message: "Student Name is required" }, { status: 400 });
    if (!gender) return NextResponse.json({ success: false, message: "Gender is required" }, { status: 400 });
    if (!dob) return NextResponse.json({ success: false, message: "Date of birth is required" }, { status: 400 });
    if (!phone?.trim()) return NextResponse.json({ success: false, message: "Mobile number is required" }, { status: 400 });

    const yearPart = academic_year.split("-")[0] || new Date().getFullYear().toString();
    const count = await Admission.countDocuments({ school_id: schoolId, academic_year });
    const serial = String(count + 1).padStart(6, "0");
    const applicationNo = `ADM-${yearPart}-${serial}`;

    const admission = await Admission.create({
      school_id: schoolId,
      application_no: applicationNo,
      status: "New",
      academic_year,
      class_id,
      student_name: student_name.trim(),
      first_name: "",
      last_name: "",
      gender,
      dob: new Date(dob),
      blood_group,
      prev_school,
      prev_class,
      father_name,
      mother_name,
      guardian_name: guardian_name || father_name || mother_name,
      guardian_relation: guardian_relation || (father_name ? "Father" : mother_name ? "Mother" : ""),
      guardian_occupation,
      phone: phone.trim(),
      alt_phone,
      email: email?.trim().toLowerCase(),
      address,
      city,
      state,
      country,
      pin_code,
      emergency_contact,
      remarks,
      photo,
      birth_certificate,
      transfer_certificate,
      aadhaar,
      report_card,
      other_documents,
      status_history: [
        {
          status: "New",
          updated_by: `Admin (User ID: ${userId})`,
          date: new Date(),
          remarks: "Application manually logged by Administrator.",
        },
      ],
    });

    return NextResponse.json({ success: true, data: admission }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/admissions]", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
