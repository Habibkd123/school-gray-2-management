import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Timetable, Subject, Teacher } from "@/lib/models/index";
import Class from "@/lib/models/Class"; 
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

// Helper: convert time string "09:30 AM" or "13:30" → minutes since midnight
function parseTimeToMinutes(t: string): number {
  if (!t) return 0;
  const cleaned = t.trim().toLowerCase();
  
  // AM/PM Format check
  const ampmMatch = cleaned.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (ampmMatch) {
    let [, h, m, period] = ampmMatch;
    let hours = parseInt(h, 10);
    const mins = parseInt(m, 10);
    if (period === "pm" && hours !== 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;
    return hours * 60 + mins;
  }
  
  // 24-Hour Format check
  const standardMatch = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (standardMatch) {
    const hours = parseInt(standardMatch[1], 10);
    const mins = parseInt(standardMatch[2], 10);
    return hours * 60 + mins;
  }
  
  return 0;
}

type RouteParams = { params: Promise<{ id: string }> };

// PUT: Update timetable item, with overlap checks (excluding self)
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  const { id } = await params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid schedule ID" }, { status: 400 });
    }

    await connectToDatabase();

    const timetable = await Timetable.findOne({ _id: id, school_id: schoolId! });
    if (!timetable) {
      return NextResponse.json({ success: false, message: "Schedule not found" }, { status: 404 });
    }

    const body = await req.json();
    const { classId, subject, teacherId, day, startTime, endTime, room, academicYear, periodNo, status } = body;

    if (classId) timetable.class_id = new mongoose.Types.ObjectId(classId);
    if (day) timetable.day = day.toLowerCase();
    if (startTime) timetable.start_time = startTime;
    if (endTime) timetable.end_time = endTime;
    if (room !== undefined) timetable.room = room;
    if (academicYear) timetable.academic_year = academicYear;
    if (teacherId) timetable.teacher_id = new mongoose.Types.ObjectId(teacherId);
    if (status) timetable.status = status;
    if (periodNo !== undefined) {
      timetable.period_no = periodNo ? parseInt(periodNo.toString(), 10) : undefined;
    }

    const newStart = parseTimeToMinutes(timetable.start_time);
    const newEnd = parseTimeToMinutes(timetable.end_time);

    if (newStart >= newEnd) {
      return NextResponse.json({ success: false, message: "End Time must be after Start Time." }, { status: 400 });
    }

    const queryDay = timetable.day;
    const queryClassId = timetable.class_id;

    // 1. Conflict Check: Class & Section overlap (excluding self)
    const classConflicts = await Timetable.find({
      school_id: new mongoose.Types.ObjectId(schoolId!),
      class_id: queryClassId,
      day: queryDay,
      _id: { $ne: timetable._id }
    }).populate("class_id", "name section").lean();

    for (const entry of classConflicts) {
      const eStart = parseTimeToMinutes(entry.start_time);
      const eEnd = parseTimeToMinutes(entry.end_time);
      if (newStart < eEnd && newEnd > eStart) {
        const cls = entry.class_id as any;
        const classLabel = cls ? `${cls.name} - ${cls.section}` : "This class";
        return NextResponse.json({
          success: false,
          message: `${classLabel} already has another period scheduled on ${day || timetable.day} from ${entry.start_time} to ${entry.end_time}.`
        }, { status: 409 });
      }
    }

    // 2. Conflict Check: Teacher double-booking (excluding self)
    if (timetable.teacher_id) {
      const teacherConflicts = await Timetable.find({
        school_id: new mongoose.Types.ObjectId(schoolId!),
        teacher_id: timetable.teacher_id,
        day: queryDay,
        _id: { $ne: timetable._id }
      }).populate("class_id", "name section").lean();

      for (const entry of teacherConflicts) {
        const eStart = parseTimeToMinutes(entry.start_time);
        const eEnd = parseTimeToMinutes(entry.end_time);
        if (newStart < eEnd && newEnd > eStart) {
          const cls = entry.class_id as any;
          const classLabel = cls ? `${cls.name} - ${cls.section}` : "another class";
          return NextResponse.json({
            success: false,
            message: `Teacher is already scheduled to teach ${classLabel} on ${day || timetable.day} from ${entry.start_time} to ${entry.end_time}.`
          }, { status: 409 });
        }
      }
    }

    // 3. Conflict Check: Room booking overlap (excluding self)
    if (timetable.room && timetable.room.trim()) {
      const roomConflicts = await Timetable.find({
        school_id: new mongoose.Types.ObjectId(schoolId!),
        room: timetable.room.trim(),
        day: queryDay,
        _id: { $ne: timetable._id }
      }).populate("class_id", "name section").lean();

      for (const entry of roomConflicts) {
        const eStart = parseTimeToMinutes(entry.start_time);
        const eEnd = parseTimeToMinutes(entry.end_time);
        if (newStart < eEnd && newEnd > eStart) {
          const cls = entry.class_id as any;
          const classLabel = cls ? `${cls.name} - ${cls.section}` : "another class";
          return NextResponse.json({
            success: false,
            message: `Room ${timetable.room} is already booked by ${classLabel} on ${day || timetable.day} from ${entry.start_time} to ${entry.end_time}.`
          }, { status: 409 });
        }
      }
    }

    // Resolve or update subject document
    if (subject) {
      const subjectDoc = await Subject.findOneAndUpdate(
        {
          school_id: new mongoose.Types.ObjectId(schoolId!),
          class_id: queryClassId,
          name: subject.trim(),
        },
        {
          $setOnInsert: {
            school_id: new mongoose.Types.ObjectId(schoolId!),
            class_id: queryClassId,
            name: subject.trim(),
            type: "both",
            full_marks: 100,
            pass_marks: 33,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      timetable.subject_id = subjectDoc._id;
    }

    await timetable.save();

    const populated = await Timetable.findById(timetable._id)
      .populate("class_id", "name section")
      .populate("subject_id", "name")
      .populate("teacher_id", "name photo_url");

    return NextResponse.json({
      success: true,
      message: "Schedule updated successfully",
      data: populated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE: Delete a schedule item
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  const { id } = await params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid schedule ID" }, { status: 400 });
    }

    await connectToDatabase();

    const timetable = await Timetable.findOneAndDelete({
      _id: id,
      school_id: schoolId!,
    });

    if (!timetable) {
      return NextResponse.json({ success: false, message: "Schedule not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Schedule deleted successfully",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal server error" }, { status: 500 });
  }
}
