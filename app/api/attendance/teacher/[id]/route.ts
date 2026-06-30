import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Attendance } from "@/lib/models/index";
import Teacher from "@/lib/models/Teacher";
import User from "@/lib/models/User";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { schoolId, role, userId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin", "principal"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const resolvedParams = await params;
    const teacherId = resolvedParams.id;

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return NextResponse.json({ success: false, message: "Invalid teacher ID" }, { status: 400 });
    }

    const url = new URL(req.url);
    const academic_year = url.searchParams.get("academic_year");
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");

    // Fetch Teacher Profile
    const teacherProfile = await Teacher.findOne({ _id: teacherId, school_id: schoolId }).lean();

    if (!teacherProfile) {
      return NextResponse.json({ success: false, message: "Teacher not found" }, { status: 404 });
    }

    // Teacher Access Verification: Teacher can only view their own attendance
    if (role === "teacher" && teacherProfile.user_id?.toString() !== userId) {
      return NextResponse.json({ success: false, message: "You can only view your own attendance" }, { status: 403 });
    }

    // Build query for attendance
    const query: any = {
      school_id: schoolId as string,
      "records.teacher_id": teacherId,
      type: "teacher",
    };

    if (academic_year) {
      query.academic_year = academic_year;
    }

    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      startDate.setUTCHours(0, 0, 0, 0);
      const endDate = new Date(endDateParam);
      endDate.setUTCHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendances = await Attendance.find(query).sort({ date: -1 }).lean();

    // Extract teacher's specific records
    const history = attendances.map((att: any) => {
      const record = att.records.find((r: any) => r.teacher_id.toString() === teacherId);
      if (!record) return null;
      
      // Find latest audit log for this teacher if any
      let lastUpdated = att.updatedAt;
      let updatedBy = "System/Initial";
      
      if (att.edit_history && att.edit_history.length > 0) {
        // Reverse array to find most recent change affecting this teacher
        const historyCopy = [...att.edit_history].reverse();
        for (const entry of historyCopy) {
          const change = entry.changes.find((c: any) => c.teacher_id?.toString() === teacherId);
          if (change) {
            lastUpdated = entry.edited_at;
            updatedBy = entry.edited_by_name || "Admin";
            break;
          }
        }
      }

      return {
        id: att._id, // attendance document ID
        date: att.date,
        status: record.status,
        note: record.note,
        lastUpdated,
        updatedBy
      };
    }).filter(Boolean) as any[];

    // Calculate Stats
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLeave = 0;
    let totalLate = 0;
    let totalHalfDay = 0;

    history.forEach(h => {
      if (h.status === "present") totalPresent++;
      else if (h.status === "absent") totalAbsent++;
      else if (h.status === "leave") totalLeave++;
      else if (h.status === "late") totalLate++;
      else if (h.status === "half_day") totalHalfDay++;
    });

    const totalWorkingDays = history.length;
    const attendancePercentage = totalWorkingDays > 0 
      ? Math.round(((totalPresent + totalLate + (totalHalfDay * 0.5)) / totalWorkingDays) * 100) 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        teacher: {
          _id: teacherProfile._id,
          name: teacherProfile.name,
          employee_id: teacherProfile.employee_id,
          designation: teacherProfile.subject_specialization || "",
          department: teacherProfile.qualification || "",
        },
        stats: {
          totalWorkingDays,
          totalPresent,
          totalAbsent,
          totalLeave,
          attendancePercentage
        },
        history
      },
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { schoolId, role, userId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin", "principal"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const resolvedParams = await params;
    const teacherId = resolvedParams.id;
    const body = await req.json();
    const { date, status, note, reason } = body;

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return NextResponse.json({ success: false, message: "Invalid teacher ID" }, { status: 400 });
    }

    if (!date || !status) {
      return NextResponse.json({ success: false, message: "date and status are required" }, { status: 400 });
    }

    const requestDateStr = date;
    const d = new Date();
    const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const utcToday = d.toISOString().split("T")[0];
    const isToday = (requestDateStr === localToday || requestDateStr === utcToday);

    const teacherProfile = await Teacher.findOne({ _id: teacherId, school_id: schoolId }).lean();
    if (!teacherProfile) {
      return NextResponse.json({ success: false, message: "Teacher not found" }, { status: 404 });
    }

    if (role === "teacher") {
      if (teacherProfile.user_id?.toString() !== userId) {
        return NextResponse.json({ success: false, message: "You can only edit your own attendance" }, { status: 403 });
      }
      if (!isToday) {
        return NextResponse.json({ success: false, message: "Teachers can only edit today's attendance." }, { status: 403 });
      }
    }

    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const existingRecord = await Attendance.findOne({
      school_id: schoolId,
      date: { $gte: startOfDay, $lte: endOfDay },
      "records.teacher_id": teacherId,
      type: "teacher"
    });

    if (!existingRecord) {
      return NextResponse.json({ success: false, message: "Attendance record for this date does not exist. Please take teacher attendance first." }, { status: 404 });
    }

    if (!reason || reason.trim() === "") {
      return NextResponse.json({ success: false, message: "A reason is mandatory when editing attendance." }, { status: 400 });
    }

    const oldRecordIndex = existingRecord.records.findIndex((r: any) => r.teacher_id.toString() === teacherId);
    if (oldRecordIndex === -1) {
      return NextResponse.json({ success: false, message: "Teacher record not found in the attendance for this date." }, { status: 404 });
    }

    const oldRec = existingRecord.records[oldRecordIndex];
    if (oldRec.status === status.toLowerCase() && (oldRec.note || "") === (note || "")) {
       return NextResponse.json({ success: true, message: "No changes detected." });
    }

    const editor = await User.findById(userId).select("name").lean();
    const editorName = editor?.name || (role === "teacher" ? "Teacher" : "Admin/Principal");

    const change = {
      teacher_id: new mongoose.Types.ObjectId(teacherId),
      teacher_name: teacherProfile?.name || "Unknown Teacher",
      old_status: oldRec.status,
      new_status: status.toLowerCase(),
      old_note: oldRec.note || "",
      new_note: note || "",
    };

    const auditLogEntry: any = {
      edited_by: new mongoose.Types.ObjectId(userId as string),
      edited_by_name: editorName,
      edited_at: new Date(),
      reason: reason,
      changes: [change],
    };

    // Update the record
    existingRecord.records[oldRecordIndex].status = status.toLowerCase();
    existingRecord.records[oldRecordIndex].note = note || "";
    if (!existingRecord.edit_history) {
      existingRecord.edit_history = [];
    }
    existingRecord.edit_history.push(auditLogEntry);

    await existingRecord.save();

    return NextResponse.json({ success: true, message: "Attendance updated successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal server error" }, { status: 500 });
  }
}
