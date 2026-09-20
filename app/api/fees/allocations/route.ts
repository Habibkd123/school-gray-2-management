import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { FeeAllocation } from "@/lib/models";
import Student from "@/lib/models/Student";
import Parent from "@/lib/models/Parent";
import { requireAuth } from "@/lib/utils/auth";

export async function GET(req: NextRequest) {
  try {
    const { schoolId, role, userId, error } = requireAuth(req);
    if (error) return error;

    const url = new URL(req.url);
    const student_id = url.searchParams.get("student_id");

    const query: any = { school_id: schoolId };

    await connectDB();

    if (role === "student") {
      const studentProfile = await Student.findOne({ school_id: schoolId, user_id: userId }).select("_id").lean();
      if (!studentProfile) {
        return NextResponse.json({ success: true, data: { allocations: [] } });
      }
      query.student_id = studentProfile._id;
    } else if (role === "parent") {
      const parent = await Parent.findOne({ user_id: userId, school_id: schoolId }).select("_id").lean();
      if (!parent) {
        return NextResponse.json({ success: true, data: { allocations: [] } });
      }
      const children = await Student.find({ school_id: schoolId, parent_id: parent._id }).select("_id").lean();
      const childIds = children.map((c: any) => c._id.toString());
      if (student_id) {
        if (!childIds.includes(student_id)) {
          return NextResponse.json({ success: false, message: "Access denied to student record" }, { status: 403 });
        }
        query.student_id = student_id;
      } else {
        query.student_id = { $in: childIds };
      }
    } else {
      if (student_id) query.student_id = student_id;
    }

    const allocations = await FeeAllocation.find(query)
      .populate("student_id", "name admission_no roll_no")
      .populate("fee_group_id", "name description")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: { allocations } });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
    if (error) return error;

    const body = await req.json();
    const { fee_group_id, student_ids, unassign_student_ids } = body;

    if (!fee_group_id || !student_ids || !Array.isArray(student_ids)) {
      return NextResponse.json({ success: false, message: "Invalid payload" }, { status: 400 });
    }

    await connectDB();

    // Delete unassigned allocations
    if (unassign_student_ids && Array.isArray(unassign_student_ids) && unassign_student_ids.length > 0) {
      await FeeAllocation.deleteMany({
        school_id: schoolId,
        fee_group_id,
        student_id: { $in: unassign_student_ids }
      });
    }
    
    // Create allocations if they don't exist
    const results = [];
    for (const student_id of student_ids) {
      const existing = await FeeAllocation.findOne({ school_id: schoolId, student_id, fee_group_id });
      if (!existing) {
        const created = await FeeAllocation.create({ school_id: schoolId as string, student_id, fee_group_id });
        results.push(created);
      }
    }

    return NextResponse.json({ success: true, message: `Successfully updated fee allocations.`, data: { allocations: results } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

