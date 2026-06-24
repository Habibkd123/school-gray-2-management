import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Student from "@/lib/models/Student";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

interface PromotionItem {
  studentId: string;
  classId: string;
  academicYear?: string;
}

export async function POST(request: NextRequest) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectDB();
    const body = await request.json();
    const { promotions } = body;

    if (!Array.isArray(promotions) || promotions.length === 0) {
      return NextResponse.json(
        { success: false, message: "Invalid or empty promotions array" },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    const updatedIds: string[] = [];

    // Process each student's promotion
    for (const item of promotions) {
      const { studentId, classId, academicYear } = item as PromotionItem;

      if (!mongoose.isValidObjectId(studentId) || !mongoose.isValidObjectId(classId)) {
        errors.push(`Invalid ID format for student ${studentId} or class ${classId}`);
        continue;
      }

      // Check if student exists and belongs to the school
      const student = await Student.findOne({ _id: studentId, school_id: schoolId });
      if (!student) {
        errors.push(`Student not found: ${studentId}`);
        continue;
      }


      // Update student
      await Student.updateOne(
        { _id: studentId, school_id: schoolId },
        {
          $set: {
            class_id: new mongoose.Types.ObjectId(classId),
            ...(academicYear ? { academic_year: academicYear } : {})
          }
        }
      );
      updatedIds.push(studentId);
    }

    if (errors.length > 0 && updatedIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "Failed to promote students", errors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed promotions. ${updatedIds.length} succeeded, ${errors.length} failed.`,
      succeededCount: updatedIds.length,
      failedCount: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err: any) {
    console.error("[POST /api/students/promote]", err);
    return NextResponse.json(
      { success: false, message: "An error occurred during bulk promotion" },
      { status: 500 }
    );
  }
}
