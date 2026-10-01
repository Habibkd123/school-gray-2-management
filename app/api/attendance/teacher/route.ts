import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Attendance } from "@/lib/models/index";
import Teacher from "@/lib/models/Teacher";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";
import { sendCompressedJson } from "@/lib/compression";

// Server cache & in-flight deduplication
const _teacherAttServerCache = new Map<string, { data: any; expiresAt: number }>();
const _teacherAttInFlight = new Map<string, Promise<any>>();
const TEACHER_ATT_CACHE_TTL = 30_000;

export function invalidateTeacherAttendanceCache(schoolId?: string | null) {
  if (schoolId) {
    for (const key of _teacherAttServerCache.keys()) {
      if (key.startsWith(`att_teacher_${schoolId}`)) {
        _teacherAttServerCache.delete(key);
      }
    }
  } else {
    _teacherAttServerCache.clear();
  }
}

export async function GET(req: NextRequest) {
  const { schoolId, role, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  const url = new URL(req.url);
  const academic_year = url.searchParams.get("academic_year");
  const dateParam = url.searchParams.get("date"); // YYYY-MM-DD

  if (!academic_year || !dateParam) {
    return NextResponse.json(
      { success: false, message: "academic_year and date are required" },
      { status: 400 }
    );
  }

  const cacheKey = `att_teacher_${schoolId}_${academic_year}_${dateParam}`;

  const cached = _teacherAttServerCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return sendCompressedJson(req, cached.data, {
      cacheControl: "private, max-age=15, stale-while-revalidate=30",
    });
  }

  const existingInFlight = _teacherAttInFlight.get(cacheKey);
  if (existingInFlight) {
    try {
      const payload = await existingInFlight;
      return sendCompressedJson(req, payload, {
        cacheControl: "private, max-age=15, stale-while-revalidate=30",
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }

  const queryPromise = (async () => {
    await connectToDatabase();

    const startOfDay = new Date(dateParam);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(dateParam);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const query: any = {
      school_id: schoolId as string,
      academic_year,
      date: { $gte: startOfDay, $lte: endOfDay },
      type: "teacher",
    };

    const [attendanceRecord, activeTeachers] = await Promise.all([
      Attendance.findOne(query).populate("records.teacher_id", "name employee_id photo_url designation department is_active"),
      Teacher.find({ school_id: schoolId, is_active: true }).lean()
    ]);

    const recordsMap = new Map();
    if (attendanceRecord && attendanceRecord.records) {
      attendanceRecord.records.forEach((r: any) => {
        const tId = r.teacher_id?._id?.toString() || r.teacher_id?.toString();
        if (tId) {
          recordsMap.set(tId, r);
        }
      });
    }

    const mergedRecords = activeTeachers.map((t: any) => {
      const saved = recordsMap.get(t._id.toString());
      return {
        teacher_id: {
          _id: t._id,
          name: t.name,
          employee_id: t.employee_id,
          photo_url: t.photo_url,
          designation: t.designation || "Teacher",
          department: t.department || "Academic"
        },
        status: saved ? saved.status : "present",
        note: saved ? saved.note : "",
        check_in: saved ? saved.check_in : null,
        check_out: saved ? saved.check_out : null,
        working_hours: saved ? saved.working_hours : null,
        late_minutes: saved ? saved.late_minutes : null,
      };
    });

    const responsePayload = {
      success: true,
      data: {
        _id: attendanceRecord?._id || null,
        date: startOfDay,
        records: mergedRecords,
      },
    };

    _teacherAttServerCache.set(cacheKey, { data: responsePayload, expiresAt: Date.now() + TEACHER_ATT_CACHE_TTL });
    return responsePayload;
  })();

  _teacherAttInFlight.set(cacheKey, queryPromise);

  try {
    const payload = await queryPromise;
    return sendCompressedJson(req, payload, {
      cacheControl: "private, max-age=15, stale-while-revalidate=30",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal server error" }, { status: 500 });
  } finally {
    _teacherAttInFlight.delete(cacheKey);
  }
}

export async function POST(req: NextRequest) {
  const { schoolId, userId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();

    const body = await req.json();
    const { academic_year, date, records } = body;

    if (!academic_year || !date || !records) {
      return NextResponse.json(
        { success: false, message: "academic_year, date, and records are required" },
        { status: 400 }
      );
    }

    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const filter: any = {
      school_id: new mongoose.Types.ObjectId(schoolId as string),
      academic_year,
      date: { $gte: startOfDay, $lte: endOfDay },
      type: "teacher",
    };

    const formattedRecords = records.map((r: any) => ({
      teacher_id: new mongoose.Types.ObjectId(r.teacher_id),
      status: r.status.toLowerCase(),
      note: r.note || null,
      check_in: r.check_in || null,
      check_out: r.check_out || null,
      working_hours: r.working_hours !== undefined && r.working_hours !== null ? Number(r.working_hours) : null,
      late_minutes: r.late_minutes !== undefined && r.late_minutes !== null ? Number(r.late_minutes) : null,
    }));

    const update: any = {
      $set: {
        marked_by: new mongoose.Types.ObjectId(userId as string),
        records: formattedRecords,
      },
      $setOnInsert: {
        school_id: new mongoose.Types.ObjectId(schoolId as string),
        academic_year,
        date: startOfDay,
        type: "teacher",
      }
    };

    const attendanceRecord = await Attendance.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      runValidators: true,
    });

    invalidateTeacherAttendanceCache(schoolId);

    return NextResponse.json({
      success: true,
      message: "Teacher attendance saved successfully",
      data: attendanceRecord,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal server error" }, { status: 500 });
  }
}
