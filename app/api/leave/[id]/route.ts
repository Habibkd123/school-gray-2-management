import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { LeaveRequest } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });

  try {
    await connectToDatabase();
    const body = await req.json();
    const { status, admin_note } = body;

    const update: any = { $set: body };
    if (status === "approved" || status === "rejected") {
      update.$set.approved_at = new Date();
    }
    if (admin_note) update.$set.admin_note = admin_note;

    const leave = await LeaveRequest.findOneAndUpdate(
      { _id: id, school_id: schoolId },
      update,
      { new: true }
    );
    if (!leave) return NextResponse.json({ success: false, message: "Leave request not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: leave });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { schoolId, user, role, error } = requireAuth(req, ["school_admin", "teacher", "super_admin", "student", "parent"]);
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });

  try {
    await connectToDatabase();
    const query: any = { _id: id, school_id: schoolId };
    if (role === "student" || role === "parent") {
      query.user_id = user.user_id;
    }
    const leave = await LeaveRequest.findOneAndDelete(query);
    if (!leave) return NextResponse.json({ success: false, message: "Leave request not found or unauthorized" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Leave request deleted" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
