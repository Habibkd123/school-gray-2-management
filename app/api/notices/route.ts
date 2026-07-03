import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Notice } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import { paginateQuery } from "@/lib/utils/pagination";

export async function GET(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin", "student", "parent"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(url.searchParams.get("limit") || "25"));

    const { items: notices, total, totalPages } = await paginateQuery(
      Notice,
      { school_id: schoolId },
      {
        page,
        limit,
        sort: { createdAt: -1 }
      }
    );

    return NextResponse.json(
      { success: true, data: { notices, total, page, totalPages, limit } },
      { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" } }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { schoolId, userId, error } = requireAuth(req, ["school_admin", "teacher", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { title, content, target_audience, publish_date, expiry_date, attachment_url } = body;

    if (!title || !content) {
      return NextResponse.json({ success: false, message: "Title and content are required" }, { status: 400 });
    }

    const notice = await Notice.create({
      school_id: schoolId as string,
      created_by: userId || (schoolId as string),
      title: title.trim(),
      content: content.trim(),
      target_audience: target_audience || "all",
      publish_date: publish_date ? new Date(publish_date) : new Date(),
      expiry_date: expiry_date ? new Date(expiry_date) : undefined,
      attachment_url: attachment_url || null,
      is_published: true,
    });

    return NextResponse.json({ success: true, data: notice }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
