import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Student from "@/lib/models/Student";
import { requireAuth } from "@/lib/utils/auth";

// GET /api/student/profile — Returns current student's full profile
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth.error) return auth.error;

  if (auth.role !== "student") {
    return NextResponse.json(
      { success: false, message: "Access denied. Students only." },
      { status: 403 }
    );
  }

  try {
    await connectDB();

    const query: any = { user_id: auth.userId };
    if (auth.schoolId) {
      query.school_id = auth.schoolId;
    }

    const student = await Student.findOne(query)
      .populate({
        path: "class_id",
        select: "name section class_teacher_id",
        populate: {
          path: "class_teacher_id",
          select: "name"
        }
      })
      .lean();

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student profile not found for this user" },
        { status: 404 }
      );
    }

    if (student.is_active === false) {
      return NextResponse.json(
        { success: false, message: "Student account is deactivated" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: student });
  } catch (err: any) {
    console.error("[STUDENT PROFILE]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
