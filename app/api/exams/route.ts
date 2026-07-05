import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Exam } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";

export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const classId = url.searchParams.get("class_id");
    const academic_year = url.searchParams.get("academic_year");
    const query: any = { school_id: schoolId };
    if (classId) query.class_id = classId;
    if (academic_year) query.academic_year = academic_year;

    const exams = await Exam.find(query)
      .sort({ createdAt: -1 })
      .populate("class_id", "name section");
    return NextResponse.json({ success: true, data: { exams } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const body = await req.json();
    console.log("[POST /api/exams] received body:", body);
    const { name, type, class_id, class_ids, academic_year, start_date, end_date, description, status } = body;

    if (!name || !academic_year) {
      return NextResponse.json({ success: false, message: "Name and academic year are required" }, { status: 400 });
    }

    const classesToCreate = Array.isArray(class_ids) && class_ids.length > 0 
      ? class_ids 
      : (class_id ? [class_id] : []);

    if (classesToCreate.length === 0) {
      return NextResponse.json({ success: false, message: "Class selection is required" }, { status: 400 });
    }

    const createdExams = [];
    for (const cId of classesToCreate) {
      const exam = await Exam.create({
        school_id: schoolId as string,
        class_id: cId,
        name: name.trim(),
        type: type || "other",
        academic_year,
        start_date: start_date ? new Date(start_date) : undefined,
        end_date: end_date ? new Date(end_date) : undefined,
        is_published: false,
        description: description || "",
        status: status || "upcoming",
      });
      createdExams.push(exam);
    }

    return NextResponse.json({ success: true, data: createdExams[0], all: createdExams }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
