import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Class, { computeSortWeight } from "@/lib/models/Class";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";
import { invalidateServerClassesCache } from "../route";
import { invalidateFeesCache } from "@/app/api/fees/route";
import {
  Student,
  Teacher,
  Attendance,
  Exam,
  ClassTest,
  Homework,
  Timetable,
  GeneratedDocument,
  TeacherAssignment,
  ClassFee,
  FeesStructure
} from "@/lib/models/index";

type RouteParams = { params: Promise<{ id: string }> };

// GET: Single class
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid class ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const cls = await Class.findOne({ _id: id, school_id: schoolId as string })
      .populate("class_teacher_id", "name employee_id")
      .lean();

    if (!cls) {
      return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 });
    }

    const classFee = await ClassFee.findOne({
      school_id: new mongoose.Types.ObjectId(schoolId as string),
      class_id: new mongoose.Types.ObjectId(id),
      academic_year: (cls as any).academic_year || "2026-2027",
    }).lean();

    return NextResponse.json({
      success: true,
      data: {
        ...cls,
        default_fee: classFee ? classFee.total_amount : 0,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// PUT: Update a class
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid class ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const body = await req.json();
    const { name, section, academic_year, class_teacher_id, capacity, class_code, status, default_fee } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      updateData.name        = name.trim();
      updateData.sort_weight = computeSortWeight(name.trim());  // keep ordering in sync
    }
    if (section !== undefined)          updateData.section          = section.trim();
    if (academic_year !== undefined)    updateData.academic_year    = academic_year.trim();
    if (class_teacher_id) {
      if (!mongoose.Types.ObjectId.isValid(class_teacher_id)) {
        return NextResponse.json({ success: false, message: "Invalid class teacher ID" }, { status: 400 });
      }
      const teacher = await Teacher.findOne({ _id: class_teacher_id, school_id: schoolId, is_deleted: { $ne: true } });
      if (!teacher) {
        return NextResponse.json({ success: false, message: "Class teacher not found in this school" }, { status: 404 });
      }
      updateData.class_teacher_id = class_teacher_id;
    } else if (class_teacher_id === null || class_teacher_id === "") {
      updateData.class_teacher_id = null;
    }
    if (capacity !== undefined)         updateData.capacity         = parseInt(capacity);
    if (class_code !== undefined)       updateData.class_code       = class_code?.trim().toUpperCase() || null;
    if (status !== undefined)           updateData.status           = status;

    const updated = await Class.findOneAndUpdate(
      { _id: id, school_id: schoolId as string },
      { $set: updateData },
      { returnDocument: 'after', new: true }
    ).populate("class_teacher_id", "name employee_id");

    if (!updated) {
      return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 });
    }

    if (default_fee !== undefined && default_fee !== null && default_fee !== "") {
      const amount = Math.max(0, Number(default_fee) || 0);
      const targetYear = updated.academic_year || academic_year || "2026-2027";
      try {
        const existingClassFee = await ClassFee.findOne({
          school_id: new mongoose.Types.ObjectId(schoolId as string),
          class_id: updated._id,
          academic_year: targetYear,
        });

        if (existingClassFee && existingClassFee.fee_types && existingClassFee.fee_types.length > 0) {
          let updatedFirst = false;
          const feeTypes = existingClassFee.fee_types.map((ft: any) => {
            if (!updatedFirst && (ft.name.toLowerCase().includes("tuition") || ft.is_enabled)) {
              updatedFirst = true;
              return { ...ft, amount, is_enabled: true };
            }
            return ft;
          });
          const total_amount = feeTypes
            .filter((ft: any) => ft.is_enabled)
            .reduce((sum: number, ft: any) => sum + Number(ft.amount || 0), 0);

          await ClassFee.findByIdAndUpdate(existingClassFee._id, { fee_types: feeTypes, total_amount });
        } else {
          await ClassFee.findOneAndUpdate(
            {
              school_id: new mongoose.Types.ObjectId(schoolId as string),
              class_id: updated._id,
              academic_year: targetYear,
            },
            {
              fee_types: [
                { name: "Tuition Fees", amount, frequency: "Monthly", is_mandatory: true, is_enabled: true },
                { name: "Academic Fees", amount: 0, frequency: "Yearly", is_mandatory: true, is_enabled: true },
                { name: "Exam Fees", amount: 0, frequency: "Quarterly", is_mandatory: true, is_enabled: true },
                { name: "Computer Fees", amount: 0, frequency: "Monthly", is_mandatory: true, is_enabled: true },
                { name: "Library Fees", amount: 0, frequency: "Yearly", is_mandatory: true, is_enabled: true },
                { name: "Transport Fees", amount: 0, frequency: "Monthly", is_mandatory: false, is_enabled: false },
                { name: "Admission Fees", amount: 0, frequency: "One Time", is_mandatory: false, is_enabled: false },
                { name: "Other Fees", amount: 0, frequency: "Monthly", is_mandatory: false, is_enabled: false },
              ],
              total_amount: amount,
            },
            { upsert: true }
          );
        }
        invalidateFeesCache(String(schoolId));
      } catch (fErr) {
        console.warn("[Update Class] Non-fatal default fee error:", fErr);
      }
    }

    invalidateServerClassesCache(String(schoolId));

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json(
        { success: false, message: "A class with this name, section, and academic year already exists" },
        { status: 409 }
      );
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// DELETE: Remove a class (only if safe)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = requireAuth(req, ["school_admin", "super_admin"]);
  if (auth.error) return auth.error;
  const { schoolId, user, userId } = auth;

  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid class ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const classQuery: any = { _id: id };
    if (user.role !== "super_admin" && schoolId) {
      classQuery.school_id = schoolId;
    }

    const cls = await Class.findOne(classQuery);
    if (!cls) {
      return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 });
    }

    const targetSchoolId = cls.school_id;

    const [
      students,
      attendance,
      exams,
      classTests,
      homeworks,
      timetables,
      teacherAssignments,
      feesStructures,
      classFees,
      documents
    ] = await Promise.all([
      Student.countDocuments({ class_id: id, school_id: targetSchoolId }),
      Attendance.countDocuments({ class_id: id, school_id: targetSchoolId }),
      Exam.countDocuments({ class_id: id, school_id: targetSchoolId }),
      ClassTest.countDocuments({ class_id: id, school_id: targetSchoolId }),
      Homework.countDocuments({ class_id: id, school_id: targetSchoolId }),
      Timetable.countDocuments({ class_id: id, school_id: targetSchoolId }),
      TeacherAssignment.countDocuments({ class_id: id, school_id: targetSchoolId, is_deleted: false }),
      FeesStructure.countDocuments({ class_id: id, school_id: targetSchoolId }),
      ClassFee.countDocuments({ class_id: id, school_id: targetSchoolId }),
      GeneratedDocument.countDocuments({ class_id: id, school_id: targetSchoolId })
    ]);

    const reasons: string[] = [];
    if (students > 0) reasons.push(`${students} Active Students`);
    if (attendance > 0) reasons.push(`${attendance} Attendance Records`);
    if (exams > 0) reasons.push(`${exams} Exams`);
    if (classTests > 0) reasons.push(`${classTests} Assessments (Class Tests)`);
    if (homeworks > 0) reasons.push(`${homeworks} Homework Assignments`);
    if (timetables > 0) reasons.push(`${timetables} Timetable Routines`);
    if (teacherAssignments > 0) reasons.push(`${teacherAssignments} Teacher Assignments`);
    if (feesStructures > 0 || classFees > 0) reasons.push(`${feesStructures + classFees} Fee Configurations`);
    if (documents > 0) reasons.push(`${documents} Generated Documents/Reports`);

    if (reasons.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `This class cannot be deleted because it contains: ${reasons.join(", ")}. Please deactivate or archive it instead.`
        },
        { status: 409 }
      );
    }

    const url = new URL(req.url);
    const isPermanent = url.searchParams.get("permanent") === "true";

    if (isPermanent) {
      const deleted = await Class.findOneAndDelete({ _id: id, school_id: targetSchoolId });
      if (!deleted) {
        return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 });
      }
      invalidateServerClassesCache(String(targetSchoolId));
      return NextResponse.json({ success: true, message: "Class permanently deleted" });
    }

    const updated = await Class.findOneAndUpdate(
      { _id: id, school_id: targetSchoolId },
      {
        $set: {
          is_deleted: true,
          deleted_at: new Date(),
          deleted_by: userId ? new mongoose.Types.ObjectId(userId) : undefined,
          status: "Archived",
        },
      },
      { returnDocument: 'after', new: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 });
    }

    invalidateServerClassesCache(String(targetSchoolId));

    return NextResponse.json({ success: true, message: "Class archived (soft-deleted) successfully" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = requireAuth(req, ["school_admin", "super_admin"]);
  if (auth.error) return auth.error;
  const { schoolId, user } = auth;
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid class ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "restore";

    const classQuery: any = { _id: id };
    if (user.role !== "super_admin" && schoolId) {
      classQuery.school_id = schoolId;
    }

    if (action === "restore") {
      const cls = await Class.findOneAndUpdate(
        classQuery,
        {
          $set: {
            is_deleted: false,
            deleted_at: null,
            deleted_by: null,
            status: "Active",
          },
        },
        { returnDocument: 'after', new: true }
      );
      if (!cls) {
        return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 });
      }

      invalidateServerClassesCache(String(cls.school_id));
      return NextResponse.json({ success: true, message: "Class restored successfully", data: cls });
    }

    return NextResponse.json({ success: false, message: "Unsupported action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
