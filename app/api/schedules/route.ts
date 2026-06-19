import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Timetable, Subject } from "@/lib/models/index";
import Class from "@/lib/models/Class"; // must import to register with Mongoose before populate
import Teacher from "@/lib/models/Teacher";
import Student from "@/lib/models/Student";
import Parent from "@/lib/models/Parent";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

// GET: Fetch all routine/timetable entries for the school, optionally filtered by class
export async function GET(req: NextRequest) {
  const authResult = requireAuth(req, ["school_admin", "teacher", "student", "parent", "super_admin"]);
  if (authResult.error) return authResult.error;
  const { schoolId, user } = authResult;

  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const classId = url.searchParams.get("classId");
    const teacherId = url.searchParams.get("teacherId");
    const academic_year = url.searchParams.get("academic_year");

    const query: any = { school_id: schoolId };
    const andFilters: any[] = [];
    
    if (user.role === "teacher") {
      const teacher = await Teacher.findOne({ user_id: user.user_id, school_id: schoolId });
      if (teacher) {
        const classIdsAsClassTeacher = await mongoose.model("Class").find({ class_teacher_id: teacher._id, school_id: schoolId }).distinct("_id");
        andFilters.push({
          $or: [
            { teacher_id: teacher._id },
            { class_id: { $in: classIdsAsClassTeacher } }
          ]
        });
      } else {
        andFilters.push({ teacher_id: null });
      }
    } else if (user.role === "student") {
      const studentProfile = await Student.findOne({ school_id: schoolId, user_id: user.user_id }).select("class_id").lean();
      if (!studentProfile) {
        return NextResponse.json({ success: true, data: [] });
      }
      const sClassId = typeof studentProfile.class_id === "object" && studentProfile.class_id
        ? studentProfile.class_id._id
        : studentProfile.class_id;

      if (classId) {
        if (classId.toString() !== sClassId.toString()) {
          return NextResponse.json({ success: false, message: "Access denied to class schedules" }, { status: 403 });
        }
        andFilters.push({ class_id: classId });
      } else {
        andFilters.push({ class_id: sClassId });
      }
    } else if (user.role === "parent") {
      const parent = await Parent.findOne({ user_id: user.user_id, school_id: schoolId }).select("_id").lean();
      if (!parent) {
        return NextResponse.json({ success: true, data: [] });
      }
      const children = await Student.find({ school_id: schoolId, parent_id: parent._id }).select("class_id").lean();
      const childClassIds = children.map((c: any) => (c.class_id?._id || c.class_id).toString());

      if (classId) {
        if (!childClassIds.includes(classId.toString())) {
          return NextResponse.json({ success: false, message: "Access denied to class schedules" }, { status: 403 });
        }
        andFilters.push({ class_id: classId });
      } else {
        andFilters.push({ class_id: { $in: childClassIds } });
      }
    }

    // For school_admin/super_admin: apply optional filters
    if (classId && user.role !== "student" && user.role !== "parent") {
      andFilters.push({ class_id: classId });
    }
    if (teacherId) {
      andFilters.push({ teacher_id: teacherId });
    }
    // academic_year intentionally NOT filtered here — timetable records may have been
    // created with different academic_year values and we want all to be visible.


    if (andFilters.length > 0) {
      query.$and = andFilters;
    }

    const schedules = await Timetable.find(query)
      .populate("class_id", "name section")
      .populate("subject_id", "name")
      .populate("teacher_id", "name photo_url")
      .sort({ day: 1, start_time: 1 });

    return NextResponse.json({
      success: true,
      data: schedules,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper: convert "09:30 AM" → minutes since midnight for overlap comparison
function parseTimeToMinutes(t: string): number {
  const match = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let [, h, m, period] = match;
  let hours = parseInt(h, 10);
  const mins = parseInt(m, 10);
  if (period.toUpperCase() === "PM" && hours !== 12) hours += 12;
  if (period.toUpperCase() === "AM" && hours === 12) hours = 0;
  return hours * 60 + mins;
}

// POST: Add a new timetable/routine record
export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();

    const body = await req.json();
    const { classId, subject, teacherId, day, startTime, endTime, room, academicYear = "2026-2027" } = body;

    if (!classId || !subject || !day || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, message: "classId, subject, day, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    // ── Conflict check: same class, same day, overlapping time ──────────────
    const newStart = parseTimeToMinutes(startTime);
    const newEnd   = parseTimeToMinutes(endTime);

    const existingOnDay = await Timetable.find({
      school_id: new mongoose.Types.ObjectId(schoolId as string),
      class_id:  new mongoose.Types.ObjectId(classId),
      day:       day.toLowerCase(),
    }).populate("class_id", "name section");

    for (const entry of existingOnDay) {
      const eStart = parseTimeToMinutes(entry.start_time);
      const eEnd   = parseTimeToMinutes(entry.end_time);
      // Overlap when: newStart < eEnd AND newEnd > eStart
      if (newStart < eEnd && newEnd > eStart) {
        const cls = entry.class_id as any;
        const className = cls?.name ? `${cls.name} - ${cls.section}` : "This class";
        return NextResponse.json(
          {
            success: false,
            message: `${className} already has a schedule on ${day} from ${entry.start_time} to ${entry.end_time} that overlaps with this time slot. Please choose a different time.`,
          },
          { status: 409 }
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const subjectDoc = await Subject.findOneAndUpdate(
      {
        school_id: new mongoose.Types.ObjectId(schoolId as string),
        class_id: new mongoose.Types.ObjectId(classId),
        name: subject.trim(),
      },
      {
        $setOnInsert: {
          school_id: new mongoose.Types.ObjectId(schoolId as string),
          class_id: new mongoose.Types.ObjectId(classId),
          name: subject.trim(),
          type: "both",
          full_marks: 100,
          pass_marks: 33,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Resolve teacher (find first if teacherId not provided)
    let selectedTeacherId = teacherId;
    if (!selectedTeacherId) {
      const fallbackTeacher = await Teacher.findOne({ school_id: schoolId });
      selectedTeacherId = fallbackTeacher?._id.toString() || new mongoose.Types.ObjectId().toString();
    }

    const timetable = await Timetable.create({
      school_id: new mongoose.Types.ObjectId(schoolId as string),
      class_id: new mongoose.Types.ObjectId(classId),
      subject_id: subjectDoc._id,
      teacher_id: new mongoose.Types.ObjectId(selectedTeacherId),
      day: day.toLowerCase(),
      start_time: startTime,
      end_time: endTime,
      room: room || undefined,
      academic_year: academicYear,
    });

    // Populate ref fields to return to frontend
    const populated = await Timetable.findById(timetable._id)
      .populate("class_id", "name section")
      .populate("subject_id", "name")
      .populate("teacher_id", "name photo_url");

    return NextResponse.json({
      success: true,
      data: populated,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
