import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { SubjectMaster } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";

// GET — list subject masters
export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "accountant", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, parseInt(url.searchParams.get("limit") || "50"));

    const query: any = { school_id: schoolId };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { subject_code: { $regex: search, $options: "i" } },
      ];
    }
    if (status) query.status = status;

    const total = await SubjectMaster.countDocuments(query);
    const subjects = await SubjectMaster.find(query)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: { subjects, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}

// POST — create subject master
export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const { name, subject_code, description, status } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ success: false, message: "Subject name is required" }, { status: 400 });
    }

    const subject = await SubjectMaster.create({
      school_id: String(schoolId),
      name: name.trim(),
      subject_code: subject_code?.trim().toUpperCase() || undefined,
      description: description?.trim() || undefined,
      status: status || "Active",
    });

    return NextResponse.json({ success: true, data: subject }, { status: 201 });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ success: false, message: "A subject with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
