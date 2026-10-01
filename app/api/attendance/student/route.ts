import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Attendance, Timetable, Student, TeacherAssignment } from "@/lib/models/index";
import Class from "@/lib/models/Class";
import Teacher from "@/lib/models/Teacher";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/utils/auth";
import { sendCompressedJson } from "@/lib/compression";
import mongoose from "mongoose";

// In-memory cache for class student counts and attendance results
const studentCountsCache = new Map<string, { counts: Record<string, number>; expiresAt: number }>();
const _studentAttServerCache = new Map<string, { data: any; expiresAt: number }>();
const _studentAttInFlight = new Map<string, Promise<any>>();
const ATTENDANCE_CACHE_TTL = 30_000;
const COUNTS_CACHE_TTL_MS = 3 * 60 * 1000;

export function invalidateStudentAttendanceCache(schoolId?: string | null) {
  if (schoolId) {
    for (const key of _studentAttServerCache.keys()) {
      if (key.startsWith(`att_student_${schoolId}`)) {
        _studentAttServerCache.delete(key);
      }
    }
    for (const key of studentCountsCache.keys()) {
      if (key.startsWith(schoolId)) {
        studentCountsCache.delete(key);
      }
    }
  } else {
    _studentAttServerCache.clear();
    studentCountsCache.clear();
  }
}

export async function GET(req: NextRequest) {
  const { schoolId, userId, role, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  const url = new URL(req.url);
  const academic_year = url.searchParams.get("academic_year");
  const dateParam = url.searchParams.get("date"); // YYYY-MM-DD
  const classId = url.searchParams.get("classId");
  const streamId = url.searchParams.get("streamId");
  const sectionId = url.searchParams.get("sectionId");

  if (!academic_year || !dateParam) {
    return NextResponse.json(
      { success: false, message: "academic_year and date are required" },
      { status: 400 }
    );
  }

  if (classId && !mongoose.Types.ObjectId.isValid(classId)) {
    return NextResponse.json({ success: false, message: "Invalid classId format" }, { status: 400 });
  }

  const cacheKey = `att_student_${schoolId}_${role}_${userId || ""}_${academic_year}_${dateParam}_${classId || "all"}_${streamId || "all"}_${sectionId || "all"}`;

  const cached = _studentAttServerCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return sendCompressedJson(req, cached.data, {
      cacheControl: "private, max-age=15, stale-while-revalidate=30"
    });
  }

  const existingInFlight = _studentAttInFlight.get(cacheKey);
  if (existingInFlight) {
    try {
      const payload = await existingInFlight;
      return sendCompressedJson(req, payload, {
        cacheControl: "private, max-age=15, stale-while-revalidate=30"
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

    // ── Resolve teacher + class access ONCE for teacher role ──────────────────
    let combinedClassIds: string[] = [];
    if (role === "teacher") {
      const teacher = await Teacher.findOne({ user_id: userId, school_id: schoolId });
      if (!teacher) {
        throw new Error("Teacher record not found");
      }

      const [classTeacherIds, assignedClassIds] = await Promise.all([
        Class.find({ school_id: schoolId, class_teacher_id: teacher._id }).distinct("_id"),
        TeacherAssignment.find({
          school_id: schoolId,
          teacher_id: teacher._id,
          academic_year,
          is_deleted: false,
          status: "Active",
        }).distinct("class_id"),
      ]);

      combinedClassIds = Array.from(new Set([
        ...classTeacherIds.map(id => id.toString()),
        ...assignedClassIds.map(id => id?.toString()).filter(Boolean),
      ]));
    }

    if (!classId) {
      const query: any = {
        school_id: schoolId as string,
        academic_year,
        date: { $gte: startOfDay, $lte: endOfDay },
        type: "student",
      };

      if (role === "teacher") {
        query.class_id = { $in: combinedClassIds };
      }

      // Check student counts cache
      const countsKey = `${schoolId}:${academic_year}:${streamId || ""}`;
      const cachedCounts = studentCountsCache.get(countsKey);
      const isCountsValid = cachedCounts && cachedCounts.expiresAt > Date.now();

      let classStudentCounts: Record<string, number> = {};

      if (isCountsValid) {
        classStudentCounts = cachedCounts.counts;
        const attendanceRecords = await Attendance.find(query)
          .select("class_id records.status records.student_id date")
          .lean();

        const responsePayload = {
          success: true,
          data: attendanceRecords,
          classStudentCounts,
        };
        _studentAttServerCache.set(cacheKey, { data: responsePayload, expiresAt: Date.now() + ATTENDANCE_CACHE_TTL });
        return responsePayload;
      }

      const [attendanceRecords, studentCounts] = await Promise.all([
        Attendance.find(query)
          .select("class_id records.status records.student_id date")
          .lean(),
        Student.aggregate([
          {
            $match: {
              school_id: new mongoose.Types.ObjectId(schoolId as string),
              academic_year,
              is_active: true,
              ...(streamId && mongoose.Types.ObjectId.isValid(streamId)
                ? { stream_id: new mongoose.Types.ObjectId(streamId) }
                : {}),
            },
          },
          {
            $group: {
              _id: "$class_id",
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      studentCounts.forEach((sc: any) => {
        if (sc._id) {
          classStudentCounts[sc._id.toString()] = sc.count;
        }
      });

      studentCountsCache.set(countsKey, {
        counts: classStudentCounts,
        expiresAt: Date.now() + COUNTS_CACHE_TTL_MS,
      });

      const responsePayload = {
        success: true,
        data: attendanceRecords,
        classStudentCounts,
      };
      _studentAttServerCache.set(cacheKey, { data: responsePayload, expiresAt: Date.now() + ATTENDANCE_CACHE_TTL });
      return responsePayload;
    }

    // ── classId present — verify teacher access using already-resolved list ───
    if (role === "teacher") {
      if (!combinedClassIds.includes(classId)) {
        throw new Error("You are not assigned to this class");
      }
    }

    const query: any = {
      school_id: schoolId as string,
      academic_year,
      class_id: classId,
      date: { $gte: startOfDay, $lte: endOfDay },
      type: "student",
    };

    if (streamId && mongoose.Types.ObjectId.isValid(streamId)) {
      query.stream_id = streamId;
    } else {
      query.stream_id = null;
    }

    if (sectionId && mongoose.Types.ObjectId.isValid(sectionId)) {
      query.section_id = sectionId;
    } else {
      query.section_id = null;
    }

    const attendanceRecord = await Attendance.findOne(query)
      .populate("records.student_id", "name roll_no")
      .lean();

    const responsePayload = {
      success: true,
      data: attendanceRecord || null,
    };
    _studentAttServerCache.set(cacheKey, { data: responsePayload, expiresAt: Date.now() + ATTENDANCE_CACHE_TTL });
    return responsePayload;
  })();

  _studentAttInFlight.set(cacheKey, queryPromise);

  try {
    const payload = await queryPromise;
    return sendCompressedJson(req, payload, {
      cacheControl: "private, max-age=15, stale-while-revalidate=30",
    });
  } catch (err: any) {
    const status = err.message === "Teacher record not found" || err.message === "You are not assigned to this class" ? 403 : 500;
    return NextResponse.json({ success: false, message: err.message || "Internal server error" }, { status });
  } finally {
    _studentAttInFlight.delete(cacheKey);
  }
}

export async function POST(req: NextRequest) {
  const { schoolId, userId, role, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();

    const body = await req.json();
    const { academic_year, date, classId, streamId, sectionId, records } = body;

    if (!academic_year || !date || !classId || !records) {
      return NextResponse.json(
        { success: false, message: "academic_year, date, classId, and records are required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return NextResponse.json({ success: false, message: "Invalid classId format" }, { status: 400 });
    }

    // Verify teacher assignment — Class + TeacherAssignment queries run in parallel
    if (role === "teacher") {
      const teacher = await Teacher.findOne({ user_id: userId, school_id: schoolId });
      if (!teacher) {
        return NextResponse.json({ success: false, message: "Teacher record not found" }, { status: 403 });
      }

      const [classTeacherIds, assignedClassIds] = await Promise.all([
        Class.find({ school_id: schoolId, class_teacher_id: teacher._id }).distinct("_id"),
        TeacherAssignment.find({
          school_id: schoolId,
          teacher_id: teacher._id,
          academic_year,
          is_deleted: false,
          status: "Active",
        }).distinct("class_id"),
      ]);

      const combinedClassIds = Array.from(new Set([
        ...classTeacherIds.map(id => id.toString()),
        ...assignedClassIds.map(id => id?.toString()).filter(Boolean),
      ]));

      if (!combinedClassIds.includes(classId)) {
        return NextResponse.json({ success: false, message: "You are not assigned to this class" }, { status: 403 });
      }
    }

    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const filter: any = {
      school_id: new mongoose.Types.ObjectId(schoolId as string),
      academic_year,
      class_id: new mongoose.Types.ObjectId(classId),
      date: { $gte: startOfDay, $lte: endOfDay },
      type: "student",
    };
    filter.stream_id = streamId && mongoose.Types.ObjectId.isValid(streamId) ? new mongoose.Types.ObjectId(streamId) : null;
    filter.section_id = sectionId && mongoose.Types.ObjectId.isValid(sectionId) ? new mongoose.Types.ObjectId(sectionId) : null;

    const existingRecord = await Attendance.findOne(filter);

    // Date check
    const requestDateStr = date;
    const d = new Date();
    const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const utcToday = d.toISOString().split("T")[0];
    const isToday = (requestDateStr === localToday || requestDateStr === utcToday);

    if (existingRecord && (!body.reason || body.reason.trim() === "")) {
      return NextResponse.json(
        { success: false, message: "A reason is mandatory when editing attendance." },
        { status: 400 }
      );
    }

    if (role === "teacher") {
      if (!isToday) {
        return NextResponse.json(
          { success: false, message: "Teachers can only mark or edit today's attendance." },
          { status: 400 }
        );
      }
    }

    const formattedRecords = records.map((r: any) => ({
      student_id: new mongoose.Types.ObjectId(r.student_id),
      status: r.status.toLowerCase(),
      note: r.note || null,
    }));

    // Maintain Edit History / Audit Log for All Roles
    let auditLogEntry = null;
    if (existingRecord) {
      const changes: any[] = [];
      const oldRecordsMap = new Map();
      existingRecord.records.forEach((r: any) => {
        if (r.student_id) {
          oldRecordsMap.set(r.student_id.toString(), r);
        }
      });

      for (const r of formattedRecords) {
        const studentIdStr = r.student_id.toString();
        const oldRec = oldRecordsMap.get(studentIdStr);
        if (oldRec) {
          const oldStatus = oldRec.status;
          const newStatus = r.status;
          const oldNote = oldRec.note || "";
          const newNote = r.note || "";
          if (oldStatus !== newStatus || oldNote !== newNote) {
            changes.push({
              student_id: r.student_id,
              student_name: "", // Will populate below
              old_status: oldStatus,
              new_status: newStatus,
              old_note: oldNote,
              new_note: newNote,
            });
          }
        } else {
          changes.push({
            student_id: r.student_id,
            student_name: "",
            old_status: "not marked",
            new_status: r.status,
            old_note: "",
            new_note: r.note || "",
          });
        }
      }

      if (changes.length > 0) {
        const studentIds = changes.map(c => c.student_id);
        const studentsList = await Student.find({ _id: { $in: studentIds } }).select("name").lean();
        const studentNameMap = new Map();
        studentsList.forEach((s: any) => {
          studentNameMap.set(s._id.toString(), s.name);
        });

        changes.forEach(c => {
          c.student_name = studentNameMap.get(c.student_id.toString()) || "Unknown Student";
        });

        const editor = await User.findById(userId).select("name").lean();
        const editorName = editor?.name || (role === "teacher" ? "Teacher" : "Admin/Principal");

        auditLogEntry = {
          edited_by: new mongoose.Types.ObjectId(userId as string),
          edited_by_name: editorName,
          edited_at: new Date(),
          reason: body.reason || "No reason provided",
          changes,
        };
      }
    }

    const update: any = {
      $set: {
        marked_by: new mongoose.Types.ObjectId(userId as string),
        records: formattedRecords,
      },
      $setOnInsert: {
        school_id: new mongoose.Types.ObjectId(schoolId as string),
        academic_year,
        class_id: new mongoose.Types.ObjectId(classId),
        stream_id: filter.stream_id,
        section_id: filter.section_id,
        date: startOfDay,
        type: "student",
      }
    };

    if (auditLogEntry) {
      update.$push = { edit_history: auditLogEntry };
    }

    const attendanceRecord = await Attendance.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      runValidators: true,
    });

    invalidateStudentAttendanceCache(schoolId);

    return NextResponse.json({
      success: true,
      message: "Student attendance saved successfully",
      data: attendanceRecord,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal server error" }, { status: 500 });
  }
}
