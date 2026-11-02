import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import WhatsAppLog from "@/lib/models/WhatsAppLog";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(req.url);

    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
    const status = url.searchParams.get("status");
    const eventType = url.searchParams.get("eventType");
    const search = url.searchParams.get("search")?.trim();

    const query: any = {
      school_id: new mongoose.Types.ObjectId(schoolId as string),
    };

    if (status) {
      query.status = status;
    }

    if (eventType) {
      query.event_type = eventType;
    }

    if (search) {
      query.$or = [
        { recipient_phone: { $regex: search, $options: "i" } },
        { recipient_name: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
      ];
    }

    const [total, logs] = await Promise.all([
      WhatsAppLog.countDocuments(query),
      WhatsAppLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("student_id", "name roll_no class_id")
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        limit,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to fetch WhatsApp logs" },
      { status: 500 }
    );
  }
}
