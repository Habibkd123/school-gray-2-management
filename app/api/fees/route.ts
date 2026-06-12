import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { FeesStructure } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";

export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin", "student", "parent", "accountant"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const classId = url.searchParams.get("class_id");
    const academic_year = url.searchParams.get("academic_year");
    const query: any = { school_id: schoolId };
    if (classId) query.class_id = classId;
    if (academic_year) query.academic_year = academic_year;
    const fees = await FeesStructure.find(query).sort({ createdAt: -1 }).populate("class_id", "name section");
    return NextResponse.json({ success: true, data: { fees } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { name, amount, class_id, frequency, due_day, late_fee, academic_year } = body;

    if (!name || !amount) {
      return NextResponse.json({ success: false, message: "Name and amount are required" }, { status: 400 });
    }

    const fee = await FeesStructure.create({
      school_id: schoolId as string,
      class_id: class_id || new (await import("mongoose")).default.Types.ObjectId(),

      name: name.trim(),
      amount: Number(amount),
      frequency: frequency || "monthly",
      due_day: due_day ? Number(due_day) : 10,
      late_fee: late_fee ? Number(late_fee) : 0,
      academic_year: academic_year || new Date().getFullYear().toString(),
      is_active: true,
    });

    return NextResponse.json({ success: true, data: fee }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
