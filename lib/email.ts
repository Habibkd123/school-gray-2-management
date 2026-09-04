import nodemailer from "nodemailer";

export interface SendMailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: SendMailAttachment[];
}

export async function sendEmail({ to, subject, html, attachments }: SendMailOptions) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true" || process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
    },
  });

  const mailOptions: any = {
    from: process.env.SMTP_USER || process.env.EMAIL_USER,
    to,
    subject,
    html,
  };

  if (attachments && attachments.length > 0) {
    mailOptions.attachments = attachments;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email: ", error);
    return false;
  }
}
