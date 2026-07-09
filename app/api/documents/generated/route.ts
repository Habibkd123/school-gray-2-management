import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { requireAuth } from "@/lib/utils/auth";
import GeneratedDocument from "@/lib/models/GeneratedDocument";

/**
 * GET /api/documents/generated
 * Query params: type, module, generated_for, page, limit, start_date, end_date
 */
export async function GET(request: NextRequest) {
  const { schoolId, error } = requireAuth(request, [
    "school_admin", "super_admin", "teacher", "principal",
  ]);
  if (error) return error;

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const filter: Record<string, any> = { school_id: schoolId };

    const type   = searchParams.get("type");
    const module = searchParams.get("module");
    const forId  = searchParams.get("generated_for");
    const search = searchParams.get("search");
    const page   = parseInt(searchParams.get("page") || "1");
    const limit  = parseInt(searchParams.get("limit") || "20");
    const skip   = (page - 1) * limit;

    if (type   && type   !== "all") filter.document_type     = type;
    if (module && module !== "all") filter.reference_module  = module;
    if (forId)                       filter.generated_for    = forId;

    const start = searchParams.get("start_date");
    const end   = searchParams.get("end_date");
    if (start || end) {
      filter.createdAt = {};
      if (start) filter.createdAt.$gte = new Date(start + "T00:00:00.000Z");
      if (end)   filter.createdAt.$lte = new Date(end   + "T23:59:59.999Z");
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { generated_for_name: { $regex: search, $options: "i" } },
      ];
    }

    const [docs, total] = await Promise.all([
      GeneratedDocument.find(filter)
        .populate("generated_by", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      GeneratedDocument.countDocuments(filter),
    ]);

    return NextResponse.json({ success: true, data: { docs, total, page, limit } });

  } catch (err: any) {
    console.error("[GET /api/documents/generated]", err);
    return NextResponse.json({ success: false, message: "Failed to fetch documents" }, { status: 500 });
  }
}
