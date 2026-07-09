import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { GeneratedDocument } from "@/lib/models/GeneratedDocument";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

/**
 * GET  /api/documents/generated/[id]  — fetch single generated doc
 * PATCH /api/documents/generated/[id] — update status fields (is_downloaded, is_printed)
 * DELETE /api/documents/generated/[id] — soft-delete (sets status = "failed")
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;
    const { schoolId } = authResult;

    const { id } = await params;
    const doc = await GeneratedDocument.findOne({
      _id: id,
      ...(schoolId ? { school_id: new mongoose.Types.ObjectId(schoolId) } : {}),
    }).lean();

    if (!doc) {
      return NextResponse.json({ success: false, message: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: doc });
  } catch (error: any) {
    console.error("GET /api/documents/generated/[id] error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;
    const { schoolId } = authResult;

    const { id } = await params;
    const body = await req.json();
    const allowed = ["is_downloaded", "is_printed", "status", "pdf_url", "pages"];
    const update: Record<string, any> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    const doc = await GeneratedDocument.findOneAndUpdate(
      {
        _id: id,
        ...(schoolId ? { school_id: new mongoose.Types.ObjectId(schoolId) } : {}),
      },
      { $set: update },
      { new: true }
    ).lean();

    if (!doc) {
      return NextResponse.json({ success: false, message: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: doc });
  } catch (error: any) {
    console.error("PATCH /api/documents/generated/[id] error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const authResult = requireAuth(req);
    if (authResult.error) return authResult.error;
    const { schoolId } = authResult;

    const { id } = await params;
    const doc = await GeneratedDocument.findOneAndDelete({
      _id: id,
      ...(schoolId ? { school_id: new mongoose.Types.ObjectId(schoolId) } : {}),
    });

    if (!doc) {
      return NextResponse.json({ success: false, message: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Document deleted" });
  } catch (error: any) {
    console.error("DELETE /api/documents/generated/[id] error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
