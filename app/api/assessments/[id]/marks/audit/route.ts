import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { ClassTestMarkAudit } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import User from "@/lib/models/User";
import Student from "@/lib/models/Student";
import mongoose from "mongoose";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid test ID" }, { status: 400 });
    }

    // Reference model schemas to prevent tree-shaking
    void [User.modelName, Student.modelName];

    const logs = await ClassTestMarkAudit.find({
      school_id: schoolId,
      test_id: id
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
