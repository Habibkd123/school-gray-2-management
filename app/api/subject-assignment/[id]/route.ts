import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { SubjectAssignment, Class, SubjectMaster, TeacherAssignment } from "@/lib/models/index";
import Stream from "@/lib/models/Stream";
import Teacher from "@/lib/models/Teacher";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";
import { invalidateSubjectAssignmentCache } from "../route";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Ensure models are registered for populate
const registerModels = () => {
  return [Class.modelName, Stream.modelName, Teacher.modelName, TeacherAssignment.modelName];
};

// PUT — update a subject assignment and sync with TeacherAssignment
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    registerModels();
    const { academic_year, class_id, stream_id, subject_master_id, teacher_id, weekly_periods, description, status } = await req.json();

    const assignmentQuery: any = { _id: id };
    if (schoolId) assignmentQuery.school_id = schoolId;
    const assignment = await SubjectAssignment.findOne(assignmentQuery);
    if (!assignment) {
      return NextResponse.json({ success: false, message: "Subject assignment not found" }, { status: 404 });
    }
    const effectiveSchoolId = schoolId || assignment.school_id;

    const updateData: any = {};
    if (academic_year !== undefined) updateData.academic_year = academic_year.trim();
    if (weekly_periods !== undefined) updateData.weekly_periods = weekly_periods ? parseInt(weekly_periods, 10) : 0;
    if (description !== undefined) updateData.description = description || "";
    if (status !== undefined) updateData.status = status || "Active";
    if (teacher_id !== undefined) {
      updateData.teacher_id = teacher_id ? new mongoose.Types.ObjectId(teacher_id as string) : null;
    }

    if (class_id !== undefined) {
      const clsQuery: any = { _id: class_id };
      if (effectiveSchoolId) clsQuery.school_id = effectiveSchoolId;
      const cls = await Class.findOne(clsQuery).lean();
      if (!cls) return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 });
      updateData.class_id = new mongoose.Types.ObjectId(class_id as string);

      const isHigherClass = cls.name.startsWith("Class 11") || cls.name.startsWith("Class 12");
      if (isHigherClass && stream_id) {
        if (mongoose.Types.ObjectId.isValid(stream_id)) {
          const streamQuery: any = { _id: stream_id };
          if (effectiveSchoolId) streamQuery.school_id = effectiveSchoolId;
          const stream = await Stream.findOne(streamQuery).lean();
          if (!stream) return NextResponse.json({ success: false, message: "Stream not found" }, { status: 404 });
          updateData.stream_id = new mongoose.Types.ObjectId(stream_id as string);
        } else {
          updateData.stream_id = null;
        }
      } else {
        updateData.stream_id = null;
      }
    }

    if (subject_master_id !== undefined) {
      if (mongoose.Types.ObjectId.isValid(subject_master_id)) {
        const subQuery: any = { _id: subject_master_id };
        if (effectiveSchoolId) subQuery.school_id = effectiveSchoolId;
        const subject = await SubjectMaster.findOne(subQuery).lean();
        if (!subject) return NextResponse.json({ success: false, message: "Subject not found" }, { status: 404 });
        updateData.subject_master_id = new mongoose.Types.ObjectId(subject_master_id as string);
      }
    }

    const updated = await SubjectAssignment.findOneAndUpdate(
      assignmentQuery,
      { $set: updateData },
      { new: true }
    )
      .populate("class_id", "name class_code section")
      .populate("stream_id", "name")
      .populate("subject_master_id", "name subject_code")
      .populate("teacher_id", "name employee_id")
      .lean();

    // Sync TeacherAssignment mapping
    const finalClassId = updateData.class_id || assignment.class_id;
    const finalSubjectId = updateData.subject_master_id || assignment.subject_master_id;
    const finalYear = updateData.academic_year || assignment.academic_year;
    const finalTeacherId = teacher_id !== undefined ? teacher_id : assignment.teacher_id;

    if (finalTeacherId) {
      await TeacherAssignment.findOneAndUpdate(
        {
          school_id: new mongoose.Types.ObjectId(effectiveSchoolId as string),
          academic_year: finalYear,
          class_id: new mongoose.Types.ObjectId(finalClassId as string),
          subject_master_id: new mongoose.Types.ObjectId(finalSubjectId as string)
        },
        {
          teacher_id: new mongoose.Types.ObjectId(finalTeacherId as string)
        },
        { upsert: true, new: true }
      );
    } else {
      // If teacher is unassigned, delete the matching TeacherAssignment
      await TeacherAssignment.findOneAndDelete({
        school_id: new mongoose.Types.ObjectId(effectiveSchoolId as string),
        academic_year: finalYear,
        class_id: new mongoose.Types.ObjectId(finalClassId as string),
        subject_master_id: new mongoose.Types.ObjectId(finalSubjectId as string)
      });
    }

    invalidateSubjectAssignmentCache(effectiveSchoolId ? String(effectiveSchoolId) : undefined);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json(
        { success: false, message: "This subject is already assigned to this class for the selected year" },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}

// DELETE — remove a subject assignment and its synced TeacherAssignment
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    registerModels();
    const deleteQuery: any = { _id: id };
    if (schoolId) deleteQuery.school_id = schoolId;
    const deleted = await SubjectAssignment.findOneAndDelete(deleteQuery);
    if (!deleted) {
      return NextResponse.json({ success: false, message: "Subject assignment not found" }, { status: 404 });
    }

    const effectiveSchoolId = schoolId || deleted.school_id;

    // Clean up associated TeacherAssignment
    await TeacherAssignment.findOneAndDelete({
      school_id: new mongoose.Types.ObjectId(effectiveSchoolId as string),
      academic_year: deleted.academic_year,
      class_id: deleted.class_id,
      subject_master_id: deleted.subject_master_id
    });

    invalidateSubjectAssignmentCache(effectiveSchoolId ? String(effectiveSchoolId) : undefined);
    return NextResponse.json({ success: true, message: "Subject assignment deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
