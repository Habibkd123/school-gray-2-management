import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import mongoose from "mongoose";
import { sendEmail } from "@/lib/email";

// Lightweight schema for demo requests
const DemoRequestSchema = new mongoose.Schema(
  {
    schoolName: { type: String, required: true },
    contactPerson: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: "" },
    studentCount: { type: String, default: "" },
    message: { type: String, default: "" },
    status: { type: String, default: "pending" },
    notifiedAt: { type: Date },
  },
  { timestamps: true }
);

const DemoRequest =
  mongoose.models.DemoRequest ||
  mongoose.model("DemoRequest", DemoRequestSchema);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolName, contactPerson, phone, email, studentCount, message } = body;

    if (!schoolName || !contactPerson || !phone) {
      return NextResponse.json(
        { error: "School name, contact person, and phone number are required." },
        { status: 400 }
      );
    }

    await connectDB();
    const cleanSchoolName = schoolName.trim();
    const cleanContactPerson = contactPerson.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = (email || "").trim();
    const cleanStudentCount = (studentCount || "").trim();
    const cleanMessage = (message || "").trim();

    const record = await DemoRequest.create({
      schoolName: cleanSchoolName,
      contactPerson: cleanContactPerson,
      phone: cleanPhone,
      email: cleanEmail,
      studentCount: cleanStudentCount,
      message: cleanMessage,
    });

    // Destination email: explicitly myschoollife.tech@gmail.com
    const notificationTarget =
      process.env.DEMO_NOTIFICATION_EMAIL || "myschoollife.tech@gmail.com";

    // Clean phone number for WhatsApp URL
    const digitsOnlyPhone = cleanPhone.replace(/[^0-9]/g, "");
    const waUrl =
      digitsOnlyPhone.length >= 10
        ? `https://wa.me/${digitsOnlyPhone.length === 10 ? "91" + digitsOnlyPhone : digitsOnlyPhone}`
        : `tel:${cleanPhone}`;

    const formattedDate = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "medium",
    });

    const adminHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; color: #e2e8f0;">
        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); padding: 24px 28px; border-bottom: 1px solid #334155;">
          <h2 style="margin: 0; color: #fbbf24; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">
            🎓 New Campus Walkthrough Demo Request
          </h2>
          <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">
            A new institution lead has submitted the walkthrough form on MySchoolLife platform.
          </p>
        </div>

        <div style="padding: 28px;">
          <table style="width: 100%; border-collapse: separate; border-spacing: 0 10px;">
            <tr>
              <td style="width: 35%; color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">School / Campus</td>
              <td style="color: #ffffff; font-size: 15px; font-weight: 700;">${cleanSchoolName}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Contact Person</td>
              <td style="color: #f1f5f9; font-size: 14px; font-weight: 600;">${cleanContactPerson}</td>
            </tr>
            <tr>
              <td style="color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Phone / WhatsApp</td>
              <td style="font-size: 14px;">
                <a href="tel:${cleanPhone}" style="color: #38bdf8; font-weight: 600; text-decoration: none;">${cleanPhone}</a>
                &nbsp;•&nbsp;
                <a href="${waUrl}" target="_blank" style="color: #4ade80; font-weight: 600; text-decoration: underline;">Chat on WhatsApp →</a>
              </td>
            </tr>
            <tr>
              <td style="color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Official Email</td>
              <td style="color: #cbd5e1; font-size: 14px;">
                ${cleanEmail ? `<a href="mailto:${cleanEmail}" style="color: #fbbf24; text-decoration: none;">${cleanEmail}</a>` : `<span style="color: #64748b;">Not provided</span>`}
              </td>
            </tr>
            <tr>
              <td style="color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Student Strength</td>
              <td style="color: #a5b4fc; font-size: 14px; font-weight: 600;">${cleanStudentCount || "Not specified"} Students</td>
            </tr>
            ${cleanMessage ? `
            <tr>
              <td style="color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; vertical-align: top;">Message</td>
              <td style="color: #cbd5e1; font-size: 13px; line-height: 1.5; background: #1e293b; padding: 10px 14px; border-radius: 8px;">${cleanMessage}</td>
            </tr>
            ` : ""}
            <tr>
              <td style="color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Submission Time</td>
              <td style="color: #94a3b8; font-size: 12px; font-family: monospace;">${formattedDate}</td>
            </tr>
          </table>

          <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #1e293b; text-align: center;">
            <a href="${waUrl}" target="_blank" style="display: inline-block; background-color: #fbbf24; color: #020617; font-weight: 700; font-size: 13px; padding: 12px 24px; border-radius: 10px; text-decoration: none; margin-right: 8px;">
              Contact on WhatsApp
            </a>
            <a href="tel:${cleanPhone}" style="display: inline-block; background-color: #1e293b; color: #f1f5f9; font-weight: 600; font-size: 13px; padding: 12px 24px; border-radius: 10px; text-decoration: none; border: 1px solid #334155;">
              Call Principal / Admin
            </a>
          </div>
        </div>

        <div style="background-color: #070a11; padding: 14px 28px; text-align: center; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b;">
          Lead generated from MySchoolLife Platform • Subdomain &amp; Campus Walkthrough System
        </div>
      </div>
    `;

    try {
      const emailSent = await sendEmail({
        to: notificationTarget,
        subject: `🎓 New School Demo Request: ${cleanSchoolName} (${cleanContactPerson})`,
        html: adminHtml,
      });

      if (emailSent) {
        await DemoRequest.findByIdAndUpdate(record._id, { notifiedAt: new Date() });
      }
    } catch (mailErr) {
      console.error("[DemoRequest] Email notification error:", mailErr);
    }

    return NextResponse.json({
      success: true,
      message: "Thank you! Your campus walkthrough request has been received. Our team will contact you shortly.",
      id: record._id,
    });
  } catch (error: any) {
    console.error("Demo request error:", error);
    return NextResponse.json(
      { error: "Failed to process demo request. Please try again." },
      { status: 500 }
    );
  }
}
