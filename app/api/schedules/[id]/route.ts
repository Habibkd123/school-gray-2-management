import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Timetable, Subject } from "@/lib/models/index";
import Class from "@/lib/models/Class"; // register model for populate
import Teacher from "@/lib/models/Teacher"; // register model for populate
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

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


type RouteParams = { params: Promise<{ id: string }> };

// PUT: Update schedule/timetable item
export async function PUT(
  req: NextRequest,
  { params }: RouteParams
) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  const { id } = await params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid schedule ID" }, { status: 400 });
    }

    await connectToDatabase();

    const timetable = await Timetable.findOne({ _id: id, school_id: schoolId as string });
    if (!timetable) {
      return NextResponse.json({ success: false, message: "Schedule not found" }, { status: 404 });
    }

    const body = await req.json();
    const { classId, subject, teacherId, day, startTime, endTime, room, academicYear } = body;

    if (classId) timetable.class_id = new mongoose.Types.ObjectId(classId);
    if (day) timetable.day = day.toLowerCase();
    if (startTime) timetable.start_time = startTime;
    if (endTime) timetable.end_time = endTime;
    if (room !== undefined) timetable.room = room;
    if (academicYear) timetable.academic_year = academicYear;
    if (teacherId) timetable.teacher_id = new mongoose.Types.ObjectId(teacherId);

    // ── Conflict check: same class+day, overlapping time, excluding self ─────
    const checkStart = parseTimeToMinutes(timetable.start_time);
    const checkEnd   = parseTimeToMinutes(timetable.end_time);
    const checkDay   = timetable.day;
    const checkClassId = timetable.class_id;

    const conflicts = await Timetable.find({
      school_id: new mongoose.Types.ObjectId(schoolId as string),
      class_id: checkClassId,
      day: checkDay,
      _id: { $ne: new mongoose.Types.ObjectId(id) }, // exclude self
    }).populate("class_id", "name section");

    for (const entry of conflicts) {
      const eStart = parseTimeToMinutes(entry.start_time);
      const eEnd   = parseTimeToMinutes(entry.end_time);
      if (checkStart < eEnd && checkEnd > eStart) {
        const cls = entry.class_id as any;
        const className = cls?.name ? `${cls.name} - ${cls.section}` : "This class";
        return NextResponse.json(
          {
            success: false,
            message: `${className} already has a schedule on ${checkDay} from ${entry.start_time} to ${entry.end_time} that overlaps with this time slot. Please choose a different time.`,
          },
          { status: 409 }
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    if (subject) {
      const subjectDoc = await Subject.findOneAndUpdate(
        {
          school_id: new mongoose.Types.ObjectId(schoolId as string),
          class_id: timetable.class_id,
          name: subject.trim(),
        },
        {
          $setOnInsert: {
            school_id: new mongoose.Types.ObjectId(schoolId as string),
            class_id: timetable.class_id,
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
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a schedule/timetable item
export async function DELETE(
  req: NextRequest,
  { params }: RouteParams
) {
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
      school_id: schoolId as string,
    });

    if (!timetable) {
      return NextResponse.json({ success: false, message: "Schedule not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Schedule deleted successfully",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
