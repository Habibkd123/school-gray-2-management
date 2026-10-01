import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/utils/auth";
import connectDB from "@/lib/db";
import { Attendance, Parent } from "@/lib/models";
import Student from "@/lib/models/Student";
import mongoose from "mongoose";
import { sendCompressedJson } from "@/lib/compression";

export async function GET(request: NextRequest) {
  try {
    const { user, schoolId, error } = requireAuth(request, ["parent"]);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const month = searchParams.get("month"); // YYYY-MM

    if (!studentId || !month) {
      return NextResponse.json({ success: false, message: "Missing studentId or month" }, { status: 400 });
    }

    await connectDB();

    const parent = await Parent.findOne({ user_id: user.user_id, school_id: schoolId }).lean();
    if (!parent) {
      return NextResponse.json({ success: false, message: "Parent profile not found" }, { status: 404 });
    }

    // Verify this student belongs to this parent
    const student = await Student.findOne({
      _id: studentId,
      parent_id: parent._id,
      school_id: schoolId
    }).lean();

    if (!student) {
      return NextResponse.json({ success: false, message: "Student not found or unauthorized" }, { status: 403 });
    }

    const startDate = new Date(`${month}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    // Find all attendance documents for this class in the given month
    const attendances = await Attendance.find({
      school_id: schoolId,
      class_id: student.class_id,
      type: "student",
      date: { $gte: startDate, $lt: endDate }
    }).lean();

    // Extract just this student's records
    const studentRecords = attendances.map((att: any) => {
      const record = att.records.find((r: any) => r.student_id.toString() === studentId);
      return {
        date: att.date,
        status: record ? record.status : "not_marked",
        note: record ? record.note : null
      };
    }).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return sendCompressedJson(request, {
      success: true,
      data: studentRecords
    }, { cacheControl: "private, no-cache" });
  } catch (error: any) {
    console.error("Error fetching student attendance:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}
