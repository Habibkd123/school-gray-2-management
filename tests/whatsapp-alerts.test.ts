import { describe, it, expect } from "vitest";
import {
  normalizePhoneNumber,
  formatAttendanceMessage,
  formatFeeReceiptMessage,
  formatFeeDueReminderMessage,
  formatNoticeMessage,
  sendWhatsAppMessage,
} from "@/lib/services/whatsapp";

describe("WhatsApp Alert Service — Phone Normalization", () => {
  it("normalizes standard 10-digit Indian mobile numbers to E.164 (+91)", () => {
    expect(normalizePhoneNumber("9876543210")).toBe("+919876543210");
    expect(normalizePhoneNumber("8123456789")).toBe("+918123456789");
    expect(normalizePhoneNumber("7000112233")).toBe("+917000112233");
    expect(normalizePhoneNumber("6999888777")).toBe("+916999888777");
  });

  it("normalizes 11-digit numbers with leading 0 to +91", () => {
    expect(normalizePhoneNumber("09876543210")).toBe("+919876543210");
  });

  it("normalizes 12-digit numbers with leading 91 to +91", () => {
    expect(normalizePhoneNumber("919876543210")).toBe("+919876543210");
  });

  it("cleans spaces, dashes, brackets and dots from input", () => {
    expect(normalizePhoneNumber("+91 98765-43210")).toBe("+919876543210");
    expect(normalizePhoneNumber("(987) 654-3210")).toBe("+919876543210");
    expect(normalizePhoneNumber("98765.43210")).toBe("+919876543210");
  });

  it("preserves already valid international E.164 numbers", () => {
    expect(normalizePhoneNumber("+14155552671")).toBe("+14155552671");
    expect(normalizePhoneNumber("+447911123456")).toBe("+447911123456");
    expect(normalizePhoneNumber("+971501234567")).toBe("+971501234567");
  });

  it("returns null for invalid, incomplete or empty phone numbers", () => {
    expect(normalizePhoneNumber("")).toBeNull();
    expect(normalizePhoneNumber(null)).toBeNull();
    expect(normalizePhoneNumber(undefined)).toBeNull();
    expect(normalizePhoneNumber("12345")).toBeNull();
    expect(normalizePhoneNumber("abcdefghij")).toBeNull();
  });
});

describe("WhatsApp Alert Service — Template Generation", () => {
  it("formats Attendance ABSENT alert with alert emojis and instructions", () => {
    const msg = formatAttendanceMessage({
      studentName: "Aarav Sharma",
      status: "absent",
      date: "2026-10-30",
      className: "Class 10-A",
      schoolName: "Bajrang Public School",
    });

    expect(msg).toContain("🚨 *ATTENDANCE ALERT* 🚨");
    expect(msg).toContain("Your ward *Aarav Sharma* (Class 10-A)");
    expect(msg).toContain("marked *ABSENT*");
    expect(msg).toContain("2026-10-30");
    expect(msg).toContain("Bajrang Public School");
    expect(msg).toContain("unexpected absence");
  });

  it("formats Attendance LATE alert with clock icon and punctuality notice", () => {
    const msg = formatAttendanceMessage({
      studentName: "Diya Patel",
      status: "late",
      date: "2026-10-30",
      className: "Grade 5-B",
      schoolName: "Springfield Academy",
    });

    expect(msg).toContain("⏰ *ATTENDANCE ALERT* ⏰");
    expect(msg).toContain("marked *LATE*");
    expect(msg).toContain("Grade 5-B");
    expect(msg).toContain("punctual arrival");
  });

  it("formats Fee Payment Confirmation Receipt message with formatted currency and receipt #", () => {
    const msg = formatFeeReceiptMessage({
      studentName: "Kabir Singh",
      amount: 4500,
      receiptNo: "REC-2026-1049",
      date: "2026-10-30",
      paymentMode: "UPI",
      schoolName: "Bajrang Public School",
    });

    expect(msg).toContain("🧾 *FEE PAYMENT CONFIRMATION* 🧾");
    expect(msg).toContain("*Kabir Singh*");
    expect(msg).toContain("₹4,500");
    expect(msg).toContain("REC-2026-1049");
    expect(msg).toContain("UPI");
    expect(msg).toContain("Bajrang Public School");
  });

  it("formats Fee Due Reminder message with due date and portal payment prompt", () => {
    const msg = formatFeeDueReminderMessage({
      studentName: "Rohan Verma",
      amountDue: 6000,
      dueDate: "2026-11-05",
      schoolName: "Bajrang Public School",
    });

    expect(msg).toContain("⚠️ *FEE DUE REMINDER* ⚠️");
    expect(msg).toContain("*Rohan Verma*");
    expect(msg).toContain("₹6,000");
    expect(msg).toContain("2026-11-05");
    expect(msg).toContain("parent portal");
  });

  it("formats School Announcement message and truncates very long text", () => {
    const longContent = "A".repeat(600);
    const msg = formatNoticeMessage({
      title: "Diwali Holidays Announcement",
      content: longContent,
      schoolName: "Bajrang Public School",
      date: "2026-10-30",
    });

    expect(msg).toContain("📢 *SCHOOL ANNOUNCEMENT* 📢");
    expect(msg).toContain("*Diwali Holidays Announcement*");
    expect(msg).toContain("...");
    expect(msg.length).toBeLessThan(700);
    expect(msg).toContain("Bajrang Public School");
  });
});

describe("WhatsApp Alert Service — Dispatching Logic", () => {
  it("dispatches in mock mode with simulated status and message ID without network call", async () => {
    const result = await sendWhatsAppMessage({
      schoolId: "60f000000000000000000100",
      to: "9876543210",
      recipientName: "Suresh Sharma",
      eventType: "attendance_absent",
      message: "Test absent alert message",
      customProvider: "mock",
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe("simulated");
    expect(result.provider).toBe("mock");
    expect(result.providerMessageId).toMatch(/^mock_wa_/);
  });

  it("rejects invalid phone numbers immediately with failed status", async () => {
    const result = await sendWhatsAppMessage({
      schoolId: "60f000000000000000000100",
      to: "invalid-phone",
      recipientName: "Test User",
      eventType: "custom",
      message: "Hello world",
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("Invalid recipient phone number");
  });

  it("catches missing Meta credentials gracefully without throwing unhandled exceptions", async () => {
    const oldPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const oldToken = process.env.WHATSAPP_API_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_API_TOKEN;

    const result = await sendWhatsAppMessage({
      schoolId: "60f000000000000000000100",
      to: "9876543210",
      recipientName: "Parent",
      eventType: "custom",
      message: "Testing Meta",
      customProvider: "meta_cloud",
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("Meta WhatsApp Cloud credentials missing");

    // Restore
    if (oldPhoneId) process.env.WHATSAPP_PHONE_NUMBER_ID = oldPhoneId;
    if (oldToken) process.env.WHATSAPP_API_TOKEN = oldToken;
  });
});
