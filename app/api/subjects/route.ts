import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Subject, Timetable } from "@/lib/models/index";
import Class from "@/lib/models/Class";
import Teacher from "@/lib/models/Teacher";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

// GET: Fetch all subjects for the school
export async function GET(req: NextRequest) {
  const { schoolId, role, userId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const classId = url.searchParams.get("class_id");
    const search = url.searchParams.get("search");
    const academic_year = url.searchParams.get("academic_year");

    // Self-healing sync: Ensure all SubjectAssignment entries exist in Subject collection
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      const { SubjectAssignment } = require("@/lib/models/index");
      const assignments = await SubjectAssignment.find({ school_id: schoolId, class_id: classId })
        .populate("subject_master_id", "name subject_code")
        .lean();

      for (const assign of assignments) {
        const sm = assign.subject_master_id as any;
        if (sm?.name) {
          await Subject.findOneAndUpdate(
            {
              school_id: new mongoose.Types.ObjectId(schoolId as string),
              class_id: new mongoose.Types.ObjectId(classId),
              name: sm.name.trim(),
            },
            {
              $setOnInsert: {
                school_id: new mongoose.Types.ObjectId(schoolId as string),
                class_id: new mongoose.Types.ObjectId(classId),
                name: sm.name.trim(),
                code: sm.subject_code?.trim().toUpperCase(),
                type: "both",
                full_marks: 100,
                pass_marks: 33,
              },
            },
            { upsert: true }
          );
        }
      }
    }

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
    } else {
      if (classId && mongoose.Types.ObjectId.isValid(classId)) {
        query.class_id = classId;
      } else if (yearClassIds !== null) {
        query.class_id = { $in: yearClassIds };
      }
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const subjects = await Subject.find(query)
      .populate("class_id", "name section")
      .sort({ name: 1 })
      .lean();
    return NextResponse.json({ success: true, data: { subjects } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}

// POST: Create a new subject
export async function POST(req: NextRequest) {
  const { schoolId, role, userId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { name, code, type, class_id, full_marks, pass_marks } = body;

    if (!name) {
      return NextResponse.json({ success: false, message: "Subject name is required" }, { status: 400 });
    }

    if (role === "teacher") {
      const teacher = await Teacher.findOne({ user_id: userId, school_id: schoolId }).lean();
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

      const hasAccess = teacherClassIds.map(id => id.toString()).includes(class_id);
      if (!hasAccess) {
        return NextResponse.json({ success: false, message: "You are not assigned to this class" }, { status: 403 });
      }
    }

    if (!class_id || !mongoose.Types.ObjectId.isValid(class_id)) {
      return NextResponse.json({ success: false, message: "Class ID is required and must be valid" }, { status: 400 });
    }

    const effectiveClassId = class_id;

    const subject = await Subject.create({
      school_id: schoolId as string,
      class_id: effectiveClassId,
      name: name.trim(),
      code: code?.trim().toUpperCase(),
      type: type === "Practical" ? "practical" : "theory",
      full_marks: full_marks ? Number(full_marks) : 100,
      pass_marks: pass_marks ? Number(pass_marks) : 33,
    });

    return NextResponse.json({ success: true, data: subject }, { status: 201 });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ success: false, message: "A subject with this name already exists for this class" }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
