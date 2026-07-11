import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Stream from "@/lib/models/Stream";
import { requireAuth } from "@/lib/utils/auth";
import {
  Class,
  Student,
  TeacherAssignment,
  SubjectAssignment,
  Attendance,
  ClassGroup,
  SubjectMaster
} from "@/lib/models/index";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "accountant", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const stream = await Stream.findOne({ _id: id, school_id: schoolId }).lean();
    if (!stream) return NextResponse.json({ success: false, message: "Stream not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: stream });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const { name, status } = await req.json();
    const update: any = {};
    if (name?.trim()) update.name = name.trim();
    if (status) update.status = status;

    const stream = await Stream.findOneAndUpdate(
      { _id: id, school_id: schoolId },
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!stream) return NextResponse.json({ success: false, message: "Stream not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: stream });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ success: false, message: "A stream with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();

    const stream = await Stream.findOne({ _id: id, school_id: schoolId });
    if (!stream) return NextResponse.json({ success: false, message: "Stream not found" }, { status: 404 });

    const matchedClasses = await Class.find({
      school_id: schoolId,
      name: { $regex: stream.name, $options: "i" }
    }).select("_id").lean();
    const matchedClassIds = matchedClasses.map(c => c._id);

    const [
      classesCount,
      studentsCount,
      teacherAssignments,
      subjectAssignments,
      attendanceRecords,
      classGroups,
      subjectMasters
    ] = await Promise.all([
      Class.countDocuments({ school_id: schoolId, name: { $regex: stream.name, $options: "i" } }),
      Student.countDocuments({ school_id: schoolId, class_id: { $in: matchedClassIds } }),
      TeacherAssignment.countDocuments({ school_id: schoolId, stream_id: id, is_deleted: false }),
      SubjectAssignment.countDocuments({ school_id: schoolId, stream_id: id }),
      Attendance.countDocuments({ school_id: schoolId, stream_id: id }),
      ClassGroup.countDocuments({ school_id: schoolId, "classes.stream_id": id }),
      SubjectMaster.countDocuments({ school_id: schoolId, allowed_streams: id })
    ]);

    const reasons: string[] = [];
    if (classesCount > 0) reasons.push(`${classesCount} Classes`);
    if (studentsCount > 0) reasons.push(`${studentsCount} Students`);
    if (teacherAssignments > 0) reasons.push(`${teacherAssignments} Teacher Assignments`);
    if (subjectAssignments > 0) reasons.push(`${subjectAssignments} Subject Assignments`);
    if (attendanceRecords > 0) reasons.push(`${attendanceRecords} Attendance Records`);
    if (classGroups > 0) reasons.push(`${classGroups} Class Groups`);
    if (subjectMasters > 0) reasons.push(`${subjectMasters} Subjects Catalog mappings`);

    if (reasons.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `This stream cannot be deleted because it is in use by: ${reasons.join(", ")}. Please deactivate or archive it instead.`
        },
        { status: 409 }
      );
    }

    await Stream.deleteOne({ _id: id });
    return NextResponse.json({ success: true, message: "Stream deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
