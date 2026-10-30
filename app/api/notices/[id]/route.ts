import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Notice } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { schoolId, role, error } = requireAuth(req, ["school_admin", "teacher", "super_admin", "student", "parent"]);
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });

  try {
    await connectToDatabase();
    const notice = await Notice.findOne({ _id: id, school_id: schoolId, is_deleted: { $ne: true } }).lean();
    if (!notice) return NextResponse.json({ success: false, message: "Notice not found" }, { status: 404 });

    if (role === "student") {
      if (!notice.is_published || (notice.target_audience !== "all" && notice.target_audience !== "students")) {
        return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 });
      }
    } else if (role === "parent") {
      if (!notice.is_published || (notice.target_audience !== "all" && notice.target_audience !== "parents")) {
        return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 });
      }
    } else if (role === "teacher") {
      if (!notice.is_published || (notice.target_audience !== "all" && notice.target_audience !== "teachers" && notice.target_audience !== "staff")) {
        return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 });
      }
    }

    return NextResponse.json({ success: true, data: notice });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });

  try {
    await connectToDatabase();
    const body = await req.json();
    const notice = await Notice.findOneAndUpdate(
      { _id: id, school_id: schoolId, is_deleted: { $ne: true } },
      { $set: body },
      { new: true }
    );
    if (!notice) return NextResponse.json({ success: false, message: "Notice not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: notice });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { schoolId, userId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const isPermanent = url.searchParams.get("permanent") === "true";

    if (isPermanent) {
      const notice = await Notice.findOneAndDelete({ _id: id, school_id: schoolId });
      if (!notice) return NextResponse.json({ success: false, message: "Notice not found" }, { status: 404 });
      return NextResponse.json({ success: true, message: "Notice permanently deleted" });
    }

    const notice = await Notice.findOneAndUpdate(
      { _id: id, school_id: schoolId },
      {
        $set: {
          is_deleted: true,
          deleted_at: new Date(),
          deleted_by: userId ? new mongoose.Types.ObjectId(userId) : undefined,
        },
      },
      { new: true }
    );
    if (!notice) return NextResponse.json({ success: false, message: "Notice not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Notice deleted successfully (soft-deleted)", data: notice });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "restore";

    if (action === "restore") {
      const notice = await Notice.findOneAndUpdate(
        { _id: id, school_id: schoolId },
        {
          $set: {
            is_deleted: false,
            deleted_at: null,
            deleted_by: null,
          },
        },
        { new: true }
      );
      if (!notice) return NextResponse.json({ success: false, message: "Notice not found" }, { status: 404 });
      return NextResponse.json({ success: true, message: "Notice restored successfully", data: notice });
    }

    return NextResponse.json({ success: false, message: "Unsupported action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
