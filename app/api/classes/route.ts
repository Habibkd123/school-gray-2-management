import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Class from "@/lib/models/Class";
import Teacher from "@/lib/models/Teacher";
import { Timetable } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";

// GET: Fetch all classes for the school (with pagination, search, filter, sort)
export async function GET(req: NextRequest) {
  const authResult = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (authResult.error) return authResult.error;
  const { schoolId, user } = authResult;

  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const search       = url.searchParams.get("search") || "";
    const academic_year = url.searchParams.get("academic_year") || "";
    const section      = url.searchParams.get("section") || "";
    const sortOrder    = url.searchParams.get("sort") === "desc" ? -1 : 1;
    const page         = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit        = Math.min(10, Math.max(1, parseInt(url.searchParams.get("limit") || "10")));

    const query: Record<string, any> = { school_id: schoolId as string };
    const andFilters: any[] = [];

    if (user.role === "teacher") {
      const teacher = await Teacher.findOne({ user_id: user.user_id, school_id: schoolId }).lean();
      if (teacher) {
        // Only show classes where this teacher is the Class Teacher
        andFilters.push({
          class_teacher_id: teacher._id
        });
      } else {
        andFilters.push({ _id: null });
      }
    }

    if (search) {
      andFilters.push({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { section: { $regex: search, $options: "i" } },
        ]
      });
    }

    if (academic_year) query.academic_year = academic_year;
    if (section) query.section = section;

    if (andFilters.length > 0) {
      query.$and = andFilters;
    }

    const allMatchingClasses = await Class.find(query)
      .populate("class_teacher_id", "name employee_id")
      .lean();

    const getWeight = (name: string): number => {
      const n = name.toLowerCase().trim();
      if (n.startsWith("nursery")) return 1;
      if (n.startsWith("lkg")) return 2;
      if (n.startsWith("ukg")) return 3;
      const match = n.match(/class\s+(\d+)/);
      if (match) {
        return 10 + parseInt(match[1], 10);
      }
      return 100;
    };

    allMatchingClasses.sort((a: any, b: any) => {
      const wA = getWeight(a.name);
      const wB = getWeight(b.name);
      if (wA !== wB) return (wA - wB) * sortOrder;
      return a.section.localeCompare(b.section);
    });

    const total = allMatchingClasses.length;
    const paginatedClasses = allMatchingClasses.slice((page - 1) * limit, page * limit);

    return NextResponse.json(
      { success: true, data: { classes: paginatedClasses, total, page, limit, totalPages: Math.ceil(total / limit) } },
      { headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// POST: Create a new class
export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();

    const body = await req.json();
    const { name, section, academic_year, class_teacher_id, capacity, class_code, status } = body;

    if (!name || !academic_year) {
      return NextResponse.json(
        { success: false, message: "Class name and academic year are required" },
        { status: 400 }
      );
    }

    const newClass = await Class.create({
      school_id: schoolId as string,
      name: name.trim(),
      section: section?.trim() || "",
      class_code: class_code?.trim().toUpperCase() || undefined,
      status: status || "Active",
      academic_year: academic_year.trim(),
      class_teacher_id: class_teacher_id || null,
      capacity: capacity ? parseInt(capacity) : 40,
    });

    const populated = await newClass.populate("class_teacher_id", "name employee_id");

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json(
        { success: false, message: "A class with this name, section, and academic year already exists" },
        { status: 409 }
      );
    }
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
