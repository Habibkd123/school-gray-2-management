import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Class, { computeSortWeight } from "@/lib/models/Class";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";
import { invalidateServerClassesCache } from "../route";
import {
  Student,
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

  try {
    await connectToDatabase();

    const cls = await Class.findOne({ _id: id, school_id: schoolId as string }).populate(
      "class_teacher_id",
      "name employee_id"
    );

    if (!cls) {
      return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: cls });
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

  try {
    await connectToDatabase();

    const body = await req.json();
    const { name, section, academic_year, class_teacher_id, capacity, class_code, status } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      updateData.name        = name.trim();
      updateData.sort_weight = computeSortWeight(name.trim());  // keep ordering in sync
    }
    if (section !== undefined)          updateData.section          = section.trim();
    if (academic_year !== undefined)    updateData.academic_year    = academic_year.trim();
    if (class_teacher_id !== undefined) updateData.class_teacher_id = class_teacher_id || null;
    if (capacity !== undefined)         updateData.capacity         = parseInt(capacity);
    if (class_code !== undefined)       updateData.class_code       = class_code?.trim().toUpperCase() || null;
    if (status !== undefined)           updateData.status           = status;

    const updated = await Class.findOneAndUpdate(
      { _id: id, school_id: schoolId as string },
      { $set: updateData },
      { new: true }
    ).populate("class_teacher_id", "name employee_id");

    if (!updated) {
      return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 });
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
      { new: true }
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
        { new: true }
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
