import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import WhatsAppLog, { IWhatsAppLog } from "@/lib/models/WhatsAppLog";
import Student from "@/lib/models/Student";
import School from "@/lib/models/School";
import Class from "@/lib/models/Class";
import SecurityOTP from "@/lib/models/SecurityOTP";

export type WhatsAppProvider = "meta_cloud" | "twilio" | "mock";


export interface SendWhatsAppParams {
  schoolId: string | mongoose.Types.ObjectId;
  to: string;
  recipientName: string;
  recipientType?: "parent" | "student" | "teacher" | "staff" | "other";
  eventType:
    | "attendance_absent"
    | "attendance_late"
    | "fee_payment"
    | "fee_due_reminder"
    | "notice_broadcast"
    | "custom";
  message: string;
  studentId?: string | mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
  customProvider?: WhatsAppProvider;
}

export interface SendWhatsAppResult {
  success: boolean;
  provider: WhatsAppProvider;
  providerMessageId?: string;
  status: "sent" | "delivered" | "failed" | "simulated";
  error?: string;
  logId?: string;
}

/**
 * Normalizes phone number into international E.164 format.
 * - Defaults 10-digit Indian numbers to +91.
 * - Replaces leading 0 with +91.
 * - Returns null if phone number cannot be sanitized to a valid format.
 */
export function normalizePhoneNumber(rawPhone?: string | null): string | null {
  if (!rawPhone) return null;
  const cleaned = String(rawPhone).trim().replace(/[\s\-\(\)\.]/g, "");
  if (!cleaned) return null;

  // Already in E.164 with +
  if (/^\+\d{10,15}$/.test(cleaned)) {
    return cleaned;
  }

  // 10 digits Indian mobile number (starts with 6, 7, 8, or 9)
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  // 11 digits starting with 0 (e.g. 09876543210)
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned.slice(1)}`;
  }

  // 12 digits starting with 91 (e.g. 919876543210)
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // Any other international number without leading +
  if (/^\d{11,15}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  return null;
}

/**
 * Formats an instant attendance absent or late notification.
 */
export function formatAttendanceMessage(params: {
  studentName: string;
  status: "absent" | "late" | string;
  date: string;
  className?: string;
  schoolName: string;
}): string {
  const isAbsent = params.status.toLowerCase() === "absent";
  const icon = isAbsent ? "🚨" : "⏰";
  const statusUpper = isAbsent ? "ABSENT" : "LATE";
  const classInfo = params.className ? ` (${params.className})` : "";

  return `${icon} *ATTENDANCE ALERT* ${icon}
Dear Parent,
Your ward *${params.studentName}*${classInfo} has been marked *${statusUpper}* today on *${params.date}*.

🏫 School: *${params.schoolName}*
${isAbsent ? "If this was an unexpected absence or you have already informed the school, please disregard this message." : "Please ensure punctual arrival to avoid disruption in class."}

For any queries, please contact the school office.`;
}

/**
 * Formats an instant fee payment confirmation receipt message.
 */
export function formatFeeReceiptMessage(params: {
  studentName: string;
  amount: number | string;
  receiptNo: string;
  date: string;
  paymentMode: string;
  schoolName: string;
}): string {
  const formattedAmount = Number(params.amount).toLocaleString("en-IN");
  return `🧾 *FEE PAYMENT CONFIRMATION* 🧾
Dear Parent,
We have successfully received payment for *${params.studentName}*.

💰 Amount Paid: *₹${formattedAmount}*
📋 Receipt No: *${params.receiptNo}*
📅 Date: ${params.date}
💳 Payment Mode: ${params.paymentMode}
🏫 School: *${params.schoolName}*

Thank you for your timely payment! You can download the detailed receipt anytime from the parent portal.`;
}

/**
 * Formats a fee due reminder message.
 */
export function formatFeeDueReminderMessage(params: {
  studentName: string;
  amountDue: number | string;
  dueDate: string;
  schoolName: string;
}): string {
  const formattedAmount = Number(params.amountDue).toLocaleString("en-IN");
  return `⚠️ *FEE DUE REMINDER* ⚠️
Dear Parent,
This is a gentle reminder that the fee installment of *₹${formattedAmount}* for *${params.studentName}* is due on *${params.dueDate}*.

🏫 School: *${params.schoolName}*
Please clear the balance online via the parent portal or visit the school accounts office to avoid late fee penalties.`;
}

/**
 * Formats a school notice announcement message.
 */
export function formatNoticeMessage(params: {
  title: string;
  content: string;
  schoolName: string;
  date: string;
}): string {
  // Truncate very long content for WhatsApp readability
  const truncatedContent =
    params.content.length > 500 ? `${params.content.slice(0, 497)}...` : params.content;

  return `📢 *SCHOOL ANNOUNCEMENT* 📢
*${params.title}*

${truncatedContent}

🏫 *${params.schoolName}*
📅 Published: ${params.date}
_Login to your portal for full circular details._`;
}

/**
 * Sends a WhatsApp message via the configured provider (Meta Cloud API, Twilio, or Mock).
 * Automatically logs dispatch details to the WhatsAppLog database collection.
 */
export async function sendWhatsAppMessage(params: SendWhatsAppParams): Promise<SendWhatsAppResult> {
  const normalizedPhone = normalizePhoneNumber(params.to);

  if (!normalizedPhone) {
    return {
      success: false,
      provider: "mock",
      status: "failed",
      error: `Invalid recipient phone number: '${params.to}'`,
    };
  }

  const provider: WhatsAppProvider =
    params.customProvider ||
    (process.env.WHATSAPP_PROVIDER as WhatsAppProvider) ||
    "mock";

  let status: "sent" | "delivered" | "failed" | "simulated" = "sent";
  let providerMessageId: string | undefined;
  let errorMessage: string | undefined;

  try {
    if (provider === "meta_cloud") {
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const apiToken = process.env.WHATSAPP_API_TOKEN;

      if (!phoneNumberId || !apiToken) {
        throw new Error("Meta WhatsApp Cloud credentials missing (WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_API_TOKEN)");
      }

      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: normalizedPhone.replace(/^\+/, ""), // Meta expects phone without +
          type: "text",
          text: { preview_url: false, body: params.message },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to send WhatsApp message via Meta Cloud API");
      }

      providerMessageId = data.messages?.[0]?.id;
      status = "sent";
    } else if (provider === "twilio") {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

      if (!accountSid || !authToken) {
        throw new Error("Twilio credentials missing (TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN)");
      }

      const paramsBody = new URLSearchParams();
      paramsBody.append("From", fromNumber);
      paramsBody.append("To", `whatsapp:${normalizedPhone}`);
      paramsBody.append("Body", params.message);

      const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: paramsBody.toString(),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to send WhatsApp message via Twilio");
      }

      providerMessageId = data.sid;
      status = "sent";
    } else {
      // Mock Provider: logs to console, sets status to simulated
      providerMessageId = `mock_wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      status = "simulated";
    }
  } catch (err: any) {
    status = "failed";
    errorMessage = err.message || "Unknown error";
  }

  // Persist delivery audit log to MongoDB (fail-safe)
  let logId: string | undefined;
  try {
    await connectToDatabase();
    const logDoc = await WhatsAppLog.create({
      school_id: new mongoose.Types.ObjectId(params.schoolId as string),
      student_id: params.studentId ? new mongoose.Types.ObjectId(params.studentId as string) : null,
      recipient_phone: normalizedPhone,
      recipient_name: params.recipientName,
      recipient_type: params.recipientType || "parent",
      event_type: params.eventType,
      message: params.message,
      provider,
      provider_message_id: providerMessageId,
      status,
      error_message: errorMessage,
      metadata: params.metadata || {},
    });
    logId = logDoc._id.toString();
  } catch (dbErr) {
    // DB logging should not block result return
    console.warn("Failed to write WhatsApp delivery log to DB:", dbErr);
  }

  return {
    success: status !== "failed",
    provider,
    providerMessageId,
    status,
    error: errorMessage,
    logId,
  };
}

/**
 * Asynchronously triggers WhatsApp alerts for all students marked absent or late in an attendance submission.
 */
export async function triggerAttendanceWhatsAppAlerts(params: {
  schoolId: string | mongoose.Types.ObjectId;
  classId: string | mongoose.Types.ObjectId;
  date: string;
  records: Array<{ student_id: string | mongoose.Types.ObjectId; status: string }>;
}): Promise<void> {
  const flagged = params.records.filter((r) => {
    const s = String(r.status).toLowerCase();
    return s === "absent" || s === "late";
  });

  if (flagged.length === 0) return;

  try {
    await connectToDatabase();

    const [school, classDoc, students] = await Promise.all([
      School.findById(params.schoolId).select("name").lean(),
      Class.findById(params.classId).select("name section").lean(),
      Student.find({
        _id: { $in: flagged.map((f) => f.student_id) },
        school_id: params.schoolId,
      })
        .select("name roll_no phone guardian_phone father_phone mother_phone guardian_name father_name")
        .lean(),
    ]);

    const schoolName = school?.name || "School";
    const className = classDoc ? `${classDoc.name}${classDoc.section ? ` - ${classDoc.section}` : ""}` : "";

    const studentMap = new Map(students.map((s) => [s._id.toString(), s]));

    for (const record of flagged) {
      const student = studentMap.get(String(record.student_id));
      if (!student) continue;

      // Prefer guardian phone, fallback to father, mother, or student phone
      const phone =
        student.guardian_phone ||
        student.father_phone ||
        student.mother_phone ||
        student.phone;

      if (!phone) continue;

      const recipientName = student.guardian_name || student.father_name || "Parent";
      const message = formatAttendanceMessage({
        studentName: student.name,
        status: record.status,
        date: params.date,
        className,
        schoolName,
      });

      // Send message asynchronously
      await sendWhatsAppMessage({
        schoolId: params.schoolId,
        to: phone,
        recipientName,
        recipientType: "parent",
        eventType: record.status.toLowerCase() === "absent" ? "attendance_absent" : "attendance_late",
        message,
        studentId: student._id,
        metadata: {
          class_id: params.classId,
          date: params.date,
          status: record.status,
          roll_no: student.roll_no,
        },
      });
    }
  } catch (err) {
    console.error("Error dispatching attendance WhatsApp alerts:", err);
  }
}

/**
 * Resolves Principal WhatsApp phone number from environment or school configuration.
 */
export function getPrincipalPhoneNumber(schoolPhone?: string): string {
  return process.env.PRINCIPAL_WHATSAPP_NUMBER || schoolPhone || "7851974625";
}

/**
 * Formats a Security Authorization OTP WhatsApp message for the Principal.
 */
export function formatPrincipalOTPMessage(params: {
  otp: string;
  schoolName: string;
  studentName: string;
  amount: number | string;
  paymentMethod: string;
  cashierName: string;
}): string {
  const amtFormatted = Number(params.amount).toLocaleString("en-IN");
  const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return `🔐 *School Security Authorization*
*OTP Code: ${params.otp}*

🏫 *School:* ${params.schoolName}
👤 *Student:* ${params.studentName}
💰 *Amount:* ₹${amtFormatted} (${params.paymentMethod})
💼 *Cashier:* ${params.cashierName}
⏰ *Time:* ${timeStr}

Please share this 4-digit OTP to authorize fee collection and receipt generation.
_(Valid for 5 minutes)_`;
}

/**
 * Generates and dispatches a 4-digit security OTP directly to the Principal's WhatsApp.
 */
export async function sendPrincipalFeeOTP(params: {
  schoolId: string | mongoose.Types.ObjectId;
  studentId: string;
  studentName: string;
  amount: number | string;
  paymentMethod: string;
  cashierName: string;
}): Promise<{ success: boolean; otp?: string; principalPhone: string; error?: string }> {
  try {
    await connectToDatabase();
    const school = await School.findById(params.schoolId).select("name phone").lean();
    const schoolName = school?.name || "School";
    const principalPhone = getPrincipalPhoneNumber(school?.phone);

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    // Invalidate previous unused OTPs for this student
    await SecurityOTP.updateMany(
      { school_id: params.schoolId, target_id: params.studentId, is_used: false },
      { $set: { is_used: true } }
    );

    // Create fresh OTP record
    await SecurityOTP.create({
      school_id: params.schoolId,
      purpose: "fee_collection",
      target_id: params.studentId,
      otp_code: otpCode,
      phone: principalPhone,
      expires_at: expiresAt,
      metadata: {
        student_name: params.studentName,
        amount: params.amount,
        payment_method: params.paymentMethod,
        cashier_name: params.cashierName,
      },
    });

    const message = formatPrincipalOTPMessage({
      otp: otpCode,
      schoolName,
      studentName: params.studentName,
      amount: params.amount,
      paymentMethod: params.paymentMethod,
      cashierName: params.cashierName,
    });

    const sendResult = await sendWhatsAppMessage({
      schoolId: params.schoolId,
      to: principalPhone,
      recipientName: "Principal",
      recipientType: "staff",
      eventType: "custom",
      message,
      metadata: {
        action: "fee_collection_otp",
        student_id: params.studentId,
        amount: params.amount,
      },
    });

    return {
      success: sendResult.success,
      otp: process.env.NODE_ENV !== "production" ? otpCode : undefined,
      principalPhone: principalPhone.length > 4 ? `+91 ******${principalPhone.slice(-4)}` : principalPhone,
      error: sendResult.error,
    };
  } catch (err: any) {
    console.error("Error sending principal fee OTP:", err);
    return {
      success: false,
      principalPhone: "7851974625",
      error: err.message || "Failed to send OTP",
    };
  }
}

/**
 * Validates the Principal's OTP before finalizing the fee payment and receipt.
 */
export async function verifyPrincipalFeeOTP(params: {
  schoolId: string | mongoose.Types.ObjectId;
  studentId: string;
  otp: string;
}): Promise<{ valid: boolean; message: string }> {
  try {
    await connectToDatabase();
    const cleanOtp = String(params.otp || "").trim();
    if (!cleanOtp) {
      return { valid: false, message: "OTP is required" };
    }

    const otpDoc = await SecurityOTP.findOne({
      school_id: params.schoolId,
      target_id: params.studentId,
      otp_code: cleanOtp,
      is_used: false,
      expires_at: { $gt: new Date() },
    }).sort({ created_at: -1 });

    if (!otpDoc) {
      return { valid: false, message: "Invalid or expired OTP. Please ask Principal or request a new OTP." };
    }

    otpDoc.is_used = true;
    otpDoc.used_at = new Date();
    await otpDoc.save();

    return { valid: true, message: "Authorization verified successfully" };
  } catch (err: any) {
    return { valid: false, message: err.message || "OTP verification failed" };
  }
}

/**
 * Asynchronously triggers a WhatsApp fee receipt confirmation alert to the Principal.
 */
export async function triggerFeePaymentWhatsAppAlert(params: {
  schoolId: string | mongoose.Types.ObjectId;
  studentId: string | mongoose.Types.ObjectId;
  amount: number | string;
  receiptNo: string;
  paymentDate?: string;
  paymentMode?: string;
}): Promise<void> {
  try {
    await connectToDatabase();

    const [school, student] = await Promise.all([
      School.findById(params.schoolId).select("name phone").lean(),
      Student.findById(params.studentId)
        .select("name phone admission_no class_id")
        .populate("class_id", "name")
        .lean(),
    ]);

    if (!student) return;

    const principalPhone = getPrincipalPhoneNumber(school?.phone);
    const schoolName = school?.name || "School";
    const dateStr = params.paymentDate || new Date().toISOString().split("T")[0];
    const className = (student.class_id as any)?.name ? ` (${(student.class_id as any).name})` : "";
    const amtFormatted = Number(params.amount).toLocaleString("en-IN");

    const message = `📄 *Fee Receipt Generated*
*Receipt No:* #${params.receiptNo}
*Student:* ${student.name}${className}
*Amount:* ₹${amtFormatted} (${params.paymentMode || "Cash"})
*Date:* ${dateStr}
🏫 *School:* ${schoolName}

Payment recorded and receipt issued successfully.`;

    await sendWhatsAppMessage({
      schoolId: params.schoolId,
      to: principalPhone,
      recipientName: "Principal",
      recipientType: "staff",
      eventType: "fee_payment",
      message,
      studentId: student._id,
      metadata: {
        receipt_number: params.receiptNo,
        amount: params.amount,
        payment_mode: params.paymentMode,
      },
    });
  } catch (err) {
    console.error("Error dispatching fee payment WhatsApp alert:", err);
  }
}


/**
 * Asynchronously triggers WhatsApp announcements to targeted audiences for a published notice.
 */
export async function triggerNoticeWhatsAppAlert(params: {
  schoolId: string | mongoose.Types.ObjectId;
  title: string;
  content: string;
  targetAudience?: string;
  publishDate?: Date | string;
}): Promise<void> {
  try {
    await connectToDatabase();

    const school = await School.findById(params.schoolId).select("name").lean();
    const schoolName = school?.name || "School";
    const dateStr = params.publishDate
      ? new Date(params.publishDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    const message = formatNoticeMessage({
      title: params.title,
      content: params.content,
      schoolName,
      date: dateStr,
    });

    // Query relevant recipients based on target_audience
    const audience = params.targetAudience?.toLowerCase() || "all";
    const recipients: Array<{ phone: string; name: string; studentId?: mongoose.Types.ObjectId }> = [];

    if (audience === "all" || audience === "parents" || audience === "students") {
      const students = await Student.find({ school_id: params.schoolId, is_active: true })
        .select("name guardian_phone father_phone phone guardian_name father_name")
        .limit(200) // safety limit for bulk broadcast
        .lean();

      for (const s of students) {
        const phone = s.guardian_phone || s.father_phone || s.phone;
        if (phone) {
          recipients.push({
            phone,
            name: s.guardian_name || s.father_name || s.name,
            studentId: s._id as mongoose.Types.ObjectId,
          });
        }
      }
    }

    // Broadcast messages asynchronously
    for (const r of recipients) {
      await sendWhatsAppMessage({
        schoolId: params.schoolId,
        to: r.phone,
        recipientName: r.name,
        recipientType: "parent",
        eventType: "notice_broadcast",
        message,
        studentId: r.studentId,
        metadata: {
          notice_title: params.title,
          target_audience: audience,
        },
      });
    }
  } catch (err) {
    console.error("Error dispatching notice WhatsApp broadcast:", err);
  }
}
