export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { requireAuth } from "@/lib/utils/auth";
import Student from "@/lib/models/Student";
import Class from "@/lib/models/Class";
import Section from "@/lib/models/Section";
import Admission from "@/lib/models/Admission";

export async function GET(request: NextRequest) {
  const { schoolId, error } = requireAuth(request, ["school_admin", "teacher", "super_admin", "student", "parent"]);
  if (error) return error;

  try {
    await connectDB();

    const [academicYears, classes, sections, houses, genders, admissionStatuses] = await Promise.all([
      Class.distinct("academic_year", { school_id: schoolId }),
      Class.find({ school_id: schoolId }).select("name section stream").lean(),
      Section.find({ school_id: schoolId, status: "Active" }).select("name").lean(),
      Student.distinct("house", { school_id: schoolId }),
      Student.distinct("gender", { school_id: schoolId }),
      Admission.distinct("status", { school_id: schoolId }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        academicYears: academicYears.filter(Boolean),
        classes: classes.map((c: any) => ({
          _id: c._id,
          name: c.name,
          section: c.section || "",
          stream: c.stream || ""
        })),
        sections: sections.map((s: any) => s.name),
        houses: houses.filter(Boolean),
        genders: genders.filter(Boolean).map((g: string) => g.charAt(0).toUpperCase() + g.slice(1).toLowerCase()),
        statuses: ["Active", "Inactive"],
        admissionStatuses: admissionStatuses.filter(Boolean),
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
