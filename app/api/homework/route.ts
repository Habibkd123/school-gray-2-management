import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Homework, Subject, Timetable } from "@/lib/models/index";
import Class from "@/lib/models/Class";
import Teacher from "@/lib/models/Teacher";
import Student from "@/lib/models/Student";
import Parent from "@/lib/models/Parent";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";
import { paginateQuery } from "@/lib/utils/pagination";

// GET: Fetch homeworks for the logged-in user's school
export async function GET(req: NextRequest) {
  const { schoolId, role, userId, error } = requireAuth(req, ["school_admin", "teacher", "student", "parent", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const classId = url.searchParams.get("classId");
    const academic_year = url.searchParams.get("academic_year");

    const query: any = { school_id: schoolId };

    // Resolve class IDs for the selected academic year
    let yearClassIds: any[] | null = null;
    if (academic_year) {
      const yearClasses = await Class.find({ school_id: schoolId, academic_year }).select("_id").lean();
      yearClassIds = yearClasses.map((c: any) => c._id);
    }

    if (role === "teacher") {
      const teacher = await Teacher.findOne({ user_id: userId, school_id: schoolId }).lean();
      if (teacher) {
        const classIdsFromTimetable = await Timetable.find({ teacher_id: teacher._id, school_id: schoolId }).distinct("class_id");
        let teacherClassIds = await Class.find({
          school_id: schoolId,
          $or: [
            { class_teacher_id: teacher._id },
            { _id: { $in: classIdsFromTimetable } }
          ]
        }).distinct("_id");

        // Intersect with year-filtered class IDs if academic_year was provided
        if (yearClassIds !== null) {
          const yearSet = new Set(yearClassIds.map((id: any) => id.toString()));
          teacherClassIds = teacherClassIds.filter((id: any) => yearSet.has(id.toString()));
        }

        if (classId) {
          if (teacherClassIds.map((id: any) => id.toString()).includes(classId)) {
            query.class_id = classId;
          } else {
            query.class_id = null; // No access
          }
        } else {
          query.class_id = { $in: teacherClassIds };
        }
      } else {
        query.class_id = null;
      }
    } else if (role === "student") {
      const studentProfile = await Student.findOne({ school_id: schoolId, user_id: userId }).select("class_id").lean();
      if (!studentProfile) {
        return NextResponse.json({ success: true, data: [] });
      }
      const sClassId = typeof studentProfile.class_id === "object" && studentProfile.class_id
        ? studentProfile.class_id._id
        : studentProfile.class_id;

      if (classId) {
        if (classId.toString() !== sClassId.toString()) {
          return NextResponse.json({ success: false, message: "Access denied to class homework" }, { status: 403 });
        }
        query.class_id = classId;
      } else {
        query.class_id = sClassId;
      }
    } else if (role === "parent") {
      const parent = await Parent.findOne({ user_id: userId, school_id: schoolId }).select("_id").lean();
      if (!parent) {
        return NextResponse.json({ success: true, data: [] });
      }
      const children = await Student.find({ school_id: schoolId, parent_id: parent._id }).select("class_id").lean();
      const childClassIds = children.map((c: any) => (c.class_id?._id || c.class_id).toString());

      if (classId) {
        if (!childClassIds.includes(classId.toString())) {
          return NextResponse.json({ success: false, message: "Access denied to class homework" }, { status: 403 });
        }
        query.class_id = classId;
      } else {
        query.class_id = { $in: childClassIds };
      }
    } else {
      if (classId) {
        query.class_id = classId;
      } else if (yearClassIds !== null) {
        query.class_id = { $in: yearClassIds };
      }
    }

    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "25"));

    const { items: homeworks, total, totalPages } = await paginateQuery(
      Homework,
      query,
      {
        page,
        limit,
        sort: { createdAt: -1 },
        populate: [
          { path: "class_id", select: "name section" },
          { path: "subject_id", select: "name" },
          { path: "teacher_id", select: "name" }
        ]
      }
    );

    return NextResponse.json({
      success: true,
      data: { homeworks, total, page, totalPages, limit },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create a new homework assignment
export async function POST(req: NextRequest) {
  const { schoolId, userId, role, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();

    const body = await req.json();
    const { title, description, classId, subject, dueDate, attachmentUrl, status } = body;

    if (!title || !classId || !subject || !dueDate) {
      return NextResponse.json(
        { success: false, message: "Title, classId, subject, and dueDate are required" },
        { status: 400 }
      );
    }

    // Resolve teacher
    let teacherId = null;
    if (role === "teacher") {
      const teacher = await Teacher.findOne({ user_id: userId, school_id: schoolId }).lean();
      if (!teacher) {
        return NextResponse.json({ success: false, message: "Teacher record not found" }, { status: 403 });
      }
      teacherId = teacher._id;

      // Verify that classId belongs to teacher's assigned classes
      const classIdsFromTimetable = await Timetable.find({ teacher_id: teacher._id, school_id: schoolId }).distinct("class_id");
      const teacherClassIds = await Class.find({
        school_id: schoolId,
        $or: [
          { class_teacher_id: teacher._id },
          { _id: { $in: classIdsFromTimetable } }
        ]
      }).distinct("_id");

      const hasAccess = teacherClassIds.map(id => id.toString()).includes(classId);
      if (!hasAccess) {
        return NextResponse.json({ success: false, message: "You are not assigned to this class" }, { status: 403 });
      }
    }

    if (!teacherId) {
      const fallbackTeacher = await Teacher.findOne({ school_id: schoolId }).lean();
      teacherId = fallbackTeacher?._id || new mongoose.Types.ObjectId();
    }

    // Resolve or create subject
    let subjectDoc = await Subject.findOne({
      school_id: new mongoose.Types.ObjectId(schoolId as string),
      name: new RegExp(`^${subject.trim()}$`, "i"),
    }).lean();

    if (!subjectDoc) {
      subjectDoc = await Subject.create({
        school_id: new mongoose.Types.ObjectId(schoolId as string),
        class_id: new mongoose.Types.ObjectId(classId),
        name: subject.trim(),
        type: "theory",
        full_marks: 100,
        pass_marks: 33,
      });
    }

    const homework = await Homework.create({
      school_id: new mongoose.Types.ObjectId(schoolId as string),
      class_id: new mongoose.Types.ObjectId(classId),
      subject_id: subjectDoc._id,
      teacher_id: teacherId,
      title: title.trim(),
      description: description?.trim(),
      due_date: new Date(dueDate),
      attachment_url: attachmentUrl?.trim() || null,
      status: status || "published",
      submissions: [],
    });

    return NextResponse.json({
      success: true,
      data: homework,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
