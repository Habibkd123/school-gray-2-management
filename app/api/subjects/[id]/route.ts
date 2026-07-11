import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Subject, Timetable, ExamSchedule, Result, ClassTest, Homework } from "@/lib/models/index";
import Class from "@/lib/models/Class";
import Teacher from "@/lib/models/Teacher";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { schoolId, role, userId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid subject ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const subject = await Subject.findOne({ _id: id, school_id: schoolId });
    if (!subject) return NextResponse.json({ success: false, message: "Subject not found" }, { status: 404 });

    if (role === "teacher") {
      const teacher = await Teacher.findOne({ user_id: userId, school_id: schoolId });
      if (!teacher) {
        return NextResponse.json({ success: false, message: "Teacher record not found" }, { status: 403 });
      }
      const classIdsFromTimetable = await Timetable.find({ teacher_id: teacher._id, school_id: schoolId }).distinct("class_id");
      const teacherClassIds = await Class.find({
        school_id: schoolId,
        $or: [
          { class_teacher_id: teacher._id },
          { _id: { $in: classIdsFromTimetable } }
        ]
      }).distinct("_id");

      const hasAccess = teacherClassIds.map(cid => cid.toString()).includes(subject.class_id.toString());
      if (!hasAccess) {
        return NextResponse.json({ success: false, message: "You are not assigned to this class" }, { status: 403 });
      }
    }

    return NextResponse.json({ success: true, data: subject });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { schoolId, role, userId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid subject ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const subject = await Subject.findOne({ _id: id, school_id: schoolId });
    if (!subject) return NextResponse.json({ success: false, message: "Subject not found" }, { status: 404 });

    const body = await req.json();

    if (role === "teacher") {
      const teacher = await Teacher.findOne({ user_id: userId, school_id: schoolId });
      if (!teacher) {
        return NextResponse.json({ success: false, message: "Teacher record not found" }, { status: 403 });
      }
      const classIdsFromTimetable = await Timetable.find({ teacher_id: teacher._id, school_id: schoolId }).distinct("class_id");
      const teacherClassIds = await Class.find({
        school_id: schoolId,
        $or: [
          { class_teacher_id: teacher._id },
          { _id: { $in: classIdsFromTimetable } }
        ]
      }).distinct("_id");

      // Verify old class has access
      const hasAccessOld = teacherClassIds.map(cid => cid.toString()).includes(subject.class_id.toString());
      if (!hasAccessOld) {
        return NextResponse.json({ success: false, message: "You are not assigned to this class" }, { status: 403 });
      }

      // If updating to a new class_id, verify that one too
      if (body.class_id) {
        const hasAccessNew = teacherClassIds.map(cid => cid.toString()).includes(body.class_id);
        if (!hasAccessNew) {
          return NextResponse.json({ success: false, message: "You are not assigned to the target class" }, { status: 403 });
        }
      }
    }

    // Normalize type field
    if (body.type) {
      body.type = body.type === "Practical" ? "practical" : body.type === "Theory" ? "theory" : body.type;
    }

    const updatedSubject = await Subject.findOneAndUpdate(
      { _id: id, school_id: schoolId },
      { $set: body },
      { new: true, runValidators: true }
    );

    return NextResponse.json({ success: true, data: updatedSubject });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { schoolId, role, userId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: "Invalid subject ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const subject = await Subject.findOne({ _id: id, school_id: schoolId });
    if (!subject) return NextResponse.json({ success: false, message: "Subject not found" }, { status: 404 });

    if (role === "teacher") {
      const teacher = await Teacher.findOne({ user_id: userId, school_id: schoolId });
      if (!teacher) {
        return NextResponse.json({ success: false, message: "Teacher record not found" }, { status: 403 });
      }
      const classIdsFromTimetable = await Timetable.find({ teacher_id: teacher._id, school_id: schoolId }).distinct("class_id");
      const teacherClassIds = await Class.find({
        school_id: schoolId,
        $or: [
          { class_teacher_id: teacher._id },
          { _id: { $in: classIdsFromTimetable } }
        ]
      }).distinct("_id");

      const hasAccess = teacherClassIds.map(cid => cid.toString()).includes(subject.class_id.toString());
      if (!hasAccess) {
        return NextResponse.json({ success: false, message: "You are not assigned to this class" }, { status: 403 });
      }
    }

    const [
      timetables,
      examSchedules,
      results,
      classTests,
      homeworks
    ] = await Promise.all([
      Timetable.countDocuments({ school_id: schoolId, subject_id: id }),
      ExamSchedule.countDocuments({ school_id: schoolId, subject_id: id }),
      Result.countDocuments({ school_id: schoolId, subject_id: id }),
      ClassTest.countDocuments({ school_id: schoolId, subject_id: id }),
      Homework.countDocuments({ school_id: schoolId, subject_id: id })
    ]);

    const reasons: string[] = [];
    if (timetables > 0) reasons.push(`${timetables} Routine Periods (Timetable)`);
    if (examSchedules > 0 || results > 0) reasons.push(`${examSchedules + results} Exam Entries/Schedules`);
    if (classTests > 0) reasons.push(`${classTests} Assessments (Class Tests)`);
    if (homeworks > 0) reasons.push(`${homeworks} Homework Entries`);

    if (reasons.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `This subject cannot be deleted because it is in use by: ${reasons.join(", ")}. Please deactivate or archive it instead.`
        },
        { status: 409 }
      );
    }

    await Subject.deleteOne({ _id: id });
    return NextResponse.json({ success: true, message: "Subject deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
