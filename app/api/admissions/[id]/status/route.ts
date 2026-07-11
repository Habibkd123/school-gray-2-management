import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { Admission } from "@/lib/models/index";
import { requireAuth } from "@/lib/utils/auth";
import mongoose from "mongoose";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { schoolId, userId, error } = requireAuth(req, ["school_admin"]);
  if (error) return error;
  if (!schoolId) return NextResponse.json({ success: false, message: "No school context" }, { status: 400 });

  try {
    await connectDB();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid application ID" }, { status: 400 });
    }

    const admission = await Admission.findOne({ _id: id, school_id: schoolId });
    if (!admission) {
      return NextResponse.json({ success: false, message: "Application not found" }, { status: 404 });
    }

    const body = await req.json();
    const { status: newStatus, remarks, interview_date, rejection_reason } = body;

    const allowedStatuses = [
      "New", "Under Review", "Documents Pending", "Interview Scheduled", "Approved", "Rejected", "Admission Completed", "Cancelled"
    ];
    if (newStatus && !allowedStatuses.includes(newStatus)) {
      return NextResponse.json({ success: false, message: "Invalid status value" }, { status: 400 });
    }

    if (newStatus) admission.status = newStatus;
    if (rejection_reason !== undefined) admission.rejection_reason = rejection_reason;
    if (interview_date !== undefined) {
      admission.interview_date = interview_date ? new Date(interview_date) : undefined;
    }

    // Append to status history
    admission.status_history.push({
      status: newStatus || admission.status,
      updated_by: `Admin (User ID: ${userId})`,
      date: new Date(),
      remarks: remarks || `Status updated to ${newStatus || admission.status}.`,
    });

    await admission.save();

    return NextResponse.json({ success: true, data: admission });
  } catch (err: any) {
    console.error("[PUT /api/admissions/[id]/status]", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
