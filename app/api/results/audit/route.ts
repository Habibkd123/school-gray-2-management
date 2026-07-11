import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { ResultAudit } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import User from "@/lib/models/User";
import Student from "@/lib/models/Student";

export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const examId = url.searchParams.get("exam_id");
    const subjectId = url.searchParams.get("subject_id");

    if (!examId || !subjectId) {
      return NextResponse.json({ success: false, message: "Exam ID and Subject ID are required" }, { status: 400 });
    }

    const logs = await ResultAudit.find({
      school_id: schoolId,
      exam_id: examId,
      subject_id: subjectId
    })
      .populate("student_id", "name roll_no admission_no")
      .populate("changed_by", "name")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ success: true, data: logs });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
