export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { requireAuth } from "@/lib/utils/auth";
import Teacher from "@/lib/models/Teacher";
import Class from "@/lib/models/Class";

export async function GET(request: NextRequest) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "teacher", "super_admin", "student", "parent"]);
  if (error) return error;

  try {
    await connectDB();

    const [academicYears, departments, designations] = await Promise.all([
      Class.distinct("academic_year", { school_id: schoolId }),
      Teacher.distinct("department", { school_id: schoolId }),
      Teacher.distinct("designation", { school_id: schoolId }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        academicYears: academicYears.filter(Boolean),
        departments: departments.filter(Boolean),
        designations: designations.filter(Boolean),
        statuses: ["Active", "Inactive"],
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
