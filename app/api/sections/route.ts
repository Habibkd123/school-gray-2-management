import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Section from "@/lib/models/Section";
import { requireAuth } from "@/lib/utils/auth";

// GET — list sections for school
export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "accountant", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limitParam = url.searchParams.get("limit");
    const isAll = limitParam === "all" || (limitParam && parseInt(limitParam) >= 1000);
    const limit = isAll ? 100000 : parseInt(limitParam || "50");

    const query: any = { school_id: schoolId };
    if (search) query.name = { $regex: search, $options: "i" };
    if (status) query.status = status;

    const total = await Section.countDocuments(query);
    const sections = await Section.find(query)
      .sort({ name: 1 })
      .skip(isAll ? 0 : (page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: { sections, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}

// POST — create section
export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const { name, status } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ success: false, message: "Section name is required" }, { status: 400 });
    }

    const section = await Section.create({
      school_id: String(schoolId),
      name: name.trim(),
      status: status || "Active",
    });

    return NextResponse.json({ success: true, data: section }, { status: 201 });
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ success: false, message: "A section with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: err.message || "Server error" }, { status: 500 });
  }
}
