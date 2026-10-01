import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Timetable, Subject, Teacher, Student, Parent } from "@/lib/models/index";
import Class from "@/lib/models/Class"; 
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";
import { sendCompressedJson } from "@/lib/compression";


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

// ─── Server-side Cache & In-Flight Dedup ─────────────────────────
const gs = globalThis as any;
if (!gs._schedulesServerCache) gs._schedulesServerCache = new Map<string, { data: any; expiresAt: number }>();
if (!gs._schedulesInFlight) gs._schedulesInFlight = new Map<string, Promise<any>>();
const _schedulesServerCache: Map<string, { data: any; expiresAt: number }> = gs._schedulesServerCache;
const _schedulesInFlight: Map<string, Promise<any>> = gs._schedulesInFlight;
const SCHEDULES_CACHE_TTL = 30_000;

export function invalidateSchedulesCache(schoolId?: string | null) {
  if (!schoolId) {
    _schedulesServerCache.clear();
    return;
  }
  for (const k of Array.from(_schedulesServerCache.keys())) {
    if (k.startsWith(String(schoolId))) _schedulesServerCache.delete(k);
  }
}

// GET: Fetch all routine/timetable entries for the school, optionally filtered by class/teacher/search
export async function GET(req: NextRequest) {
  const authResult = requireAuth(req, ["school_admin", "teacher", "student", "parent", "super_admin"]);
  if (authResult.error) return authResult.error;
  const { schoolId, user } = authResult;

  const url = new URL(req.url);
  const cacheKey = `${schoolId}:${user.role}:${user.user_id}:${url.searchParams.toString()}`;
  const cached = _schedulesServerCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return sendCompressedJson(req, cached.data, { cacheControl: "private, max-age=15, stale-while-revalidate=30" });
  }

  if (_schedulesInFlight.has(cacheKey)) {
    try {
      const data = await _schedulesInFlight.get(cacheKey)!;
      return sendCompressedJson(req, data, { cacheControl: "private, max-age=15, stale-while-revalidate=30" });
    } catch {}
  }

  const queryPromise = (async () => {
    await connectToDatabase();
    const classId = url.searchParams.get("classId") || url.searchParams.get("class_id") || "";
    const teacherId = url.searchParams.get("teacherId") || url.searchParams.get("teacher_id") || "";
    const academic_year = url.searchParams.get("academic_year") || url.searchParams.get("academicYear") || "";
    const day = url.searchParams.get("day") || "";
    const status = url.searchParams.get("status") || "";
    const search = (url.searchParams.get("search") || "").trim();

    const query: any = { school_id: new mongoose.Types.ObjectId(schoolId!) };
    const andFilters: any[] = [];

    // Role Security Visibility Restrictions
    if (user.role === "teacher") {
      const teacher = await Teacher.findOne({ user_id: user.user_id, school_id: schoolId! }).lean();
      if (teacher) {
        // Teachers see only their own timetable sessions
        andFilters.push({ teacher_id: teacher._id });
      } else {
        return NextResponse.json({ success: true, data: [] });
      }
    } else if (user.role === "student") {
      const studentProfile = await Student.findOne({ school_id: schoolId!, user_id: user.user_id }).select("class_id").lean();
      if (!studentProfile) {
        return NextResponse.json({ success: true, data: [] });
      }
      andFilters.push({ class_id: studentProfile.class_id });
    } else if (user.role === "parent") {
      const parent = await Parent.findOne({ user_id: user.user_id, school_id: schoolId! }).select("_id").lean();
      if (!parent) {
        return NextResponse.json({ success: true, data: [] });
      }
      const children = await Student.find({ school_id: schoolId!, parent_id: parent._id }).select("class_id").lean();
      const childClassIds = children.map((c: any) => c.class_id);
      andFilters.push({ class_id: { $in: childClassIds } });
    }

    // Apply filters
    if (academic_year) {
      andFilters.push({ academic_year });
    }
    if (day) {
      andFilters.push({ day: day.toLowerCase() });
    }
    if (classId && mongoose.Types.ObjectId.isValid(classId) && user.role !== "student" && user.role !== "parent") {
      andFilters.push({ class_id: new mongoose.Types.ObjectId(classId) });
    }
    if (teacherId && mongoose.Types.ObjectId.isValid(teacherId) && user.role !== "teacher") {
      andFilters.push({ teacher_id: new mongoose.Types.ObjectId(teacherId) });
    }
    if (status && status !== "all") {
      andFilters.push({ status });
    }

    if (andFilters.length > 0) {
      query.$and = andFilters;
    }

    let formattedSchedules: any[] = [];

    if (!search) {
      const docs = await Timetable.find(query)
        .populate("class_id", "name section")
        .populate("subject_id", "name")
        .populate("teacher_id", "name photo_url")
        .lean();

      formattedSchedules = docs.map((s: any) => ({
        _id: String(s._id),
        school_id: String(s.school_id),
        class_id: s.class_id && typeof s.class_id === "object" ? { _id: String(s.class_id._id), name: s.class_id.name, section: s.class_id.section } : String(s.class_id),
        subject_id: s.subject_id && typeof s.subject_id === "object" ? { _id: String(s.subject_id._id), name: s.subject_id.name } : String(s.subject_id),
        teacher_id: s.teacher_id && typeof s.teacher_id === "object" ? { _id: String(s.teacher_id._id), name: s.teacher_id.name, photo_url: s.teacher_id.photo_url } : String(s.teacher_id),
        day: s.day,
        start_time: s.start_time,
        end_time: s.end_time,
        period_no: s.period_no,
        room: s.room || "",
        academic_year: s.academic_year || "",
        status: s.status || "Active",
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      }));
    } else {
      // Lookup & Aggregation to support deep population and search matches
      const searchRegex = new RegExp(search, "i");
      const pipeline: any[] = [
        { $match: query },
        {
          $lookup: {
            from: "classes",
            localField: "class_id",
            foreignField: "_id",
            as: "class_info"
          }
        },
        { $unwind: { path: "$class_info", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "subjects",
            localField: "subject_id",
            foreignField: "_id",
            as: "subject_info"
          }
        },
        { $unwind: { path: "$subject_info", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "teachers",
            localField: "teacher_id",
            foreignField: "_id",
            as: "teacher_info"
          }
        },
        { $unwind: { path: "$teacher_info", preserveNullAndEmptyArrays: true } },
        {
          $match: {
            $or: [
              { "class_info.name": searchRegex },
              { "class_info.section": searchRegex },
              { "subject_info.name": searchRegex },
              { "teacher_info.name": searchRegex },
              { day: searchRegex }
            ]
          }
        }
      ];

      const rawSchedules = await Timetable.aggregate(pipeline);

      formattedSchedules = rawSchedules.map((s: any) => ({
        _id: String(s._id),
        school_id: String(s.school_id),
        class_id: s.class_info ? { _id: String(s.class_info._id), name: s.class_info.name, section: s.class_info.section } : String(s.class_id),
        subject_id: s.subject_info ? { _id: String(s.subject_info._id), name: s.subject_info.name } : String(s.subject_id),
        teacher_id: s.teacher_info ? { _id: String(s.teacher_info._id), name: s.teacher_info.name, photo_url: s.teacher_info.photo_url } : String(s.teacher_id),
        day: s.day,
        start_time: s.start_time,
        end_time: s.end_time,
        period_no: s.period_no,
        room: s.room || "",
        academic_year: s.academic_year || "",
        status: s.status || "Active",
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      }));
    }

    // Sort by day order and start time
    const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    formattedSchedules.sort((a, b) => {
      const dayA = dayOrder.indexOf(a.day.toLowerCase());
      const dayB = dayOrder.indexOf(b.day.toLowerCase());
      if (dayA !== dayB) return dayA - dayB;
      return parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time);
    });

    const responsePayload = { success: true, data: formattedSchedules };
    _schedulesServerCache.set(cacheKey, { data: responsePayload, expiresAt: Date.now() + SCHEDULES_CACHE_TTL });
    return responsePayload;
  })();

  _schedulesInFlight.set(cacheKey, queryPromise);

  try {
    const responsePayload = await queryPromise;
    return sendCompressedJson(
      req,
      responsePayload,
      { cacheControl: "private, max-age=15, stale-while-revalidate=30" }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  } finally {
    _schedulesInFlight.delete(cacheKey);
  }
}

// POST: Add a new timetable/routine record with overlap conflict checks
export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { classId, subject, teacherId, day, startTime, endTime, room, academicYear = "2026-2027", periodNo } = body;

    if (!classId || !subject || !day || !startTime || !endTime) {
      return NextResponse.json({ success: false, message: "Class, Subject, Day, Start Time, and End Time are required." }, { status: 400 });
    }

    const newStart = parseTimeToMinutes(startTime);
    const newEnd = parseTimeToMinutes(endTime);

    if (newStart >= newEnd) {
      return NextResponse.json({ success: false, message: "End Time must be after Start Time." }, { status: 400 });
    }

    const queryDay = day.toLowerCase();

    // 1. Conflict Check: Class & Section Overlap
    const classConflicts = await Timetable.find({
      school_id: new mongoose.Types.ObjectId(schoolId!),
      class_id: new mongoose.Types.ObjectId(classId),
      day: queryDay
    }).populate("class_id", "name section").lean();

    for (const entry of classConflicts) {
      const eStart = parseTimeToMinutes(entry.start_time);
      const eEnd = parseTimeToMinutes(entry.end_time);
      if (newStart < eEnd && newEnd > eStart) {
        const cls = entry.class_id as any;
        const classLabel = cls ? `${cls.name} - ${cls.section}` : "This class";
        return NextResponse.json({
          success: false,
          message: `${classLabel} already has another period scheduled on ${day} from ${entry.start_time} to ${entry.end_time}.`
        }, { status: 409 });
      }
    }

    // 2. Conflict Check: Teacher Double-booking
    if (teacherId && mongoose.Types.ObjectId.isValid(teacherId)) {
      const teacherConflicts = await Timetable.find({
        school_id: new mongoose.Types.ObjectId(schoolId!),
        teacher_id: new mongoose.Types.ObjectId(teacherId),
        day: queryDay
      }).populate("class_id", "name section").lean();

      for (const entry of teacherConflicts) {
        const eStart = parseTimeToMinutes(entry.start_time);
        const eEnd = parseTimeToMinutes(entry.end_time);
        if (newStart < eEnd && newEnd > eStart) {
          const cls = entry.class_id as any;
          const classLabel = cls ? `${cls.name} - ${cls.section}` : "another class";
          return NextResponse.json({
            success: false,
            message: `Teacher is already scheduled to teach ${classLabel} on ${day} from ${entry.start_time} to ${entry.end_time}.`
          }, { status: 409 });
        }
      }
    }

    // 3. Conflict Check: Room booking overlap
    if (room && room.trim()) {
      const roomConflicts = await Timetable.find({
        school_id: new mongoose.Types.ObjectId(schoolId!),
        room: room.trim(),
        day: queryDay
      }).populate("class_id", "name section").lean();

      for (const entry of roomConflicts) {
        const eStart = parseTimeToMinutes(entry.start_time);
        const eEnd = parseTimeToMinutes(entry.end_time);
        if (newStart < eEnd && newEnd > eStart) {
          const cls = entry.class_id as any;
          const classLabel = cls ? `${cls.name} - ${cls.section}` : "another class";
          return NextResponse.json({
            success: false,
            message: `Room ${room} is already booked by ${classLabel} on ${day} from ${entry.start_time} to ${entry.end_time}.`
          }, { status: 409 });
        }
      }
    }

    // Resolve or upsert subject document scoped to this class
    const subjectDoc = await Subject.findOneAndUpdate(
      {
        school_id: new mongoose.Types.ObjectId(schoolId!),
        class_id: new mongoose.Types.ObjectId(classId),
        name: subject.trim(),
      },
      {
        $setOnInsert: {
          school_id: new mongoose.Types.ObjectId(schoolId!),
          class_id: new mongoose.Types.ObjectId(classId),
          name: subject.trim(),
          type: "both",
          full_marks: 100,
          pass_marks: 33,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Resolve teacher ID fallback
    let finalTeacherId = teacherId;
    if (!finalTeacherId) {
      const fallback = await Teacher.findOne({ school_id: schoolId! }).lean();
      finalTeacherId = fallback?._id.toString() || new mongoose.Types.ObjectId().toString();
    }

    const timetable = await Timetable.create({
      school_id: new mongoose.Types.ObjectId(schoolId!),
      class_id: new mongoose.Types.ObjectId(classId),
      subject_id: subjectDoc._id,
      teacher_id: new mongoose.Types.ObjectId(finalTeacherId),
      day: queryDay,
      start_time: startTime,
      end_time: endTime,
      period_no: periodNo ? parseInt(periodNo, 10) : undefined,
      room: room || undefined,
      academic_year: academicYear,
      status: "Active"
    });

    const populated = await Timetable.findById(timetable._id)
      .populate("class_id", "name section")
      .populate("subject_id", "name")
      .populate("teacher_id", "name photo_url");

    invalidateSchedulesCache(schoolId);

    return NextResponse.json({
      success: true,
      data: populated,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal server error" }, { status: 500 });
  }
}
