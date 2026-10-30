import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Admission } from "@/lib/models/index";
import { resolveSchoolIdServer } from "@/lib/themes/resolveSchool";
import { invalidateAdmissionsCache } from "../../admissions/route";
import { invalidateAdmissionsStatsCache } from "../../admissions/stats/route";
import { invalidateAdmissionsReportsCache } from "../../admissions/reports/route";


export async function POST(req: NextRequest) {
  try {
    const schoolId = await resolveSchoolIdServer(req.headers, req.url);
    if (!schoolId) {
      return NextResponse.json({ success: false, message: "School not configured" }, { status: 400 });
    }

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

    // Field Validations
    if (!academic_year) return NextResponse.json({ success: false, message: "Academic year is required" }, { status: 400 });
    if (!class_id) return NextResponse.json({ success: false, message: "Applying class is required" }, { status: 400 });
    if (!student_name?.trim()) return NextResponse.json({ success: false, message: "Student Name is required" }, { status: 400 });
    if (!gender) return NextResponse.json({ success: false, message: "Gender is required" }, { status: 400 });
    if (!dob) return NextResponse.json({ success: false, message: "Date of birth is required" }, { status: 400 });
    if (!phone?.trim()) return NextResponse.json({ success: false, message: "Mobile number is required" }, { status: 400 });

    const cleanPhone = phone.trim();
    if (cleanPhone.replace(/[^0-9]/g, "").length < 7) {
      return NextResponse.json({ success: false, message: "Please enter a valid mobile number with at least 7 digits." }, { status: 400 });
    }

    // Duplicate submission prevention: check if an identical application was submitted recently
    const existing = await Admission.findOne({
      school_id: schoolId,
      academic_year,
      student_name: student_name.trim(),
      phone: cleanPhone,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }).select("_id application_no").lean();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Application already submitted for this student",
        data: {
          application_no: (existing as any).application_no,
          _id: (existing as any)._id,
          is_duplicate: true,
        },
      }, { status: 200 });
    }

    // Generate unique application number ADM-YYYY-XXXXXX
    const yearPart = academic_year.split("-")[0] || new Date().getFullYear().toString();
    const count = await Admission.countDocuments({ school_id: schoolId, academic_year });
    const serial = String(count + 1).padStart(6, "0");
    const applicationNo = `ADM-${yearPart}-${serial}`;

    // Get client IP address
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";

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
      ip_address: ip,
      status_history: [
        {
          status: "New",
          updated_by: "System (Online Form)",
          date: new Date(),
          remarks: "Application submitted online.",
        },
      ],
    });

    invalidateAdmissionsCache(String(schoolId));
    invalidateAdmissionsStatsCache(String(schoolId));
    invalidateAdmissionsReportsCache(String(schoolId));

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully",
      data: {
        application_no: admission.application_no,
        _id: admission._id,
      },
    }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/public/admissions]", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
