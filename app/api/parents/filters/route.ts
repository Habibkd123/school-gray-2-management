export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Parent, Class } from "@/lib/models";
import Student from "@/lib/models/Student";
import { requireAuth } from "@/lib/utils/auth";

export async function GET(request: NextRequest) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "teacher", "super_admin",]);
  // if (error) return error;

  try {
    await connectDB();

    const [academicYears, classes, sections, students, relations] = await Promise.all([
      Class.distinct("academic_year", { school_id: schoolId }),
      Class.find({ school_id: schoolId }).select("name section").lean(),
      Class.distinct("section", { school_id: schoolId }),
      Student.find({ school_id: schoolId, is_active: true }).select("name").sort({ name: 1 }).lean(),
      Parent.distinct("relation", { school_id: schoolId }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        academicYears: academicYears.filter(Boolean),
        classes: classes.map((c: any) => ({
          _id: c._id.toString(),
          name: c.name,
          section: c.section
        })),
        sections: sections.filter(Boolean),
        students: students.map((s: any) => ({
          _id: s._id.toString(),
          name: s.name
        })),
        guardianTypes: relations.filter(Boolean)
      }
    });
  } catch (err: any) {
    console.error("[GET /api/parents/filters]", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to load filters" },
      { status: 505 }
    );
  }
}
