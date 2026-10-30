import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Class from "@/lib/models/Class";
import Student from "@/lib/models/Student";
import User from "@/lib/models/User";
import { Parent } from "@/lib/models";
import ClassFee from "@/lib/models/ClassFee";
import StudentFeeAssignment from "@/lib/models/StudentFeeAssignment";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

const SCHOOL_SLUG = process.env.NEXT_PUBLIC_SCHOOL_SLUG || "school";

function generateStudentLoginEmail(name: string, dob?: string): string {
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

export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectDB();
    const { rows } = await req.json();

    if (!Array.isArray(rows)) {
      return NextResponse.json({ success: false, message: "Invalid payload format. Expected rows array." }, { status: 400 });
    }

    let successCount = 0;
    let failedCount = 0;
    const failures: any[] = [];

    for (const row of rows) {
      let studentUserId: any = undefined;
      let newlyCreatedStudentUser = false;
      let parentUserId: any = undefined;
      let newlyCreatedParentUser = false;
      let parentId: any = undefined;
      let newlyCreatedParent = false;

      try {
        const {
          name, admission_no, roll_no, class_id, gender, dob,
          phone, email, address, guardian_name, guardian_phone,
          guardian_email, guardian_relation, academic_year, aadhaar_no
        } = row;

        // Perform secondary verification on the backend to avoid any dirty/corrupt data save
        if (!name || !admission_no || !class_id || !guardian_name || !guardian_phone || !guardian_relation) {
          throw new Error("Missing required fields on the row.");
        }

        const classExists = await Class.exists({ _id: class_id, school_id: schoolId });
        if (!classExists) {
          throw new Error(`Class ID ${class_id} not found.`);
        }

        const duplicateAdmissionNo = await Student.findOne({
          school_id: schoolId,
          admission_no: admission_no.trim()
        });
        if (duplicateAdmissionNo) {
          throw new Error(`Admission number '${admission_no}' already exists.`);
        }

        // Generate student login details
        const studentLoginEmail = generateStudentLoginEmail(name.trim(), dob);

        const existingStudentUser = await User.findOne({ email: studentLoginEmail, school_id: schoolId });
        if (existingStudentUser) {
          studentUserId = existingStudentUser._id;
        } else {
          let studentPassword = "student123";
          if (dob) {
            const dateObj = new Date(dob);
            if (!isNaN(dateObj.getTime())) {
              const day = String(dateObj.getDate()).padStart(2, "0");
              const month = String(dateObj.getMonth() + 1).padStart(2, "0");
              const yy = dateObj.getFullYear().toString().slice(-2);
              studentPassword = `${day}${month}${yy}`;
            }
          }

          const user = await User.create({
            school_id: schoolId as string,
            name: name.trim(),
            email: studentLoginEmail,
            password_hash: studentPassword,
            plain_password: studentPassword,
            role: "student",
            is_active: true,
            must_change_password: true,
          });
          studentUserId = user._id;
          newlyCreatedStudentUser = true;
        }

        // Create or link parent
        if (guardian_name?.trim()) {
          const existingParent = await Parent.findOne({
            school_id: schoolId,
            name: guardian_name.trim(),
            $or: [
              { phone: guardian_phone?.trim() || "never-match-this" },
              { email: guardian_email?.trim().toLowerCase() || "never-match-this" }
            ]
          });

          if (existingParent) {
            parentId = existingParent._id;
          } else {
            if (guardian_email?.trim()) {
              const parentEmail = guardian_email.trim().toLowerCase();
              const existingParentUser = await User.findOne({ email: parentEmail, school_id: schoolId });
              if (existingParentUser) {
                parentUserId = existingParentUser._id;
              } else {
                const parentUser = await User.create({
                  school_id: schoolId as string,
                  name: guardian_name.trim(),
                  email: parentEmail,
                  password_hash: "parent123",
                  plain_password: "parent123",
                  role: "parent",
                  is_active: true,
                  must_change_password: true,
                });
                parentUserId = parentUser._id;
                newlyCreatedParentUser = true;
              }
            }

            const newParent = await Parent.create({
              school_id: schoolId as string,
              user_id: parentUserId,
              name: guardian_name.trim(),
              phone: guardian_phone?.trim(),
              email: guardian_email?.trim().toLowerCase(),
              relation: guardian_relation?.trim(),
              is_active: true,
            });
            parentId = newParent._id;
            newlyCreatedParent = true;
          }
        }

        const safeAcademicYear = (academic_year || "2026-2027").trim();

        // Create student
        const createdStudent = await Student.create({
          school_id: schoolId as string,
          user_id: studentUserId,
          parent_id: parentId,
          name: name.trim(),
          roll_no: roll_no || undefined,
          class_id,
          gender,
          dob: dob ? new Date(dob) : undefined,
          phone: phone || undefined,
          email: email || undefined,
          address: address || undefined,
          guardian_name: guardian_name.trim(),
          guardian_phone: guardian_phone.trim(),
          guardian_relation: guardian_relation.trim(),
          guardian_email: guardian_email || undefined,
          admission_no: admission_no.trim(),
          academic_year: safeAcademicYear,
          is_active: true,
          aadhaar_no: aadhaar_no || undefined,
        });

        // Auto-assign default class fees
        try {
          const classFeeConfig = await ClassFee.findOne({
            school_id: new mongoose.Types.ObjectId(schoolId as string),
            class_id: new mongoose.Types.ObjectId(class_id),
            academic_year: safeAcademicYear,
          }).lean();

          if (classFeeConfig && classFeeConfig.fee_types && classFeeConfig.fee_types.length > 0) {
            await StudentFeeAssignment.findOneAndUpdate(
              {
                school_id: new mongoose.Types.ObjectId(schoolId as string),
                student_id: createdStudent._id,
                academic_year: safeAcademicYear,
              },
              {
                fee_types: classFeeConfig.fee_types,
                total_amount: classFeeConfig.total_amount,
              },
              { upsert: true }
            );
          }
        } catch (feeErr) {
          console.warn("[Import] Non-fatal: failed to assign class fee:", feeErr);
        }

        successCount++;
      } catch (err: any) {
        // Rollback any newly created orphan records from this failed row
        if (newlyCreatedStudentUser && studentUserId) {
          await User.deleteOne({ _id: studentUserId, school_id: schoolId }).catch(() => {});
        }
        if (newlyCreatedParent && parentId) {
          await Parent.deleteOne({ _id: parentId, school_id: schoolId }).catch(() => {});
        }
        if (newlyCreatedParentUser && parentUserId) {
          await User.deleteOne({ _id: parentUserId, school_id: schoolId }).catch(() => {});
        }

        failedCount++;
        failures.push({
          row: row.name || row.admission_no || "Unknown row",
          error: err.message || "Failed to import record"
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        successCount,
        failedCount,
        failures,
      }
    });
  } catch (err: any) {
    console.error("[POST /api/students/import]", err);
    return NextResponse.json({ success: false, message: err.message || "Failed to import students" }, { status: 500 });
  }
}
