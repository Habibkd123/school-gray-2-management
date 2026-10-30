import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Class from "@/lib/models/Class";
import Teacher from "@/lib/models/Teacher";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

const SCHOOL_SLUG = process.env.NEXT_PUBLIC_SCHOOL_SLUG || "school";

function generateTeacherLoginEmail(name: string, dob?: string): string {
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
      let userId: any = undefined;
      let newlyCreatedUser = false;

      try {
        const {
          employee_id, name, gender, dob, phone, email, address,
          subject_specialization, qualification, experience_years,
          join_date, class_ids
        } = row;

        // Validation sanity checks
        if (!name || !employee_id || !subject_specialization) {
          throw new Error("Missing required fields on the row.");
        }

        const duplicateTeacher = await Teacher.findOne({
          school_id: schoolId,
          employee_id: employee_id.trim()
        });
        if (duplicateTeacher) {
          throw new Error(`Teacher with Employee ID '${employee_id}' already exists.`);
        }

        const teacherLoginEmail = generateTeacherLoginEmail(name.trim(), dob);
        const existingUser = await User.findOne({ email: teacherLoginEmail, school_id: schoolId });
        if (existingUser) {
          userId = existingUser._id;
        } else {
          // Create login User account
          const user = await User.create({
            school_id: schoolId as string,
            name: name.trim(),
            email: teacherLoginEmail,
            password_hash: "Master#2026",
            plain_password: "Master#2026",
            role: "teacher",
            is_active: true,
            must_change_password: true,
          });
          userId = user._id;
          newlyCreatedUser = true;
        }

        const resolvedClassIds = Array.isArray(class_ids) ? class_ids : [];
        const resolvedClassId = resolvedClassIds.length > 0 ? resolvedClassIds[0] : undefined;

        // Create Teacher record
        const teacher = await Teacher.create({
          school_id: schoolId as string,
          user_id: userId,
          class_id: resolvedClassId,
          class_ids: resolvedClassIds,
          name: name.trim(),
          employee_id: employee_id.trim(),
          gender,
          dob: dob ? new Date(dob) : undefined,
          phone: phone || undefined,
          email: email || teacherLoginEmail,
          address: address || undefined,
          subject_specialization: subject_specialization.trim(),
          qualification: qualification || undefined,
          experience_years: experience_years || 0,
          join_date: join_date ? new Date(join_date) : undefined,
          is_active: true,
        });

        // Link primary class if assigned
        if (resolvedClassId) {
          await mongoose.model("Class").findOneAndUpdate(
            { _id: resolvedClassId, school_id: schoolId },
            { class_teacher_id: teacher._id }
          );
        }

        successCount++;
      } catch (err: any) {
        if (newlyCreatedUser && userId) {
          await User.deleteOne({ _id: userId, school_id: schoolId }).catch(() => {});
        }

        failedCount++;
        failures.push({
          row: row.name || row.employee_id || "Unknown row",
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
    console.error("[POST /api/teachers/import]", err);
    return NextResponse.json({ success: false, message: err.message || "Failed to import teachers" }, { status: 500 });
  }
}
