import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { requireAuth } from "@/lib/utils/auth";
import { sendPrincipalFeeOTP, verifyPrincipalFeeOTP } from "@/lib/services/whatsapp";
import User from "@/lib/models/User";
import Student from "@/lib/models/Student";

export async function POST(req: NextRequest) {
  const { schoolId, role, userId, error } = requireAuth(req);
  if (error) return error;

  try {
    await connectDB();
    const body = await req.json();
    const { action, student_id, amount, payment_method, otp } = body;

    if (!student_id) {
      return NextResponse.json({ success: false, message: "student_id is required" }, { status: 400 });
    }

    if (action === "send") {
      const student = await Student.findById(student_id).select("name admission_no").lean();
      if (!student) {
        return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
      }

      let cashierName = "Staff";
      if (userId) {
        const user = await User.findById(userId).select("name username").lean();
        if (user) cashierName = user.name || user.username || "Staff";
      }

      const result = await sendPrincipalFeeOTP({
        schoolId: schoolId as string,
        studentId: student_id,
        studentName: student.name,
        amount: amount || 0,
        paymentMethod: payment_method || "Cash",
        cashierName,
      });

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            message: result.error || "Failed to dispatch WhatsApp OTP to Principal",
            principalPhone: result.principalPhone,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Authorization OTP sent to Principal's WhatsApp",
        principalPhone: result.principalPhone,
        devOtp: result.otp,
      });
    } else if (action === "verify") {
      if (!otp) {
        return NextResponse.json({ success: false, message: "OTP code is required" }, { status: 400 });
      }

      const verifyResult = await verifyPrincipalFeeOTP({
        schoolId: schoolId as string,
        studentId: student_id,
        otp,
      });

      if (!verifyResult.valid) {
        return NextResponse.json({ success: false, message: verifyResult.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: verifyResult.message,
        verified: true,
      });
    } else {
      return NextResponse.json({ success: false, message: "Invalid action. Use 'send' or 'verify'." }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Internal server error" }, { status: 500 });
  }
}
