import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Admission, Student, School, User } from "@/lib/models/index";
import Parent from "@/lib/models/Parent";
import Class from "@/lib/models/Class";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

const SCHOOL_SLUG = process.env.NEXT_PUBLIC_SCHOOL_SLUG || "school";

function generateStudentLoginEmail(name: string, dob?: Date | string): string {
  const firstName = name.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
  let dobDay = "";
  if (dob) {
    const d = new Date(dob);
    if (!isNaN(d.getTime())) {
      dobDay = String(d.getDate());
    }
  }
  const slug = SCHOOL_SLUG.replace(/[\s-]+/g, "");
  return `${firstName}${dobDay}.${slug}.myschoollife`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { schoolId, userId, error } = requireAuth(req, ["school_admin"]);
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

    if (admission.status === "Admission Completed") {
      return NextResponse.json({ success: false, message: "Admission has already been completed for this application" }, { status: 400 });
    }

    const body = await req.json();
    const { class_id } = body;

    // Resolve target class
    const targetClassId = class_id || admission.class_id;
    if (!targetClassId) {
      return NextResponse.json({ success: false, message: "No class assigned for this student" }, { status: 400 });
    }

    const selectedClass = await Class.findOne({ _id: targetClassId, school_id: schoolId });
    if (!selectedClass) {
      return NextResponse.json({ success: false, message: "Target class not found" }, { status: 400 });
    }

    // Verify duplicate student name + guardian phone in Student table
    const fullName = (admission.student_name || `${admission.first_name} ${admission.last_name}`).trim();
    const duplicate = await Student.findOne({
      school_id: schoolId,
      name: fullName,
      dob: admission.dob,
    });
    if (duplicate) {
      return NextResponse.json({ success: false, message: "A student record with this name and DOB already exists" }, { status: 409 });
    }

    // 1. Generate unique Admission Number
    const studentCount = await Student.countDocuments({ school_id: schoolId });
    const finalAdmissionNo = `SCH-${new Date().getFullYear()}-${String(studentCount + 1).padStart(5, "0")}`;

    // 2. Generate student login User credentials (standard format)
    const studentLoginEmail = generateStudentLoginEmail(fullName, admission.dob);

    let studentUserId = undefined;
    const existingStudentUser = await User.findOne({ email: studentLoginEmail, school_id: schoolId });
    if (existingStudentUser) {
      studentUserId = existingStudentUser._id;
    } else {
      let studentPassword = "student123";
      if (admission.dob) {
        const dateObj = new Date(admission.dob);
        if (!isNaN(dateObj.getTime())) {
          const day = String(dateObj.getDate()).padStart(2, "0");
          const month = String(dateObj.getMonth() + 1).padStart(2, "0");
          const yy = dateObj.getFullYear().toString().slice(-2);
          studentPassword = `${day}${month}${yy}`;
        }
      }

      const user = await User.create({
        school_id: schoolId,
        name: fullName,
        email: studentLoginEmail,
        password_hash: studentPassword,
        plain_password: studentPassword,
        role: "student",
        is_active: true,
        must_change_password: true,
      });
      studentUserId = user._id;
    }

    // 3. Link or Create Parent record
    let parentId = undefined;
    if (admission.guardian_name) {
      const existingParent = await Parent.findOne({
        school_id: schoolId,
        name: admission.guardian_name.trim(),
        phone: admission.phone.trim(),
      });

      if (existingParent) {
        parentId = existingParent._id;
      } else {
        let parentUserId = undefined;
        if (admission.email) {
          const parentEmail = admission.email.trim().toLowerCase();
          const existingParentUser = await User.findOne({ email: parentEmail, school_id: schoolId });
          if (existingParentUser) {
            parentUserId = existingParentUser._id;
          } else {
            const parentUser = await User.create({
              school_id: schoolId,
              name: admission.guardian_name.trim(),
              email: parentEmail,
              password_hash: "parent123",
              plain_password: "parent123",
              role: "parent",
              is_active: true,
              must_change_password: true,
            });
            parentUserId = parentUser._id;
          }
        }

        const newParent = await Parent.create({
          school_id: schoolId,
          user_id: parentUserId,
          name: admission.guardian_name.trim(),
          phone: admission.phone.trim(),
          email: admission.email?.trim().toLowerCase(),
          relation: admission.guardian_relation?.trim(),
          occupation: admission.guardian_occupation?.trim(),
          address: admission.address?.trim(),
          is_active: true,
        });
        parentId = newParent._id;
      }
    }

    // 4. Create Student Record
    const student = await Student.create({
      school_id: schoolId,
      user_id: studentUserId,
      parent_id: parentId,
      name: fullName,
      email: admission.email?.trim().toLowerCase() || studentLoginEmail,
      class_id: targetClassId,
      gender: admission.gender,
      dob: admission.dob,
      blood_group: admission.blood_group,
      address: admission.address,
      phone: admission.phone,
      guardian_name: admission.guardian_name,
      guardian_phone: admission.phone,
      guardian_relation: admission.guardian_relation,
      guardian_email: admission.email,
      admission_no: finalAdmissionNo,
      academic_year: admission.academic_year,
      admission_date: new Date(),
      is_active: true,
      photo_url: admission.photo?.url || undefined,
      birth_cert: admission.birth_certificate,
      transfer_cert: admission.transfer_certificate,
      prev_school_name: admission.prev_school,
      father_name: admission.father_name,
      mother_name: admission.mother_name,
    });

    // 5. Update Admission application status
    admission.status = "Admission Completed";
    admission.status_history.push({
      status: "Admission Completed",
      updated_by: `Admin (User ID: ${userId})`,
      date: new Date(),
      remarks: `Admission approved. Student profile provisioned with Admission No: ${finalAdmissionNo}.`,
    });
    await admission.save();

    // Generate credentials response password formatted (DDMMYY)
    let studentPassword = "student123";
    if (admission.dob) {
      const dateObj = new Date(admission.dob);
      if (!isNaN(dateObj.getTime())) {
        const day = String(dateObj.getDate()).padStart(2, "0");
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const yy = dateObj.getFullYear().toString().slice(-2);
        studentPassword = `${day}${month}${yy}`;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Admission application approved successfully and Student record created",
      data: student,
      credentials: {
        loginId: studentLoginEmail,
        password: studentPassword,
        admission_no: finalAdmissionNo,
      },
    }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/admissions/[id]/approve]", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
