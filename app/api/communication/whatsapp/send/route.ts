import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { requireAuth } from "@/lib/utils/auth";
import { sendWhatsAppMessage, normalizePhoneNumber } from "@/lib/services/whatsapp";

export async function POST(req: NextRequest) {
  const { schoolId, error } = requireAuth(req, ["school_admin", "super_admin"]);
  if (error) return error;

  try {
    await connectToDatabase();
    const body = await req.json();

    const { to, recipientName, message, studentId, eventType, recipientType } = body;

    if (!to || !message) {
      return NextResponse.json(
        { success: false, message: "Recipient phone ('to') and 'message' are required" },
        { status: 400 }
      );
    }

    const normalized = normalizePhoneNumber(to);
    if (!normalized) {
      return NextResponse.json(
        { success: false, message: `Invalid phone number format: '${to}'. Please provide a valid 10-digit or E.164 mobile number.` },
        { status: 400 }
      );
    }

    const result = await sendWhatsAppMessage({
      schoolId: schoolId as string,
      to: normalized,
      recipientName: (recipientName || "Recipient").trim(),
      recipientType: recipientType || "parent",
      eventType: eventType || "custom",
      message: message.trim(),
      studentId,
    });

    return NextResponse.json({
      success: result.success,
      message: result.success ? "WhatsApp message dispatched successfully" : result.error || "Failed to dispatch message",
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Failed to send WhatsApp message" },
      { status: 500 }
    );
  }
}
