import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { TeacherAssignment, Class, SubjectMaster, Syllabus } from "@/lib/models/index";
import Stream from "@/lib/models/Stream";
import Teacher from "@/lib/models/Teacher";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Ensure models are registered for populate
const registerModels = () => {
  return [Class.modelName, Stream.modelName, Teacher.modelName];
};

// PUT — update a teacher assignment
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { schoolId, user, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  const { id } = await params;

  try {
    await connectToDatabase();
    registerModels();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid assignment ID" }, { status: 400 });
    }

    const assignment = await TeacherAssignment.findOne({ _id: id, school_id: schoolId, is_deleted: { $ne: true } });
    if (!assignment) {
      return NextResponse.json({ success: false, message: "Teacher assignment not found" }, { status: 404 });
    }

    const { 
      academic_year, 
      teacher_id, 
      class_id, 
      stream_id, 
      subject_master_id, 
      assignment_type, 
      effective_date, 
      status, 
      remarks 
    } = await req.json();

    const updateData: any = {
      updated_by: new mongoose.Types.ObjectId(user.user_id as string)
    };

    if (academic_year !== undefined) updateData.academic_year = academic_year.trim();
    if (remarks !== undefined) updateData.remarks = remarks || "";
    if (status !== undefined) updateData.status = status || "Active";
    if (assignment_type !== undefined) updateData.assignment_type = assignment_type || "Subject Teacher";
    if (effective_date !== undefined) updateData.effective_date = effective_date ? new Date(effective_date) : new Date();

    if (teacher_id !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(teacher_id)) {
        return NextResponse.json({ success: false, message: "Invalid Teacher ID" }, { status: 400 });
      }
      updateData.teacher_id = new mongoose.Types.ObjectId(teacher_id as string);
    }

    if (class_id !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(class_id)) {
        return NextResponse.json({ success: false, message: "Invalid Class ID" }, { status: 400 });
      }
      const cls = await Class.findOne({ _id: class_id, school_id: schoolId }).lean();
      if (!cls) return NextResponse.json({ success: false, message: "Class not found" }, { status: 404 });
      updateData.class_id = new mongoose.Types.ObjectId(class_id as string);

      const isHigherClass = cls.name.startsWith("Class 11") || cls.name.startsWith("Class 12");
      if (isHigherClass && stream_id) {
        if (mongoose.Types.ObjectId.isValid(stream_id)) {
          updateData.stream_id = new mongoose.Types.ObjectId(stream_id as string);
        } else {
          updateData.stream_id = null;
        }
      } else {
        updateData.stream_id = null;
      }
    }

    if (subject_master_id !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(subject_master_id)) {
        return NextResponse.json({ success: false, message: "Invalid Subject ID" }, { status: 400 });
      }
      const subject = await SubjectMaster.findOne({ _id: subject_master_id, school_id: schoolId }).lean();
      if (!subject) return NextResponse.json({ success: false, message: "Subject not found" }, { status: 404 });
      updateData.subject_master_id = new mongoose.Types.ObjectId(subject_master_id as string);
    }

    // Check duplicate index collision
    const finalYear = updateData.academic_year || assignment.academic_year;
    const finalClassId = updateData.class_id || assignment.class_id;
    const finalSubjectId = updateData.subject_master_id || assignment.subject_master_id;

    const finalType = updateData.assignment_type || assignment.assignment_type;
    const isClassRole = finalType === "Class Teacher" || finalType === "Co-Class Teacher";

    if (isClassRole) {
      const finalTeacherId = updateData.teacher_id || assignment.teacher_id;
      
      if (finalType === "Class Teacher") {
        // Check if there is another class teacher for this class
        const existingClassTeacher = await TeacherAssignment.findOne({
          school_id: schoolId,
          academic_year: finalYear,
          class_id: finalClassId,
          assignment_type: "Class Teacher",
          _id: { $ne: id },
          is_deleted: { $ne: true }
        }).populate("teacher_id", "name");

        if (existingClassTeacher) {
          return NextResponse.json(
            { success: false, message: `This class section already has an active Class Teacher: ${(existingClassTeacher.teacher_id as any)?.name || "Assigned"}` },
            { status: 409 }
          );
        }

        // Check if this teacher is assigned elsewhere as Class Teacher
        const teacherAssignedElsewhere = await TeacherAssignment.findOne({
          school_id: schoolId,
          academic_year: finalYear,
          teacher_id: finalTeacherId,
          assignment_type: "Class Teacher",
          _id: { $ne: id },
          is_deleted: { $ne: true }
        }).populate("class_id", "name section");

        if (teacherAssignedElsewhere) {
          return NextResponse.json(
            { success: false, message: `This teacher is already assigned as Class Teacher for ${(teacherAssignedElsewhere.class_id as any)?.name || "another class"} ${(teacherAssignedElsewhere.class_id as any)?.section ? `- ${(teacherAssignedElsewhere.class_id as any).section}` : ""}.` },
            { status: 409 }
          );
        }
      }

      if (finalType === "Co-Class Teacher") {
        const existingCoTeacher = await TeacherAssignment.findOne({
          school_id: schoolId,
          academic_year: finalYear,
          class_id: finalClassId,
          teacher_id: finalTeacherId,
          assignment_type: "Co-Class Teacher",
          _id: { $ne: id },
          is_deleted: { $ne: true }
        });

        if (existingCoTeacher) {
          return NextResponse.json(
            { success: false, message: "This teacher is already assigned as Co-Class Teacher for this class section." },
            { status: 409 }
          );
        }
      }
    } else {
      // For Subject Teacher, enforce exact unique checks (prevent only exact duplicate assignments)
      if (
        (updateData.academic_year && updateData.academic_year !== assignment.academic_year) ||
        (updateData.class_id && updateData.class_id.toString() !== assignment.class_id?.toString()) ||
        (updateData.subject_master_id && updateData.subject_master_id.toString() !== assignment.subject_master_id?.toString()) ||
        (updateData.teacher_id && updateData.teacher_id.toString() !== assignment.teacher_id?.toString())
      ) {
        const finalTeacherId = updateData.teacher_id || assignment.teacher_id;
        const duplicate = await TeacherAssignment.findOne({
          school_id: schoolId,
          academic_year: finalYear,
          class_id: finalClassId,
          subject_master_id: finalSubjectId,
          teacher_id: finalTeacherId,
          _id: { $ne: id },
          is_deleted: { $ne: true }
        }).populate("teacher_id", "name");

        if (duplicate) {
          return NextResponse.json(
            { success: false, message: `This subject is already assigned to ${(duplicate.teacher_id as any)?.name || "this teacher"} in this class for the selected year.` },
            { status: 409 }
          );
        }
      }
    }

    const changesArray: string[] = [];
    if (academic_year !== undefined && academic_year.trim() !== assignment.academic_year) {
      changesArray.push(`Academic Year: "${assignment.academic_year}" -> "${academic_year.trim()}"`);
    }
    if (teacher_id !== undefined && teacher_id !== String(assignment.teacher_id)) {
      changesArray.push(`Teacher ID: "${assignment.teacher_id}" -> "${teacher_id}"`);
    }
    if (class_id !== undefined && class_id !== String(assignment.class_id)) {
      changesArray.push(`Class ID: "${assignment.class_id}" -> "${class_id}"`);
    }
    if (subject_master_id !== undefined && subject_master_id !== String(assignment.subject_master_id)) {
      changesArray.push(`Subject Master ID: "${assignment.subject_master_id}" -> "${subject_master_id}"`);
    }
    if (assignment_type !== undefined && assignment_type !== assignment.assignment_type) {
      changesArray.push(`Assignment Type: "${assignment.assignment_type}" -> "${assignment_type}"`);
    }
    if (status !== undefined && status !== assignment.status) {
      changesArray.push(`Status: "${assignment.status}" -> "${status}"`);
    }

    const historyItem = {
      action: "Update",
      changes: changesArray.join(", ") || "No fields changed.",
      updated_by: new mongoose.Types.ObjectId(user.user_id as string),
      date: new Date(),
      remarks: remarks || "Updated by admin."
    };

    const updated = await TeacherAssignment.findOneAndUpdate(
      { _id: id, school_id: schoolId },
      { 
        $set: updateData,
        $push: { history: historyItem }
      },
      { new: true }
    )
      .populate("teacher_id", "name employee_id")
      .populate("class_id", "name section class_code")
      .populate("stream_id", "name")
      .populate("subject_master_id", "name subject_code")
      .lean() as any;

    // Synchronize Class collection for Class Teacher roles
    if (finalType === "Class Teacher") {
      const finalStatus = updateData.status || assignment.status;
      const classTeacherVal = finalStatus === "Active" ? new mongoose.Types.ObjectId(String(updated?.teacher_id?._id || updated?.teacher_id)) : null;
      await Class.findOneAndUpdate(
        { _id: finalClassId, school_id: schoolId },
        { class_teacher_id: classTeacherVal }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}

// DELETE — soft delete a teacher assignment and remove syllabus mapping
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { schoolId, user, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  const { id } = await params;

  try {
    await connectToDatabase();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    const softDeleted = await TeacherAssignment.findOneAndUpdate(
      { _id: id, school_id: schoolId, is_deleted: { $ne: true } },
      {
        $set: {
          is_deleted: true,
          deleted_at: new Date(),
          deleted_by: new mongoose.Types.ObjectId(user.user_id as string)
        },
        $push: {
          history: {
            action: "Soft Delete",
            changes: "Assignment soft deleted.",
            updated_by: new mongoose.Types.ObjectId(user.user_id as string),
            date: new Date(),
            remarks: "Deleted by admin."
          }
        }
      },
      { new: true }
    );

    if (!softDeleted) {
      return NextResponse.json({ success: false, message: "Teacher assignment not found" }, { status: 404 });
    }

    // Sync class if soft deleted was a Class Teacher assignment
    if (softDeleted.assignment_type === "Class Teacher") {
      await Class.findOneAndUpdate(
        { _id: softDeleted.class_id, school_id: schoolId },
        { class_teacher_id: null }
      );
    }

    // Hard-delete syllabus mapping as before
    await Syllabus.deleteOne({ teacher_assignment_id: id, school_id: schoolId });

    return NextResponse.json({ success: true, message: "Teacher assignment soft-deleted and syllabus cleaned" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
